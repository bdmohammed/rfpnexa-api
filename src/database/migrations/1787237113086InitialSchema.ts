import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1787237113086 implements MigrationInterface {
  name = 'InitialSchema1787237113086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"analytics_alerts_trigger_condition_enum\" AS ENUM('GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'NOT_EQUAL_TO', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"analytics_alerts_severity_enum\" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"analytics_alerts_source_enum\" AS ENUM('SYSTEM', 'DATABASE', 'APPLICATION', 'SECURITY', 'INTEGRATION')",
    );
    await queryRunner.query(
      'CREATE TABLE "analytics_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "metric_key" character varying(100) NOT NULL, "trigger_condition" "public"."analytics_alerts_trigger_condition_enum" NOT NULL, "actual_value" double precision NOT NULL, "threshold_value" double precision NOT NULL, "severity" "public"."analytics_alerts_severity_enum" NOT NULL DEFAULT \'MEDIUM\', "source" "public"."analytics_alerts_source_enum" NOT NULL DEFAULT \'SYSTEM\', "resolved" boolean NOT NULL DEFAULT false, "resolved_at" TIMESTAMP WITH TIME ZONE, "resolved_by" uuid, "resolved_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0d02d3a6542377ba75b03aed12c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_alerts_metric" ON "analytics_alerts"  ("metric_key") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_alerts_unresolved" ON "analytics_alerts"  ("resolved", "severity", "created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"analytics_events_event_type_enum\" AS ENUM('USER_REGISTERED', 'USER_VERIFIED', 'USER_LOGGED_IN', 'TENDER_CREATED', 'TENDER_PUBLISHED', 'TENDER_AWARDED', 'SUBSCRIPTION_CREATED', 'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED', 'TENDER_DOWNLOADED', 'TENDER_VIEWED', 'PAGE_VIEW', 'SEARCH', 'EXPORT_STARTED')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"analytics_events_source_enum\" AS ENUM('API', 'QUEUE', 'CRON', 'WEBHOOK', 'ADMIN_PANEL', 'SYSTEM')",
    );
    await queryRunner.query(
      'CREATE TABLE "analytics_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_type" "public"."analytics_events_event_type_enum" NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_id" uuid, "entity_type" character varying(100), "entity_id" uuid, "source" "public"."analytics_events_source_enum" NOT NULL DEFAULT \'API\', "request_id" character varying(50), "session_id" character varying(50), "correlation_id" character varying(50), "ip_address" character varying(45), "user_agent" character varying(500), "properties" jsonb NOT NULL DEFAULT \'{}\', CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_events_correlation" ON "analytics_events"  ("correlation_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_events_actor_type_date" ON "analytics_events"  ("actor_id", "event_type", "occurred_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_events_type_date" ON "analytics_events"  ("event_type", "occurred_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"audit_logs_source_enum\" AS ENUM('API', 'QUEUE', 'CRON', 'WEBHOOK', 'ADMIN_PANEL', 'SYSTEM')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"audit_logs_severity_enum\" AS ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"audit_logs_status_enum\" AS ENUM('SUCCESS', 'FAILURE', 'PENDING', 'PARTIAL', 'SKIPPED')",
    );
    await queryRunner.query(
      'CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" "public"."audit_logs_source_enum" NOT NULL DEFAULT \'API\', "endpoint" character varying, "event_id" uuid NOT NULL, "correlation_id" uuid, "actor_id" uuid, "actor_user_id" uuid, "target_user_id" uuid, "actor_email" character varying NOT NULL, "module" character varying NOT NULL, "action" character varying NOT NULL, "entity_type" character varying(100), "entity_id" character varying, "severity" "public"."audit_logs_severity_enum" NOT NULL DEFAULT \'INFO\', "status" "public"."audit_logs_status_enum" NOT NULL DEFAULT \'SUCCESS\', "before" jsonb, "after" jsonb, "metadata" jsonb, "request_id" character varying, "trace_id" character varying, "user_agent" character varying, "ip_address" inet, "session_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs"  ("entity_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_request_id" ON "audit_logs"  ("request_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_correlation_id" ON "audit_logs"  ("correlation_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_severity" ON "audit_logs"  ("severity") ',
    );
    await queryRunner.query('CREATE INDEX "idx_audit_logs_module" ON "audit_logs"  ("module") ');
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_target_user_id" ON "audit_logs"  ("target_user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_actor_user_id" ON "audit_logs"  ("actor_user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"  ("created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"audit_retention_policies_category_enum\" AS ENUM('AUDIT_LOG', 'SECURITY_LOG', 'EXPORT_JOB', 'EMAIL_TOKEN', 'PASSWORD_HISTORY', 'SUPPORT_TICKET')",
    );
    await queryRunner.query(
      'CREATE TABLE "audit_retention_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" "public"."audit_retention_policies_category_enum" NOT NULL, "retention_days" integer NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ab1c341140dd41cc5888dc015d2" UNIQUE ("category"), CONSTRAINT "CHK_ff2c60bafcee0d5bb29c0d352c" CHECK ("retention_days" BETWEEN 1 AND 36500), CONSTRAINT "PK_ea3b2c71ed3fe7286b32b6246e3" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_retention_category_enabled" ON "audit_retention_policies"  ("category", "enabled") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"download_history_download_source_enum\" AS ENUM('USER', 'SYSTEM', 'WEB', 'API', 'EXPORT', 'EMAIL_LINK', 'SCHEDULED_REPORT')",
    );
    await queryRunner.query(
      'CREATE TABLE "download_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "tender_id" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "storage_key" character varying(255), "file_size" bigint NOT NULL, "mime_type" character varying(100), "ip_address" inet, "user_agent" character varying(500), "downloaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "download_source" "public"."download_history_download_source_enum" NOT NULL, CONSTRAINT "CHK_dbd87702b8044868bdd5dcdd5d" CHECK ("file_size" >= 0), CONSTRAINT "PK_7e4f2648a1c62daab122d86dde5" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_downloads_date" ON "download_history"  ("downloaded_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_downloads_tender_date" ON "download_history"  ("tender_id", "downloaded_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_downloads_user_date" ON "download_history"  ("user_id", "downloaded_at") ',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_amendments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "tender_version_id" uuid, "amendment_number" integer NOT NULL, "title" character varying(255), "description" text, "changed_fields" jsonb, "effective_at" TIMESTAMP WITH TIME ZONE, "published_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1b1c715beec867a704d72ff7dc9" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_clarifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_231dd233dea1a3b9874e8c0c08b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_committees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" character varying(50) NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c3dd34a915302c160e26ee90287" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" TIMESTAMP WITH TIME ZONE NOT NULL, "country_id" smallint, "category_id" uuid, "tender_id" uuid, "procurement_type" character varying(100), "created_count" integer NOT NULL DEFAULT \'0\', "published_count" integer NOT NULL DEFAULT \'0\', "awarded_count" integer NOT NULL DEFAULT \'0\', "cancelled_count" integer NOT NULL DEFAULT \'0\', "total_budget" numeric(18,2) NOT NULL DEFAULT \'0\', "average_evaluation_time_seconds" numeric(12,2) NOT NULL DEFAULT \'0\', "average_award_time_seconds" numeric(12,2) NOT NULL DEFAULT \'0\', "bid_count" integer NOT NULL DEFAULT \'0\', "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_37b4308fc3c7ba7628822ad9e2c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_322b11978e8d4e7b296b7dc76b" ON "tender_daily_metrics"  ("date", "country_id", "category_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_c976572173202cbbdc2eea63cf" ON "tender_daily_metrics"  ("date") ',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "status" character varying(50) NOT NULL DEFAULT \'invited\', "resent_at" TIMESTAMP WITH TIME ZONE, "opened_at" TIMESTAMP WITH TIME ZONE, "accepted_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e0d31b1b5b1b405bf197ffa833c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "evaluation_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(30) NOT NULL, "slug" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "description" text, "default_weight" numeric(5,2) NOT NULL DEFAULT \'0\', "max_score" integer NOT NULL DEFAULT \'100\', "display_order" integer NOT NULL DEFAULT \'0\', "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid NOT NULL, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_42e5ce691d135967b6f9050ac36" UNIQUE ("code"), CONSTRAINT "UQ_7f005152bbe44441ccf4f0b2678" UNIQUE ("slug"), CONSTRAINT "UQ_bf334d354b5fd5ebbced3c8f01d" UNIQUE ("name"), CONSTRAINT "CHK_a55e42579fab40947b98adf265" CHECK ("code" ~ \'^[A-Z0-9_-]+$\'), CONSTRAINT "CHK_9905a88d90b91c7a185b92badd" CHECK ("slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'), CONSTRAINT "CHK_27a9f29df539d49f11f21e60bd" CHECK ("max_score" > 0), CONSTRAINT "CHK_7299b2a0e017aac04a290c47df" CHECK ("default_weight" <= 100), CONSTRAINT "CHK_27da6617da39bf51b50a8626fa" CHECK ("default_weight" >= 0), CONSTRAINT "PK_2922d6b4a67b6ced60cec793380" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_participant_id" uuid NOT NULL, "document_version" integer NOT NULL DEFAULT \'1\', "bid_amount_cents" bigint NOT NULL, "technical_proposal_url" text, "financial_proposal_url" text, "status" character varying(50) NOT NULL DEFAULT \'SUBMITTED\', "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a1d483107f934044cc310bc5080" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "participant_id" uuid NOT NULL, "submission_id" uuid, "evaluation_type" character varying(50) NOT NULL, "evaluation_template_id" uuid, "weight" numeric(5,2) NOT NULL DEFAULT \'0\', "score" numeric(5,2) NOT NULL DEFAULT \'0\', "max_score" integer NOT NULL DEFAULT \'100\', "passed" boolean NOT NULL DEFAULT true, "remarks" text, "evaluated_by_id" uuid, "evaluated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c88d57a8d452f2fc7198265a4ed" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "vendor_id" uuid NOT NULL, "status" character varying(50) NOT NULL, "submission_version" integer, "withdrawn_at" TIMESTAMP WITH TIME ZONE, "evaluation_completed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9ec74f64fdb7aa31da560701b7c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "vendor_id" uuid NOT NULL, "question_text" text NOT NULL, "answer_text" text, "is_public" boolean NOT NULL DEFAULT false, "answered_by_id" uuid, "answered_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_57982e7b0f351a4426b7719864a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_watchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "user_id" uuid NOT NULL, "channels" jsonb NOT NULL DEFAULT \'["EMAIL", "IN_APP"]\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7b986206d8360538d4aa89c296d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tenders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_no" character varying NOT NULL, "active_version_id" uuid, "status" character varying(50) NOT NULL DEFAULT \'ACTIVE\', "publication_status" character varying(50) NOT NULL DEFAULT \'UNPUBLISHED\', "bidding_status" character varying(50) NOT NULL DEFAULT \'NOT_OPEN\', "process_status" character varying(50) NOT NULL DEFAULT \'PRE_BIDDING\', "publish_at" TIMESTAMP WITH TIME ZONE, "db_version" integer NOT NULL DEFAULT \'1\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by_id" uuid, CONSTRAINT "UQ_34ff1e94c0ba0a1afe811743a8a" UNIQUE ("reference_no"), CONSTRAINT "PK_13fdd4229818a97b5102199463b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_version_id" uuid NOT NULL, "document_type" character varying(50) NOT NULL, "s3_key" text NOT NULL, "bucket" text NOT NULL, "original_name" text NOT NULL, "mime_type" character varying(150), "file_size" integer, "version" integer NOT NULL DEFAULT \'1\', "checksum" character varying(64), "virus_scan_status" character varying(50) NOT NULL DEFAULT \'Pending\', "is_public" boolean NOT NULL DEFAULT true, "download_count" integer NOT NULL DEFAULT \'0\', "uploaded_by_id" uuid, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_19a19622716a9ad5349f195e582" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_review_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "decision" character varying(50) NOT NULL DEFAULT \'PENDING\', "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ba4b94ee8801fc9b03ac98b130d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_review_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "author_id" uuid NOT NULL, "comment_text" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_759ffb23235820b2c887ac97ef5" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_version_id" uuid NOT NULL, "status" character varying(50) NOT NULL DEFAULT \'assigned\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_02a15ccbc46acff99d15f3d466a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "version" integer NOT NULL DEFAULT \'1\', "status" character varying(50) NOT NULL DEFAULT \'DRAFT\', "db_version" integer NOT NULL DEFAULT \'1\', "title" character varying(400) NOT NULL, "description" text NOT NULL, "procurement_type" character varying(50), "priority" character varying(50) NOT NULL DEFAULT \'Medium\', "estimated_budget" bigint, "currency" character varying(10) NOT NULL DEFAULT \'USD\', "department" character varying(255), "place_id" text, "formatted_address" text, "site_visit_required" boolean NOT NULL DEFAULT false, "site_visit_date" TIMESTAMP WITH TIME ZONE, "site_visit_instructions" text, "contact_person" character varying(255), "contact_designation" character varying(255), "contact_email" character varying(255), "contact_phone" character varying(50), "contact_alternative" character varying(255), "opening_date" TIMESTAMP WITH TIME ZONE, "closing_date" TIMESTAMP WITH TIME ZONE, "bid_validity" integer, "project_duration" character varying(100), "emd_amount" bigint, "security_deposit" bigint, "payment_terms" text, "visibility" character varying(50) NOT NULL DEFAULT \'public\', "evaluation_method" character varying(100), "submission_method" character varying(100), "contract_type" character varying(100), "procurement_method" character varying(100), "eligibility_criteria" text, "special_conditions" text, "category_id" uuid, "state_id" smallint, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_01e37ffa95c037f2adf1a3f0ecc" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"states_type_enum\" AS ENUM('state', 'territory', 'federal')",
    );
    await queryRunner.query(
      'CREATE TABLE "states" ("id" SMALLSERIAL NOT NULL, "code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "type" "public"."states_type_enum" NOT NULL, "country_id" smallint NOT NULL, "display_order" integer NOT NULL DEFAULT \'0\', "created_by" uuid NOT NULL, "updated_by" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_b3d27f398c36fd133e3181bd79" CHECK ("code" = UPPER("code")), CONSTRAINT "PK_09ab30ca0975c02656483265f4f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE UNIQUE INDEX "idx_states_slug" ON "states"  ("slug") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_states_country_id_code" ON "states"  ("country_id", "code") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" TIMESTAMP WITH TIME ZONE NOT NULL, "country_id" smallint, "new_users" integer NOT NULL DEFAULT \'0\', "active_users" integer NOT NULL DEFAULT \'0\', "verified_users" integer NOT NULL DEFAULT \'0\', "blocked_users" integer NOT NULL DEFAULT \'0\', "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cc43f0d98157b12c56c1903b058" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_92e8db9fc520bae642271c597d" ON "user_daily_metrics"  ("date", "country_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_1211ea16bc2c63b2f8765de71b" ON "user_daily_metrics"  ("date") ',
    );
    await queryRunner.query(
      'CREATE TABLE "countries" ("id" SMALLSERIAL NOT NULL, "code" character(2) NOT NULL, "slug" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "display_order" integer NOT NULL DEFAULT \'0\', "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b47cbb5311bad9c9ae17b8c1eda" UNIQUE ("code"), CONSTRAINT "CHK_71746bdfa254c18b143196b70d" CHECK ("slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'), CONSTRAINT "CHK_92cfc2422220a786548dcd1d4c" CHECK ("code" ~ \'^[A-Z]{2}$\'), CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE UNIQUE INDEX "idx_country_slug" ON "countries"  ("slug") ');
    await queryRunner.query(
      'CREATE TABLE "plan_category_pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_version_id" uuid NOT NULL, "category_id" uuid NOT NULL, "price_cents" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1471612b5f442ad23c85f5e3093" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "plan_country_pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_version_id" uuid NOT NULL, "country_id" smallint NOT NULL, "currency" character varying(10) NOT NULL, "price_cents" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_24f12d2706862bb383105c87cb8" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_features_value_type_enum\" AS ENUM('BOOLEAN', 'NUMBER', 'STRING')",
    );
    await queryRunner.query(
      'CREATE TABLE "plan_features" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_version_id" uuid NOT NULL, "feature_key" character varying(100) NOT NULL, "display_name" character varying(150) NOT NULL, "description" text, "value_type" "public"."plan_features_value_type_enum" NOT NULL DEFAULT \'BOOLEAN\', "limit_value" character varying(100) NOT NULL, "display_order" integer NOT NULL DEFAULT \'0\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eb2b32d1d93a8b2e96e122e3a77" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_review_assignments_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'UNDER_REVIEW')",
    );
    await queryRunner.query(
      'CREATE TABLE "plan_review_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "status" "public"."plan_review_assignments_status_enum" NOT NULL DEFAULT \'PENDING\', "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_41bf0afd238f5dd2684a47d1b0c" UNIQUE ("review_id", "reviewer_id"), CONSTRAINT "PK_754388c078a2c239e001c405f56" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_plan_review_assignment_review_status" ON "plan_review_assignments"  ("review_id", "status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_ee2201ae3c00916663df1e890a" ON "plan_review_assignments"  ("reviewer_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_review_comments_action_enum\" AS ENUM('SUBMIT', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'AUTO_EXPIRE')",
    );
    await queryRunner.query(
      'CREATE TABLE "plan_review_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_review_id" uuid NOT NULL, "action" "public"."plan_review_comments_action_enum" NOT NULL, "author_id" uuid NOT NULL, "comment_text" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e7a67b2772251bf0f1993002c23" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_plan_review_comments_author" ON "plan_review_comments"  ("author_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_plan_review_comments_review_created" ON "plan_review_comments"  ("plan_review_id", "created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_reviews_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED')",
    );
    await queryRunner.query(
      'CREATE TABLE "plan_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "plan_version_id" uuid NOT NULL, "status" "public"."plan_reviews_status_enum" NOT NULL DEFAULT \'PENDING\', "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_156728cf593bc21a68c5e03aa9f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_plan_review_pending" ON "plan_reviews"  ("plan_version_id") WHERE "status" = \'PENDING\'',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_153818f75a38884e5976add759" ON "plan_reviews"  ("plan_version_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_versions_status_enum\" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'SUBMITTED', 'UNDER_REVIEW')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"plan_versions_plan_type_enum\" AS ENUM('all-access', 'state', 'country', 'category', 'bundle')",
    );
    await queryRunner.query(
      'CREATE TABLE "plan_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "version" integer NOT NULL DEFAULT \'1\', "status" "public"."plan_versions_status_enum" NOT NULL, "name" character varying(80) NOT NULL, "subtitle" character varying(255), "description" text, "price_cents" integer NOT NULL, "currency" character varying(10) NOT NULL DEFAULT \'USD\', "duration_days" integer NOT NULL, "trial_days" integer NOT NULL DEFAULT \'0\', "setup_fee_cents" integer NOT NULL DEFAULT \'0\', "is_recurring" boolean NOT NULL DEFAULT true, "is_featured" boolean NOT NULL DEFAULT false, "badge" character varying(50), "plan_type" "public"."plan_versions_plan_type_enum" NOT NULL DEFAULT \'all-access\', "target_state_id" smallint, "target_country" character varying(100), "target_category_id" uuid, "bundle_size" integer, "locked_by" uuid, "locked_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_402d8332afa558de09cab3edebc" UNIQUE ("plan_id", "version"), CONSTRAINT "PK_dd2f605d45f2679a86a7c1c5b20" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_plan_versions_active" ON "plan_versions"  ("plan_id") WHERE "status" = \'APPROVED\'',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_plan_versions_status" ON "plan_versions"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_plan_versions_plan_id" ON "plan_versions"  ("plan_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "subscription_daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" TIMESTAMP WITH TIME ZONE NOT NULL, "plan_id" uuid, "currency" character varying(10) NOT NULL DEFAULT \'USD\', "active_count" integer NOT NULL DEFAULT \'0\', "expired_count" integer NOT NULL DEFAULT \'0\', "cancelled_count" integer NOT NULL DEFAULT \'0\', "revenue_cents" bigint NOT NULL DEFAULT \'0\', "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e366b23668b8b503c388f8f9887" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_1c9514eedf2fedb20e3aafd5a4" ON "subscription_daily_metrics"  ("date", "plan_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_745cc7ba55446d13707c103d94" ON "subscription_daily_metrics"  ("date") ',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."plans_status_enum" AS ENUM(\'ACTIVE\', \'ARCHIVED\')',
    );
    await queryRunner.query(
      'CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_no" character varying(100) NOT NULL, "active_version_id" uuid, "status" "public"."plans_status_enum" NOT NULL DEFAULT \'ACTIVE\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bcf36850b7c2bab5cffc8c69404" UNIQUE ("reference_no"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"coupons_discount_type_enum\" AS ENUM('PERCENTAGE', 'FIXED', 'FREE_MONTH', 'TRIAL_EXTENSION')",
    );
    await queryRunner.query(
      'CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "description" text, "code" character varying(50) NOT NULL, "discount_type" "public"."coupons_discount_type_enum" NOT NULL, "discount_value" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "max_redemptions" integer, "redemption_count" integer NOT NULL DEFAULT \'0\', "max_redemptions_per_user" integer, "min_purchase_cents" integer, "max_discount_cents" integer, "first_purchase_only" boolean NOT NULL DEFAULT false, "is_recurring" boolean NOT NULL DEFAULT false, "valid_from" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "CHK_75732b11eafc5b9cd67f77355e" CHECK ("max_redemptions_per_user" >= 1), CONSTRAINT "CHK_9be7f24d8e7f37a571604c39f1" CHECK ("max_redemptions" >= 1), CONSTRAINT "CHK_02a38272c8c9b6ad3f8bbfe895" CHECK ("max_discount_cents" >= 0), CONSTRAINT "CHK_b60b8fb465d09417e71bd0567e" CHECK ("min_purchase_cents" >= 0), CONSTRAINT "CHK_9ea32e48176b46c7d4fa668312" CHECK ("discount_value" >= 0), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "idx_coupons_active" ON "coupons"  ("is_active") ');
    await queryRunner.query(
      'CREATE INDEX "idx_coupons_validity" ON "coupons"  ("valid_from", "expires_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"email_tokens_type_enum\" AS ENUM('email_verification', 'password_reset', 'email_change', 'system_owner_approval')",
    );
    await queryRunner.query(
      'CREATE TABLE "email_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "type" "public"."email_tokens_type_enum" NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_08abb3fa348e894c274a6730d35" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "email_tokens_type_idx" ON "email_tokens"  ("type") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_email_tokens_active" ON "email_tokens"  ("user_id", "type") WHERE "used_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_email_tokens_hash" ON "email_tokens"  ("token_hash") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_email_tokens_lookup" ON "email_tokens"  ("token_hash", "type", "expires_at") WHERE "used_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_email_tokens_unused" ON "email_tokens"  ("user_id", "type") WHERE "used_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_email_tokens_user_id" ON "email_tokens"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"export_jobs_status_enum\" AS ENUM('PENDING', 'RUNNING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"export_jobs_export_type_enum\" AS ENUM('tender', 'users', 'subscriptions', 'financial')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"export_jobs_format_enum\" AS ENUM('csv', 'xlsx', 'pdf', 'json')",
    );
    await queryRunner.query(
      'CREATE TABLE "export_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "status" "public"."export_jobs_status_enum" NOT NULL, "progress" integer NOT NULL DEFAULT \'0\', "export_type" "public"."export_jobs_export_type_enum" NOT NULL, "format" "public"."export_jobs_format_enum" NOT NULL, "filters" jsonb NOT NULL DEFAULT \'{}\'::jsonb, "storage_key" character varying(255), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expired_at" TIMESTAMP WITH TIME ZONE, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "download_count" integer NOT NULL DEFAULT \'0\', "last_downloaded_at" TIMESTAMP WITH TIME ZONE, "file_name" character varying(255), "file_size_bytes" bigint, "mime_type" character varying(100), "queue_name" character varying(100), "job_id" character varying(100), "retry_count" integer NOT NULL DEFAULT \'0\', "error_message" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_85dcdea4e8e4a3d52ec9627709" CHECK ("progress" BETWEEN 0 AND 100), CONSTRAINT "PK_3044ce6f1c6af24058ee609e063" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_export_jobs_status_created" ON "export_jobs"  ("status", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_export_jobs_expires_at" ON "export_jobs"  ("expires_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_export_jobs_created_at" ON "export_jobs"  ("created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_export_jobs_user_id" ON "export_jobs"  ("user_id") ',
    );
    await queryRunner.query('CREATE INDEX "idx_export_jobs_status" ON "export_jobs"  ("status") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"feature_catalog_value_type_enum\" AS ENUM('BOOLEAN', 'NUMBER', 'STRING')",
    );
    await queryRunner.query(
      'CREATE TABLE "feature_catalog" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "feature_key" character varying(100) NOT NULL, "slug" character varying(150) NOT NULL, "display_name" character varying(150) NOT NULL, "description" text, "category" character varying(100) NOT NULL, "value_type" "public"."feature_catalog_value_type_enum" NOT NULL DEFAULT \'BOOLEAN\', "default_value" character varying(100), "display_order" integer NOT NULL DEFAULT \'0\', "is_system" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4934012902235b91f2d2ebf5839" UNIQUE ("feature_key"), CONSTRAINT "UQ_2de2bbec629333b9162e6a64292" UNIQUE ("slug"), CONSTRAINT "CHK_0968d15f3fc41603cab1e0950c" CHECK ("slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'), CONSTRAINT "CHK_96726a8ad1e473dc7ce08cc775" CHECK ("feature_key" ~ \'^[a-z0-9_.-]+$\'), CONSTRAINT "PK_b3281f97f0c4e6bdfab506b82c0" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notification_actions_type_enum\" AS ENUM('REDIRECT', 'API_POST', 'MODAL', 'DOWNLOAD', 'APPROVE', 'REJECT', 'TENDER_APPROVE', 'TENDER_REJECT', 'TENDER_PUBLISH', 'TENDER_ARCHIVE', 'ROLE_APPROVE', 'ROLE_REJECT', 'ROLE_PUBLISH', 'ROLE_ARCHIVE')",
    );
    await queryRunner.query(
      'CREATE TABLE "notification_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "notification_id" uuid NOT NULL, "label" character varying(100) NOT NULL, "type" "public"."notification_actions_type_enum" NOT NULL, "payload" jsonb, "required_permission_key" character varying(100), "btn_order" integer NOT NULL DEFAULT \'0\', CONSTRAINT "PK_83a884edb9b560068dd4a5eb44f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"role_review_assignments_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'UNDER_REVIEW')",
    );
    await queryRunner.query(
      'CREATE TABLE "role_review_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "assigned_by" uuid, "status" "public"."role_review_assignments_status_enum" NOT NULL DEFAULT \'PENDING\', "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_03e8f662f1fd3fa889b4d6d4912" UNIQUE ("review_id", "reviewer_id"), CONSTRAINT "PK_65814a46310afb9eba1211ac70d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_review_assignment_review_status" ON "role_review_assignments"  ("review_id", "status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_569a853d8e8bad87636d4b93ed" ON "role_review_assignments"  ("reviewer_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"role_review_comments_action_enum\" AS ENUM('SUBMIT', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'AUTO_EXPIRE')",
    );
    await queryRunner.query(
      'CREATE TABLE "role_review_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "user_id" uuid, "action" "public"."role_review_comments_action_enum" NOT NULL, "comment" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "edited_at" TIMESTAMP WITH TIME ZONE, "parent_comment_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4decac4b20f7574b0cf5f434cd7" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_review_comments_review_id" ON "role_review_comments"  ("review_id", "created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"role_reviews_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED')",
    );
    await queryRunner.query(
      'CREATE TABLE "role_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "role_version_id" uuid NOT NULL, "status" "public"."role_reviews_status_enum" NOT NULL DEFAULT \'PENDING\', "submitted_by" uuid, "submitted_at" TIMESTAMP WITH TIME ZONE, "decision_comment" text, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9ab356ed69224d31e47a4bc0086" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_reviews_status" ON "role_reviews"  ("status") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_role_review_pending" ON "role_reviews"  ("role_version_id") WHERE "status" = \'PENDING\'',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_7ab98eed4654a8dc334bdb26df" ON "role_reviews"  ("role_version_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "role_version_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_version_id" uuid NOT NULL, "permission_key" character varying(100) NOT NULL, "permission_name" character varying(100) NOT NULL, "module_slug" character varying(100) NOT NULL, "module_name" character varying(100) NOT NULL, CONSTRAINT "UQ_93d65907c7b1bf91ada6bacb2fc" UNIQUE ("role_version_id", "permission_key"), CONSTRAINT "PK_bc4f679c5ac7a2f123da1fb8d8b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_7bb7755fb8558ec976d581b119" ON "role_version_permissions"  ("role_version_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"role_versions_status_enum\" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REOPENED', 'SUPERSEDED')",
    );
    await queryRunner.query(
      'CREATE TABLE "role_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "version" integer NOT NULL DEFAULT \'1\', "version_number" character varying(20) NOT NULL DEFAULT \'0.1\', "revision" integer NOT NULL DEFAULT \'1\', "name" character varying(100) NOT NULL, "description" text NOT NULL, "status" "public"."role_versions_status_enum" NOT NULL, "locked_by" uuid, "locked_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0c61b84b6f29dadaf33236eb7af" UNIQUE ("role_id", "version"), CONSTRAINT "PK_1ab373ec781c9cc06a1ed2ef204" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_role_versions_active" ON "role_versions"  ("role_id") WHERE "status" = \'APPROVED\'',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_versions_status" ON "role_versions"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_versions_role_id" ON "role_versions"  ("role_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" character varying(50) NOT NULL DEFAULT \'ACTIVE\', "reviewer_id" uuid, "reason" text, "comment" text, "effective_at" TIMESTAMP WITH TIME ZONE, "assigned_by" uuid, CONSTRAINT "UQ_23ed6f04fe43066df08379fd034" UNIQUE ("user_id", "role_id"), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles"  ("role_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"roles_status_enum\" AS ENUM('ACTIVE', 'DISABLED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "status" "public"."roles_status_enum" NOT NULL DEFAULT \'DISABLED\', "is_system_role" boolean NOT NULL DEFAULT false, "is_default_role" boolean NOT NULL DEFAULT false, "active_version_id" uuid, "published_version_number" character varying(20), "latest_draft_version_number" character varying(20), "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a87cf0659c3ac379b339acf36a2" UNIQUE ("key"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE UNIQUE INDEX "roles_key_idx" ON "roles"  ("key") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_default_role" ON "roles"  ("is_default_role") WHERE "is_default_role" = true',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_roles_is_default_role" ON "roles"  ("is_default_role") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_roles_is_system_role" ON "roles"  ("is_system_role") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_roles_active_version_id" ON "roles"  ("active_version_id") ',
    );
    await queryRunner.query('CREATE INDEX "idx_roles_status" ON "roles"  ("status") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notification_recipients_status_enum\" AS ENUM('UNREAD', 'READ', 'ARCHIVED', 'DISMISSED')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notification_recipients_channel_enum\" AS ENUM('IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WEBHOOK')",
    );
    await queryRunner.query(
      'CREATE TABLE "notification_recipients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "notification_id" uuid NOT NULL, "user_id" uuid, "role_id" uuid, "group_name" character varying(100), "status" "public"."notification_recipients_status_enum" NOT NULL DEFAULT \'UNREAD\', "channel" "public"."notification_recipients_channel_enum" NOT NULL DEFAULT \'IN_APP\', "delivered_at" TIMESTAMP WITH TIME ZONE, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bd5b25c456987261a38c762b223" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_recipients_role_status_date" ON "notification_recipients"  ("role_id", "status", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_recipients_user_status_date" ON "notification_recipients"  ("user_id", "status", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_recipients_status" ON "notification_recipients"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_recipients_role_id" ON "notification_recipients"  ("role_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_recipients_user_id" ON "notification_recipients"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notifications_category_enum\" AS ENUM('SYSTEM', 'TENDER', 'BILLING', 'SECURITY', 'WORKSPACE', 'REVIEW', 'ROLE')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notifications_severity_enum\" AS ENUM('INFO', 'WARNING', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW')",
    );
    await queryRunner.query(
      'CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" "public"."notifications_category_enum" NOT NULL, "severity" "public"."notifications_severity_enum" NOT NULL, "title" text NOT NULL, "message" text NOT NULL, "entity_type" character varying(100), "entity_id" character varying(100), "expires_at" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT true, "sender_id" uuid, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "password_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3b3ab30d6152c933113c9534442" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_password_histories_user_created" ON "password_histories"  ("user_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE TABLE "permission_modules" ("id" SMALLSERIAL NOT NULL, "name" character varying(100) NOT NULL, "key" character varying(100) NOT NULL, "display_order" integer NOT NULL DEFAULT \'0\', "description" text, "is_system_module" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "UQ_5bc3f92e83cad36d72e101d7795" UNIQUE ("key"), CONSTRAINT "PK_5c48abacc03bd94e1d0b52a96ad" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_5bc3f92e83cad36d72e101d779" ON "permission_modules"  ("key") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"permissions_action_enum\" AS ENUM('view', 'create', 'update', 'delete', 'approve', 'reject', 'publish', 'unpublish', 'archive', 'unarchive', 'restore', 'export', 'import', 'manage', 'custom', 'review', 'assign', 'compare', 'audit_view', 'block', 'unblock', 'remove', 'suspend', 'unsuspend', 'activate', 'deactivate')",
    );
    await queryRunner.query(
      'CREATE TABLE "permissions" ("id" SMALLSERIAL NOT NULL, "module_id" smallint NOT NULL, "name" character varying(100) NOT NULL, "key" character varying(100) NOT NULL, "action" "public"."permissions_action_enum" NOT NULL, "description" text, "display_order" integer NOT NULL DEFAULT \'0\', "is_active" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "UQ_017943867ed5ceef9c03edd9745" UNIQUE ("key"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "permissions_module_id_idx" ON "permissions"  ("module_id") ',
    );
    await queryRunner.query('CREATE INDEX "permissions_key_idx" ON "permissions"  ("key") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"scheduled_report_recipients_recipient_type_enum\" AS ENUM('user', 'role', 'email', 'webhook')",
    );
    await queryRunner.query(
      'CREATE TABLE "scheduled_report_recipients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "report_id" uuid NOT NULL, "recipient_type" "public"."scheduled_report_recipients_recipient_type_enum" NOT NULL, "recipient_id" uuid, "email" character varying(255), "webhook" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_810d6fe66014406f2c20a110f16" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_report_recipients_webhook" ON "scheduled_report_recipients"  ("report_id", "recipient_type", "webhook") WHERE "webhook" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_report_recipients_email" ON "scheduled_report_recipients"  ("report_id", "recipient_type", "email") WHERE "email" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_report_recipients_user_role" ON "scheduled_report_recipients"  ("report_id", "recipient_type", "recipient_id") WHERE "recipient_id" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_report_recipients_report_id" ON "scheduled_report_recipients"  ("report_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"scheduled_reports_report_type_enum\" AS ENUM('tender', 'users', 'subscriptions')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"scheduled_reports_frequency_enum\" AS ENUM('daily', 'weekly', 'monthly', 'cron')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"scheduled_reports_format_enum\" AS ENUM('pdf', 'csv', 'xlsx')",
    );
    await queryRunner.query(
      'CREATE TABLE "scheduled_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "report_name" character varying(150) NOT NULL, "report_type" "public"."scheduled_reports_report_type_enum" NOT NULL, "frequency" "public"."scheduled_reports_frequency_enum" NOT NULL, "cron_expression" character varying(100), "timezone" character varying(100) NOT NULL DEFAULT \'UTC\', "filters" jsonb NOT NULL DEFAULT \'{}\'::jsonb, "format" "public"."scheduled_reports_format_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_run_at" TIMESTAMP WITH TIME ZONE, "last_success_at" TIMESTAMP WITH TIME ZONE, "next_run_at" TIMESTAMP WITH TIME ZONE, "failure_count" integer NOT NULL DEFAULT \'0\', "last_error" text, "created_by" uuid NOT NULL, "updated_by" uuid, "locked_by" character varying(100), "locked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4e9443d4280f94e84c7349300a6" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_scheduled_reports_active_next_run" ON "scheduled_reports"  ("is_active", "next_run_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_18ab8c00fc442d070cedb3b8da" ON "scheduled_reports"  ("next_run_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"subscriptions_status_enum\" AS ENUM('active', 'expired', 'cancelled')",
    );
    await queryRunner.query(
      'CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "plan_version_id" uuid NOT NULL, "coupon_id" uuid, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT \'active\', "paypal_subscription_id" character varying, "paypal_order_id" character varying, "target_state_id" smallint, "target_country" character varying(100), "target_category_id" uuid, "selected_category_ids" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_subs_end_status" ON "subscriptions"  ("end_date", "status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_subs_user_status" ON "subscriptions"  ("user_id", "status") ',
    );
    await queryRunner.query(
      'CREATE TABLE "support_ticket_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message_id" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "storage_key" character varying(512) NOT NULL, "mime_type" character varying(100) NOT NULL, "size" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6676c11571dc3f34915b8835083" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ticket_attachments_message_id" ON "support_ticket_attachments"  ("message_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "support_ticket_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "sender_id" uuid, "message" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "is_system" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c3e561853b6b303f74fde5a3e1f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ticket_messages_sender_id" ON "support_ticket_messages"  ("sender_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ticket_messages_ticket_created" ON "support_ticket_messages"  ("ticket_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ticket_messages_ticket_id" ON "support_ticket_messages"  ("ticket_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"support_tickets_status_enum\" AS ENUM('open', 'in_progress', 'resolved', 'closed')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"support_tickets_priority_enum\" AS ENUM('low', 'medium', 'high', 'urgent')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"support_tickets_category_enum\" AS ENUM('billing', 'technical', 'tender', 'account', 'subscription')",
    );
    await queryRunner.query(
      'CREATE TABLE "support_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "subject" character varying(255) NOT NULL, "status" "public"."support_tickets_status_enum" NOT NULL DEFAULT \'open\', "priority" "public"."support_tickets_priority_enum" NOT NULL DEFAULT \'medium\', "category" "public"."support_tickets_category_enum" NOT NULL DEFAULT \'technical\', "updated_by" uuid NOT NULL, "assigned_to_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "closed_at" TIMESTAMP WITH TIME ZONE, "last_reply_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_0f2eee457514f4f92d4e1b911a" CHECK ("status" <> \'closed\' OR "closed_at" IS NOT NULL), CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_support_tickets_status_assigned" ON "support_tickets"  ("status", "assigned_to_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_support_tickets_assigned_to_id" ON "support_tickets"  ("assigned_to_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_support_tickets_status" ON "support_tickets"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_support_tickets_user_id" ON "support_tickets"  ("user_id") ',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."transactions_type_enum" AS ENUM(\'subscription\', \'per_tender\')',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"transactions_status_enum\" AS ENUM('created', 'success', 'failed', 'refunded')",
    );
    await queryRunner.query(
      'CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "amount_cents" integer NOT NULL, "currency" character varying(10) NOT NULL DEFAULT \'usd\', "type" "public"."transactions_type_enum" NOT NULL, "reference_id" character varying, "reference_type" character varying(100), "provider" character varying(100) NOT NULL DEFAULT \'paypal\', "provider_transaction_id" character varying(255) NOT NULL, "provider_reference_id" character varying(255), "status" "public"."transactions_status_enum" NOT NULL DEFAULT \'created\', "invoice_storage_key" character varying(255), "billing_snapshot" jsonb, "provider_response" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_txn_provider_trans_id" ON "transactions"  ("provider_transaction_id") ',
    );
    await queryRunner.query('CREATE INDEX "idx_txn_type" ON "transactions"  ("type") ');
    await queryRunner.query('CREATE INDEX "idx_txn_status" ON "transactions"  ("status") ');
    await queryRunner.query(
      'CREATE INDEX "idx_txn_user_created" ON "transactions"  ("user_id", "created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"user_dashboard_layouts_theme_enum\" AS ENUM('default', 'light', 'dark')",
    );
    await queryRunner.query(
      'CREATE TABLE "user_dashboard_layouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "widgets" jsonb NOT NULL DEFAULT \'[]\'::jsonb, "filters" jsonb NOT NULL DEFAULT \'{}\'::jsonb, "theme" "public"."user_dashboard_layouts_theme_enum" NOT NULL DEFAULT \'default\', "layout_version" integer NOT NULL DEFAULT \'1\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_00e515c96b66eb5b283e6bcb8f" UNIQUE ("user_id"), CONSTRAINT "PK_f30c52e21f7793c3cc77d7be5f2" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_user_dashboard_layouts_user_id" ON "user_dashboard_layouts"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"users_account_type_enum\" AS ENUM('user', 'admin', 'system')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"users_status_enum\" AS ENUM('pending_email_verification', 'pending_approval', 'pending_review', 'active', 'rejected', 'suspended', 'deactivated', 'archived', 'BLOCKED', 'rejected_by_admin', 'APPROVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "country_id" smallint NOT NULL, "password_hash" character varying(255) NOT NULL, "account_type" "public"."users_account_type_enum" NOT NULL DEFAULT \'user\', "company_name" character varying(160) NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "is_blocked" boolean NOT NULL DEFAULT false, "status" "public"."users_status_enum" NOT NULL DEFAULT \'pending_email_verification\', "token_version" integer NOT NULL DEFAULT \'1\', "failed_login_attempts" integer NOT NULL DEFAULT \'0\', "lockout_until" TIMESTAMP WITH TIME ZONE, "password_changed_at" TIMESTAMP WITH TIME ZONE, "must_reset_password" boolean NOT NULL DEFAULT false, "pending_email" character varying(255), "avatar_url" character varying(255), "notification_preferences" jsonb NOT NULL DEFAULT \'{"email":true,"push":true,"sms":false,"marketing":false,"security":true,"tender":true,"newsletter":false}\', "last_login_at" TIMESTAMP WITH TIME ZONE, "email_changed_at" TIMESTAMP WITH TIME ZONE, "google_id" character varying(255), "github_id" character varying(255), "microsoft_id" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_d9e51230250cdfa9d5de11cfabb" UNIQUE ("pending_email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_0bd5012aeb82628e07f6a1be53" ON "users"  ("google_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_09a2296ade1053a0cc4080bda4" ON "users"  ("github_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_a5711ddc02238171575201a080" ON "users"  ("microsoft_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_ef8320c2a2c72852adda5d68c5" ON "users"  ("account_type", "status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_7168f7c9863744429de421cad1" ON "users"  ("account_type") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"category_review_assignments_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'UNDER_REVIEW')",
    );
    await queryRunner.query(
      'CREATE TABLE "category_review_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "status" "public"."category_review_assignments_status_enum" NOT NULL DEFAULT \'PENDING\', "assigned_by" uuid, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "responded_at" TIMESTAMP WITH TIME ZONE, "response_comment" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_75337b38b6aff4e6d3a580a9a97" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_ddd8f35ca959341682710c6b6d" ON "category_review_assignments"  ("review_id", "reviewer_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"category_review_comments_action_enum\" AS ENUM('SUBMIT', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'AUTO_EXPIRE')",
    );
    await queryRunner.query(
      'CREATE TABLE "category_review_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_review_id" uuid NOT NULL, "user_id" uuid NOT NULL, "comment" text NOT NULL, "action" "public"."category_review_comments_action_enum" NOT NULL DEFAULT \'SUBMIT\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_23ca623dfe42d4a5bba19280d89" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_7032ff6b4cae3c085ec13a29d1" ON "category_review_comments"  ("category_review_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"category_reviews_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED')",
    );
    await queryRunner.query(
      'CREATE TABLE "category_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "category_version_id" uuid NOT NULL, "status" "public"."category_reviews_status_enum" NOT NULL DEFAULT \'PENDING\', "submitted_by" uuid, "submitted_at" TIMESTAMP WITH TIME ZONE, "decision_comment" text, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_db6d42d742f1b0a0be064cff63b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_category_reviews_status" ON "category_reviews"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_337b3954e7f0d5be042af61320" ON "category_reviews"  ("category_version_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"category_versions_status_enum\" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'PUBLISHED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "category_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "major_version" integer NOT NULL DEFAULT \'0\', "minor_version" integer NOT NULL DEFAULT \'1\', "version" integer NOT NULL DEFAULT \'1\', "version_number" character varying(20) NOT NULL DEFAULT \'0.1\', "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "description" text, "parent_category_id" uuid, "display_order" integer NOT NULL DEFAULT \'0\', "icon" character varying(50), "color" character varying(50), "status" "public"."category_versions_status_enum" NOT NULL DEFAULT \'DRAFT\', "created_by" uuid, "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_df043ab71eec307531e5c3eeb19" UNIQUE ("category_id", "version"), CONSTRAINT "PK_632cb2ce86836ba9dcd65c79f3b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_category_versions_status" ON "category_versions"  ("status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_category_versions_category_id" ON "category_versions"  ("category_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "category_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "category_version_id" uuid, "actor_id" uuid NOT NULL, "event" character varying(50) NOT NULL, "details" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_508dfba6b57b1d855c76cd4d165" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_731269ee5a4546d7858ad77a06" ON "category_activities"  ("category_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"categories_status_enum\" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(10) NOT NULL, "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "status" "public"."categories_status_enum" NOT NULL DEFAULT \'PUBLISHED\', "active_version_id" uuid, "is_deleted" boolean NOT NULL DEFAULT false, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "CHK_18d2161c11ae6ecf5ab649be95" CHECK ("code" ~ \'^[0-9]{3}$\'), CONSTRAINT "CHK_2a27bc1ae15887f56e3cbe4649" CHECK ("slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "idx_categories_status" ON "categories"  ("status") ');
    await queryRunner.query('CREATE INDEX "idx_categories_active" ON "categories"  ("is_active") ');
    await queryRunner.query('CREATE UNIQUE INDEX "idx_categories_slug" ON "categories"  ("slug") ');
    await queryRunner.query(
      'CREATE TYPE "public"."alert_preferences_frequency_enum" AS ENUM(\'daily\', \'weekly\')',
    );
    await queryRunner.query(
      'CREATE TABLE "alert_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_id" uuid, "state_id" smallint, "keyword" character varying(150), "is_active" boolean NOT NULL DEFAULT true, "frequency" "public"."alert_preferences_frequency_enum" NOT NULL DEFAULT \'daily\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_sent_at" TIMESTAMP WITH TIME ZONE, "email_sent_count" integer NOT NULL DEFAULT \'0\', CONSTRAINT "UQ_c66e4386964a5e244633a3bc514" UNIQUE ("user_id", "category_id", "state_id", "keyword"), CONSTRAINT "PK_8cb530172b4bcbf758f31e2d11d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_alert_preferences_user_frequency" ON "alert_preferences"  ("user_id", "frequency") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_alert_preferences_frequency" ON "alert_preferences"  ("frequency") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_alert_preferences_state" ON "alert_preferences"  ("state_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_alert_preferences_category" ON "alert_preferences"  ("category_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_alert_preferences_user" ON "alert_preferences"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"country_change_request_assignments_status_enum\" AS ENUM('PENDING', 'CLAIMED', 'COMPLETED', 'CANCELLED')",
    );
    await queryRunner.query(
      'CREATE TABLE "country_change_request_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "status" "public"."country_change_request_assignments_status_enum" NOT NULL DEFAULT \'PENDING\', "assigned_by_id" uuid, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "responded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1c4bb46c46261785abafdce9c7a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_13567c18620e1519d010a0bdd8" ON "country_change_request_assignments"  ("request_id", "reviewer_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"country_change_request_comments_type_enum\" AS ENUM('GENERAL', 'REVIEW', 'SYSTEM', 'MENTION')",
    );
    await queryRunner.query(
      'CREATE TABLE "country_change_request_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "author_id" uuid NOT NULL, "type" "public"."country_change_request_comments_type_enum" NOT NULL DEFAULT \'GENERAL\', "content" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6468cdb2cd30142ce6a2f61ba56" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e741539753c80463bd2d23d6ef" ON "country_change_request_comments"  ("request_id") ',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."country_change_requests_target_type_enum" AS ENUM(\'COUNTRY\', \'STATE\')',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."country_change_requests_action_enum" AS ENUM(\'ACTIVATE\', \'DEACTIVATE\')',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"country_change_requests_status_enum\" AS ENUM('DRAFT', 'READY_FOR_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')",
    );
    await queryRunner.query(
      'CREATE TABLE "country_change_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_sequence" SERIAL NOT NULL, "request_number" character varying(50) NOT NULL, "target_type" "public"."country_change_requests_target_type_enum" NOT NULL, "country_id" smallint NOT NULL, "state_id" smallint, "action" "public"."country_change_requests_action_enum" NOT NULL, "status" "public"."country_change_requests_status_enum" NOT NULL DEFAULT \'READY_FOR_REVIEW\', "requested_by_id" uuid NOT NULL, "reason" text NOT NULL, "cascade_policy" jsonb NOT NULL DEFAULT \'{"disableStates": true, "disableTenders": true, "disableCategories": false, "hideFromSearch": true, "notifySuppliers": true}\'::jsonb, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0252e4df3c832eb54472425c76b" UNIQUE ("request_number"), CONSTRAINT "PK_6cfd7490d1a6720cc5563b303f0" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_3f7d3c1e60c7d3c8c342134361" ON "country_change_requests"  ("target_type", "country_id", "state_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"country_activities_actor_type_enum\" AS ENUM('SYSTEM', 'USER', 'JOB', 'API')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"country_activities_event_type_enum\" AS ENUM('SEEDED', 'ACTIVATED', 'DEACTIVATED', 'REQUEST_CREATED', 'REVIEWER_ASSIGNED', 'COMMENT_ADDED', 'APPROVED', 'REJECTED', 'CASCADE_EXECUTED')",
    );
    await queryRunner.query(
      'CREATE TABLE "country_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "country_id" smallint NOT NULL, "state_id" smallint, "request_id" uuid, "actor_id" uuid, "actor_type" "public"."country_activities_actor_type_enum" NOT NULL DEFAULT \'USER\', "event_type" "public"."country_activities_event_type_enum" NOT NULL, "title" character varying(150) NOT NULL, "description" text, "old_value" jsonb, "new_value" jsonb, "metadata" jsonb, "ip_address" character varying(45), "user_agent" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a58b1666782b1c298526126a097" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_state_seed_event" ON "country_activities"  ("state_id") WHERE "event_type" = \'SEEDED\'',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_country_seed_event" ON "country_activities"  ("country_id") WHERE "state_id" IS NULL AND "event_type" = \'SEEDED\'',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_f715406bfad5ac865c9743bc15" ON "country_activities"  ("event_type") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_9e61aa8dad872cdcab16b8d804" ON "country_activities"  ("request_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_0db9750ef5c3b86b7037c539cc" ON "country_activities"  ("request_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_1c7dec593b8b088def83993689" ON "country_activities"  ("state_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_1950c37c8beb54f409bb8097de" ON "country_activities"  ("country_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE TABLE "purchased_tenders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "tender_id" uuid NOT NULL, "transaction_id" uuid NOT NULL, "purchased_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_purchased_tenders_user_tender" UNIQUE ("user_id", "tender_id"), CONSTRAINT "PK_4de62bddbd00f86a4d9cc007c93" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"role_activities_activity_type_enum\" AS ENUM('ROLE_CREATED', 'ROLE_UPDATED', 'PERMISSION_ADDED', 'PERMISSION_REMOVED', 'REVIEW_ASSIGNED', 'COMMENT_ADDED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'ARCHIVED', 'RESTORED')",
    );
    await queryRunner.query(
      'CREATE TABLE "role_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "role_version_id" uuid, "user_id" uuid NOT NULL, "activity_type" "public"."role_activities_activity_type_enum" NOT NULL, "old_value" jsonb, "new_value" jsonb, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_30aa5312c7f09937d1919f05981" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_activities_created_at" ON "role_activities"  ("created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_activities_user_id" ON "role_activities"  ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_role_activities_role_id" ON "role_activities"  ("role_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"security_logs_source_enum\" AS ENUM('API', 'QUEUE', 'CRON', 'WEBHOOK', 'ADMIN_PANEL', 'SYSTEM')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"security_logs_event_enum\" AS ENUM('LOGIN_SUCCESS', 'user_login', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_IGNORED', 'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'TOKEN_REFRESHED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'PROFILE_UPDATED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'ACCOUNT_DELETE_REQUESTED', 'RESEND_VERIFICATION_SUCCESS', 'RESEND_VERIFICATION_IGNORED', 'REGISTER_SUCCESS', 'CAPTCHA_FAILED', 'PASSWORD_CHANGE', 'EMAIL_CHANGE_REQUEST', 'EMAIL_CHANGE_SUCCESS', 'EMAIL_CHANGE_VERIFY', 'ADMIN_REGISTER_SUCCESS', 'PENDING_EMAIL_VERIFICATION', 'ADMIN_ACCOUNT_AWAITING_APPROVAL', 'ADMIN_ACCOUNT_APPROVAL_REJECTED', 'ADMIN_ACCOUNT_SUSPENDED', 'SESSION_REVOKED', 'DEVICE_TRUSTED', 'ADMIN_BOOTSTRAP_APPROVED', 'ADMIN_BOOTSTRAP_REJECTED')",
    );
    await queryRunner.query(
      'CREATE TABLE "security_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" "public"."security_logs_source_enum" NOT NULL DEFAULT \'API\', "endpoint" character varying, "user_id" uuid, "email" character varying, "event" "public"."security_logs_event_enum" NOT NULL, "ip_address" inet, "user_agent" character varying, "session_id" character varying, "request_id" character varying, "trace_id" character varying, "correlation_id" uuid, "details" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_48ce9a9a3215af82611525ce08b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_security_request_id" ON "security_logs"  ("request_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_security_correlation_id" ON "security_logs"  ("correlation_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_security_email_date" ON "security_logs"  ("email", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_security_user_date" ON "security_logs"  ("user_id", "created_at") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"seed_histories_status_enum\" AS ENUM('SUCCESS', 'FAILED', 'APPLIED', 'SKIPPED', 'INVALID')",
    );
    await queryRunner.query(
      'CREATE TABLE "seed_histories" ("id" character varying(150) NOT NULL, "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "checksum" character varying(64) NOT NULL, "status" "public"."seed_histories_status_enum" NOT NULL, CONSTRAINT "PK_9ffd5a9cf4285699a4a6bbd0d2c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"subscription_migrations_status_enum\" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')",
    );
    await queryRunner.query(
      'CREATE TABLE "subscription_migrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_plan_version_id" uuid NOT NULL, "target_plan_version_id" uuid NOT NULL, "status" "public"."subscription_migrations_status_enum" NOT NULL DEFAULT \'PENDING\', "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "created_by_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a5576fd429053622930d5aea8f8" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "template_scope" character varying(50) NOT NULL, "department_id" uuid, "created_by_id" uuid, "title" character varying(255) NOT NULL, "description" text, "payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a900ec0733e4743fe5a8213d5b0" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "traffic_daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "country_id" smallint, "device" character varying(50) DEFAULT \'DESKTOP\', "browser" character varying(50) DEFAULT \'OTHER\', "unique_visitors" integer NOT NULL DEFAULT \'0\', "new_visitors" integer NOT NULL DEFAULT \'0\', "returning_visitors" integer NOT NULL DEFAULT \'0\', "page_views" integer NOT NULL DEFAULT \'0\', "tender_views" integer NOT NULL DEFAULT \'0\', "search_count" integer NOT NULL DEFAULT \'0\', "avg_session_duration_seconds" integer NOT NULL DEFAULT \'0\', "bounce_rate" numeric(5,2) NOT NULL DEFAULT \'0\', "signup_count" integer NOT NULL DEFAULT \'0\', "subscription_count" integer NOT NULL DEFAULT \'0\', "revenue_cents" bigint NOT NULL DEFAULT \'0\', "tender_downloads" integer NOT NULL DEFAULT \'0\', "api_requests" integer NOT NULL DEFAULT \'0\', "error_count" integer NOT NULL DEFAULT \'0\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ce201c8f6f8d17b6f19e31a1f27" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_391981cfc09433de7f7fda899f" ON "traffic_daily_metrics"  ("date", "country_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_eac03433775ad5cab0da77107b" ON "traffic_daily_metrics"  ("country_id") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "ux_traffic_daily_metrics" ON "traffic_daily_metrics"  ("date", "country_id", "device", "browser") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"user_approval_requests_status_enum\" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')",
    );
    await queryRunner.query(
      'CREATE TABLE "user_approval_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requested_description" text, "status" "public"."user_approval_requests_status_enum" NOT NULL DEFAULT \'PENDING\', "reviewer_comment" text, "decided_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "target_user_id" uuid, "requested_role_id" uuid, "submitted_by_id" uuid, "reviewer_id" uuid, CONSTRAINT "PK_d3524dfd6c8ddc81823212aa27b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_019c751cad3dc90fc50f669a0c" ON "user_approval_requests"  ("status") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_hash" character varying NOT NULL, "user_agent" character varying, "last_ip_address" character varying, "is_trusted" boolean NOT NULL DEFAULT false, "last_active_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c9e7e648903a9e537347aba4371" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_28bd79e1b3f7c1168f0904ce24" ON "user_devices"  ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_775a877288ff15e9a8269129fb" ON "user_devices"  ("device_hash") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_user_devices_user_device" ON "user_devices"  ("user_id", "device_hash") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "admin_id" uuid, "note" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e6cd579b582af97475256da96fb" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_d2a9cb672e3701a1f2692c034a" ON "user_notes"  ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_0c66b00bd6cf40367b487c3637" ON "user_notes"  ("admin_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, "user_agent" character varying(255), "ip_address" inet, "device_hash" character varying(64), "is_revoked" boolean NOT NULL DEFAULT false, "token_version" integer NOT NULL DEFAULT \'1\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6596adb3b8927b35bda97e734aa" UNIQUE ("token_hash"), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e9658e959c490b0a634dfc5478" ON "user_sessions"  ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_6596adb3b8927b35bda97e734a" ON "user_sessions"  ("token_hash") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_sessions_user_device_active" ON "user_sessions"  ("user_id", "device_hash") WHERE "is_revoked" = false',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions"  ("expires_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_sessions_user_active" ON "user_sessions"  ("user_id") WHERE "is_revoked" = false',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_sessions_active_lookup" ON "user_sessions"  ("token_hash") WHERE "is_revoked" = false',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."webhook_events_provider_enum" AS ENUM(\'paypal\', \'stripe\')',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"webhook_events_event_type_enum\" AS ENUM('BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED', 'PAYMENT.SALE.COMPLETED', 'PAYMENT.SALE.DENIED', 'PAYMENT.CAPTURE.COMPLETED', 'UNKNOWN')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"webhook_events_status_enum\" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored')",
    );
    await queryRunner.query(
      'CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."webhook_events_provider_enum" NOT NULL, "event_id" character varying NOT NULL, "event_type" "public"."webhook_events_event_type_enum" NOT NULL DEFAULT \'UNKNOWN\', "payload" jsonb NOT NULL, "status" "public"."webhook_events_status_enum" NOT NULL DEFAULT \'received\', "error" text, "processed_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4cba37e6a0acb5e1fc49c34ebfd" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_webhook_provider_event" ON "webhook_events"  ("provider", "event_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "coupon_plan_restrictions" ("coupon_id" uuid NOT NULL, "plan_id" uuid NOT NULL, CONSTRAINT "PK_94c7215868376eb15100d49570b" PRIMARY KEY ("coupon_id", "plan_id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_ffd8b05c3b7313c778c6a99244" ON "coupon_plan_restrictions"  ("coupon_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_735a4a5538bfb354a9a98fa6ac" ON "coupon_plan_restrictions"  ("plan_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "analytics_alerts" ADD CONSTRAINT "FK_5b142e44e775c1a4104621c0429" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "analytics_events" ADD CONSTRAINT "FK_2dc94b8f6f15a8b59747a76ef74" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_f160d97a931844109de9d04228f" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_c49454aef596e6f9dc3eb64f3c6" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_retention_policies" ADD CONSTRAINT "FK_da7fa0ac4405b84a407fb80f419" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_retention_policies" ADD CONSTRAINT "FK_8f7483f0b84a512adabbb727d75" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "download_history" ADD CONSTRAINT "FK_2c8c1dfdcf8e6c16daf1d69771d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "download_history" ADD CONSTRAINT "FK_ced17cf4b7ef43f639d37123f1f" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_c28e5652b8282158a300360a5f3" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_112e056d74395bfda0ac2ab1399" FOREIGN KEY ("tender_version_id") REFERENCES "tender_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_e3b3e6fe82a8877884b447c0bf1" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_clarifications" ADD CONSTRAINT "FK_7839ca1fbac087804d93bc70443" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_clarifications" ADD CONSTRAINT "FK_d04c4cea298361ebc0c01f94ec0" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_committees" ADD CONSTRAINT "FK_265db625f067cb5117b78d32850" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_committees" ADD CONSTRAINT "FK_82ea6988808ceb18265a62fc157" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" ADD CONSTRAINT "FK_e7f1193caac8c0974a0b729d59d" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" ADD CONSTRAINT "FK_ba8e28612ed05168dd7f44f871b" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" ADD CONSTRAINT "FK_ee6498d01bd94b0a3f38f94062e" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" ADD CONSTRAINT "FK_f69071f2a5d76476fc7cacbc06f" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" ADD CONSTRAINT "FK_874bc4abb5143561d741f472a2b" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_invitations" ADD CONSTRAINT "FK_65d0287fe1b56fbbab6f2aad1f6" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_templates" ADD CONSTRAINT "FK_a694d13d4d4f1cf8b8df498a699" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_templates" ADD CONSTRAINT "FK_9a38940b30617298b2b4c97ace2" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_submissions" ADD CONSTRAINT "FK_e4306f59683a9bc0769c8b0d2f3" FOREIGN KEY ("tender_participant_id") REFERENCES "tender_participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" ADD CONSTRAINT "FK_caac5f1e82424218af20464b56e" FOREIGN KEY ("participant_id") REFERENCES "tender_participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" ADD CONSTRAINT "FK_e41ab7954f3200521da7d4ba6ba" FOREIGN KEY ("submission_id") REFERENCES "tender_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" ADD CONSTRAINT "FK_8d923ca63bf9cd2b6aeeb294597" FOREIGN KEY ("evaluation_template_id") REFERENCES "evaluation_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" ADD CONSTRAINT "FK_df627015bf8cad5314424ee2b9c" FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_participants" ADD CONSTRAINT "FK_cb045869f685854cb78af32d5e4" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_participants" ADD CONSTRAINT "FK_c69ca307add7ec3cc9dff4db7ef" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" ADD CONSTRAINT "FK_d4f0e7f7a45d3fb4f5070f8443e" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" ADD CONSTRAINT "FK_91b13a7b0bf719db303bf8eb9e7" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" ADD CONSTRAINT "FK_a4821951b08311298d2f1cd4664" FOREIGN KEY ("answered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_watchers" ADD CONSTRAINT "FK_555ff2712ea77a3add5380b76b0" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_watchers" ADD CONSTRAINT "FK_8a30cc6ab2fe1ffb9adeb1f2daa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD CONSTRAINT "FK_75bf15ff0def259a68fed414dd0" FOREIGN KEY ("active_version_id") REFERENCES "tender_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD CONSTRAINT "FK_7a72f2a65a422d49af6e4306818" FOREIGN KEY ("tender_version_id") REFERENCES "tender_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_assignments" ADD CONSTRAINT "FK_63a91cd2e03f70f54a6c75a5981" FOREIGN KEY ("review_id") REFERENCES "tender_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_assignments" ADD CONSTRAINT "FK_082087381c796d39ed1bb5551b8" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_comments" ADD CONSTRAINT "FK_884bcc4cacc41156beb13b86b21" FOREIGN KEY ("review_id") REFERENCES "tender_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_comments" ADD CONSTRAINT "FK_5b0021091d8140b434f731f6d2c" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_reviews" ADD CONSTRAINT "FK_f9fa0dfc51991eea00cabd9bb6e" FOREIGN KEY ("tender_version_id") REFERENCES "tender_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" ADD CONSTRAINT "FK_b4e4a8cf8ec0c251e4e2d16c288" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" ADD CONSTRAINT "FK_8aabeb9be8a97c625dd287e75b7" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" ADD CONSTRAINT "FK_3844ca8aab685f38b6656f064fa" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" ADD CONSTRAINT "FK_38d110b2653f9ce3d9a4fbe3aa4" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "states" ADD CONSTRAINT "FK_f3bbd0bc19bb6d8a887add08461" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "states" ADD CONSTRAINT "FK_0e294c8a8ed0c984a200845a2fc" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "states" ADD CONSTRAINT "FK_0d859da7494cb967ee959ee6445" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" ADD CONSTRAINT "FK_d82d421b42283a8321153a8f602" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" ADD CONSTRAINT "FK_d2eeb84d07a05a52965deb5f664" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" ADD CONSTRAINT "FK_9431c30415dd4fa6d36d0833b86" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "countries" ADD CONSTRAINT "FK_ce2d61e8933e762a07ec723d7d8" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "countries" ADD CONSTRAINT "FK_36bc1d0e763087b521f5f0b2fe3" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_category_pricing" ADD CONSTRAINT "FK_d9a7e7c2101719da829425216a5" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_category_pricing" ADD CONSTRAINT "FK_5ccafe486b6d167c7db0611d6ee" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_country_pricing" ADD CONSTRAINT "FK_0e0412657afe2b7a3e9221695c8" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_country_pricing" ADD CONSTRAINT "FK_5e6abfa4af51ec282f0a21d24b8" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_features" ADD CONSTRAINT "FK_fe08b1d2021ae6e9eabd4c3ed6e" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_assignments" ADD CONSTRAINT "FK_b67e28dd5195e98fc797a58dbd3" FOREIGN KEY ("review_id") REFERENCES "plan_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_assignments" ADD CONSTRAINT "FK_ee2201ae3c00916663df1e890ac" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_comments" ADD CONSTRAINT "FK_3d02ec9688ce8b01e5e2bd9d4af" FOREIGN KEY ("plan_review_id") REFERENCES "plan_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_comments" ADD CONSTRAINT "FK_6a794d51dc752ae26d167cb0433" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_reviews" ADD CONSTRAINT "FK_a0b90ebf2282ad4afee46b6a805" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_reviews" ADD CONSTRAINT "FK_153818f75a38884e5976add7599" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_b504a5b710ec5832245809b7bce" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_a4def7b445c9d9befb7c00bb10a" FOREIGN KEY ("target_state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_544b23467353d462531ca25d4a5" FOREIGN KEY ("target_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_f03d7561ab57652877623ee44ba" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_bfe476cb7eae48a06017fd46736" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_ef8559790f2ca2d10a0cf2ecabe" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_9ad0d0f6c8800e425b7e99e8a3d" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" ADD CONSTRAINT "FK_a92f15af52b87bbe382a6e6ddea" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" ADD CONSTRAINT "FK_acdad2db33127889eecf5e278ac" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" ADD CONSTRAINT "FK_1d949d47e90a4236831324c2569" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "plans" ADD CONSTRAINT "FK_df66f4cb64eb30d84a8eae5c8aa" FOREIGN KEY ("active_version_id") REFERENCES "plan_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "coupons" ADD CONSTRAINT "FK_dc1cf7573d95d72ac52fe10a976" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "coupons" ADD CONSTRAINT "FK_44e27ceebba0b5ff63d824ab732" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "email_tokens" ADD CONSTRAINT "FK_018295f41628791c301bfe8b625" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "export_jobs" ADD CONSTRAINT "FK_0bf2b497d2b36f3054155c190aa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "export_jobs" ADD CONSTRAINT "FK_4ecb252906c0207f0c80fd0fde7" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "feature_catalog" ADD CONSTRAINT "FK_0499832481f04eb1a5cf6160a9b" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "feature_catalog" ADD CONSTRAINT "FK_c6c04240b1d5e49d972741ec9e6" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_actions" ADD CONSTRAINT "FK_bcc3f359931ca16ee2d0ed7aa6e" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" ADD CONSTRAINT "FK_89a96565b82ea5ae708150af7d9" FOREIGN KEY ("review_id") REFERENCES "role_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" ADD CONSTRAINT "FK_569a853d8e8bad87636d4b93ed2" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" ADD CONSTRAINT "FK_042b8805319aa2f99fe08a71d5f" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" ADD CONSTRAINT "FK_e11d14a213c8a0d8fa843191dbe" FOREIGN KEY ("review_id") REFERENCES "role_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" ADD CONSTRAINT "FK_4ae6557064b0a53fff244789948" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" ADD CONSTRAINT "FK_347b4d3fa21ca75d01df8b6fd2c" FOREIGN KEY ("parent_comment_id") REFERENCES "role_review_comments"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_reviews" ADD CONSTRAINT "FK_085486a72de44ad71ef1f2bbae5" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_reviews" ADD CONSTRAINT "FK_7ab98eed4654a8dc334bdb26df1" FOREIGN KEY ("role_version_id") REFERENCES "role_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_version_permissions" ADD CONSTRAINT "FK_7bb7755fb8558ec976d581b1197" FOREIGN KEY ("role_version_id") REFERENCES "role_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" ADD CONSTRAINT "FK_9dfeba05bbd61fc52a13016dbe8" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" ADD CONSTRAINT "FK_f6bb470370cb3f58a95b41272ef" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" ADD CONSTRAINT "FK_39a0909d62fe105e8af21d70cc2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" ADD CONSTRAINT "FK_b3169ac04e2d6d355d70faff515" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_6de6fefffe4a6d17de747bf8b9d" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_6e42ca47aad0707e4ec75e0fd29" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "roles" ADD CONSTRAINT "FK_87fb89855c0c01c3f72b1365f28" FOREIGN KEY ("active_version_id") REFERENCES "role_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "roles" ADD CONSTRAINT "FK_4a39f3095781cdd9d6061afaae5" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "roles" ADD CONSTRAINT "FK_747b580d73db0ad78963d78b076" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" ADD CONSTRAINT "FK_021580b5aa0ee301ee359752b45" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" ADD CONSTRAINT "FK_3c1147687827d3dd27ebfb4a4af" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" ADD CONSTRAINT "FK_9aef934c471e3cfc1ca1a182155" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_4140c8b09ff58165daffbefbd7e" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "password_histories" ADD CONSTRAINT "FK_c249db3c7834f0a3e7cdb922347" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "permission_modules" ADD CONSTRAINT "FK_ca1f54cab47891c8e4f698a2fde" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "permission_modules" ADD CONSTRAINT "FK_e10b7e5a57026be100500e9b5f9" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" ADD CONSTRAINT "FK_738f46bb9ac6ea356f1915835d0" FOREIGN KEY ("module_id") REFERENCES "permission_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" ADD CONSTRAINT "FK_c398f7100db3e0d9b6a6cd6beaf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" ADD CONSTRAINT "FK_58fae278276b7c2c6dde2bc19a5" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_report_recipients" ADD CONSTRAINT "FK_7f240527f821018747a9f49a890" FOREIGN KEY ("report_id") REFERENCES "scheduled_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_reports" ADD CONSTRAINT "FK_aa73f2f14b238069d70d5ef39b1" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_reports" ADD CONSTRAINT "FK_c3cb1993af497441d2edb4dc7e3" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_66121d9ffaf8d5c757e0bea4472" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_5759fd98f5e56940654ba474041" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_7b4df503624e2dacfba2d171555" FOREIGN KEY ("target_state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_5e1ac56530f1368ad4f05a3795a" FOREIGN KEY ("target_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "FK_300a6e1f7650cbdea9e134f4c81" FOREIGN KEY ("message_id") REFERENCES "support_ticket_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "FK_4339162c880269e72a10a4e08ad" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "FK_b30cb666dee84b6cbf721af4219" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_0b1eb4f1f984aab3c481c48468a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_459772fad015271864c46f1fc05" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_d9de5400cea009d93a7a436adec" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_dashboard_layouts" ADD CONSTRAINT "FK_00e515c96b66eb5b283e6bcb8f1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_ae78dc6cb10aa14cfef96b2dd90" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" ADD CONSTRAINT "FK_9a286c05179716412602e3a8962" FOREIGN KEY ("review_id") REFERENCES "category_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" ADD CONSTRAINT "FK_a1c62446209c8f57caf24568d03" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" ADD CONSTRAINT "FK_3f4af71c82178d619905ce21555" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_comments" ADD CONSTRAINT "FK_7032ff6b4cae3c085ec13a29d16" FOREIGN KEY ("category_review_id") REFERENCES "category_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_comments" ADD CONSTRAINT "FK_fb8b6d69cd615f3fa8a7cc8a550" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_reviews" ADD CONSTRAINT "FK_08c09f5376782b25493d314e018" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_reviews" ADD CONSTRAINT "FK_337b3954e7f0d5be042af61320c" FOREIGN KEY ("category_version_id") REFERENCES "category_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" ADD CONSTRAINT "FK_670a677a902b832549a489c59c3" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" ADD CONSTRAINT "FK_116baab688421d1302a3f170143" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" ADD CONSTRAINT "FK_30a6aa1b136ce4449305a310484" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" ADD CONSTRAINT "FK_df8c17030c1f97ac0131b8204f3" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" ADD CONSTRAINT "FK_731269ee5a4546d7858ad77a068" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" ADD CONSTRAINT "FK_1ea0fa3b730b17a19d65291d820" FOREIGN KEY ("category_version_id") REFERENCES "category_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" ADD CONSTRAINT "FK_5b037075d08c32affdb8988d4e8" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" ADD CONSTRAINT "FK_e646e978f3c221127937ec5f985" FOREIGN KEY ("active_version_id") REFERENCES "category_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" ADD CONSTRAINT "FK_23ad9291e0e22cdf46ae7ec5461" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" ADD CONSTRAINT "FK_971f81500b65c577edd00dd2687" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" ADD CONSTRAINT "FK_7182c5db26da9d706fbe6435cb2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" ADD CONSTRAINT "FK_5eb8b242f7153711b4036d9917b" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" ADD CONSTRAINT "FK_385e2e7c38533ff364fec7b399b" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" ADD CONSTRAINT "FK_e73b9220fab07055c318ca2c81e" FOREIGN KEY ("request_id") REFERENCES "country_change_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" ADD CONSTRAINT "FK_01e00a60251354c2e79c28b5d20" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" ADD CONSTRAINT "FK_17ef44951dabbdf7c26243e43df" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_comments" ADD CONSTRAINT "FK_e741539753c80463bd2d23d6efd" FOREIGN KEY ("request_id") REFERENCES "country_change_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_comments" ADD CONSTRAINT "FK_b23fab65c605d6bd9bcb37ad7ac" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" ADD CONSTRAINT "FK_f773235fc66dc7cdd9b0fb63b17" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" ADD CONSTRAINT "FK_c3df6ef339c5e2c2ab89413e348" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" ADD CONSTRAINT "FK_08f1f4db4a9f13a72763ba3c2d7" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" ADD CONSTRAINT "FK_937e73d569afe91c1196087eb13" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" ADD CONSTRAINT "FK_671a06ceacd4f9312e625288b47" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" ADD CONSTRAINT "FK_9e61aa8dad872cdcab16b8d804b" FOREIGN KEY ("request_id") REFERENCES "country_change_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" ADD CONSTRAINT "FK_2cdc8b213f5dd8250bde00c065e" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" ADD CONSTRAINT "FK_2e335abeaca6eb348036574593c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" ADD CONSTRAINT "FK_738d9868cdd25d6297a242a1bef" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" ADD CONSTRAINT "FK_251e877e66ad95c58b67b459a8b" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" ADD CONSTRAINT "FK_0315f85165467eb3dc08e201986" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" ADD CONSTRAINT "FK_6d0bbd4abe0b539b0f8aa2a6404" FOREIGN KEY ("role_version_id") REFERENCES "role_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" ADD CONSTRAINT "FK_d9f535458a464fb1b1f96b2fbfb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "security_logs" ADD CONSTRAINT "FK_3fc41b4fda367506672e9030ad0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" ADD CONSTRAINT "FK_0c191a43e8a72100e60dbcfe078" FOREIGN KEY ("source_plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" ADD CONSTRAINT "FK_2a7fed4b0b5c12ccd83b66784e2" FOREIGN KEY ("target_plan_version_id") REFERENCES "plan_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" ADD CONSTRAINT "FK_c424a6e183095a533af087a8727" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_templates" ADD CONSTRAINT "FK_a4c36192a2850fcf4814abeebac" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "traffic_daily_metrics" ADD CONSTRAINT "FK_eac03433775ad5cab0da77107bd" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" ADD CONSTRAINT "FK_ecea125d7527ca6f8334ece4a45" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" ADD CONSTRAINT "FK_433e5936999c250afff524ba1df" FOREIGN KEY ("requested_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" ADD CONSTRAINT "FK_c2646619679e600a7c66962c070" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" ADD CONSTRAINT "FK_e588b5cfefef227a6e144e11ec6" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_devices" ADD CONSTRAINT "FK_28bd79e1b3f7c1168f0904ce241" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_notes" ADD CONSTRAINT "FK_d2a9cb672e3701a1f2692c034a4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_notes" ADD CONSTRAINT "FK_0c66b00bd6cf40367b487c3637b" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "coupon_plan_restrictions" ADD CONSTRAINT "FK_ffd8b05c3b7313c778c6a99244e" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "coupon_plan_restrictions" ADD CONSTRAINT "FK_735a4a5538bfb354a9a98fa6ac3" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "coupon_plan_restrictions" DROP CONSTRAINT "FK_735a4a5538bfb354a9a98fa6ac3"',
    );
    await queryRunner.query(
      'ALTER TABLE "coupon_plan_restrictions" DROP CONSTRAINT "FK_ffd8b05c3b7313c778c6a99244e"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_notes" DROP CONSTRAINT "FK_0c66b00bd6cf40367b487c3637b"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_notes" DROP CONSTRAINT "FK_d2a9cb672e3701a1f2692c034a4"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_devices" DROP CONSTRAINT "FK_28bd79e1b3f7c1168f0904ce241"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" DROP CONSTRAINT "FK_e588b5cfefef227a6e144e11ec6"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" DROP CONSTRAINT "FK_c2646619679e600a7c66962c070"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" DROP CONSTRAINT "FK_433e5936999c250afff524ba1df"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_approval_requests" DROP CONSTRAINT "FK_ecea125d7527ca6f8334ece4a45"',
    );
    await queryRunner.query(
      'ALTER TABLE "traffic_daily_metrics" DROP CONSTRAINT "FK_eac03433775ad5cab0da77107bd"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_templates" DROP CONSTRAINT "FK_a4c36192a2850fcf4814abeebac"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" DROP CONSTRAINT "FK_c424a6e183095a533af087a8727"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" DROP CONSTRAINT "FK_2a7fed4b0b5c12ccd83b66784e2"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_migrations" DROP CONSTRAINT "FK_0c191a43e8a72100e60dbcfe078"',
    );
    await queryRunner.query(
      'ALTER TABLE "security_logs" DROP CONSTRAINT "FK_3fc41b4fda367506672e9030ad0"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" DROP CONSTRAINT "FK_d9f535458a464fb1b1f96b2fbfb"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" DROP CONSTRAINT "FK_6d0bbd4abe0b539b0f8aa2a6404"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_activities" DROP CONSTRAINT "FK_0315f85165467eb3dc08e201986"',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" DROP CONSTRAINT "FK_251e877e66ad95c58b67b459a8b"',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" DROP CONSTRAINT "FK_738d9868cdd25d6297a242a1bef"',
    );
    await queryRunner.query(
      'ALTER TABLE "purchased_tenders" DROP CONSTRAINT "FK_2e335abeaca6eb348036574593c"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" DROP CONSTRAINT "FK_2cdc8b213f5dd8250bde00c065e"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" DROP CONSTRAINT "FK_9e61aa8dad872cdcab16b8d804b"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" DROP CONSTRAINT "FK_671a06ceacd4f9312e625288b47"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_activities" DROP CONSTRAINT "FK_937e73d569afe91c1196087eb13"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" DROP CONSTRAINT "FK_08f1f4db4a9f13a72763ba3c2d7"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" DROP CONSTRAINT "FK_c3df6ef339c5e2c2ab89413e348"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_requests" DROP CONSTRAINT "FK_f773235fc66dc7cdd9b0fb63b17"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_comments" DROP CONSTRAINT "FK_b23fab65c605d6bd9bcb37ad7ac"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_comments" DROP CONSTRAINT "FK_e741539753c80463bd2d23d6efd"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" DROP CONSTRAINT "FK_17ef44951dabbdf7c26243e43df"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" DROP CONSTRAINT "FK_01e00a60251354c2e79c28b5d20"',
    );
    await queryRunner.query(
      'ALTER TABLE "country_change_request_assignments" DROP CONSTRAINT "FK_e73b9220fab07055c318ca2c81e"',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" DROP CONSTRAINT "FK_385e2e7c38533ff364fec7b399b"',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" DROP CONSTRAINT "FK_5eb8b242f7153711b4036d9917b"',
    );
    await queryRunner.query(
      'ALTER TABLE "alert_preferences" DROP CONSTRAINT "FK_7182c5db26da9d706fbe6435cb2"',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" DROP CONSTRAINT "FK_971f81500b65c577edd00dd2687"',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" DROP CONSTRAINT "FK_23ad9291e0e22cdf46ae7ec5461"',
    );
    await queryRunner.query(
      'ALTER TABLE "categories" DROP CONSTRAINT "FK_e646e978f3c221127937ec5f985"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" DROP CONSTRAINT "FK_5b037075d08c32affdb8988d4e8"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" DROP CONSTRAINT "FK_1ea0fa3b730b17a19d65291d820"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_activities" DROP CONSTRAINT "FK_731269ee5a4546d7858ad77a068"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" DROP CONSTRAINT "FK_df8c17030c1f97ac0131b8204f3"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" DROP CONSTRAINT "FK_30a6aa1b136ce4449305a310484"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" DROP CONSTRAINT "FK_116baab688421d1302a3f170143"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_versions" DROP CONSTRAINT "FK_670a677a902b832549a489c59c3"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_reviews" DROP CONSTRAINT "FK_337b3954e7f0d5be042af61320c"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_reviews" DROP CONSTRAINT "FK_08c09f5376782b25493d314e018"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_comments" DROP CONSTRAINT "FK_fb8b6d69cd615f3fa8a7cc8a550"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_comments" DROP CONSTRAINT "FK_7032ff6b4cae3c085ec13a29d16"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" DROP CONSTRAINT "FK_3f4af71c82178d619905ce21555"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" DROP CONSTRAINT "FK_a1c62446209c8f57caf24568d03"',
    );
    await queryRunner.query(
      'ALTER TABLE "category_review_assignments" DROP CONSTRAINT "FK_9a286c05179716412602e3a8962"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_ae78dc6cb10aa14cfef96b2dd90"');
    await queryRunner.query(
      'ALTER TABLE "user_dashboard_layouts" DROP CONSTRAINT "FK_00e515c96b66eb5b283e6bcb8f1"',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_d9de5400cea009d93a7a436adec"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_459772fad015271864c46f1fc05"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_0b1eb4f1f984aab3c481c48468a"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_b30cb666dee84b6cbf721af4219"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_4339162c880269e72a10a4e08ad"',
    );
    await queryRunner.query(
      'ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "FK_300a6e1f7650cbdea9e134f4c81"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_5e1ac56530f1368ad4f05a3795a"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_7b4df503624e2dacfba2d171555"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_5759fd98f5e56940654ba474041"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_66121d9ffaf8d5c757e0bea4472"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_reports" DROP CONSTRAINT "FK_c3cb1993af497441d2edb4dc7e3"',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_reports" DROP CONSTRAINT "FK_aa73f2f14b238069d70d5ef39b1"',
    );
    await queryRunner.query(
      'ALTER TABLE "scheduled_report_recipients" DROP CONSTRAINT "FK_7f240527f821018747a9f49a890"',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" DROP CONSTRAINT "FK_58fae278276b7c2c6dde2bc19a5"',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" DROP CONSTRAINT "FK_c398f7100db3e0d9b6a6cd6beaf"',
    );
    await queryRunner.query(
      'ALTER TABLE "permissions" DROP CONSTRAINT "FK_738f46bb9ac6ea356f1915835d0"',
    );
    await queryRunner.query(
      'ALTER TABLE "permission_modules" DROP CONSTRAINT "FK_e10b7e5a57026be100500e9b5f9"',
    );
    await queryRunner.query(
      'ALTER TABLE "permission_modules" DROP CONSTRAINT "FK_ca1f54cab47891c8e4f698a2fde"',
    );
    await queryRunner.query(
      'ALTER TABLE "password_histories" DROP CONSTRAINT "FK_c249db3c7834f0a3e7cdb922347"',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" DROP CONSTRAINT "FK_4140c8b09ff58165daffbefbd7e"',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" DROP CONSTRAINT "FK_9aef934c471e3cfc1ca1a182155"',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" DROP CONSTRAINT "FK_3c1147687827d3dd27ebfb4a4af"',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_recipients" DROP CONSTRAINT "FK_021580b5aa0ee301ee359752b45"',
    );
    await queryRunner.query('ALTER TABLE "roles" DROP CONSTRAINT "FK_747b580d73db0ad78963d78b076"');
    await queryRunner.query('ALTER TABLE "roles" DROP CONSTRAINT "FK_4a39f3095781cdd9d6061afaae5"');
    await queryRunner.query('ALTER TABLE "roles" DROP CONSTRAINT "FK_87fb89855c0c01c3f72b1365f28"');
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_6e42ca47aad0707e4ec75e0fd29"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_6de6fefffe4a6d17de747bf8b9d"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" DROP CONSTRAINT "FK_b3169ac04e2d6d355d70faff515"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" DROP CONSTRAINT "FK_39a0909d62fe105e8af21d70cc2"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" DROP CONSTRAINT "FK_f6bb470370cb3f58a95b41272ef"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_versions" DROP CONSTRAINT "FK_9dfeba05bbd61fc52a13016dbe8"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_version_permissions" DROP CONSTRAINT "FK_7bb7755fb8558ec976d581b1197"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_reviews" DROP CONSTRAINT "FK_7ab98eed4654a8dc334bdb26df1"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_reviews" DROP CONSTRAINT "FK_085486a72de44ad71ef1f2bbae5"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" DROP CONSTRAINT "FK_347b4d3fa21ca75d01df8b6fd2c"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" DROP CONSTRAINT "FK_4ae6557064b0a53fff244789948"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_comments" DROP CONSTRAINT "FK_e11d14a213c8a0d8fa843191dbe"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" DROP CONSTRAINT "FK_042b8805319aa2f99fe08a71d5f"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" DROP CONSTRAINT "FK_569a853d8e8bad87636d4b93ed2"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_review_assignments" DROP CONSTRAINT "FK_89a96565b82ea5ae708150af7d9"',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_actions" DROP CONSTRAINT "FK_bcc3f359931ca16ee2d0ed7aa6e"',
    );
    await queryRunner.query(
      'ALTER TABLE "feature_catalog" DROP CONSTRAINT "FK_c6c04240b1d5e49d972741ec9e6"',
    );
    await queryRunner.query(
      'ALTER TABLE "feature_catalog" DROP CONSTRAINT "FK_0499832481f04eb1a5cf6160a9b"',
    );
    await queryRunner.query(
      'ALTER TABLE "export_jobs" DROP CONSTRAINT "FK_4ecb252906c0207f0c80fd0fde7"',
    );
    await queryRunner.query(
      'ALTER TABLE "export_jobs" DROP CONSTRAINT "FK_0bf2b497d2b36f3054155c190aa"',
    );
    await queryRunner.query(
      'ALTER TABLE "email_tokens" DROP CONSTRAINT "FK_018295f41628791c301bfe8b625"',
    );
    await queryRunner.query(
      'ALTER TABLE "coupons" DROP CONSTRAINT "FK_44e27ceebba0b5ff63d824ab732"',
    );
    await queryRunner.query(
      'ALTER TABLE "coupons" DROP CONSTRAINT "FK_dc1cf7573d95d72ac52fe10a976"',
    );
    await queryRunner.query('ALTER TABLE "plans" DROP CONSTRAINT "FK_df66f4cb64eb30d84a8eae5c8aa"');
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" DROP CONSTRAINT "FK_1d949d47e90a4236831324c2569"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" DROP CONSTRAINT "FK_acdad2db33127889eecf5e278ac"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscription_daily_metrics" DROP CONSTRAINT "FK_a92f15af52b87bbe382a6e6ddea"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_9ad0d0f6c8800e425b7e99e8a3d"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_ef8559790f2ca2d10a0cf2ecabe"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_bfe476cb7eae48a06017fd46736"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_f03d7561ab57652877623ee44ba"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_544b23467353d462531ca25d4a5"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_a4def7b445c9d9befb7c00bb10a"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_b504a5b710ec5832245809b7bce"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_reviews" DROP CONSTRAINT "FK_153818f75a38884e5976add7599"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_reviews" DROP CONSTRAINT "FK_a0b90ebf2282ad4afee46b6a805"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_comments" DROP CONSTRAINT "FK_6a794d51dc752ae26d167cb0433"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_comments" DROP CONSTRAINT "FK_3d02ec9688ce8b01e5e2bd9d4af"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_assignments" DROP CONSTRAINT "FK_ee2201ae3c00916663df1e890ac"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_review_assignments" DROP CONSTRAINT "FK_b67e28dd5195e98fc797a58dbd3"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_features" DROP CONSTRAINT "FK_fe08b1d2021ae6e9eabd4c3ed6e"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_country_pricing" DROP CONSTRAINT "FK_5e6abfa4af51ec282f0a21d24b8"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_country_pricing" DROP CONSTRAINT "FK_0e0412657afe2b7a3e9221695c8"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_category_pricing" DROP CONSTRAINT "FK_5ccafe486b6d167c7db0611d6ee"',
    );
    await queryRunner.query(
      'ALTER TABLE "plan_category_pricing" DROP CONSTRAINT "FK_d9a7e7c2101719da829425216a5"',
    );
    await queryRunner.query(
      'ALTER TABLE "countries" DROP CONSTRAINT "FK_36bc1d0e763087b521f5f0b2fe3"',
    );
    await queryRunner.query(
      'ALTER TABLE "countries" DROP CONSTRAINT "FK_ce2d61e8933e762a07ec723d7d8"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" DROP CONSTRAINT "FK_9431c30415dd4fa6d36d0833b86"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" DROP CONSTRAINT "FK_d2eeb84d07a05a52965deb5f664"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_daily_metrics" DROP CONSTRAINT "FK_d82d421b42283a8321153a8f602"',
    );
    await queryRunner.query(
      'ALTER TABLE "states" DROP CONSTRAINT "FK_0d859da7494cb967ee959ee6445"',
    );
    await queryRunner.query(
      'ALTER TABLE "states" DROP CONSTRAINT "FK_0e294c8a8ed0c984a200845a2fc"',
    );
    await queryRunner.query(
      'ALTER TABLE "states" DROP CONSTRAINT "FK_f3bbd0bc19bb6d8a887add08461"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" DROP CONSTRAINT "FK_38d110b2653f9ce3d9a4fbe3aa4"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" DROP CONSTRAINT "FK_3844ca8aab685f38b6656f064fa"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" DROP CONSTRAINT "FK_8aabeb9be8a97c625dd287e75b7"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_versions" DROP CONSTRAINT "FK_b4e4a8cf8ec0c251e4e2d16c288"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_reviews" DROP CONSTRAINT "FK_f9fa0dfc51991eea00cabd9bb6e"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_comments" DROP CONSTRAINT "FK_5b0021091d8140b434f731f6d2c"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_comments" DROP CONSTRAINT "FK_884bcc4cacc41156beb13b86b21"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_assignments" DROP CONSTRAINT "FK_082087381c796d39ed1bb5551b8"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_review_assignments" DROP CONSTRAINT "FK_63a91cd2e03f70f54a6c75a5981"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" DROP CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" DROP CONSTRAINT "FK_7a72f2a65a422d49af6e4306818"',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" DROP CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3"',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" DROP CONSTRAINT "FK_75bf15ff0def259a68fed414dd0"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_watchers" DROP CONSTRAINT "FK_8a30cc6ab2fe1ffb9adeb1f2daa"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_watchers" DROP CONSTRAINT "FK_555ff2712ea77a3add5380b76b0"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" DROP CONSTRAINT "FK_a4821951b08311298d2f1cd4664"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" DROP CONSTRAINT "FK_91b13a7b0bf719db303bf8eb9e7"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_questions" DROP CONSTRAINT "FK_d4f0e7f7a45d3fb4f5070f8443e"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_participants" DROP CONSTRAINT "FK_c69ca307add7ec3cc9dff4db7ef"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_participants" DROP CONSTRAINT "FK_cb045869f685854cb78af32d5e4"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" DROP CONSTRAINT "FK_df627015bf8cad5314424ee2b9c"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" DROP CONSTRAINT "FK_8d923ca63bf9cd2b6aeeb294597"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" DROP CONSTRAINT "FK_e41ab7954f3200521da7d4ba6ba"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_evaluations" DROP CONSTRAINT "FK_caac5f1e82424218af20464b56e"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_submissions" DROP CONSTRAINT "FK_e4306f59683a9bc0769c8b0d2f3"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_templates" DROP CONSTRAINT "FK_9a38940b30617298b2b4c97ace2"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_templates" DROP CONSTRAINT "FK_a694d13d4d4f1cf8b8df498a699"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_invitations" DROP CONSTRAINT "FK_65d0287fe1b56fbbab6f2aad1f6"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" DROP CONSTRAINT "FK_874bc4abb5143561d741f472a2b"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" DROP CONSTRAINT "FK_f69071f2a5d76476fc7cacbc06f"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" DROP CONSTRAINT "FK_ee6498d01bd94b0a3f38f94062e"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" DROP CONSTRAINT "FK_ba8e28612ed05168dd7f44f871b"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_daily_metrics" DROP CONSTRAINT "FK_e7f1193caac8c0974a0b729d59d"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_committees" DROP CONSTRAINT "FK_82ea6988808ceb18265a62fc157"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_committees" DROP CONSTRAINT "FK_265db625f067cb5117b78d32850"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_clarifications" DROP CONSTRAINT "FK_d04c4cea298361ebc0c01f94ec0"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_clarifications" DROP CONSTRAINT "FK_7839ca1fbac087804d93bc70443"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" DROP CONSTRAINT "FK_e3b3e6fe82a8877884b447c0bf1"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" DROP CONSTRAINT "FK_112e056d74395bfda0ac2ab1399"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" DROP CONSTRAINT "FK_c28e5652b8282158a300360a5f3"',
    );
    await queryRunner.query(
      'ALTER TABLE "download_history" DROP CONSTRAINT "FK_ced17cf4b7ef43f639d37123f1f"',
    );
    await queryRunner.query(
      'ALTER TABLE "download_history" DROP CONSTRAINT "FK_2c8c1dfdcf8e6c16daf1d69771d"',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_retention_policies" DROP CONSTRAINT "FK_8f7483f0b84a512adabbb727d75"',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_retention_policies" DROP CONSTRAINT "FK_da7fa0ac4405b84a407fb80f419"',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_c49454aef596e6f9dc3eb64f3c6"',
    );
    await queryRunner.query(
      'ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_f160d97a931844109de9d04228f"',
    );
    await queryRunner.query(
      'ALTER TABLE "analytics_events" DROP CONSTRAINT "FK_2dc94b8f6f15a8b59747a76ef74"',
    );
    await queryRunner.query(
      'ALTER TABLE "analytics_alerts" DROP CONSTRAINT "FK_5b142e44e775c1a4104621c0429"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_735a4a5538bfb354a9a98fa6ac"');
    await queryRunner.query('DROP INDEX "public"."IDX_ffd8b05c3b7313c778c6a99244"');
    await queryRunner.query('DROP TABLE "coupon_plan_restrictions"');
    await queryRunner.query('DROP INDEX "public"."idx_webhook_provider_event"');
    await queryRunner.query('DROP TABLE "webhook_events"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_status_enum"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_event_type_enum"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_provider_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_user_sessions_active_lookup"');
    await queryRunner.query('DROP INDEX "public"."idx_user_sessions_user_active"');
    await queryRunner.query('DROP INDEX "public"."idx_user_sessions_expires_at"');
    await queryRunner.query('DROP INDEX "public"."idx_user_sessions_user_device_active"');
    await queryRunner.query('DROP INDEX "public"."IDX_6596adb3b8927b35bda97e734a"');
    await queryRunner.query('DROP INDEX "public"."IDX_e9658e959c490b0a634dfc5478"');
    await queryRunner.query('DROP TABLE "user_sessions"');
    await queryRunner.query('DROP INDEX "public"."IDX_0c66b00bd6cf40367b487c3637"');
    await queryRunner.query('DROP INDEX "public"."IDX_d2a9cb672e3701a1f2692c034a"');
    await queryRunner.query('DROP TABLE "user_notes"');
    await queryRunner.query('DROP INDEX "public"."uq_user_devices_user_device"');
    await queryRunner.query('DROP INDEX "public"."IDX_775a877288ff15e9a8269129fb"');
    await queryRunner.query('DROP INDEX "public"."IDX_28bd79e1b3f7c1168f0904ce24"');
    await queryRunner.query('DROP TABLE "user_devices"');
    await queryRunner.query('DROP INDEX "public"."IDX_019c751cad3dc90fc50f669a0c"');
    await queryRunner.query('DROP TABLE "user_approval_requests"');
    await queryRunner.query('DROP TYPE "public"."user_approval_requests_status_enum"');
    await queryRunner.query('DROP INDEX "public"."ux_traffic_daily_metrics"');
    await queryRunner.query('DROP INDEX "public"."IDX_eac03433775ad5cab0da77107b"');
    await queryRunner.query('DROP INDEX "public"."IDX_391981cfc09433de7f7fda899f"');
    await queryRunner.query('DROP TABLE "traffic_daily_metrics"');
    await queryRunner.query('DROP TABLE "tender_templates"');
    await queryRunner.query('DROP TABLE "subscription_migrations"');
    await queryRunner.query('DROP TYPE "public"."subscription_migrations_status_enum"');
    await queryRunner.query('DROP TABLE "seed_histories"');
    await queryRunner.query('DROP TYPE "public"."seed_histories_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_security_user_date"');
    await queryRunner.query('DROP INDEX "public"."idx_security_email_date"');
    await queryRunner.query('DROP INDEX "public"."idx_security_correlation_id"');
    await queryRunner.query('DROP INDEX "public"."idx_security_request_id"');
    await queryRunner.query('DROP TABLE "security_logs"');
    await queryRunner.query('DROP TYPE "public"."security_logs_event_enum"');
    await queryRunner.query('DROP TYPE "public"."security_logs_source_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_role_activities_role_id"');
    await queryRunner.query('DROP INDEX "public"."idx_role_activities_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_role_activities_created_at"');
    await queryRunner.query('DROP TABLE "role_activities"');
    await queryRunner.query('DROP TYPE "public"."role_activities_activity_type_enum"');
    await queryRunner.query('DROP TABLE "purchased_tenders"');
    await queryRunner.query('DROP INDEX "public"."IDX_1950c37c8beb54f409bb8097de"');
    await queryRunner.query('DROP INDEX "public"."IDX_1c7dec593b8b088def83993689"');
    await queryRunner.query('DROP INDEX "public"."IDX_0db9750ef5c3b86b7037c539cc"');
    await queryRunner.query('DROP INDEX "public"."IDX_9e61aa8dad872cdcab16b8d804"');
    await queryRunner.query('DROP INDEX "public"."IDX_f715406bfad5ac865c9743bc15"');
    await queryRunner.query('DROP INDEX "public"."uq_country_seed_event"');
    await queryRunner.query('DROP INDEX "public"."uq_state_seed_event"');
    await queryRunner.query('DROP TABLE "country_activities"');
    await queryRunner.query('DROP TYPE "public"."country_activities_event_type_enum"');
    await queryRunner.query('DROP TYPE "public"."country_activities_actor_type_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_3f7d3c1e60c7d3c8c342134361"');
    await queryRunner.query('DROP TABLE "country_change_requests"');
    await queryRunner.query('DROP TYPE "public"."country_change_requests_status_enum"');
    await queryRunner.query('DROP TYPE "public"."country_change_requests_action_enum"');
    await queryRunner.query('DROP TYPE "public"."country_change_requests_target_type_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_e741539753c80463bd2d23d6ef"');
    await queryRunner.query('DROP TABLE "country_change_request_comments"');
    await queryRunner.query('DROP TYPE "public"."country_change_request_comments_type_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_13567c18620e1519d010a0bdd8"');
    await queryRunner.query('DROP TABLE "country_change_request_assignments"');
    await queryRunner.query('DROP TYPE "public"."country_change_request_assignments_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_alert_preferences_user"');
    await queryRunner.query('DROP INDEX "public"."idx_alert_preferences_category"');
    await queryRunner.query('DROP INDEX "public"."idx_alert_preferences_state"');
    await queryRunner.query('DROP INDEX "public"."idx_alert_preferences_frequency"');
    await queryRunner.query('DROP INDEX "public"."idx_alert_preferences_user_frequency"');
    await queryRunner.query('DROP TABLE "alert_preferences"');
    await queryRunner.query('DROP TYPE "public"."alert_preferences_frequency_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_categories_slug"');
    await queryRunner.query('DROP INDEX "public"."idx_categories_active"');
    await queryRunner.query('DROP INDEX "public"."idx_categories_status"');
    await queryRunner.query('DROP TABLE "categories"');
    await queryRunner.query('DROP TYPE "public"."categories_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_731269ee5a4546d7858ad77a06"');
    await queryRunner.query('DROP TABLE "category_activities"');
    await queryRunner.query('DROP INDEX "public"."idx_category_versions_category_id"');
    await queryRunner.query('DROP INDEX "public"."idx_category_versions_status"');
    await queryRunner.query('DROP TABLE "category_versions"');
    await queryRunner.query('DROP TYPE "public"."category_versions_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_337b3954e7f0d5be042af61320"');
    await queryRunner.query('DROP INDEX "public"."idx_category_reviews_status"');
    await queryRunner.query('DROP TABLE "category_reviews"');
    await queryRunner.query('DROP TYPE "public"."category_reviews_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_7032ff6b4cae3c085ec13a29d1"');
    await queryRunner.query('DROP TABLE "category_review_comments"');
    await queryRunner.query('DROP TYPE "public"."category_review_comments_action_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_ddd8f35ca959341682710c6b6d"');
    await queryRunner.query('DROP TABLE "category_review_assignments"');
    await queryRunner.query('DROP TYPE "public"."category_review_assignments_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"');
    await queryRunner.query('DROP INDEX "public"."IDX_7168f7c9863744429de421cad1"');
    await queryRunner.query('DROP INDEX "public"."IDX_ef8320c2a2c72852adda5d68c5"');
    await queryRunner.query('DROP INDEX "public"."IDX_a5711ddc02238171575201a080"');
    await queryRunner.query('DROP INDEX "public"."IDX_09a2296ade1053a0cc4080bda4"');
    await queryRunner.query('DROP INDEX "public"."IDX_0bd5012aeb82628e07f6a1be53"');
    await queryRunner.query('DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "public"."users_status_enum"');
    await queryRunner.query('DROP TYPE "public"."users_account_type_enum"');
    await queryRunner.query('DROP INDEX "public"."ux_user_dashboard_layouts_user_id"');
    await queryRunner.query('DROP TABLE "user_dashboard_layouts"');
    await queryRunner.query('DROP TYPE "public"."user_dashboard_layouts_theme_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_user_created"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_status"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_type"');
    await queryRunner.query('DROP INDEX "public"."ux_txn_provider_trans_id"');
    await queryRunner.query('DROP TABLE "transactions"');
    await queryRunner.query('DROP TYPE "public"."transactions_status_enum"');
    await queryRunner.query('DROP TYPE "public"."transactions_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_support_tickets_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_support_tickets_status"');
    await queryRunner.query('DROP INDEX "public"."idx_support_tickets_assigned_to_id"');
    await queryRunner.query('DROP INDEX "public"."idx_support_tickets_status_assigned"');
    await queryRunner.query('DROP TABLE "support_tickets"');
    await queryRunner.query('DROP TYPE "public"."support_tickets_category_enum"');
    await queryRunner.query('DROP TYPE "public"."support_tickets_priority_enum"');
    await queryRunner.query('DROP TYPE "public"."support_tickets_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_ticket_messages_ticket_id"');
    await queryRunner.query('DROP INDEX "public"."idx_ticket_messages_ticket_created"');
    await queryRunner.query('DROP INDEX "public"."idx_ticket_messages_sender_id"');
    await queryRunner.query('DROP TABLE "support_ticket_messages"');
    await queryRunner.query('DROP INDEX "public"."idx_ticket_attachments_message_id"');
    await queryRunner.query('DROP TABLE "support_ticket_attachments"');
    await queryRunner.query('DROP INDEX "public"."idx_subs_user_status"');
    await queryRunner.query('DROP INDEX "public"."idx_subs_end_status"');
    await queryRunner.query('DROP TABLE "subscriptions"');
    await queryRunner.query('DROP TYPE "public"."subscriptions_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_18ab8c00fc442d070cedb3b8da"');
    await queryRunner.query('DROP INDEX "public"."idx_scheduled_reports_active_next_run"');
    await queryRunner.query('DROP TABLE "scheduled_reports"');
    await queryRunner.query('DROP TYPE "public"."scheduled_reports_format_enum"');
    await queryRunner.query('DROP TYPE "public"."scheduled_reports_frequency_enum"');
    await queryRunner.query('DROP TYPE "public"."scheduled_reports_report_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_report_recipients_report_id"');
    await queryRunner.query('DROP INDEX "public"."ux_report_recipients_user_role"');
    await queryRunner.query('DROP INDEX "public"."ux_report_recipients_email"');
    await queryRunner.query('DROP INDEX "public"."ux_report_recipients_webhook"');
    await queryRunner.query('DROP TABLE "scheduled_report_recipients"');
    await queryRunner.query('DROP TYPE "public"."scheduled_report_recipients_recipient_type_enum"');
    await queryRunner.query('DROP INDEX "public"."permissions_key_idx"');
    await queryRunner.query('DROP INDEX "public"."permissions_module_id_idx"');
    await queryRunner.query('DROP TABLE "permissions"');
    await queryRunner.query('DROP TYPE "public"."permissions_action_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_5bc3f92e83cad36d72e101d779"');
    await queryRunner.query('DROP TABLE "permission_modules"');
    await queryRunner.query('DROP INDEX "public"."idx_password_histories_user_created"');
    await queryRunner.query('DROP TABLE "password_histories"');
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query('DROP TYPE "public"."notifications_severity_enum"');
    await queryRunner.query('DROP TYPE "public"."notifications_category_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_recipients_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_recipients_role_id"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_recipients_status"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_recipients_user_status_date"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_recipients_role_status_date"');
    await queryRunner.query('DROP TABLE "notification_recipients"');
    await queryRunner.query('DROP TYPE "public"."notification_recipients_channel_enum"');
    await queryRunner.query('DROP TYPE "public"."notification_recipients_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_status"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_active_version_id"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_is_system_role"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_is_default_role"');
    await queryRunner.query('DROP INDEX "public"."ux_default_role"');
    await queryRunner.query('DROP INDEX "public"."roles_key_idx"');
    await queryRunner.query('DROP TABLE "roles"');
    await queryRunner.query('DROP TYPE "public"."roles_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"');
    await queryRunner.query('DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"');
    await queryRunner.query('DROP TABLE "user_roles"');
    await queryRunner.query('DROP INDEX "public"."idx_role_versions_role_id"');
    await queryRunner.query('DROP INDEX "public"."idx_role_versions_status"');
    await queryRunner.query('DROP INDEX "public"."ux_role_versions_active"');
    await queryRunner.query('DROP TABLE "role_versions"');
    await queryRunner.query('DROP TYPE "public"."role_versions_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_7bb7755fb8558ec976d581b119"');
    await queryRunner.query('DROP TABLE "role_version_permissions"');
    await queryRunner.query('DROP INDEX "public"."IDX_7ab98eed4654a8dc334bdb26df"');
    await queryRunner.query('DROP INDEX "public"."ux_role_review_pending"');
    await queryRunner.query('DROP INDEX "public"."idx_role_reviews_status"');
    await queryRunner.query('DROP TABLE "role_reviews"');
    await queryRunner.query('DROP TYPE "public"."role_reviews_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_role_review_comments_review_id"');
    await queryRunner.query('DROP TABLE "role_review_comments"');
    await queryRunner.query('DROP TYPE "public"."role_review_comments_action_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_569a853d8e8bad87636d4b93ed"');
    await queryRunner.query('DROP INDEX "public"."idx_role_review_assignment_review_status"');
    await queryRunner.query('DROP TABLE "role_review_assignments"');
    await queryRunner.query('DROP TYPE "public"."role_review_assignments_status_enum"');
    await queryRunner.query('DROP TABLE "notification_actions"');
    await queryRunner.query('DROP TYPE "public"."notification_actions_type_enum"');
    await queryRunner.query('DROP TABLE "feature_catalog"');
    await queryRunner.query('DROP TYPE "public"."feature_catalog_value_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_export_jobs_status"');
    await queryRunner.query('DROP INDEX "public"."idx_export_jobs_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_export_jobs_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_export_jobs_expires_at"');
    await queryRunner.query('DROP INDEX "public"."idx_export_jobs_status_created"');
    await queryRunner.query('DROP TABLE "export_jobs"');
    await queryRunner.query('DROP TYPE "public"."export_jobs_format_enum"');
    await queryRunner.query('DROP TYPE "public"."export_jobs_export_type_enum"');
    await queryRunner.query('DROP TYPE "public"."export_jobs_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_email_tokens_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_email_tokens_unused"');
    await queryRunner.query('DROP INDEX "public"."idx_email_tokens_lookup"');
    await queryRunner.query('DROP INDEX "public"."uq_email_tokens_hash"');
    await queryRunner.query('DROP INDEX "public"."uq_email_tokens_active"');
    await queryRunner.query('DROP INDEX "public"."email_tokens_type_idx"');
    await queryRunner.query('DROP TABLE "email_tokens"');
    await queryRunner.query('DROP TYPE "public"."email_tokens_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_coupons_validity"');
    await queryRunner.query('DROP INDEX "public"."idx_coupons_active"');
    await queryRunner.query('DROP TABLE "coupons"');
    await queryRunner.query('DROP TYPE "public"."coupons_discount_type_enum"');
    await queryRunner.query('DROP TABLE "plans"');
    await queryRunner.query('DROP TYPE "public"."plans_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_745cc7ba55446d13707c103d94"');
    await queryRunner.query('DROP INDEX "public"."IDX_1c9514eedf2fedb20e3aafd5a4"');
    await queryRunner.query('DROP TABLE "subscription_daily_metrics"');
    await queryRunner.query('DROP INDEX "public"."idx_plan_versions_plan_id"');
    await queryRunner.query('DROP INDEX "public"."idx_plan_versions_status"');
    await queryRunner.query('DROP INDEX "public"."ux_plan_versions_active"');
    await queryRunner.query('DROP TABLE "plan_versions"');
    await queryRunner.query('DROP TYPE "public"."plan_versions_plan_type_enum"');
    await queryRunner.query('DROP TYPE "public"."plan_versions_status_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_153818f75a38884e5976add759"');
    await queryRunner.query('DROP INDEX "public"."ux_plan_review_pending"');
    await queryRunner.query('DROP TABLE "plan_reviews"');
    await queryRunner.query('DROP TYPE "public"."plan_reviews_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_plan_review_comments_review_created"');
    await queryRunner.query('DROP INDEX "public"."idx_plan_review_comments_author"');
    await queryRunner.query('DROP TABLE "plan_review_comments"');
    await queryRunner.query('DROP TYPE "public"."plan_review_comments_action_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_ee2201ae3c00916663df1e890a"');
    await queryRunner.query('DROP INDEX "public"."idx_plan_review_assignment_review_status"');
    await queryRunner.query('DROP TABLE "plan_review_assignments"');
    await queryRunner.query('DROP TYPE "public"."plan_review_assignments_status_enum"');
    await queryRunner.query('DROP TABLE "plan_features"');
    await queryRunner.query('DROP TYPE "public"."plan_features_value_type_enum"');
    await queryRunner.query('DROP TABLE "plan_country_pricing"');
    await queryRunner.query('DROP TABLE "plan_category_pricing"');
    await queryRunner.query('DROP INDEX "public"."idx_country_slug"');
    await queryRunner.query('DROP TABLE "countries"');
    await queryRunner.query('DROP INDEX "public"."IDX_1211ea16bc2c63b2f8765de71b"');
    await queryRunner.query('DROP INDEX "public"."IDX_92e8db9fc520bae642271c597d"');
    await queryRunner.query('DROP TABLE "user_daily_metrics"');
    await queryRunner.query('DROP INDEX "public"."idx_states_country_id_code"');
    await queryRunner.query('DROP INDEX "public"."idx_states_slug"');
    await queryRunner.query('DROP TABLE "states"');
    await queryRunner.query('DROP TYPE "public"."states_type_enum"');
    await queryRunner.query('DROP TABLE "tender_versions"');
    await queryRunner.query('DROP TABLE "tender_reviews"');
    await queryRunner.query('DROP TABLE "tender_review_comments"');
    await queryRunner.query('DROP TABLE "tender_review_assignments"');
    await queryRunner.query('DROP TABLE "tender_documents"');
    await queryRunner.query('DROP TABLE "tenders"');
    await queryRunner.query('DROP TABLE "tender_watchers"');
    await queryRunner.query('DROP TABLE "tender_questions"');
    await queryRunner.query('DROP TABLE "tender_participants"');
    await queryRunner.query('DROP TABLE "tender_evaluations"');
    await queryRunner.query('DROP TABLE "tender_submissions"');
    await queryRunner.query('DROP TABLE "evaluation_templates"');
    await queryRunner.query('DROP TABLE "tender_invitations"');
    await queryRunner.query('DROP INDEX "public"."IDX_c976572173202cbbdc2eea63cf"');
    await queryRunner.query('DROP INDEX "public"."IDX_322b11978e8d4e7b296b7dc76b"');
    await queryRunner.query('DROP TABLE "tender_daily_metrics"');
    await queryRunner.query('DROP TABLE "tender_committees"');
    await queryRunner.query('DROP TABLE "tender_clarifications"');
    await queryRunner.query('DROP TABLE "tender_amendments"');
    await queryRunner.query('DROP INDEX "public"."idx_downloads_user_date"');
    await queryRunner.query('DROP INDEX "public"."idx_downloads_tender_date"');
    await queryRunner.query('DROP INDEX "public"."idx_downloads_date"');
    await queryRunner.query('DROP TABLE "download_history"');
    await queryRunner.query('DROP TYPE "public"."download_history_download_source_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_retention_category_enabled"');
    await queryRunner.query('DROP TABLE "audit_retention_policies"');
    await queryRunner.query('DROP TYPE "public"."audit_retention_policies_category_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_actor_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_target_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_module"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_severity"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_correlation_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_request_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_logs_entity_id"');
    await queryRunner.query('DROP TABLE "audit_logs"');
    await queryRunner.query('DROP TYPE "public"."audit_logs_status_enum"');
    await queryRunner.query('DROP TYPE "public"."audit_logs_severity_enum"');
    await queryRunner.query('DROP TYPE "public"."audit_logs_source_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_analytics_events_type_date"');
    await queryRunner.query('DROP INDEX "public"."idx_analytics_events_actor_type_date"');
    await queryRunner.query('DROP INDEX "public"."idx_analytics_events_correlation"');
    await queryRunner.query('DROP TABLE "analytics_events"');
    await queryRunner.query('DROP TYPE "public"."analytics_events_source_enum"');
    await queryRunner.query('DROP TYPE "public"."analytics_events_event_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_analytics_alerts_unresolved"');
    await queryRunner.query('DROP INDEX "public"."idx_analytics_alerts_metric"');
    await queryRunner.query('DROP TABLE "analytics_alerts"');
    await queryRunner.query('DROP TYPE "public"."analytics_alerts_source_enum"');
    await queryRunner.query('DROP TYPE "public"."analytics_alerts_severity_enum"');
    await queryRunner.query('DROP TYPE "public"."analytics_alerts_trigger_condition_enum"');
  }
}
