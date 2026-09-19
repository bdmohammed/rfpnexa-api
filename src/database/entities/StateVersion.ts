// import {
//   Check,
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';

// import { Country } from './Country';
// import { type CascadePolicyOptions, CountryChangeRequest } from './CountryChangeRequest';
// import { State } from './State';
// import { User } from './User';

// import type { Relation } from 'typeorm';
// import { CountryChangeRequestAction, CountryChangeRequestStatus, StateType } from '@/types/enums';

// /**
//  * Immutable point-in-time snapshot of a {@link State} row.
//  *
//  * One row is written (never updated) when a {@link CountryChangeRequest}
//  * with `targetType = STATE` transitions to APPROVED inside
//  * `reviewChangeRequest`. The row captures everything needed to reconstruct
//  * or audit the change without any joins:
//  *
//  *  - denormalised scalar fields at approval time (`code`, `name`, `slug`, `type`)
//  *  - denormalised `countryId` — avoids join-through-state for country-level queries
//  *  - the before / after `isActive` transition
//  *  - the reviewer, maker, reason, and cascade policy from the request
//  *  - an explicit `approvedAt` timestamp
//  *  - a `previousVersionId` self-reference enabling linked-list traversal
//  *
//  * ⚠️  IMMUTABILITY
//  * This table is append-only. There is intentionally no `@UpdateDateColumn`.
//  * Enforce hard immutability at the database level with the trigger below —
//  * nobody, not even a DBA with direct psql access, should be able to silently
//  * edit a version row:
//  *
//  * ```sql
//  * CREATE OR REPLACE FUNCTION state_versions_immutable()
//  * RETURNS trigger LANGUAGE plpgsql AS $$
//  * BEGIN
//  *   RAISE EXCEPTION
//  *     'state_versions rows are immutable (id = %)', OLD.id;
//  * END;
//  * $$;
//  *
//  * CREATE TRIGGER trg_state_versions_no_update
//  * BEFORE UPDATE ON state_versions
//  * FOR EACH ROW EXECUTE FUNCTION state_versions_immutable();
//  * ```
//  *
//  * Indexes
//  * ───────
//  *  uq_state_version                   – enforces monotonic uniqueness per state
//  *  idx_state_versions_state_version   – primary timeline scan: state + version ORDER
//  *  idx_state_versions_country_id      – all state-version history for a country
//  *  idx_state_versions_request_id      – one-to-one join from change request
//  *  idx_state_versions_approved_by     – audit: who approved what
//  *  idx_state_versions_created_at      – range scans by wall-clock time
//  */
// @Entity('state_versions')
// @Check('"version" > 0')
// // Enforces that (state, version) is unique — the DB-level guard against
// // the MAX(version)+1 race described in the service.
// @Index('uq_state_version', ['stateId', 'version'], { unique: true })
// // Covering index for the canonical timeline query:
// //   WHERE state_id = ? ORDER BY version DESC
// @Index('idx_state_versions_state_version', ['stateId', 'version'])
// @Index('idx_state_versions_country_id', ['countryId'])
// @Index('idx_state_versions_request_id', ['requestId'], { unique: true })
// @Index('idx_state_versions_approved_by', ['approvedById'])
// @Index('idx_state_versions_created_at', ['createdAt'])
// export class StateVersion {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   // ─── Foreign Keys ──────────────────────────────────────────────────────────

//   /** The state this snapshot belongs to. */
//   @Column({ name: 'state_id', type: 'smallint' })
//   stateId!: number;

//   @ManyToOne(() => State, { onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'state_id' })
//   state!: Relation<State>;

//   /**
//    * Denormalised country reference — avoids a join through `state` when
//    * querying all version history for a given country in one index scan.
//    */
//   @Column({ name: 'country_id', type: 'smallint' })
//   countryId!: number;

//   @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'country_id' })
//   country!: Relation<Country>;

//   /**
//    * The change request whose approval produced this snapshot.
//    *
//    * `UNIQUE` — one approval → exactly one version row.
//    * `onDelete: RESTRICT` — version rows must not be silently orphaned.
//    */
//   @Column({ name: 'request_id', type: 'uuid', unique: true, nullable: true })
//   requestId!: string | null;

//   @ManyToOne(() => CountryChangeRequest, { nullable: true, onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'request_id' })
//   request!: Relation<CountryChangeRequest | null>;

//   /**
//    * Self-referencing linked-list pointer to the immediately preceding version.
//    *
//    * `NULL` on v1 (no predecessor).
//    * `onDelete: RESTRICT` — if for any reason a predecessor were ever removed,
//    * the chain is broken gracefully rather than cascade-deleting newer snapshots.
//    *
//    * Enables O(1) diff and revert queries:
//    *   `SELECT * FROM state_versions WHERE id = $previousVersionId`
//    */
//   @Column({ name: 'previous_version_id', type: 'uuid', nullable: true })
//   previousVersionId!: string | null;

