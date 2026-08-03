import { Request } from "express";
import { PermissionKey } from "@cdss/shared";

export interface JwtClaims {
  sub: string; // userId
  username: string;
  roles: string[];
  permissions: PermissionKey[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtClaims;
  requestId?: string;
}
