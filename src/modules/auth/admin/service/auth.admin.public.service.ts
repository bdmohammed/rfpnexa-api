import * as bcrypt from 'bcryptjs';
import { type DeepPartial, QueryFailedError } from 'typeorm';

// import { savePasswordToHistory, verifyPasswordBreach } from '../../security/auth.security.service';
// import { logSecurityEvent, SecurityAuditReason } from '../../security/auth.securityLog.service';
import { generateAndSetTokens } from '../../token/auth.token.service';
import {
  // checkUserLockout,
  handleNonExistentUserLogin,
  // validateCommonAccountStatus,
  verifyPasswordAndHandleFailure,
} from '../../utils/auth.helper';

import type { LoginDto, RegisterDto } from '../../auth.dto';
import type { Response } from 'express';
import { AppDataSource } from '@/config/database';
// import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { BCRYPT_ROUNDS, SUPER_ADMIN } from '@/core/constants';
import { Role } from '@/database/entities/Role';
import { UserRole } from '@/database/entities/UserRole';
import { Country } from '@/entities/Country';
import { User } from '@/entities/User';
// import { UserRole } from '@/entities/UserRole';
// import {
//   sendAdminBootstrapNotification,
//   sendAdminRegistrationNotification,
//   sendAdminVerificationEmail,
// } from '@/services/email.service';
// import { createEmailToken, verifyAndConsumeToken } from '@/services/token.service';
import {
  AccountType,
  RoleStatus,
  // EmailTokenType, SecurityEvent, UserStatus
} from '@/types/enums';
import { normalizeEmail } from '@/utils/email';
import { toNumber } from '@/utils/number';
import { sanitizeUser } from '@/utils/sanitizer';

const userRepository = AppDataSource.getRepository(User);
const countryRepo = AppDataSource.getRepository(Country);
// const userRoleRepository = AppDataSource.getRepository(UserRole);

export async function registerAdmin(
  dto: RegisterDto,
  _connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const country = await countryRepo.findOne({
    // where: { id: dto.countryId, isActive: true },
    where: { id: toNumber(dto.countryId) },
  });
  if (!country) {
    throw new AppError(
      AppErrorMessage.COUNTRY_NOT_FOUND,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const exists = await userRepository.findOne({
    where: { email: dto.email },
    select: {
      id: true,
    },
  });

  if (exists) {
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );
  }

  // Verify that the password is not leaked/breached
  // await verifyPasswordBreach(dto.password);
  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  // let createdUser: User;
  // let rawVerificationToken: string;

  try {
    // const result =
    await AppDataSource.transaction(async (manager) => {
      const txUserRepo = manager.getRepository(User);
      const txRoleRepo = manager.getRepository(Role);
      const txUserRoleRepo = manager.getRepository(UserRole);
      // Check if this is the first user.
      const userCount = await txUserRepo.count({
        where: {
          accountType: AccountType.ADMIN,
        },
      });
      const isFirstUser = userCount === 0;
      const userInput: DeepPartial<User> = {
        name: dto.name,
        email: dto.email,
        passwordHash,
        accountType: AccountType.ADMIN,
        // status: UserStatus.PENDING_APPROVAL,
        // emailVerified: false,
        // passwordChangedAt: new Date(),
        country,
      };

      if (dto.companyName) {
        userInput.companyName = dto.companyName;
      }

      const user = txUserRepo.create(userInput);
      await txUserRepo.save(user);
      // First registered user becomes Super Admin.
      if (isFirstUser) {
        const superAdminRole = await txRoleRepo.findOne({
          where: {
            key: SUPER_ADMIN,
            isSystemRole: true,
            status: RoleStatus.ACTIVE,
          },
        });

        if (!superAdminRole) {
          throw new Error('Super Admin role not found');
        }

        const userRole = txUserRoleRepo.create({
          userId: user.id,
          roleId: superAdminRole.id,
          assignedBy: user,
          status: RoleStatus.ACTIVE,
        });

        await txUserRoleRepo.save(userRole);
      }
      // await savePasswordToHistory(user.id, passwordHash, manager);

      // const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION, manager);

      // return { user, rawToken };
    });

    // createdUser = result.user;
    // rawVerificationToken = result.rawToken;
  } catch (err: unknown) {
    if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
      logger.warn({ email: dto.email }, 'Registration race condition: duplicate email');
      throw new AppError(
        AppErrorMessage.EMAIL_REGISTERED,
        HttpStatusCode.CONFLICT,
        AppErrorCode.EMAIL_TAKEN,
      );
    }
    throw err;
  }

  // await logSecurityEvent({
  //   userId: createdUser.id,
  //   email: createdUser.email,
  //   event: SecurityEvent.ADMIN_REGISTER_SUCCESS,
  //   ipAddress: connectionContext?.ipAddress ?? null,
  //   userAgent: connectionContext?.userAgent ?? null,
  // });

  // sendAdminVerificationEmail({
  //   to: createdUser.email,
  //   name: createdUser.name,
  //   userId: createdUser.id,
  //   token: rawVerificationToken,
  // }).catch((emailErr) => {
  //   logger.error(
  //     { err: emailErr, userId: createdUser.id, email: createdUser.email },
  //     'Failed to deliver verification email in background',
  //   );
  // });
}

// export async function verifyAdminEmail(
//   token: string,
// ): Promise<{ superAdminExists: boolean; user: User }> {
//   const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_VERIFICATION);
//   const user = await userRepository.findOne({ where: { id: userId } });
//   if (!user) {
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.USER_NOT_FOUND,
//     );
//   }

//   user.emailVerified = true;
//   await userRepository.save(user);

