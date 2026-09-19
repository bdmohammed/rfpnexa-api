import { type DataSource } from 'typeorm';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/entities/User';
import { SUPER_ADMIN } from '@/core/constants';
import { Permission } from '@/database/entities/Permission';
import { Role } from '@/database/entities/Role';
import { RolePermission } from '@/database/entities/RolePermission';
import { RoleStatus } from '@/types/enums';

export default class AddedSuperAdmin1720800019 implements SeedInterface {
  name = 'AddedSuperAdmin1720800019';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }

    const roleRepo = dataSource.getRepository(Role);
    const permissionRepo = dataSource.getRepository(Permission);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    let superAdminRole = await roleRepo.findOne({
      where: {
        key: SUPER_ADMIN,
        isSystemRole: true,
      },
    });

    if (!superAdminRole) {
      superAdminRole = roleRepo.create({
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
        createdBy: systemUser.id,
        updatedBy: systemUser.id,
        key: SUPER_ADMIN,
      });

      await roleRepo.save(superAdminRole);
    }

    const permissions = await permissionRepo.find({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!permissions.length) {
      return;
    }

    const existingRolePermissions = await rolePermissionRepo.find({
      where: {
        roleId: superAdminRole.id,
      },
      select: {
        permissionId: true,
      },
    });

    const existingPermissionIds = new Set(
      existingRolePermissions.map((rolePermission) => rolePermission.permissionId),
    );

    const missingPermissions = permissions
      .filter((permission) => !existingPermissionIds.has(permission.id))
      .map((permission) =>
        rolePermissionRepo.create({
          roleId: superAdminRole.id,
          permissionId: permission.id,
        }),
      );

    if (missingPermissions.length) {
      await rolePermissionRepo.save(missingPermissions);
    }
  }

  public async down(dataSource: DataSource): Promise<void> {
    const roleRepo = dataSource.getRepository(Role);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    const superAdminRole = await roleRepo.findOne({
      where: {
        key: SUPER_ADMIN,
        isSystemRole: true,
      },
    });

    if (!superAdminRole) {
      return;
    }

    await rolePermissionRepo.delete({
      roleId: superAdminRole.id,
    });

    await roleRepo.delete({
      id: superAdminRole.id,
    });
  }
}
