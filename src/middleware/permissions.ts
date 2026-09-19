import slugify from 'slugify';

// import { In } from 'typeorm';
import type { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '@/config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { SUPER_ADMIN } from '@/core/constants';
import { Permission } from '@/entities/Permission';
// import { RoleVersionPermission } from '@/entities/RoleVersionPermission';
import { UserRole } from '@/entities/UserRole';
import { CacheService } from '@/services/cache.service';
import { AccountType, RoleStatus } from '@/types/enums';

const userRoleRepo = AppDataSource.getRepository(UserRole);
// const rvpRepo = AppDataSource.getRepository(RoleVersionPermission);

/**
 * Resolves active role slugs and permission keys from PostgreSQL database for an admin user.
 */
async function fetchUserRolesAndPermissions(
  userId: string,
): Promise<{ roles: string[]; permissions: string[] }> {
  const userRoles = await userRoleRepo.find({
    where: { userId },
    relations: {
      role: {
        // activeVersion: true,
        rolePermissions: {
          permission: true,
        },
      },
    },
  });

  const activeUserRoles = userRoles.filter((ur) => {
    if (ur.role.status !== RoleStatus.ACTIVE) return false;
    // if (ur.expiresAt && ur.expiresAt.getTime() < Date.now()) return false;
    if (ur.status !== RoleStatus.ACTIVE) return false;
    return true;
  });

  if (activeUserRoles.length === 0) {
    throw new AppError(
      'Admin account has no active roles assigned',
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.FORBIDDEN,
    );
  }

  const roleSlugs = activeUserRoles
    .map((userRole) => {
      if (userRole.role.isSystemRole) return SUPER_ADMIN;
      const roleName = userRole.role.key;
      return roleName ? slugify(roleName, { lower: true, strict: true }) : null;
    })
    .filter((slug): slug is string => Boolean(slug));

  const hasSuperAdmin = activeUserRoles.some((ur) => ur.role.isSystemRole);
  let permissionKeys: string[];

  if (hasSuperAdmin) {
    const permissionRepo = AppDataSource.getRepository(Permission);
    const allPermissions = await permissionRepo.find({ select: { key: true } });
    permissionKeys = allPermissions.map((p) => p.key);
  } else {
    // const activeVersionIds = activeUserRoles
    //   // .map((ur) => ur.role.activeVersionId)
    //   .filter((id): id is string => Boolean(id));
    // if (activeVersionIds.length > 0) {
    // const rvpList = await rvpRepo.find({
    //   where: { roleVersionId: In(activeVersionIds) },
    //   select: { permissionKey: true },
    // });
    // permissionKeys = Array.from(new Set(rvpList.map((p) => p.permissionKey)));
    // }
    const keys: string[] = [];
    for (const ur of activeUserRoles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission.key) {
          keys.push(rp.permission.key);
        }
      }
    }
    permissionKeys = Array.from(new Set(keys));
  }

  return { roles: roleSlugs, permissions: permissionKeys };
}

/**
 * [WHAT]
 * Middleware that resolves and attaches assigned roles and permissions to `req.roles` and `req.permissions`.
 *
 * [WHY]
 * Powers Role-Based Access Control (RBAC) authorization checks across all administrative API routes.
 *
 * [CONSTRAINT]
 * 1. Non-admin users (`accountType !== ADMIN`) receive empty arrays `req.roles = []` and `req.permissions = []`.
 * 2. Caches resolved permissions in Redis for 300s to avoid database queries on every request.
 * 3. Super Admin system role automatically resolves ALL database permissions.
 *
 * [SIDE EFFECTS]
 * 1. Reads from Redis cache (`permissions:<userId>`).
 * 2. On cache miss, queries `UserRole`, `RoleVersionPermission`, and `Permission` entities from PostgreSQL.
 * 3. Populates `req.roles` and `req.permissions`.
 *
 * [ERRORS]
 * 1. Returns 401 Unauthorized if request is unauthenticated (`!req.user`).
 * 2. Returns 403 Forbidden if admin user has no active assigned roles.
 * 3. Returns 500 Internal Server Error if database/cache resolution fails (fails closed).
 */
