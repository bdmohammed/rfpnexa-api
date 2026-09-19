import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Role1789368497004 implements MigrationInterface {
  name = 'Role1789368497004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "permission_id" smallint NOT NULL, CONSTRAINT "UQ_25d24010f53bb80b78e412c9656" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"  ("permission_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"  ("role_id") ',
    );
    await queryRunner.query('ALTER TABLE "roles" ADD "created_by" uuid NOT NULL');
    await queryRunner.query('ALTER TABLE "roles" ADD "updated_by" uuid NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "roles" ADD CONSTRAINT "FK_4a39f3095781cdd9d6061afaae5" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "roles" ADD CONSTRAINT "FK_747b580d73db0ad78963d78b076" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"',
    );
    await queryRunner.query('ALTER TABLE "roles" DROP CONSTRAINT "FK_747b580d73db0ad78963d78b076"');
    await queryRunner.query('ALTER TABLE "roles" DROP CONSTRAINT "FK_4a39f3095781cdd9d6061afaae5"');
    await queryRunner.query('ALTER TABLE "roles" DROP COLUMN "updated_by"');
    await queryRunner.query('ALTER TABLE "roles" DROP COLUMN "created_by"');
    await queryRunner.query('DROP INDEX "public"."role_permissions_role_id_idx"');
    await queryRunner.query('DROP INDEX "public"."role_permissions_permission_id_idx"');
    await queryRunner.query('DROP TABLE "role_permissions"');
  }
}
