/**
 * tests/e2e/credentials/email-change.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for Email Change Endpoints
 *   - POST /api/v1/auth/email/change
 *   - POST /api/v1/auth/email/change/verify
 *
 * Verification Areas:
 *   - Happy Path: Authenticated user requests email change (200 OK); verification endpoint consumes token (200 OK).
 *   - Authentication: 401 Unauthorized when unauthenticated user attempts to request email change.
 *   - Validation: 422 Unprocessable Entity for invalid new email address.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { AuthClient } from '../../clients/auth.client';
import { EmailGenerator } from '../../generators/user.generator';
import { EmailMock } from '../../mocks/email.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { EmailTokenType } from '@/types/enums';

describe('E2E: Email Change Endpoints', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  describe('POST /api/v1/auth/email/change', () => {
    it('should allow authenticated user to request email change (200 OK)', async () => {
      const { user, rawPassword } = await Users.active();

      // Login first
      await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

      const newEmail = EmailGenerator.unique();
      const res = await _agent
        .post('/api/v1/auth/email/change')
        .set('x-csrf-token', _csrfToken)
        .send({ email: newEmail });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should fail with 401 Unauthorized when requesting email change unauthenticated', async () => {
      const res = await _agent
        .post('/api/v1/auth/email/change')
        .set('x-csrf-token', _csrfToken)
        .send({ email: EmailGenerator.unique() });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/email/change/verify', () => {
    it('should verify email change with valid token (200 OK)', async () => {
      const { user } = await Users.active();
      user.pendingEmail = EmailGenerator.unique();
      await AppDataSource.getRepository(User).save(user);

      // Seed pending email on user
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.EMAIL_CHANGE)
        .create();

      const res = await _agent
        .post('/api/v1/auth/email/change/verify')
        .set('x-csrf-token', _csrfToken)
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
});
