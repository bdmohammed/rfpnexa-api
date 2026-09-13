import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
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

import { CountryVersion } from './CountryVersion';
import { State } from './State';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { User } from './User';
import { UserDailyMetrics } from './UserDailyMetrics';

import type { Relation } from 'typeorm';

@Entity('countries')
@Check('"code" ~ \'^[A-Z]{2}$\'')
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
export class Country {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: number;

  /** ISO 3166-1 Alpha-2 Code (IN, US, CA...) */
  @Column({
    type: 'char',
    length: 2,
    unique: true,
  })
  code!: string;

  @Index('idx_country_slug', { unique: true })
  @Column({
    type: 'varchar',
    length: 100,
  })
  slug!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  /**
   * Nullable only during initial bootstrap.
   * Seed process:
   * 1. Create bootstrap country.
   * 2. Create system user.
   * 3. Backfill created_by.
   */
  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
  })
  createdById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy!: Relation<User | null>;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'updated_by',
  })
  updatedBy!: Relation<User | null>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => State, (state) => state.country)
  states!: Relation<State[]>;

  @OneToMany(() => User, (user) => user.country)
  users!: Relation<User[]>;

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.country)
  tenderMetrics!: Relation<TenderDailyMetrics[]>;

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.country)
  userMetrics!: Relation<UserDailyMetrics[]>;

  @OneToMany(() => CountryVersion, (version) => version.country)
  versions!: Relation<CountryVersion[]>;

  // ─── Hooks ────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(this.code)) {
      throw new Error('Country code must be a valid ISO-3166-1 alpha-2 code.');
    }

    this.name = this.name.trim();

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
}
