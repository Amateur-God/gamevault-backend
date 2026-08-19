import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MediaModule } from "../media/media.module";
import { PlaySessionsModule } from "../play-sessions/play-sessions.module";
import { AchievementState } from "./achievement-state.entity";
import { Achievement } from "./achievement.entity";
import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";
import { SteamImportService } from "./steam-import.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, AchievementState]),
    MediaModule,
    PlaySessionsModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService, SteamImportService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
