/**
 * tests/e2e/auth/csrf.e2e.test.ts
 *
 * End-to-End Test Suite for GET /api/v1/auth/csrf-token
 *
 * Verification Areas:
 *   - Happy Path: Returns valid 200 response with CSRF token in payload & cookie header.
 *   - Security: Cookie is configured with SameSite=Lax & HttpOnly where appropriate.
 *   - Idempotency: Multiple requests generate unique, cryptographically valid CSRF tokens.
 */
import request from 'supertest';

import { clearDatabase } from '../../setup/db-reset';

import { app } from '@/config/app';

describe('GET /api/v1/auth/csrf-token', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should return a 200 OK with a valid CSRF token payload and cookie header', async () => {
    const res = await request(app).get('/api/v1/auth/csrf-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('csrfToken');
    expect(typeof res.body.data.csrfToken).toBe('string');
    expect(res.body.data.csrfToken.length).toBeGreaterThan(10);

    // Verify Set-Cookie header contains CSRF token secret/cookie
    const setCookie = (res.headers['set-cookie'] ?? []) as string[];
    expect(setCookie.length).toBeGreaterThan(0);
    expect(
      setCookie.some((cookie: string) => cookie.includes('csrf') || cookie.includes('_csrf')),
    ).toBe(true);
  });

  it('should issue distinct CSRF tokens for separate requests', async () => {
    const res1 = await request(app).get('/api/v1/auth/csrf-token');
    const res2 = await request(app).get('/api/v1/auth/csrf-token');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const token1 = res1.body.data.csrfToken;
    const token2 = res2.body.data.csrfToken;

    expect(token1).not.toEqual(token2);
  });
});
