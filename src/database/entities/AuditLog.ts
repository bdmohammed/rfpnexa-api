// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';

// import { User } from './User';

// import type { Relation } from 'typeorm';
// import { AuditSeverity, AuditStatus, LogSource } from '@/types/enums';

// /**
//  * Immutable admin action audit log.
//  * NEVER update or delete rows. Append-only.
//  * actorEmail is denormalized to preserve the record if the admin is later deleted.
//  */
// @Entity('audit_logs')
// @Index('idx_audit_logs_created_at', ['createdAt'])
// @Index('idx_audit_logs_actor_user_id', ['actorUserId'])
// @Index('idx_audit_logs_target_user_id', ['targetUserId'])
// @Index('idx_audit_logs_module', ['module'])
// @Index('idx_audit_logs_severity', ['severity'])
// @Index('idx_audit_logs_correlation_id', ['correlationId'])
// @Index('idx_audit_logs_request_id', ['requestId'])
// @Index('idx_audit_logs_entity_id', ['entityId'])
// export class AuditLog {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ type: 'enum', enum: LogSource, default: LogSource.API })
//   source!: LogSource;

//   @Column({ name: 'endpoint', type: 'varchar', nullable: true })
//   endpoint!: string | null;

//   @Column({ type: 'uuid', name: 'event_id' })
//   eventId!: string;

//   @Column({ type: 'uuid', name: 'correlation_id', nullable: true })
//   correlationId!: string | null;

//   @Column({ type: 'uuid', nullable: true })
//   actorId!: string | null;

//   @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
//   actorUserId!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'actor_user_id' })
//   actorUser!: Relation<User | null>;

//   @Column({ type: 'uuid', name: 'target_user_id', nullable: true })
//   targetUserId!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'target_user_id' })
//   targetUser!: Relation<User | null>;

//   /** Denormalized — preserved even if user is deleted */
//   @Column({ type: 'varchar', name: 'actor_email' })
//   actorEmail!: string;

//   // PermissionModules eg: dashboard, role, permission etc.
//   @Column({ type: 'varchar' })
//   module!: string;

//   // PermissionActions eg: view, create, update, delete, etc.
//   @Column({ type: 'varchar' })
//   action!: string;

//   @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
//   entityType!: string | null;

//   @Column({ name: 'entity_id', type: 'varchar', nullable: true })
//   entityId!: string | null;

//   @Column({ type: 'enum', enum: AuditSeverity, default: AuditSeverity.INFO })
//   severity!: AuditSeverity;

//   @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.SUCCESS })
//   status!: AuditStatus;

//   /** State before the action (alias/source of oldValues) */
//   @Column({ type: 'jsonb', nullable: true })
//   before!: Record<string, unknown> | null;

//   /** State after the action (alias/source of newValues) */
//   @Column({ type: 'jsonb', nullable: true })
//   after!: Record<string, unknown> | null;

//   @Column({ type: 'jsonb', nullable: true })
//   metadata!: Record<string, unknown> | null;

//   @Column({ name: 'request_id', type: 'varchar', nullable: true })
//   requestId!: string | null;

//   @Column({ name: 'trace_id', type: 'varchar', nullable: true })
//   traceId!: string | null;

//   @Column({ name: 'user_agent', type: 'text', nullable: true })
//   userAgent!: string | null;

//   @Column({ name: 'ip_address', type: 'inet', nullable: true })
//   ipAddress!: string | null;

//   @Column({ name: 'session_id', type: 'varchar', nullable: true })
//   sessionId!: string | null;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;
// }
