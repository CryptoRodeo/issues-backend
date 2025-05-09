import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger';
import issuesRoutes from './routes/issues'

const app: Express = express();

// Apply middleware
app.use(helmet()) // Security headers
app.use(cors()); //Enable CORS
app.use(express.json()); //Parse JSON bodies


// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
});

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

app.use('/api/v1/issues', issuesRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack || '');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

export default app;
