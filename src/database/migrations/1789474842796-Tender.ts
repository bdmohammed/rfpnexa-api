import { MigrationInterface, QueryRunner } from "typeorm";

export class Tender1789474842796 implements MigrationInterface {
    name = 'Tender1789474842796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenders" DROP CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3"`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "title" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "eligibility" text`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "work_performance" text`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "proposal_submission" text`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "deadline" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "country_id" smallint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "state_id" smallint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD "category_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ALTER COLUMN "created_by_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD CONSTRAINT "FK_88e7ca70fde639f001afed0e3e3" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD CONSTRAINT "FK_6e36274650292391f6ff9c36da4" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD CONSTRAINT "FK_722dfed60c7c20893d7e908c6ac" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenders" DROP CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP CONSTRAINT "FK_722dfed60c7c20893d7e908c6ac"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP CONSTRAINT "FK_6e36274650292391f6ff9c36da4"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP CONSTRAINT "FK_88e7ca70fde639f001afed0e3e3"`);
        await queryRunner.query(`ALTER TABLE "tenders" ALTER COLUMN "created_by_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "state_id"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "country_id"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "deadline"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "proposal_submission"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "work_performance"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "eligibility"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "tenders" ADD CONSTRAINT "FK_bce1779e98be9e8d90937c9c8b3" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
