/**
 * Credits Module Integration Tests
 *
 * Run: npm run test -w apps/server
 * Requires: Running server with test DB
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const mod = await import('../index');
  app = mod.default;
});

describe('Credits API', () => {
  let accessToken: string;

  beforeAll(async () => {
    const email = `credits-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'creditpass123' });
    accessToken = res.body.accessToken;
  });

  describe('GET /api/credits/balance', () => {
    it('should reject without auth', async () => {
      const res = await request(app).get('/api/credits/balance');
      expect(res.status).toBe(401);
    });

    it('should return credit balance', async () => {
      const res = await request(app)
        .get('/api/credits/balance')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance');
      expect(res.body).toHaveProperty('lifetime');
      expect(res.body).toHaveProperty('frozen');
      // New users get 50 free credits
      expect(res.body.balance).toBe(50);
    });
  });

  describe('POST /api/credits/check', () => {
    it('should return hasEnough for affordable amount', async () => {
      const res = await request(app)
        .post('/api/credits/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 10 });
      expect(res.status).toBe(200);
      expect(res.body.hasEnough).toBe(true);
    });

    it('should return !hasEnough for unaffordable amount', async () => {
      const res = await request(app)
        .post('/api/credits/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 99999 });
      expect(res.status).toBe(200);
      expect(res.body.hasEnough).toBe(false);
    });
  });

  describe('GET /api/credits/ledger', () => {
    it('should return ledger entries', async () => {
      const res = await request(app)
        .get('/api/credits/ledger')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      // Should have initial credit grant from registration
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Admin Credits API', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Register an admin user (in real test, you'd seed this)
    const adminEmail = `admin-credits-${Date.now()}@example.com`;
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ email: adminEmail, password: 'adminpass123' });
    adminToken = adminRes.body.accessToken;
    // Note: In a real test, you'd update the user role to admin in DB directly
    // For now, we just verify the guard works

    const userEmail = `user-credits-${Date.now()}@example.com`;
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'userpass123' });
    userToken = userRes.body.accessToken;
  });

  it('should reject non-admin from admin routes', async () => {
    const res = await request(app)
      .post('/api/credits/admin/adjust')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 'fake-id', amount: 100, reason: 'test' });
    expect(res.status).toBe(403);
  });
});
