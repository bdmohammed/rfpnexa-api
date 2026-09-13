import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AlertPreference } from './AlertPreference';
import { CategoryActivity } from './CategoryActivity';
import { CategoryVersion } from './CategoryVersion';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

import type { Relation } from 'typeorm';
import { CategoryStatus } from '@/types/enums';

@Entity('categories')
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_active', ['isActive'])
@Index('idx_categories_status', ['status'])
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
@Check('"code" ~ \'^[0-9]{3}$\'')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 3-digit NAICS-style code e.g. '001'..'084' */
  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug!: string;

  @Column({ type: 'enum', enum: CategoryStatus, default: CategoryStatus.PUBLISHED })
  status!: CategoryStatus;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId!: string | null;

  @ManyToOne(() => CategoryVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion!: Relation<CategoryVersion | null>;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdBy!: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: Relation<User>;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: Relation<User | null>;

  // ─── Relations ───────────────────────────────────────────────────────────
  @OneToMany(() => TenderVersion, (t) => t.category)
  tenders!: Relation<TenderVersion[]>;

  @OneToMany(() => AlertPreference, (alertPreference) => alertPreference.categoryId)
  alertPreferences!: Relation<AlertPreference[]>;

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.category)
  tenderMetrics!: Relation<TenderDailyMetrics[]>;

  @OneToMany(() => CategoryVersion, (v) => v.category)
  versions!: Relation<CategoryVersion[]>;

  @OneToMany(() => CategoryActivity, (a) => a.category)
  activities!: Relation<CategoryActivity[]>;

  // ─── Hooks ───────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    this.name = this.name.trim();

    if (!this.slug) {
      this.slug = slugify(this.name, {
        lower: true,
        strict: true,
        trim: true,
      });
    } else {
      this.slug = slugify(this.slug, {
        lower: true,
        strict: true,
        trim: true,
      });
    }
  }
}
