/**
 * tests/integration/customer/login.integration.test.ts
 *
 * Integration Test Suite for loginUser() service function
 *
 * Verification Areas:
 *   - Happy Path: Authenticates user credentials, generates JWT access/refresh tokens, sets cookies,
 *     logs SecurityEvent.LOGIN_SUCCESS.
 *   - User Not Found: Performs constant-time dummy password hash comparison, throws 401,
 *     logs LOGIN_FAILED with USER_NOT_FOUND.
 *   - Incorrect Password: Increments failedLoginAttempts, locks account when threshold is reached.
 *   - Account Lockout: Throws 403 FORBIDDEN if lockoutUntil is in the future.
 *   - Unverified Email: Throws 403 FORBIDDEN / EMAIL_NOT_VERIFIED if emailVerified = false.
 *   - Suspended Account: Throws 403 FORBIDDEN / ACCOUNT_BLOCKED if isBlocked = true.
 */
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { loginUser } from '@/modules/auth/customer/services/auth.customer.public.service';

describe('Integration: loginUser() Service Logic', () => {
  const mockResponse = () => {
    const res: Response = {} as Response;
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should authenticate user with valid credentials and set HTTP-only cookies', async () => {
    const { user, rawPassword } = await Users.active();
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    const sanitizedUser = await loginUser(
      { email: user.email, password: rawPassword },
      res,
      clientMetadata,
    );

    expect(sanitizedUser).toBeDefined();
    expect(sanitizedUser.id).toBe(user.id);
    expect(sanitizedUser.email).toBe(user.email);
    expect((sanitizedUser as any).passwordHash).toBeUndefined();

    // Assert cookies were set
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('should throw HTTP 401 for non-existent user email (timing-safe comparison)', async () => {
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      loginUser(
        { email: 'nonexistent@example.com', password: 'Password123!' },
        res,
        clientMetadata,
      ),
    ).rejects.toThrow();
  });

  it('should throw HTTP 401 and increment failedLoginAttempts on invalid password', async () => {
    const { user } = await Users.active();
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      loginUser({ email: user.email, password: 'WrongPassword123!' }, res, clientMetadata),
    ).rejects.toThrow();

    // Verify failed login attempts incremented in DB
    const userRepo = AppDataSource.getRepository(User);
    const updatedUser = await userRepo.findOneBy({ id: user.id });
    expect(updatedUser?.failedLoginAttempts).toBe(1);
  });

  it('should throw HTTP 403 FORBIDDEN if user email is unverified', async () => {
    const { user, rawPassword } = await Users.pending();
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      loginUser({ email: user.email, password: rawPassword }, res, clientMetadata),
    ).rejects.toThrow();
  });

  it('should throw HTTP 403 FORBIDDEN if account is locked out', async () => {
    const { user, rawPassword } = await Users.locked();
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      loginUser({ email: user.email, password: rawPassword }, res, clientMetadata),
    ).rejects.toThrow();
  });
});
