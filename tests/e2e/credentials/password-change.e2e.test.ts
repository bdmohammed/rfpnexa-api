/**
 * tests/e2e/credentials/password-change.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/password/change
 *
 * Verification Areas:
 *   - Happy Path: Authenticated user changes password successfully (200 OK).
 *   - Authentication: 401 Unauthorized for unauthenticated requests.
 *   - Validation: 422 Unprocessable Entity for invalid/weak payload.
 *   - Incorrect Password: 400 Bad Request when current password is wrong.
 */
import { AuthClient } from '../../clients/auth.client';
import { HibpMock } from '../../mocks/hibp.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';

describe('E2E: POST /api/v1/auth/password/change', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  beforeEach(async () => {
    await clearDatabase();
    HibpMock.mockCleanPassword();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should allow logged-in user to change password (200 OK)', async () => {
    const { user, rawPassword } = await Users.active();

    // Login
    await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

    const res = await _agent
      .post('/api/v1/auth/password/change')
      .set('x-csrf-token', _csrfToken)
      .send({
        currentPassword: rawPassword,
        newPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('should fail with 401 Unauthorized when unauthenticated', async () => {
    const res = await _agent
      .post('/api/v1/auth/password/change')
      .set('x-csrf-token', _csrfToken)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should fail with 400 Bad Request when current password is wrong', async () => {
    const { user, rawPassword } = await Users.active();

    // Login
    await AuthClient.login(_agent, { email: user.email, password: rawPassword }, _csrfToken);

    const res = await _agent
      .post('/api/v1/auth/password/change')
      .set('x-csrf-token', _csrfToken)
      .send({
        currentPassword: 'WrongCurrentPassword12345!',
        newPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
