import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ERROR_CODES, ApiErrorBody } from "@cdss/shared";

/**
 * Never leaks stack traces, SQL, secrets, or raw provider payloads to the
 * client. Full detail is logged server-side only (with redaction applied by
 * the logger), matching section 41 of the spec.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? "unknown";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = "An unexpected error occurred. Please try again.";
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const r = res as Record<string, unknown>;
        message = typeof r.message === "string" ? r.message : message;
        details = Array.isArray(r.message) ? (r.message as unknown[]) : [];
        code = typeof r.code === "string" ? r.code : this.codeForStatus(status);
      }
    } else {
      this.logger.error(
        `Unhandled exception [${requestId}]: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    const body: ApiErrorBody = {
      error: { code, message, details, requestId },
    };
    response.status(status).json(body);
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case 400:
        return ERROR_CODES.VALIDATION_FAILED;
      case 401:
        return ERROR_CODES.UNAUTHORIZED;
      case 403:
        return ERROR_CODES.FORBIDDEN;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 409:
        return ERROR_CODES.CONFLICT_VERSION;
      case 429:
        return ERROR_CODES.RATE_LIMITED;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}
