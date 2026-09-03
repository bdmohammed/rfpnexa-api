/**
 * tests/e2e/customer/me.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for GET /api/v1/auth/me
 *
 * Verification Areas:
 *   - Happy Path: Returns 200 OK with sanitized user profile payload for authenticated session.
 *   - Unauthenticated: Returns 401 Unauthorized when access token cookie is missing or invalid.
 */
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: GET /api/v1/auth/me', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should return 200 OK with sanitized user profile when authenticated', async () => {
    const { user, rawPassword } = await Users.active();

    // Login
    const loginRes = await AuthClient.login(
      _agent,
      { email: user.email, password: rawPassword },
      _csrfToken,
    );
    expect(loginRes.status).toBe(200);

    // Get Me profile
    const cookies = (loginRes.headers['set-cookie'] ?? []) as string[];
    const res = await AuthClient.getMe(_agent, cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', user.id);
    expect(res.body.data).toHaveProperty('email', user.email);
    expect(res.body.data).toHaveProperty('accountType', user.accountType);
    expect(res.body.data).toHaveProperty('status', user.status);
  });

  it('should fail with 401 Unauthorized when unauthenticated', async () => {
    const res = await AuthClient.getMe(_agent, []);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
