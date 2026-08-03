import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { SexAtBirth } from "@prisma/client";

export class CreatePatientRequestDto {
  @ApiProperty() @IsString() medicalRecordNumber!: string;
  @ApiProperty() @IsString() firstName!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() middleName?: string;
  @ApiProperty() @IsString() lastName!: string;
  @ApiProperty() @IsDateString() dateOfBirth!: string;
  @ApiProperty({ enum: SexAtBirth }) @IsEnum(SexAtBirth) sexAtBirth!: SexAtBirth;
  @ApiProperty({ required: false }) @IsOptional() @IsString() genderIdentity?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() preferredLanguage?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() emergencyContact?: string;
}

export class UpdatePatientRequestDto {
  @ApiProperty() @IsInt() @Min(1) version!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() firstName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() middleName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lastName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() emergencyContact?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() preferredLanguage?: string;
}
