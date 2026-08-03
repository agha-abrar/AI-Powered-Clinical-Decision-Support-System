import { Body, Controller, Get, Patch, Req, UseGuards, Injectable } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getAll() {
    const rows = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async update(key: string, value: string, actorUserId: string) {
    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedByUserId: actorUserId },
      create: { key, value, updatedByUserId: actorUserId },
    });
    await this.audit.record({
      actorUserId,
      action: "SYSTEM_SETTING_UPDATED",
      resourceType: "SystemSetting",
      resourceId: key,
      severity: "WARNING",
      metadata: { key, value },
    });
    return updated;
  }
}

@ApiTags("settings")
@Controller("api/v1/settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_ADMIN)
  async getAll() {
    return this.settings.getAll();
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_ADMIN)
  async update(@Body() body: { key: string; value: string }, @Req() req: AuthenticatedRequest) {
    return this.settings.update(body.key, body.value, req.user!.sub);
  }
}
