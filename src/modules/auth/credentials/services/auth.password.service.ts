import * as bcrypt from 'bcryptjs';
import { IsNull, MoreThan } from 'typeorm';

import {
  checkPasswordHistory,
  savePasswordToHistory,
  // verifyCaptcha,
  verifyPasswordBreach,
} from '../../security/auth.security.service';
import { logSecurityEvent, SecurityAuditReason } from '../../security/auth.securityLog.service';

import { AppDataSource } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { BCRYPT_ROUNDS } from '@/core/constants';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import { invalidateUserAuthSnapshot } from '@/middleware/authenticate';
import { sendPasswordResetEmail } from '@/services/email.service';
import { createEmailToken, verifyAndConsumeToken } from '@/services/token.service';
import { EmailTokenType, SecurityEvent, UserStatus } from '@/types/enums';
import { normalizeEmail } from '@/utils/email';

const userRepository = AppDataSource.getRepository(User);
const emailTokenRepository = AppDataSource.getRepository(EmailToken);

export async function forgotPassword(
  rawEmail: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await userRepository.findOne({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailVerified: true,
      isBlocked: true,
    },
  });

  // 1. Anti-enumeration check for non-existent user
  if (!user) {
    logSecurityEvent({
      email,
      event: SecurityEvent.PASSWORD_RESET_IGNORED,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: { reason: SecurityAuditReason.USER_NOT_FOUND },
    });
    return;
  }

  // 2. Account status & eligibility check
  if (user.status !== UserStatus.ACTIVE || !user.emailVerified || user.isBlocked) {
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.PASSWORD_RESET_IGNORED,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: {
        reason: SecurityAuditReason.ACCOUNT_INELIGIBLE,
        status: user.status,
        emailVerified: user.emailVerified,
        isBlocked: user.isBlocked,
      },
    });
    return;
  }

  // 3. Resend Cooldown Check (e.g. 60s minimum interval)
  const minIntervalSeconds = env.PASSWORD_RESET_MIN_INTERVAL_SECONDS;
  if (minIntervalSeconds > 0) {
    const existingToken = await emailTokenRepository.findOne({
      where: {
        userId: user.id,
        type: EmailTokenType.PASSWORD_RESET,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingToken) {
      const cooldownMs = minIntervalSeconds * 1000;
      const elapsedMs = Date.now() - existingToken.createdAt.getTime();
      if (elapsedMs < cooldownMs) {
        logSecurityEvent({
          userId: user.id,
          email: user.email,
          event: SecurityEvent.PASSWORD_RESET_IGNORED,
          ipAddress: connectionContext?.ipAddress ?? null,
          userAgent: connectionContext?.userAgent ?? null,
          details: { reason: SecurityAuditReason.COOLDOWN_ACTIVE, elapsedMs, cooldownMs },
        });
        return;
      }
    }
  }

  // 4. Atomic DB Transaction for token purging and creation
  let rawToken = '';
  await AppDataSource.transaction(async (manager) => {
    rawToken = await createEmailToken(user.id, EmailTokenType.PASSWORD_RESET, manager);
  });

  // 5. Post-Commit Execution: Audit event + Email dispatch
  logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: SecurityEvent.PASSWORD_RESET_REQUESTED,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
  });

  sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  }).catch((emailErr) => {
    logger.error(
      { err: emailErr, userId: user.id, email: user.email },
      'Failed to deliver password reset email in background',
    );
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  // Pre-transaction CPU & external validation (outside DB locks)
  await verifyPasswordBreach(newPassword);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  let userId = '';
  let userEmail: string | null = null;
  let revokedSessionsCount = 0;

  // Single Atomic Database Transaction
  await AppDataSource.transaction(async (manager) => {
    // 1. Consume token atomically
    userId = await verifyAndConsumeToken(token, EmailTokenType.PASSWORD_RESET, manager);

    // 2. Validate password non-reuse against last 5 historical passwords
    await checkPasswordHistory(userId, newPassword, manager);

    // 3. Revoke active sessions only (WHERE is_revoked = false)
    const revokeResult = await manager
      .getRepository(UserSession)
      .update({ userId, isRevoked: false }, { isRevoked: true });
    revokedSessionsCount = revokeResult.affected ?? 0;

    // 4. Update passwordHash, passwordChangedAt, and increment tokenVersion
    const now = new Date();
    await manager
      .createQueryBuilder()
      .update(User)
      .set({
        passwordHash,
        passwordChangedAt: now,
        tokenVersion: () => 'token_version + 1',
      })
      .where('id = :id', { id: userId })
      .execute();

    // 5. Record new password hash in history
    await savePasswordToHistory(userId, passwordHash, manager);

    // 6. Retrieve email for post-commit telemetry
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      select: { email: true },
    });
    userEmail = user?.email ?? null;
  });

  // Post-commit security event logging & auth cache invalidation
  await invalidateUserAuthSnapshot(userId);

  logSecurityEvent({
    userId,
    email: userEmail,
    event: SecurityEvent.PASSWORD_CHANGE,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { method: 'password_reset', revokedSessionsCount },
  });
}
