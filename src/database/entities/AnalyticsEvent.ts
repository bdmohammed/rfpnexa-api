import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './User';

import type { Relation } from 'typeorm';
import { AnalyticsEventType, LogSource } from '@/types/enums';

@Entity('analytics_events')
@Index('idx_analytics_events_type_date', ['eventType', 'occurredAt'])
@Index('idx_analytics_events_actor_type_date', ['actorId', 'eventType', 'occurredAt'])
@Index('idx_analytics_events_correlation', ['correlationId'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_type', type: 'enum', enum: AnalyticsEventType })
  eventType!: AnalyticsEventType;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, (user) => user.analyticsEvents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'actor_id' })
  actor!: Relation<User | null>;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ type: 'enum', enum: LogSource, default: LogSource.API })
  source!: LogSource;

  @Column({ name: 'request_id', type: 'varchar', length: 50, nullable: true })
  requestId!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 50, nullable: true })
  sessionId!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 50, nullable: true })
  correlationId!: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'properties', type: 'jsonb', default: '{}' })
  properties!: Record<string, unknown>;
}
