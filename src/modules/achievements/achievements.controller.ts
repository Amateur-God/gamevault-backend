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
import { AchievementsService } from "./achievements.service";
import { GameAchievementsDto } from "./models/game-achievements.dto";
import {
  SteamImportDto,
  SteamImportResultDto,
} from "./models/steam-import.dto";
import { SteamImportService } from "./steam-import.service";

@Controller()
@ApiTags("achievements")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class AchievementsController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly steamImportService: SteamImportService,
  ) {}

  @Get("games/:game_id/achievements")
  @ApiOperation({
    summary:
      "get all achievements of a game merged with the current user's unlock state (offline-capable)",
    operationId: "getGameAchievements",
  })
  @ApiOkResponse({ type: () => GameAchievementsDto })
  @MinimumRole(Role.GUEST)
  async getGameAchievements(
    @Param("game_id") gameId: string,
    @Request() request: { user: GamevaultUser },
  ): Promise<GameAchievementsDto> {
    return this.achievementsService.findByGameId(
      Number(gameId),
      request.user?.id,
    );
  }

  @Post("providers/steam/import")
  @ApiBody({ type: () => SteamImportDto })
  @ApiOperation({
    summary:
      "import the complete Steam achievement schema, the user's unlock state, and historical playtime for a game",
    operationId: "importSteamData",
  })
  @ApiOkResponse({ type: () => SteamImportResultDto })
  @MinimumRole(Role.USER)
  async importSteamData(
    @Body() body: SteamImportDto,
    @Request() request: { user: GamevaultUser },
  ): Promise<SteamImportResultDto> {
    return this.steamImportService.import(
      body.game_id,
      body.app_id,
      request.user?.id,
      body.steam_id,
      body.api_key,
    );
  }
}
