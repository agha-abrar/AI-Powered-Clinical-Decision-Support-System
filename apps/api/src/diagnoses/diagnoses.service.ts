import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID, createHash } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AiGatewayClient } from "./ai-gateway.client";
import { DiagnosticRequestContext } from "@cdss/shared";

@Injectable()
export class DiagnosesService {
  private readonly lowConfidenceThreshold = 40;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly aiGateway: AiGatewayClient,
  ) {}

  async runDiagnosticAnalysis(encounterId: string, context: DiagnosticRequestContext, requestedByUserId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException({ code: "NOT_FOUND", message: "Encounter not found" });

    const correlationId = randomUUID();
    const inputHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");

    const run = await this.prisma.diagnosticRun.create({
      data: {
        patientId: encounter.patientId,
        encounterId,
        requestedByUserId,
        provider: "LOCAL_DEMO", // corrected after the gateway responds
        promptTemplateVersion: "v1",
        sanitizationVersion: "v1",
        inputHash,
        status: "PENDING",
      },
    });

    try {
      const result = await this.aiGateway.requestDiagnosis(context, correlationId);

      await this.prisma.diagnosticRun.update({
        where: { id: run.id },
        data: {
          provider: result.provider,
          requestedModel: result.requestedModel,
          returnedModel: result.returnedModel,
          generationId: result.generationId,
          status:
            result.response.analysisStatus === "complete"
              ? "COMPLETE"
              : result.response.analysisStatus === "insufficient_data"
                ? "INSUFFICIENT_DATA"
                : "MODEL_REFUSAL",
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
          latencyMs: result.latencyMs,
          fallbackUsed: result.fallbackUsed,
          fallbackReason: result.fallbackReason,
          validationStatus: "VALID",
          clinicalSummary: result.response.clinicalSummary,
          generalLimitations: result.response.generalLimitations,
          redFlags: result.response.redFlags,
          generatedAt: new Date(),
        },
      });

      const diagnoses = await Promise.all(
        result.response.diagnoses.map((d) =>
          this.prisma.diagnosis.create({
            data: {
              diagnosticRunId: run.id,
              patientId: encounter.patientId,
              encounterId,
              name: d.conditionName,
              icd10Code: d.icd10Code ?? undefined,
              snomedCode: d.snomedCode ?? undefined,
              rank: d.rank,
              confidence: d.confidence,
              urgency: d.urgency.toUpperCase() as "ROUTINE" | "URGENT" | "EMERGENCY",
              source: "AI_SUGGESTED",
              status: "SUGGESTED",
              explanation: d.explanation,
            },
          }),
        ),
      );

      await this.audit.record({
        actorUserId: requestedByUserId,
        patientId: encounter.patientId,
        action: "DIAGNOSTIC_RUN_COMPLETED",
        resourceType: "DiagnosticRun",
        resourceId: run.id,
        metadata: {
          provider: result.provider,
          fallbackUsed: result.fallbackUsed,
          diagnosisCount: diagnoses.length,
          lowConfidence: diagnoses.some((d) => (d.confidence ?? 0) < this.lowConfidenceThreshold),
        },
      });

      return { run: await this.prisma.diagnosticRun.findUnique({ where: { id: run.id } }), diagnoses };
    } catch (err) {
      await this.prisma.diagnosticRun.update({
        where: { id: run.id },
        data: { status: "FAILED", validationStatus: "INVALID_SCHEMA" },
      });
      await this.audit.record({
        actorUserId: requestedByUserId,
        patientId: encounter.patientId,
        action: "DIAGNOSTIC_RUN_FAILED",
        resourceType: "DiagnosticRun",
        resourceId: run.id,
        success: false,
        severity: "WARNING",
      });
      throw err;
    }
  }

  async confirm(diagnosisId: string, actorUserId: string, reasonIfLowConfidence?: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) throw new NotFoundException({ code: "NOT_FOUND", message: "Diagnosis not found" });
    if ((diagnosis.confidence ?? 100) < this.lowConfidenceThreshold && !reasonIfLowConfidence) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "A reason is required to confirm a low-confidence suggestion.",
      });
    }
    const updated = await this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: { status: "CONFIRMED", reviewedByUserId: actorUserId, confirmedAt: new Date(), version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: diagnosis.patientId,
      action: "DIAGNOSIS_CONFIRMED",
      resourceType: "Diagnosis",
      resourceId: diagnosisId,
    });
    return updated;
  }

  async reject(diagnosisId: string, actorUserId: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) throw new NotFoundException({ code: "NOT_FOUND", message: "Diagnosis not found" });
    const updated = await this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: { status: "REJECTED", reviewedByUserId: actorUserId, version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: diagnosis.patientId,
      action: "DIAGNOSIS_REJECTED",
      resourceType: "Diagnosis",
      resourceId: diagnosisId,
    });
    return updated;
  }

  async override(diagnosisId: string, actorUserId: string, overrideReason: string) {
    if (!overrideReason || overrideReason.trim().length < 10) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "A detailed reason (at least 10 characters) is required to override a diagnostic suggestion.",
      });
    }
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) throw new NotFoundException({ code: "NOT_FOUND", message: "Diagnosis not found" });
    const updated = await this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: { status: "OVERRIDDEN", reviewedByUserId: actorUserId, overrideReason, version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: diagnosis.patientId,
      action: "DIAGNOSIS_OVERRIDDEN",
      resourceType: "Diagnosis",
      resourceId: diagnosisId,
      severity: "WARNING",
      metadata: { reason: overrideReason },
    });
    return updated;
  }

  async createManual(
    encounterId: string,
    patientId: string,
    name: string,
    actorUserId: string,
    icd10Code?: string,
  ) {
    const diagnosis = await this.prisma.diagnosis.create({
      data: {
        encounterId,
        patientId,
        name,
        icd10Code,
        source: "MANUAL",
        status: "CONFIRMED",
        reviewedByUserId: actorUserId,
        confirmedAt: new Date(),
      },
    });
    await this.audit.record({
      actorUserId,
      patientId,
      action: "DIAGNOSIS_MANUAL_CREATED",
      resourceType: "Diagnosis",
      resourceId: diagnosis.id,
    });
    return diagnosis;
  }
}
