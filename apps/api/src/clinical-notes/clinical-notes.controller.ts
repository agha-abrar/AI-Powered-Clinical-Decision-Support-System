import { Body, Controller, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { ClinicalNotesService } from "./clinical-notes.service";

@ApiTags("clinical-notes")
@Controller("api/v1")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClinicalNotesController {
  constructor(private readonly notes: ClinicalNotesService) {}

  @Post("encounters/:id/notes")
  @RequirePermissions(PERMISSIONS.CLINICAL_NOTE_WRITE)
  async create(
    @Param("id") encounterId: string,
    @Body() body: { patientId: string; noteType: string; text: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notes.create(body.patientId, encounterId, body.noteType, body.text, req.user!.sub);
  }

  @Post("clinical-notes/:id/process")
  @RequirePermissions(PERMISSIONS.CLINICAL_NOTE_WRITE)
  async process(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.notes.process(id, req.user!.sub);
  }

  @Patch("clinical-entities/:id")
  @RequirePermissions(PERMISSIONS.CLINICAL_NOTE_WRITE)
  async updateEntity(
    @Param("id") id: string,
    @Body() body: { action: "approve" | "correct" | "reject"; correctedText?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notes.updateEntity(id, req.user!.sub, body.action, body.correctedText);
  }
}
