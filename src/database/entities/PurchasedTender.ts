import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Tender } from './Tender';
import { Transaction } from './Transaction';
import { User } from './User';

@Entity('purchased_tenders')
@Unique('uq_purchased_tenders_user_tender', ['userId', 'tenderId'])
export class PurchasedTender {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  tenderId!: string;

  @Column({ type: 'varchar' })
  transactionId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  purchasedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Tender, { onDelete: 'CASCADE' })
  tender!: Tender;

  @ManyToOne(() => Transaction)
  transaction!: Transaction;
}
