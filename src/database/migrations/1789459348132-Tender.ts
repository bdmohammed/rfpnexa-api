import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Tender1789459348132 implements MigrationInterface {
  name = 'Tender1789459348132';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tender_documents" DROP CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73"',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "tender_version_id"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "version"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "is_public"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "download_count"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "uploaded_by_id"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "uploaded_at"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "checksum"');
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "virus_scan_status"');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "active_version_id"');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "publish_at"');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "tender_documents" ADD "tender_id" uuid NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD CONSTRAINT "FK_d30f33a671c2aa29089c30b0a40" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tender_documents" DROP CONSTRAINT "FK_d30f33a671c2aa29089c30b0a40"',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "tender_id"');
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD "status" character varying(50) NOT NULL DEFAULT \'ACTIVE\'',
    );
    await queryRunner.query('ALTER TABLE "tenders" ADD "publish_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "tenders" ADD "active_version_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "virus_scan_status" character varying(50) NOT NULL DEFAULT \'Pending\'',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" ADD "checksum" character varying(64)');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" ADD "uploaded_by_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "download_count" integer NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "is_public" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "version" integer NOT NULL DEFAULT \'1\'',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" ADD "tender_version_id" uuid NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD CONSTRAINT "FK_58b64cce5db96c5cca8c7f27b73" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }
}
