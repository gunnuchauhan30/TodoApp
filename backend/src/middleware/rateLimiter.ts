import rateLimit from 'express-rate-limit';

const skip = () => process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Stricter limiter for credential endpoints (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many authentication attempts, please try again in 15 minutes.' }
});
