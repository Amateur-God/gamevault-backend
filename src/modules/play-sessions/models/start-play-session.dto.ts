import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class StartPlaySessionDto {
  @ApiProperty({ description: "GameVault game id", example: 1 })
  @IsNumber()
  game_id: number;

  @ApiPropertyOptional({
    description: "id of the host the session runs on",
    example: "Desktop-PC",
  })
  @IsOptional()
  @IsString()
  host_id?: string;
}
