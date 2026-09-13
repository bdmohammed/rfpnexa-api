import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CountryChangeRequest } from './CountryChangeRequest';
import { User } from './User';

import type { Relation } from 'typeorm';
import { CountryCommentType } from '@/types/enums';

@Entity('country_change_request_comments')
@Index(['requestId'])
export class CountryChangeRequestComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @ManyToOne(() => CountryChangeRequest, (req) => req.comments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'request_id' })
  request!: Relation<CountryChangeRequest>;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author!: Relation<User>;

  @Column({
    type: 'enum',
    enum: CountryCommentType,
    default: CountryCommentType.GENERAL,
  })
  type!: CountryCommentType;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