//   @ManyToOne(() => StateVersion, { nullable: true, onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'previous_version_id' })
//   previousVersion!: Relation<StateVersion | null>;

//   // ─── Version Counter ───────────────────────────────────────────────────────

//   /**
//    * Monotonically increasing per-state version counter (1-based).
//    *
//    * Computed by the service as:
//    *   `SELECT COALESCE(MAX(version), 0) + 1 FROM state_versions WHERE state_id = $1 FOR UPDATE`
//    * scoped inside the approval transaction while the parent `states` row is
//    * held under a `SELECT … FOR UPDATE` lock.
//    *
//    * The composite unique index `uq_state_version(state_id, version)` is
//    * the final safety net — a `23505` unique violation on insert signals that
//    * the locking assumption was violated and the caller must retry.
//    */
//   @Column({ type: 'integer' })
//   version!: number;

//   // ─── Denormalised State Snapshot ──────────────────────────────────────────

//   /** State/region code at the time of approval (e.g. 'CA', 'TX'). */
//   @Column({ type: 'varchar', length: 20 })
//   code!: string;

//   /** Display name at the time of approval. */
//   @Column({ type: 'varchar', length: 100 })
//   name!: string;

//   /** URL slug at the time of approval. */
//   @Column({ type: 'varchar', length: 100 })
//   slug!: string;

//   /** Administrative type at the time of approval. */
//   @Column({ type: 'enum', enum: StateType })
//   type!: StateType;

//   // ─── State Transition ─────────────────────────────────────────────────────

//   /** `isActive` value **before** the approved change was applied. */
//   @Column({ name: 'is_active_before', type: 'boolean' })
//   isActiveBefore!: boolean;

//   /** `isActive` value **after** the approved change was applied. */
//   @Column({ name: 'is_active_after', type: 'boolean' })
//   isActiveAfter!: boolean;

//   /**
//    * The approved action — mirrors {@link CountryChangeRequest.action} for
//    * direct querying without a join.
//    */
//   @Column({ type: 'enum', enum: CountryChangeRequestAction })
//   action!: CountryChangeRequestAction;

//   /**
//    * The status of the originating request at the time this snapshot was
//    * written — always `APPROVED` today, but captured explicitly so the table
//    * remains unambiguous if the workflow ever evolves (e.g. auto-approve path).
//    */
//   @Column({
//     name: 'request_status',
//     type: 'enum',
//     enum: CountryChangeRequestStatus,
//     default: CountryChangeRequestStatus.APPROVED,
//   })
//   requestStatus!: CountryChangeRequestStatus;

//   // ─── Context Snapshot ─────────────────────────────────────────────────────

//   /**
//    * The maker's stated reason, duplicated from the change request.
//    *
//    * Storage is cheap. Joining back to a potentially-mutated request row to
//    * answer "why was this changed?" breaks audit integrity.
//    */
//   @Column({ type: 'text' })
//   reason!: string;

//   /**
//    * The cascade policy in effect at approval time, snapshotted from the
//    * change request. Prevents later edits to the request (or future schema
//    * evolution) from silently rewriting history.
//    *
//    * `NULL` for state-level requests (cascade only applies at the country level).
//    */
//   @Column({ name: 'cascade_policy', type: 'jsonb', nullable: true })
//   cascadePolicy!: CascadePolicyOptions | null;

//   // ─── Authorship ───────────────────────────────────────────────────────────

//   /**
//    * The reviewer who approved the change request (checker in maker-checker).
//    * `RESTRICT` on user deletion preserves the audit row.
//    */
//   @Column({ name: 'approved_by', type: 'uuid', nullable: true })
//   approvedById!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'approved_by' })
//   approvedBy!: Relation<User | null>;

//   /**
//    * The user who created the originating change request (maker).
//    * `RESTRICT` on user deletion preserves the audit row.
//    */
//   @Column({ name: 'requested_by', type: 'uuid', nullable: true })
//   requestedById!: string | null;

//   @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'requested_by' })
//   requestedBy!: Relation<User | null>;

//   // ─── Timestamps ───────────────────────────────────────────────────────────

//   /**
//    * The exact moment the change request was approved and this snapshot was
//    * written. Explicit rather than relying on `createdAt ≡ approvalTime`.
//    */
//   @Column({ name: 'approved_at', type: 'timestamptz' })
//   approvedAt!: Date;

//   /**
//    * Wall-clock insert time. There is intentionally **no** `@UpdateDateColumn`;
//    * this row must never be mutated after insert.
//    */
//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;
// }
