// import { MoreThan } from 'typeorm';

// import { computeDeviceHash } from '../security/auth.security.service';
// import { logSecurityEvent } from '../security/auth.securityLog.service';

// import type { UserDeviceDto } from '../auth.dto';
// import { AppDataSource } from '@/config/database';
// import { logger } from '@/config/logger';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { User } from '@/entities/User';
// import { UserDevice } from '@/entities/UserDevice';
// import { UserSession } from '@/entities/UserSession';
// import { CacheService } from '@/services/cache.service';
// import { SecurityEvent } from '@/types/enums';
// import { hashToken } from '@/utils/crypto';
// import { maskIpAddress, parseUserAgent } from '@/utils/userAgent';

// const userSessionRepository = AppDataSource.getRepository(UserSession);
// const userDeviceRepository = AppDataSource.getRepository(UserDevice);

// /**
//  * Returns all active (non-revoked, non-expired) sessions for the user enriched with UA parsing and smart sorting.
//  */
// export async function getUserSessions(userId: string, currentRawRefreshToken?: string) {
//   const sessions = await userSessionRepository.find({
//     where: { userId, isRevoked: false, expiresAt: MoreThan(new Date()) },
//     select: {
//       id: true,
//       tokenHash: true,
//       userAgent: true,
//       ipAddress: true,
//       lastUsedAt: true,
//       createdAt: true,
//       expiresAt: true,
//     },
//     order: { createdAt: 'DESC' },
//   });

//   const currentHash = currentRawRefreshToken ? hashToken(currentRawRefreshToken) : null;

//   const mappedSessions = sessions.map((s) => {
//     const isCurrent = currentHash !== null && s.tokenHash === currentHash;
//     const parsedUa = parseUserAgent(s.userAgent);
//     const lastActive = s.lastUsedAt ?? s.createdAt;

//     return {
//       id: s.id,
//       browser: parsedUa.browser,
//       browserVersion: parsedUa.browserVersion,
//       os: parsedUa.os,
//       device: parsedUa.device,
//       ipAddress: s.ipAddress,
//       isCurrent,
//       createdAt: s.createdAt,
//       lastUsedAt: lastActive,
//       expiresAt: s.expiresAt,
//     };
//   });

//   // Sort hierarchy: Current session first, followed by lastUsedAt DESC
//   mappedSessions.sort((a, b) => {
//     if (a.isCurrent) return -1;
//     if (b.isCurrent) return 1;
//     return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
//   });

//   return mappedSessions;
// }

// /**
//  * Revokes a specific session by ID using atomic single-query execution.
//  */
// export async function revokeSessionById(
//   userId: string,
//   sessionId: string,
//   connectionContext?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<void> {
//   const now = new Date();

//   const result = await userSessionRepository
//     .createQueryBuilder()
//     .update(UserSession)
//     .set({
//       isRevoked: true,
//       lastUsedAt: now,
//       updatedAt: now,
//     })
//     .where('id = :sessionId', { sessionId })
//     .andWhere('user_id = :userId', { userId })
//     .andWhere('is_revoked = false')
//     .andWhere('expires_at > :now', { now })
//     .execute();

//   if (!result.affected || result.affected === 0) {
//     throw new AppError(
//       AppErrorMessage.SESSION_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   // Invalidate sessions list cache
//   CacheService.del(`sessions:${userId}`).catch(() => {});

//   // Best-effort background security audit log delivery
//   logSecurityEvent({
//     userId,
//     email: null,
//     event: SecurityEvent.SESSION_REVOKED,
//     ipAddress: connectionContext?.ipAddress ?? null,
//     userAgent: connectionContext?.userAgent ?? null,
//     details: {
//       sessionId,
//       action: 'manual_revocation',
//     },
//   }).catch((err) => {
//     logger.error({ err, userId, sessionId }, 'Failed to log session revocation security event');
//   });
// }

// import { invalidateUserAuthSnapshot } from '@/middleware/authenticate';

