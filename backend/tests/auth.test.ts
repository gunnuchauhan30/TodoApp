import request from 'supertest';
import app from '../src/app';
import { registerUser, authed } from './helpers';

describe('Auth API', () => {
  it('registers a user and returns access + refresh tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'Jane', email: 'jane@example.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  it('rejects duplicate emails and short passwords', async () => {
    await registerUser();
    const dup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'J', email: 'jane@example.com', password: 'secret123' });
    expect(dup.status).toBe(400);
    const short = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'J', email: 'x@example.com', password: '123' });
    expect(short.status).toBe(400);
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    await registerUser();
    const ok = await request(app).post('/api/v1/auth/login').send({ email: 'jane@example.com', password: 'secret123' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'jane@example.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('blocks NoSQL injection in login', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('rotates refresh tokens and revokes the old one', async () => {
    const { refreshToken } = await registerUser();
    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.data.refreshToken).not.toBe(refreshToken);
    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('protects /me and returns the user with a valid token', async () => {
    const { token } = await registerUser();
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    const me = await request(app).get('/api/v1/auth/me').set(authed(token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.name).toBe('Jane');
  });

  it('logout revokes the refresh token', async () => {
    const { token, refreshToken } = await registerUser();
    await request(app).post('/api/v1/auth/logout').set(authed(token)).expect(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(401);
  });
});
