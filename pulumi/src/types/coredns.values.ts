import { Input, Output } from "@pulumi/pulumi";

export interface CoreDnsValues {
  image: {
    repository: "coredns/coredns";
    tag: string;
    pullPolicy: "IfNotPresent";
  };
  replicaCount: number;
  resources: {
    limits: {
      cpu: "100m";
      memory: "128Mi";
    };
    requests: {
      cpu: "100m";
      memory: "128Mi";
    };
  };
  rollingUpdate: {
    maxUnavailable: number;
    maxSurge: "25%";
  };
  terminationGracePeriodSeconds: number;
  podAnnotations: {};
  serviceType: "ClusterIP" | "NodePort";
  prometheus: {
    service: {
      enabled: boolean;
      annotations: {
        "prometheus.io/scrape": "true";
        "prometheus.io/port": "9153";
      };
    };
    monitor: {
      enabled: boolean;
      additionalLabels: {};
      namespace: "";
      interval: "";
    };
  };
  service: {
    name: string;
    annotations?: {};
  };
  serviceAccount: {
    create: boolean;
    name: "";
    annotations: {};
  };
  rbac: {
    create: boolean;
    pspEnable: boolean;
  };
  isClusterService: boolean;
  priorityClassName: "";
  servers: [
    {
      zones: { zone: string }[];
      port: number;
      plugins: {
        name: string;
        configBlock?: string;
        parameters?: string | number;
      }[];
    }
  ];
  extraConfig: {};
  livenessProbe: {
    enabled: boolean;
    initialDelaySeconds: number;
    periodSeconds: number;
    timeoutSeconds: number;
    failureThreshold: number;
    successThreshold: number;
  };
  readinessProbe: {
    enabled: boolean;
    initialDelaySeconds: number;
    periodSeconds: number;
    timeoutSeconds: number;
    failureThreshold: number;
    successThreshold: number;
  };
  affinity: {};
  nodeSelector: {};
  tolerations: [];
  podDisruptionBudget: {};
  zoneFiles: [];
  extraVolumes: {
    name: string;
    configMap: { name: Output<string>; items: { key: string; path: string }[] };
  }[];
  extraVolumeMounts: { mountPath: string; name: string; readonly: boolean }[];
  extraSecrets: [];
  customLabels: {};
  customAnnotations: {};
  hpa: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    metrics: {};
  };
  autoscaler: {
    enabled: boolean;
    coresPerReplica: 256;
    nodesPerReplica: 16;
    min: number;
    max: number;
    includeUnschedulableNodes: boolean;
    preventSinglePointFailure: boolean;
    image: {
      repository: string;
      tag: string;
      pullPolicy: "IfNotPresent";
    };
    priorityClassName: "";
    affinity: {};
    nodeSelector: {};
    tolerations: [];
    resources: {
      requests: {
        cpu: "20m";
        memory: "10Mi";
      };
      limits: {
        cpu: "20m";
        memory: "10Mi";
      };
    };
    configmap: {
      annotations: {};
    };
    livenessProbe: {
      enabled: boolean;
      initialDelaySeconds: number;
      periodSeconds: number;
      timeoutSeconds: number;
      failureThreshold: number;
      successThreshold: number;
    };
  };
  deployment: {
    enabled: boolean;
    name: string;
    annotations: {};
  };
}
