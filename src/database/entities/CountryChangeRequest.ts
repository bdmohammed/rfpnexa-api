import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { Country } from './Country';
import { CountryActivity } from './CountryActivity';
import { CountryChangeRequestAssignment } from './CountryChangeRequestAssignment';
import { CountryChangeRequestComment } from './CountryChangeRequestComment';
import { State } from './State';
import { User } from './User';

import type { Relation } from 'typeorm';
import {
  CountryChangeRequestAction,
  CountryChangeRequestStatus,
  CountryChangeRequestTargetType,
} from '@/types/enums';

export interface CascadePolicyOptions {
  disableStates: boolean;
  disableTenders: boolean;
  disableCategories: boolean;
  hideFromSearch: boolean;
  notifySuppliers: boolean;
}

export const DEFAULT_CASCADE_POLICY: CascadePolicyOptions = {
  disableStates: true,
  disableTenders: true,
  disableCategories: false,
  hideFromSearch: true,
  notifySuppliers: true,
};

@Entity('country_change_requests')
@Index(['targetType', 'countryId', 'stateId'])
@Index(['status'])
@Index(['requestedById'])
@Index(['requestedById', 'status'])
@Index(['createdAt'])
@Index(['status', 'createdAt'])
@Index('uq_active_country_request', ['countryId'], {
  unique: true,
  where: `"target_type" = 'COUNTRY'
            AND "status" IN ('DRAFT','READY_FOR_REVIEW','IN_REVIEW')`,
})
@Index('uq_active_state_request', ['countryId', 'stateId'], {
  unique: true,
  where: `"target_type" = 'STATE'
            AND "status" IN ('DRAFT','READY_FOR_REVIEW','IN_REVIEW')`,
})
export class CountryChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_sequence', type: 'integer' })
  @Generated('increment')
  requestSequence!: number;

  @Column({ name: 'request_number', type: 'varchar', length: 50, unique: true })
  requestNumber!: string;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: CountryChangeRequestTargetType,
  })
  targetType!: CountryChangeRequestTargetType;

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

  @Column({
    type: 'enum',
    enum: CountryChangeRequestAction,
  })
  action!: CountryChangeRequestAction;

  @Column({
    type: 'enum',
    enum: CountryChangeRequestStatus,
    default: CountryChangeRequestStatus.READY_FOR_REVIEW,
  })
  status!: CountryChangeRequestStatus;

  @Column({ name: 'requested_by_id', type: 'uuid' })
  requestedById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy!: Relation<User>;

  @Column({ type: 'text' })
  reason!: string;

  @Column({
    name: 'cascade_policy',
    type: 'jsonb',
    default: DEFAULT_CASCADE_POLICY,
  })
  cascadePolicy!: CascadePolicyOptions;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────

  @OneToMany(() => CountryChangeRequestAssignment, (assignment) => assignment.request)
  assignments!: Relation<CountryChangeRequestAssignment[]>;

  @OneToMany(() => CountryChangeRequestComment, (comment) => comment.request)
  comments!: Relation<CountryChangeRequestComment[]>;

  @OneToMany(() => CountryActivity, (activity) => activity.request)
  activities!: Relation<CountryActivity[]>;
}
