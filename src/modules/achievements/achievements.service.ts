import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { GamevaultGame } from "../games/gamevault-game.entity";
import { Media } from "../media/media.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { AchievementState } from "./achievement-state.entity";
import { Achievement } from "./achievement.entity";
import { AchievementSource } from "./models/achievement-source.enum";
import {
  AchievementWithStateDto,
  GameAchievementsDto,
} from "./models/game-achievements.dto";

export interface UpsertAchievementDefinition {
  gameId: number;
  provider_slug: string;
  provider_data_id?: string;
  api_name: string;
  display_name: string;
  description?: string;
  hidden?: boolean;
  global_percentage?: number;
  icon?: Media;
  icon_locked?: Media;
}

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(AchievementState)
    private readonly stateRepository: Repository<AchievementState>,
  ) {}

  /** Creates or updates an achievement definition by its provider identity. */
  async upsertDefinition(
    definition: UpsertAchievementDefinition,
  ): Promise<Achievement> {
    const existing = await this.achievementRepository.findOne({
      where: {
        game: { id: definition.gameId },
        provider_slug: definition.provider_slug,
        api_name: definition.api_name,
      },
    });

    const entity = existing ?? new Achievement();
    entity.game = { id: definition.gameId } as GamevaultGame;
    entity.provider_slug = definition.provider_slug;
    entity.provider_data_id = definition.provider_data_id;
    entity.api_name = definition.api_name;
    entity.display_name = definition.display_name;
    entity.description = definition.description;
    entity.hidden = definition.hidden ?? false;
    if (definition.global_percentage !== undefined) {
      entity.global_percentage = definition.global_percentage;
    }
    if (definition.icon !== undefined) {
      entity.icon = definition.icon;
    }
    if (definition.icon_locked !== undefined) {
      entity.icon_locked = definition.icon_locked;
    }

    return this.achievementRepository.save(entity);
  }

  /** Creates or updates a user's unlock state for an achievement. */
  async setState(
    achievementId: number,
    userId: number,
    data: {
      unlocked: boolean;
      unlocked_at?: Date;
      source: AchievementSource;
    },
  ): Promise<AchievementState> {
    const existing = await this.stateRepository.findOne({
      where: { achievement: { id: achievementId }, user: { id: userId } },
    });

    const entity = existing ?? new AchievementState();
    entity.achievement = { id: achievementId } as Achievement;
    entity.user = { id: userId } as GamevaultUser;
    entity.unlocked = data.unlocked;
    entity.unlocked_at = data.unlocked_at;
    entity.source = data.source;

    return this.stateRepository.save(entity);
  }

  async findByApiName(
    gameId: number,
    provider_slug: string,
    api_name: string,
  ): Promise<Achievement | null> {
    return this.achievementRepository.findOne({
      where: { game: { id: gameId }, provider_slug, api_name },
    });
  }

  /**
   * Returns all achievement definitions for a game merged with the given user's
   * unlock state. Works entirely from the local database (offline-capable).
   */
  async findByGameId(
    gameId: number,
    userId?: number,
  ): Promise<GameAchievementsDto> {
    const achievements = await this.achievementRepository.find({
      where: { game: { id: gameId } },
      order: { id: "ASC" },
    });

    const stateByAchievementId = new Map<number, AchievementState>();
    if (userId && achievements.length > 0) {
      const states = await this.stateRepository.find({
        where: {
          achievement: { id: In(achievements.map((a) => a.id)) },
          user: { id: userId },
        },
        relations: ["achievement"],
      });
      for (const state of states) {
        if (state.achievement?.id) {
          stateByAchievementId.set(state.achievement.id, state);
        }
      }
    }

    const merged: AchievementWithStateDto[] = achievements.map(
      (achievement) => {
        const state = stateByAchievementId.get(achievement.id);
        return {
          id: achievement.id,
          provider_slug: achievement.provider_slug,
          provider_data_id: achievement.provider_data_id,
          api_name: achievement.api_name,
          display_name: achievement.display_name,
          description: achievement.description,
          hidden: achievement.hidden,
          global_percentage: achievement.global_percentage,
          icon: achievement.icon,
          icon_locked: achievement.icon_locked,
          unlocked: state?.unlocked ?? false,
          unlocked_at: state?.unlocked_at,
          source: state?.source,
        };
      },
    );

    return {
      total: merged.length,
      unlocked: merged.filter((a) => a.unlocked).length,
      achievements: merged,
    };
  }
}
