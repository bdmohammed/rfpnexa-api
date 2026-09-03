import { logSecurityEvent } from '../../security/auth.securityLog.service';

import type { EntityManager } from 'typeorm';
import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { Permission } from '@/entities/Permission';
import { Role } from '@/entities/Role';
import { RoleVersion } from '@/entities/RoleVersion';
import { RoleVersionPermission } from '@/entities/RoleVersionPermission';
import { User } from '@/entities/User';
import { UserRole } from '@/entities/UserRole';
import { invalidateUserAuthSnapshot } from '@/middleware/authenticate';
import { CacheService } from '@/services/cache.service';
import { sendAdminApprovalStatusEmail } from '@/services/email.service';
import { getValidTokenDetails, verifyAndConsumeToken } from '@/services/token.service';
import {
  EmailTokenType,
  RoleStatus,
  RoleVersionStatus,
  SecurityEvent,
  UserStatus,
} from '@/types/enums';

const userRoleRepository = AppDataSource.getRepository(UserRole);

export interface BootstrapApprovalResult {
  userId: string;
  email: string;
  name: string;
  approved: boolean;
}

export async function verifyBootstrapToken(
  token: string,
): Promise<{ name: string; email: string }> {
  // Check if a Super Admin already exists in the system
  const superAdminCount = await userRoleRepository.count({
    where: {
      role: { key: 'super-admin' },
    },
    relations: {
      role: true,
    },
  });

  if (superAdminCount > 0) {
    throw new AppError(
      AppErrorMessage.BOOTSTRAP_DISABLED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.BOOTSTRAP_DISABLED,
    );
  }

  // Get token details without consuming
  const { user } = await getValidTokenDetails(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  return {
    name: user.name,
    email: user.email,
  };
}

/**
 * Ensures the 'super-admin' Role row exists inside the transaction under pessimistic lock.
 */
async function ensureSuperAdminRole(user: User, manager: EntityManager): Promise<Role> {
  const roleRepo = manager.getRepository(Role);
  let role = await roleRepo.findOne({
    where: { key: 'super-admin' },
    lock: { mode: 'pessimistic_write' },
  });

  if (!role) {
    role = roleRepo.create({
      key: 'super-admin',
      isSystemRole: true,
      status: RoleStatus.ACTIVE,
      createdBy: user.id,
      updatedBy: user.id,
    });
    await roleRepo.save(role);
  }
  return role;
}

/**
 * Ensures version 1 of the 'super-admin' Role exists and is active.
 */
async function ensureSuperAdminVersion(
  user: User,
  role: Role,
  manager: EntityManager,
): Promise<RoleVersion> {
  const roleVersionRepo = manager.getRepository(RoleVersion);
  let version = await roleVersionRepo.findOne({
    where: { roleId: role.id, version: 1 },
  });

  if (!version) {
    version = roleVersionRepo.create({
      roleId: role.id,
      version: 1,
      name: 'Super Admin',
      description: 'System Super Administrator. Has all system permissions by default.',
      status: RoleVersionStatus.APPROVED,
      createdByUserId: user.id,
      approvedByUserId: user.id,
      approvedAt: new Date(),
    });
    await roleVersionRepo.save(version);
  }

  if (role.activeVersionId !== version.id) {
    role.activeVersionId = version.id;
    await manager.getRepository(Role).save(role);
  }

  return version;
}

/**
 * Populates RoleVersionPermission entries for Super Admin with minimal column selection.
 */
async function ensureSuperAdminPermissions(
  version: RoleVersion,
  manager: EntityManager,
): Promise<void> {
  const roleVersionPermRepo = manager.getRepository(RoleVersionPermission);
  const existingCount = await roleVersionPermRepo.count({
    where: { roleVersionId: version.id },
  });

  if (existingCount === 0) {
    const permRepo = manager.getRepository(Permission);
    const allPermissions = await permRepo.find({
      relations: { module: true },
      select: {
        key: true,
        name: true,
        module: {
          key: true,
          name: true,
        },
      },
    });

    const roleVersionPerms = allPermissions.map((p) =>
      roleVersionPermRepo.create({
        roleVersionId: version.id,
        permissionKey: p.key,
        permissionName: p.name,
        moduleSlug: p.module.key,
        moduleName: p.module.name,
      }),
    );

    if (roleVersionPerms.length > 0) {
      await roleVersionPermRepo.save(roleVersionPerms);
    }
  }
}

/**
 * Assigns Super Admin role to user inside transaction if not already assigned.
 */
async function assignSuperAdminRole(user: User, role: Role, manager: EntityManager): Promise<void> {
  const userRoleRepo = manager.getRepository(UserRole);
  const existingAssignment = await userRoleRepo.findOne({
    where: { userId: user.id, roleId: role.id },
  });

  if (!existingAssignment) {
    const assignment = userRoleRepo.create({
      userId: user.id,
      roleId: role.id,
      assignedBy: user,
      assignedAt: new Date(),
    });
    await userRoleRepo.save(assignment);
  }
}

/**
 * Unified transactional handler for processing admin bootstrap approval or rejection.
 */
export async function processBootstrapApproval(
  token: string,
  action: 'approve' | 'reject',
  defaultReason?: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<BootstrapApprovalResult> {
  let userId = '';
  let userEmail = '';
  let userName = '';

  await AppDataSource.transaction(async (manager) => {
    // 1. Verify and consume SYSTEM_OWNER_APPROVAL token inside transaction
    userId = await verifyAndConsumeToken(token, EmailTokenType.SYSTEM_OWNER_APPROVAL, manager);

    // 2. Lock target user record for write update
    const userRepo = manager.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!user) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.USER_NOT_FOUND,
      );
    }

    userEmail = user.email;
    userName = user.name;

    if (action === 'approve') {
      // 3. Ensure role exists under pessimistic lock and verify existing super-admin assignments
      const superAdminRole = await ensureSuperAdminRole(user, manager);

      const existingAssignmentCount = await manager.getRepository(UserRole).count({
        where: { roleId: superAdminRole.id },
      });

      if (existingAssignmentCount > 0) {
        throw new AppError(
          AppErrorMessage.BOOTSTRAP_DISABLED,
          HttpStatusCode.CONFLICT,
          AppErrorCode.BOOTSTRAP_DISABLED,
        );
      }

      await userRepo.update(user.id, { status: UserStatus.ACTIVE });
      const superAdminVersion = await ensureSuperAdminVersion(user, superAdminRole, manager);
      await ensureSuperAdminPermissions(superAdminVersion, manager);
      await assignSuperAdminRole(user, superAdminRole, manager);
    } else {
      await userRepo.update(user.id, { status: UserStatus.REJECTED });
    }
  });

  // Post-commit cache invalidation
  invalidateUserAuthSnapshot(userId).catch(() => {});
  CacheService.del(`user:${userId}:profile`).catch(() => {});
  CacheService.del('roles:all').catch(() => {});

  // Best-effort background email notification
  void sendAdminApprovalStatusEmail({
    to: userEmail,
    name: userName,
    status: action === 'approve' ? 'approved' : 'rejected',
    ...(action === 'reject' && {
      reason: defaultReason ?? 'Rejected by System Owner during bootstrap setup',
    }),
  }).catch((err) => {
    logger.error({ err, userId, userEmail }, 'Failed to send admin approval status email');
  });

  // Best-effort background security audit log delivery
  void logSecurityEvent({
    userId,
    email: userEmail,
    event:
      action === 'approve'
        ? SecurityEvent.ADMIN_BOOTSTRAP_APPROVED
        : SecurityEvent.ADMIN_BOOTSTRAP_REJECTED,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { action, email: userEmail, name: userName },
  }).catch((err) => {
    logger.error({ err, userId }, 'Failed to log admin bootstrap security audit event');
  });

  return {
    userId,
    email: userEmail,
    name: userName,
    approved: action === 'approve',
  };
}

export async function approveBootstrapAdmin(
  token: string,
  action: 'approve' | 'reject' = 'approve',
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  await processBootstrapApproval(token, action, undefined, connectionContext);
}

export async function ownerReview(
  token: string,
  action: 'approve' | 'reject',
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  await processBootstrapApproval(token, action, 'Rejected by System Owner', connectionContext);
}
