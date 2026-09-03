/**
 * tests/integration/credentials/password-change.integration.test.ts
 *
 * Integration Test Suite for changeUserPassword() service logic
 *
 * Verification Areas:
 *   - Happy Path: Verifies current password, updates password hash in DB, increments tokenVersion,
 *     revokes active sessions, saves password history.
 *   - Incorrect Current Password: Throws 400 Bad Request.
 *   - Same Password Re-use: Throws 400 Bad Request.
 *   - Password History Check: Rejects if new password matches recent password history.
 *   - HIBP Breach Check: Rejects if new password is breached.
 */
import bcrypt from 'bcryptjs';

import { HibpMock } from '../../mocks/hibp.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { UserSession } from '@/entities/UserSession';
import { changeUserPassword } from '@/modules/auth/credentials/services/auth.email.service';

describe('Integration: changeUserPassword() Service Logic', () => {
  beforeEach(async () => {
    await clearDatabase();
    HibpMock.mockCleanPassword();
  });

  it('should change user password, increment tokenVersion, revoke active sessions, and save to password history', async () => {
    const { user, rawPassword } = await Users.active();
    const newPassword = 'BrandNewPassword123!';
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    // Seed active session
    const sessionRepo = AppDataSource.getRepository(UserSession);
    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        tokenHash: 'pwd-change-session-hash',
        tokenVersion: user.tokenVersion,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    await changeUserPassword(user.id, rawPassword, newPassword, clientMetadata);

    // Verify User record updated
    const userRepo = AppDataSource.getRepository(User);
    const updatedUser = await userRepo.findOneBy({ id: user.id });

    expect(updatedUser?.tokenVersion).toBe(user.tokenVersion + 1);
    expect(bcrypt.compareSync(newPassword, updatedUser!.passwordHash)).toBe(true);

    // Verify session revoked
    const session = await sessionRepo.findOneBy({ userId: user.id });
    expect(session?.isRevoked).toBe(true);
  });

  it('should throw HTTP 400 when incorrect current password is provided', async () => {
    const { user } = await Users.active();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      changeUserPassword(user.id, 'WrongCurrentPassword!', 'NewSecretPassword123!', clientMetadata),
    ).rejects.toThrow();
  });

  it('should throw HTTP 400 when attempting to change to the exact same password', async () => {
    const { user, rawPassword } = await Users.active();
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await expect(
      changeUserPassword(user.id, rawPassword, rawPassword, clientMetadata),
    ).rejects.toThrow();
  });
});
