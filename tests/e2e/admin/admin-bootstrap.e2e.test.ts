/**
 * tests/e2e/admin/admin-bootstrap.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for Admin Bootstrap Endpoints
 *   - GET /api/v1/auth/admin/bootstrap
 *   - POST /api/v1/auth/admin/bootstrap
 *   - GET /api/v1/auth/admin/owner-review
 *
 * Verification Areas:
 *   - Verify Token GET: 200 OK with token details when valid.
 *   - Approve Bootstrap POST: 200 OK with confirmation message when approving/rejecting.
 *   - Owner Review GET: 200 OK returning HTML email response template.
 */
import request from 'supertest';

import { EmailTokenBuilder } from '../../builders/token.builder';
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { app } from '@/config/app';
import { EmailTokenType } from '@/types/enums';

describe('E2E: Admin Bootstrap Endpoints', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  describe('GET /api/v1/auth/admin/bootstrap', () => {
    it('should verify bootstrap token and return token details (200 OK)', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const res = await request(app).get(`/api/v1/auth/admin/bootstrap?token=${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('email', user.email);
    });
  });

  describe('POST /api/v1/auth/admin/bootstrap', () => {
    it('should approve bootstrap request and return success message (200 OK)', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const res = await _agent
        .post('/api/v1/auth/admin/bootstrap')
        .set('x-csrf-token', _csrfToken)
        .send({ token: rawToken, action: 'approve' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/v1/auth/admin/owner-review', () => {
    it('should process owner review link and return rendered HTML response template (200 OK)', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const res = await request(app).get(
        `/api/v1/auth/admin/owner-review?token=${rawToken}&action=approve`,
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Success!');
    });
  });
});
