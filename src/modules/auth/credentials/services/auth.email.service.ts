import * as bcrypt from 'bcryptjs';

import {
  checkPasswordHistory,
  savePasswordToHistory,
  // verifyCaptcha,
  verifyPasswordBreach,
} from '../../security/auth.security.service';
import { logSecurityEvent, SecurityAuditReason } from '../../security/auth.securityLog.service';

import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { BCRYPT_ROUNDS } from '@/core/constants';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import { invalidateUserAuthSnapshot } from '@/middleware/authenticate';
import { CacheService } from '@/services/cache.service';
import {
  sendEmailChangeAlertEmail,
  sendEmailChangeVerificationEmail,
  sendVerificationEmail,
} from '@/services/email.service';
import { createEmailToken, verifyAndConsumeToken } from '@/services/token.service';
import { EmailTokenType, SecurityEvent, UserStatus } from '@/types/enums';
import { normalizeEmail } from '@/utils/email';

const userRepository = AppDataSource.getRepository(User);

/**
 * Changes the user's password inside a single atomic database transaction,
 * enforcing current password verification, same-password check, history checks, and breach checks.
 * Revokes active sessions and increments tokenVersion on completion.
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  // Pre-Transaction Checks & Expensive Hashing Operations (outside DB transaction)
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // 1. Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(
      AppErrorMessage.INCORRECT_CURRENT_PASSWORD,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INCORRECT_CURRENT_PASSWORD,
    );
  }

  // 2. Reject changing to the same password
  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new AppError(
      'New password must be different from current password.',
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.PASSWORD_UNCHANGED,
    );
  }

  // 3. Verify breach detection
  await verifyPasswordBreach(newPassword);

  // 4. Compute CPU-intensive bcrypt hash outside transaction
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  const now = new Date();
  let userEmail = '';

  // 5. Single Atomic Database Transaction
  await AppDataSource.transaction(async (manager) => {
    // Lock user record for update
    const lockedUser = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        tokenVersion: true,
      },
    });

    if (!lockedUser) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    userEmail = lockedUser.email;

    // Re-verify current password under lock
    const isStillMatch = await bcrypt.compare(currentPassword, lockedUser.passwordHash);
    if (!isStillMatch) {
      throw new AppError(
        AppErrorMessage.INCORRECT_CURRENT_PASSWORD,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INCORRECT_CURRENT_PASSWORD,
      );
    }

    // Verify password history inside transaction
    await checkPasswordHistory(userId, newPassword, manager);

    // Revoke active non-expired database sessions
    await manager
      .createQueryBuilder()
      .update(UserSession)
      .set({
        isRevoked: true,
        lastUsedAt: now,
        updatedAt: now,
      })
      .where('user_id = :userId', { userId })
      .andWhere('is_revoked = false')
      .andWhere('expires_at > :now', { now })
      .execute();

    // Update user password, clear mustResetPassword, set passwordChangedAt, and increment tokenVersion
    await manager
      .createQueryBuilder()
      .update(User)
      .set({
        passwordHash: newHash,
        mustResetPassword: false,
        passwordChangedAt: now,
        tokenVersion: () => 'token_version + 1',
      })
      .where('id = :userId', { userId })
      .execute();

    // Save new password to history inside transaction
    await savePasswordToHistory(userId, newHash, manager);
  });

  // Post-commit cache invalidation
  invalidateUserAuthSnapshot(userId).catch(() => {});
  CacheService.del(`sessions:${userId}`).catch(() => {});
  CacheService.del(`user:${userId}:profile`).catch(() => {});

  // Best-effort background security audit log delivery
  logSecurityEvent({
    userId,
    email: userEmail,
    event: SecurityEvent.PASSWORD_CHANGE,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { method: 'settings_password_change' },
  }).catch((err) => {
    logger.error({ err, userId }, 'Failed to log password change security event');
  });
}

/**
 * Initiates an email change process inside a single atomic database transaction.
 * Sends verification link to the new email address and alert notification to the old email address post-commit.
 */
