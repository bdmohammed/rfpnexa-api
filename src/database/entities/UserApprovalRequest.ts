import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from './Role';
import { User } from './User';

import type { Relation } from 'typeorm';

export enum UserApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'user_approval_requests' })
export class UserApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: Relation<User>;

  @RelationId((req: UserApprovalRequest) => req.targetUser)
  targetUserId: string;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_role_id' })
  requestedRole!: Relation<Role | null>;

  @RelationId((req: UserApprovalRequest) => req.requestedRole)
  requestedRoleId: string | null;

  @Column({ name: 'requested_description', type: 'text', nullable: true, default: null })
  requestedDescription!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy!: Relation<User | null>;

  @RelationId((req: UserApprovalRequest) => req.submittedBy)
  submittedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: Relation<User | null>;

  @RelationId((req: UserApprovalRequest) => req.reviewer)
  reviewerId: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: UserApprovalRequestStatus,
    default: UserApprovalRequestStatus.PENDING,
  })
  status!: UserApprovalRequestStatus;

  @Column({ name: 'reviewer_comment', type: 'text', nullable: true, default: null })
  reviewerComment!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true, default: null })
  decidedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
