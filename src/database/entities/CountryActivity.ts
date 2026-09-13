import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Country } from './Country';
import { CountryChangeRequest } from './CountryChangeRequest';
import { State } from './State';
import { User } from './User';

import type { Relation } from 'typeorm';
import { ActorType, CountryActivityType } from '@/types/enums';

@Entity('country_activities')
@Index(['countryId', 'createdAt'])
@Index(['stateId', 'createdAt'])
@Index(['requestId', 'createdAt'])
// @Index(['requestId'])
@Index(['eventType'])
export class CountryActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'country_id', type: 'smallint' })
  countryId!: number;

  @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'country_id' })
  country!: Relation<Country>;

  @Column({ name: 'state_id', type: 'smallint', nullable: true })
  stateId!: number | null;

  @ManyToOne(() => State, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'state_id' })
  state!: Relation<State | null>;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  @ManyToOne(() => CountryChangeRequest, (req) => req.activities, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'request_id' })
  request!: Relation<CountryChangeRequest | null>;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor!: Relation<User>;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: ActorType,
    default: ActorType.USER,
  })
  actorType!: ActorType;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: CountryActivityType,
  })
  eventType!: CountryActivityType;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
