import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GamevaultGame } from "../games/gamevault-game.entity";
import { Media } from "../media/media.entity";

/**
 * A GameVault-owned achievement definition.
 *
 * Achievements belong to a game's identity and carry a provider mapping so the
 * same achievement can be resolved across providers (Steam today, others later)
 * without relying on the display name. Definitions are stored locally so they
 * remain fully viewable offline once imported.
 */
@Entity()
@Index("UQ_ACHIEVEMENT", ["game", "provider_slug", "api_name"], {
  unique: true,
})
export class Achievement extends DatabaseEntity {
  @Index()
  @ManyToOne(() => GamevaultGame, { onDelete: "CASCADE", nullable: false })
  @ApiProperty({
    description: "game the achievement belongs to",
    type: () => GamevaultGame,
  })
  game: GamevaultGame;

  @Column()
  @Index()
  @ApiProperty({
    description: "slug of the provider that defined the achievement",
    example: "steam",
  })
  provider_slug: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "id of the game on the provider (e.g. Steam AppID)",
    example: "1091500",
  })
  provider_data_id?: string;

  @Column()
  @ApiProperty({
    description:
      "stable, provider-specific API/internal name of the achievement (identity, not display name)",
    example: "ACH_THE_FOOL",
  })
  api_name: string;

  @Column()
  @ApiProperty({
    description: "human-readable display name",
    example: "The Fool",
  })
  display_name: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "description of the achievement",
    example: "Become a mercenary.",
  })
  description?: string;

  @Column({ default: false })
  @ApiProperty({
    description: "whether the achievement is hidden until unlocked",
    example: false,
  })
  hidden: boolean;

  @Column({ type: "float", nullable: true })
  @ApiPropertyOptional({
    description: "global unlock percentage/rarity (0-100)",
    example: 42.3,
  })
  global_percentage?: number;

  @ManyToOne(() => Media, { nullable: true, eager: true })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "unlocked icon of the achievement",
    type: () => Media,
  })
  icon?: Media;

  @ManyToOne(() => Media, { nullable: true, eager: true })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "locked/greyed icon of the achievement",
    type: () => Media,
  })
  icon_locked?: Media;
}
