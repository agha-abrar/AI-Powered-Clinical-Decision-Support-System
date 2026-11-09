import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RolesGuard } from "../common/security/roles.guard";
import { RequireRoles } from "../common/security/roles.decorator";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { PatientsService } from "./patients.service";
import { CreatePatientRequestDto, UpdatePatientRequestDto } from "./dto/patients.dto";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { Req } from "@nestjs/common";

@ApiTags("patients")
@Controller("api/v1/patients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async search(
    @Query("q") q?: string,
    @Query("minAge") minAge?: string,
    @Query("maxAge") maxAge?: string,
    @Query("diagnosis") diagnosis?: string,
    @Query("medication") medication?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("sortBy") sortBy: "lastName" | "dateOfBirth" | "createdAt" = "lastName",
    @Query("sortDir") sortDir: "asc" | "desc" = "asc",
  ) {
    return this.patients.search({
      q,
      minAge: minAge ? Number(minAge) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      diagnosis,
      medication,
      page: Number(page),
      pageSize: Math.min(Number(pageSize), 100),
      sortBy,
      sortDir,
    });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PATIENT_WRITE)
  async create(@Body() dto: CreatePatientRequestDto, @Req() req: AuthenticatedRequest) {
    return this.patients.create(dto, req.user!.sub);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async findById(@Param("id") id: string) {
    return this.patients.findById(id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.PATIENT_WRITE)
  async update(@Param("id") id: string, @Body() dto: UpdatePatientRequestDto, @Req() req: AuthenticatedRequest) {
    return this.patients.update(id, dto, req.user!.sub);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.PATIENT_WRITE)
  @RequireRoles("SYSTEM_ADMIN")
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  async remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.patients.remove(id, req.user!.sub);
  }

  @Get(":id/timeline")
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  async timeline(@Param("id") id: string) {
    return this.patients.timeline(id);
  }
}
