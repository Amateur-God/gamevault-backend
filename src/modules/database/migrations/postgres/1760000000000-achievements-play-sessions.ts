import { MigrationInterface, QueryRunner } from "typeorm";

export class AchievementsPlaySessions1760000000000 implements MigrationInterface {
  name = "AchievementsPlaySessions1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "achievement" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "entity_version" integer NOT NULL,
        "provider_slug" character varying NOT NULL,
        "provider_data_id" character varying,
        "api_name" character varying NOT NULL,
        "display_name" character varying NOT NULL,
        "description" character varying,
        "hidden" boolean NOT NULL DEFAULT false,
        "global_percentage" double precision,
        "game_id" integer NOT NULL,
        "icon_id" integer,
        "icon_locked_id" integer,
        CONSTRAINT "PK_achievement" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_achievement_game_id" ON "achievement" ("game_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ACHIEVEMENT" ON "achievement" ("game_id", "provider_slug", "api_name")
    `);

    await queryRunner.query(`
      CREATE TABLE "achievement_state" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "entity_version" integer NOT NULL,
        "unlocked" boolean NOT NULL DEFAULT false,
        "unlocked_at" TIMESTAMP,
        "source" character varying NOT NULL DEFAULT 'gamevault-local',
        "achievement_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "PK_achievement_state" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_achievement_state_achievement_id" ON "achievement_state" ("achievement_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_achievement_state_user_id" ON "achievement_state" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ACHIEVEMENT_STATE" ON "achievement_state" ("achievement_id", "user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "play_session" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "entity_version" integer NOT NULL,
        "host_id" character varying,
        "started_at" TIMESTAMP NOT NULL,
        "ended_at" TIMESTAMP,
        "duration_seconds" integer,
        "source" character varying NOT NULL DEFAULT 'gamevault',
        "game_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "PK_play_session" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_play_session_game_id" ON "play_session" ("game_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_play_session_user_id" ON "play_session" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "achievement"
      ADD CONSTRAINT "FK_achievement_game" FOREIGN KEY ("game_id") REFERENCES "gamevault_game"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "achievement"
      ADD CONSTRAINT "FK_achievement_icon" FOREIGN KEY ("icon_id") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "achievement"
      ADD CONSTRAINT "FK_achievement_icon_locked" FOREIGN KEY ("icon_locked_id") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "achievement_state"
      ADD CONSTRAINT "FK_achievement_state_achievement" FOREIGN KEY ("achievement_id") REFERENCES "achievement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "achievement_state"
      ADD CONSTRAINT "FK_achievement_state_user" FOREIGN KEY ("user_id") REFERENCES "gamevault_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "play_session"
      ADD CONSTRAINT "FK_play_session_game" FOREIGN KEY ("game_id") REFERENCES "gamevault_game"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "play_session"
      ADD CONSTRAINT "FK_play_session_user" FOREIGN KEY ("user_id") REFERENCES "gamevault_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "play_session" DROP CONSTRAINT "FK_play_session_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "play_session" DROP CONSTRAINT "FK_play_session_game"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievement_state" DROP CONSTRAINT "FK_achievement_state_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievement_state" DROP CONSTRAINT "FK_achievement_state_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievement" DROP CONSTRAINT "FK_achievement_icon_locked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievement" DROP CONSTRAINT "FK_achievement_icon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievement" DROP CONSTRAINT "FK_achievement_game"`,
    );
    await queryRunner.query(`DROP TABLE "play_session"`);
    await queryRunner.query(`DROP TABLE "achievement_state"`);
    await queryRunner.query(`DROP TABLE "achievement"`);
  }
}
