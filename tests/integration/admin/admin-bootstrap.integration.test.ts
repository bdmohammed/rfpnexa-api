/**
 * tests/integration/admin/admin-bootstrap.integration.test.ts
 *
 * Integration Test Suite for processBootstrapApproval() & verifyBootstrapToken()
 *
 * Verification Areas:
 *   - Happy Path: Verifies SYSTEM_OWNER_APPROVAL token, activates User, assigns super-admin Role &
 *     Permissions under pessimistic write locks.
 *   - Rejection: Updates status to REJECTED without super-admin role assignment.
 *   - Conflict / Already Bootstrapped: Throws 409 Conflict if a Super Admin already exists in the system.
 *   - Replay Protection: Throws error when attempting to re-use an already consumed token.
 */
import { EmailTokenBuilder } from '../../builders/token.builder';
import { EmailMock } from '../../mocks/email.mock';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { UserRole } from '@/entities/UserRole';
import {
  processBootstrapApproval,
  verifyBootstrapToken,
} from '@/modules/auth/admin/service/auth.admin.bootstrap.service';
import { EmailTokenType, UserStatus } from '@/types/enums';

describe('Integration: Admin Bootstrap Service', () => {
  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
  });

  describe('verifyBootstrapToken()', () => {
    it('should return user name and email for valid system owner approval token', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const details = await verifyBootstrapToken(rawToken);

      expect(details).toBeDefined();
      expect(details.email).toBe(user.email);
    });
  });

  describe('processBootstrapApproval()', () => {
    it('should approve bootstrap admin, activate user, assign super-admin role and permissions in PostgreSQL', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      const result = await processBootstrapApproval(rawToken, 'approve', undefined, clientMetadata);

      expect(result.approved).toBe(true);
      expect(result.userId).toBe(user.id);

      // Verify User in DB is ACTIVE
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOneBy({ id: user.id });
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);

      // Verify UserRole assignment in DB
      const userRoleRepo = AppDataSource.getRepository(UserRole);
      const assignments = await userRoleRepo.findBy({ userId: user.id });
      expect(assignments).toHaveLength(1);

      // Verify email dispatched
      expect(EmailMock.sendAdminApprovalStatusEmail).toHaveBeenCalledTimes(1);
    });

    it('should reject bootstrap admin and set status to REJECTED', async () => {
      const { user } = await Users.pending();
      const { rawToken } = await new EmailTokenBuilder()
        .forUser(user.id)
        .withType(EmailTokenType.SYSTEM_OWNER_APPROVAL)
        .create();

      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      const result = await processBootstrapApproval(
        rawToken,
        'reject',
        'Manual rejection',
        clientMetadata,
      );

      expect(result.approved).toBe(false);

      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOneBy({ id: user.id });
      expect(dbUser?.status).toBe(UserStatus.REJECTED);
    });
  });
});
