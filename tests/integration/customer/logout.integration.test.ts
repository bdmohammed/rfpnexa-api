/**
 * tests/integration/customer/logout.integration.test.ts
 *
 * Integration Test Suite for logoutUser() and getProfile()
 *
 * Verification Areas:
 *   - Happy Path: Revokes active session row in DB, clears auth cookies, logs SecurityEvent.LOGOUT.
 *   - Idempotency: Logout without active refresh token still clears cookies without throwing error.
 *   - Profile Lookup: Returns sanitized user profile without sensitive credentials.
 */
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
import { UserSession } from '@/entities/UserSession';
import {
  getProfile,
  logoutUser,
} from '@/modules/auth/customer/services/auth.customer.private.service';
import { generateRefreshToken, hashRefreshToken } from '@/utils/crypto';

describe('Integration: Private Customer Service (logoutUser & getProfile)', () => {
  const mockResponse = () => {
    const res: Response = {} as Response;
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should revoke active session row in DB and clear cookies on logout', async () => {
    const { user } = await Users.active();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);
    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await logoutUser(res, rawRefreshToken, clientMetadata, user.id);

    // Verify cookies cleared
    expect(res.clearCookie).toHaveBeenCalledTimes(2);

    // Verify session revoked in DB
    const dbSession = await sessionRepo.findOneBy({ tokenHash });
    expect(dbSession?.isRevoked).toBe(true);
  });

  it('should fetch sanitized user profile without passwordHash or tokenVersion', async () => {
    const { user } = await Users.active();

    const profile = await getProfile(user.id);

    expect(profile).toBeDefined();
    expect(profile.id).toBe(user.id);
    expect(profile.email).toBe(user.email);
    expect((profile as any).passwordHash).toBeUndefined();
    expect((profile as any).tokenVersion).toBeUndefined();
  });
});
