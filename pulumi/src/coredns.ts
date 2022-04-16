import * as kubernetes from "@pulumi/kubernetes";
import { kubernetesProvider } from "./providers";

const coreDnsNamespace = new kubernetes.core.v1.Namespace(
  "core-dns-namespace",
  {
    metadata: {
      name: "coredns",
    },
  }
);

new kubernetes.helm.v3.Release(
  "coredns",
  {
    chart: "coredns",
    // https://artifacthub.io/packages/helm/k8s-at-home/homebridge
    version: "1.19.0",
    namespace: coreDnsNamespace.metadata.name,
    repositoryOpts: {
      repo: "https://coredns.github.io/helm",
    },
    // https://github.com/k8s-at-home/library-charts/blob/main/charts/stable/common/values.yaml
    values: {
      isClusterService: false,
      serviceType: "NodePort",
      servers: [
        {
          zones: [{}],
        },
      ],
    },
  },
  { provider: kubernetesProvider }
);
