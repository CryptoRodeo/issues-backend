import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export default function logRequests(req: Request, res: Response, next: NextFunction) {
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
}