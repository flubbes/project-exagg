import * as kubernetes from "@pulumi/kubernetes";
import * as command from "@pulumi/command";
import { config } from "./config";

export const commandProvider = new command.Provider("command-provider");
export const kubernetesProvider = new kubernetes.Provider(
  "kubernetes-provider",
  {
    cluster: config.require("clusterName"),
    kubeconfig: config.require("kubeConfigPath"),
  }
);
