import * as kubernetes from "@pulumi/kubernetes";
import { monitoringNamespace } from "./namespaces";
import { prometheusDataSourceName } from "./datasources";
import { kubernetesProvider } from "./providers";
import { readFileSync } from "fs";

const namespace = new kubernetes.core.v1.Namespace(
  "version-checker",
  undefined,
  {
    provider: kubernetesProvider,
  }
);

const serviceAccount = new kubernetes.core.v1.ServiceAccount(
  "version-checker",
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
  },
  { provider: kubernetesProvider }
);

const clusterRole = new kubernetes.rbac.v1.ClusterRole(
  "version-checker",
  {
    rules: [
      {
        apiGroups: [""],
        resources: ["pods"],
        verbs: ["get", "watch", "list"],
      },
    ],
  },
  { provider: kubernetesProvider }
);

new kubernetes.rbac.v1.ClusterRoleBinding(
  "version-checker",
  {
    roleRef: {
      apiGroup: "rbac.authorization.k8s.io",
      kind: "ClusterRole",
      name: clusterRole.metadata.name,
    },
    subjects: [
      {
        kind: "ServiceAccount",
        name: serviceAccount.metadata.name,
        namespace: serviceAccount.metadata.namespace,
      },
    ],
  },
  { provider: kubernetesProvider }
);

new kubernetes.apps.v1.Deployment(
  "version-checker",
  {
    metadata: { namespace: namespace.metadata.name },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: "version-checker",
        },
      },
      template: {
        metadata: {
          labels: {
            app: "version-checker",
          },
          annotations: {
            "enable.version-checker.io/version-checker": "true",
          },
        },
        spec: {
          serviceAccountName: serviceAccount.metadata.name,
          containers: [
            {
              image: "quay.io/jetstack/version-checker:v0.2.1",
              imagePullPolicy: "Always",
              ports: [
                {
                  containerPort: 8080,
                  name: "app",
                },
              ],
              name: "version-checker",
              command: ["version-checker"],
              args: ["--test-all-containers=true"],
            },
          ],
        },
      },
    },
  },
  { provider: kubernetesProvider }
);

new kubernetes.apiextensions.CustomResource(
  "version-checker-monitor",
  {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "PodMonitor",
    metadata: { namespace: namespace.metadata.name },
    spec: {
      jobLabel: "version-checker",
      selector: {
        matchLabes: {
          app: "version-checker",
        },
      },
      podMetricsEndpoints: [
        {
          port: "app",
          path: "/metrics",
        },
      ],
    },
  },
  { provider: kubernetesProvider }
);
