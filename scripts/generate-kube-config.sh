#!/bin/bash

# Script to generate a minimal kube-config.yaml file from the current kubectl context
# Usage: ./generate-kube-config.sh [output_file]

set -e

# Default output file
# You can pass an argument to override the default file name
OUTPUT_FILE="configs/${1:-kube-config.yaml}"

echo "Generating Kubernetes config file: $OUTPUT_FILE"

# Get current context
CURRENT_CONTEXT=$(kubectl config current-context)
echo "Using current context: $CURRENT_CONTEXT"

# Get cluster name from current context
CLUSTER_NAME=$(kubectl config view -o jsonpath="{.contexts[?(@.name == \"$CURRENT_CONTEXT\")].context.cluster}")
echo "Cluster name: $CLUSTER_NAME"

# Get user name from current context
USER_NAME=$(kubectl config view -o jsonpath="{.contexts[?(@.name == \"$CURRENT_CONTEXT\")].context.user}")
echo "User name: $USER_NAME"

# Get server URL
SERVER_URL=$(kubectl config view -o jsonpath="{.clusters[?(@.name == \"$CLUSTER_NAME\")].cluster.server}")
echo "Server URL: $SERVER_URL"

# Get certificate authority data if it exists
CA_DATA=$(kubectl config view --flatten -o jsonpath="{.clusters[?(@.name == \"$CLUSTER_NAME\")].cluster.certificate-authority-data}")
if [ -z "$CA_DATA" ]; then
  CA_PATH=$(kubectl config view -o jsonpath="{.clusters[?(@.name == \"$CLUSTER_NAME\")].cluster.certificate-authority}")
  if [ -n "$CA_PATH" ] && [ -f "$CA_PATH" ]; then
    CA_DATA=$(cat "$CA_PATH" | base64 -w 0)
    echo "Found CA at path: $CA_PATH"
  else
    echo "Warning: No certificate authority data found"
  fi
else
  echo "Found certificate authority data"
fi

# Get client certificate data if it exists
CLIENT_CERT_DATA=$(kubectl config view --flatten -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.client-certificate-data}")
if [ -z "$CLIENT_CERT_DATA" ]; then
  CLIENT_CERT_PATH=$(kubectl config view -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.client-certificate}")
  if [ -n "$CLIENT_CERT_PATH" ] && [ -f "$CLIENT_CERT_PATH" ]; then
    CLIENT_CERT_DATA=$(cat "$CLIENT_CERT_PATH" | base64 -w 0)
    echo "Found client certificate at path: $CLIENT_CERT_PATH"
  else
    echo "No client certificate data found"
  fi
else
  echo "Found client certificate data"
fi

# Get client key data if it exists
CLIENT_KEY_DATA=$(kubectl config view --flatten -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.client-key-data}")
if [ -z "$CLIENT_KEY_DATA" ]; then
  CLIENT_KEY_PATH=$(kubectl config view -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.client-key}")
  if [ -n "$CLIENT_KEY_PATH" ] && [ -f "$CLIENT_KEY_PATH" ]; then
    CLIENT_KEY_DATA=$(cat "$CLIENT_KEY_PATH" | base64 -w 0)
    echo "Found client key at path: $CLIENT_KEY_PATH"
  else
    echo "No client key data found"
  fi
else
  echo "Found client key data"
fi

# Get token if it exists
TOKEN=$(kubectl config view -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.token}")
if [ -z "$TOKEN" ]; then
  TOKEN_PATH=$(kubectl config view -o jsonpath="{.users[?(@.name == \"$USER_NAME\")].user.tokenFile}")
  if [ -n "$TOKEN_PATH" ] && [ -f "$TOKEN_PATH" ]; then
    TOKEN=$(cat "$TOKEN_PATH")
    echo "Found token at path: $TOKEN_PATH"
  else
    echo "No token found"
  fi
else
  echo "Found token"
fi

# Create the kubeconfig file
cat >"$OUTPUT_FILE" <<EOF
apiVersion: v1
kind: Config
clusters:
- name: $CLUSTER_NAME
  cluster:
    server: $SERVER_URL
EOF

# Add certificate authority data if available
if [ -n "$CA_DATA" ]; then
  cat >>"$OUTPUT_FILE" <<EOF
    certificate-authority-data: $CA_DATA
EOF
fi

# Continue with the rest of the config
cat >>"$OUTPUT_FILE" <<EOF
contexts:
- name: $CURRENT_CONTEXT
  context:
    cluster: $CLUSTER_NAME
    user: $USER_NAME
current-context: $CURRENT_CONTEXT
users:
- name: $USER_NAME
  user:
EOF

# Add authentication details
if [ -n "$CLIENT_CERT_DATA" ] && [ -n "$CLIENT_KEY_DATA" ]; then
  cat >>"$OUTPUT_FILE" <<EOF
    client-certificate-data: $CLIENT_CERT_DATA
    client-key-data: $CLIENT_KEY_DATA
EOF
elif [ -n "$TOKEN" ]; then
  cat >>"$OUTPUT_FILE" <<EOF
    token: $TOKEN
EOF
else
  echo "Warning: No authentication credentials found"
  cat >>"$OUTPUT_FILE" <<EOF
    # No authentication credentials found
    # You may need to manually add authentication details here
EOF
fi

echo "Config file generated at: $OUTPUT_FILE"
echo "You can now use this file with your application by setting KUBE_CONFIG_PATH=$OUTPUT_FILE"
