import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CategoryReview } from './CategoryReview';
import { User } from './User';

import type { Relation } from 'typeorm';
import { ReviewAssignmentStatus } from '@/types/enums';

@Entity('category_review_assignments')
@Index(['reviewId', 'reviewerId'])
export class CategoryReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @ManyToOne(() => CategoryReview, (review) => review.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review!: Relation<CategoryReview>;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: Relation<User>;

  @Column({
    type: 'enum',
    enum: ReviewAssignmentStatus,
    default: ReviewAssignmentStatus.PENDING,
  })
  status!: ReviewAssignmentStatus;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true, default: null })
  assignedByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser!: Relation<User | null>;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true, default: null })
  respondedAt!: Date | null;

  @Column({ name: 'response_comment', type: 'text', nullable: true, default: null })
  responseComment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
