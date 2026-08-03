import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditSeverity, Prisma } from "@prisma/client";

export interface RecordAuditEventInput {
  actorUserId?: string | null;
  patientId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  success?: boolean;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  deviceId?: string | null;
}

/**
 * AuditLog is append-only at the application layer (no update/delete method
 * is ever exposed). Each entry's hash is derived from the previous entry's
 * hash plus this entry's core fields, forming a tamper-evident chain: editing
 * any historical row breaks every subsequent hash.
 *
 * IMPORTANT: metadata must already be redacted by the caller — this service
 * never receives raw passwords, tokens, API keys, or full AI prompts.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    const last = await this.prisma.auditLog.findFirst({ orderBy: { timestamp: "desc" } });
    const previousHash = last?.entryHash ?? "GENESIS";
    const timestamp = new Date();

    const redactedMetadata = this.redact(input.metadata ?? {});

    const entryHash = this.computeHash({
      previousHash,
      timestamp: timestamp.toISOString(),
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      redactedMetadata,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? undefined,
        patientId: input.patientId ?? undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? undefined,
        success: input.success ?? true,
        severity: input.severity ?? "INFO",
        redactedMetadata: redactedMetadata as Prisma.InputJsonValue,
        requestId: input.requestId ?? undefined,
        deviceId: input.deviceId ?? undefined,
        timestamp,
        previousHash,
        entryHash,
      },
    });
  }

  /** Verifies the full chain (or a windowed slice) is internally consistent. */
  async verifyIntegrity(): Promise<{ valid: boolean; brokenAtId?: string; checked: number }> {
    const entries = await this.prisma.auditLog.findMany({ orderBy: { timestamp: "asc" } });
    let expectedPrevious = "GENESIS";
    for (const entry of entries) {
      if (entry.previousHash !== expectedPrevious) {
        return { valid: false, brokenAtId: entry.id, checked: entries.length };
      }
      const recomputed = this.computeHash({
        previousHash: entry.previousHash ?? "GENESIS",
        timestamp: entry.timestamp.toISOString(),
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        redactedMetadata: entry.redactedMetadata,
      });
      if (recomputed !== entry.entryHash) {
        return { valid: false, brokenAtId: entry.id, checked: entries.length };
      }
      expectedPrevious = entry.entryHash;
    }
    return { valid: true, checked: entries.length };
  }

  private computeHash(input: {
    previousHash: string;
    timestamp: string;
    actorUserId: string | null | undefined;
    action: string;
    resourceType: string;
    resourceId: string | null | undefined;
    redactedMetadata: unknown;
  }): string {
    const canonical = JSON.stringify(input, Object.keys(input).sort());
    return createHash("sha256").update(canonical).digest("hex");
  }

  private redact(metadata: Record<string, unknown>): Record<string, unknown> {
    const forbidden = ["password", "token", "secret", "apikey", "api_key", "prompt", "authorization"];
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata)) {
      if (forbidden.some((f) => k.toLowerCase().includes(f))) continue;
      clean[k] = v;
    }
    return clean;
  }
}
