import * as kubernetes from "@pulumi/kubernetes";
import { readFileSync } from "fs";
import { kubernetesProvider } from "./providers";
import { CoreDnsValues } from "./types/coredns.values";

const coreDnsNamespace = new kubernetes.core.v1.Namespace(
  "core-dns-namespace",
  {
    metadata: {
      name: "coredns",
    },
  },
  { deleteBeforeReplace: true, provider: kubernetesProvider }
);

const coreDnsServiceName = "coredns-svc";

const configMap = new kubernetes.core.v1.ConfigMap(
  "coredns-config",
  {
    metadata: { namespace: coreDnsNamespace.metadata.name },
    data: {
      "zone.cfg": readFileSync("zone.cfg", "utf8"),
    },
  },
  { provider: kubernetesProvider }
);

new kubernetes.helm.v3.Release(
  "coredns",
  {
    chart: "coredns",
    // https://artifacthub.io/packages/helm/coredns/coredns
    version: "1.19.2",
    namespace: coreDnsNamespace.metadata.name,
    repositoryOpts: {
      repo: "https://coredns.github.io/helm",
    },
    values: {
      isClusterService: false,
      serviceType: "ClusterIP",
      replicaCount: 2,
      servers: [
        {
          zones: [
            {
              zone: ".",
            },
          ],
          port: 53,
          plugins: [
            {
              name: "errors",
            },
            {
              name: "health",
              configBlock: "lameduck 5s",
            },
            {
              name: "ready",
            },
            {
              name: "prometheus",
              parameters: "0.0.0.0:9153",
            },
            {
              name: "cache",
              parameters: 1800,
            },
            {
              name: "file",
              parameters: "/config/zone.cfg home",
              reload: "0",
            },
            {
              name: "forward",
              // we need to specify the unifi usg. Otherwhise the local dns for friday and other local services won't work
              parameters: ". 192.168.1.1",
            },
            {
              name: "loop",
            },
            {
              name: "reload",
            },
            {
              name: "loadbalance",
            },
          ],
        },
      ],
      extraVolumes: [
        {
          name: "zone-config",
          configMap: {
            name: configMap.metadata.name,
            items: [{ key: "zone.cfg", path: "zone.cfg" }],
          },
        },
      ],
      extraVolumeMounts: [
        {
          mountPath: "/config",
          name: "zone-config",
        },
      ],
      prometheus: {
        service: {
          enabled: true,
        },
        monitor: {
          enabled: true,
        },
      },
      service: {
        name: coreDnsServiceName,
      },
    } as CoreDnsValues,
  },
  { provider: kubernetesProvider }
);

new kubernetes.apiextensions.CustomResource(
  "traefik-udp-route",
  {
    apiVersion: "traefik.containo.us/v1alpha1",
    kind: "IngressRouteUDP",
    metadata: {
      namespace: coreDnsNamespace.metadata.name,
    },
    spec: {
      entryPoints: ["dns"],
      routes: [
        {
          services: [
            {
              name: coreDnsServiceName,
              namespace: coreDnsNamespace.metadata.name,
              port: 53,
            },
          ],
        },
      ],
    },
  },
  { provider: kubernetesProvider }
);

new kubernetes.apiextensions.CustomResource(
  "traefik-config",
  {
    apiVersion: "helm.cattle.io/v1",
    kind: "HelmChartConfig",
    metadata: {
      name: "traefik",
      namespace: "kube-system",
    },
    spec: {
      valuesContent: `
      ports:
        dns:
          port: 32053
          expose: true
          exposedPort: 53
          protocol: UDP
    `,
    },
  },
  { provider: kubernetesProvider }
);

// new kubernetes.apiextensions.CustomResource("etcd", {
//   apiVersion: "helm.cattle.io/v1",
//   kind: "HelmChart",
//   metadata: {
//     name: "etcd",
//     namespace: coreDnsNamespace.metadata.name,
//   },
//   spec: {
//     repo: "https://charts.bitnami.com/bitnami",
//     chart: "bitnami/etcd",
//     targetNamespace: coreDnsNamespace.metadata.name,
//     valuesContent: `

//     `,
//   },
// });
