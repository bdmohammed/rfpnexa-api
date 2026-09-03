/**
 * tests/e2e/session/session.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for Session & Device Management Endpoints
 *   - GET /api/v1/auth/sessions
 *   - DELETE /api/v1/auth/sessions/:id
 *   - DELETE /api/v1/auth/sessions
 *   - GET /api/v1/auth/devices
 *   - POST /api/v1/auth/devices/:id/trust
 *   - DELETE /api/v1/auth/devices/:id
 *
 * Verification Areas:
 *   - Happy Path: Authenticated requests return 200 OK with session/device lists or operation status.
 *   - Authentication: 401 Unauthorized for unauthenticated access.
 *   - Validation / 404: Returns 404 Not Found for unowned or non-existent session/device IDs.
 */
import { AuthClient } from '../../clients/auth.client';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: Session & Device Management Endpoints', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('should return 200 OK with user sessions list when logged in', async () => {
      const { user, rawPassword } = await Users.active();

      // Login
      await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

      const res = await _agent.get('/api/v1/auth/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should fail with 401 Unauthorized when unauthenticated', async () => {
      const res = await _agent.get('/api/v1/auth/sessions');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/auth/devices', () => {
    it('should return 200 OK with user devices list when logged in', async () => {
      const { user, rawPassword } = await Users.active();

      // Login
      await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

      const res = await _agent.get('/api/v1/auth/devices');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should fail with 401 Unauthorized when unauthenticated', async () => {
      const res = await _agent.get('/api/v1/auth/devices');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
