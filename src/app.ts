import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import issuesRoutes from './routes/issues'
import webhooksRouter from './routes/webhooks';
import logRequests from './middleware/requestLogger';
import handleErrors from './middleware/errorHandler';
const app: Express = express();

// Apply middleware
app.use(helmet()) // Security headers
app.use(cors()); //Enable CORS
app.use(express.json()); //Parse JSON bodies
// Request logging middleware
app.use(logRequests);
// Error handling middleware
app.use(handleErrors);

// Health check
app.get('/health', (_req, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Service is healthy' });
});

// API version
app.get('/version', (_req: Request, res: Response) => {
  res.status(200).json({
    version: '1.0.0',
    name: 'Konflux Issues API',
    description: 'API for managing issues in Konflux'
  });
});

// Mount routes
app.use('/api/v1/issues', issuesRoutes);
app.use('/api/v1/webhooks', webhooksRouter);

export default app;
