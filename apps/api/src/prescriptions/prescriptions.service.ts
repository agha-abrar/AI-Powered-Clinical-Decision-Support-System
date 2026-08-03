import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MedicationSafetyService, SafetyCheckContext } from "../safety-checks/medication-safety.service";
import { CreatePrescriptionDto } from "@cdss/shared";

function calculateAge(dob: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly safety: MedicationSafetyService,
  ) {}

  async createDraft(dto: CreatePrescriptionDto, prescriberId: string) {
    const prescription = await this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        prescriberId,
        treatmentPlanId: dto.treatmentPlanId,
        notes: dto.notes,
        status: "DRAFT",
        items: {
          create: dto.items.map((item) => ({
            medicationId: item.medicationId,
            strength: item.strength,
            dose: item.dose,
            doseUnit: item.doseUnit,
            frequency: item.frequency,
            route: item.route,
            durationDays: item.durationDays,
            startDate: item.startDate ? new Date(item.startDate) : undefined,
            endDate: item.endDate ? new Date(item.endDate) : undefined,
            quantity: item.quantity,
            refills: item.refills,
            indication: item.indication,
            specialInstructions: item.specialInstructions,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.record({
      actorUserId: prescriberId,
      patientId: dto.patientId,
      action: "PRESCRIPTION_DRAFT_CREATED",
      resourceType: "Prescription",
      resourceId: prescription.id,
    });

    return prescription;
  }

  /** Runs and persists deterministic safety checks. Used by both the
   * "preview" action and immediately again before finalization. */
  async runSafetyChecks(prescriptionId: string, actorUserId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true, patient: { include: { allergies: true, medicalHistories: true } } },
    });
    if (!prescription) throw new NotFoundException({ code: "NOT_FOUND", message: "Prescription not found" });

    const existingActivePrescriptions = await this.prisma.prescription.findMany({
      where: { patientId: prescription.patientId, status: "FINALIZED", id: { not: prescriptionId } },
      include: { items: true },
    });
    const existingMedicationIds = Array.from(
      new Set(existingActivePrescriptions.flatMap((p) => p.items.map((i) => i.medicationId))),
    );

    const byPrescriptionItemMedicationId: Record<string, string> = {};
    for (const item of prescription.items) byPrescriptionItemMedicationId[item.medicationId] = item.id;

    const ctx: SafetyCheckContext = {
      patientId: prescription.patientId,
      medicationIds: prescription.items.map((i) => i.medicationId),
      existingMedicationIds,
      ageYears: calculateAge(prescription.patient.dateOfBirth),
      allergies: prescription.patient.allergies.map((a) => ({
        normalizedAllergen: a.normalizedAllergen,
        severity: a.severity,
        status: a.status,
      })),
      conditions: prescription.patient.medicalHistories.map((h) => h.condition.toLowerCase()),
    };

    const results = await this.safety.runAllChecks(ctx, byPrescriptionItemMedicationId);

    // Replace prior (unacknowledged) checks for this prescription with the fresh run.
    await this.prisma.$transaction([
      this.prisma.safetyCheck.deleteMany({ where: { prescriptionId, acknowledgedAt: null } }),
      this.prisma.safetyCheck.createMany({
        data: results.map((r) => ({
          prescriptionId,
          prescriptionItemId: r.prescriptionItemId,
          checkType: r.checkType,
          severity: r.severity,
          result: r.result,
          description: r.description,
          blocked: r.blocked,
          ruleVersion: r.ruleVersion,
        })),
      }),
      this.prisma.prescription.update({ where: { id: prescriptionId }, data: { status: "VALIDATED" } }),
    ]);

    await this.audit.record({
      actorUserId,
      patientId: prescription.patientId,
      action: "PRESCRIPTION_SAFETY_CHECKED",
      resourceType: "Prescription",
      resourceId: prescriptionId,
      severity: this.safety.isBlocked(results) ? "CRITICAL" : "INFO",
      metadata: { resultCount: results.length, blocked: this.safety.isBlocked(results) },
    });

    return this.prisma.safetyCheck.findMany({ where: { prescriptionId } });
  }

  async acknowledge(safetyCheckId: string, actorUserId: string, overrideReason?: string) {
    const check = await this.prisma.safetyCheck.findUnique({ where: { id: safetyCheckId } });
    if (!check) throw new NotFoundException({ code: "NOT_FOUND", message: "Safety check not found" });
    if (check.blocked && check.severity === "CONTRAINDICATED") {
      throw new ForbiddenException({
        code: "SAFETY_BLOCKED",
        message: "Contraindicated findings cannot be overridden. Select another medication or cancel.",
      });
    }
    if (check.severity === "MAJOR" && !overrideReason) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "A detailed reason is required to override a MAJOR severity finding.",
      });
    }
    if (check.severity === "MODERATE" && !overrideReason) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "A rationale is required to acknowledge this warning.",
      });
    }

    await this.prisma.safetyCheck.update({
      where: { id: safetyCheckId },
      data: { acknowledgedByUserId: actorUserId, acknowledgedAt: new Date(), overrideReason },
    });

    await this.audit.record({
      actorUserId,
      action: "SAFETY_CHECK_ACKNOWLEDGED",
      resourceType: "SafetyCheck",
      resourceId: safetyCheckId,
      severity: check.severity === "MAJOR" ? "CRITICAL" : "WARNING",
      metadata: { severity: check.severity, hasReason: !!overrideReason },
    });

    return { acknowledged: true };
  }

  /** Always reruns deterministic checks server-side immediately before
   * finalizing — a stale client-side "safe" state is never trusted. */
  async finalize(prescriptionId: string, actorUserId: string) {
    const freshResults = await this.runSafetyChecks(prescriptionId, actorUserId);
    const unacknowledgedBlocking = freshResults.filter((r) => r.blocked && !r.acknowledgedAt);

    if (unacknowledgedBlocking.length > 0) {
      throw new ForbiddenException({
        code: "SAFETY_BLOCKED",
        message: "This prescription cannot be finalized because of unresolved critical safety findings.",
        details: unacknowledgedBlocking.map((r) => ({ checkType: r.checkType, severity: r.severity, description: r.description })),
      });
    }

    const finalized = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: "FINALIZED", finalizedAt: new Date(), issuedAt: new Date() },
      include: { items: true },
    });

    await this.audit.record({
      actorUserId,
      patientId: finalized.patientId,
      action: "PRESCRIPTION_FINALIZED",
      resourceType: "Prescription",
      resourceId: prescriptionId,
      severity: "WARNING",
    });

    return finalized;
  }
}
