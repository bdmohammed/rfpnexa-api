import type { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '@/config/database';
import { MS_PER_DAY, PASSWORD_BYPASS_ROUTES, PASSWORD_MAX_AGE_DAYS } from '@/constants/security';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { User } from '@/entities/User';

const userRepo = AppDataSource.getRepository(User);

/**
 * [WHAT]
 * Checks if the current request URL path matches a password policy bypass route.
 *
 * [WHY]
 * Allows users to access password reset, password change, and logout endpoints even when locked.
 */
function isPasswordBypassRoute(req: Request): boolean {
  return PASSWORD_BYPASS_ROUTES.has(req.path);
}

/**
 * [WHAT]
 * Calculates whether an account password has exceeded the maximum allowed age (90 days).
 *
 * [WHY]
 * Enforces periodic password rotation policies for compliance and security hygiene.
 */
function isPasswordExpired(passwordChangedAt: Date | null, createdAt: Date): boolean {
  const lastChangedAt = passwordChangedAt ?? createdAt;
  const passwordAgeMs = Date.now() - lastChangedAt.getTime();

  return passwordAgeMs > PASSWORD_MAX_AGE_DAYS * MS_PER_DAY;
}

/**
 * [WHAT]
 * Middleware blocking authenticated users who have an active `mustResetPassword` flag.
 *
 * [WHY]
 * Enforces mandatory password resets for newly provisioned accounts or administrative resets.
 *
 * [CONSTRAINT]
 * 1. MUST run after authentication middleware (`req.user` must be populated).
 * 2. MUST bypass whitelisted recovery endpoints (`/auth/reset-password`, `/auth/password/change`, `/auth/logout`).
 *
 * [SIDE EFFECTS]
 * Queries `mustResetPassword` flag from database for authenticated user.
 *
 * [ERRORS]
 * Forwards 403 Forbidden `AppError` (`FORCED_PASSWORD_RESET`) to `next()` if reset is required.
 */
export const checkForcedReset = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user || isPasswordBypassRoute(req)) {
    return next();
  }

  try {
    const user = await userRepo.findOne({
      where: { id: req.user.userId },
      select: {
        mustResetPassword: true,
      },
    });

    if (user?.mustResetPassword === true) {
      return next(
        new AppError(
          AppErrorMessage.PASSWORD_RESET_REQUIRED,
          HttpStatusCode.FORBIDDEN,
          AppErrorCode.FORCED_PASSWORD_RESET,
        ),
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * [WHAT]
 * Middleware blocking authenticated users whose passwords have exceeded the 90-day maximum age.
 *
 * [WHY]
 * Prevents continuous API usage with stale credentials until the user updates their password.
 *
 * [CONSTRAINT]
 * 1. MUST run after authentication middleware (`req.user` must be populated).
 * 2. MUST bypass whitelisted recovery endpoints.
 *
 * [SIDE EFFECTS]
 * Queries `passwordChangedAt` and `createdAt` timestamps from database.
 *
 * [ERRORS]
 * Forwards 403 Forbidden `AppError` (`PASSWORD_EXPIRED`) to `next()` if password has expired.
 */
export const checkPasswordExpiration = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user || isPasswordBypassRoute(req)) {
    return next();
  }

  try {
    const user = await userRepo.findOne({
      where: { id: req.user.userId },
      select: {
        passwordChangedAt: true,
        createdAt: true,
      },
    });

    if (user && isPasswordExpired(user.passwordChangedAt, user.createdAt)) {
      return next(
        new AppError(
          AppErrorMessage.PASSWORD_EXPIRED,
          HttpStatusCode.FORBIDDEN,
          AppErrorCode.PASSWORD_EXPIRED,
        ),
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
