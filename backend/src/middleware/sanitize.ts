import { Request, Response, NextFunction } from 'express';

// Strips HTML angle brackets from every string in the request body to blunt
// stored-XSS payloads. (React escapes output anyway; this is defense in depth.)
const clean = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/[<>]/g, '');
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, clean(v)]));
  }
  return value;
};

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
};
