import * as kubernetes from "@pulumi/kubernetes";
import { config } from "./config";
import { kubernetesProvider } from "./providers";

if (config.getBoolean("deployPlex") === true) {
  new kubernetes.apiextensions.CustomResource(
    "plex",
    {
      apiVersion: "apps/v1",
      kind: "StatefulSet",
      metadata: {
        labels: {
          app: "plex",
        },
        name: "plex",
        namespace: "plex",
        annotations: {},
      },
      spec: {
        serviceName: "plex",
        replicas: 1,
        selector: {
          matchLabels: {
            app: "plex",
          },
        },
        template: {
          metadata: {
            labels: {
              app: "plex",
            },
          },
          spec: {
            securityContext: {
              runAsUser: 1000,
              runAsGroup: 1000,
              fsGroup: 1000,
            },
            hostNetwork: true,
            containers: [
              {
                // https://github.com/k8s-at-home/container-images/pkgs/container/plex
                image: "ghcr.io/k8s-at-home/plex:v1.25.3.5409-f11334058",
                name: "plex",
                volumeMounts: [
                  {
                    mountPath: "/config",
                    name: "plex-config",
                  },
                  {
                    mountPath: "/multimedia",
                    name: "plex-multimedia",
                  },
                ],
              },
            ],
            volumes: [
              {
                name: "plex-config",
                hostPath: {
                  path: "/k3s-storage/plex-config",
                },
              },
              {
                name: "plex-multimedia",
                hostPath: {
                  path: "/k3s-storage/multimedia",
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
