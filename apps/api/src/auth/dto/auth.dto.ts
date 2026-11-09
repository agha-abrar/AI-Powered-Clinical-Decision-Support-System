import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PASSWORD_POLICY_REGEX } from "@cdss/shared";
import { RoleName } from "@prisma/client";

export class RegisterRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty()
  @Matches(/^[A-Za-z0-9._-]{3,30}$/)
  username!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  roleName!: RoleName;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseNumber?: string;

  @ApiProperty()
  @Matches(PASSWORD_POLICY_REGEX, {
    message:
      "Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character",
  })
  password!: string;
}

export class LoginRequestDto {
  @ApiProperty({ description: "Username or email" })
  @IsString()
  @MinLength(3)
  identifier!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class MfaVerifyRequestDto {
  @ApiProperty()
  @IsString()
  mfaSessionToken!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9]{6}$/)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recoveryCode?: string;
}

export class RefreshRequestDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty()
  @IsString()
  identifier!: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty()
  @IsString()
  resetToken!: string;

  @ApiProperty()
  @Matches(PASSWORD_POLICY_REGEX, {
    message:
      "Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character",
  })
  newPassword!: string;
}
