import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TenderDocument1789839986876 implements MigrationInterface {
  name = 'TenderDocument1789839986876';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "document_type"');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "document_type" character varying NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "mime_type"');
    await queryRunner.query('ALTER TABLE "tender_documents" ADD "mime_type" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "mime_type"');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "mime_type" character varying(150)',
    );
    await queryRunner.query('ALTER TABLE "tender_documents" DROP COLUMN "document_type"');
    await queryRunner.query(
      'ALTER TABLE "tender_documents" ADD "document_type" character varying(50) NOT NULL',
    );
  }
}
