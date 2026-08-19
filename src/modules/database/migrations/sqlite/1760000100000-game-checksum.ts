import { MigrationInterface, QueryRunner } from "typeorm";

export class GameChecksum1760000100000 implements MigrationInterface {
  name = "GameChecksum1760000100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gamevault_game" ADD "checksum" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gamevault_game" DROP COLUMN "checksum"`,
    );
  }
}
