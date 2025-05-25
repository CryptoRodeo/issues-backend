# Build stage
FROM golang:1.24-alpine AS builder

# Install git for go modules
RUN apk add --no-cache git ca-certificates tzdata curl

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
# - Turn off C-Go integratin, don't use any C code libraries
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
FROM alpine:latest

# Install ca-certificates for HTTPS requests, postgresql-client for database operations, and Atlas CLI
RUN apk --no-cache add ca-certificates postgresql-client bash curl && \
    curl -sSf https://atlasgo.sh | sh

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

WORKDIR /app

# Copy built binaries
COPY --from=builder /build/server .
COPY --from=builder /build/seeder .

# Copy Atlas configuration and migrations
COPY atlas.hcl .
COPY migrations/ ./migrations/

# Copy entrypoint script
COPY scripts/entrypoint.sh .

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Set timezone
ENV TZ=UTC

# Fix line endings and make entrypoint script executable
RUN sed -i 's/\r$//' entrypoint.sh && \
    chmod +x entrypoint.sh && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]