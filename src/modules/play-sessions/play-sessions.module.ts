import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlaySession } from "./play-session.entity";
import { PlaySessionsController } from "./play-sessions.controller";
import { PlaySessionsService } from "./play-sessions.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlaySession])],
  controllers: [PlaySessionsController],
  providers: [PlaySessionsService],
  exports: [PlaySessionsService],
})
export class PlaySessionsModule {}
