import * as kubernetes from "@pulumi/kubernetes";
import { monitoringNamespace } from "./namespaces";
import { kubernetesProvider } from "./providers";

export const prometheusDataSourceName = "Prometheus";

export const prometheusDataSource = new kubernetes.apiextensions.CustomResource(
  "prometheus-grafana-datasource",
  {
    apiVersion: "integreatly.org/v1alpha1",
    kind: "GrafanaDataSource",
    metadata: {
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      name: "prometheus",
      datasources: [
        {
          name: prometheusDataSourceName,
          type: "prometheus",
          access: "proxy",
          url: "http://prometheus-operated:9090",
          isDefault: true,
          version: 1,
          editable: true,
          jsonData: {
            tlsSkipVerify: true,
            timeInterval: "5s",
          },
        },
      ],
    },
  },
  { provider: kubernetesProvider }
);
