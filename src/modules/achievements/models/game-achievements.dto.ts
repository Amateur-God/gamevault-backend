import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Media } from "../../media/media.entity";
import { AchievementSource } from "./achievement-source.enum";

export class AchievementWithStateDto {
  @ApiProperty({ description: "GameVault achievement id", example: 1 })
  id: number;

  @ApiProperty({ description: "provider slug", example: "steam" })
  provider_slug: string;

  @ApiPropertyOptional({ description: "provider game id", example: "1091500" })
  provider_data_id?: string;

  @ApiProperty({ description: "stable provider api name", example: "ACH_FOOL" })
  api_name: string;

  @ApiProperty({ description: "display name", example: "The Fool" })
  display_name: string;

  @ApiPropertyOptional({
    description: "description",
    example: "Become a mercenary.",
  })
  description?: string;

  @ApiProperty({ description: "hidden until unlocked", example: false })
  hidden: boolean;

  @ApiPropertyOptional({ description: "global rarity (0-100)", example: 42.3 })
  global_percentage?: number;

  @ApiPropertyOptional({ description: "unlocked icon", type: () => Media })
  icon?: Media;

  @ApiPropertyOptional({ description: "locked icon", type: () => Media })
  icon_locked?: Media;

  @ApiProperty({ description: "whether unlocked for the user", example: true })
  unlocked: boolean;

  @ApiPropertyOptional({
    description: "date unlocked",
    example: "2026-08-19T11:47:00.000Z",
  })
  unlocked_at?: Date;

  @ApiPropertyOptional({
    description: "source of the unlock state",
    enum: AchievementSource,
  })
  source?: AchievementSource;
}

export class GameAchievementsDto {
  @ApiProperty({ description: "total number of achievements", example: 44 })
  total: number;

  @ApiProperty({ description: "number unlocked for the user", example: 17 })
  unlocked: number;

  @ApiProperty({ type: () => AchievementWithStateDto, isArray: true })
  achievements: AchievementWithStateDto[];
}
