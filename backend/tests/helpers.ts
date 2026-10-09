import request from 'supertest';
import app from '../src/app';

export const registerUser = async (email = 'jane@example.com') => {
  const res = await request(app).post('/api/v1/auth/signup').send({ name: 'Jane', email, password: 'secret123' });
  return res.body.data as { token: string; refreshToken: string; user: { id: string } };
};

export const authed = (token: string) => ({ Authorization: `Bearer ${token}` });
