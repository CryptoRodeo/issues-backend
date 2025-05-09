import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const scope_failed_build_frontend = await prisma.issueScope.create({
    data: { resourceType: "component", resourceName: "frontend-ui", resourceNamespace: "team-alpha" }
  });
  const failed_build_frontend = await prisma.issue.create({
    data: {
      title: "Frontend build failed due to dependency conflict",
      description: "The build process for the frontend component failed because of conflicting versions of React dependencies",
      severity: "major",
      issueType: "build",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-30T15:45:30Z"),
      resolvedAt: null,
      namespace: "team-alpha",
      scope: { connect: { id: scope_failed_build_frontend.id } },
      links: {
        create: [
          { title: "Build Logs", url: "https://konflux.dev/logs/build/frontend-ui/12345" },
          { title: "Fix Instructions", url: "https://konflux.dev/docs/fixing-dependency-conflicts" },
        ]
      },
    }
  });
  const scope_failed_test_api = await prisma.issueScope.create({
    data: { resourceType: "component", resourceName: "backend-api", resourceNamespace: "team-alpha" }
  });
  const failed_test_api = await prisma.issue.create({
    data: {
      title: "API integration tests failing on database connection",
      description: "Integration tests for the API component are failing because the database connection is timing out",
      severity: "critical",
      issueType: "test",
      state: "ACTIVE",
      detectedAt: new Date("2025-05-01T09:15:22Z"),
      resolvedAt: null,
      namespace: "team-alpha",
      scope: { connect: { id: scope_failed_test_api.id } },
      links: {
        create: [
          { title: "Test Logs", url: "https://konflux.dev/logs/test/backend-api/23456" },
          { title: "Database Connection Guide", url: "https://konflux.dev/docs/database-connection-troubleshooting" },
        ]
      },
    }
  });
  const scope_release_failed_production = await prisma.issueScope.create({
    data: { resourceType: "application", resourceName: "e-commerce-app", resourceNamespace: "team-beta" }
  });
  const release_failed_production = await prisma.issue.create({
    data: {
      title: "Production release failed during deployment",
      description: "The production release of the e-commerce application failed during the deployment phase due to resource limits",
      severity: "critical",
      issueType: "release",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-29T18:30:45Z"),
      resolvedAt: null,
      namespace: "team-beta",
      scope: { connect: { id: scope_release_failed_production.id } },
      links: {
        create: [
          { title: "Release Logs", url: "https://konflux.dev/logs/release/e-commerce-app/34567" },
          { title: "Resource Configuration Guide", url: "https://konflux.dev/docs/resource-configuration" },
        ]
      },
    }
  });
  const scope_dependency_update_needed_frontend = await prisma.issueScope.create({
    data: { resourceType: "component", resourceName: "frontend-ui", resourceNamespace: "team-alpha" }
  });
  const dependency_update_needed_frontend = await prisma.issue.create({
    data: {
      title: "Frontend dependency updates available",
      description: "Security vulnerabilities found in current dependencies. Updates are available and recommended.",
      severity: "major",
      issueType: "dependency",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-28T14:20:10Z"),
      resolvedAt: null,
      namespace: "team-alpha",
      scope: { connect: { id: scope_dependency_update_needed_frontend.id } },
      links: {
        create: [
          { title: "Dependency Report", url: "https://konflux.dev/security/dependencies/frontend-ui/78901" },
          { title: "Update Instructions", url: "https://konflux.dev/docs/updating-dependencies-safely" },
        ]
      },
    }
  });
  const scope_pipeline_outdated = await prisma.issueScope.create({
    data: { resourceType: "workspace", resourceName: "data-processing-workspace", resourceNamespace: "team-gamma" }
  });
  await prisma.issue.create({
    data: {
      title: "Pipeline tasks using deprecated API versions",
      description: "Several pipeline tasks are using API versions that will be deprecated in the next Konflux update",
      severity: "minor",
      issueType: "pipeline",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-25T11:10:30Z"),
      resolvedAt: null,
      namespace: "team-gamma",
      scope: { connect: { id: scope_pipeline_outdated.id } },
      links: {
        create: [
          { title: "Pipeline Configuration", url: "https://konflux.dev/pipelines/data-processing-workspace/45678" },
          { title: "API Migration Guide", url: "https://konflux.dev/docs/api-migration-guide" },
        ]
      },
    }
  });
  const scope_failed_pipeline_run = await prisma.issueScope.create({
    data: { resourceType: "pipelinerun", resourceName: "analytics-service-deploy-123", resourceNamespace: "team-delta" }
  });
  const failed_pipeline_run = await prisma.issue.create({
    data: {
      title: "Pipeline run failed during deployment stage",
      description: "The pipeline run for the analytics service failed during the deployment stage due to insufficient permissions",
      severity: "major",
      issueType: "pipeline",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-30T16:45:20Z"),
      resolvedAt: null,
      namespace: "team-delta",
      scope: { connect: { id: scope_failed_pipeline_run.id } },
      links: {
        create: [
          { title: "Pipeline Run Logs", url: "https://konflux.dev/logs/pipelinerun/analytics-service-deploy-123/56789" },
          { title: "Permissions Configuration Guide", url: "https://konflux.dev/docs/pipeline-permissions" },
        ]
      },
    }
  });
  const scope_test_flaky_mobile = await prisma.issueScope.create({
    data: { resourceType: "component", resourceName: "mobile-app", resourceNamespace: "team-alpha" }
  });
  await prisma.issue.create({
    data: {
      title: "Mobile app tests showing intermittent failures",
      description: "The integration tests for the mobile app component are showing intermittent failures that may be related to test environment stability",
      severity: "minor",
      issueType: "test",
      state: "RESOLVED",
      detectedAt: new Date("2025-04-28T10:25:15Z"),
      resolvedAt: new Date("2025-04-29T14:35:40Z"),
      namespace: "team-alpha",
      scope: { connect: { id: scope_test_flaky_mobile.id } },
      links: {
        create: [
          { title: "Test Logs", url: "https://konflux.dev/logs/test/mobile-app/67890" },
          { title: "Test Environment Guide", url: "https://konflux.dev/docs/test-environment-setup" },
        ]
      },
    }
  });
  const scope_outdated_dependency_database = await prisma.issueScope.create({
    data: { resourceType: "application", resourceName: "e-commerce-app", resourceNamespace: "team-beta" }
  });
  const outdated_dependency_database = await prisma.issue.create({
    data: {
      title: "Database client library needs security update",
      description: "The database client library used by multiple components has a critical security vulnerability that needs to be addressed",
      severity: "critical",
      issueType: "dependency",
      state: "RESOLVED",
      detectedAt: new Date("2025-04-25T09:20:30Z"),
      resolvedAt: new Date("2025-04-30T13:40:15Z"),
      namespace: "team-beta",
      scope: { connect: { id: scope_outdated_dependency_database.id } },
      links: {
        create: [
          { title: "Security Advisory", url: "https://konflux.dev/security/advisories/CVE-2025-1234" },
          { title: "Update Instructions", url: "https://konflux.dev/docs/database-library-update" },
        ]
      },
    }
  });
  const scope_build_warning_logging = await prisma.issueScope.create({
    data: { resourceType: "component", resourceName: "logging-service", resourceNamespace: "team-gamma" }
  });
  await prisma.issue.create({
    data: {
      title: "Build warnings in logging component",
      description: "The logging component is generating build warnings about deprecated APIs that should be addressed",
      severity: "info",
      issueType: "build",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-27T15:30:45Z"),
      resolvedAt: null,
      namespace: "team-gamma",
      scope: { connect: { id: scope_build_warning_logging.id } },
      links: {
        create: [
          { title: "Build Logs", url: "https://konflux.dev/logs/build/logging-service/89012" },
          { title: "API Migration Guide", url: "https://konflux.dev/docs/api-migration-guide" },
        ]
      },
    }
  });
  const scope_database_connection_timeout = await prisma.issueScope.create({
    data: { resourceType: "workspace", resourceName: "main-workspace", resourceNamespace: "team-alpha" }
  });
  const database_connection_timeout = await prisma.issue.create({
    data: {
      title: "Database connection timeouts affecting multiple components",
      description: "Database connection timeouts are occurring across multiple components, potentially due to configuration or resource constraints",
      severity: "critical",
      issueType: "release",
      state: "ACTIVE",
      detectedAt: new Date("2025-05-01T08:10:25Z"),
      resolvedAt: null,
      namespace: "team-alpha",
      scope: { connect: { id: scope_database_connection_timeout.id } },
      links: {
        create: [
          { title: "Infrastructure Logs", url: "https://konflux.dev/logs/infrastructure/database/90123" },
          { title: "Database Scaling Guide", url: "https://konflux.dev/docs/database-scaling" },
        ]
      },
    }
  });
  const scope_permission_config_incorrect = await prisma.issueScope.create({
    data: { resourceType: "application", resourceName: "analytics-service", resourceNamespace: "team-delta" }
  });
  const permission_config_incorrect = await prisma.issue.create({
    data: {
      title: "Incorrect permission configuration for deployment service account",
      description: "The service account used for deployments has insufficient permissions, causing pipeline failures",
      severity: "major",
      issueType: "release",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-30T15:30:10Z"),
      resolvedAt: null,
      namespace: "team-delta",
      scope: { connect: { id: scope_permission_config_incorrect.id } },
      links: {
        create: [
          { title: "RBAC Configuration", url: "https://konflux.dev/config/rbac/analytics-service/12345" },
          { title: "Service Account Guide", url: "https://konflux.dev/docs/service-account-configuration" },
        ]
      },
    }
  });
  const scope_resource_quota_exceeded = await prisma.issueScope.create({
    data: { resourceType: "application", resourceName: "e-commerce-app", resourceNamespace: "team-beta" }
  });
  const quota_issue = await prisma.issue.create({
    data: {
      title: "Namespace resource quota exceeded during deployment",
      description: "The namespace resource quota was exceeded during the deployment phase, causing the release to fail",
      severity: "critical",
      issueType: "release",
      state: "ACTIVE",
      detectedAt: new Date("2025-04-29T18:15:30Z"),
      resolvedAt: null,
      namespace: "team-beta",
      scope: { connect: { id: scope_resource_quota_exceeded.id } },
      links: {
        create: [
          { title: "Resource Usage Report", url: "https://konflux.dev/config/resources/team-beta/23456" },
          { title: "Resource Planning Guide", url: "https://konflux.dev/docs/resource-planning" },
        ]
      },
    }
  });
  // Related issues
  await prisma.relatedIssue.create({ data: { sourceId: failed_build_frontend.id, targetId: dependency_update_needed_frontend.id } });
  await prisma.relatedIssue.create({ data: { sourceId: failed_test_api.id, targetId: database_connection_timeout.id } });
  await prisma.relatedIssue.create({ data: { sourceId: release_failed_production.id, targetId: quota_issue.id } });
  await prisma.relatedIssue.create({ data: { sourceId: failed_pipeline_run.id, targetId: permission_config_incorrect.id } });
  await prisma.relatedIssue.create({ data: { sourceId: outdated_dependency_database.id, targetId: database_connection_timeout.id } });
}
main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());

