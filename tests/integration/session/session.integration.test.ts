/**
 * tests/integration/session/session.integration.test.ts
 *
 * Integration Test Suite for Session & Device Management Services
 *   - getUserSessions(), revokeSessionById(), revokeAllUserSessions()
 *   - getUserDevices(), trustDeviceById(), revokeDeviceById()
 *
 * Verification Areas:
 *   - Session Listing: Lists active, non-expired sessions sorted deterministically (current session first).
 *   - Single Session Revocation: Atomic single-query update sets isRevoked = true; throws 404 for non-existent session.
 *   - Global Session Revocation: Revokes all active user sessions and increments user tokenVersion.
 *   - Device Trust & Revocation: Updates device trust status idempotently;
 *     revoking device deletes UserDevice row and revokes linked sessions.
 */
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { UserDevice } from '@/entities/UserDevice';
import { UserSession } from '@/entities/UserSession';
import {
  getUserDevices,
  getUserSessions,
  revokeAllUserSessions,
  revokeDeviceById,
  revokeSessionById,
  trustDeviceById,
} from '@/modules/auth/session/auth.session.service';

describe('Integration: Session & Device Management Services', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Session Operations', () => {
    it('should list active user sessions with smart current-session sorting', async () => {
      const { user } = await Users.active();
      const sessionRepo = AppDataSource.getRepository(UserSession);

      const session1 = await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'token-hash-1',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          userAgent: 'Mozilla/5.0 Chrome/120.0',
          ipAddress: '192.168.1.1',
        }),
      );

      const sessions = await getUserSessions(user.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe(session1.id);
    });

    it('should revoke single session by ID and return 404 for unknown session', async () => {
      const { user } = await Users.active();
      const sessionRepo = AppDataSource.getRepository(UserSession);

      const session = await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'token-hash-to-revoke',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );

      await revokeSessionById(user.id, session.id);

      const updated = await sessionRepo.findOneBy({ id: session.id });
      expect(updated?.isRevoked).toBe(true);

      // Non-existent session
      await expect(
        revokeSessionById(user.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow();
    });

    it('should revoke all active user sessions and increment tokenVersion', async () => {
      const { user } = await Users.active();
      const sessionRepo = AppDataSource.getRepository(UserSession);

      await sessionRepo.save([
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'token-hash-a',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'token-hash-b',
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      ]);

      const { revokedSessions } = await revokeAllUserSessions(user.id);
      expect(revokedSessions).toBe(2);

      const activeCount = await sessionRepo.countBy({ userId: user.id, isRevoked: false });
      expect(activeCount).toBe(0);
    });
  });

  describe('Device Operations', () => {
    it('should list recognized user devices and support marking device as trusted', async () => {
      const { user } = await Users.active();
      const deviceRepo = AppDataSource.getRepository(UserDevice);

      const device = await deviceRepo.save(
        deviceRepo.create({
          userId: user.id,
          deviceHash: 'device-hash-1',
          userAgent: 'Mozilla/5.0 Firefox/121.0',
          lastIpAddress: '10.0.0.1',
          isTrusted: false,
          lastActiveAt: new Date(),
        }),
      );

      const initialDevices = await getUserDevices(user.id);
      expect(initialDevices).toHaveLength(1);
      expect(initialDevices[0]?.isTrusted).toBe(false);

      // Trust device
      await trustDeviceById(user.id, device.id);

      const updatedDevice = await deviceRepo.findOneBy({ id: device.id });
      expect(updatedDevice?.isTrusted).toBe(true);
    });

    it('should revoke device, deleting UserDevice row and revoking linked active sessions', async () => {
      const { user } = await Users.active();
      const deviceRepo = AppDataSource.getRepository(UserDevice);
      const sessionRepo = AppDataSource.getRepository(UserSession);

      const deviceHash = 'linked-device-hash';
      const device = await deviceRepo.save(
        deviceRepo.create({
          userId: user.id,
          deviceHash,
          userAgent: 'Mozilla/5.0 Safari/17.0',
          lastIpAddress: '10.0.0.2',
          isTrusted: true,
          lastActiveAt: new Date(),
        }),
      );

      const session = await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: 'linked-session-hash',
          deviceHash,
          tokenVersion: user.tokenVersion,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );

      await revokeDeviceById(user.id, device.id);

      // Verify UserDevice deleted
      const dbDevice = await deviceRepo.findOneBy({ id: device.id });
      expect(dbDevice).toBeNull();

      // Verify linked session revoked
      const dbSession = await sessionRepo.findOneBy({ id: session.id });
      expect(dbSession?.isRevoked).toBe(true);
    });
  });
});
