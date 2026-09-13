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

import { Category } from './Category';
import { CategoryReviewAssignment } from './CategoryReviewAssignment';
import { CategoryReviewComment } from './CategoryReviewComment';
import { CategoryVersion } from './CategoryVersion';

import type { Relation } from 'typeorm';
import { ReviewStatus } from '@/types/enums';

@Entity('category_reviews')
@Index(['categoryVersionId'])
export class CategoryReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: Relation<Category>;

  @Column({ name: 'category_version_id', type: 'uuid' })
  categoryVersionId!: string;

  @ManyToOne(() => CategoryVersion, (version) => version.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_version_id' })
  categoryVersion!: Relation<CategoryVersion>;

  @Index('idx_category_reviews_status')
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedByUserId!: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'decision_comment', type: 'text', nullable: true })
  decisionComment!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => CategoryReviewAssignment, (assignment) => assignment.review)
  assignments!: Relation<CategoryReviewAssignment[]>;

  @OneToMany(() => CategoryReviewComment, (comment) => comment.categoryReview)
  comments!: Relation<CategoryReviewComment[]>;
}
