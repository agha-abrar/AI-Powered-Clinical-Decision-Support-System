import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header("x-request-id");
    const requestId = incoming && incoming.length <= 100 ? incoming : randomUUID();
    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  };
}
