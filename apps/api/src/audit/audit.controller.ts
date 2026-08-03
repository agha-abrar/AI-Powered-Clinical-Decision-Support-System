import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuditService } from "./audit.service";
import { PrismaService } from "../common/prisma/prisma.service";

@ApiTags("audit")
@Controller("api/v1/audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService, private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async list(
    @Query("userId") userId?: string,
    @Query("patientId") patientId?: string,
    @Query("action") action?: string,
    @Query("severity") severity?: "INFO" | "WARNING" | "CRITICAL",
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
  ) {
    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = {
      ...(userId ? { actorUserId: userId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(action ? { action } : {}),
      ...(severity ? { severity } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { timestamp: "desc" }, take, skip }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: Number(page), pageSize: take };
  }

  @Get("integrity")
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async integrity() {
    return this.audit.verifyIntegrity();
  }
}
