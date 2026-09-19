import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789305779401 implements MigrationInterface {
  name = 'InitialSchema1789305779401';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"categories_status_enum\" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(10) NOT NULL, "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "status" "public"."categories_status_enum" NOT NULL DEFAULT \'PUBLISHED\', "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "CHK_18d2161c11ae6ecf5ab649be95" CHECK ("code" ~ \'^[0-9]{3}$\'), CONSTRAINT "CHK_2a27bc1ae15887f56e3cbe4649" CHECK ("slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "idx_categories_active" ON "categories"  ("is_active") ');
    await queryRunner.query('CREATE UNIQUE INDEX "idx_categories_slug" ON "categories"  ("slug") ');
    await queryRunner.query(
      'CREATE TABLE "states" ("id" SMALLSERIAL NOT NULL, "code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "country_id" smallint NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_b3d27f398c36fd133e3181bd79" CHECK ("code" = UPPER("code")), CONSTRAINT "PK_09ab30ca0975c02656483265f4f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_state_country_code" ON "states"  ("country_id", "code") ',
    );
    await queryRunner.query(
      'CREATE TABLE "permission_modules" ("id" SMALLSERIAL NOT NULL, "name" character varying(100) NOT NULL, "key" character varying(100) NOT NULL, "display_order" integer NOT NULL DEFAULT \'0\', "description" text, "is_system_module" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "UQ_5bc3f92e83cad36d72e101d7795" UNIQUE ("key"), CONSTRAINT "PK_5c48abacc03bd94e1d0b52a96ad" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_5bc3f92e83cad36d72e101d779" ON "permission_modules"  ("key") ',
    );
    await queryRunner.query(
      'CREATE TABLE "permissions" ("id" SMALLSERIAL NOT NULL, "module_id" smallint NOT NULL, "name" character varying(100) NOT NULL, "key" character varying(100) NOT NULL, "description" text, "display_order" integer NOT NULL DEFAULT \'0\', "is_active" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "UQ_017943867ed5ceef9c03edd9745" UNIQUE ("key"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "permissions_module_id_idx" ON "permissions"  ("module_id") ',
    );
    await queryRunner.query('CREATE INDEX "permissions_key_idx" ON "permissions"  ("key") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"subscriptions_status_enum\" AS ENUM('active', 'expired', 'cancelled')",
    );
    await queryRunner.query(
      'CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT \'active\', "paypal_subscription_id" character varying, "paypal_order_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_subs_end_status" ON "subscriptions"  ("end_date", "status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_subs_user_status" ON "subscriptions"  ("user_id", "status") ',
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
      "CREATE TYPE \"public\".\"roles_status_enum\" AS ENUM('ACTIVE', 'DISABLED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "status" "public"."roles_status_enum" NOT NULL DEFAULT \'DISABLED\', "is_system_role" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a87cf0659c3ac379b339acf36a2" UNIQUE ("key"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE UNIQUE INDEX "roles_key_idx" ON "roles"  ("key") ');
    await queryRunner.query(
      'CREATE INDEX "idx_roles_is_system_role" ON "roles"  ("is_system_role") ',
    );
    await queryRunner.query('CREATE INDEX "idx_roles_status" ON "roles"  ("status") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"user_roles_status_enum\" AS ENUM('ACTIVE', 'DISABLED', 'ARCHIVED')",
    );
    await queryRunner.query(
      'CREATE TABLE "user_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."user_roles_status_enum" NOT NULL DEFAULT \'ACTIVE\', "assigned_by" uuid, CONSTRAINT "UQ_23ed6f04fe43066df08379fd034" UNIQUE ("user_id", "role_id"), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles"  ("role_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles"  ("user_id") ',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"users_account_type_enum\" AS ENUM('user', 'admin', 'system')",
    );
    await queryRunner.query(
      'CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "country_id" smallint NOT NULL, "password_hash" character varying(255) NOT NULL, "account_type" "public"."users_account_type_enum" NOT NULL DEFAULT \'user\', "company_name" character varying(160) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_7168f7c9863744429de421cad1" ON "users"  ("account_type") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") ');
    await queryRunner.query(
      'CREATE TABLE "countries" ("id" SMALLSERIAL NOT NULL, "code" character(2) NOT NULL, "name" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_b47cbb5311bad9c9ae17b8c1eda" UNIQUE ("code"), CONSTRAINT "CHK_92cfc2422220a786548dcd1d4c" CHECK ("code" ~ \'^[A-Z]{2}$\'), CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."plans_status_enum" AS ENUM(\'ACTIVE\', \'ARCHIVED\')',
    );
    await queryRunner.query(
      'CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_no" character varying(100) NOT NULL, "status" "public"."plans_status_enum" NOT NULL DEFAULT \'ACTIVE\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bcf36850b7c2bab5cffc8c69404" UNIQUE ("reference_no"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"seed_histories_status_enum\" AS ENUM('SUCCESS', 'FAILED', 'APPLIED', 'SKIPPED', 'INVALID')",
    );
    await queryRunner.query(
      'CREATE TABLE "seed_histories" ("id" character varying(150) NOT NULL, "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "checksum" character varying(64) NOT NULL, "status" "public"."seed_histories_status_enum" NOT NULL, CONSTRAINT "PK_9ffd5a9cf4285699a4a6bbd0d2c" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_amendments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_id" uuid NOT NULL, "tender_version_id" uuid, "amendment_number" integer NOT NULL, "title" character varying(255), "description" text, "changed_fields" jsonb, "effective_at" TIMESTAMP WITH TIME ZONE, "published_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1b1c715beec867a704d72ff7dc9" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tenders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_no" character varying NOT NULL, "active_version_id" uuid, "status" character varying(50) NOT NULL DEFAULT \'ACTIVE\', "publish_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by_id" uuid, CONSTRAINT "UQ_34ff1e94c0ba0a1afe811743a8a" UNIQUE ("reference_no"), CONSTRAINT "PK_13fdd4229818a97b5102199463b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "tender_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tender_version_id" uuid NOT NULL, "document_type" character varying(50) NOT NULL, "s3_key" text NOT NULL, "bucket" text NOT NULL, "original_name" text NOT NULL, "mime_type" character varying(150), "file_size" integer, "version" integer NOT NULL DEFAULT \'1\', "checksum" character varying(64), "virus_scan_status" character varying(50) NOT NULL DEFAULT \'Pending\', "is_public" boolean NOT NULL DEFAULT true, "download_count" integer NOT NULL DEFAULT \'0\', "uploaded_by_id" uuid, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_19a19622716a9ad5349f195e582" PRIMARY KEY ("id"))',
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
      'ALTER TABLE "states" ADD CONSTRAINT "FK_f3bbd0bc19bb6d8a887add08461" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
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
      'ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
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
      'ALTER TABLE "users" ADD CONSTRAINT "FK_ae78dc6cb10aa14cfef96b2dd90" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_c28e5652b8282158a300360a5f3" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_e3b3e6fe82a8877884b447c0bf1" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tender_documents" DROP CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73"',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" DROP CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" DROP CONSTRAINT "FK_e3b3e6fe82a8877884b447c0bf1"',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_amendments" DROP CONSTRAINT "FK_c28e5652b8282158a300360a5f3"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_ae78dc6cb10aa14cfef96b2dd90"');
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
      'ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"',
    );
    await queryRunner.query(
      'ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"',
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
      'ALTER TABLE "states" DROP CONSTRAINT "FK_f3bbd0bc19bb6d8a887add08461"',
    );
    await queryRunner.query('DROP INDEX "public"."idx_webhook_provider_event"');
    await queryRunner.query('DROP TABLE "webhook_events"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_status_enum"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_event_type_enum"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_provider_enum"');
    await queryRunner.query('DROP TABLE "tender_documents"');
    await queryRunner.query('DROP TABLE "tenders"');
    await queryRunner.query('DROP TABLE "tender_amendments"');
    await queryRunner.query('DROP TABLE "seed_histories"');
    await queryRunner.query('DROP TYPE "public"."seed_histories_status_enum"');
    await queryRunner.query('DROP TABLE "plans"');
    await queryRunner.query('DROP TYPE "public"."plans_status_enum"');
    await queryRunner.query('DROP TABLE "countries"');
    await queryRunner.query('DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"');
    await queryRunner.query('DROP INDEX "public"."IDX_7168f7c9863744429de421cad1"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "public"."users_account_type_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"');
    await queryRunner.query('DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"');
    await queryRunner.query('DROP TABLE "user_roles"');
    await queryRunner.query('DROP TYPE "public"."user_roles_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_status"');
    await queryRunner.query('DROP INDEX "public"."idx_roles_is_system_role"');
    await queryRunner.query('DROP INDEX "public"."roles_key_idx"');
    await queryRunner.query('DROP TABLE "roles"');
    await queryRunner.query('DROP TYPE "public"."roles_status_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_user_created"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_status"');
    await queryRunner.query('DROP INDEX "public"."idx_txn_type"');
    await queryRunner.query('DROP INDEX "public"."ux_txn_provider_trans_id"');
    await queryRunner.query('DROP TABLE "transactions"');
    await queryRunner.query('DROP TYPE "public"."transactions_status_enum"');
    await queryRunner.query('DROP TYPE "public"."transactions_type_enum"');
    await queryRunner.query('DROP INDEX "public"."idx_subs_user_status"');
    await queryRunner.query('DROP INDEX "public"."idx_subs_end_status"');
    await queryRunner.query('DROP TABLE "subscriptions"');
    await queryRunner.query('DROP TYPE "public"."subscriptions_status_enum"');
    await queryRunner.query('DROP INDEX "public"."permissions_key_idx"');
    await queryRunner.query('DROP INDEX "public"."permissions_module_id_idx"');
    await queryRunner.query('DROP TABLE "permissions"');
    await queryRunner.query('DROP INDEX "public"."IDX_5bc3f92e83cad36d72e101d779"');
    await queryRunner.query('DROP TABLE "permission_modules"');
    await queryRunner.query('DROP INDEX "public"."uq_state_country_code"');
    await queryRunner.query('DROP TABLE "states"');
    await queryRunner.query('DROP INDEX "public"."idx_categories_slug"');
    await queryRunner.query('DROP INDEX "public"."idx_categories_active"');
    await queryRunner.query('DROP TABLE "categories"');
    await queryRunner.query('DROP TYPE "public"."categories_status_enum"');
  }
}
