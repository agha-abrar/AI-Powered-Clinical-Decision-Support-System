import { Body, Controller, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { ReportsService } from "./reports.service";
import { ReportType } from "@prisma/client";

@ApiTags("reports")
@Controller("api/v1/reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async compile(
    @Body() body: { patientId: string; reportType: ReportType; encounterId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.compile(body.patientId, body.reportType, body.encounterId, req.user!.sub);
  }

  @Post(":id/approve")
  @RequirePermissions(PERMISSIONS.REPORT_APPROVE)
  async approve(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.reports.approve(id, req.user!.sub);
  }

  @Post(":id/export/json")
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async exportJson(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.reports.exportJson(id, req.user!.sub);
  }

  @Post(":id/export/pdf")
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async exportPdf(@Param("id") id: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.reports.exportPdf(id, req.user!.sub);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-${id}.pdf"`);
    res.send(buffer);
  }
}
