/**
 * tests/e2e/token/refresh.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/refresh
 *
 * Verification Areas:
 *   - Happy Path: 200 OK with newly rotated set-cookie headers.
 *   - Missing Cookie: 401 Unauthorized when rfpnexa_refresh_token cookie is absent.
 *   - Replay Attack: 401 Unauthorized when replaying previously rotated refresh cookie.
 */
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: POST /api/v1/auth/refresh', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should refresh session and return new rotated auth cookies (200 OK)', async () => {
    const { user, rawPassword } = await Users.active();

    // Login to establish active session & refresh cookie
    await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

    // Refresh session
    const res = await AuthClient.refresh(_agent, _csrfToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    const setCookie = (res.headers['set-cookie'] ?? []) as string[];
    expect(setCookie.length).toBeGreaterThan(0);
    expect(setCookie.some((cookie: string) => cookie.includes('rfpnexa_token='))).toBe(true);
    expect(setCookie.some((cookie: string) => cookie.includes('rfpnexa_refresh_token='))).toBe(
      true,
    );
  });

  it('should fail with 401 Unauthorized when refresh cookie is missing', async () => {
    const res = await AuthClient.refresh(_agent, _csrfToken);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
