import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const accessSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not defined');
  return s;
};

const refreshSecret = (): string => process.env.JWT_REFRESH_SECRET || `${accessSecret()}_refresh`;

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRE || '15m') as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, accessSecret(), options);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || process.env.JWT_EXPIRE || '7d') as jwt.SignOptions['expiresIn'],
    jwtid: crypto.randomUUID()
  };
  return jwt.sign(payload, refreshSecret(), options);
};

export const verifyToken = (token: string): JwtPayload => jwt.verify(token, accessSecret()) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload => jwt.verify(token, refreshSecret()) as JwtPayload;

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
