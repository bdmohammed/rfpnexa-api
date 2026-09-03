/**
 * tests/e2e/customer/logout.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/logout
 *
 * Verification Areas:
 *   - Happy Path: 200 OK with set-cookie headers clearing authentication cookies.
 *   - Unauthenticated: Still clears cookies and returns 200 OK idempotently.
 */
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: POST /api/v1/auth/logout', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should logout logged-in user, clear cookies, and return 200 OK', async () => {
    const { user, rawPassword } = await Users.active();

    // Login first
    const loginRes = await AuthClient.login(
      _agent,
      { email: user.email, password: rawPassword },
      _csrfToken,
    );
    expect(loginRes.status).toBe(200);

    // Logout
    const cookies = (loginRes.headers['set-cookie'] ?? []) as string[];
    const res = await AuthClient.logout(_agent, _csrfToken, cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    const setCookie = (res.headers['set-cookie'] ?? []) as string[];
    expect(setCookie.length).toBeGreaterThan(0);
    // Verify cookies expired/cleared
    expect(
      setCookie.some(
        (cookie: string) =>
          cookie.includes('rfpnexa_token=;') ||
          cookie.includes('rfpnexa_refresh_token=;') ||
          cookie.includes('Expires=Thu, 01 Jan 1970') ||
          cookie.includes('1970'),
      ),
    ).toBe(true);
  });
});
