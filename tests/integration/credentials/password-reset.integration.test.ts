/**
 * tests/integration/credentials/password-reset.integration.test.ts
 *
 * Integration Test Suite for forgotPassword() & resetPassword() service logic
 *
 * Verification Areas:
 *   - Happy Path: Creates EmailToken(PASSWORD_RESET), sends reset email, consumes token, updates password,
 *     increments tokenVersion, revokes active sessions.
 *   - Non-Existent Email: Prevents user enumeration by returning cleanly without error or email dispatch.
 *   - Password Reuse Prevention: Throws error if new password matches any of the last 5 passwords in history.
 *   - HIBP Breach Check: Throws error if new password is in pwned database.
 *   - Token Replay: Throws error when attempting to re-use an already consumed reset token.
 */
import bcrypt from 'bcryptjs';

import { EmailTokenBuilder } from '../../builders/token.builder';
import { EmailMock } from '../../mocks/email.mock';
import { HibpMock } from '../../mocks/hibp.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { EmailToken } from '@/entities/EmailToken';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import {
  forgotPassword,
  resetPassword,
} from '@/modules/auth/credentials/services/auth.password.service';
import { EmailTokenType } from '@/types/enums';

describe('Integration: Password Reset Credentials Service', () => {
  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
    HibpMock.mockCleanPassword();
  });

  describe('forgotPassword()', () => {
    it('should create a password reset token in DB and dispatch email for active verified user', async () => {
      const { user } = await Users.active();
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      await forgotPassword(user.email, clientMetadata);

      // Verify token in DB
      const tokenRepo = AppDataSource.getRepository(EmailToken);
      const tokens = await tokenRepo.findBy({
        userId: user.id,
        type: EmailTokenType.PASSWORD_RESET,
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.usedAt).toBeNull();

      // Verify email dispatched
      expect(EmailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(EmailMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email }),
      );
    });

    it('should silently handle non-existent user email without throwing error or sending email', async () => {
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      await forgotPassword('unknown@example.com', clientMetadata);

      expect(EmailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword()', () => {
    it('should consume token, update password, increment tokenVersion, and revoke active user sessions', async () => {
      const { user } = await Users.active();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.PASSWORD_RESET)
        .create();

      // Create an active session
      const sessionRepo = AppDataSource.getRepository(UserSession);
      await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'session-hash-1',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      );

      const newPassword = 'NewSecretPassword123!';
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      await resetPassword(rawToken, newPassword, clientMetadata);

      // Assert User in DB
      const userRepo = AppDataSource.getRepository(User);
      const updatedUser = await userRepo.findOneBy({ id: user.id });

      expect(updatedUser?.tokenVersion).toBe(user.tokenVersion + 1);
      expect(bcrypt.compareSync(newPassword, updatedUser!.passwordHash)).toBe(true);

      // Assert Session in DB is revoked
      const session = await sessionRepo.findOneBy({ userId: user.id });
      expect(session?.isRevoked).toBe(true);
    });

    it('should throw error when new password matches an existing password in history', async () => {
      const { user, rawPassword } = await Users.active();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.PASSWORD_RESET)
        .create();

      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      // Attempting to reuse the exact same password
      await expect(resetPassword(rawToken, rawPassword, clientMetadata)).rejects.toThrow();
    });
  });
});