export const loadPermissions = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  if (req.user.accountType !== AccountType.ADMIN) {
    req.roles = [];
    req.permissions = [];
    return next();
  }

  const { userId } = req.user;
  const cacheKey = `permissions:${userId}`;

  try {
    const cached = await CacheService.get<{ roles: string[]; permissions: string[] }>(cacheKey);
    if (cached) {
      req.roles = cached.roles;
      req.permissions = cached.permissions;
      return next();
    }

    const { roles, permissions } = await fetchUserRolesAndPermissions(userId);
    req.roles = roles;
    req.permissions = permissions;

    await CacheService.set(cacheKey, { roles, permissions }, 300);
    next();
  } catch (err: unknown) {
    if (err instanceof AppError) return next(err);
    return next(
      new AppError(
        AppErrorMessage.PERMISSIONS_LOAD_FAILED,
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        AppErrorCode.PERMISSION_LOAD_FAILED,
      ),
    );
  }
};

/**
 * [WHAT]
 * Higher-order middleware factory requiring a specific permission key for route execution.
 *
 * [WHY]
 * Restricts access to administrative endpoints requiring a single explicit permission.
 *
 * [CONSTRAINT]
 * Super Admin role (`roles.includes(SUPER_ADMIN)`) automatically bypasses permission key checks.
 *
 * [ERRORS]
 * Returns 403 Forbidden if user lacks the required permission key.
 */
export const requirePermission = (permissionKey: string) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (req.roles?.includes(SUPER_ADMIN)) {
        return next();
      }

      if (!req.permissions?.includes(permissionKey)) {
        req.log.warn({ requiredPermission: permissionKey }, 'Forbidden: Insufficient Permissions');
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

/**
 * [WHAT]
 * Higher-order middleware factory requiring at least ONE permission key from a specified list.
 *
 * [WHY]
 * Enables flexible authorization for endpoints accessible by users with any of multiple roles/permissions.
 *
 * [CONSTRAINT]
 * Super Admin role (`roles.includes(SUPER_ADMIN)`) automatically bypasses permission key checks.
 *
 * [ERRORS]
 * Returns 403 Forbidden if user lacks all specified permission keys.
 */
export const requireAnyPermission = (permissionKeys: string[]) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (req.roles?.includes(SUPER_ADMIN)) {
        return next();
      }

      const hasAny = permissionKeys.some((key) => req.permissions?.includes(key));
      if (!hasAny) {
        req.log.warn(
          { requiredAnyPermission: permissionKeys },
          'Forbidden: Insufficient Permissions',
        );
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

/**
 * [WHAT]
 * Higher-order middleware factory requiring ALL permission keys from a specified list.
 *
 * [WHY]
 * Enforces strict multi-permission authorization requirements for high-security administrative endpoints.
 *
 * [CONSTRAINT]
 * Super Admin role (`roles.includes(SUPER_ADMIN)`) automatically bypasses permission key checks.
 *
 * [ERRORS]
 * Returns 403 Forbidden if user lacks any of the required permission keys.
 */
export const requireAllPermissions = (permissionKeys: string[]) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (req.roles?.includes(SUPER_ADMIN)) {
        return next();
      }

      const hasAll = permissionKeys.every((key) => req.permissions?.includes(key));
      if (!hasAll) {
        req.log.warn(
          { requiredAllPermissions: permissionKeys },
          'Forbidden: Insufficient Permissions',
        );
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

/**
 * [WHAT]
 * Higher-order middleware factory enforcing Super Admin system role access.
 *
 * [WHY]
 * Restricts super-administrative routes (system maintenance, global RBAC management) to Super Admins.
 *
 * [ERRORS]
 * Returns 403 Forbidden if user does not possess the Super Admin system role.
 */
export const requireSuperAdmin = () => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.roles?.includes(SUPER_ADMIN)) {
        req.log.warn({ requiredRole: SUPER_ADMIN }, 'Forbidden: Super Admin Access Required');
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_SUPER_ADMIN_REQUIRED,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};
