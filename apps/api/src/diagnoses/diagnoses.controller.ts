import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { DiagnosesService } from "./diagnoses.service";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { Req } from "@nestjs/common";
import { DiagnosticRequestContext } from "@cdss/shared";

@ApiTags("diagnoses")
@Controller("api/v1")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DiagnosesController {
  constructor(private readonly diagnoses: DiagnosesService) {}

  @Post("encounters/:id/diagnostic-runs")
  @RequirePermissions(PERMISSIONS.DIAGNOSIS_RUN)
  async run(@Param("id") encounterId: string, @Body() context: DiagnosticRequestContext, @Req() req: AuthenticatedRequest) {
    return this.diagnoses.runDiagnosticAnalysis(encounterId, context, req.user!.sub);
  }

  @Post("diagnoses/:id/confirm")
  @RequirePermissions(PERMISSIONS.DIAGNOSIS_CONFIRM)
  async confirm(@Param("id") id: string, @Body() body: { reason?: string }, @Req() req: AuthenticatedRequest) {
    return this.diagnoses.confirm(id, req.user!.sub, body?.reason);
  }

  @Post("diagnoses/:id/reject")
  @RequirePermissions(PERMISSIONS.DIAGNOSIS_CONFIRM)
  async reject(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.diagnoses.reject(id, req.user!.sub);
  }

  @Post("diagnoses/:id/override")
  @RequirePermissions(PERMISSIONS.DIAGNOSIS_CONFIRM)
  async override(@Param("id") id: string, @Body() body: { reason: string }, @Req() req: AuthenticatedRequest) {
    return this.diagnoses.override(id, req.user!.sub, body.reason);
  }

  @Post("diagnoses/manual")
  @RequirePermissions(PERMISSIONS.DIAGNOSIS_MANUAL)
  async manual(
    @Body() body: { encounterId: string; patientId: string; name: string; icd10Code?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.diagnoses.createManual(body.encounterId, body.patientId, body.name, req.user!.sub, body.icd10Code);
  }
}
