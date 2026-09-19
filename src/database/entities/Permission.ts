import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// import { PermissionActions } from '../../authorization/registry/types';
import { PermissionModule } from './PermissionModule';
import { RolePermission } from './RolePermission';
import { User } from './User';
import { UserRole } from './UserRole';

import type { Relation } from 'typeorm';

@Entity('permissions')
@Index('permissions_key_idx', ['key'])
@Index('permissions_module_id_idx', ['moduleId'])
export class Permission {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: number;

  @Column({ name: 'module_id', type: 'smallint' })
  moduleId!: number;

  @ManyToOne(() => PermissionModule, (m) => m.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: Relation<PermissionModule>;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  // module.key + "." + action
  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string;

  // @Column({ type: 'enum', enum: PermissionActions })
  // action!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'display_order',
    type: 'integer',
    default: 0,
  })
  displayOrder!: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: false,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: Relation<User>;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'updated_by',
  })
  updatedBy!: Relation<User | null>;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: Relation<UserRole[]>;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions!: Relation<RolePermission[]>;
}
