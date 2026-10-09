import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps async route handlers so thrown errors reach the central error handler
// (which logs them to MongoDB + winston) instead of crashing the request.
export const asyncHandler =
  <T extends Request = Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
