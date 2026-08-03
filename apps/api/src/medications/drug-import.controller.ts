import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { DrugImportService } from "./drug-import.service";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";

@ApiTags("drug-imports")
@Controller("api/v1/drug-imports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DrugImportController {
  constructor(private readonly imports: DrugImportService) {}

  @Post("preview")
  @RequirePermissions(PERMISSIONS.DRUG_DB_ADMIN)
  async preview(
    @Body() body: { fileName: string; rows: Record<string, unknown>[]; datasetVersion: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.imports.preview(body.fileName, body.rows, req.user!.sub, body.datasetVersion);
  }

  @Post(":id/commit")
  @RequirePermissions(PERMISSIONS.DRUG_DB_ADMIN)
  async commit(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.imports.commit(id, req.user!.sub);
  }
}
