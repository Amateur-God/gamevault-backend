import { BadRequestException } from "@nestjs/common";

import configuration from "../../configuration";
import { AchievementSource } from "./models/achievement-source.enum";
import { SteamImportService } from "./steam-import.service";

jest.mock("../../configuration", () => ({
  __esModule: true,
  default: {
    SERVER: { LOG_LEVEL: "off", LOG_FILES_ENABLED: false },
    VOLUMES: { LOGS: "./.local/logs", MEDIA: "./.local/media" },
    METADATA: { STEAM: { API_KEY: "TESTKEY" } },
  },
}));

jest.mock("../../logging", () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
  logMedia: jest.fn((media) => media),
  logGamevaultGame: jest.fn((game) => game),
}));

describe("SteamImportService", () => {
  let service: SteamImportService;
  let achievementsService: {
    upsertDefinition: jest.Mock;
    findByApiName: jest.Mock;
    setState: jest.Mock;
  };
  let playSessionsService: { importSteamPlaytime: jest.Mock };
  let mediaService: { downloadByUrl: jest.Mock };

  const schemaAchievements = [
    {
      name: "ACH_1",
      displayName: "First",
      description: "d1",
      hidden: 0,
      icon: "i1",
      icongray: "g1",
    },
    {
      name: "ACH_2",
      displayName: "Second",
      description: "d2",
      hidden: 1,
      icon: "i2",
      icongray: "g2",
    },
    {
      name: "ACH_3",
      displayName: "Third",
      description: "d3",
      hidden: 0,
      icon: "i3",
      icongray: "g3",
    },
  ];

  beforeEach(() => {
    (
      configuration as unknown as { METADATA: { STEAM: { API_KEY?: string } } }
    ).METADATA.STEAM.API_KEY = "TESTKEY";

    achievementsService = {
      upsertDefinition: jest.fn().mockImplementation(async (def) => ({
        id: Number(def.api_name.split("_")[1]),
        api_name: def.api_name,
      })),
      findByApiName: jest
        .fn()
        .mockImplementation(async (_g, _s, apiName: string) => ({
          id: Number(apiName.split("_")[1]),
          api_name: apiName,
        })),
      setState: jest.fn().mockResolvedValue({}),
    };
    playSessionsService = {
      importSteamPlaytime: jest.fn().mockResolvedValue({}),
    };
    mediaService = { downloadByUrl: jest.fn().mockResolvedValue({ id: 99 }) };

    service = new SteamImportService(
      achievementsService as never,
      playSessionsService as never,
      mediaService as never,
    );

    global.fetch = jest.fn(async (url: string) => {
      const respond = (data: unknown) => ({ ok: true, json: async () => data });
      if (url.includes("GetSchemaForGame")) {
        return respond({
          game: { availableGameStats: { achievements: schemaAchievements } },
        }) as never;
      }
      if (url.includes("GetGlobalAchievementPercentagesForApp")) {
        return respond({
          achievementpercentages: {
            achievements: [
              { name: "ACH_1", percent: 55.5 },
              { name: "ACH_2", percent: 4.2 },
            ],
          },
        }) as never;
      }
      if (url.includes("GetPlayerAchievements")) {
        return respond({
          playerstats: {
            achievements: [
              { apiname: "ACH_1", achieved: 1, unlocktime: 1700000000 },
              { apiname: "ACH_2", achieved: 0, unlocktime: 0 },
              { apiname: "ACH_3", achieved: 0, unlocktime: 0 },
            ],
          },
        }) as never;
      }
      if (url.includes("GetOwnedGames")) {
        return respond({
          response: {
            games: [{ appid: 1091500, playtime_forever: 93 }],
          },
        }) as never;
      }
      return respond({}) as never;
    }) as never;
  });

  it("throws when no API key is configured", async () => {
    (
      configuration as unknown as { METADATA: { STEAM: { API_KEY?: string } } }
    ).METADATA.STEAM.API_KEY = undefined;
    await expect(service.import(1, "1091500", 7, "steam-id")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("imports the COMPLETE achievement schema (locked + unlocked), not just earned", async () => {
    const result = await service.import(1, "1091500", 7, "76561197960287930");

    // All 3 definitions imported, regardless of unlock state.
    expect(achievementsService.upsertDefinition).toHaveBeenCalledTimes(3);
    expect(result.achievements_imported).toBe(3);

    // Hidden flag and global percentage mapped through.
    const secondDef = achievementsService.upsertDefinition.mock.calls
      .map((c) => c[0])
      .find((d) => d.api_name === "ACH_2");
    expect(secondDef.hidden).toBe(true);
    expect(secondDef.global_percentage).toBe(4.2);

    // Icons cached locally (2 per achievement).
    expect(mediaService.downloadByUrl).toHaveBeenCalledTimes(6);
  });

  it("imports unlocked state with timestamp and keeps locked achievements", async () => {
    const result = await service.import(1, "1091500", 7, "76561197960287930");

    expect(result.achievements_unlocked).toBe(1);
    expect(achievementsService.setState).toHaveBeenCalledTimes(3);

    const unlockedCall = achievementsService.setState.mock.calls.find(
      (c) => c[2].unlocked === true,
    );
    expect(unlockedCall[2].source).toBe(AchievementSource.STEAM_IMPORT);
    expect(unlockedCall[2].unlocked_at).toBeInstanceOf(Date);
  });

  it("imports historical playtime separately (idempotent path)", async () => {
    const result = await service.import(1, "1091500", 7, "76561197960287930");
    expect(playSessionsService.importSteamPlaytime).toHaveBeenCalledWith(
      1,
      7,
      93,
    );
    expect(result.playtime_minutes).toBe(93);
  });

  it("imports only definitions when no SteamID is provided", async () => {
    const result = await service.import(1, "1091500", 7);
    expect(achievementsService.upsertDefinition).toHaveBeenCalledTimes(3);
    expect(achievementsService.setState).not.toHaveBeenCalled();
    expect(playSessionsService.importSteamPlaytime).not.toHaveBeenCalled();
    expect(result.achievements_unlocked).toBe(0);
  });
});
