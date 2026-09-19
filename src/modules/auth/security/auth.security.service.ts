// import crypto from 'node:crypto';

// import bcrypt from 'bcryptjs';

// import type { User } from '@/entities/User';
// import type { EntityManager } from 'typeorm';
// import { AppDataSource } from '@/config/database';
// import { env, isLocalEnv, isTestEnv } from '@/config/env';
// import { logger } from '@/config/logger';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { PasswordHistory } from '@/entities/PasswordHistory';
// import { UserDevice } from '@/entities/UserDevice';
// import { sendLoginNotificationEmail } from '@/services/email.service';
// import { hashToken } from '@/utils/crypto';

// const passwordHistoryRepository = AppDataSource.getRepository(PasswordHistory);
// const userDeviceRepository = AppDataSource.getRepository(UserDevice);

// /**
//  * [WHAT]
//  * Checks if a password has been leaked in a known breach using the HIBP k-Anonymity API.
//  *
//  * [WHY]
//  * Prevents users from registering or resetting passwords with compromised credentials.
//  *
//  * [CONSTRAINT]
//  * 1. Only sends the 5-character SHA-1 prefix to HIBP to preserve user privacy.
//  * 2. Fails open gracefully if HIBP API is offline or network fails.
//  */
// export async function verifyPasswordBreach(password: string): Promise<void> {
//   if (isLocalEnv() || isTestEnv()) {
//     logger.warn('Skipping password breach check in local/test environment');
//     return;
//   }

//   try {
//     const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
//     const prefix = sha1Hash.substring(0, 5);
//     const suffix = sha1Hash.substring(5);

//     const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
//       signal: AbortSignal.timeout(3000),
//       headers: {
//         'Add-Padding': 'true',
//         'Accept-Encoding': 'gzip',
//         'User-Agent': env.APP_NAME,
//       },
//     });
//     if (!response.ok) {
//       logger.error({ status: response.status }, 'HIBP unavailable, skipping breach validation');
//       return;
//     }

//     const text = await response.text();
//     const lines = text.split('\n');
//     for (const line of lines) {
//       const idx = line.indexOf(':');
//       if (idx === -1) continue;
//       const hashSuffix = line.substring(0, idx).trim();
//       if (hashSuffix === suffix) {
//         const count = parseInt(line.substring(idx + 1), 10);
//         if (count > 0) {
//           throw new AppError(
//             AppErrorMessage.PASSWORD_BREACHED,
//             HttpStatusCode.BAD_REQUEST,
//             AppErrorCode.PASSWORD_BREACHED,
//           );
//         }
//         break; // found the suffix, nothing more to check
//       }
//     }
//   } catch (err: unknown) {
//     if (err instanceof AppError) throw err;
//     logger.error({ err }, 'HIBP password breach lookup failed or timed out, failing open');
//   }
// }

// /**
//  * [WHAT]
//  * Validates that the new password does not match any of the last 5 password hashes.
//  */
// export async function checkPasswordHistory(
//   userId: string,
//   newPassword: string,
//   transactionManager?: EntityManager,
// ): Promise<void> {
//   const repo = transactionManager
//     ? transactionManager.getRepository(PasswordHistory)
//     : passwordHistoryRepository;

//   const history = await repo.find({
//     where: { userId },
//     order: { createdAt: 'DESC' },
//     take: 5,
//   });

//   for await (const entry of history) {
//     const isMatch = await bcrypt.compare(newPassword, entry.passwordHash);
//     if (isMatch) {
//       throw new AppError(
//         AppErrorMessage.PASSWORD_REUSED,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.PASSWORD_REUSED,
//       );
//     }
//   }
// }

// /**
//  * [WHAT]
//  * Records a new password hash in user password history, keeping max 5 entries.
//  *
//  * [WHY]
//  * Enforces password non-reuse policy.
//  *
//  * [CONSTRAINT]
//  * Prunes older entries directly in PostgreSQL without loading hashes into Node memory.
//  */
// export async function savePasswordToHistory(
//   userId: string,
//   passwordHash: string,
//   transactionManager?: EntityManager,
// ): Promise<void> {
//   const repo = transactionManager
//     ? transactionManager.getRepository(PasswordHistory)
//     : passwordHistoryRepository;
//   const entry = repo.create({ userId, passwordHash });
//   await repo.save(entry);

