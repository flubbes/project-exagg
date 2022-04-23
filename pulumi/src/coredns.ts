import * as kubernetes from "@pulumi/kubernetes";
import { kubernetesProvider } from "./providers";

const coreDnsNamespace = new kubernetes.core.v1.Namespace(
  "core-dns-namespace",
  {
    metadata: {
      name: "coredns",
    },
  },
  { deleteBeforeReplace: true, provider: kubernetesProvider }
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
      serviceType: "NodePort",
    },
  },
  { provider: kubernetesProvider }
);
