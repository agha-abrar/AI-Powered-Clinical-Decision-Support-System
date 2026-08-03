import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { JwtClaims } from "../types/authenticated-request";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET") ?? "dev-only-insecure-secret",
    });
  }

  // Payload was already signed by us at login time with a short (e.g. 15m)
  // expiry; we trust its claims as-is rather than re-hitting the DB on every
  // request, but permissions are only ever embedded from the DB at issuance.
  validate(payload: JwtClaims & { purpose?: string }): JwtClaims {
    if (payload.purpose && payload.purpose !== "access") {
      // e.g. an mfa-pending token must never be accepted as a full access token
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid token scope" });
    }
    return payload;
  }
}
