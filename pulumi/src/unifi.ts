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
        selector: {
          matchLabels: {
            app: "unifi",
          },
        },
        template: {
          metadata: {
            labels: {
              app: "unifi",
            },
          },
          spec: {
            hostNetwork: true,
            containers: [
              {
                // https://hub.docker.com/r/linuxserver/unifi-controller/tags
                image: "linuxserver/unifi-controller:7.0.25-ls147", // linuxserver/unifi-controller:7.0.25-ls147
                name: "unifi-controller",
                volumeMounts: [
                  {
                    mountPath: "/config",
                    name: "unifi-config",
                  },
                ],
              },
            ],
            volumes: [
              {
                name: "unifi-config",
                hostPath: {
                  path: "/k3s-storage/unifi-controller",
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
