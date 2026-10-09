import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { logError } from '../utils/errorLogger';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      await logError({
        errorMessage: 'Not authorized, no token',
        endpoint: req.path,
        method: req.method,
        statusCode: 401
      });

      res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
      return;
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email
      };

      next();
    } catch (error) {
      await logError({
        errorMessage: 'Invalid token',
        endpoint: req.path,
        method: req.method,
        statusCode: 401,
        errorStack: error instanceof Error ? error.stack : undefined
      });

      res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token'
      });
      return;
    }
  } catch (error) {
    await logError({
      errorMessage: 'Authentication error',
      endpoint: req.path,
      method: req.method,
      statusCode: 500,
      errorStack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};
