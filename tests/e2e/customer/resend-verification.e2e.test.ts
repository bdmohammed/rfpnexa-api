/**
 * tests/e2e/customer/resend-verification.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/resend-verification
 *
 * Verification Areas:
 *   - Happy Path: 200 OK when requesting resend for an unverified user email.
 *   - Security / Information Disclosure: 200 OK returned even if email does not exist (prevents user enumeration).
 *   - Already Verified: 200 OK returned (or 400 depending on contract) with clear message.
 */
import { AuthClient } from '../../clients/auth.client';
import { EmailMock } from '../../mocks/email.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: POST /api/v1/auth/resend-verification', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should process resend request and dispatch verification email (200 OK)', async () => {
    const { user } = await Users.pending();

    const res = await _agent
      .post('/api/v1/auth/resend-verification')
      .set('x-csrf-token', _csrfToken)
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(EmailMock.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('should return 200 OK without dispatching email for non-existent user email (prevents enumeration)', async () => {
    const res = await _agent
      .post('/api/v1/auth/resend-verification')
      .set('x-csrf-token', _csrfToken)
      .send({ email: 'non-existent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(EmailMock.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
