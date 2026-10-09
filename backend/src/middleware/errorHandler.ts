import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logError } from '../utils/errorLogger';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/HttpError';
import { AuthRequest } from '../types';

export const errorHandler = async (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  let statusCode = 500;

  if (err instanceof HttpError) statusCode = err.statusCode;
  else if (err instanceof multer.MulterError) statusCode = 400;
  else if (err.name === 'ValidationError' || err.name === 'CastError') statusCode = 400;
  else if (err.status && err.status >= 400 && err.status < 600) statusCode = err.status;
  else if (res.statusCode && res.statusCode !== 200) statusCode = res.statusCode;

  const message = statusCode === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  if (statusCode >= 500) logger.error(err.stack || err.message);
  else logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);

  await logError({
    errorMessage: err.message,
    errorStack: err.stack,
    endpoint: req.path || '/',
    method: req.method,
    userId: (req as AuthRequest).user?.id,
    statusCode
  });

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404);
  next(new HttpError(404, `Not Found - ${req.originalUrl}`));
};
