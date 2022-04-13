import { kubernetesProvider } from "./providers";
import * as kubernetes from "@pulumi/kubernetes";

export const monitoringNamespace = new kubernetes.core.v1.Namespace(
  "monitoring-namespace",
  {
    metadata: {
      name: "monitoring",
    },
  },
  { provider: kubernetesProvider }
);
