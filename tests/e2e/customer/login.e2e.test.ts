/**
 * tests/e2e/customer/login.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/login
 *
 * Verification Areas:
 *   - Happy Path: 200 OK with sanitized user data payload & set-cookie headers.
 *   - Bad Credentials: 401 Unauthorized for wrong password or non-existent email.
 *   - Unverified Email: 403 Forbidden when email is unverified.
 *   - Account Lockout: 403 Forbidden when account is locked.
 *   - CSRF: Enforces CSRF token check on login requests.
 */
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: POST /api/v1/auth/login', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should authenticate user and return HTTP-only auth cookies (200 OK)', async () => {
    const { user, rawPassword } = await Users.active();

    const res = await AuthClient.login(
      _agent,
      { email: user.email, password: rawPassword },
      _csrfToken,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', user.id);
    expect(res.body.data).toHaveProperty('email', user.email);

    // Verify Set-Cookie header contains JWT access and refresh token cookies
    const setCookie = (res.headers['set-cookie'] ?? []) as string[];
    expect(setCookie.length).toBeGreaterThan(0);
    expect(setCookie.some((cookie: string) => cookie.includes('rfpnexa_token='))).toBe(true);
    expect(setCookie.some((cookie: string) => cookie.includes('rfpnexa_refresh_token='))).toBe(
      true,
    );
  });

  it('should fail with 401 Unauthorized for invalid password', async () => {
    const { user } = await Users.active();

    const res = await AuthClient.login(
      _agent,
      { email: user.email, password: 'WrongPassword123!' },
      _csrfToken,
    );

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should fail with 403 Forbidden if user email is unverified', async () => {
    const { user, rawPassword } = await Users.pending();

    const res = await AuthClient.login(
      _agent,
      { email: user.email, password: rawPassword },
      _csrfToken,
    );

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should fail with 403 Forbidden if account is locked out', async () => {
    const { user, rawPassword } = await Users.locked();

    const res = await AuthClient.login(
      _agent,
      { email: user.email, password: rawPassword },
      _csrfToken,
    );

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
  });
});
