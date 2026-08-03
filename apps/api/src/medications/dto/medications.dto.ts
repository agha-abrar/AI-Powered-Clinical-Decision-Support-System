import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class MedicationSearchQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
