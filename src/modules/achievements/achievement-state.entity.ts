import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { Achievement } from "./achievement.entity";
import { AchievementSource } from "./models/achievement-source.enum";

/**
 * A user's unlock state for a single achievement. Kept separate from the
 * definition so multiple users on one server can each track their own progress.
 */
@Entity()
@Index("UQ_ACHIEVEMENT_STATE", ["achievement", "user"], { unique: true })
export class AchievementState extends DatabaseEntity {
  @Index()
  @ManyToOne(() => Achievement, { onDelete: "CASCADE", nullable: false })
  @ApiProperty({
    description: "the achievement this state refers to",
    type: () => Achievement,
  })
  achievement: Achievement;

  @Index()
  @ManyToOne(() => GamevaultUser, { onDelete: "CASCADE", nullable: false })
  @ApiProperty({
    description: "the user this state belongs to",
    type: () => GamevaultUser,
  })
  user: GamevaultUser;

  @Column({ default: false })
  @ApiProperty({
    description: "whether the achievement is unlocked for this user",
    example: true,
  })
  unlocked: boolean;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "date the achievement was unlocked",
    example: "2026-08-19T11:47:00.000Z",
  })
  unlocked_at?: Date;

  @Column({ type: "varchar", default: AchievementSource.GAMEVAULT_LOCAL })
  @ApiProperty({
    description: "source that produced this unlock state",
    enum: AchievementSource,
    example: AchievementSource.STEAM_IMPORT,
  })
  source: AchievementSource;
}
