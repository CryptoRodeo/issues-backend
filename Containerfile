# Build stage
#FROM golang:1.24-alpine AS builder
FROM registry.redhat.io/rhel9/go-toolset AS builder

# Set root user to install build dependencies
USER root

# Install git for go modules
RUN dnf install -y git

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the main application
#
# Notes:
#
# CGO_ENABLED=0
# - Turn off C-Go integration, don't use any C code libraries
# This keeps the program self-contained and portable.
#
# GOOS=linux
# Build the program for Linux OS so we can run this on Docker/Podman
#
# -a -> force rebuilding everything
RUN CGO_ENABLED=0 GOOS=linux go build -a -o server cmd/server/main.go

# Build the seeder application
RUN CGO_ENABLED=0 GOOS=linux go build -a -o seeder cmd/seed/main.go

# Final stage
FROM registry.redhat.io/rhel9/go-toolset

USER root

# Install postgresql and Atlas CLI for database operations
RUN dnf install -y postgresql bash && \
    curl -sSf https://atlasgo.sh | sh

# Default working directory in the base image is /opt/app-root/src , no need to set.

# Copy built binaries
COPY --from=builder /build/server .
COPY --from=builder /build/seeder .

# Copy Atlas configuration and migrations
COPY atlas.hcl .
COPY migrations/ ./migrations/

# Copy entrypoint script
COPY scripts/entrypoint.sh .

# Set timezone
ENV TZ=UTC

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 3000

# Copy custom kubeconfig file
COPY --chown=1001:1001 configs/kube-config.yaml /opt/app-root/src/configs/
COPY --chown=1001:1001 scripts/entrypoint.sh /opt/app-root/src/
RUN chmod +x entrypoint.sh

ENV PROJECT_ENV="development"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD  curl --fail --silent http://localhost:3000/health || exit 1

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
