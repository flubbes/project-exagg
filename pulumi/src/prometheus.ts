import * as kubernetes from "@pulumi/kubernetes";
import { monitoringNamespace } from "./namespaces";
import { prometheusOperator } from "./prometheus-operator";
import { kubernetesProvider } from "./providers";

const clusterRole = new kubernetes.rbac.v1.ClusterRole(
  "prometheus-cluster-role",
  {
    metadata: {
      name: "prometheus",
    },
    rules: [
      {
        apiGroups: [""],
        resources: ["nodes", "nodes/metrics", "services", "endpoints", "pods"],
        verbs: ["get", "list", "watch"],
      },
      {
        apiGroups: [""],
        resources: ["configmaps"],
        verbs: ["get"],
      },
      {
        apiGroups: ["networking.k8s.io"],
        resources: ["ingresses"],
        verbs: ["get", "list", "watch"],
      },
      {
        nonResourceURLs: ["/metrics"],
        verbs: ["get"],
      },
    ],
  },
  {
    provider: kubernetesProvider,
  }
);

const serviceAccount = new kubernetes.core.v1.ServiceAccount(
  "prometheus",
  {
    metadata: {
      namespace: monitoringNamespace.metadata.name,
    },
  },
  {
    provider: kubernetesProvider,
  }
);

new kubernetes.rbac.v1.ClusterRoleBinding(
  "prometheus",
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
  {
    provider: kubernetesProvider,
  }
);

new kubernetes.apiextensions.CustomResource(
  "prometheus",
  {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "Prometheus",
    metadata: {
      name: "prometheus",
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      replicas: 1,
      serviceAccountName: serviceAccount.metadata.name,
      serviceMonitorNamespaceSelector: {},
      serviceMonitorSelector: {},
      podMonitorNamespaceSelector: {},
      podMonitorSelector: {},
      probeNamespaceSelector: {},
      probeSelector: {},
      ruleNamespaceSelector: {},
      ruleSelector: {},
      retention: "30d",
      storage: {
        volumeClaimTemplate: {
          metadata: {
            name: "prometheus-pvc",
            labels: {
              app: "prometheus",
            },
          },
          spec: {
            accessModes: ["ReadWriteOnce"],
            volumeMode: "Filesystem",
            resources: { requests: { storage: "8Gi" } },
            storageClassName: "local-path",
          },
        },
      },
    },
  },
  {
    dependsOn: [prometheusOperator, monitoringNamespace],
    provider: kubernetesProvider,
  }
);

new kubernetes.networking.v1.Ingress(
  "prometheus",
  {
    metadata: {
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      rules: [
        {
          host: "prom.home",
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "prometheus-operated",
                    port: {
                      number: 9090,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: kubernetesProvider }
);
