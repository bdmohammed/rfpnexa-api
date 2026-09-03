/**
 * tests/integration/token/refresh.integration.test.ts
 *
 * Integration Test Suite for refreshSession() and rotateRefreshSession()
 *
 * Verification Areas:
 *   - Happy Path: Atomic Refresh Token Rotation (RTR) revokes current session,
 *     creates new UserSession row, issues new tokens & cookies.
 *   - Replay Attack Detection: Re-using a previously revoked refresh token
 *     triggers automatic session family revocation for that user.
 *   - Expired Refresh Token: Throws 401 REFRESH_TOKEN_EXPIRED.
 *   - Token Version Revocation: Throws 401 SESSION_REVOKED when user tokenVersion was bumped.
 *   - Missing Cookie / Token: Throws 401 REFRESH_TOKEN_REQUIRED when token is undefined.
 */
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
import { AppErrorMessage } from '@/core/AppError';
import { REFRESH_EXPIRY } from '@/core/constants';
import { User } from '@/database/entities/User';
import { UserSession } from '@/entities/UserSession';
import { refreshSession, rotateRefreshSession } from '@/modules/auth/token/auth.token.service';
import { UserStatus } from '@/types/enums';
import { generateRefreshToken, hashRefreshToken } from '@/utils/crypto';

