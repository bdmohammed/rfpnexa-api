/**
 * tests/e2e/customer/verify-email.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/verify-email
 *
 * Verification Areas:
 *   - Happy Path: 200 OK when passing a valid verification token.
 *   - Validation: 422 Unprocessable Entity when missing token payload.
 *   - Invalid Token: 400 Bad Request / 401 Unauthorized for malformed or expired token.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';
import { EmailTokenType } from '@/types/enums';

describe('E2E: POST /api/v1/auth/verify-email', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should successfully verify email with valid token (200 OK)', async () => {
    const { user } = await Users.pending();
    const { rawToken } = await new EmailTokenBuilder()
      .forUser(user.id)
      .withType(EmailTokenType.EMAIL_VERIFICATION)
      .create();

    const res = await AuthClient.verifyEmail(_agent, { token: rawToken }, _csrfToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
  });

  it('should fail with 422 when token payload is missing', async () => {
    const res = await AuthClient.verifyEmail(_agent, { token: '' }, _csrfToken);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should fail with error response when token is invalid or expired', async () => {
    const res = await AuthClient.verifyEmail(_agent, { token: 'invalid-token-123' }, _csrfToken);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
