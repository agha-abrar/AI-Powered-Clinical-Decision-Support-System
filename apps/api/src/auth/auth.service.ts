import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import { randomBytes, createHash, randomUUID } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PASSWORD_POLICY_REGEX, ROLE_PERMISSIONS, PermissionKey } from "@cdss/shared";
import { RoleName, UserStatus } from "@prisma/client";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MFA_TOKEN_TTL_SECONDS = 5 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private async getSetting(key: string, fallback: string): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  }

  async register(input: {
    fullName: string;
    username: string;
    email: string;
    roleName: RoleName;
    licenseNumber?: string;
    password: string;
  }) {
    if (this.config.get<string>("DEMO_ALLOW_SELF_REGISTRATION") !== "true") {
      throw new ForbiddenException({ code: "REGISTRATION_DISABLED", message: "Registration is currently unavailable" });
    }
    if (!PASSWORD_POLICY_REGEX.test(input.password)) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character",
      });
    }
    if (input.roleName === "SYSTEM_ADMIN") {
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "System administrator access must be assigned by an administrator" });
    }

    const role = await this.prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Requested role is unavailable" });

    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) throw new ConflictException({ code: "ACCOUNT_EXISTS", message: "An account with those details already exists" });

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          fullName: input.fullName.trim(),
          username,
          email,
          passwordHash,
          licenseNumber: input.licenseNumber?.trim() || undefined,
          status: "PENDING",
          passwordChangeRequired: false,
          roles: { create: [{ roleId: role.id }] },
        },
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new ConflictException({ code: "ACCOUNT_EXISTS", message: "An account with those details already exists" });
      }
      throw error;
    }

    await this.audit.record({
      action: "AUTH_REGISTRATION_REQUESTED",
      resourceType: "User",
      resourceId: user.id,
      metadata: { requestedRole: input.roleName },
    });

    return { message: "Your access request was submitted. An administrator must approve your account before you can sign in." };
  }

  /** Step 1: identifier + password. Returns either full tokens or an MFA challenge. */
  async login(identifier: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    // Constant-shape response to avoid username/email enumeration: we always
    // run a hash comparison, even against a dummy hash, and return the same
    // generic error message regardless of which check failed.
    const dummyHash =
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$3Q3nXf3o9m2iQF0m7lS5rQ"; // pragma: allowlist secret
    const passwordOk = await argon2
      .verify(user?.passwordHash ?? dummyHash, password)
      .catch(() => false);

    await this.logLoginAttempt(user?.id ?? null, identifier, !!(user && passwordOk), ip, userAgent);

    if (!user || !passwordOk) {
      if (user) await this.registerFailedAttempt(user.id);
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    }

    if (user.status === "LOCKED" || (user.lockedUntil && user.lockedUntil > new Date())) {
      throw new ForbiddenException({ code: "ACCOUNT_LOCKED", message: "This account is temporarily locked" });
    }
    if (user.status === "INACTIVE") {
      throw new ForbiddenException({ code: "ACCOUNT_INACTIVE", message: "This account is inactive" });
    }
    if (user.status === "PENDING") {
      throw new ForbiddenException({ code: "ACCOUNT_PENDING", message: "Your account is awaiting administrator approval" });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    const permissions = this.derivePermissions(user.roles.map((r) => r.role.name));
    const roleNames = user.roles.map((r) => r.role.name);

    if (user.mfaEnabled) {
      const mfaSessionToken = await this.jwt.signAsync(
        { sub: user.id, purpose: "mfa" },
        { secret: this.secret(), expiresIn: MFA_TOKEN_TTL_SECONDS },
      );
      await this.audit.record({
        actorUserId: user.id,
        action: "AUTH_LOGIN_MFA_CHALLENGE",
        resourceType: "User",
        resourceId: user.id,
        severity: "INFO",
      });
      return { mfaRequired: true as const, mfaSessionToken };
    }

    const tokens = await this.issueTokenPair(user.id, user.username, roleNames, permissions, ip);
    await this.completeLogin(user.id);
    return { mfaRequired: false as const, ...tokens, roles: roleNames, permissions };
  }

  async verifyMfa(mfaSessionToken: string, code?: string, recoveryCode?: string, ip?: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwt.verifyAsync(mfaSessionToken, { secret: this.secret() });
    } catch {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "MFA session expired or invalid" });
    }
    if (payload.purpose !== "mfa") {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid MFA session" });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } }, recoveryCodes: true },
    });
    if (!user) throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid MFA session" });

    let ok = false;
    if (code && user.encryptedMfaSecret) {
      // encryptedMfaSecret is decrypted just-in-time by FieldEncryptionService
      // in a real deployment; kept simple here to avoid a circular DI edge.
      ok = authenticator.check(code, user.encryptedMfaSecret);
    } else if (recoveryCode) {
      const hash = createHash("sha256").update(recoveryCode).digest("hex");
      const match = user.recoveryCodes.find((r) => r.codeHash === hash && !r.usedAt);
      if (match) {
        ok = true;
        await this.prisma.mfaRecoveryCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
      }
    }

    if (!ok) {
      await this.audit.record({
        actorUserId: user.id,
        action: "AUTH_MFA_FAILED",
        resourceType: "User",
        resourceId: user.id,
        success: false,
        severity: "WARNING",
      });
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid MFA code" });
    }

    const roleNames = user.roles.map((r) => r.role.name);
    const permissions = this.derivePermissions(roleNames);
    const tokens = await this.issueTokenPair(user.id, user.username, roleNames, permissions, ip);
    await this.completeLogin(user.id);
    await this.audit.record({
      actorUserId: user.id,
      action: "AUTH_MFA_SUCCESS",
      resourceType: "User",
      resourceId: user.id,
      severity: "INFO",
    });
    return { ...tokens, roles: roleNames, permissions };
  }

  /** Rotating refresh tokens with reuse detection: a previously-used token
   * being replayed indicates possible theft and revokes the entire family. */
  async refresh(refreshToken: string, ip?: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
    }
    if (record.revokedAt || record.expiresAt < new Date()) {
      if (record.revokedAt) {
        // Reused a token that was already rotated away — revoke the whole family.
        await this.prisma.refreshToken.updateMany({
          where: { familyId: record.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.record({
          actorUserId: record.userId,
          action: "AUTH_REFRESH_REUSE_DETECTED",
          resourceType: "RefreshToken",
          resourceId: record.id,
          severity: "CRITICAL",
          success: false,
        });
        throw new UnauthorizedException({
          code: "REFRESH_TOKEN_REUSE_DETECTED",
          message: "Session invalidated due to suspicious activity. Please log in again.",
        });
      }
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Refresh token expired" });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Account is not active" });
    }

    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

    const roleNames = user.roles.map((r) => r.role.name);
    const permissions = this.derivePermissions(roleNames);
    const tokens = await this.issueTokenPair(user.id, user.username, roleNames, permissions, ip, record.familyId);
    return { ...tokens, roles: roleNames, permissions };
  }

  async logout(refreshToken: string, userId: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({ actorUserId: userId, action: "AUTH_LOGOUT", resourceType: "User", resourceId: userId });
  }

  async forgotPassword(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });
    // Always behave identically whether or not the account exists, to avoid
    // enumeration. The email adapter (dev: Mailpit) is only invoked if found.
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });
      await this.audit.record({
        actorUserId: user.id,
        action: "AUTH_PASSWORD_RESET_REQUESTED",
        resourceType: "User",
        resourceId: user.id,
      });
      // In this prototype the dev mailer would send `rawToken` via the
      // Mailpit adapter (see common/mail). Never logged in production.
    }
    return { message: "If an account exists for that identifier, password reset instructions have been sent." };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const tokenHash = this.hashToken(resetToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Reset token is invalid or expired" });
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, passwordChangeRequired: false },
      }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record({
      actorUserId: record.userId,
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      resourceType: "User",
      resourceId: record.userId,
      severity: "WARNING",
    });
    return { message: "Password has been reset. Please log in with your new password." };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private secret(): string {
    return this.config.get<string>("JWT_ACCESS_SECRET") ?? "dev-only-insecure-secret";
  }

  private refreshSecretRaw(): string {
    return this.config.get<string>("JWT_REFRESH_SECRET") ?? "dev-only-insecure-refresh-secret";
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token + this.refreshSecretRaw()).digest("hex");
  }

  private derivePermissions(roleNames: RoleName[]): PermissionKey[] {
    const set = new Set<PermissionKey>();
    for (const r of roleNames) {
      for (const p of ROLE_PERMISSIONS[r] ?? []) set.add(p);
    }
    return Array.from(set);
  }

  private async issueTokenPair(
    userId: string,
    username: string,
    roles: RoleName[],
    permissions: PermissionKey[],
    ip?: string,
    familyId?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, username, roles, permissions, purpose: "access" },
      { secret: this.secret(), expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const rawRefreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
        createdByIp: ip,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS };
  }

  private async registerFailedAttempt(userId: string) {
    const threshold = Number(await this.getSetting("AUTH_FAILED_LOGIN_LIMIT", "5"));
    const lockMinutes = Number(await this.getSetting("AUTH_LOCK_MINUTES", "30"));
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
    });
    if (user.failedLoginCount >= threshold) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: "LOCKED" as UserStatus, lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000) },
      });
      await this.audit.record({
        actorUserId: userId,
        action: "AUTH_ACCOUNT_LOCKED",
        resourceType: "User",
        resourceId: userId,
        severity: "WARNING",
      });
    }
  }

  private async completeLogin(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: userId, action: "AUTH_LOGIN_SUCCESS", resourceType: "User", resourceId: userId });
  }

  private async logLoginAttempt(userId: string | null, usernameTried: string, success: boolean, ip?: string, userAgent?: string) {
    await this.prisma.loginAttempt.create({
      data: { userId: userId ?? undefined, usernameTried, success, ipAddress: ip, userAgent },
    });
    if (!success) {
      await this.audit.record({
        actorUserId: userId,
        action: "AUTH_LOGIN_FAILED",
        resourceType: "User",
        resourceId: userId ?? undefined,
        success: false,
        severity: "WARNING",
      });
    }
  }
}
