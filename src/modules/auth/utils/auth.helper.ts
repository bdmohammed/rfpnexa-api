import * as bcrypt from 'bcryptjs';

import { logSecurityEvent, SecurityAuditReason } from '../security/auth.securityLog.service';

import { AppDataSource } from '@/config/database';
import { env } from '@/config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { User } from '@/entities/User';
import { SecurityEvent } from '@/types/enums';
import { DUMMY_PASSWORD_HASH } from '@/utils/crypto';

export interface ConnectionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

/**
 * Handles dummy bcrypt compare and security logging for non-existent user login attempts.
 */
export async function handleNonExistentUserLogin(
  email: string,
  passwordAttempt: string,
  connectionContext: ConnectionContext,
): Promise<never> {
  await bcrypt.compare(passwordAttempt, DUMMY_PASSWORD_HASH);
  await logSecurityEvent({
    email,
    event: SecurityEvent.LOGIN_FAILED,
    ipAddress: connectionContext.ipAddress,
    userAgent: connectionContext.userAgent,
    details: { reason: SecurityAuditReason.USER_NOT_FOUND },
  });
  throw new AppError(
    AppErrorMessage.INVALID_CREDENTIALS,
    HttpStatusCode.UNAUTHORIZED,
    AppErrorCode.INVALID_CREDENTIALS,
  );
}

/**
 * Checks temporary account lockout status.
 */
export async function checkUserLockout(
  user: User,
  connectionContext: ConnectionContext,
): Promise<void> {
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: SecurityAuditReason.ACCOUNT_LOCKED },
    });
    throw new AppError(
      AppErrorMessage.ACCOUNT_LOCKED_TEMPORARY(minutesLeft),
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_LOCKED,
    );
  }
}

/**
 * Enforces CAPTCHA verification when failed attempts reach threshold.
 */
export async function checkCaptchaRequirement(
  user: User,
  captchaToken: string | undefined,
  connectionContext: ConnectionContext,
): Promise<void> {
  const captchaThreshold = env.CAPTCHA_REQUIRED_THRESHOLD;
  if (user.failedLoginAttempts >= captchaThreshold && !captchaToken) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.CAPTCHA_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: SecurityAuditReason.CAPTCHA_REQUIRED },
    });
    throw new AppError(
      AppErrorMessage.CAPTCHA_VERIFICATION_REQUIRED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.CAPTCHA_REQUIRED,
    );
  }
}

/**
 * Verifies password and handles failed attempt increments/lockout triggers atomically.
 */
export async function verifyPasswordAndHandleFailure(
  passwordAttempt: string,
  user: User,
  connectionContext: ConnectionContext,
): Promise<void> {
  const passwordMatch = await bcrypt.compare(passwordAttempt, user.passwordHash);
  if (!passwordMatch) {
    const maxAttempts = env.MAX_LOGIN_ATTEMPTS;
    const lockoutMinutes = env.LOCKOUT_DURATION_MINUTES;

    // Atomic SQL increment to prevent lost updates during parallel failed logins
    await AppDataSource.createQueryBuilder()
      .update(User)
      .set({
        failedLoginAttempts: () => 'failed_login_attempts + 1',
      })
      .where('id = :id', { id: user.id })
      .execute();

    const userRepository = AppDataSource.getRepository(User);
    const updatedUser = await userRepository.findOne({
      where: { id: user.id },
      select: { failedLoginAttempts: true },
    });
    const currentFailed = updatedUser?.failedLoginAttempts ?? user.failedLoginAttempts + 1;

    if (currentFailed >= maxAttempts) {
      const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      await userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockoutUntil,
      });
    }

    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: SecurityAuditReason.INVALID_PASSWORD, failedAttempts: currentFailed },
    });
    throw new AppError(
      AppErrorMessage.INVALID_CREDENTIALS,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_CREDENTIALS,
    );
  }
}

/**
 * Checks basic account readiness (email verified, blocked check).
 */
export async function validateCommonAccountStatus(
  user: User,
  connectionContext: ConnectionContext,
): Promise<void> {
  if (!user.emailVerified) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: SecurityAuditReason.EMAIL_NOT_VERIFIED },
    });
    throw new AppError(
      AppErrorMessage.VERIFY_EMAIL_BEFORE_LOGIN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  if (user.isBlocked) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: SecurityAuditReason.ACCOUNT_BLOCKED },
    });
    throw new AppError(
      AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_SUPPORT,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_BLOCKED,
    );
  }
}
