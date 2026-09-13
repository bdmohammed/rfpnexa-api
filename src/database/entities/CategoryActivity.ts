import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Category } from './Category';
import { CategoryVersion } from './CategoryVersion';
import { User } from './User';

import type { Relation } from 'typeorm';

@Entity('category_activities')
@Index(['categoryId'])
export class CategoryActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, (cat) => cat.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: Relation<Category>;

  @Column({ name: 'category_version_id', type: 'uuid', nullable: true })
  categoryVersionId!: string | null;

  @ManyToOne(() => CategoryVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_version_id' })
  categoryVersion!: Relation<CategoryVersion | null>;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor!: Relation<User>;

  @Column({ type: 'varchar', length: 50 })
  event!: string;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
