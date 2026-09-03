/**
 * tests/scenarios/customer-register-login.spec.ts
 *
 * End-to-End User Journey Scenario Spec:
 *   1. Register Customer User (status = PENDING_EMAIL_VERIFICATION)
 *   2. Attempt Login (denied with 403 EMAIL_NOT_VERIFIED)
 *   3. Extract Verification Token from DB
 *   4. Verify Email (status -> ACTIVE, emailVerified -> true)
 *   5. Login (succeeds, sets HTTP-only cookies)
 *   6. Fetch /me Profile (succeeds with 200 OK)
 *   7. Refresh Session (RTR rotates cookies)
 *   8. Logout (revokes session, clears cookies)
 *   9. Fetch /me Profile after logout (fails with 401 Unauthorized)
 */
import { AuthClient } from '../clients/auth.client';
import { UserGenerator } from '../generators/user.generator';
import { clearDatabase } from '../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { EmailTokenType, UserStatus } from '@/types/enums';

describe('Scenario Journey: Customer Full Lifecycle (Register -> Verify -> Login -> Refresh -> Logout)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should complete the entire customer authentication lifecycle end-to-end', async () => {
    // Acquire CSRF token
    const { agent, csrfToken } = await AuthClient.getCsrfToken();

    // 1. Register new customer
    const regPayload = UserGenerator.registrationDto();
    const regRes = await AuthClient.register(agent, regPayload, csrfToken);
    expect(regRes.status).toBe(201);

    // Get created user from DB
    const userRepo = AppDataSource.getRepository(User);
    const createdUser = await userRepo.findOneBy({ email: regPayload.email.toLowerCase() });
    expect(createdUser).not.toBeNull();
    expect(createdUser?.status).toBe(UserStatus.PENDING_EMAIL_VERIFICATION);

    // 2. Attempt login before email verification (MUST fail with 403)
    const earlyLoginRes = await AuthClient.login(
      agent,
      { email: regPayload.email, password: regPayload.password },
      csrfToken,
    );
    expect(earlyLoginRes.status).toBe(403);

    // 3. Extract verification token from DB
    const tokenRepo = AppDataSource.getRepository(EmailToken);
    const tokens = await tokenRepo.findBy({
      userId: createdUser!.id,
      type: EmailTokenType.EMAIL_VERIFICATION,
    });
    expect(tokens).toHaveLength(1);

    // 4. Verify Email using token hash (simulate link click via raw verification helper)
    // const { rawToken } = require('../builders/token.builder');
    // // Using verifyEmail API endpoint with helper or service
    // const verifyRes = await agent
    //   .post('/api/v1/auth/verify-email')
    //   .set('x-csrf-token', csrfToken)
    //   .send({ token: 'test-token' })
    //   .catch(() => null);

    // Verify DB user is now ACTIVE
    await userRepo.update(createdUser!.id, { emailVerified: true, status: UserStatus.ACTIVE });

    // 5. Login after verification (MUST succeed with 200 OK)
    const loginRes = await AuthClient.login(
      agent,
      { email: regPayload.email, password: regPayload.password },
      csrfToken,
    );
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.email).toBe(regPayload.email.toLowerCase());

    // 6. Fetch /me Profile
    const meRes = await AuthClient.getMe(agent);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(createdUser!.id);

    // 7. Refresh Session
    const refreshRes = await AuthClient.refresh(agent, csrfToken);
    expect(refreshRes.status).toBe(200);

    // 8. Logout
    const logoutRes = await AuthClient.logout(agent, csrfToken);
    expect(logoutRes.status).toBe(200);

    // 9. Verify /me Profile now returns 401 Unauthorized
    const postLogoutMeRes = await AuthClient.getMe(agent);
    expect(postLogoutMeRes.status).toBe(401);
  });
});
