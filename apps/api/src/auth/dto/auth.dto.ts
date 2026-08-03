import { IsBoolean, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PASSWORD_POLICY_REGEX } from "@cdss/shared";

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
