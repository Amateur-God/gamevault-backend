import { ApiProperty } from "@nestjs/swagger";

export class PlaytimeSummaryDto {
  @ApiProperty({
    description: "GameVault-tracked playtime in minutes",
    example: 1302,
  })
  gamevault_minutes: number;

  @ApiProperty({
    description: "imported Steam historical playtime in minutes",
    example: 5597,
  })
  steam_import_minutes: number;

  @ApiProperty({
    description: "manually recorded playtime in minutes",
    example: 0,
  })
  manual_minutes: number;

  @ApiProperty({
    description: "combined playtime in minutes",
    example: 6899,
  })
  combined_minutes: number;
}
