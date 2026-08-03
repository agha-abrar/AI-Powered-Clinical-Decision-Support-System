import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { PermissionKey } from "@cdss/shared";
import { AuthenticatedRequest } from "../../auth/types/authenticated-request";

/**
 * Every route that requires more than "is logged in" declares
 * @RequirePermissions(...). This guard denies unless the authenticated
 * user's JWT-embedded permission set (resolved at login/refresh time from
 * their current roles) contains ALL declared permissions. Hiding a nav item
 * client-side is a UX nicety only — this guard is the real boundary.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPermissions = new Set(request.user?.permissions ?? []);
    const missing = required.filter((p) => !userPermissions.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: `Missing required permission(s): ${missing.join(", ")}`,
      });
    }
    return true;
  }
}
