import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Permission } from './Permission';
import { Role } from './Role';

import type { Relation } from 'typeorm';

@Entity('role_permissions')
@Unique(['roleId', 'permissionId'])
@Index('role_permissions_role_id_idx', ['roleId'])
@Index('role_permissions_permission_id_idx', ['permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'role_id',
    type: 'uuid',
  })
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: Relation<Role>;

  @Column({
    name: 'permission_id',
    type: 'smallint',
  })
  permissionId!: number;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'permission_id',
  })
  permission!: Relation<Permission>;
}
