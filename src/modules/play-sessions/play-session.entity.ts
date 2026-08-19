import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GamevaultGame } from "../games/gamevault-game.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { PlaySessionSource } from "./models/play-session-source.enum";

/**
 * A GameVault-tracked play session. GameVault-tracked time is stored separately
 * from imported Steam historical playtime (source), so imports are never mixed
 * into or double-counted against locally tracked sessions.
 */
@Entity()
export class PlaySession extends DatabaseEntity {
  @Index()
  @ManyToOne(() => GamevaultGame, { onDelete: "CASCADE", nullable: false })
  @ApiProperty({
    description: "game the session belongs to",
    type: () => GamevaultGame,
  })
  game: GamevaultGame;

  @Index()
  @ManyToOne(() => GamevaultUser, { onDelete: "CASCADE", nullable: false })
  @ApiProperty({
    description: "user the session belongs to",
    type: () => GamevaultUser,
  })
  user: GamevaultUser;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "id of the host the session ran on, if known",
    example: "Desktop-PC",
  })
  host_id?: string;

  @Column()
  @ApiProperty({
    description: "date the session started",
    example: "2026-08-19T11:00:00.000Z",
  })
  started_at: Date;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "date the session ended",
    example: "2026-08-19T12:42:00.000Z",
  })
  ended_at?: Date;

  @Column({ type: "int", nullable: true })
  @ApiPropertyOptional({
    description: "duration of the session in seconds",
    example: 6120,
  })
  duration_seconds?: number;

  @Column({ type: "varchar", default: PlaySessionSource.GAMEVAULT })
  @ApiProperty({
    description: "source of the play session",
    enum: PlaySessionSource,
    example: PlaySessionSource.GAMEVAULT,
  })
  source: PlaySessionSource;
}