export async function requestEmailChange(
  userId: string,
  newEmail: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const normalizedEmail = newEmail.trim().toLowerCase();
  let userName = '';
  let oldEmail = '';
  let rawToken = '';

  await AppDataSource.transaction(async (manager) => {
    // 1. Lock user record for update with explicit column select
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
      select: {
        id: true,
        name: true,
        email: true,
        pendingEmail: true,
      },
    });

    if (!user) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    // 2. Reject if new email matches current email
    if (normalizedEmail === user.email.toLowerCase()) {
      throw new AppError(
        'New email address cannot be the same as your current email address.',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_EMAIL,
      );
    }

    // 3. Pre-check if new email is registered by another account
    const exists = await manager.getRepository(User).findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (exists) {
      throw new AppError(
        AppErrorMessage.EMAIL_REGISTERED,
        HttpStatusCode.CONFLICT,
        AppErrorCode.EMAIL_TAKEN,
      );
    }

    userName = user.name;
    oldEmail = user.email;

    // 4. Update user pendingEmail with PostgreSQL 23505 fallback check
    try {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ pendingEmail: normalizedEmail })
        .where('id = :userId', { userId })
        .execute();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.code === '23505' || err?.driverError?.code === '23505') {
        throw new AppError(
          AppErrorMessage.EMAIL_REGISTERED,
          HttpStatusCode.CONFLICT,
          AppErrorCode.EMAIL_TAKEN,
        );
      }
      throw err;
    }

    // 5. Generate new EMAIL_CHANGE token (automatically invalidates previous EMAIL_CHANGE tokens inside transaction)
    rawToken = await createEmailToken(userId, EmailTokenType.EMAIL_CHANGE, manager);
  });

  // Post-commit cache invalidation
  invalidateUserAuthSnapshot(userId).catch(() => {});
  CacheService.del(`user:${userId}:profile`).catch(() => {});

  // Best-effort background email alert delivery via Promise.allSettled without blocking HTTP response
  void Promise.allSettled([
    sendEmailChangeVerificationEmail({
      to: normalizedEmail,
      name: userName,
      userId,
      token: rawToken,
    }),
    sendEmailChangeAlertEmail({
      to: oldEmail,
      name: userName,
      userId,
      newEmail: normalizedEmail,
    }),
  ]).then((results) => {
    results.forEach((res, idx) => {
      if (res.status === 'rejected') {
        logger.error(
          { err: res.reason, userId, idx },
          'Failed to send email change notification email in background',
        );
      }
    });
  });

  // Best-effort background security audit log delivery
  logSecurityEvent({
    userId,
    email: oldEmail,
    event: SecurityEvent.EMAIL_CHANGE_REQUEST,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { oldEmail, newEmail: normalizedEmail, method: 'request_email_change' },
  }).catch((err) => {
    logger.error({ err, userId }, 'Failed to log email change request security event');
  });
}

/**
 * Verifies and completes an email change process inside a single atomic transaction.
 */
