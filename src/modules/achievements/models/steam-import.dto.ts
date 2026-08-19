import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class SteamImportDto {
  @ApiProperty({
    description: "GameVault game id to attach the imported data to",
    example: 1,
  })
  @IsNumber()
  game_id: number;

  @ApiProperty({ description: "Steam AppID of the game", example: "1091500" })
  @IsString()
  app_id: string;

  @ApiPropertyOptional({
    description:
      "SteamID64 of the user whose unlock state and playtime should be imported. If omitted, only definitions are imported.",
    example: "76561197960287930",
  })
  @IsOptional()
  @IsString()
  steam_id?: string;
}

export class SteamImportResultDto {
  @ApiProperty({
    description: "number of achievement definitions imported",
    example: 44,
  })
  achievements_imported: number;

  @ApiProperty({
    description: "number of achievements unlocked for the user",
    example: 17,
  })
  achievements_unlocked: number;

  @ApiProperty({
    description: "imported historical playtime in minutes",
    example: 5597,
  })
  playtime_minutes: number;
}
