import { MigrationInterface, QueryRunner } from "typeorm";

export class AchievementsPlaySessions1760000000000
  implements MigrationInterface
{
  name = "AchievementsPlaySessions1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "achievement" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "deleted_at" datetime,
        "entity_version" integer NOT NULL,
        "provider_slug" varchar NOT NULL,
        "provider_data_id" varchar,
        "api_name" varchar NOT NULL,
        "display_name" varchar NOT NULL,
        "description" varchar,
        "hidden" boolean NOT NULL DEFAULT (0),
        "global_percentage" float,
        "game_id" integer NOT NULL,
        "icon_id" integer,
        "icon_locked_id" integer,
        CONSTRAINT "FK_achievement_game" FOREIGN KEY ("game_id") REFERENCES "gamevault_game" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_achievement_icon" FOREIGN KEY ("icon_id") REFERENCES "media" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_achievement_icon_locked" FOREIGN KEY ("icon_locked_id") REFERENCES "media" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "deleted_at" datetime,
        "entity_version" integer NOT NULL,
        "unlocked" boolean NOT NULL DEFAULT (0),
        "unlocked_at" datetime,
        "source" varchar NOT NULL DEFAULT ('gamevault-local'),
        "achievement_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "FK_achievement_state_achievement" FOREIGN KEY ("achievement_id") REFERENCES "achievement" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_achievement_state_user" FOREIGN KEY ("user_id") REFERENCES "gamevault_user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "deleted_at" datetime,
        "entity_version" integer NOT NULL,
        "host_id" varchar,
        "started_at" datetime NOT NULL,
        "ended_at" datetime,
        "duration_seconds" integer,
        "source" varchar NOT NULL DEFAULT ('gamevault'),
        "game_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "FK_play_session_game" FOREIGN KEY ("game_id") REFERENCES "gamevault_game" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_play_session_user" FOREIGN KEY ("user_id") REFERENCES "gamevault_user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_play_session_game_id" ON "play_session" ("game_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_play_session_user_id" ON "play_session" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_play_session_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_play_session_game_id"`);
    await queryRunner.query(`DROP TABLE "play_session"`);
    await queryRunner.query(`DROP INDEX "UQ_ACHIEVEMENT_STATE"`);
    await queryRunner.query(`DROP INDEX "IDX_achievement_state_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_achievement_state_achievement_id"`);
    await queryRunner.query(`DROP TABLE "achievement_state"`);
    await queryRunner.query(`DROP INDEX "UQ_ACHIEVEMENT"`);
    await queryRunner.query(`DROP INDEX "IDX_achievement_game_id"`);
    await queryRunner.query(`DROP TABLE "achievement"`);
  }
}