//   await repo.query(
//     `DELETE FROM password_histories
//      WHERE user_id = $1
//      AND id NOT IN (
//        SELECT id FROM password_histories
//        WHERE user_id = $1
//        ORDER BY created_at DESC
//        LIMIT 5
//      )`,
//     [userId],
//   );
// }

// /**
//  * Computes a secure signature of the user-agent and IP block.
//  */
// export function computeDeviceHash(userAgent: string | null, ipAddress: string | null): string {
//   const agent = userAgent ?? '';
//   const rawIp = ipAddress ?? '';
//   let ipSubnet = rawIp;

//   if (rawIp.includes('.')) {
//     const parts = rawIp.split('.');
//     if (parts.length === 4) {
//       ipSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
//     }
//   } else if (rawIp.includes(':')) {
//     const parts = rawIp.split(':');
//     if (parts.length >= 4) {
//       ipSubnet = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}`;
//     }
//   }

//   return hashToken(`${agent}|${ipSubnet}`);
// }

// /**
//  * [WHAT]
//  * Checks login device metadata against recognized user devices.
//  */
// export async function trackDeviceAndDetectSuspicious(
//   user: User,
//   userAgent: string | null,
//   ipAddress: string | null,
//   transactionManager?: EntityManager,
// ): Promise<boolean> {
//   const deviceHash = computeDeviceHash(userAgent, ipAddress);
//   const repo = transactionManager
//     ? transactionManager.getRepository(UserDevice)
//     : userDeviceRepository;

//   const existingDevice = await repo.findOne({
//     where: { userId: user.id, deviceHash },
//   });

//   let isSuspicious = false;
//   const now = new Date();
//   const safeAgent = userAgent ? userAgent.substring(0, 255) : null;
//   const safeIp = ipAddress ? ipAddress.substring(0, 45) : null;

//   if (!existingDevice) {
//     const count = await repo.count({ where: { userId: user.id } });
//     if (count > 0) {
//       isSuspicious = true;
//     }
//   }

//   // Atomic upsert handling unique constraint uq_user_devices_user_device
//   if (transactionManager) {
//     await transactionManager.query(
//       `INSERT INTO user_devices (id, user_id, device_hash, user_agent, last_ip_address, is_trusted, last_active_at, created_at, updated_at)
//        VALUES (gen_random_uuid(), $1, $2, $3, $4, false, $5, NOW(), NOW())
//        ON CONFLICT (user_id, device_hash)
//        DO UPDATE SET last_active_at = EXCLUDED.last_active_at, last_ip_address = EXCLUDED.last_ip_address, updated_at = NOW()`,
//       [user.id, deviceHash, safeAgent, safeIp, now],
//     );
//   } else {
//     if (!existingDevice) {
//       const device = repo.create({
//         userId: user.id,
//         deviceHash,
//         userAgent: safeAgent,
//         lastIpAddress: safeIp,
//         isTrusted: false,
//         lastActiveAt: now,
//       });
//       try {
//         await repo.save(device);
//       } catch {
//         // Fallback update on concurrency clash
//         await repo.update(
//           { userId: user.id, deviceHash },
//           { lastActiveAt: now, lastIpAddress: safeIp },
//         );
//       }
//     } else {
//       await repo.update(existingDevice.id, { lastActiveAt: now, lastIpAddress: safeIp });
//     }
//   }

//   // Asynchronous background login alert email delivery (does not block HTTP response)
//   if (isSuspicious) {
//     sendLoginNotificationEmail({
//       to: user.email,
//       name: user.name,
//       userId: user.id,
//       ipAddress,
//       userAgent,
//       time: now,
//     }).catch((emailErr) => {
//       logger.error(
//         { err: emailErr, userId: user.id, email: user.email },
//         'Failed to deliver suspicious login notification email in background',
//       );
//     });
//   }

//   return isSuspicious;
// }
