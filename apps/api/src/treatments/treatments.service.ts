import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Returns curated (non-AI-authored) recommendations matched to the diagnosis
   * by ICD-10 code, pulling in any verified guideline references. */
  async getRecommendationsForDiagnosis(diagnosisId: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) throw new NotFoundException({ code: "NOT_FOUND", message: "Diagnosis not found" });

    const references = diagnosis.icd10Code
      ? await this.prisma.clinicalGuidelineReference.findMany({
          where: { conditionCode: diagnosis.icd10Code, status: "active" },
        })
      : [];

    return { diagnosis, matchedReferences: references };
  }

  async createPlan(diagnosisId: string, patientId: string, createdByUserId: string, rationale?: string) {
    const plan = await this.prisma.treatmentPlan.create({
      data: { diagnosisId, patientId, createdByUserId, rationale, status: "DRAFT" },
    });
    await this.audit.record({
      actorUserId: createdByUserId,
      patientId,
      action: "TREATMENT_PLAN_CREATED",
      resourceType: "TreatmentPlan",
      resourceId: plan.id,
    });
    return plan;
  }

  async addRecommendation(
    treatmentPlanId: string,
    input: {
      title: string;
      description: string;
      lifestyleInterventions?: string[];
      medicationOptions?: string[];
      monitoringRequirements?: string[];
      contraindications?: string[];
      guidelineReferenceId?: string;
    },
    actorUserId: string,
  ) {
    const rec = await this.prisma.treatmentRecommendation.create({
      data: {
        treatmentPlanId,
        title: input.title,
        description: input.description,
        lifestyleInterventions: input.lifestyleInterventions,
        medicationOptions: input.medicationOptions,
        monitoringRequirements: input.monitoringRequirements,
        contraindications: input.contraindications,
        guidelineReferenceId: input.guidelineReferenceId,
        recommendationSource: "LOCAL_CURATED",
        limitations: ["Advisory only. Final treatment selection requires physician approval."],
      },
    });
    await this.audit.record({
      actorUserId,
      action: "TREATMENT_RECOMMENDATION_ADDED",
      resourceType: "TreatmentRecommendation",
      resourceId: rec.id,
    });
    return rec;
  }

  async selectRecommendation(recommendationId: string, actorUserId: string) {
    const rec = await this.prisma.treatmentRecommendation.update({
      where: { id: recommendationId },
      data: { selected: true },
    });
    await this.audit.record({
      actorUserId,
      action: "TREATMENT_RECOMMENDATION_SELECTED",
      resourceType: "TreatmentRecommendation",
      resourceId: recommendationId,
    });
    return rec;
  }

  async approvePlan(planId: string, actorUserId: string) {
    const plan = await this.prisma.treatmentPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException({ code: "NOT_FOUND", message: "Treatment plan not found" });
    const updated = await this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: { status: "APPROVED", approvedAt: new Date(), version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: plan.patientId,
      action: "TREATMENT_PLAN_APPROVED",
      resourceType: "TreatmentPlan",
      resourceId: planId,
    });
    return updated;
  }

  async rejectPlan(planId: string, actorUserId: string) {
    const plan = await this.prisma.treatmentPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException({ code: "NOT_FOUND", message: "Treatment plan not found" });
    const updated = await this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: { status: "REJECTED", version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: plan.patientId,
      action: "TREATMENT_PLAN_REJECTED",
      resourceType: "TreatmentPlan",
      resourceId: planId,
    });
    return updated;
  }
}
