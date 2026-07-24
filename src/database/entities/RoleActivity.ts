import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Role } from './Role';
import { RoleVersion } from './RoleVersion';
import { User } from './User';

export enum RoleActivityType {
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  PERMISSION_ADDED = 'PERMISSION_ADDED',
  PERMISSION_REMOVED = 'PERMISSION_REMOVED',
  REVIEW_ASSIGNED = 'REVIEW_ASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
}

@Entity('role_activities')
@Index('idx_role_activities_role_id', ['roleId'])
@Index('idx_role_activities_user_id', ['userId'])
@Index('idx_role_activities_created_at', ['createdAt'])
export class RoleActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_version_id', type: 'uuid', nullable: true })
  roleVersionId: string | null;

  @ManyToOne(() => RoleVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'role_version_id' })
  roleVersion: RoleVersion | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: RoleActivityType,
  })
  activityType: RoleActivityType;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
