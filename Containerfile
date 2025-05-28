FROM registry.redhat.io/ubi9/nodejs-22:latest

# Set root user to install dependencies
USER root

# Install dev dependencies
RUN dnf install -y nc postgresql

# Set non-root user
USER 1001

# The working directory is already set to /opt/app-root/src in the base image
# No need to set WORKDIR explicitly

RUN node --version
RUN npm install -g yarn
RUN yarn --version

# We'll mount the source code from host, so we don't copy it here.
# Instead, we prepare the container with the right environment.

RUN mkdir -p opt/app-root/src/packages/backend

# Copy package files
COPY --chown=1001:1001 package.json yarn.lock ./
COPY --chown=1001:1001 packages/backend/package.json ./packages/backend/
COPY --chown=1001:1001 packages/backend/prisma ./packages/backend/prisma/

# IMPORTANT: Copy the Prisma files before generating
COPY packages/backend/prisma ./packages/backend/prisma/

# Install dependencies
# Generate Prisma client
RUN yarn install && \
  cd packages/backend && \
  npx prisma generate

# Expose port
EXPOSE 3000

# Copy custom kubeconfig file
COPY --chown=1001:1001 configs/kube-config.yaml /opt/app-root/src/configs/

# Set environment variables to use at runtime
ENV NODE_ENV=development
ENV LOG_LEVEL=info
#ENV KUBECONFIG=/opt/app-root/src/.kube/config
ENV KUBE_CONFIG_PATH=/opt/app-root/src/configs/kube-config.yaml
ENV DATABASE_URL="postgresql://kite:postgres@db:5432/issuesdb"

# Start the app with a script that waits for the db
COPY --chown=1001:1001 scripts/entrypoint.sh /
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
# Run this after entrypoint script
CMD ["yarn", "dev"]
