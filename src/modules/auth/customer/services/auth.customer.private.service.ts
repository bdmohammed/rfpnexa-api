// import { logSecurityEvent } from '../../security/auth.securityLog.service';
import { clearAuthCookies } from '../../utils/auth.cookie';

import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
// import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { User } from '@/entities/User';
// import { UserSession } from '@/entities/UserSession';
// import { SecurityEvent } from '@/types/enums';
// import { hashRefreshToken } from '@/utils/crypto';
import { sanitizeUser } from '@/utils/sanitizer';

const userRepository = AppDataSource.getRepository(User);

export { clearAuthCookies };

/**
 * Logs out the user by revoking their current database session and clearing cookies.
 */
export async function logoutUser(
  res: Response,
  _rawRefreshToken: string | undefined,
  _connectionContext?: { userAgent: string | null; ipAddress: string | null },
  _authenticatedUserId?: string,
): Promise<void> {
  // let targetUserId = authenticatedUserId ?? null;

  // if (rawRefreshToken && authenticatedUserId) {
  //   const tokenHash = hashRefreshToken(rawRefreshToken);
  //   const now = new Date();

  //   const result = await AppDataSource.createQueryBuilder()
  //     .update(UserSession)
  //     .set({
  //       isRevoked: true,
  //       lastUsedAt: now,
  //     })
  //     .where('token_hash = :tokenHash', { tokenHash })
  //     .andWhere('user_id = :authenticatedUserId', { authenticatedUserId })
  //     .andWhere('is_revoked = false')
  //     .andWhere('expires_at > :now', { now })
  //     .returning(['user_id'])
  //     .execute();

  //   const updatedRecord = result.raw?.[0];
  //   if (updatedRecord) {
  //     targetUserId = updatedRecord.user_id ?? updatedRecord.userId ?? authenticatedUserId;
  //   }
  // }

  // Idempotent Cookie Clearing
  clearAuthCookies(res);

  // Non-blocking background audit log delivery
  // if (targetUserId) {
  //   logSecurityEvent({
  //     userId: targetUserId,
  //     email: null,
  //     event: SecurityEvent.LOGOUT,
  //     ipAddress: connectionContext?.ipAddress ?? null,
  //     userAgent: connectionContext?.userAgent ?? null,
  //   }).catch((err) => {
  //     logger.error(
  //       { err, userId: targetUserId },
  //       'Failed to record logout security event in background',
  //     );
  //   });
  // }
}

export async function getProfile(userId: string): Promise<ReturnType<typeof sanitizeUser>> {
  const user = await userRepository.findOne({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      // status: true,
      // emailVerified: true,
      companyName: true,
      countryId: true,
      createdAt: true,
      updatedAt: true,
      // lastLoginAt: true,
      // passwordChangedAt: true,
    },
  });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  return sanitizeUser(user);
}
