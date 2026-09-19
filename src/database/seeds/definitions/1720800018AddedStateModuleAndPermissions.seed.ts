import { type DataSource, In } from 'typeorm';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/entities/User';
import { GeoLocationPermissionModule, GeoLocationPermissions } from '@/constants/permissions';
import { Permission } from '@/entities/Permission';
import { PermissionModule } from '@/entities/PermissionModule';

const statePermissions = Object.values(GeoLocationPermissions);

export default class AddedStateModuleAndPermissions1720800018 implements SeedInterface {
  name = 'AddedStateModuleAndPermissions1720800018';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { key: GeoLocationPermissionModule.key },
    });
    module ??= await moduleRepo.save(
      moduleRepo.create({
        ...GeoLocationPermissionModule,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      }),
    );

    const existingPermissions = await permRepo.find({
      where: { key: In(statePermissions.map((p) => p.key)) },
      select: {
        key: true,
      },
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = statePermissions.filter((p) => !existingKeys.has(p.key));
    if (newPermissions.length > 0) {
      const permissions = newPermissions.map((p) =>
        permRepo.create({
          moduleId: module.id,
          ...p,
          createdById: systemUser.id,
          updatedById: systemUser.id,
        }),
      );
      await permRepo.save(permissions);
    }
  }

  public async down(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const keys = statePermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
