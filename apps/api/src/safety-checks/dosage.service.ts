import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export interface DosageCalculationInput {
  medicationId: string;
  indication: string;
  ageYears: number;
  weightKg?: number;
  renalImpairment?: "none" | "mild" | "moderate" | "severe";
  hepaticImpairment?: "none" | "mild" | "moderate" | "severe";
  route?: string;
}

export interface DosageCalculationResult {
  suggestedDose: number;
  doseUnit: string;
  frequency: string;
  maxDose: number | null;
  adjustmentNote: string | null;
  monitoringNote: string | null;
  ruleSource: string;
  ruleVersion: string;
  inputsUsed: DosageCalculationInput;
  limitations: string[];
}

@Injectable()
export class DosageService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(input: DosageCalculationInput): Promise<DosageCalculationResult> {
    const rules = await this.prisma.dosageRule.findMany({
      where: { medicationId: input.medicationId, indication: { equals: input.indication, mode: "insensitive" } },
    });

    const applicable = rules.find(
      (r) =>
        (r.minAgeYears === null || input.ageYears >= r.minAgeYears) &&
        (r.maxAgeYears === null || input.ageYears <= r.maxAgeYears),
    );

    if (!applicable) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message:
          "No deterministic dosage rule found for this medication, indication, and age. Manual clinician dosing is required.",
      });
    }

    let adjustmentNote: string | null = null;
    let doseMultiplier = 1;

    if (input.renalImpairment && input.renalImpairment !== "none" && applicable.renalAdjustment) {
      const adj = applicable.renalAdjustment as Record<string, number>;
      doseMultiplier = adj[input.renalImpairment] ?? doseMultiplier;
      adjustmentNote = `Dose adjusted for ${input.renalImpairment} renal impairment per rule v${applicable.ruleVersion}.`;
    }
    if (input.hepaticImpairment && input.hepaticImpairment !== "none" && applicable.hepaticAdjustment) {
      const adj = applicable.hepaticAdjustment as Record<string, number>;
      doseMultiplier = Math.min(doseMultiplier, adj[input.hepaticImpairment] ?? doseMultiplier);
      adjustmentNote =
        (adjustmentNote ? adjustmentNote + " " : "") +
        `Dose adjusted for ${input.hepaticImpairment} hepatic impairment per rule v${applicable.ruleVersion}.`;
    }

    return {
      suggestedDose: Math.round(applicable.standardDose * doseMultiplier * 100) / 100,
      doseUnit: applicable.doseUnit,
      frequency: applicable.frequency,
      maxDose: applicable.maxDailyDose,
      adjustmentNote,
      monitoringNote: applicable.monitoringNote,
      ruleSource: "DosageRule",
      ruleVersion: applicable.ruleVersion,
      inputsUsed: input,
      limitations: [
        "This is decision support only. The prescribing clinician may modify the suggested dose.",
        "A reason is required to save a dose outside the configured range.",
      ],
    };
  }
}
