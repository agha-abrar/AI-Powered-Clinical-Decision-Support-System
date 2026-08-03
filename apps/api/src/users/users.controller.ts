import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/security/permissions.guard";
import { RequirePermissions } from "../common/security/permissions.decorator";
import { PERMISSIONS } from "@cdss/shared";
import { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { UsersService } from "./users.service";
import { RoleName } from "@prisma/client";

@ApiTags("users")
@Controller("api/v1/users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.USER_ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.users.list(Number(page), Math.min(Number(pageSize), 100));
  }

  @Post()
  async create(
    @Body() body: { fullName: string; username: string; email: string; roleNames: RoleName[]; licenseNumber?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.create(body, req.user!.sub);
  }

  @Post(":id/activate")
  async activate(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.users.activate(id, req.user!.sub);
  }

  @Post(":id/deactivate")
  async deactivate(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.users.deactivate(id, req.user!.sub);
  }

  @Post(":id/lock")
  async lock(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.users.lock(id, req.user!.sub);
  }

  @Post(":id/unlock")
  async unlock(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.users.unlock(id, req.user!.sub);
  }

  @Post(":id/reset-mfa")
  async resetMfa(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.users.resetMfa(id, req.user!.sub);
  }

  @Put(":id/roles")
  async assignRoles(@Param("id") id: string, @Body() body: { roleNames: RoleName[] }, @Req() req: AuthenticatedRequest) {
    return this.users.assignRoles(id, body.roleNames, req.user!.sub);
  }
}
