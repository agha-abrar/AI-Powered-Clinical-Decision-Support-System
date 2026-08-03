import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { MedicationsService } from "./medications.service";

@ApiTags("medications")
@Controller("api/v1/medications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async search(@Query("q") q?: string, @Query("limit") limit = "20") {
    return this.medications.search(q, Math.min(Number(limit) || 20, 100));
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async findById(@Param("id") id: string) {
    return this.medications.findById(id);
  }
}
