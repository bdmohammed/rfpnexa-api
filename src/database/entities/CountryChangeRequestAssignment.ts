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

// import { CountryChangeRequest } from './CountryChangeRequest';
// import { User } from './User';

// import type { Relation } from 'typeorm';
// import { CountryAssignmentStatus } from '@/types/enums';

// @Entity('country_change_request_assignments')
// @Index(['requestId', 'reviewerId'])
// export class CountryChangeRequestAssignment {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ name: 'request_id', type: 'uuid' })
//   requestId!: string;

//   @ManyToOne(() => CountryChangeRequest, (req) => req.assignments, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'request_id' })
//   request!: Relation<CountryChangeRequest>;

//   @Column({ name: 'reviewer_id', type: 'uuid' })
//   reviewerId!: string;

//   @ManyToOne(() => User, { onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'reviewer_id' })
//   reviewer!: Relation<User>;

//   @Column({
//     type: 'enum',
//     enum: CountryAssignmentStatus,
//     default: CountryAssignmentStatus.PENDING,
//   })
//   status!: CountryAssignmentStatus;

//   @Column({ name: 'assigned_by_id', type: 'uuid' })
//   assignedById!: string;

//   @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'assigned_by_id' })
//   assignedBy!: Relation<User>;

//   @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
//   assignedAt!: Date;

//   @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
//   respondedAt!: Date | null;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;
// }
