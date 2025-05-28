import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export default function handleErrors(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack || '');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
}