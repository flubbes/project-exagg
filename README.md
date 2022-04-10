# Project Exagg

The name of this project stands for exaggeration. This is my personal grafana monitoring setup for my smarthome. There are currently no plans to make this usable for other people. But you can get inspired.

## Tools required

- podman
- minikube
- helm
- pulumi
- volta

## Required for my first time setup

1. `brew install minikube`
2. `brew install podman`
3. Add my user to the sudoers file => `sudo echo "fabian ALL=(ALL) NOPASSWD: /usr/bin/podman" >> /etc/sudoers`
4. `minikube start`
5. `brew install helm`
6. `brew install pulumi`
7. `brew install volta`
8. `volta setup`

## Disabling default providers for pulumi

`pulumi config set --path 'pulumi:disable-default-providers[0]' '*'`

> I tested this and it was not yet fully functional, because of https://github.com/pulumi/pulumi/issues/8853

## Plan

- Setup grafana
- Setup prometheus
- Setup shelly plugs in my home
- scrape those shelly plugs
- monitor home energy consumption
- jail the plugs in a specific wifi for smart home appliances
- setup the wifi with the pulumi unifi controller

## Setup guide

1. Install OLM `curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.20.0/install.sh | bash -s v0.20.0`
   - <https://github.com/operator-framework/operator-lifecycle-manager>
2. Install the grafana operator `kubectl apply -f grafana/grafana-operator.yaml`

## Local DNS Service

3. Install CoreDNS `helm repo add coredns https://coredns.github.io/helm`

## Uninstalling an operator

<https://olm.operatorframework.io/docs/tasks/uninstall-operator/>
