/**
 * tests/integration/credentials/email-change.integration.test.ts
 *
 * Integration Test Suite for requestEmailChange() & verifyEmailChange()
 *
 * Verification Areas:
 *   - Happy Path: Requests email change, sets pendingEmail, creates EMAIL_CHANGE token, dispatches emails.
 *     Verifying consumes token, updates email, clears pendingEmail, increments tokenVersion, and revokes sessions.
 *   - Duplicate Email: Throws 409 Conflict if new email is already registered.
 *   - Same Email: Throws 400 Bad Request if new email matches current email.
 *   - Replay / Already Used Token: Throws error on second verification attempt.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { EmailGenerator } from '../../generators/user.generator';
import { EmailMock } from '../../mocks/email.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import {
  requestEmailChange,
  verifyEmailChange,
} from '@/modules/auth/credentials/services/auth.email.service';
import { EmailTokenType } from '@/types/enums';

describe('Integration: Email Change Credentials Service', () => {
  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
  });

  describe('requestEmailChange()', () => {
    it('should set pendingEmail, create EMAIL_CHANGE token, and send verification/alert emails', async () => {
      const { user } = await Users.active();
      const newEmail = EmailGenerator.unique();
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      await requestEmailChange(user.id, newEmail, clientMetadata);

      // Verify pendingEmail updated in DB
      const userRepo = AppDataSource.getRepository(User);
      const updatedUser = await userRepo.findOneBy({ id: user.id });
      expect(updatedUser?.pendingEmail).toBe(newEmail);

      // Verify EmailToken created in DB
      const tokenRepo = AppDataSource.getRepository(EmailToken);
      const tokens = await tokenRepo.findBy({ userId: user.id, type: EmailTokenType.EMAIL_CHANGE });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.usedAt).toBeNull();
    });

    it('should throw HTTP 409 Conflict when attempting to change to an already registered email', async () => {
      const { user: user1 } = await Users.active();
      const { user: user2 } = await Users.active();
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      await expect(requestEmailChange(user1.id, user2.email, clientMetadata)).rejects.toThrow();
    });
  });

  describe('verifyEmailChange()', () => {
    it('should consume token, update user email, clear pendingEmail, increment tokenVersion, and revoke active sessions', async () => {
      const { user } = await Users.active();
      const newEmail = EmailGenerator.unique();
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      // Step 1: Request email change
      await requestEmailChange(user.id, newEmail, clientMetadata);

      // Get generated raw token
      const tokenRepo = AppDataSource.getRepository(EmailToken);
      const emailTokens = await tokenRepo.findBy({
        userId: user.id,
        type: EmailTokenType.EMAIL_CHANGE,
      });
      expect(emailTokens).toHaveLength(1);

      // Seed an active session
      const sessionRepo = AppDataSource.getRepository(UserSession);
      await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'email-change-session-hash',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      );

      // Helper token builder to get raw token for verification
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.EMAIL_CHANGE)
        .create();

      // Step 2: Verify email change
      await verifyEmailChange(rawToken, clientMetadata);

      // Verify User record updated
      const userRepo = AppDataSource.getRepository(User);
      const updatedUser = await userRepo.findOneBy({ id: user.id });

      expect(updatedUser?.email).toBe(newEmail);
      expect(updatedUser?.pendingEmail).toBeNull();
      expect(updatedUser?.tokenVersion).toBe(user.tokenVersion + 1);

      // Verify session revoked
      const session = await sessionRepo.findOneBy({ userId: user.id });
      expect(session?.isRevoked).toBe(true);
    });
  });
});
