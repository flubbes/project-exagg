import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";
import * as command from "@pulumi/command";

// config
const config = new pulumi.Config();
const olmVersion = config.require("olmVersion");

// providers
const commandProvider = new command.Provider("command-provider");
const kubernetesProvider = new kubernetes.Provider("kubernetes-provider", {
  cluster: config.require("clusterName"),
  kubeconfig: config.require("kubeConfigPath"),
});

// OLM
const olm = new command.local.Command(
  "olm-install",
  {
    dir: ".",
    create: `curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/install.sh | bash -s v${olmVersion} || true`,
    delete: `
        kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com; 
        kubectl delete -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/crds.yaml;
        kubectl delete -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/olm.yaml || true`,
  },
  {
    provider: commandProvider,
  }
);

// grafana operator
const monitoringNamespace = new kubernetes.core.v1.Namespace(
  "monitoring-namespace",
  {
    metadata: {
      name: "monitoring",
    },
  }
);
new kubernetes.apiextensions.CustomResource(
  "grafana-operator-group",
  {
    apiVersion: "operators.coreos.com/v1",
    kind: "OperatorGroup",
    metadata: {
      name: "grafana-operator",
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      targetNamespaces: [monitoringNamespace.metadata.name],
    },
  },
  { provider: kubernetesProvider, dependsOn: [olm] }
);
new kubernetes.apiextensions.CustomResource(
  "grafana-operator-subscription",
  {
    apiVersion: "operators.coreos.com/v1alpha1",
    kind: "Subscription",
    metadata: {
      name: "grafana-operator",
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      channel: "v4",
      name: "grafana-operator",
      source: "operatorhubio-catalog",
      sourceNamespace: "olm",
    },
  },
  { provider: kubernetesProvider, dependsOn: [olm] }
);

// postgres operator
const postgresOperator = new kubernetes.apiextensions.CustomResource(
  "postgres-operator-subscription",
  {
    apiVersion: "operators.coreos.com/v1alpha1",
    kind: "Subscription",
    metadata: {
      name: "postgres-operator",
      namespace: "operators",
    },
    spec: {
      channel: "v5",
      name: "postgresql",
      source: "operatorhubio-catalog",
      sourceNamespace: "olm",
    },
  },
  { provider: kubernetesProvider, dependsOn: [olm] }
);

// prometheus operator
const prometheusOperator = new kubernetes.apiextensions.CustomResource(
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

// grafana postgres
const dbUser = "grafana";
const postgresName = "grafana-postgres-db";
const secretNameWithPostgresCredentials = `${postgresName}-pguser-${dbUser}`;

const postgres = new kubernetes.apiextensions.CustomResource(
  "grafana-postgres",
  {
    apiVersion: "postgres-operator.crunchydata.com/v1beta1",
    kind: "PostgresCluster",
    metadata: {
      name: postgresName,
      namespace: monitoringNamespace.metadata.name,
    },
    spec: {
      instances: [
        {
          dataVolumeClaimSpec: {
            accessModes: ["ReadWriteOnce"],
            resources: {
              requests: {
                storage: "10Gi",
              },
            },
          },
          replicas: 1,
        },
      ],
      users: [
        {
          name: dbUser,
          databases: ["grafana"],
        },
      ],
      patroni: {
        dynamicConfiguration: {
          postgresql: {
            pg_hba: [
              "host all all 0.0.0.0/0 trust",
              `host all ${dbUser} 127.0.0.1/32 md5`,
            ],
          },
        },
      },
      postgresVersion: 14,
      backups: {
        pgbackrest: {
          repos: [
            {
              name: "repo1",
              volume: {
                volumeClaimSpec: {
                  accessModes: ["ReadWriteOnce"],
                  resources: {
                    requests: {
                      storage: "20Gi",
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
  { dependsOn: postgresOperator }
);

const getGrafanaPostgresSecret = async () => {
  while (true) {
    try {
      return kubernetes.core.v1.Secret.get(
        "postgres-grafana-secret",
        pulumi.interpolate`${monitoringNamespace.metadata.name}/${secretNameWithPostgresCredentials}`,
        { dependsOn: postgres }
      );
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

getGrafanaPostgresSecret().then((grafanaPostgresSecret) => {
  const decodeBase64 = (input: string) =>
    Buffer.from(input, "base64").toString("utf-8");

  // grafana
  new kubernetes.apiextensions.CustomResource(
    "grafana",
    {
      apiVersion: "integreatly.org/v1alpha1",
      kind: "Grafana",
      metadata: {
        name: "grafana",
        namespace: monitoringNamespace.metadata.name,
      },
      spec: {
        deployment: {
          replicas: 1,
        },
        client: {
          preferService: true,
        },
        ingress: {
          enabled: true,
          pathType: "Prefix",
          path: "/",
        },
        config: {
          log: {
            mode: "console",
            level: "error",
          },
          "log.frontend": {
            enabled: true,
          },
          auth: {
            disable_login_form: false,
            disable_signout_menu: true,
          },
          "auth.anonymous": {
            enabled: true,
          },
          database: {
            type: "postgres",
            host: pulumi.interpolate`${grafanaPostgresSecret.data
              .apply((s) => s.host)
              .apply(decodeBase64)}:${grafanaPostgresSecret.data
              .apply((s) => s.port)
              .apply(decodeBase64)}`,
            name: grafanaPostgresSecret.data
              .apply((s) => s.dbname)
              .apply(decodeBase64),
            user: grafanaPostgresSecret.data
              .apply((s) => s.user)
              .apply(decodeBase64),
            password: grafanaPostgresSecret.data
              .apply((s) => s.password)
              .apply(decodeBase64),
          },
        },
        service: {
          name: "grafana-service",
          labels: {
            app: "grafana",
            type: "grafana-service",
          },
        },
        dashboardLabelSelector: [
          {
            matchExpressions: [
              {
                key: "app",
                operator: "In",
                values: ["grafana"],
              },
            ],
          },
        ],
        resources: {
          limits: {
            cpu: "1000m",
            memory: "200Mi",
          },
          requests: {
            cpu: "100m",
            memory: "200Mi",
          },
        },
      },
    },
    { provider: kubernetesProvider }
  );
});

// prometheus
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
      serviceAccountName: "prometheus",
      serviceMonitorSelector: {
        matchLabels: {
          monitor: "on",
        },
      },
      podMonitorSelector: {
        matchLabels: {
          monitor: "on",
        },
      },
    },
  },
  { dependsOn: [prometheusOperator, monitoringNamespace] }
);

// smart home
const namespace = new kubernetes.core.v1.Namespace("smart-home", {
  metadata: {
    name: "smart-home",
  },
});
