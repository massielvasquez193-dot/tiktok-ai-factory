/**
 * Auth Module Integration Tests
 *
 * Run: npm run test -w apps/server
 * Requires: DATABASE_URL pointing to a test database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// We use a dynamic import so the server doesn't start listening during require()
let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  // NODE_ENV=test prevents the server from calling app.listen (see index.ts)
  const mod = await import('../index');
  app = mod.default;
});

describe('POST /api/auth/register', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION');
  });

  it('should reject short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: '123' });
    expect(res.status).toBe(400);
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'testpassword123', name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.tenant).toBeDefined();
    expect(res.body.tenant.name).toContain('Test User');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'testpassword123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  const testEmail = `login-${Date.now()}@example.com`;
  const password = 'securepass123';

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password, name: 'Login Test' });
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testEmail);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const email = `refresh-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'refreshpass123' });
    refreshToken = res.body.refreshToken;
  });

  it('should reject missing token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(400);
  });

  it('should refresh token successfully', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshToken); // should be rotated
  });

  it('should reject reused refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken }); // old token
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const email = `me-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'mepass123', name: 'Me Test' });
    accessToken = res.body.accessToken;
  });

  it('should reject without auth header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBeDefined();
    expect(res.body.creditWallet).toBeDefined();
    expect(res.body.memberships).toBeDefined();
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const email = `logout-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'logoutpass123' });
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should logout and revoke refresh token', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    // Refresh token should be revoked
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});
