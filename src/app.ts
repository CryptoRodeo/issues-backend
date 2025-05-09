import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './db';
import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';
import logger from './utils/logger';
import { checkNamespaceAccess } from './middleware/checkNamespaceAccess';

const app: Express = express();

// Apply middleware
app.use(helmet()) // Security headers
app.use(cors()); //Enable CORS
app.use(express.json()); //Parse JSON bodies
app.use(checkNamespaceAccess);
// Health check
app.get('/health', (_req, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Service is healthy' });
});

app.get('/', async (req: Request, res: Response) => {
  const issues = await prisma.issue.findMany();
  res.json(issues);
});

app.get('/pods', async (req: Request, res: Response) => {
  try {
    const kc = new KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(CoreV1Api);
    const namespace = req.query?.namespace ?? 'default';
    const response = await k8sApi.listNamespacedPod({ namespace: namespace as string });
    const podNames = response.items.map(pod => pod.metadata?.name);
    res.json({ pods: podNames });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to list pods' });
  }
});


export default app;
