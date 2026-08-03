import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SafetySeverity } from "@prisma/client";
import { SafetyCheckResult } from "@cdss/shared";

export interface SafetyCheckContext {
  patientId: string;
  medicationIds: string[]; // all NEW medications in the prescription being checked
  existingMedicationIds: string[]; // patient's current active medications
  ageYears: number;
  weightKg?: number;
  renalImpairment?: "none" | "mild" | "moderate" | "severe";
  hepaticImpairment?: "none" | "mild" | "moderate" | "severe";
  isPregnant?: boolean;
  allergies: { normalizedAllergen: string; severity: "MILD" | "MODERATE" | "SEVERE"; status: string }[];
  conditions: string[]; // normalized condition names/ICD10 for contraindication matching
}

const SEVERITY_RANK: Record<SafetySeverity, number> = {
  MINOR: 0,
  MODERATE: 1,
  MAJOR: 2,
  CONTRAINDICATED: 3,
};

/**
 * RULE_ENGINE_VERSION is bumped whenever a rule's logic changes so every
 * persisted SafetyCheck row records exactly which rule version produced it.
 * Deterministic safety results ALWAYS take precedence over any LLM output —
 * this engine has no dependency on, and is never overridden by, the AI
 * gateway (see services/ai). Nothing here calls OpenRouter.
 */
export const RULE_ENGINE_VERSION = "1.0.0";

