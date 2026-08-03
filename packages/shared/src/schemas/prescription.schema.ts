import { z } from "zod";

export const prescriptionItemInputSchema = z.object({
  medicationId: z.string().uuid(),
  strength: z.string().max(50).optional(),
  dose: z.number().positive(),
  doseUnit: z.string().max(20),
  frequency: z.string().max(50),
  route: z.string().max(30),
  durationDays: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  refills: z.number().int().min(0).default(0),
  indication: z.string().max(200).optional(),
  specialInstructions: z.string().max(500).optional(),
});
export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  treatmentPlanId: z.string().uuid().optional(),
  items: z.array(prescriptionItemInputSchema).min(1).max(20),
  notes: z.string().max(1000).optional(),
});
export type CreatePrescriptionDto = z.infer<typeof createPrescriptionSchema>;

export const safetySeveritySchema = z.enum(["MINOR", "MODERATE", "MAJOR", "CONTRAINDICATED"]);

export const safetyCheckResultSchema = z.object({
  checkType: z.enum([
    "DRUG_DRUG",
    "DRUG_ALLERGY",
    "INGREDIENT_ALLERGY",
    "DRUG_CONDITION",
    "DUPLICATE_THERAPY",
    "DOSE_RANGE",
    "RENAL_ADJUSTMENT",
    "HEPATIC_ADJUSTMENT",
    "AGE_WARNING",
    "PREGNANCY_WARNING",
  ]),
  severity: safetySeveritySchema,
  result: z.string(),
  description: z.string(),
  blocked: z.boolean(),
  ruleVersion: z.string(),
  prescriptionItemId: z.string().uuid().optional(),
});
export type SafetyCheckResult = z.infer<typeof safetyCheckResultSchema>;

export const acknowledgeSafetyCheckSchema = z.object({
  overrideReason: z.string().min(10).max(1000).optional(),
});
export type AcknowledgeSafetyCheckDto = z.infer<typeof acknowledgeSafetyCheckSchema>;
