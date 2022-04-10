import * as kubernetes from "@pulumi/kubernetes";
import { config } from "./config";
import { kubernetesProvider } from "./providers";

if (config.getBoolean("deployUnifi") === true) {
  new kubernetes.apiextensions.CustomResource(
    "unifi",
    {
      apiVersion: "apps/v1",
      kind: "StatefulSet",
      metadata: {
        labels: {
          app: "unifi",
        },
        name: "unifi",
        namespace: "unifi",
        annotations: {},
      },
      spec: {
        serviceName: "unifi",
        replicas: 1,
        podManagementPolicy: "OrderedReady",
        revisionHistoryLimit: 10,
        selector: {
          matchLabels: {
            app: "unifi",
          },
        },
        updateStrategy: {
          rollingUpdate: {
            partition: 0,
          },
          type: "RollingUpdate",
        },
        template: {
          metadata: {
            labels: {
              app: "unifi",
            },
          },
          spec: {
            securityContext: {},
            hostNetwork: true,
            containers: [
              {
                // https://hub.docker.com/r/linuxserver/unifi-controller/tags
                image: "linuxserver/unifi-controller:7.0.23-ls143", // linuxserver/unifi-controller:7.0.25-ls147
                name: "unifi-controller",
                volumeMounts: [
                  {
                    mountPath: "/config",
                    name: "unifi-config",
                  },
                ],
                imagePullPolicy: "IfNotPresent",
                resources: {},
                terminationMessagePath: "/dev/termination-log",
                terminationMessagePolicy: "File",
              },
            ],
            dnsPolicy: "ClusterFirst",
            restartPolicy: "Always",
            schedulerName: "default-scheduler",
            terminationGracePeriodSeconds: 30,
            volumes: [
              {
                name: "unifi-config",
                hostPath: {
                  path: "/k3s-storage/unifi-controller",
                  type: "",
                },
              },
            ],
          },
        },
      },
    },
    { provider: kubernetesProvider }
  );
}
