import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { PrescriptionsService } from "./prescriptions.service";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { DosageService, DosageCalculationInput } from "../safety-checks/dosage.service";
import { CreatePrescriptionDto } from "@cdss/shared";

@ApiTags("prescriptions")
@Controller("api/v1")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService, private readonly dosage: DosageService) {}

  @Post("prescriptions")
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_WRITE)
  async create(@Body() dto: CreatePrescriptionDto, @Req() req: AuthenticatedRequest) {
    return this.prescriptions.createDraft(dto, req.user!.sub);
  }

  @Post("prescriptions/:id/validate")
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_WRITE)
  async validate(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.prescriptions.runSafetyChecks(id, req.user!.sub);
  }

  @Post("prescriptions/:id/finalize")
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_FINALIZE)
  async finalize(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.prescriptions.finalize(id, req.user!.sub);
  }

  @Post("safety/acknowledge/:safetyCheckId")
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_WRITE)
  async acknowledge(
    @Param("safetyCheckId") safetyCheckId: string,
    @Body() body: { overrideReason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptions.acknowledge(safetyCheckId, req.user!.sub, body.overrideReason);
  }

  @Post("dosage/calculate")
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_WRITE)
  async calculateDosage(@Body() body: DosageCalculationInput) {
    return this.dosage.calculate(body);
  }
}
