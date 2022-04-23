import * as command from "@pulumi/command";
import { config } from "./config";
import { commandProvider } from "./providers";

const olmVersion = config.require("olmVersion");

export const olm = new command.local.Command(
  "olm-install",
  {
    dir: ".",
    create: `export KUBECONFIG=${config.require(
      "kubeConfigPath"
    )} && curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/install.sh | bash -s v${olmVersion} || true`,
    delete: `
        export KUBECONFIG=${config.require("kubeConfigPath")};
        kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com; 
        kubectl delete -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/crds.yaml;
        kubectl delete -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v${olmVersion}/olm.yaml || true`,
  },
  {
    provider: commandProvider,
  }
);
