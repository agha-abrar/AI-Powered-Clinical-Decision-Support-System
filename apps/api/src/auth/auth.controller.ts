import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  LoginRequestDto,
  MfaVerifyRequestDto,
  RefreshRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  RegisterRequestDto,
} from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthenticatedRequest } from "./types/authenticated-request";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(@Body() dto: RegisterRequestDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginRequestDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(dto.identifier, dto.password, req.ip, req.get("user-agent"));
  }

  @Post("mfa/verify")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async verifyMfa(@Body() dto: MfaVerifyRequestDto, @Req() req: AuthenticatedRequest) {
    return this.authService.verifyMfa(dto.mfaSessionToken, dto.code, dto.recoveryCode, req.ip);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Body() dto: RefreshRequestDto, @Req() req: AuthenticatedRequest) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: RefreshRequestDto, @Req() req: AuthenticatedRequest) {
    await this.authService.logout(dto.refreshToken, req.user!.sub);
    return { message: "Logged out" };
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(dto.identifier);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }

  @Get("session")
  @UseGuards(JwtAuthGuard)
  async session(@Req() req: AuthenticatedRequest) {
    return { user: req.user };
  }
}
