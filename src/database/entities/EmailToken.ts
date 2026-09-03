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
import { EmailTokenType } from '@/types/enums';

@Entity('email_tokens')
@Index('idx_email_tokens_user_id', ['userId'])
@Index('idx_email_tokens_unused', ['userId', 'type'], {
  where: '"used_at" IS NULL',
})
@Index('idx_email_tokens_lookup', ['tokenHash', 'type', 'expiresAt'], {
  where: '"used_at" IS NULL',
})
@Index('uq_email_tokens_hash', ['tokenHash'], {
  unique: true,
})
@Index('uq_email_tokens_active', ['userId', 'type'], {
  unique: true,
  where: '"used_at" IS NULL',
})
export class EmailToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  /** SHA-256 hash of the raw token — never store raw tokens */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index('email_tokens_type_idx')
  @Column({ name: 'type', type: 'enum', enum: EmailTokenType })
  type!: EmailTokenType;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /** Set when token is consumed — single-use enforcement */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
