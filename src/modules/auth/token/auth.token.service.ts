import jwt from 'jsonwebtoken';

import {
  computeDeviceHash,
  trackDeviceAndDetectSuspicious,
} from '../security/auth.security.service';
import { logSecurityEvent } from '../security/auth.securityLog.service';
import { setAuthCookies } from '../utils/auth.cookie';

import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { ACCESS_TOKEN_EXPIRY, REFRESH_EXPIRY } from '@/core/constants';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import { AccountType, SecurityEvent, UserStatus } from '@/types/enums';
import { generateRefreshToken, hashRefreshToken } from '@/utils/crypto';
/**
 * Handles session refreshing using Refresh Token Rotation (RTR).
 */
export async function refreshSession(
  reqToken: string | undefined,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  if (!reqToken) {
    throw new AppError(
      AppErrorMessage.REFRESH_TOKEN_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.REFRESH_TOKEN_REQUIRED,
    );
  }

  await rotateRefreshSession(reqToken, res, connectionContext);
}

/**
 * Executes dedicated Refresh Token Rotation (RTR) inside a single atomic database transaction.
 * Validates tokenVersion invariance and handles targeted replay detection.
 */
export async function rotateRefreshSession(
  reqToken: string,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const tokenHash = hashRefreshToken(reqToken);
  const now = new Date();

  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRawRefreshToken);

  let refreshedUser: User | null = null;
  let refreshTtl = REFRESH_EXPIRY.NORMAL;

  await AppDataSource.transaction(async (manager) => {
    // 1. Atomic revocation of current session
    const updateResult = await manager
      .getRepository(UserSession)
      .createQueryBuilder()
      .update()
      .set({
        isRevoked: true,
        lastUsedAt: now,
      })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('is_revoked = false')
      .andWhere('expires_at > :now', { now })
      .returning('*')
      .execute();

    if (!updateResult.affected || updateResult.affected === 0) {
      const existingSession = await manager.getRepository(UserSession).findOne({
        where: { tokenHash },
      });

      if (existingSession?.isRevoked) {
        const targetUserId = existingSession.userId;

        // Replay Detection: Record telemetry FIRST, then revoke active sessions for this user
        logSecurityEvent({
          userId: targetUserId,
          email: null,
          event: SecurityEvent.UNAUTHORIZED_ACCESS,
          ipAddress: connectionContext.ipAddress,
          userAgent: connectionContext.userAgent,
          details: { reason: 'REFRESH_TOKEN_REPLAY' },
        }).catch((err) => {
          logger.error(
            { err, userId: targetUserId },
            'Failed to record refresh token replay event',
          );
        });

        if (targetUserId) {
          await AppDataSource.query(
            'UPDATE "user_sessions" SET "is_revoked" = true, "last_used_at" = $1 WHERE "user_id" = $2 AND "is_revoked" = false',
            [now, targetUserId],
          );
        }

        throw new AppError(
          AppErrorMessage.REFRESH_TOKEN_REUSE_DETECTED,
          HttpStatusCode.UNAUTHORIZED,
          AppErrorCode.REPLAY_DETECTED,
        );
      }

      if (existingSession && existingSession.expiresAt <= now) {
        logSecurityEvent({
          userId: existingSession.userId,
          email: null,
          event: SecurityEvent.LOGIN_FAILED,
          ipAddress: connectionContext.ipAddress,
          userAgent: connectionContext.userAgent,
          details: { reason: 'REFRESH_TOKEN_EXPIRED' },
        }).catch(() => {});

        throw new AppError(
          AppErrorMessage.REFRESH_TOKEN_EXPIRED,
          HttpStatusCode.UNAUTHORIZED,
          AppErrorCode.REFRESH_TOKEN_EXPIRED,
        );
      }

      throw new AppError(
        AppErrorMessage.INVALID_REFRESH_TOKEN,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.INVALID_REFRESH_TOKEN,
      );
    }

    const revokedSession = updateResult.raw?.[0];

    // 2. Fetch User ground-truth identity & check account status
    const userId = revokedSession.user_id ?? revokedSession.userId;
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountType: true,
        status: true,
        tokenVersion: true,
        isBlocked: true,
      },
    });

    if (
      !user ||
      user.isBlocked ||
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND_OR_SUSPENDED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHORIZED,
      );
    }

    // 3. Verify tokenVersion invariance
    const storedTokenVersion = revokedSession.token_version ?? revokedSession.tokenVersion;
    if (user.tokenVersion !== storedTokenVersion) {
      logSecurityEvent({
        userId: user.id,
        email: user.email,
        event: SecurityEvent.UNAUTHORIZED_ACCESS,
        ipAddress: connectionContext.ipAddress,
        userAgent: connectionContext.userAgent,
        details: {
          reason: 'TOKEN_VERSION_MISMATCH',
          expected: user.tokenVersion,
          actual: storedTokenVersion,
        },
      }).catch(() => {});

      throw new AppError(
        AppErrorMessage.SESSION_HAS_BEEN_REVOKED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.SESSION_REVOKED,
      );
    }

    // Determine refresh TTL
    const isAdmin = [AccountType.ADMIN, AccountType.SYSTEM].includes(user.accountType);
    if (isAdmin) {
      refreshTtl = REFRESH_EXPIRY.ADMIN;
    }

    const expiresAt = new Date(now.getTime() + refreshTtl);

    const deviceHash = computeDeviceHash(connectionContext.userAgent, connectionContext.ipAddress);

    // 4. Insert new UserSession in DB
    const newSession = manager.getRepository(UserSession).create({
      userId: user.id,
      tokenHash: newTokenHash,
      tokenVersion: user.tokenVersion,
      expiresAt,
      lastUsedAt: now,
      userAgent: connectionContext.userAgent,
      ipAddress: connectionContext.ipAddress,
      deviceHash,
    });
    await manager.getRepository(UserSession).save(newSession);

    refreshedUser = user;
  });

  // It's a defensive guard to satisfy both runtime safety and TypeScript:
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!refreshedUser) {
    throw new AppError(
      AppErrorMessage.SESSION_EXPIRED_OR_INVALID,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_TOKEN,
    );
  }

  // 5. Post-Commit Execution: Generate fresh JWT access token & set HTTP-only cookies
  const accessTokenPayload = {
    sub: (refreshedUser as User).id,
    userId: (refreshedUser as User).id,
    email: (refreshedUser as User).email,
    accountType: (refreshedUser as User).accountType,
    role: (refreshedUser as User).accountType,
    adminRole: null,
    tokenVersion: (refreshedUser as User).tokenVersion,
    type: 'access',
  };

  const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  setAuthCookies(res, accessToken, newRawRefreshToken, refreshTtl);

  // Best-effort background telemetry
  logSecurityEvent({
    userId: (refreshedUser as User).id,
    email: (refreshedUser as User).email,
    event: SecurityEvent.TOKEN_REFRESHED,
    ipAddress: connectionContext.ipAddress,
    userAgent: connectionContext.userAgent,
  }).catch((err) => {
    logger.error(
      { err, userId: refreshedUser?.id },
      'Failed to record refresh success security event',
    );
  });
}