//   const superAdminCount = await userRoleRepository.count({
//     where: {
//       role: {
//         key: 'super-admin',
//       },
//     },
//     relations: {
//       role: true,
//     },
//   });

//   const superAdminExists = superAdminCount > 0;

//   if (superAdminExists) {
//     // Notify Super Admins
//     const superAdmins = await userRoleRepository.find({
//       where: {
//         role: {
//           key: 'super-admin',
//         },
//       },
//       relations: {
//         user: true,
//         role: true,
//       },
//     });

//     for await (const sa of superAdmins) {
//       if (sa.user.email) {
//         await sendAdminRegistrationNotification({
//           to: sa.user.email,
//           adminName: user.name,
//           adminEmail: user.email,
//         });
//       }
//     }
//   } else {
//     // Create SYSTEM_OWNER_APPROVAL token (valid for 30 minutes, single use)
//     const rawToken = await createEmailToken(user.id, EmailTokenType.SYSTEM_OWNER_APPROVAL);
//     const bootstrapLink = `${env.FRONTEND_ADMIN_URL}/bootstrap?token=${rawToken}`;

//     // Send email to RFPNEXA_SYSTEM_ADMIN_EMAIL
//     await sendAdminBootstrapNotification({
//       to: env.RFPNEXA_SYSTEM_ADMIN_EMAIL,
//       adminName: user.name,
//       adminEmail: user.email,
//       bootstrapLink,
//     });
//   }

//   return { superAdminExists, user };
// }

export async function loginAdmin(
  dto: LoginDto,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<ReturnType<typeof sanitizeUser>> {
  const email = normalizeEmail(dto.email);
  const user = await userRepository.findOne({
    where: { email },
  });

  if (!user) {
    return await handleNonExistentUserLogin(
      // email, dto.password, connectionContext
    );
  }

  if (user.accountType !== AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.INVALID_CREDENTIALS,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_CREDENTIALS,
    );
  }

  // 1. Check Lockout Status
  // await checkUserLockout(user, connectionContext);

  // 2. CAPTCHA Check (Enforced if failed attempts >= threshold)
  // await checkCaptchaRequirement(user, dto.captchaToken, connectionContext);

  // 3. Verify Password & handle failure
  await verifyPasswordAndHandleFailure(
    dto.password,
    user,
    // connectionContext
  );

  // 4. Common account status check (email verified, blocked)
  // await validateCommonAccountStatus(user, connectionContext);

  // 5. Admin-specific Status Checks
  // if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
  //   await logSecurityEvent({
  //     userId: user.id,
  //     email: user.email,
  //     event: SecurityEvent.PENDING_EMAIL_VERIFICATION,
  //     ipAddress: connectionContext.ipAddress,
  //     userAgent: connectionContext.userAgent,
  //     details: { reason: SecurityAuditReason.EMAIL_NOT_VERIFIED },
  //   });
  //   throw new AppError(
  //     AppErrorMessage.VERIFY_EMAIL_BEFORE_LOGIN,
  //     HttpStatusCode.FORBIDDEN,
  //     AppErrorCode.EMAIL_NOT_VERIFIED,
  //   );
  // }

  // if (user.status === UserStatus.PENDING_APPROVAL) {
  //   await logSecurityEvent({
  //     userId: user.id,
  //     email: user.email,
  //     event: SecurityEvent.ADMIN_ACCOUNT_AWAITING_APPROVAL,
  //     ipAddress: connectionContext.ipAddress,
  //     userAgent: connectionContext.userAgent,
  //     details: { reason: SecurityAuditReason.ADMIN_ACCOUNT_AWAITING_APPROVAL },
  //   });
  //   throw new AppError(
  //     AppErrorMessage.ADMIN_ACCOUNT_AWAITING_APPROVAL,
  //     HttpStatusCode.FORBIDDEN,
  //     AppErrorCode.PENDING_APPROVAL,
  //   );
  // }

  // if (user.status === UserStatus.REJECTED) {
  //   await logSecurityEvent({
  //     userId: user.id,
  //     email: user.email,
  //     event: SecurityEvent.ADMIN_ACCOUNT_APPROVAL_REJECTED,
  //     ipAddress: connectionContext.ipAddress,
  //     userAgent: connectionContext.userAgent,
  //     details: { reason: SecurityAuditReason.ADMIN_ACCOUNT_APPROVAL_REJECTED },
  //   });
  //   throw new AppError(
  //     AppErrorMessage.ADMIN_ACCOUNT_REJECTED,
  //     HttpStatusCode.FORBIDDEN,
  //     AppErrorCode.REJECTED,
  //   );
  // }

  // if (user.status === UserStatus.SUSPENDED) {
  //   await logSecurityEvent({
  //     userId: user.id,
  //     email: user.email,
  //     event: SecurityEvent.ADMIN_ACCOUNT_SUSPENDED,
  //     ipAddress: connectionContext.ipAddress,
  //     userAgent: connectionContext.userAgent,
  //     details: { reason: SecurityAuditReason.ADMIN_ACCOUNT_SUSPENDED },
  //   });
  //   throw new AppError(
  //     AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_ADMIN,
  //     HttpStatusCode.FORBIDDEN,
  //     AppErrorCode.ACCOUNT_BLOCKED,
  //   );
  // }

  // 6. Generate tokens & set cookies
  await generateAndSetTokens(res, user, {
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
    rememberMe: dto.rememberMe,
  });

  // await logSecurityEvent({
  //   userId: user.id,
  //   email: user.email,
  //   event: SecurityEvent.LOGIN_SUCCESS,
  //   ipAddress: connectionContext.ipAddress,
  //   userAgent: connectionContext.userAgent,
  // });

  return sanitizeUser(user);
}
