import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PASSWORD_POLICY_REGEX } from "@cdss/shared";
import { RoleName } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { roles: { include: { role: true } } },
        orderBy: { fullName: "asc" },
      }),
      this.prisma.user.count(),
    ]);
    return { items: items.map((u) => this.redact(u)), total, page, pageSize };
  }

  async create(
    input: { fullName: string; username: string; email: string; roleNames: RoleName[]; licenseNumber?: string },
    actorUserId: string,
  ) {
    const tempPassword = randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "") + "!Aa1";
    if (!PASSWORD_POLICY_REGEX.test(tempPassword)) {
      // extremely unlikely given construction, but fail safe rather than issue a weak password
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Failed to generate a compliant temporary password" });
    }
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    const roles = await this.prisma.role.findMany({ where: { name: { in: input.roleNames } } });

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        username: input.username,
        email: input.email,
        passwordHash,
        licenseNumber: input.licenseNumber,
        status: "PENDING",
        passwordChangeRequired: true,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
    });

    await this.audit.record({
      actorUserId,
      action: "USER_CREATED",
      resourceType: "User",
      resourceId: user.id,
      metadata: { roles: input.roleNames },
    });

    // In production this temporary password would be delivered via the dev
    // mail adapter (Mailpit), never returned in an API response or logged.
    return { ...this.redact(user), temporaryPassword: tempPassword };
  }

  async activate(id: string, actorUserId: string) {
    return this.setStatus(id, "ACTIVE", actorUserId, "USER_ACTIVATED");
  }
  async deactivate(id: string, actorUserId: string) {
    return this.setStatus(id, "INACTIVE", actorUserId, "USER_DEACTIVATED");
  }
  async lock(id: string, actorUserId: string) {
    return this.setStatus(id, "LOCKED", actorUserId, "USER_LOCKED_BY_ADMIN");
  }
  async unlock(id: string, actorUserId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", lockedUntil: null, failedLoginCount: 0 },
    });
    await this.audit.record({ actorUserId, action: "USER_UNLOCKED", resourceType: "User", resourceId: id });
    return this.redact(user);
  }

  async resetMfa(id: string, actorUserId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { mfaEnabled: false, encryptedMfaSecret: null },
    });
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId: id } });
    await this.audit.record({ actorUserId, action: "USER_MFA_RESET", resourceType: "User", resourceId: id, severity: "WARNING" });
    return this.redact(user);
  }

  async assignRoles(id: string, roleNames: RoleName[], actorUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found" });
    const roles = await this.prisma.role.findMany({ where: { name: { in: roleNames } } });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) }),
    ]);

    await this.audit.record({
      actorUserId,
      action: "USER_ROLES_ASSIGNED",
      resourceType: "User",
      resourceId: id,
      severity: "WARNING",
      metadata: { roles: roleNames },
    });

    return this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
  }

  private async setStatus(id: string, status: "ACTIVE" | "INACTIVE" | "LOCKED", actorUserId: string, action: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found" });
    const updated = await this.prisma.user.update({ where: { id }, data: { status } });
    await this.audit.record({ actorUserId, action, resourceType: "User", resourceId: id, severity: "WARNING" });
    return this.redact(updated);
  }

  // Never returns passwordHash or encryptedMfaSecret to any client.
  private redact<T extends { passwordHash?: string; encryptedMfaSecret?: string | null }>(user: T): Omit<T, "passwordHash" | "encryptedMfaSecret"> {
    const { passwordHash: _p, encryptedMfaSecret: _m, ...rest } = user;
    return rest;
  }
}
