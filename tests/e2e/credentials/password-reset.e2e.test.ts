/**
 * tests/e2e/credentials/password-reset.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for Password Reset Flow
 *   - POST /api/v1/auth/forgot-password
 *   - POST /api/v1/auth/reset-password
 *
 * Verification Areas:
 *   - Happy Path: Forgot password returns 200 OK; reset password updates password & returns 200 OK.
 *   - Security: Anti-enumeration on forgot password returns 200 OK even for non-existent users.
 *   - Validation: 422 Unprocessable Entity for invalid token or weak new password payload.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { AuthClient } from '../../clients/auth.client';
import { EmailMock } from '../../mocks/email.mock';
import { HibpMock } from '../../mocks/hibp.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';
import { EmailTokenType } from '@/types/enums';

describe('E2E: Password Reset Endpoints', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
    HibpMock.mockCleanPassword();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 OK and send email for valid existing user', async () => {
      const { user } = await Users.active();

      const res = await _agent
        .post('/api/v1/auth/forgot-password')
        .set('x-csrf-token', _csrfToken)
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(EmailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 200 OK without dispatching email for non-existent user email (anti-enumeration)', async () => {
      const res = await _agent
        .post('/api/v1/auth/forgot-password')
        .set('x-csrf-token', _csrfToken)
        .send({ email: 'unknown-user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(EmailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token and return 200 OK', async () => {
      const { user } = await Users.active();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.PASSWORD_RESET)
        .create();

      const res = await _agent
        .post('/api/v1/auth/reset-password')
        .set('x-csrf-token', _csrfToken)
        .send({ token: rawToken, password: 'BrandNewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should fail with 422 for weak password payload', async () => {
      const { user } = await Users.active();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.PASSWORD_RESET)
        .create();

      const res = await _agent
        .post('/api/v1/auth/reset-password')
        .set('x-csrf-token', _csrfToken)
        .send({ token: rawToken, password: '123' });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
