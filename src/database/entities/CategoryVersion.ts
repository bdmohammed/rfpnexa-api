import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from './Category';
import { CategoryReview } from './CategoryReview';
import { User } from './User';

import type { Relation } from 'typeorm';
import { CategoryVersionStatus } from '@/types/enums';

@Entity('category_versions')
@Unique(['categoryId', 'version'])
@Index('idx_category_versions_category_id', ['categoryId'])
@Index('idx_category_versions_status', ['status'])
export class CategoryVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, (cat) => cat.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: Relation<Category>;

  @Column({ type: 'integer', default: 0 })
  majorVersion!: number;

  @Column({ type: 'integer', default: 1 })
  minorVersion!: number;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'version_number', type: 'varchar', length: 20, default: '0.1' })
  versionNumber!: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true, default: null })
  parentCategoryId!: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory!: Relation<Category | null>;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder!: number;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  icon!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  color!: string | null;

  @Column({ type: 'enum', enum: CategoryVersionStatus, default: CategoryVersionStatus.DRAFT })
  status!: CategoryVersionStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: Relation<User | null>;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true, default: null })
  approvedByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser!: Relation<User | null>;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true, default: null })
  approvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────────────
  @OneToMany(() => CategoryReview, (review) => review.categoryVersion)
  reviews!: Relation<CategoryReview[]>;

  @OneToMany(() => Category, (cat) => cat.activeVersion)
  categoriesUsingThisVersion!: Relation<Category[]>;
}
