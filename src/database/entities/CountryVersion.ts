import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Country } from './Country';
import { type CascadePolicyOptions, CountryChangeRequest } from './CountryChangeRequest';
import { User } from './User';

import type { Relation } from 'typeorm';
import { CountryChangeRequestAction, CountryChangeRequestStatus } from '@/types/enums';

/**
 * Immutable point-in-time snapshot of a {@link Country} row.
 *
 * One row is written (never updated) when a {@link CountryChangeRequest}
 * transitions to APPROVED inside `reviewChangeRequest`. The row captures
 * everything needed to reconstruct or audit the change without any joins:
 *
 *  - denormalised scalar fields at approval time (`code`, `name`, `slug`)
 *  - the before / after `isActive` transition
 *  - the reviewer, maker, reason, and cascade policy from the request
 *  - an explicit `approvedAt` timestamp
 *  - a `previousVersionId` self-reference enabling linked-list traversal
 *
 * ⚠️  IMMUTABILITY
 * This table is append-only. There is intentionally no `@UpdateDateColumn`.
 * Enforce hard immutability at the database level with the trigger below —
 * nobody, not even a DBA with direct psql access, should be able to silently
 * edit a version row:
 *
 * ```sql
 * CREATE OR REPLACE FUNCTION country_versions_immutable()
 * RETURNS trigger LANGUAGE plpgsql AS $$
 * BEGIN
 *   RAISE EXCEPTION
 *     'country_versions rows are immutable (id = %)', OLD.id;
 * END;
 * $$;
 *
 * CREATE TRIGGER trg_country_versions_no_update
 * BEFORE UPDATE ON country_versions
 * FOR EACH ROW EXECUTE FUNCTION country_versions_immutable();
 * ```
 *
 * Indexes
 * ───────
 *  uq_country_version              – enforces monotonic uniqueness per country
 *  idx_country_versions_country_version – primary timeline scan: country + version ORDER
 *  idx_country_versions_request_id – one-to-one join from change request
 *  idx_country_versions_approved_by – audit: who approved what
 *  idx_country_versions_created_at  – range scans by wall-clock time
 */
@Entity('country_versions')
@Check('"version" > 0')
@Check('"code" ~ \'^[A-Z]{2}$\'')
// Enforces that (country, version) is unique — the DB-level guard against
// the COUNT(*)+1 race described in the service.
@Index('uq_country_version', ['countryId', 'version'], { unique: true })
// Covering index for the canonical timeline query:
//   WHERE country_id = ? ORDER BY version DESC
@Index('idx_country_versions_country_version', ['countryId', 'version'])
@Index('idx_country_versions_request_id', ['requestId'], { unique: true })
@Index('idx_country_versions_approved_by', ['approvedById'])
@Index('idx_country_versions_created_at', ['createdAt'])
export class CountryVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ─── Foreign Keys ──────────────────────────────────────────────────────────

  /** The country this snapshot belongs to. */
  @Column({ name: 'country_id', type: 'smallint' })
  countryId!: number;

  @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'country_id' })
  country!: Relation<Country>;

  /**
   * The change request whose approval produced this snapshot.
   *
   * `UNIQUE` — one approval → exactly one version row.
   * `onDelete: RESTRICT` — version rows must not be silently orphaned.
   */
  @Column({ name: 'request_id', type: 'uuid', unique: true, nullable: true })
  requestId!: string | null;

  @ManyToOne(() => CountryChangeRequest, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'request_id' })
  request!: Relation<CountryChangeRequest | null>;

  /**
   * Self-referencing linked-list pointer to the immediately preceding version.
   *
   * `NULL` on v1 (no predecessor).
   * `onDelete: RESTRICT` — if for any reason a predecessor were ever removed,
   * the chain is broken gracefully rather than cascade-deleting newer snapshots.
   *
   * Enables O(1) diff and revert queries:
   *   `SELECT * FROM country_versions WHERE id = $previousVersionId`
   */
  @Column({ name: 'previous_version_id', type: 'uuid', nullable: true })
  previousVersionId!: string | null;

  @ManyToOne(() => CountryVersion, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'previous_version_id' })
  previousVersion!: Relation<CountryVersion | null>;

  // ─── Version Counter ───────────────────────────────────────────────────────

  /**
   * Monotonically increasing per-country version counter (1-based).
   *
   * Computed by the service as:
   *   `SELECT COALESCE(MAX(version), 0) + 1 FROM country_versions WHERE country_id = $1 FOR UPDATE`
   * scoped inside the approval transaction while the parent `countries` row is
   * held under a `SELECT … FOR UPDATE` lock.
   *
   * The composite unique index `uq_country_version(country_id, version)` is
   * the final safety net — a `23505` unique violation on insert signals that
   * the locking assumption was violated and the caller must retry.
   */
  @Column({ type: 'integer' })
  version!: number;

  // ─── Denormalised Country Snapshot ────────────────────────────────────────

  /** ISO 3166-1 Alpha-2 code at the time of approval. */
  @Column({ type: 'char', length: 2 })
  code!: string;

  /** Display name at the time of approval. */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** URL slug at the time of approval. */
  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  // ─── State Transition ─────────────────────────────────────────────────────

  /** `isActive` value **before** the approved change was applied. */
  @Column({ name: 'is_active_before', type: 'boolean' })
  isActiveBefore!: boolean;

  /** `isActive` value **after** the approved change was applied. */
  @Column({ name: 'is_active_after', type: 'boolean' })
  isActiveAfter!: boolean;

  /**
   * The approved action — mirrors {@link CountryChangeRequest.action} for
   * direct querying without a join.
   */
  @Column({ type: 'enum', enum: CountryChangeRequestAction })
  action!: CountryChangeRequestAction;

  /**
   * The status of the originating request at the time this snapshot was
   * written — always `APPROVED` today, but captured explicitly so the table
   * remains unambiguous if the workflow ever evolves (e.g. auto-approve path).
   */
  @Column({
    name: 'request_status',
    type: 'enum',
    enum: CountryChangeRequestStatus,
    default: CountryChangeRequestStatus.APPROVED,
  })
  requestStatus!: CountryChangeRequestStatus;

  // ─── Context Snapshot ─────────────────────────────────────────────────────

  /**
   * The maker's stated reason, duplicated from the change request.
   *
   * Storage is cheap. Joining back to a potentially-mutated request row to
   * answer "why was this changed?" breaks audit integrity.
   */
  @Column({ type: 'text' })
  reason!: string;

  /**
   * The cascade policy in effect at approval time, snapshotted from the
   * change request. Prevents later edits to the request (or future schema
   * evolution) from silently rewriting history.
   */
  @Column({ name: 'cascade_policy', type: 'jsonb', nullable: true })
  cascadePolicy!: CascadePolicyOptions | null;

  // ─── Authorship ───────────────────────────────────────────────────────────

  /**
   * The reviewer who approved the change request (checker in maker-checker).
   * `RESTRICT` on user deletion preserves the audit row.
   */
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approved_by' })
  approvedBy!: Relation<User | null>;

  /**
   * The user who created the originating change request (maker).
   * `RESTRICT` on user deletion preserves the audit row.
   */
  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requestedBy!: Relation<User | null>;

  // ─── Timestamps ───────────────────────────────────────────────────────────

  /**
   * The exact moment the change request was approved and this snapshot was
   * written. Explicit rather than relying on `createdAt ≡ approvalTime`.
   */
  @Column({ name: 'approved_at', type: 'timestamptz' })
  approvedAt!: Date;

  /**
   * Wall-clock insert time. There is intentionally **no** `@UpdateDateColumn`;
   * this row must never be mutated after insert.
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
