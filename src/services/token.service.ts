// import { type EntityManager, IsNull, MoreThan } from 'typeorm';

// import { EmailToken } from '../database/entities/EmailToken';
// import { EmailTokenType } from '../types/enums';

// import type { User } from '../database/entities/User';
// import { AppDataSource } from '@/config/database';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { EMAIL_TOKEN_TTL } from '@/core/constants';
// import { generateEmailVerificationToken, hashToken } from '@/utils/crypto';

// const emailTokenRepository = AppDataSource.getRepository(EmailToken);

// /**
//  * [WHAT]
//  * Creates a single-use email verification or reset token.
//  *
//  * [WHY]
//  * Guarantees that only one active token exists per user and token type by purging previous unused tokens.
//  *
//  * [CONSTRAINT]
//  * 1. Must delete any previous unused tokens of the same type for this user before issuing a new token.
//  * 2. Returns the RAW plain-text token (for email delivery) while storing only the SHA-256 hash in DB.
//  */
// export async function createEmailToken(
//   userId: string,
//   type: EmailTokenType,
//   transactionManager?: EntityManager,
// ): Promise<string> {
//   const repo = transactionManager
//     ? transactionManager.getRepository(EmailToken)
//     : emailTokenRepository;

//   // Purge any existing unused tokens of the same type for this user
//   await repo.delete({ userId, type });

//   const { rawToken, hashedToken } = generateEmailVerificationToken();

//   const ttl =
//     type === EmailTokenType.PASSWORD_RESET || type === EmailTokenType.SYSTEM_OWNER_APPROVAL
//       ? EMAIL_TOKEN_TTL.PASSWORD_RESET
//       : EMAIL_TOKEN_TTL.VERIFICATION;

//   const token = repo.create({
//     userId,
//     tokenHash: hashedToken,
//     type,
//     expiresAt: new Date(Date.now() + ttl),
//   });

//   await repo.save(token);
//   return rawToken;
// }

// /**
//  * [WHAT]
//  * Verifies a raw token against the stored SHA-256 database hash and marks it as used.
//  *
//  * [WHY]
//  * Single-use token enforcement preventing replay attacks.
//  */
// export async function verifyAndConsumeToken(
//   rawToken: string,
//   type: EmailTokenType,
//   transactionManager?: EntityManager,
// ): Promise<string> {
//   const tokenHash = hashToken(rawToken);
//   const manager = transactionManager ?? AppDataSource.manager;
//   const now = new Date();

//   const result = await manager
//     .getRepository(EmailToken)
//     .createQueryBuilder()
//     .update()
//     .set({ usedAt: now })
//     .where('token_hash = :tokenHash', { tokenHash })
//     .andWhere('type = :type', { type })
//     .andWhere('used_at IS NULL')
//     .andWhere('expires_at > :now', { now })
//     .returning('*')
//     .execute();

//   if (!result.affected || result.affected === 0) {
//     throw new AppError(
//       AppErrorMessage.INVALID_OR_EXPIRED_TOKEN,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_TOKEN,
//     );
//   }

//   const updatedRecord = result.raw?.[0];
//   const userId = updatedRecord?.user_id ?? updatedRecord?.userId;

//   if (!userId) {
//     throw new AppError(
//       AppErrorMessage.INVALID_OR_EXPIRED_TOKEN,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_TOKEN,
//     );
//   }

//   if (type === EmailTokenType.PASSWORD_RESET) {
//     const repo = transactionManager
//       ? transactionManager.getRepository(EmailToken)
//       : emailTokenRepository;
//     await repo.delete({ userId, type });
//   }

//   return userId;
// }

// /**
//  * [WHAT]
//  * Deletes all tokens of a given type for a user.
//  */
// export async function deleteTokensByType(userId: string, type: EmailTokenType): Promise<void> {
//   await emailTokenRepository.delete({ userId, type });
// }

// /**
//  * [WHAT]
//  * Retrieves details for a valid, non-expired, non-used token along with user relations.
//  */
// export async function getValidTokenDetails(
//   rawToken: string,
//   type: EmailTokenType,
// ): Promise<EmailToken & { user: User }> {
//   const tokenHash = hashToken(rawToken);
//   const matched = await emailTokenRepository.findOne({
//     where: {
//       tokenHash,
//       type,
//       usedAt: IsNull() as unknown as Date,
//       expiresAt: MoreThan(new Date()),
//     },
//     relations: {
//       user: true,
//     },
//   });

//   if (!matched?.user) {
//     throw new AppError(
//       AppErrorMessage.INVALID_OR_EXPIRED_TOKEN,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_TOKEN,
//     );
//   }

//   return matched;
// }
