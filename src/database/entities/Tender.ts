import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  // VersionColumn,
} from 'typeorm';

import { Category } from './Category';
import { Country } from './Country';
import { State } from './State';
import { TenderDocument } from './TenderDocument';
// import { DownloadHistory } from './DownloadHistory';
// import { TenderAmendment } from './TenderAmendment';
// import { TenderClarification } from './TenderClarification';
// import { TenderCommittee } from './TenderCommittee';
// import { TenderDailyMetrics } from './TenderDailyMetrics';
// import { TenderInvitation } from './TenderInvitation';
// import { TenderParticipant } from './TenderParticipant';
// import { TenderQuestion } from './TenderQuestion';
// import { TenderVersion } from './TenderVersion';
// import { TenderWatcher } from './TenderWatcher';
import { User } from './User';

import type { Relation } from 'typeorm';
// import {
//   // TenderBiddingStatus,
//   TenderLifecycleStatus,
//   // TenderProcessStatus,
//   // TenderPublicationStatus,
// } from '@/types/enums';

@Entity('tenders')
export class Tender {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'reference_no', unique: true })
  referenceNo!: string;

  // @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  // activeVersionId!: string | null;

  // @ManyToOne(() => TenderVersion, { onDelete: 'SET NULL', nullable: true })
  // @JoinColumn({ name: 'active_version_id' })
  // activeVersion!: Relation<TenderVersion | null>;

  // @Column({
  //   type: 'varchar',
  //   length: 50,
  //   default: TenderLifecycleStatus.ACTIVE,
  // })
  // status!: TenderLifecycleStatus;

  // @Column({
  //   name: 'publication_status',
  //   type: 'varchar',
  //   length: 50,
  //   default: TenderPublicationStatus.UNPUBLISHED,
  // })
  // publicationStatus!: TenderPublicationStatus;

  // @Column({
  //   name: 'bidding_status',
  //   type: 'varchar',
  //   length: 50,
  //   default: TenderBiddingStatus.NOT_OPEN,
  // })
  // biddingStatus!: TenderBiddingStatus;

  // @Column({
  //   name: 'process_status',
  //   type: 'varchar',
  //   length: 50,
  //   default: TenderProcessStatus.PRE_BIDDING,
  // })
  // processStatus!: TenderProcessStatus;

  // @Column({ name: 'publish_at', type: 'timestamptz', nullable: true })
  // publishAt!: Date | null;

  // @VersionColumn({ name: 'db_version', default: 1 })
  // dbVersion!: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  title!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  eligibility!: string | null;

  @Column({
    name: 'work_performance',
    type: 'text',
    nullable: true,
  })
  workPerformance!: string | null;

  @Column({
    name: 'proposal_submission',
    type: 'text',
    nullable: true,
  })
  proposalSubmission!: string | null;

  @Column({
    type: 'timestamptz',
  })
  deadline!: Date;

  @Column({
    name: 'country_id',
    type: 'smallint',
  })
  countryId!: number;

  @ManyToOne(() => Country, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'country_id' })
  country!: Relation<Country>;

  @Column({
    name: 'state_id',
    type: 'smallint',
  })
  stateId!: number;

  @ManyToOne(() => State, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'state_id' })
  state!: Relation<State>;

  @Column({
    name: 'category_id',
    type: 'uuid',
  })
  categoryId!: string;

  @ManyToOne(() => Category, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: Relation<Category>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: Relation<User>;

  @Column({ type: 'varchar', name: 'created_by_id' })
  createdById!: string;

  // ─── Relations ─────────────────────────────────────────────────────────────

  // @OneToMany(() => TenderVersion, (version) => version.tender)
  // versions!: Relation<TenderVersion[]>;

  // @OneToMany(() => TenderCommittee, (committee) => committee.tender)
  // committees!: Relation<TenderCommittee[]>;

  // @OneToMany(() => TenderParticipant, (participant) => participant.tender)
  // participants!: Relation<TenderParticipant[]>;

  // @OneToMany(() => TenderWatcher, (watcher) => watcher.tender)
  // watchers!: Relation<TenderWatcher[]>;

  // @OneToMany(() => TenderInvitation, (invitation) => invitation.tender)
  // invitations!: Relation<TenderInvitation[]>;

  // @OneToMany(() => TenderQuestion, (question) => question.tender)
  // questions!: Relation<TenderQuestion[]>;

  // @OneToMany(() => TenderClarification, (clarification) => clarification.tender)
  // clarifications!: Relation<TenderClarification[]>;

  // @OneToMany(() => TenderAmendment, (amendment) => amendment.tender)
  // amendments!: Relation<TenderAmendment[]>;

  // @OneToMany(() => DownloadHistory, (downloadHistory) => downloadHistory.tender)
  // downloadHistory!: Relation<DownloadHistory[]>;

  // @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.tender)
  // dailyMetrics!: Relation<TenderDailyMetrics[]>;

  @OneToMany(() => TenderDocument, (document) => document.tender)
  documents!: Relation<TenderDocument[]>;
}
