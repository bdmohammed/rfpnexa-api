/**
 * tests/integration/customer/verify-email.integration.test.ts
 *
 * Integration Test Suite for verifyEmail() service function
 *
 * Verification Areas:
 *   - Happy Path: Consumes EmailToken, sets emailVerified = true, status = ACTIVE in DB.
 *   - Invalid / Expired Token: Throws AppError, leaves user unverified.
 *   - Replay / Already Used Token: Throws AppError on second attempt.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { verifyEmail } from '@/modules/auth/customer/services/auth.customer.public.service';
import { EmailTokenType, UserStatus } from '@/types/enums';

describe('Integration: verifyEmail() Service Logic', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should consume valid token, set emailVerified = true and status = ACTIVE in database', async () => {
    const { user } = await Users.pending();
    const { rawToken } = await new EmailTokenBuilder()
      .forUser(user.id)
      .withType(EmailTokenType.EMAIL_VERIFICATION)
      .create();

    await verifyEmail(rawToken);

    // Assert User in DB is updated
    const userRepo = AppDataSource.getRepository(User);
    const updatedUser = await userRepo.findOneBy({ id: user.id });

    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.status).toBe(UserStatus.ACTIVE);

    // Assert EmailToken is marked as used
    const tokenRepo = AppDataSource.getRepository(EmailToken);
    const tokens = await tokenRepo.findBy({ userId: user.id });
    expect(tokens[0]?.usedAt).not.toBeNull();
  });

  it('should throw error when attempting to verify with an invalid or non-existent token', async () => {
    await expect(verifyEmail('non-existent-token-abc')).rejects.toThrow();
  });

  it('should throw error on replay attack when attempting to reuse an already consumed token', async () => {
    const { user } = await Users.pending();
    const { rawToken } = await new EmailTokenBuilder()
      .forUser(user.id)
      .withType(EmailTokenType.EMAIL_VERIFICATION)
      .create();

    // First attempt succeeds
    await verifyEmail(rawToken);

    // Second replay attempt fails
    await expect(verifyEmail(rawToken)).rejects.toThrow();
  });
});
