import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { PlanReview } from './PlanReview';
import { User } from './User';

import type { Relation } from 'typeorm';
import { ReviewAssignmentStatus } from '@/types/enums';

@Entity('plan_review_assignments')
@Unique(['reviewId', 'reviewerId'])
@Index(['reviewerId'])
@Index('idx_plan_review_assignment_review_status', ['reviewId', 'status'])
export class PlanReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @ManyToOne(() => PlanReview, (r) => r.planReviewAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review!: Relation<PlanReview>;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @ManyToOne(() => User, (u) => u.planReviewAssignments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: Relation<User>;

  @Column({ type: 'enum', enum: ReviewAssignmentStatus, default: ReviewAssignmentStatus.PENDING })
  status!: ReviewAssignmentStatus;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true, default: null })
  reviewedAt!: Date | null;
}
