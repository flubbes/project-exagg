import * as kubernetes from "@pulumi/kubernetes";
import { monitoringNamespace } from "./namespaces";
import { prometheusDataSourceName } from "./datasources";
import { readFileSync } from "fs";
import { kubernetesProvider } from "./providers";

new kubernetes.apiextensions.CustomResource(
  `energy-dashboard`,
  {
    apiVersion: "integreatly.org/v1alpha1",
    kind: "GrafanaDashboard",
    metadata: {
      namespace: monitoringNamespace.metadata.name,
      labels: {
        app: "grafana",
      },
    },
    spec: {
      datasources: [
        {
          datasourceName: prometheusDataSourceName,
          inputName: prometheusDataSourceName,
        },
      ],
      json: readFileSync("dashboards/energy.json", "utf8"),
    },
  },
  { provider: kubernetesProvider }
);

new kubernetes.apiextensions.CustomResource(
  `version-checker-dashboard`,
  {
    apiVersion: "integreatly.org/v1alpha1",
    kind: "GrafanaDashboard",
    metadata: {
      namespace: monitoringNamespace.metadata.name,
      labels: {
        app: "grafana",
      },
    },
    spec: {
      datasources: [
        {
          datasourceName: prometheusDataSourceName,
          inputName: "DS_VERSION-CHECKER",
        },
      ],
      json: readFileSync("dashboards/version-checker.json", "utf8"),
    },
  },
  { provider: kubernetesProvider }
);
