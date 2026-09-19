// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   OneToMany,
//   PrimaryGeneratedColumn,
//   Unique,
//   UpdateDateColumn,
// } from 'typeorm';

// import { Category } from './Category';
// import { Plan } from './Plan';
// import { PlanCategoryPricing } from './PlanCategoryPricing';
// import { PlanCountryPricing } from './PlanCountryPricing';
// import { PlanFeature } from './PlanFeature';
// import { PlanReview } from './PlanReview';
// import { State } from './State';
// import { User } from './User';

// import type { Relation } from 'typeorm';
// import { PlanType, PlanVersionStatus } from '@/types/enums';

// @Entity('plan_versions')
// @Unique(['planId', 'version'])
// @Index('idx_plan_versions_plan_id', ['planId'])
// @Index('idx_plan_versions_status', ['status'])
// @Index('ux_plan_versions_active', ['planId'], {
//   unique: true,
//   where: '"status" = \'APPROVED\'',
// })
// export class PlanVersion {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ name: 'plan_id', type: 'uuid' })
//   planId!: string;

//   @ManyToOne(() => Plan, (p) => p.versions, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'plan_id' })
//   plan!: Relation<Plan>;

//   @Column({ type: 'integer', default: 1 })
//   version!: number;

//   @Column({ type: 'enum', enum: PlanVersionStatus })
//   status!: PlanVersionStatus;

//   @Column({ type: 'varchar', length: 80 })
//   name!: string;

//   @Column({ type: 'varchar', length: 255, nullable: true })
//   subtitle!: string | null;

//   @Column({ type: 'text', nullable: true })
//   description!: string | null;

//   @Column({ name: 'price_cents', type: 'int' })
//   priceCents!: number;

//   @Column({ type: 'varchar', length: 10, default: 'USD' })
//   currency!: string;

//   @Column({ name: 'duration_days', type: 'int' })
//   durationDays!: number;

//   @Column({ name: 'trial_days', type: 'int', default: 0 })
//   trialDays!: number;

//   @Column({ name: 'setup_fee_cents', type: 'int', default: 0 })
//   setupFeeCents!: number;

//   @Column({ name: 'is_recurring', type: 'boolean', default: true })
//   isRecurring!: boolean;

//   @Column({ name: 'is_featured', type: 'boolean', default: false })
//   isFeatured!: boolean;

//   @Column({ type: 'varchar', length: 50, nullable: true })
//   badge!: string | null;

//   @Column({ name: 'plan_type', type: 'enum', enum: PlanType, default: PlanType.ALL_ACCESS })
//   planType!: PlanType;

//   @Column({ name: 'target_state_id', type: 'smallint', nullable: true })
//   targetStateId!: number | null;

//   @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
//   @JoinColumn({ name: 'target_state_id' })
//   targetState!: Relation<State | null>;

//   @Column({ name: 'target_country', type: 'varchar', length: 100, nullable: true })
//   targetCountry!: string | null;

//   @Column({ name: 'target_category_id', type: 'uuid', nullable: true })
//   targetCategoryId!: string | null;

//   @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
//   @JoinColumn({ name: 'target_category_id' })
//   targetCategory!: Relation<Category | null>;

//   @Column({ name: 'bundle_size', type: 'int', nullable: true })
//   bundleSize!: number | null;

//   @Column({ name: 'locked_by', type: 'uuid', nullable: true })
//   lockedByUserId!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'locked_by' })
//   lockedByUser!: Relation<User | null>;

//   @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
//   lockedAt!: Date | null;

//   @Column({ name: 'created_by', type: 'uuid', nullable: true })
//   createdBy!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'created_by' })
//   createdByUser!: Relation<User | null>;

//   @Column({ name: 'updated_by', type: 'uuid', nullable: true })
//   updatedBy!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'updated_by' })
//   updatedByUser!: Relation<User | null>;

//   @Column({ name: 'approved_by', type: 'uuid', nullable: true })
//   approvedByUserId!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'approved_by' })
//   approvedByUser!: Relation<User | null>;

//   @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
//   approvedAt!: Date | null;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;

//   // ─── Relations ────────────────────────────────────────────────────────────
//   @OneToMany(() => PlanFeature, (f) => f.planVersion)
//   features!: Relation<PlanFeature[]>;

//   @OneToMany(() => PlanCountryPricing, (cp) => cp.planVersion)
//   countryPricing!: Relation<PlanCountryPricing[]>;

//   @OneToMany(() => PlanCategoryPricing, (catP) => catP.planVersion)
//   categoryPricing!: Relation<PlanCategoryPricing[]>;

//   @OneToMany(() => PlanReview, (r) => r.planVersion)
//   reviews!: Relation<PlanReview[]>;
// }
