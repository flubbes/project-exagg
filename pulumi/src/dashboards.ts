import * as kubernetes from "@pulumi/kubernetes";
import { monitoringNamespace } from "./namespaces";
import { prometheusDataSourceName } from "./datasources";
import { readFileSync } from "fs";

new kubernetes.apiextensions.CustomResource(`shelly-plug-probe`, {
  apiVersion: "integreatly.org/v1alpha1",
  kind: "GrafanaDashboard",
  metadata: {
    namespace: monitoringNamespace.metadata.name,
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
});
