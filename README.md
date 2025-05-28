# Kite :kite:

Konflux Issue Tracking Engine

:construction: Under Construction, still a POC :construction:

## Features

- **Issue Tracking**: Track build failures, test failures, release issues, dependency problems, and pipeline failures in a centralized, extendable service.
- **CLI Integration**: Check issues from your terminal or as a kubectl plugin
- **Namespace Isolation**: Issues are separated by Kubernetes namespace for security
- **Automation Friendly**: Add Webhooks for automatic issue creation and resolution
- **API Access**: RESTful API for integration with other tools

## Project Structure

The project is organized in a monorepo with these main components:

- `packages/backend`: Node.js Express API server with PostgreSQL database
- `packages/cli`: Go-based command-line tool (works as standalone or kubectl plugin)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) v18 or later
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Go](https://golang.org/doc/install) v1.20 or later
- [Make](https://www.gnu.org/software/make/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

## Setting Up Your Development Environment

### 1. Clone the Repository

```bash
git clone https://github.com/cryptorodeo/kite.git
cd kite
```

### 2. Start Minikube

```bash
# Start a minikube cluster
minikube start

# Verify it's running
minikube status
```

### 3. Generate kube-config.yaml

For an easy setup process, Minikube is recommended as a local Kubernetes cluster.

Once it's installed, ensure it's set as the current context:
```bash
kubectl config current-context
minikube
```

If another value is returned, set minikube as the current context:
```bash
kubectl config set-context minikube
Context "minikube" modified.
```
Next, run this script to generate the `kube-config.yaml` file for the backend service:
```
chmod +x scripts/generate-kubeconfig.sh
./scripts/generate-kubeconfig.sh
```

This is used to talk to the cluster, allowing the service to perform actions like limiting issues by namespaces.

### 4. Start the Development Environment with Docker Compose

```bash
# Build and start the services
docker compose -f compose.yaml up -d --build

# Check if services are running
docker compose ps

# Stop services when needed
docker compose -f compose.yaml down -v
```

### 5. Build and Install the CLI Tool

```bash
# Build and install the CLI tool
yarn setup:cli

# This will:
# - Build the Go CLI binary
# - Install it to ~/.local/bin/konflux-issues
# - Set up the kubectl plugin
```

### 6. Access the Application

- API: http://localhost:3000

