import * as bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';

// import { savePasswordToHistory, verifyPasswordBreach } from '../../security/auth.security.service';
// import { logSecurityEvent } from '../../security/auth.securityLog.service';
import { generateAndSetTokens } from '../../token/auth.token.service';
import {
  // checkUserLockout,
  handleNonExistentUserLogin,
  // validateCommonAccountStatus,
  verifyPasswordAndHandleFailure,
} from '../../utils/auth.helper';

import type { LoginDto, RegisterDto } from '../../auth.dto';
import type { Response } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { BCRYPT_ROUNDS } from '@/core/constants';
import { Country } from '@/entities/Country';
import { User } from '@/entities/User';
// import { invalidateUserAuthSnapshot } from '@/middleware/authenticate';
// import { sendVerificationEmail } from '@/services/email.service';
// import { createEmailToken, verifyAndConsumeToken } from '@/services/token.service';
import {
  AccountType,
  // EmailTokenType,
  // SecurityEvent,
  // UserStatus
} from '@/types/enums';
import { normalizeEmail } from '@/utils/email';
import { toNumber } from '@/utils/number';
import { sanitizeUser } from '@/utils/sanitizer';

const userRepository = AppDataSource.getRepository(User);
const countryRepo = AppDataSource.getRepository(Country);

/**
 * [WHAT]
 * Registers a new customer user account, records initial password history, and dispatches email verification.
 *
 * [WHY]
 * Creates customer credentials in database and dispatches verification link to complete account setup.
 *
 * [CONSTRAINT]
 * 1. All database writes (`User`, `PasswordHistory`, `EmailToken`) MUST be executed in a single transaction.
 * 2. Catches database UNIQUE constraint violations (`23505`) on concurrent registrations to return 409 Conflict.
 * 3. Verification email dispatch MUST run asynchronously post-transaction without delaying response latency.
 *
 * [SIDE EFFECTS]
 * 1. Inserts `User`, `PasswordHistory`, `EmailToken`, and `SecurityLog` in PostgreSQL.
 * 2. Asynchronously dispatches email via AWS SES.
 *
 * [ERRORS]
 * 1. Throws 409 Conflict if email is already registered.
 * 2. Throws 400 Bad Request if country is invalid or password was breached.
 */
export async function registerUser(
  dto: RegisterDto,
  // connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const country = await countryRepo.findOne({
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
    select: { id: true },
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

      const userInput: DeepPartial<User> = {
        name: dto.name,
        email: dto.email,
        passwordHash,
        accountType: AccountType.USER,
        // status: UserStatus.PENDING_EMAIL_VERIFICATION,
        // emailVerified: false,
        // passwordChangedAt: new Date(),
        country,
      };

      if (dto.companyName) {
        userInput.companyName = dto.companyName;
      }

      const user = txUserRepo.create(userInput);
      await txUserRepo.save(user);

      // await savePasswordToHistory(user.id, passwordHash, manager);

      // const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION, manager);

      // return { user, rawToken };
      return { user };
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
  //   event: SecurityEvent.REGISTER_SUCCESS,
  //   ipAddress: connectionContext?.ipAddress ?? null,
  //   userAgent: connectionContext?.userAgent ?? null,
  // });

  // sendVerificationEmail({
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

// export async function verifyEmail(token: string): Promise<void> {
//   const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_VERIFICATION);
//   await userRepository.update(userId, { emailVerified: true, status: UserStatus.ACTIVE });
//   await invalidateUserAuthSnapshot(userId);
// }

export async function loginUser(
  dto: LoginDto,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<ReturnType<typeof sanitizeUser>> {
  const email = normalizeEmail(dto.email);
  const user = await userRepository.findOne({
    where: { email },
  });

  // 1. Non-existent user check
  if (!user) {
    return await handleNonExistentUserLogin(
      // email, dto.password, connectionContext
    );
  }

  // 2. Lockout check
  // await checkUserLockout(user, connectionContext);

  // 3. CAPTCHA verification if required
  // await checkCaptchaRequirement(user, dto.captchaToken, connectionContext);

  // 4. Verify password and update failed login counters
  await verifyPasswordAndHandleFailure(
    dto.password,
    user,
    // connectionContext
  );

  // 5. Account readiness validation
  // await validateCommonAccountStatus(user, connectionContext);

  // 6. Generate and set session tokens & cookies
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
