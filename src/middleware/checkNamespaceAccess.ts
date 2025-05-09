import { Request, Response, NextFunction } from 'express';
import { KubeConfig, AuthorizationV1Api, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import logger from '../utils/logger';

const kc = new KubeConfig();
kc.loadFromDefault();
const authApi = kc.makeApiClient(AuthorizationV1Api);

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
    const result = await authApi.createSelfSubjectAccessReview(selfSubjectAccessReview);
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
