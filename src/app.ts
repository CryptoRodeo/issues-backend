import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';
import logger from './utils/logger';
import issuesRoutes from './routes/issuesRoutes'

const app: Express = express();

// Apply middleware
app.use(helmet()) // Security headers
app.use(cors()); //Enable CORS
app.use(express.json()); //Parse JSON bodies

// Health check
app.get('/health', (_req, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Service is healthy' });
});

app.use('/api/v1/issues', issuesRoutes);

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

// Error handling middleware
app.use((err: Error, req: Request, res: Respnse, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack || '');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});


export default app;
