import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import { kubernetesProvider } from "./src/providers";
import { monitoringNamespace } from "./src/namespaces";
import "./src/plex";
import "./src/unifi";
import "./src/shelly-exporter";
import "./src/datasources";
import "./src/dashboards";
import "./src/coredns";
import "./src/version-checker";
import "./src/prometheus-operator";
import "./src/prometheus";
import { olm } from "./src/olm";

// grafana operator
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
  { dependsOn: postgresOperator, provider: kubernetesProvider }
);

const getGrafanaPostgresSecret = async () => {
  while (true) {
    try {
      return kubernetes.core.v1.Secret.get(
        "postgres-grafana-secret",
        pulumi.interpolate`${monitoringNamespace.metadata.name}/${secretNameWithPostgresCredentials}`,
        { dependsOn: postgres, provider: kubernetesProvider }
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

// smart home
const namespace = new kubernetes.core.v1.Namespace(
  "smart-home",
  {
    metadata: {
      name: "smart-home",
    },
  },
  { provider: kubernetesProvider }
);

new kubernetes.helm.v3.Release(
  "homebridge",
  {
    chart: "homebridge",
    // https://artifacthub.io/packages/helm/k8s-at-home/homebridge
    version: "4.3.1",
    namespace: namespace.metadata.name,
    repositoryOpts: {
      repo: "https://k8s-at-home.com/charts/",
    },
    // https://github.com/k8s-at-home/library-charts/blob/main/charts/stable/common/values.yaml
    values: {
      hostNetwork: true,
      persistence: {
        config: {
          enabled: true,
          type: "hostPath",
          hostPath: "/k3s-storage/homebridge",
        },
      },
    },
  },
  { provider: kubernetesProvider }
);
