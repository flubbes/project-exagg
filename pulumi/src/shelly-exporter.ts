import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { monitoringNamespace } from "./namespaces";
import { readInventorySync } from "./inventory";
import { kubernetesProvider } from "./providers";
import * as kx from "@pulumi/kubernetesx";
import { readFileSync } from "fs";

const shellyPlugConfig = readFileSync(
  "./json-exporter-configs/shelly-plug.yml",
  "utf8"
);
const configMap = new kx.ConfigMap(
  "shelly-plug-configmap",
  {
    metadata: {
      namespace: monitoringNamespace.metadata.name,
    },
    data: {
      "config.yml": shellyPlugConfig,
    },
  },
  { provider: kubernetesProvider }
);

const pod = new kx.PodBuilder({
  containers: [
    {
      // https://quay.io/repository/prometheuscommunity/json-exporter?tab=tags&tag=latest
      image: "quay.io/prometheuscommunity/json-exporter:v0.4.0",
      args: ["--config.file", "/config/config.yml"],
      volumeMounts: [configMap.mount("/config")],
      ports: [{ containerPort: 7979, name: "probe", protocol: "TCP" }],
    },
  ],
});

const deployment = new kx.Deployment(
  "shelly-plug-exporter",
  {
    metadata: {
      name: "shelly-plug-exporter",
      namespace: monitoringNamespace.metadata.name,
      labels: {
        app: "shelly-plug-exporter",
      },
    },
    spec: pod.asDeploymentSpec({ replicas: 1 }),
  },
  { provider: kubernetesProvider }
);

const service = deployment.createService({ type: "ClusterIP" });

const probes = readInventorySync().shellyPlugs;

new kubernetes.apiextensions.CustomResource(`shelly-plug-probe`, {
  apiVersion: "monitoring.coreos.com/v1",
  kind: "Probe",
  metadata: {
    labels: { probe: "shelly-plug" },
    namespace: monitoringNamespace.metadata.name,
  },
  spec: {
    interval: "5s",
    jobName: "shelly-plug",
    prober: {
      path: "/probe",
      scheme: "http",
      url: pulumi.interpolate`${service.metadata.name}:7979`,
    },
    targets: {
      staticConfig: {
        static: ([] as string[])
          .concat(probes.map((probe) => `http://${probe}/meter/0`))
          .concat(probes.map((probe) => `http://${probe}/status`))
          .concat(probes.map((probe) => `http://${probe}/relay/0`)),
      },
    },
  },
});
