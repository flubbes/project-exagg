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

- ✅ Setup grafana
- ✅ Setup prometheus
- ✅ Setup shelly plugs in my home
- ✅ scrape those shelly plugs
- ✅ monitor home energy consumption
- ✅ jail the plugs in a specific wifi for smart home appliances
- make services discoverable over `grafana.bergnet`
  - setup coredns
  - configure cordns to use 1.1.1.1 as fallback
  - make coredns the default dns server over dhcp
  - deploy external dns and configure the coredns service
  - setup nginx-ingress controller
  - make ingresses automatically locally available
- configure unifi config over terraform provider

## Local DNS with CoreDNS Requirements

- k3s with traefik as ingress controller
- disable resolved on ubuntu to listen on port 53 => https://www.linuxuprising.com/2020/07/ubuntu-how-to-free-up-port-53-used-by.html

## Uninstalling an operator

<https://olm.operatorframework.io/docs/tasks/uninstall-operator/>
