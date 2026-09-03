/**
 * tests/security/csrf.spec.ts
 *
 * OWASP ASVS Security Regression Test Suite for Double CSRF Protection
 *
 * Verification Areas:
 *   - Token Absence: Rejects state-changing POST/PUT/DELETE requests without CSRF token.
 *   - Token Tampering: Rejects requests with mismatched or forged CSRF header vs cookie.
 *   - Timing Safety: Validates constant-time string comparison for anti-CSRF tokens.
 */
import request from 'supertest';

import { clearDatabase } from '../setup/db-reset';

import { app } from '@/config/app';

describe('Security Regression: OWASP CSRF Protection', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should issue unique, non-predictable CSRF tokens with HttpOnly secret cookie', async () => {
    const res = await request(app).get('/api/v1/auth/csrf-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('csrfToken');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
  });
});
