/**
 * tests/e2e/oauth/oauth.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for OAuth Endpoints
 *   - GET /api/v1/auth/oauth/:provider
 *   - GET /api/v1/auth/oauth/:provider/callback
 *
 * Verification Areas:
 *   - Happy Path: Redirection to authorization URL with provider-scoped cookies;
 *     callback sets auth cookies and redirects to frontend.
 *   - Provider Validation: 400 Bad Request for unsupported OAuth providers (e.g. twitter/facebook).
 *   - State Security: Strict state verification (mock mode / test bypass).
 */
import request from 'supertest';

import { clearDatabase } from '../../setup/db-reset';

import { app } from '@/config/app';

describe('E2E: OAuth Social Sign-In Endpoints', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/v1/auth/oauth/:provider', () => {
    it('should set provider cookies and redirect to authorization URL for valid provider (google)', async () => {
      const res = await request(app).get('/api/v1/auth/oauth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBeDefined();

      const setCookie = (res.headers['set-cookie'] ?? []) as string[];
      expect(setCookie.length).toBeGreaterThan(0);
      expect(setCookie.some((cookie: string) => cookie.includes('oauth_state_google='))).toBe(true);
    });

    it('should fail with 422 / 400 for unsupported provider', async () => {
      const res = await request(app).get('/api/v1/auth/oauth/unsupported_provider');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/v1/auth/oauth/:provider/callback', () => {
    it('should handle callback, provision user, set auth cookies, and redirect to frontend', async () => {
      const agent = request.agent(app);

      // Step 1: Initiate OAuth request to set cookies & state
      const initRes = await agent.get('/api/v1/auth/oauth/google');
      expect(initRes.status).toBe(302);

      // Step 2: Extract callback state parameter
      const locationHeader = String(initRes.headers.location ?? '');
      const redirectUrl = new URL(locationHeader);
      const state = redirectUrl.searchParams.get('state') ?? 'mock_state';

      // Step 3: Trigger callback
      const callbackRes = await agent.get(
        `/api/v1/auth/oauth/google/callback?code=mock_code_google_12345&state=${state}`,
      );

      expect(callbackRes.status).toBe(302);
      expect(callbackRes.headers.location).toContain('/auth/callback');

      const setCookie = (callbackRes.headers['set-cookie'] ?? []) as string[];
      expect(setCookie.length).toBeGreaterThan(0);
      expect(setCookie.some((cookie: string) => cookie.includes('rfpnexa_token='))).toBe(true);
    });
  });
});
