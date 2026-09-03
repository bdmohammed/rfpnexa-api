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

import { NotificationRecipient } from './NotificationRecipient';
import { RoleVersion } from './RoleVersion';
import { User } from './User';
import { UserRole } from './UserRole';

import type { Relation } from 'typeorm';
import { RoleStatus } from '@/types/enums';

@Entity('roles')
@Index('idx_roles_status', ['status'])
@Index('idx_roles_active_version_id', ['activeVersionId'])
@Index('idx_roles_is_system_role', ['isSystemRole'])
@Index('idx_roles_is_default_role', ['isDefaultRole'])
@Index('ux_default_role', ['isDefaultRole'], {
  unique: true,
  where: '"is_default_role" = true',
})
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('roles_key_idx', { unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string;

  @Column({ type: 'enum', enum: RoleStatus, default: RoleStatus.DISABLED })
  status!: RoleStatus;

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole!: boolean;

  @Column({ name: 'is_default_role', type: 'boolean', default: false })
  isDefaultRole!: boolean;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId!: string | null;

  @Column({
    name: 'published_version_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  publishedVersionNumber!: string | null;

  @Column({
    name: 'latest_draft_version_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  latestDraftVersionNumber!: string | null;

  @ManyToOne(() => RoleVersion, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion!: Relation<RoleVersion>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'created_by',
  })
  createdByUser!: Relation<User>;

  @Column({ name: 'updated_by', type: 'uuid' })
  updatedBy!: string;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'updated_by',
  })
  updatedByUser!: Relation<User>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────────────
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: Relation<UserRole[]>;

  @OneToMany(() => RoleVersion, (roleVersion) => roleVersion.role)
  versions!: Relation<RoleVersion[]>;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.role)
  receivedNotifications!: Relation<NotificationRecipient[]>;
}
