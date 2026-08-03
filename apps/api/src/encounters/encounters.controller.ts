import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { AddLabResultInput, AddVitalsInput, CreateEncounterInput, EncountersService } from "./encounters.service";

@ApiTags("encounters")
@Controller("api/v1")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Post("patients/:id/encounters")
  @RequirePermissions(PERMISSIONS.ENCOUNTER_WRITE)
  async create(@Param("id") patientId: string, @Body() body: Omit<CreateEncounterInput, "patientId">, @Req() req: AuthenticatedRequest) {
    return this.encounters.create({ ...body, patientId }, req.user!.sub);
  }

  @Get("encounters/:id")
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async findById(@Param("id") id: string) {
    return this.encounters.findById(id);
  }

  @Patch("encounters/:id")
  @RequirePermissions(PERMISSIONS.ENCOUNTER_WRITE)
  async updateStatus(@Param("id") id: string, @Body() body: { status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }, @Req() req: AuthenticatedRequest) {
    return this.encounters.updateStatus(id, body.status, req.user!.sub);
  }

  @Post("encounters/:id/vitals")
  @RequirePermissions(PERMISSIONS.VITALS_WRITE)
  async addVitals(@Param("id") id: string, @Body() body: AddVitalsInput, @Req() req: AuthenticatedRequest) {
    return this.encounters.addVitals(id, body, req.user!.sub);
  }

  @Post("encounters/:id/labs")
  @RequirePermissions(PERMISSIONS.LAB_WRITE)
  async addLab(@Param("id") id: string, @Body() body: AddLabResultInput, @Req() req: AuthenticatedRequest) {
    return this.encounters.addLabResult(id, body, req.user!.sub);
  }
}