/**
 * Generates JWT access token, raw refresh token, token hash, and saves UserSession in DB.
 */
export async function generateAndSetTokens(
  res: Response,
  user: User,
  connectionContext: {
    userAgent: string | null;
    ipAddress: string | null;
    rememberMe?: boolean | undefined;
  },
): Promise<void> {
  const isAdmin = user.accountType === AccountType.ADMIN;
  const accessPayload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    accountType: user.accountType,
    role: user.accountType,
    adminRole: null,
    tokenVersion: user.tokenVersion,
    type: 'access',
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);

  let refreshTtl = REFRESH_EXPIRY.NORMAL;
  if (isAdmin) {
    refreshTtl = REFRESH_EXPIRY.ADMIN;
  } else if (connectionContext.rememberMe) {
    refreshTtl = REFRESH_EXPIRY.REMEMBER_ME;
  }
  const expiresAt = new Date(Date.now() + refreshTtl);

  // 7. Atomic Database Transaction (Reset failed count, set lastLoginAt, save UserSession, upsert UserDevice)
  const now = new Date();
  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(User).update(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: now,
    });

    const deviceHash = computeDeviceHash(connectionContext.userAgent, connectionContext.ipAddress);

    const session = manager.getRepository(UserSession).create({
      userId: user.id,
      tokenHash,
      tokenVersion: user.tokenVersion,
      expiresAt,
      lastUsedAt: now,
      userAgent: connectionContext.userAgent,
      ipAddress: connectionContext.ipAddress,
      deviceHash,
    });
    await manager.getRepository(UserSession).save(session);

    await trackDeviceAndDetectSuspicious(
      user,
      connectionContext.userAgent,
      connectionContext.ipAddress,
      manager,
    );
  });

  // 8. Post-Commit Execution: Set HTTP-Only cookies & best-effort telemetry
  setAuthCookies(res, accessToken, rawRefreshToken, refreshTtl);
}
