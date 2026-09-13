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

import { AlertPreference } from './AlertPreference';
import { Country } from './Country';
import { StateVersion } from './StateVersion';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

import type { Relation } from 'typeorm';
import { StateType } from '@/types/enums';

@Entity('states')
@Check('"code" = UPPER("code")')
@Index('uq_state_country_slug', ['countryId', 'slug'], {
  unique: true,
})
@Index('uq_state_country_code', ['countryId', 'code'], {
  unique: true,
})
export class State {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: number;

  /** State/region code within the country: 'CA', 'TX', 'ON', 'MP' */
  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  /** 'state' | 'territory' | 'federal' */
  @Column({ type: 'enum', enum: StateType })
  type!: StateType;

  @Column({
    name: 'country_id',
    type: 'smallint',
  })
  countryId!: number;

  @ManyToOne(() => Country, (country) => country.states, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'country_id' })
  country!: Relation<Country>;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdById!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy!: Relation<User>;

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
  @JoinColumn({ name: 'updated_by' })
  updatedBy!: Relation<User | null>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => TenderVersion, (t) => t.state)
  tenders!: Relation<TenderVersion[]>;

  @OneToMany(() => AlertPreference, (a) => a.state)
  alertPreferences!: Relation<AlertPreference[]>;

  @OneToMany(() => StateVersion, (version) => version.state)
  versions!: Relation<StateVersion[]>;

  // ─── Hooks ────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    if (!/^[A-Z0-9-]+$/.test(this.code)) {
      throw new Error('State code must contain only uppercase alphanumeric characters or hyphens.');
    }

    this.name = this.name.trim();

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
}
