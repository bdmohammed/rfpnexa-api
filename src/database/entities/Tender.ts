import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { DownloadHistory } from './DownloadHistory';
import { TenderAmendment } from './TenderAmendment';
import { TenderClarification } from './TenderClarification';
import { TenderCommittee } from './TenderCommittee';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { TenderInvitation } from './TenderInvitation';
import { TenderParticipant } from './TenderParticipant';
import { TenderQuestion } from './TenderQuestion';
import { TenderVersion } from './TenderVersion';
import { TenderWatcher } from './TenderWatcher';
import { User } from './User';

import type { Relation } from 'typeorm';
import {
  TenderBiddingStatus,
  TenderLifecycleStatus,
  TenderProcessStatus,
  TenderPublicationStatus,
} from '@/types/enums';

@Entity('tenders')
export class Tender {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'reference_no', unique: true })
  referenceNo!: string;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId!: string | null;

  @ManyToOne(() => TenderVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion!: Relation<TenderVersion | null>;

  @Column({
    type: 'varchar',
    length: 50,
    default: TenderLifecycleStatus.ACTIVE,
  })
  status!: TenderLifecycleStatus;

  @Column({
    name: 'publication_status',
    type: 'varchar',
    length: 50,
    default: TenderPublicationStatus.UNPUBLISHED,
  })
  publicationStatus!: TenderPublicationStatus;

  @Column({
    name: 'bidding_status',
    type: 'varchar',
    length: 50,
    default: TenderBiddingStatus.NOT_OPEN,
  })
  biddingStatus!: TenderBiddingStatus;

  @Column({
    name: 'process_status',
    type: 'varchar',
    length: 50,
    default: TenderProcessStatus.PRE_BIDDING,
  })
  processStatus!: TenderProcessStatus;

  @Column({ name: 'publish_at', type: 'timestamptz', nullable: true })
  publishAt!: Date | null;

  @VersionColumn({ name: 'db_version', default: 1 })
  dbVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: Relation<User | null>;

  @Column({ type: 'varchar', name: 'created_by_id', nullable: true })
  createdById!: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => TenderVersion, (version) => version.tender)
  versions!: Relation<TenderVersion[]>;

  @OneToMany(() => TenderCommittee, (committee) => committee.tender)
  committees!: Relation<TenderCommittee[]>;

  @OneToMany(() => TenderParticipant, (participant) => participant.tender)
  participants!: Relation<TenderParticipant[]>;

  @OneToMany(() => TenderWatcher, (watcher) => watcher.tender)
  watchers!: Relation<TenderWatcher[]>;

  @OneToMany(() => TenderInvitation, (invitation) => invitation.tender)
  invitations!: Relation<TenderInvitation[]>;

  @OneToMany(() => TenderQuestion, (question) => question.tender)
  questions!: Relation<TenderQuestion[]>;

  @OneToMany(() => TenderClarification, (clarification) => clarification.tender)
  clarifications!: Relation<TenderClarification[]>;

  @OneToMany(() => TenderAmendment, (amendment) => amendment.tender)
  amendments!: Relation<TenderAmendment[]>;

  @OneToMany(() => DownloadHistory, (downloadHistory) => downloadHistory.tender)
  downloadHistory!: Relation<DownloadHistory[]>;

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.tender)
  dailyMetrics!: Relation<TenderDailyMetrics[]>;
}
