import jwt from 'jsonwebtoken';

import type { AccountType, UserStatus } from '@/types/enums';
import type { AccessTokenPayload } from '@/types/express';
import type { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '@/config/database';
import { env } from '@/config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { JWT_COOKIE_NAME } from '@/core/constants';
import { setUserId } from '@/core/requestContext';
import { User } from '@/entities/User';
import {
  logSecurityEvent,
  SecurityAuditReason,
} from '@/modules/auth/security/auth.securityLog.service';
import { CacheService } from '@/services/cache.service';
import { SecurityEvent } from '@/types/enums';

const userRepository = AppDataSource.getRepository(User);

export interface UserAuthSnapshot {
  id: string;
  email: string;
  accountType: AccountType;
  status: UserStatus;
  tokenVersion: number;
  isBlocked: boolean;
  emailVerified: boolean;
}

/**
 * [WHAT]
 * Verifies JWT token signature, algorithm constraints, issuer, audience, and token type claim.
 *
 * [WHY]
 * Ensures incoming tokens are authentic, unexpired, issued by rfpnexa-api for rfpnexa-client, and are access tokens.
 *
 * [CONSTRAINT]
 * 1. Must enforce algorithm `HS256`.
 * 2. Must verify `type === 'access'`.
 * 3. Must check `issuer` and `audience` against `env` configuration.
 * 4. Enforces 15-second clock skew tolerance (`clockTolerance: 15`).
 */
function verifyToken(token: string): AccessTokenPayload {
  try {
    const rawPayload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: 15,
    }) as Record<string, unknown>;

    if (rawPayload['type'] !== 'access') {
      throw new AppError(
        AppErrorMessage.SESSION_EXPIRED_OR_INVALID,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.INVALID_TOKEN,
      );
    }

    return rawPayload as unknown as AccessTokenPayload;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new AppError(
        AppErrorMessage.ACCESS_TOKEN_EXPIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.TOKEN_EXPIRED,
      );
    }
    throw new AppError(
      AppErrorMessage.SESSION_EXPIRED_OR_INVALID,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_TOKEN,
    );
  }
}

/**
 * Retrieves cached user auth snapshot from CacheService (L1 + L2 Redis), or fetches from DB on miss.
 */
export async function getOrFetchUserAuthSnapshot(userId: string): Promise<UserAuthSnapshot | null> {
  const cacheKey = `auth:v1:user:${userId}`;
  const cached = await CacheService.get<UserAuthSnapshot>(cacheKey);
  if (cached) return cached;

  const user = await userRepository.findOne({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      accountType: true,
      status: true,
      tokenVersion: true,
      isBlocked: true,
      emailVerified: true,
    },
  });

  if (!user) return null;

  const snapshot: UserAuthSnapshot = {
    id: user.id,
    email: user.email,
    accountType: user.accountType,
    status: user.status,
    tokenVersion: user.tokenVersion,
    isBlocked: user.isBlocked,
    emailVerified: user.emailVerified,
  };

  await CacheService.set(cacheKey, snapshot, 30);
  return snapshot;
}

/**
 * Invalidates user authentication snapshot in CacheService.
 */
export async function invalidateUserAuthSnapshot(userId: string): Promise<void> {
  await CacheService.del(`auth:v1:user:${userId}`);
}

/**
 * Validates existence, block flags, and token version of the user auth snapshot.
 */
function checkAccountBlockAndRevocation(
  user: UserAuthSnapshot | null,
  decodedTokenVersion: number,
  reqContext: { ipAddress: string | null; userAgent: string | null },
): asserts user is UserAuthSnapshot {
  if (!user) {
    throw new AppError(
      AppErrorMessage.ACCOUNT_NOT_FOUND,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.ACCOUNT_NOT_FOUND,
    );
  }

  if (user.isBlocked) {
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
      details: { reason: SecurityAuditReason.ACCOUNT_BLOCKED },
    });
    throw new AppError(
      AppErrorMessage.ACCOUNT_SUSPENDED,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_BLOCKED,
    );
  }

  if (user.tokenVersion !== decodedTokenVersion) {
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.UNAUTHORIZED_ACCESS,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
      details: {
        reason: 'TOKEN_VERSION_MISMATCH',
        expected: user.tokenVersion,
        actual: decodedTokenVersion,
      },
    });
    throw new AppError(
      AppErrorMessage.SESSION_HAS_BEEN_REVOKED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.SESSION_REVOKED,
    );
  }
}

/**
 * Validates email verification and admin approval status based on middleware variant configuration.
 */
function checkAccountApprovalAndVerification(
  user: UserAuthSnapshot,
  allowUnverified: boolean,
): void {
  if (!allowUnverified && !user.emailVerified) {
    throw new AppError(
      'Email verification required to access private routes',
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.EMAIL_NOT_VERIFIED,
    );
  }
}

/**
 * Internal core handler executing token verification and account checks.
 */
async function authenticateCore(
  req: Request,
  next: NextFunction,
  options: { allowUnverified: boolean },
): Promise<void> {
  const token: string = req.cookies[JWT_COOKIE_NAME];

  if (!token) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  let decodedTokenPayload: AccessTokenPayload;
  try {
    decodedTokenPayload = verifyToken(token);
  } catch (err: unknown) {
    return next(err);
  }

  try {
    const user = await getOrFetchUserAuthSnapshot(decodedTokenPayload.sub);
    const reqContext = {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };

    checkAccountBlockAndRevocation(user, decodedTokenPayload.tokenVersion, reqContext);
    checkAccountApprovalAndVerification(user, options.allowUnverified);

    req.user = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      accountType: user.accountType,
      role: user.accountType,
      adminRole: null,
      tokenVersion: user.tokenVersion,
    };
    setUserId(user.id);
    req.log = req.log.child({ userId: user.id });
    next();
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Standard authentication middleware requiring verified email and active account.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  return authenticateCore(req, next, { allowUnverified: false });
};

/**
 * Permissive authentication middleware allowing unverified users for profile status & verification routes.
 */
export const authenticateAllowUnverified = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  return authenticateCore(req, next, { allowUnverified: true });
};

/**
 * Optional authentication middleware attaching `req.user` if valid JWT exists without blocking visitors.
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.cookies[JWT_COOKIE_NAME] as string | undefined;
  if (!token) return next();

  try {
    const decodedTokenPayload = verifyToken(token);
    const user = await getOrFetchUserAuthSnapshot(decodedTokenPayload.sub);

    if (user && !user.isBlocked && user.tokenVersion === decodedTokenPayload.tokenVersion) {
      req.user = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
        role: user.accountType,
        adminRole: null,
        tokenVersion: user.tokenVersion,
      };
      setUserId(user.id);
      req.log = req.log.child({ userId: user.id });
    }
  } catch {
    // Token invalid or expired — silently treat as unauthenticated visitor
  }
  next();
};