export async function verifyEmailChange(
  token: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  let userId = '';
  let oldEmail = '';
  let newEmail = '';
  const now = new Date();

  await AppDataSource.transaction(async (manager) => {
    // 1. Consume token inside transaction
    userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_CHANGE, manager);

    // 2. Fetch user with pessimistic write lock and specific select fields
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
      select: {
        id: true,
        email: true,
        pendingEmail: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    if (!user.pendingEmail) {
      throw new AppError(
        AppErrorMessage.NO_EMAIL_CHANGE_REQUEST,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.NO_EMAIL_CHANGE_REQUEST,
      );
    }

    // 3. Pre-check email availability inside transaction
    const exists = await manager.getRepository(User).findOne({
      where: { email: user.pendingEmail },
      select: { id: true },
    });

    if (exists) {
      throw new AppError(
        AppErrorMessage.EMAIL_REGISTERED,
        HttpStatusCode.CONFLICT,
        AppErrorCode.EMAIL_TAKEN,
      );
    }

    oldEmail = user.email;
    newEmail = user.pendingEmail;

    // 4. Revoke active non-expired database sessions
    await manager
      .createQueryBuilder()
      .update(UserSession)
      .set({
        isRevoked: true,
        lastUsedAt: now,
        updatedAt: now,
      })
      .where('user_id = :userId', { userId })
      .andWhere('is_revoked = false')
      .andWhere('expires_at > :now', { now })
      .execute();

    // 5. Update user email, clear pendingEmail, set emailChangedAt, and increment tokenVersion
    try {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          email: newEmail,
          pendingEmail: null,
          emailChangedAt: now,
          tokenVersion: () => 'token_version + 1',
        })
        .where('id = :userId', { userId })
        .execute();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.code === '23505' || err?.driverError?.code === '23505') {
        throw new AppError(
          AppErrorMessage.EMAIL_REGISTERED,
          HttpStatusCode.CONFLICT,
          AppErrorCode.EMAIL_TAKEN,
        );
      }
      throw err;
    }

    // 6. Delete all remaining EMAIL_CHANGE tokens for user
    await manager.getRepository(EmailToken).delete({ userId, type: EmailTokenType.EMAIL_CHANGE });
  });

  // Post-commit cache invalidation
  invalidateUserAuthSnapshot(userId).catch(() => {});
  CacheService.del(`sessions:${userId}`).catch(() => {});
  CacheService.del(`user:${userId}:profile`).catch(() => {});

  // Best-effort background security audit log delivery
  logSecurityEvent({
    userId,
    email: newEmail,
    event: SecurityEvent.EMAIL_CHANGE_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { oldEmail, newEmail, method: 'email_change_verification' },
  }).catch((err) => {
    logger.error({ err, userId }, 'Failed to log email change success security event');
  });

  // Best-effort background alert email sending to old email
  sendEmailChangeAlertEmail({
    to: oldEmail,
    name: oldEmail.split('@')[0]!,
    newEmail,
    userId,
  }).catch((err) => {
    logger.error({ err, userId, oldEmail }, 'Failed to send email change security alert email');
  });
}

export async function resendVerification(
  rawEmail: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await userRepository.findOne({ where: { email } });

  // Return silently if user does not exist (avoid email enumeration)
  if (!user) {
    await logSecurityEvent({
      userId: null,
      email,
      event: SecurityEvent.RESEND_VERIFICATION_IGNORED,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: { reason: SecurityAuditReason.USER_NOT_FOUND },
    });
    return;
  }

  // Return silently if already verified
  if (user.emailVerified) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.RESEND_VERIFICATION_IGNORED,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: { reason: SecurityAuditReason.ALREADY_VERIFIED },
    });
    return;
  }

  // Restrict resend to users pending email verification
  if (user.status !== UserStatus.PENDING_EMAIL_VERIFICATION) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.RESEND_VERIFICATION_IGNORED,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: { reason: SecurityAuditReason.ACCOUNT_NOT_PENDING, status: user.status },
    });
    return;
  }

  // Atomic token replacement inside isolated DB transaction
  let rawToken = '';
  await AppDataSource.transaction(async (transactionalEntityManager) => {
    rawToken = await createEmailToken(
      user.id,
      EmailTokenType.EMAIL_VERIFICATION,
      transactionalEntityManager,
    );
  });

  // Post-commit execution: deliver email outside DB transaction
  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      token: rawToken,
    });
  } catch (emailErr) {
    logger.error(
      { err: emailErr, userId: user.id, email: user.email },
      'Failed to deliver resend verification email post-commit',
    );
  }

  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: SecurityEvent.RESEND_VERIFICATION_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
  });
}
