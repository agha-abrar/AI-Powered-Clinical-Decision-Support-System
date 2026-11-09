import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import { RoleName } from "@prisma/client";
import { AuthenticatedRequest } from "../../auth/types/authenticated-request";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = new Set(request.user?.roles ?? []);
    const missing = required.filter((r) => !userRoles.has(r));
    if (missing.length > 0) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: `Missing required role(s): ${missing.join(", ")}` });
    }
    return true;
  }
}