@Injectable()
export class MedicationSafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async runAllChecks(
    ctx: SafetyCheckContext,
    byPrescriptionItemMedicationId: Record<string, string>,
  ): Promise<SafetyCheckResult[]> {
    const results: SafetyCheckResult[] = [];

    const allMedIds = Array.from(new Set([...ctx.medicationIds, ...ctx.existingMedicationIds]));
    const medications = await this.prisma.medication.findMany({
      where: { id: { in: allMedIds } },
      include: { ingredients: true, contraindicationRecords: true, dosageRules: true },
    });
    const medById = new Map(medications.map((m) => [m.id, m]));

    // 1. Drug-drug interactions (only pairs where at least one side is a NEW medication)
    const interactions = await this.prisma.drugInteraction.findMany({
      where: {
        OR: [
          { medicationAId: { in: ctx.medicationIds }, medicationBId: { in: allMedIds } },
          { medicationBId: { in: ctx.medicationIds }, medicationAId: { in: allMedIds } },
        ],
      },
    });
    for (const interaction of interactions) {
      if (interaction.medicationAId === interaction.medicationBId) continue;
      const a = medById.get(interaction.medicationAId);
      const b = medById.get(interaction.medicationBId);
      if (!a || !b) continue;
      results.push({
        checkType: "DRUG_DRUG",
        severity: interaction.severity,
        result: `${a.genericName} + ${b.genericName}`,
        description:
          interaction.clinicalEffect ??
          `Potential interaction between ${a.genericName} and ${b.genericName}.${interaction.managementAdvice ? " " + interaction.managementAdvice : ""}`,
        blocked:
          interaction.severity === "CONTRAINDICATED" ||
          (interaction.severity === "MAJOR" && !interaction.allowOverride),
        ruleVersion: interaction.ruleVersion,
        prescriptionItemId: this.findItemFor(
          byPrescriptionItemMedicationId,
          interaction.medicationAId,
          interaction.medicationBId,
          ctx.medicationIds,
        ),
      });
    }

    // 2 & 3. Drug-allergy and ingredient-allergy interactions
    for (const medId of ctx.medicationIds) {
      const med = medById.get(medId);
      if (!med) continue;
      const namesToCheck = [
        med.normalizedGenericName,
        ...med.ingredients.map((i) => i.normalizedIngredientName),
        ...(med.drugClass ? [med.drugClass.toLowerCase()] : []),
      ];
      for (const allergy of ctx.allergies) {
        if (allergy.status !== "ACTIVE") continue;
        const matches = namesToCheck.some(
          (n) => n === allergy.normalizedAllergen || n.includes(allergy.normalizedAllergen) || allergy.normalizedAllergen.includes(n),
        );
        if (!matches) continue;
        const isIngredientOnly = !med.normalizedGenericName.includes(allergy.normalizedAllergen);
        const severity: SafetySeverity = allergy.severity === "SEVERE" ? "CONTRAINDICATED" : "MAJOR";
        results.push({
          checkType: isIngredientOnly ? "INGREDIENT_ALLERGY" : "DRUG_ALLERGY",
          severity,
          result: `${med.genericName} vs documented allergy to ${allergy.normalizedAllergen}`,
          description:
            allergy.severity === "SEVERE"
              ? `Critical: patient has a documented SEVERE allergy to ${allergy.normalizedAllergen}. This prescription is blocked.`
              : `Patient has a documented allergy to ${allergy.normalizedAllergen}. Review before proceeding.`,
          blocked: severity === "CONTRAINDICATED",
          ruleVersion: RULE_ENGINE_VERSION,
          prescriptionItemId: byPrescriptionItemMedicationId[medId],
        });
      }
    }

    // 4. Drug-condition contraindications
    for (const medId of ctx.medicationIds) {
      const med = medById.get(medId);
      if (!med) continue;
      for (const rule of med.contraindicationRecords) {
        const conditionMatches = ctx.conditions.some(
          (c) => c.toLowerCase() === rule.conditionName.toLowerCase() || c.toLowerCase() === (rule.conditionCode ?? "").toLowerCase(),
        );
        if (!conditionMatches) continue;
        results.push({
          checkType: "DRUG_CONDITION",
          severity: rule.severity,
          result: `${med.genericName} contraindicated with ${rule.conditionName}`,
          description: rule.notes ?? `${med.genericName} is contraindicated in patients with ${rule.conditionName}.`,
          blocked: rule.severity === "CONTRAINDICATED" || (rule.severity === "MAJOR" && !rule.allowOverride),
          ruleVersion: rule.ruleVersion,
          prescriptionItemId: byPrescriptionItemMedicationId[medId],
        });
      }
    }

    // 5. Duplicate therapy (two active meds in the same duplicateTherapyGroup)
    const groups = new Map<string, string[]>();
    for (const medId of allMedIds) {
      const med = medById.get(medId);
      if (!med?.duplicateTherapyGroup) continue;
      const list = groups.get(med.duplicateTherapyGroup) ?? [];
      list.push(medId);
      groups.set(med.duplicateTherapyGroup, list);
    }
    for (const [group, ids] of groups) {
      if (ids.length < 2) continue;
      const names = ids.map((id) => medById.get(id)?.genericName).join(", ");
      results.push({
        checkType: "DUPLICATE_THERAPY",
        severity: "MODERATE",
        result: `Duplicate therapy group: ${group}`,
        description: `Multiple medications in the same therapeutic class (${group}) are present: ${names}.`,
        blocked: false,
        ruleVersion: RULE_ENGINE_VERSION,
      });
    }

    // 6-10. Age, renal, hepatic, pregnancy — evaluated per new prescription item via dosage rules
    for (const medId of ctx.medicationIds) {
      const med = medById.get(medId);
      if (!med) continue;
      for (const rule of med.dosageRules) {
        if (rule.minAgeYears !== undefined && rule.minAgeYears !== null && ctx.ageYears < rule.minAgeYears) {
          results.push({
            checkType: "AGE_WARNING",
            severity: "MODERATE",
            result: `${med.genericName} age warning`,
            description: `${med.genericName} dosing guidance assumes a minimum age of ${rule.minAgeYears}; patient is ${ctx.ageYears}.`,
            blocked: false,
            ruleVersion: rule.ruleVersion,
            prescriptionItemId: byPrescriptionItemMedicationId[medId],
          });
        }
        if (ctx.renalImpairment && ctx.renalImpairment !== "none" && rule.renalAdjustment) {
          results.push({
            checkType: "RENAL_ADJUSTMENT",
            severity: ctx.renalImpairment === "severe" ? "MAJOR" : "MODERATE",
            result: `${med.genericName} renal adjustment required`,
            description: `Patient has ${ctx.renalImpairment} renal impairment. Dose adjustment per rule is required before finalizing.`,
            blocked: ctx.renalImpairment === "severe",
            ruleVersion: rule.ruleVersion,
            prescriptionItemId: byPrescriptionItemMedicationId[medId],
          });
        }
        if (ctx.hepaticImpairment && ctx.hepaticImpairment !== "none" && rule.hepaticAdjustment) {
          results.push({
            checkType: "HEPATIC_ADJUSTMENT",
            severity: ctx.hepaticImpairment === "severe" ? "MAJOR" : "MODERATE",
            result: `${med.genericName} hepatic adjustment required`,
            description: `Patient has ${ctx.hepaticImpairment} hepatic impairment. Dose adjustment per rule is required before finalizing.`,
            blocked: ctx.hepaticImpairment === "severe",
            ruleVersion: rule.ruleVersion,
            prescriptionItemId: byPrescriptionItemMedicationId[medId],
          });
        }
      }
      if (ctx.isPregnant && med.pregnancyConsiderations) {
        results.push({
          checkType: "PREGNANCY_WARNING",
          severity: "MAJOR",
          result: `${med.genericName} pregnancy consideration`,
          description: med.pregnancyConsiderations,
          blocked: false,
          ruleVersion: RULE_ENGINE_VERSION,
          prescriptionItemId: byPrescriptionItemMedicationId[medId],
        });
      }
    }

    return results;
  }

  /** Highest-severity result across a set determines whether finalization is blocked. */
  isBlocked(results: SafetyCheckResult[]): boolean {
    return results.some((r) => r.blocked);
  }

  highestSeverity(results: SafetyCheckResult[]): SafetySeverity | null {
    if (results.length === 0) return null;
    return results.reduce<SafetySeverity>(
      (max, r) => (SEVERITY_RANK[r.severity] > SEVERITY_RANK[max] ? r.severity : max),
      "MINOR",
    );
  }

  private findItemFor(map: Record<string, string>, medA: string, medB: string, newMedIds: string[]): string | undefined {
    const newSide = newMedIds.includes(medA) ? medA : newMedIds.includes(medB) ? medB : undefined;
    return newSide ? map[newSide] : undefined;
  }
}
