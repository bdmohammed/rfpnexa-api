import { type DataSource, In } from 'typeorm';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/entities/User';
import { supportPermissionModule, SupportPermissions } from '@/constants/permissions';
import { Permission } from '@/entities/Permission';
import { PermissionModule } from '@/entities/PermissionModule';

const supportPermissions = Object.values(SupportPermissions);

export default class AddedSupportModuleAndPermissions1720800012 implements SeedInterface {
  name = 'AddedSupportModuleAndPermissions1720800012';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { key: supportPermissionModule.key },
    });
    module ??= await moduleRepo.save(
      moduleRepo.create({
        ...supportPermissionModule,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      }),
    );

    const existingPermissions = await permRepo.find({
      where: { key: In(supportPermissions.map((p) => p.key)) },
      select: {
        key: true,
      },
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = supportPermissions.filter((p) => !existingKeys.has(p.key));
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
    const keys = supportPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
