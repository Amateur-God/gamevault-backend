import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { MinimumRole } from "../../decorators/minimum-role.decorator";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { Role } from "../users/models/role.enum";
import { PlaytimeSummaryDto } from "./models/playtime-summary.dto";
import { StartPlaySessionDto } from "./models/start-play-session.dto";
import { PlaySession } from "./play-session.entity";
import { PlaySessionsService } from "./play-sessions.service";

@Controller()
@ApiTags("play-sessions")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class PlaySessionsController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly playSessionsService: PlaySessionsService) {}

  @Post("play-sessions/start")
  @ApiBody({ type: () => StartPlaySessionDto })
  @ApiOperation({
    summary: "start a GameVault-tracked play session",
    operationId: "startPlaySession",
  })
  @ApiOkResponse({ type: () => PlaySession })
  @MinimumRole(Role.USER)
  async start(
    @Body() body: StartPlaySessionDto,
    @Request() request: { user: GamevaultUser },
  ): Promise<PlaySession> {
    return this.playSessionsService.start(
      body.game_id,
      request.user.id,
      body.host_id,
    );
  }

  @Post("play-sessions/:id/stop")
  @ApiOperation({
    summary: "stop a running play session and record its duration",
    operationId: "stopPlaySession",
  })
  @ApiOkResponse({ type: () => PlaySession })
  @MinimumRole(Role.USER)
  async stop(
    @Param("id") id: string,
    @Request() request: { user: GamevaultUser },
  ): Promise<PlaySession> {
    return this.playSessionsService.stop(Number(id), request.user.id);
  }

  @Get("games/:game_id/playtime")
  @ApiOperation({
    summary:
      "get the current user's playtime for a game (GameVault vs Steam-import vs combined)",
    operationId: "getGamePlaytime",
  })
  @ApiOkResponse({ type: () => PlaytimeSummaryDto })
  @MinimumRole(Role.GUEST)
  async getPlaytime(
    @Param("game_id") gameId: string,
    @Request() request: { user: GamevaultUser },
  ): Promise<PlaytimeSummaryDto> {
    return this.playSessionsService.getSummary(Number(gameId), request.user.id);
  }
}