// /**
//  * Revokes all active sessions for a user (global logout) inside a single atomic transaction
//  * and increments tokenVersion.
//  */
// export async function revokeAllUserSessions(
//   userId: string,
//   connectionContext?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<{ revokedSessions: number }> {
//   const now = new Date();

//   const revokedSessions = await AppDataSource.transaction(async (manager) => {
//     // 1. Revoke active non-expired sessions
//     const updateResult = await manager
//       .createQueryBuilder()
//       .update(UserSession)
//       .set({
//         isRevoked: true,
//         lastUsedAt: now,
//         updatedAt: now,
//       })
//       .where('user_id = :userId', { userId })
//       .andWhere('is_revoked = false')
//       .andWhere('expires_at > :now', { now })
//       .execute();

//     // 2. Increment tokenVersion on user table to invalidate active JWTs instantly
//     await manager
//       .createQueryBuilder()
//       .update(User)
//       .set({ tokenVersion: () => 'token_version + 1' })
//       .where('id = :userId', { userId })
//       .execute();

//     return updateResult.affected ?? 0;
//   });

//   // Invalidate both user auth snapshot (due to tokenVersion increment) and sessions list cache
//   invalidateUserAuthSnapshot(userId).catch(() => {});
//   CacheService.del(`sessions:${userId}`).catch(() => {});

//   // Best-effort background security audit telemetry
//   logSecurityEvent({
//     userId,
//     email: null,
//     event: SecurityEvent.SESSION_REVOKED,
//     ipAddress: connectionContext?.ipAddress ?? null,
//     userAgent: connectionContext?.userAgent ?? null,
//     details: {
//       action: 'revoke_all',
//       revokedSessionsCount: revokedSessions,
//     },
//   }).catch((err) => {
//     logger.error({ err, userId }, 'Failed to log global session revocation security event');
//   });

//   return { revokedSessions };
// }

// /**
//  * Retrieves recognized devices for a specific user enriched with UserDeviceDto metadata and deterministic sorting.
//  */
// export async function getUserDevices(
//   userId: string,
//   currentContext?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<UserDeviceDto[]> {
//   const devices = await userDeviceRepository.find({
//     where: { userId },
//     select: {
//       id: true,
//       deviceHash: true,
//       userAgent: true,
//       lastIpAddress: true,
//       isTrusted: true,
//       lastActiveAt: true,
//       createdAt: true,
//     },
//     order: { lastActiveAt: 'DESC' },
//   });

//   const currentDeviceHash = currentContext
//     ? computeDeviceHash(currentContext.userAgent, currentContext.ipAddress)
//     : null;

//   const mappedDevices: UserDeviceDto[] = devices.map((d) => {
//     const isCurrent = currentDeviceHash !== null && d.deviceHash === currentDeviceHash;
//     const parsedUa = parseUserAgent(d.userAgent);

//     return {
//       id: d.id,
//       browser: parsedUa.browser,
//       browserVersion: parsedUa.browserVersion,
//       os: parsedUa.os,
//       osVersion: parsedUa.osVersion,
//       device: parsedUa.device,
//       ipAddress: maskIpAddress(d.lastIpAddress),
//       isTrusted: d.isTrusted,
//       isCurrent,
//       lastSeenAt: d.lastActiveAt,
//       createdAt: d.createdAt,
//     };
//   });

//   // Deterministic weight-based device sorting: Current device (100) -> Trusted (10) -> lastSeenAt DESC
//   const getWeight = (d: UserDeviceDto) => (d.isCurrent ? 100 : 0) + (d.isTrusted ? 10 : 0);
//   mappedDevices.sort((a, b) => {
//     const diff = getWeight(b) - getWeight(a);
//     if (diff !== 0) return diff;
//     return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
//   });

//   return mappedDevices;
// }

// /**
//  * Marks a specific device as trusted using atomic single-query execution.
//  */
// export async function trustDeviceById(
//   userId: string,
//   deviceId: string,
//   connectionContext?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<void> {
//   const now = new Date();

//   const result = await userDeviceRepository
//     .createQueryBuilder()
//     .update(UserDevice)
//     .set({
//       isTrusted: true,
//       updatedAt: now,
//     })
//     .where('id = :deviceId', { deviceId })
//     .andWhere('user_id = :userId', { userId })
//     .andWhere('is_trusted = false')
//     .returning(['id'])
//     .execute();

