import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GamevaultGame } from "../games/gamevault-game.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { PlaySessionSource } from "./models/play-session-source.enum";
import { PlaytimeSummaryDto } from "./models/playtime-summary.dto";
import { PlaySession } from "./play-session.entity";

@Injectable()
export class PlaySessionsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(PlaySession)
    private readonly playSessionRepository: Repository<PlaySession>,
  ) {}

  /** Starts a new GameVault-tracked play session. */
  async start(
    gameId: number,
    userId: number,
    hostId?: string,
  ): Promise<PlaySession> {
    const session = new PlaySession();
    session.game = { id: gameId } as GamevaultGame;
    session.user = { id: userId } as GamevaultUser;
    session.host_id = hostId;
    session.started_at = new Date();
    session.source = PlaySessionSource.GAMEVAULT;
    return this.playSessionRepository.save(session);
  }

  /** Ends a running session and calculates its duration. */
  async stop(sessionId: number, userId: number): Promise<PlaySession> {
    const session = await this.playSessionRepository.findOne({
      where: { id: sessionId, user: { id: userId } },
    });
    if (!session) {
      throw new NotFoundException(
        `Play session ${sessionId} not found for this user.`,
      );
    }
    session.ended_at = new Date();
    session.duration_seconds = Math.max(
      0,
      Math.round(
        (session.ended_at.getTime() - session.started_at.getTime()) / 1000,
      ),
    );
    return this.playSessionRepository.save(session);
  }

  /**
   * Imports Steam historical playtime as a single, idempotent steam-import
   * session. Re-importing updates the same record instead of adding more time,
   * so refreshes never double-count.
   */
  async importSteamPlaytime(
    gameId: number,
    userId: number,
    minutes: number,
  ): Promise<PlaySession> {
    const existing = await this.playSessionRepository.findOne({
      where: {
        game: { id: gameId },
        user: { id: userId },
        source: PlaySessionSource.STEAM_IMPORT,
      },
    });

    const session = existing ?? new PlaySession();
    session.game = { id: gameId } as GamevaultGame;
    session.user = { id: userId } as GamevaultUser;
    session.source = PlaySessionSource.STEAM_IMPORT;
    session.started_at = session.started_at ?? new Date();
    session.ended_at = new Date();
    session.duration_seconds = Math.round(minutes * 60);
    return this.playSessionRepository.save(session);
  }

  /** Returns playtime totals per source (kept separate) plus the combined sum. */
  async getSummary(
    gameId: number,
    userId: number,
  ): Promise<PlaytimeSummaryDto> {
    const sessions = await this.playSessionRepository.find({
      where: { game: { id: gameId }, user: { id: userId } },
    });

    const secondsBySource = (source: PlaySessionSource): number =>
      sessions
        .filter((s) => s.source === source)
        .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

    const gamevaultMinutes = Math.round(
      secondsBySource(PlaySessionSource.GAMEVAULT) / 60,
    );
    const steamMinutes = Math.round(
      secondsBySource(PlaySessionSource.STEAM_IMPORT) / 60,
    );
    const manualMinutes = Math.round(
      secondsBySource(PlaySessionSource.MANUAL) / 60,
    );

    return {
      gamevault_minutes: gamevaultMinutes,
      steam_import_minutes: steamMinutes,
      manual_minutes: manualMinutes,
      combined_minutes: gamevaultMinutes + steamMinutes + manualMinutes,
    };
  }
}
