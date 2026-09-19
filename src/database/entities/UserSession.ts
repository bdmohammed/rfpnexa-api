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

// import { User } from './User';

// import type { Relation } from 'typeorm';

// @Entity('user_sessions')
// @Index('idx_user_sessions_active_lookup', ['tokenHash'], {
//   where: '"is_revoked" = false',
// })
// @Index('idx_user_sessions_user_active', ['userId'], {
//   where: '"is_revoked" = false',
// })
// @Index('idx_user_sessions_expires_at', ['expiresAt'])
// @Index('idx_user_sessions_user_device_active', ['userId', 'deviceHash'], {
//   where: '"is_revoked" = false',
// })
// export class UserSession {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ type: 'uuid', name: 'user_id' })
//   @Index()
//   userId!: string;

//   /** SHA-256 hash of the refresh token */
//   @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
//   @Index()
//   tokenHash!: string;

//   @Column({ name: 'expires_at', type: 'timestamptz' })
//   expiresAt!: Date;

//   @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
//   lastUsedAt!: Date | null;

//   @Column({ name: 'user_agent', type: 'text', nullable: true })
//   userAgent!: string | null;

//   @Column({ name: 'ip_address', type: 'inet', nullable: true })
//   ipAddress!: string | null;

//   @Column({ name: 'device_hash', type: 'varchar', length: 64, nullable: true })
//   deviceHash!: string | null;

//   @Column({ name: 'is_revoked', type: 'boolean', default: false })
//   isRevoked!: boolean;

//   @Column({ name: 'token_version', type: 'int', default: 1 })
//   tokenVersion!: number;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;

//   @ManyToOne(() => User, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'user_id' })
//   user!: Relation<User>;
// }
