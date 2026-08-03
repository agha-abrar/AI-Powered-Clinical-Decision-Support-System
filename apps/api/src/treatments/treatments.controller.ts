import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { TreatmentsService } from "./treatments.service";

@ApiTags("treatments")
@Controller("api/v1")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TreatmentsController {
  constructor(private readonly treatments: TreatmentsService) {}

  @Get("diagnoses/:id/treatment-recommendations")
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async recommendations(@Param("id") diagnosisId: string) {
    return this.treatments.getRecommendationsForDiagnosis(diagnosisId);
  }

  @Post("treatment-plans")
  @RequirePermissions(PERMISSIONS.ENCOUNTER_WRITE)
  async createPlan(@Body() body: { diagnosisId: string; patientId: string; rationale?: string }, @Req() req: AuthenticatedRequest) {
    return this.treatments.createPlan(body.diagnosisId, body.patientId, req.user!.sub, body.rationale);
  }

  @Post("treatment-plans/:id/approve")
  @RequirePermissions(PERMISSIONS.TREATMENT_APPROVE)
  async approve(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.treatments.approvePlan(id, req.user!.sub);
  }

  @Post("treatment-plans/:id/reject")
  @RequirePermissions(PERMISSIONS.TREATMENT_APPROVE)
  async reject(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.treatments.rejectPlan(id, req.user!.sub);
  }
}
