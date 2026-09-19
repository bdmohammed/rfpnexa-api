import slugify from 'slugify';
import { In, Not } from 'typeorm';

// import { Permission } from '../../database/entities/Permission';
// import { PermissionModule } from '../../database/entities/PermissionModule';
// import { Role } from '../../database/entities/Role';
// // import { RoleReviewAssignment } from '../../database/entities/RoleReviewAssignment';
// // import { RoleReviewComment } from '../../database/entities/RoleReviewComment';
// // import { RoleVersion } from '../../database/entities/RoleVersion';
// // import { RoleVersionPermission } from '../../database/entities/RoleVersionPermission';
// import { User } from '../../database/entities/User';
// import { UserRole } from '../../database/entities/UserRole';
// import { assignUserRoles, revokeUserRole } from '../admin/admin.service';
import { AppDataSource } from '@/config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { Permission } from '@/entities/Permission';
import { PermissionModule } from '@/entities/PermissionModule';
import { Role } from '@/entities/Role';
import { RolePermission } from '@/entities/RolePermission';
import { User } from '@/entities/User';
import { UserRole } from '@/entities/UserRole';
import { RoleStatus } from '@/types/enums';
// import type {
//   CompareVersionsResult,
//   CreateRoleResult,
//   ExportRoleData,
//   RoleDetails,
//   RoleStatsResult,
//   UpdateRoleResult,
// } from './rbac.dto';
// import { AppDataSource } from '@/config/database';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// // import { RoleReview } from '@/entities/RoleReview';
// import {
//   AccountType,
//   ReviewAction,
//   ReviewAssignmentStatus,
//   ReviewStatus,
//   RoleStatus,
//   RoleVersionStatus,
//   UserStatus,
// } from '@/types/enums';

export class RbacService {
  private static readonly roleRepo = AppDataSource.getRepository(Role);
  // private static readonly assignmentRepo = AppDataSource.getRepository(RoleReviewAssignment);
  // private static readonly rolePermRepo = AppDataSource.getRepository(RolePermission);
  private static readonly permRepo = AppDataSource.getRepository(Permission);
  private static readonly moduleRepo = AppDataSource.getRepository(PermissionModule);
  private static readonly userRoleRepo = AppDataSource.getRepository(UserRole);
  private static readonly userRepo = AppDataSource.getRepository(User);

  /**
   * Get all active and disabled roles with resolved permissions and active user count.
   */
  public static async getRoles(includeDeleted = false) {
    const roles = await this.roleRepo.find({
      where: includeDeleted ? {} : { status: Not(RoleStatus.ARCHIVED) },
      relations: {
        rolePermissions: {
          permission: true,
        },
        createdByUser: true,
        userRoles: true,
      },
      order: { createdAt: 'ASC' },
    });

    return roles.map((r) => {
      const permissions = r.rolePermissions.map((rp) => rp.permission.key).filter(Boolean);

      const activeUsers = r.userRoles.filter((ur) => ur.status === RoleStatus.ACTIVE);

      return {
        id: r.id,
        key: r.key,
        name: r.key,
        slug: r.key ? slugify(r.key, { lower: true, strict: true }) : '',
        status: r.status,
        isSystemRole: r.isSystemRole,
        permissions,
        permissionKeys: permissions,
        userCount: activeUsers.length,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        createdBy: r.createdBy,
        createdByUser: {
          id: r.createdByUser.id,
          name: r.createdByUser.name,
          email: r.createdByUser.email,
        },
      };
    });
  }

