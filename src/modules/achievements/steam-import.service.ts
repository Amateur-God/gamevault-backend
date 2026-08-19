import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import configuration from "../../configuration";
import { MediaService } from "../media/media.service";
import { PlaySessionsService } from "../play-sessions/play-sessions.service";
import { AchievementsService } from "./achievements.service";
import { AchievementSource } from "./models/achievement-source.enum";
import { SteamImportResultDto } from "./models/steam-import.dto";

const STEAM_API = "https://api.steampowered.com";

interface SteamSchemaAchievement {
  name: string;
  displayName: string;
  description?: string;
  hidden?: number;
  icon?: string;
  icongray?: string;
}

@Injectable()
export class SteamImportService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly playSessionsService: PlaySessionsService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Imports the COMPLETE Steam achievement schema (locked + unlocked), the
   * user's unlock state, and historical playtime for a game. Everything is
   * persisted locally so it remains viewable offline afterwards.
   */
  async import(
    gameId: number,
    appId: string,
    userId?: number,
    steamId?: string,
    apiKeyOverride?: string,
  ): Promise<SteamImportResultDto> {
    const apiKey = apiKeyOverride || configuration.METADATA.STEAM.API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        "No Steam Web API key available. Set it in the client's Steam settings or the server's METADATA_STEAM_API_KEY.",
      );
    }

    const result: SteamImportResultDto = {
      achievements_imported: 0,
      achievements_unlocked: 0,
      playtime_minutes: 0,
    };

    // 1. Global rarity percentages (no key required).
    const globalPercentages = await this.fetchGlobalPercentages(appId);

    // 2. Complete achievement schema (ALL achievements, not just earned).
    const schema = await this.fetchJson<{
      game?: {
        availableGameStats?: { achievements?: SteamSchemaAchievement[] };
      };
    }>(
      `${STEAM_API}/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}&l=english`,
    );

    const definitions = schema?.game?.availableGameStats?.achievements ?? [];

    for (const definition of definitions) {
      const icon = await this.downloadImage(definition.icon);
      const iconLocked = await this.downloadImage(definition.icongray);
      await this.achievementsService.upsertDefinition({
        gameId,
        provider_slug: "steam",
        provider_data_id: appId,
        api_name: definition.name,
        display_name: definition.displayName || definition.name,
        description: definition.description,
        hidden: definition.hidden === 1,
        global_percentage: globalPercentages.get(definition.name),
        icon,
        icon_locked: iconLocked,
      });
      result.achievements_imported += 1;
    }

    this.logger.log({
      message: "Imported Steam achievement schema.",
      gameId,
      appId,
      count: result.achievements_imported,
    });

    // 3. Per-user unlock state + historical playtime (requires SteamID).
    if (steamId && userId) {
      const playerAchievements = await this.fetchJson<{
        playerstats?: {
          achievements?: {
            apiname: string;
            achieved: number;
            unlocktime: number;
          }[];
        };
      }>(
        `${STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}&l=english`,
      );

      for (const playerAchievement of playerAchievements?.playerstats
        ?.achievements ?? []) {
        const achievement = await this.achievementsService.findByApiName(
          gameId,
          "steam",
          playerAchievement.apiname,
        );
        if (!achievement) continue;

        const unlocked = playerAchievement.achieved === 1;
        await this.achievementsService.setState(achievement.id, userId, {
          unlocked,
          unlocked_at:
            unlocked && playerAchievement.unlocktime
              ? new Date(playerAchievement.unlocktime * 1000)
              : undefined,
          source: AchievementSource.STEAM_IMPORT,
        });
        if (unlocked) result.achievements_unlocked += 1;
      }

      const minutes = await this.fetchPlaytimeMinutes(apiKey, steamId, appId);
      if (minutes > 0) {
        await this.playSessionsService.importSteamPlaytime(
          gameId,
          userId,
          minutes,
        );
        result.playtime_minutes = minutes;
      }
    }

    return result;
  }

  private async fetchGlobalPercentages(
    appId: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const response = await this.fetchJson<{
      achievementpercentages?: {
        achievements?: { name: string; percent: number }[];
      };
    }>(
      `${STEAM_API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`,
    );
    for (const entry of response?.achievementpercentages?.achievements ?? []) {
      map.set(entry.name, entry.percent);
    }
    return map;
  }

  private async fetchPlaytimeMinutes(
    apiKey: string,
    steamId: string,
    appId: string,
  ): Promise<number> {
    const response = await this.fetchJson<{
      response?: {
        games?: { appid: number; playtime_forever?: number }[];
      };
    }>(
      `${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
    );
    const game = response?.response?.games?.find(
      (candidate) => candidate.appid?.toString() === appId,
    );
    return game?.playtime_forever ?? 0;
  }

  private async downloadImage(url?: string) {
    if (!url) return undefined;
    try {
      return await this.mediaService.downloadByUrl(url);
    } catch (error) {
      this.logger.warn(`Failed to download achievement icon ${url}: ${error}`);
      return undefined;
    }
  }

  private async fetchJson<T>(url: string): Promise<T | undefined> {
    const response = await fetch(url);
    if (!response.ok) {
      this.logger.warn({
        message: "Steam Web API request failed.",
        status: response.status,
      });
      return undefined;
    }
    return (await response.json()) as T;
  }
}
