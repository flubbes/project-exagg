import * as kubernetes from "@pulumi/kubernetes";
import { kubernetesProvider } from "./providers";
import { olm } from "./olm";

export const prometheusOperator = new kubernetes.apiextensions.CustomResource(
  "prometheus-operator-subscription",
  {
    apiVersion: "operators.coreos.com/v1alpha1",
    kind: "Subscription",
    metadata: {
      name: "prometheus-operator",
      namespace: "operators",
    },
    spec: {
      channel: "beta",
      name: "prometheus",
      source: "operatorhubio-catalog",
      sourceNamespace: "olm",
    },
  },
  { provider: kubernetesProvider, dependsOn: [olm] }
);