  /**
   * Get role by ID with its resolved permissions.
   */
  public static async getRoleById(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: {
        rolePermissions: {
          permission: true,
        },
        createdByUser: true,
        userRoles: true,
      },
    });

    if (!role) {
      throw new AppError(
        AppErrorMessage.ROLE_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.ROLE_NOT_FOUND,
      );
    }

    const permissions = role.rolePermissions.map((rp) => rp.permission.key).filter(Boolean);

    const activeUsers = role.userRoles.filter((ur) => ur.status === RoleStatus.ACTIVE);

    return {
      id: role.id,
      key: role.key,
      name: role.key,
      slug: role.key ? slugify(role.key, { lower: true, strict: true }) : '',
      status: role.status,
      isSystemRole: role.isSystemRole,
      permissions,
      permissionKeys: permissions,
      userCount: activeUsers.length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      createdBy: role.createdBy,
      createdByUser: {
        id: role.createdByUser.id,
        name: role.createdByUser.name,
        email: role.createdByUser.email,
      },
    };
  }

  /**
   * Create a new role and associate its chosen permissions.
   */
  public static async createRole(
    name: string,
    permissionKeys: string[],
    status: RoleStatus = RoleStatus.ACTIVE,
    userId: string,
  ) {
    const key = name.trim();

    if (!key) {
      throw new AppError(
        AppErrorMessage.ROLE_NAME_REQUIRED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }

    const existing = await this.roleRepo.findOne({
      where: { key },
    });

    if (existing) {
      throw new AppError(
        `A role with the name "${key}" already exists.`,
        HttpStatusCode.CONFLICT,
        AppErrorCode.ALREADY_EXISTS,
      );
    }

    const permissions =
      permissionKeys.length > 0
        ? await this.permRepo.find({
            where: {
              key: In(permissionKeys),
            },
          })
        : [];

    const savedRole = await AppDataSource.transaction(async (manager) => {
      const role = manager.create(Role, {
        key,
        status,
        isSystemRole: false,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(Role, role);

      if (permissions.length > 0) {
        const rolePermissions = permissions.map((permission) =>
          manager.create(RolePermission, {
            roleId: saved.id,
            permissionId: permission.id,
          }),
        );

        await manager.save(RolePermission, rolePermissions);
      }

      return saved;
    });

    return this.getRoleById(savedRole.id);
  }

  /**
   * Update an existing role and its permissions.
   */
  public static async updateRole(
    id: string,
    name?: string,
    // description?: string | null,
    permissionKeys?: string[],
    status?: RoleStatus,
    userId: string = '',
  ) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new AppError(
        AppErrorMessage.ROLE_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.ROLE_NOT_FOUND,
      );
    }

    return AppDataSource.transaction(async (manager) => {
      if (name && name.trim() !== role.key) {
        const newKey = name.trim();
        const existing = await manager.findOne(Role, { where: { key: newKey } });
        if (existing && existing.id !== id) {
          throw new AppError(
            `A role with the name "${newKey}" already exists.`,
            HttpStatusCode.CONFLICT,
            AppErrorCode.ALREADY_EXISTS,
          );
        }
        role.key = newKey;
      }

      if (status) {
        role.status = status;
      }

      role.updatedBy = userId;
      await manager.save(role);

      if (permissionKeys !== undefined) {
        await manager.delete(RolePermission, { roleId: id });
        if (permissionKeys.length > 0) {
          const perms = await this.permRepo.find({ where: { key: In(permissionKeys) } });
          const rolePermissions = perms.map((p) =>
            manager.create(RolePermission, {
              roleId: id,
              permissionId: p.id,
            }),
          );
          await manager.save(RolePermission, rolePermissions);
        }
      }

      return this.getRoleById(id);
    });
  }

  /**
   * Delete a role. System roles MUST NOT be deleted.
   */
  public static async deleteRole(id: string, _userId?: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new AppError(
        AppErrorMessage.ROLE_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.ROLE_NOT_FOUND,
      );
    }

    // Enforce system role protection on backend
    if (role.isSystemRole) {
      throw new AppError(
        'System roles cannot be deleted',
        HttpStatusCode.FORBIDDEN,
        AppErrorCode.SYSTEM_ROLE_PROTECTED,
      );
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.delete(RolePermission, { roleId: id });
      await manager.delete(UserRole, { roleId: id });
      await manager.delete(Role, { id });
    });
  }

  /**
   * Get all active permissions for role-permission assignment.
   */
  public static async getPermissions() {
    return this.permRepo.find({
      where: { isActive: true },
      relations: { module: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get permission modules.
   */
  public static async getModules() {
    return this.moduleRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get all admin role assignments.
   */
  public static async getAssignments() {
    return this.userRoleRepo.find({
      relations: {
        user: true,
        role: true,
        assignedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Assign a role to an admin user.
   */
  public static async assignRole(
    userId: string,
    roleId: string,
    assignedByUserId: string,
    status: RoleStatus = RoleStatus.ACTIVE,
  ) {
    const [user, role] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.roleRepo.findOne({ where: { id: roleId } }),
    ]);

    if (!user) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.USER_NOT_FOUND,
      );
    }

    if (!role) {
      throw new AppError(
        AppErrorMessage.ROLE_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.ROLE_NOT_FOUND,
      );
    }

    const existing = await this.userRoleRepo.findOne({
      where: { userId, roleId },
    });

    if (existing) {
      existing.status = status;
      existing.assignedBy = { id: assignedByUserId } as unknown as User;
      existing.assignedAt = new Date();
      return this.userRoleRepo.save(existing);
    }

    const userRole = this.userRoleRepo.create({
      userId,
      roleId,
      assignedBy: { id: assignedByUserId } as unknown as User,
      status,
    });

    return this.userRoleRepo.save(userRole);
  }

  /**
   * Revoke role assignment by setting status to DISABLED (not hard deleting).
   */
  public static async revokeAssignment(id: string, _userId?: string): Promise<void> {
    const userRole = await this.userRoleRepo.findOne({ where: { id } });
    if (!userRole) {
      throw new AppError(
        'Role assignment not found',
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    userRole.status = RoleStatus.DISABLED;
    await this.userRoleRepo.save(userRole);
  }
}

//     if (assignment.status !== ReviewAssignmentStatus.PENDING) {
//       throw new AppError(
//         AppErrorMessage.REVIEW_ALREADY_SUBMITTED,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.ALREADY_REVIEWED,
//       );
//     }

//     if (status !== 'APPROVED' && (!commentText || commentText.trim() === '')) {
//       throw new AppError(
//         AppErrorMessage.COMMENT_REQUIRED,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.COMMENT_REQUIRED,
//       );
//     }

//     // Update assignment status
//     assignment.status = status as ReviewAssignmentStatus;
//     assignment.reviewedAt = new Date();

//     // eslint-disable-next-line sonarjs/cognitive-complexity
//     await AppDataSource.transaction(async (transactionManager) => {
//       await transactionManager.save(assignment);

//       // Save Comment log
//       const commentLog = new RoleReviewComment();
//       commentLog.reviewId = review.id;
//       commentLog.userId = userId;
//       commentLog.action = status as ReviewAction;
//       commentLog.comment = commentText;
//       await transactionManager.save(RoleReviewComment, commentLog);

//       // Check all reviewer assignments to make final decision
//       const allAssignments = await transactionManager.find(RoleReviewAssignment, {
//         where: { reviewId },
//       });

//       const totalReviewers = allAssignments.length;
//       const approvals = allAssignments.filter(
//         (a) => a.status === ReviewAssignmentStatus.APPROVED,
//       ).length;
//       const rejections = allAssignments.filter(
//         (a) => a.status === ReviewAssignmentStatus.REJECTED,
//       ).length;
//       const changesRequested = allAssignments.filter(
//         (a) => a.status === ReviewAssignmentStatus.CHANGES_REQUESTED,
//       ).length;

//       // Business Rules:
//       // - Reject: If any reviewer rejects.
//       // - Changes Requested: If changes requested.
//       // - Approve: If everyone approves (or minimum reviewers met, here we enforce consensus).
//       if (rejections > 0) {
//         review.status = ReviewStatus.REJECTED;
//         review.completedAt = new Date();
//         review.roleVersion.status = RoleVersionStatus.REJECTED;
//         await transactionManager.save(review);
//         await transactionManager.save(review.roleVersion);

//         rbacEventEmitter.emit('RoleRejected', {
//           roleId: review.roleId,
//           roleName: review.roleVersion.name,
//           version: review.roleVersion.version,
//           userId,
//           after: { comment: commentText },
//         });
//       } else if (changesRequested > 0) {
//         review.status = ReviewStatus.REJECTED; // Or custom CHANGES_REQUESTED status
//         review.completedAt = new Date();
//         review.roleVersion.status = RoleVersionStatus.REOPENED;
//         await transactionManager.save(review);
//         await transactionManager.save(review.roleVersion);

//         rbacEventEmitter.emit('RoleReopened', {
//           roleId: review.roleId,
//           roleName: review.roleVersion.name,
//           version: review.roleVersion.version,
//           userId,
//         });
//       } else if (approvals === totalReviewers) {
//         // Enforce Consensus: All approved -> Activate Role Version!
//         review.status = ReviewStatus.APPROVED;
//         review.completedAt = new Date();
//         review.roleVersion.status = RoleVersionStatus.APPROVED;
//         review.roleVersion.approvedByUserId = userId;
//         review.roleVersion.approvedAt = new Date();
//         await transactionManager.save(review);
//         await transactionManager.save(review.roleVersion);

//         // Mark previous approved versions for this role as SUPERSEDED to maintain immutable audit trail
//         await transactionManager
//           .createQueryBuilder()
//           .update(RoleVersion)
//           .set({ status: RoleVersionStatus.SUPERSEDED })
//           .where('roleId = :roleId', { roleId: review.roleId })
//           .andWhere('id != :currentVersionId', { currentVersionId: review.roleVersionId })
//           .andWhere('status = :approvedStatus', { approvedStatus: RoleVersionStatus.APPROVED })
//           .execute();

//         // Update active version of Role
//         const { role } = review;
//         role.status = RoleStatus.ACTIVE;
//         role.activeVersionId = review.roleVersionId;
//         await transactionManager.save(role);

//         // Check if role replaces a previous role
//         const { description } = review.roleVersion;
//         const match = description.match(/\[ReplacesRole:\s*([0-9a-fA-F-]+)\]/);
//         if (match) {
//           const previousRoleId = match[1];
//           if (previousRoleId) {
//             const previousRole = await transactionManager.findOne(Role, {
//               where: { id: previousRoleId },
//             });
//             if (previousRole) {
//               previousRole.status = RoleStatus.DISABLED;
//               await transactionManager.save(previousRole);

//               // Migrate all users with that previous role to the new role
//               const userRoles = await transactionManager.find(UserRole, {
//                 where: { roleId: previousRoleId },
//               });
//               for (const ur of userRoles) {
//                 const alreadyHasNew = await transactionManager.findOne(UserRole, {
//                   where: { userId: ur.userId, roleId: role.id },
//                 });
//                 if (alreadyHasNew) {
//                   await transactionManager.remove(ur);
//                 } else {
//                   ur.roleId = role.id;
//                   await transactionManager.save(ur);
//                 }
//               }
//             }
//           }
//         }

//         rbacEventEmitter.emit('RoleApproved', {
//           roleId: review.roleId,
//           roleName: review.roleVersion.name,
//           version: review.roleVersion.version,
//           userId,
//         });
//       }
//     });
//   }

//   /**
//    * Compare two versions of a role.
//    */
//   public static async compareRoleVersions(
//     roleId: string,
//     v1Num: number,
//     v2Num: number,
//   ): Promise<CompareVersionsResult> {
//     const ver1 = await this.versionRepo.findOne({
//       where: { roleId, version: v1Num },
//       relations: {
//         roleVersionPermissions: true,
//       },
//     });

//     const ver2 = await this.versionRepo.findOne({
//       where: { roleId, version: v2Num },
//       relations: {
//         roleVersionPermissions: true,
//       },
//     });

//     if (!ver1 || !ver2) {
//       throw new AppError(
//         AppErrorMessage.VERSIONS_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     const keys1 = ver1.roleVersionPermissions.map((p) => p.permissionKey);
//     const keys2 = ver2.roleVersionPermissions.map((p) => p.permissionKey);

//     const added = keys2.filter((k) => !keys1.includes(k));
//     const removed = keys1.filter((k) => !keys2.includes(k));
//     const unchanged = keys1.filter((k) => keys2.includes(k));

//     return {
//       v1: {
//         version: ver1.version,
//         name: ver1.name,
//         description: ver1.description,
//         status: ver1.status,
//       },
//       v2: {
//         version: ver2.version,
//         name: ver2.name,
//         description: ver2.description,
//         status: ver2.status,
//       },
//       diff: {
//         added,
//         removed,
//         unchanged,
//       },
//     };
//   }

//   /**
//    * Get role counts, distribution and pending workflow metrics.
//    */
//   public static async getRoleStats(): Promise<RoleStatsResult> {
//     const totalRoles = await this.roleRepo.count();
//     const activeRoles = await this.roleRepo.count({ where: { status: RoleStatus.ACTIVE } });
//     const pendingReviews = await this.reviewRepo.count({ where: { status: ReviewStatus.PENDING } });

//     // Distribution count by modules
//     const permissions = await this.rvpRepo
//       .createQueryBuilder('p')
//       .select('p.moduleName', 'module')
//       .addSelect('COUNT(DISTINCT p.permissionKey)', 'count')
//       .groupBy('p.moduleName')
//       .getRawMany();

//     return {
//       totalRoles,
//       activeRoles,
//       pendingReviews,
//       moduleDistribution: permissions,
//     };
//   }

//   /**
//    * Get audit trails for exports.
//    */
//   public static async getExportData(): Promise<ExportRoleData[]> {
//     const roles = await this.roleRepo.find({
//       relations: {
//         activeVersion: {
//           roleVersionPermissions: true,
//         },
//       },
//     });
//     return roles.map((r) => ({
//       roleId: r.id,
//       slug: r.key,
//       status: r.status,
//       isSystemRole: r.isSystemRole,
//       name: r.activeVersion.name,
//       description: r.activeVersion.description,
//       version: r.activeVersion.version,
//       permissions: r.activeVersion.roleVersionPermissions.map((p) => p.permissionKey),
//     }));
//   }

//   /**
//    * Get all user role assignments.
//    */
//   public static async getAssignments(): Promise<UserRole[]> {
//     return this.userRoleRepo.find({
//       relations: {
//         user: true,
//         role: true,
//         assignedBy: true,
//         reviewer: true,
//       },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   /**
//    * Assign a role to a user.
//    */
//   public static async assignRole(
//     userId: string,
//     roleId: string,
//     expiresAt: string | null,
//     currentUserId: string,
//     extra?: {
//       effectiveAt?: string | null | undefined;
//       reason?: string | undefined;
//       comment?: string | undefined;
//       reviewerId?: string | undefined;
//       status?: string | undefined;
//     },
//   ): Promise<void> {
//     const role = await this.roleRepo.findOne({
//       where: { id: roleId },
//       relations: {
//         activeVersion: true,
//       },
//     });
//     if (!role)
//       throw new AppError(
//         AppErrorMessage.ROLE_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );

//     const existingAssignments = await this.userRoleRepo.find({
//       where: { userId },
//       relations: {
//         role: true,
//       },
//     });
//     const assignments = existingAssignments
//       .filter((ur) => ur.roleId !== roleId && ur.role.status === RoleStatus.ACTIVE)
//       .map((ur) => ({
//         roleId: ur.roleId,
//         expiresAt: ur.expiresAt ? ur.expiresAt.toISOString() : null,
//       }));

//     assignments.push({ roleId, expiresAt });

//     await assignUserRoles(userId, { assignments }, currentUserId);

//     // Update extra governance metadata on the created/updated UserRole record
//     const userRole = await this.userRoleRepo.findOne({ where: { userId, roleId } });
//     if (userRole) {
//       userRole.status = extra?.status ?? 'ACTIVE';
//       userRole.reason = extra?.reason ?? null;
//       userRole.comment = extra?.comment ?? null;
//       userRole.reviewerId = extra?.reviewerId ?? null;
//       userRole.effectiveAt = extra?.effectiveAt ? new Date(extra.effectiveAt) : null;
//       await this.userRoleRepo.save(userRole);
//     }

//     const resolvedName = role.isSystemRole ? 'Super Admin' : role.activeVersion.name;

//     rbacEventEmitter.emit('RoleAssigned', {
//       roleId,
//       roleName: resolvedName,
//       targetUserId: userId,
//       userId: currentUserId,
//     });
//   }

//   /**
//    * Update assignment governance status (Maker-Checker flow)
//    */
//   public static async updateAssignmentStatus(
//     assignmentId: string,
//     status: string,
//     comment?: string,
//     currentUserId?: string,
//   ): Promise<UserRole> {
//     const userRole = await this.userRoleRepo.findOne({
//       where: { id: assignmentId },
//       relations: {
//         user: true,
//         role: true,
//         reviewer: true,
//       },
//     });

//     if (!userRole) {
//       throw new AppError(
//         AppErrorMessage.ROLE_ASSIGNMENT_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if ((status === 'APPROVED' || status === 'ACTIVE') && userRole.status === 'DRAFT') {
//       throw new AppError(
//         'Draft role assignments must be submitted for review before approval.',
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.BAD_REQUEST,
//       );
//     }

//     userRole.status = status;
//     if (comment !== undefined) {
//       userRole.comment = comment;
//     }
//     if (currentUserId) {
//       userRole.reviewerId = currentUserId;
//     }

//     // When role assignment is approved, if the target user account is in
//     // pending_approval state, approve the user account as well
//     if (status === 'APPROVED' || status === 'ACTIVE') {
//       if (userRole.user.status === UserStatus.PENDING_APPROVAL) {
//         userRole.user.status = UserStatus.ACTIVE;
//         await this.userRepo.save(userRole.user);
//       }
//     }

//     return this.userRoleRepo.save(userRole);
//   }

//   /**
//    * Revoke a user role assignment.
//    */
//   public static async revokeAssignment(id: string, currentUserId: string): Promise<void> {
//     const userRole = await this.userRoleRepo.findOne({ where: { id } });
//     if (!userRole) {
//       throw new AppError(
//         AppErrorMessage.ROLE_ASSIGNMENT_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if (userRole.userId === currentUserId) {
//       throw new AppError(
//         'You cannot revoke your own role assignment.',
//         HttpStatusCode.FORBIDDEN,
//         AppErrorCode.FORBIDDEN,
//       );
//     }

//     await revokeUserRole(userRole.userId, userRole.roleId, currentUserId);
//   }

//   /**
//    * Get permissions grouped by module.
//    */
//   public static async getPermissionsGroupedByModule() {
//     // : Promise<GroupedPermissionModule[]>
//     const modules = await this.moduleRepo.find({ order: { displayOrder: 'ASC' } });
//     const permissions = await this.permRepo.find({
//       relations: {
//         module: true,
//       },
//     });

//     return modules.map((mod) => {
//       const modPerms = permissions.filter((p) => p.moduleId === mod.id);
//       return {
//         id: mod.id,
//         name: mod.name,
//         slug: mod.key,
//         permissions: modPerms.map((p) => ({
//           id: p.id,
//           key: p.key,
//           name: p.name,
//           action: p.action,
//           description: p.description,
//         })),
//       };
//     });
//   }

//   /**
//    * Get modules.
//    */
//   public static async getModules(): Promise<PermissionModule[]> {
//     return this.moduleRepo.find({ order: { displayOrder: 'ASC' } });
//   }

//   /**
//    * Auto-expire review requests older than 60 days.
//    */
//   public static async autoExpireReviews(): Promise<void> {
//     const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
//     const expiredReviews = await this.reviewRepo.find({
//       where: {
//         status: ReviewStatus.PENDING,
//         createdAt: Not(In([])), // TypeORM representation helper
//       },
//       relations: {
//         roleVersion: true,
//       },
//     });

//     for (const review of expiredReviews) {
//       if (review.createdAt < sixtyDaysAgo) {
//         review.status = ReviewStatus.REJECTED;
//         review.completedAt = new Date();
//         review.roleVersion.status = RoleVersionStatus.REJECTED;

//         // eslint-disable-next-line no-await-in-loop
//         await AppDataSource.transaction(async (transactionManager) => {
//           await transactionManager.save(review);
//           await transactionManager.save(review.roleVersion);

//           // Add timeline comment
//           const comment = new RoleReviewComment();
//           comment.reviewId = review.id;
//           comment.userId = null; // System action, user_id is null
//           comment.action = ReviewAction.AUTO_EXPIRE;
//           comment.comment = 'Review auto-expired and rejected after 60 days.';
//           await transactionManager.save(RoleReviewComment, comment);
//         });
//       }
//     }
//   }
// }
