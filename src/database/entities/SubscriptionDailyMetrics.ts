// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// import { Plan } from './Plan';
// import { User } from './User';

// import type { Relation } from 'typeorm';

// @Entity('subscription_daily_metrics')
// @Index(['date'])
// @Index(['date', 'planId'])
// export class SubscriptionDailyMetrics {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ type: 'timestamptz' })
//   date!: Date;

//   @Column({ name: 'plan_id', type: 'uuid', nullable: true })
//   planId!: string | null;

//   @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'plan_id' })
//   plan!: Relation<Plan | null>;

//   @Column({ type: 'varchar', length: 10, default: 'USD' })
//   currency!: string;

//   @Column({ name: 'active_count', type: 'integer', default: 0 })
//   activeCount!: number;

//   @Column({ name: 'expired_count', type: 'integer', default: 0 })
//   expiredCount!: number;

//   @Column({ name: 'cancelled_count', type: 'integer', default: 0 })
//   cancelledCount!: number;

//   @Column({
//     name: 'revenue_cents',
//     type: 'bigint',
//     default: 0,
//     transformer: {
//       to: (val: number) => val,
//       from: (val: string) => parseInt(val, 10),
//     },
//   })
//   revenueCents!: number;

//   @Column({ name: 'created_by', type: 'uuid', nullable: true })
//   createdById!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'created_by' })
//   createdBy!: Relation<User | null>;

//   @Column({ name: 'updated_by', type: 'uuid', nullable: true })
//   updatedById!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'updated_by' })
//   updatedBy!: Relation<User | null>;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;
// }
