import { Request, Response, NextFunction } from 'express';
import { KubeConfig, AuthorizationV1Api, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../utils/logger';

// Initialize Kubernetes client
let authApi: AuthorizationV1Api | null = null;

// Check if we should skip Kubernetes access checks
const skipKubeAccessCheck = process.env.SKIP_KUBE_ACCESS_CHECK === 'true';

// Path to the custom config file (can be configured through env vars)
const kubeConfigPath = process.env.KUBE_CONFIG_PATH || path.resolve(process.cwd(), 'configs/kube-config.yaml');

if (!skipKubeAccessCheck) {
  try {
    // Check if the custom config file exists
    if (fs.existsSync(kubeConfigPath)) {
      const kc = new KubeConfig();
      kc.loadFromFile(kubeConfigPath);
      authApi = kc.makeApiClient(AuthorizationV1Api);
      logger.info(`Kubernetes client initialized successfully from ${kubeConfigPath}`);
    } else {
      // Fall back to default config on the host if custom file doesn't exist
      logger.warn(`Custom kubeconfig file not found at ${kubeConfigPath}, trying default config`);
      const kc = new KubeConfig();
      try {
        kc.loadFromDefault();
        authApi = kc.makeApiClient(AuthorizationV1Api);
        logger.info('Kubernetes client initialized successfully from default config');
      } catch (defaultErr) {
        logger.warn(`Failed to initialize Kubernetes client from default config: ${defaultErr}`);
        authApi = null;
      }
    }
  } catch (error) {
    logger.warn(`Failed to initialize Kubernetes client: ${error}. Namespace access checks will be bypassed.`);
    authApi = null;
  }
} else {
  logger.info('Kubernetes access checks are disabled by environment variable');
}

export async function checkNamespaceAccess(req: Request, res: Response, next: NextFunction) {
  const namespace = req.params.namespace || req.body.namespace || req.query.namespace;

  if (!namespace) {
    return res.status(400).json({ error: 'Missing namespace' });
  }

  try {

    // There is no native way to check if a user has access on a namespace
    // so let's check if they can at least list pods.
    const selfSubjectAccessReview: { body: V1SelfSubjectAccessReview } = {
      body: {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          resourceAttributes: {
            namespace,
            verb: 'get',
            resource: 'pods',
          }
        }
      }
    }
    const result = await authApi?.createSelfSubjectAccessReview(selfSubjectAccessReview);
    if (result?.status?.allowed) {
      logger.info('Access Allowed');
      return next();
    } else {
      logger.warn('Access Denied');
      return res.status(403).json({ error: 'Access denied to this namespace' })
    }
  } catch (err) {
    logger.error(`Namespace access error: ${err}`);
  }
};