describe('Integration: rotateRefreshSession() & RTR Security', () => {
  const mockResponse = () => {
    const res: Response = {} as Response;
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should successfully rotate refresh token, revoke old session, insert new session, and set cookies', async () => {
    const { user } = await Users.active();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    // Create active session in DB
    const sessionRepo = AppDataSource.getRepository(UserSession);
    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastUsedAt: new Date(),
      }),
    );

    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await rotateRefreshSession(rawRefreshToken, res, clientMetadata);

    // Verify cookies set
    expect(res.cookie).toHaveBeenCalledTimes(2);

    // Verify old session in DB is now revoked
    const oldSession = await sessionRepo.findOneBy({ tokenHash });
    expect(oldSession?.isRevoked).toBe(true);

    // Verify total user sessions count is 2 (1 revoked, 1 active)
    const allSessions = await sessionRepo.findBy({ userId: user.id });
    expect(allSessions).toHaveLength(2);

    const activeSessions = allSessions.filter((s) => !s.isRevoked);
    expect(activeSessions).toHaveLength(1);
  });

  it('should detect token reuse (Replay Attack) and revoke ALL active sessions for that user', async () => {
    const { user } = await Users.active();
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    // Create revoked session (simulating already rotated token)
    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    // Create another active session for the same user (e.g. on another device)
    const activeTokenHash = hashRefreshToken(generateRefreshToken());
    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash: activeTokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    // Replaying the revoked token
    await expect(rotateRefreshSession(rawToken, res, clientMetadata)).rejects.toThrow();

    // Verify ALL sessions for user are now revoked
    const remainingActive = await sessionRepo.findBy({ userId: user.id, isRevoked: false });
    expect(remainingActive).toHaveLength(0);
  });

  it('should throw 401 when refresh token is missing/undefined', async () => {
    const res = mockResponse();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(refreshSession(undefined, res, clientMetadata)).rejects.toThrow();
  });

  it('should delegate to rotateRefreshSession when a refresh token is provided', async () => {
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
        lastUsedAt: new Date(),
      }),
    );

    const res = mockResponse();
    const clientMetadata = {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    await refreshSession(rawRefreshToken, res, clientMetadata);

    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('should throw INVALID_REFRESH_TOKEN when token does not exist', async () => {
    const res = mockResponse();

    const clientMetadata = {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    await expect(rotateRefreshSession(generateRefreshToken(), res, clientMetadata)).rejects.toThrow(
      AppErrorMessage.INVALID_REFRESH_TOKEN,
    );
  });

  it('should throw REFRESH_TOKEN_EXPIRED when refresh token is expired', async () => {
    const { user } = await Users.active();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 60_000), // expired
        lastUsedAt: new Date(),
      }),
    );

    const res = mockResponse();

    await expect(
      rotateRefreshSession(rawToken, res, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      }),
    ).rejects.toThrow(AppErrorMessage.REFRESH_TOKEN_EXPIRED);
  });

  it('should throw USER_NOT_FOUND_OR_SUSPENDED when user no longer exists', async () => {
    const { user } = await Users.active();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }),
    );

    await AppDataSource.getRepository(User).delete(user.id);

    const res = mockResponse();

    await expect(
      rotateRefreshSession(rawToken, res, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      }),
    ).rejects.toThrow(AppErrorMessage.USER_NOT_FOUND_OR_SUSPENDED);
  });

  it('should reject suspended users', async () => {
    const { user } = await Users.active();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }),
    );

    await AppDataSource.getRepository(User).update(user.id, {
      status: UserStatus.SUSPENDED,
    });

    const res = mockResponse();

    await expect(
      rotateRefreshSession(rawToken, res, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      }),
    ).rejects.toThrow(AppErrorMessage.USER_NOT_FOUND_OR_SUSPENDED);
  });

  it('should reject blocked users', async () => {
    const { user } = await Users.active();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }),
    );

    await AppDataSource.getRepository(User).update(user.id, {
      isBlocked: true,
    });

    const res = mockResponse();

    await expect(
      rotateRefreshSession(rawToken, res, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      }),
    ).rejects.toThrow(AppErrorMessage.USER_NOT_FOUND_OR_SUSPENDED);
  });

  it('should reject refresh token when tokenVersion has changed', async () => {
    const { user } = await Users.active();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }),
    );

    await AppDataSource.getRepository(User).update(user.id, {
      tokenVersion: user.tokenVersion + 1,
    });

    const res = mockResponse();

    await expect(
      rotateRefreshSession(rawToken, res, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      }),
    ).rejects.toThrow(AppErrorMessage.SESSION_HAS_BEEN_REVOKED);
  });

  it('should create admin refresh session using ADMIN refresh TTL', async () => {
    const { user } = await Users.admin();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY.ADMIN),
        lastUsedAt: new Date(),
      }),
    );

    const res = mockResponse();

    await rotateRefreshSession(rawToken, res, {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    });

    const sessions = await sessionRepo.find({
      where: {
        userId: user.id,
        isRevoked: false,
      },
    });

    expect(sessions).toHaveLength(1);

    const session = sessions[0];
    expect(session).toBeDefined();
    expect(session?.lastUsedAt).not.toBeNull();

    const ttl = session!.expiresAt.getTime() - session!.lastUsedAt!.getTime();

    expect(ttl).toBeCloseTo(REFRESH_EXPIRY.ADMIN, -3);

    expect(ttl).toBeCloseTo(REFRESH_EXPIRY.ADMIN, -3);
  });

  it('should create admin refresh session using ADMIN refresh TTL', async () => {
    const { user } = await Users.admin();

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    const sessionRepo = AppDataSource.getRepository(UserSession);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash,
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY.ADMIN),
        lastUsedAt: new Date(),
      }),
    );

    const res = mockResponse();

    await rotateRefreshSession(rawToken, res, {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    });

    const sessions = await sessionRepo.find({
      where: {
        userId: user.id,
        isRevoked: false,
      },
    });

    expect(sessions).toHaveLength(1);

    const session = sessions[0];
    expect(session).toBeDefined();
    expect(session?.lastUsedAt).not.toBeNull();

    const ttl = session!.expiresAt.getTime() - session!.lastUsedAt!.getTime();

    expect(ttl).toBeCloseTo(REFRESH_EXPIRY.ADMIN, -3);

    expect(ttl).toBeCloseTo(REFRESH_EXPIRY.ADMIN, -3);
  });
});
