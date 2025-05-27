# Build stage
FROM registry.redhat.io/rhel9/go-toolset AS builder

USER root

# Install minimal build dependencies
RUN dnf install -y git && \
    dnf clean all

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimization flags to reduce binary size
#
# CGO_ENABLED=0 - Turn off C-Go integration. 
# This allows the app to
# - be a self-contained binary that doesnt need external C libraries
# - work on any linux system
# - be used in a small, portable container
#
# GOOS=linux sets the target OS (Linux)
#
# -a Force rebuilds all packages
#
# -ldflags="-w -s" passesflags to the linker to make smaller binaries
# -w = removing debugging information
# -s = remove symbol table
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-w -s" -o server cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-w -s" -o seeder cmd/seed/main.go

# Runtime stage - use minimal RHEL image
FROM registry.redhat.io/ubi9/ubi-minimal

# Install only runtime dependencies
RUN microdnf install -y postgresql && \
    curl -sSf https://atlasgo.sh | sh && \
    microdnf clean all && \
    rm -rf /var/cache/yum

# Create non-root user
RUN useradd -u 1001 -r -g 0 -s /sbin/nologin appuser

WORKDIR /opt/app-root/src

# Copy built binaries
COPY --from=builder /build/server .
COPY --from=builder /build/seeder .

# Copy necessary files
COPY atlas.hcl .
COPY migrations/ ./migrations/
COPY scripts/entrypoint.sh .
COPY --chown=1001:0 configs/kube-config.yaml /opt/app-root/src/configs/

# Set permissions and timezone
RUN chmod +x entrypoint.sh && \
    chown -R 1001:0 /opt/app-root/src

ENV TZ=UTC
ENV PROJECT_ENV=development

USER 1001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://localhost:3000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