//   const isUpdated = (result.raw?.length ?? 0) > 0;

//   if (!isUpdated) {
//     // Check if device exists for this user (already trusted vs non-existent/unowned)
//     const existing = await userDeviceRepository.findOne({
//       where: { id: deviceId, userId },
//       select: { id: true },
//     });

//     if (!existing) {
//       throw new AppError(
//         AppErrorMessage.DEVICE_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     // Device already trusted — return idempotently without duplicate logging
//     return;
//   }

//   // Invalidate devices list cache
//   CacheService.del(`devices:${userId}`).catch(() => {});

//   // Best-effort background security audit log delivery (only on state change)
//   logSecurityEvent({
//     userId,
//     email: null,
//     event: SecurityEvent.DEVICE_TRUSTED,
//     ipAddress: connectionContext?.ipAddress ?? null,
//     userAgent: connectionContext?.userAgent ?? null,
//     details: {
//       deviceId,
//       action: 'trust_device',
//     },
//   }).catch((err) => {
//     logger.error({ err, userId, deviceId }, 'Failed to log device trusted security event');
//   });
// }

// /**
//  * Revokes a specific recognized device and all active sessions linked to its device signature in a single transaction.
//  */
// export async function revokeDeviceById(
//   userId: string,
//   deviceId: string,
//   connectionContext?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<{ isCurrentDevice: boolean; revokedSessions: number }> {
//   const currentDeviceHash = connectionContext
//     ? computeDeviceHash(connectionContext.userAgent, connectionContext.ipAddress)
//     : null;

//   let targetDeviceHash: string | null = null;
//   let revokedSessions = 0;
//   const now = new Date();

//   await AppDataSource.transaction(async (manager) => {
//     // 1. Delete UserDevice record atomically returning device_hash
//     const deleteResult = await manager
//       .getRepository(UserDevice)
//       .createQueryBuilder()
//       .delete()
//       .where('id = :deviceId', { deviceId })
//       .andWhere('user_id = :userId', { userId })
//       .returning('*')
//       .execute();

//     if (!deleteResult.affected || deleteResult.affected === 0) {
//       throw new AppError(
//         AppErrorMessage.DEVICE_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     const deletedDevice = deleteResult.raw?.[0];
//     targetDeviceHash = deletedDevice?.device_hash ?? deletedDevice?.deviceHash ?? null;

//     // 2. Revoke active non-expired sessions sharing the target deviceHash signature
//     if (targetDeviceHash) {
//       const updateResult = await manager
//         .getRepository(UserSession)
//         .createQueryBuilder()
//         .update()
//         .set({
//           isRevoked: true,
//           lastUsedAt: now,
//           updatedAt: now,
//         })
//         .where('user_id = :userId', { userId })
//         .andWhere('device_hash = :targetDeviceHash', { targetDeviceHash })
//         .andWhere('is_revoked = false')
//         .andWhere('expires_at > :now', { now })
//         .execute();

//       revokedSessions = updateResult.affected ?? 0;
//     }
//   });

//   const isCurrentDevice = currentDeviceHash === targetDeviceHash;

//   // Invalidate both devices list and sessions list caches
//   CacheService.del(`devices:${userId}`).catch(() => {});
//   CacheService.del(`sessions:${userId}`).catch(() => {});

//   // Best-effort background security audit log delivery (omitting raw hash for privacy)
//   logSecurityEvent({
//     userId,
//     email: null,
//     event: SecurityEvent.SESSION_REVOKED,
//     ipAddress: connectionContext?.ipAddress ?? null,
//     userAgent: connectionContext?.userAgent ?? null,
//     details: {
//       deviceId,
//       action: 'revoke_device',
//       revokedSessions,
//       isCurrentDevice,
//     },
//   }).catch((err) => {
//     logger.error({ err, userId, deviceId }, 'Failed to log device revocation security event');
//   });

//   return { isCurrentDevice, revokedSessions };
// }
