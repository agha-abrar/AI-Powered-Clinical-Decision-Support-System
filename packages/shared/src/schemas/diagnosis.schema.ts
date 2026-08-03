import { z } from "zod";

export const urgencySchema = z.enum(["routine", "urgent", "emergency"]);

export const supportingEvidenceSchema = z.object({
  factor: z.string().max(300),
  source: z.enum(["symptom", "history", "vital", "laboratory", "medication", "allergy", "note"]),
  importance: z.number().int().min(0).max(100),
});

export const suggestedTestSchema = z.object({
  name: z.string().max(200),
  reason: z.string().max(500),
});

export const diagnosisCandidateSchema = z.object({
  rank: z.number().int().min(1).max(5),
  conditionName: z.string().max(200),
  icd10Code: z.string().max(20).nullable(),
  snomedCode: z.string().max(20).nullable(),
  confidence: z.number().int().min(0).max(100),
  urgency: urgencySchema,
  supportingEvidence: z.array(supportingEvidenceSchema).max(20),
  contradictingEvidence: z.array(z.string().max(300)).max(20),
  missingInformation: z.array(z.string().max(300)).max(20),
  suggestedTests: z.array(suggestedTestSchema).max(10),
  explanation: z.string().max(2000),
  limitations: z.array(z.string().max(300)).max(10),
});

export const redFlagSchema = z.object({
  finding: z.string().max(300),
  recommendedAction: z.string().max(500),
});

/**
 * Strict schema for the OpenRouter / local-demo structured diagnostic response.
 * additionalProperties are disallowed at the JSON-schema level on the AI-service
 * side; this Zod schema re-validates on the NestJS side before anything is
 * persisted as a Diagnosis. Never trust a single layer of validation.
 */
export const diagnosticResponseSchema = z
  .object({
    analysisStatus: z.enum(["complete", "insufficient_data", "model_refusal"]),
    clinicalSummary: z.string().max(2000),
    diagnoses: z.array(diagnosisCandidateSchema).max(5),
    redFlags: z.array(redFlagSchema).max(10),
    generalLimitations: z.array(z.string().max(300)).max(10),
    disclaimer: z.literal(
      "This output is advisory and requires review by a qualified healthcare professional.",
    ),
  })
  .superRefine((val, ctx) => {
    if (val.analysisStatus === "complete" && val.diagnoses.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one diagnosis is required when analysisStatus is complete",
      });
    }
    const ranks = val.diagnoses.map((d) => d.rank);
    const sorted = [...ranks].sort((a, b) => a - b);
    if (JSON.stringify(ranks) !== JSON.stringify(sorted)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ranks must be sequential and ascending" });
    }
    for (let i = 1; i < val.diagnoses.length; i++) {
      const current = val.diagnoses[i]!;
      const previous = val.diagnoses[i - 1]!;
      if (current.confidence > previous.confidence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Diagnoses must be sorted by confidence descending",
        });
        break;
      }
    }
  });

export type DiagnosticResponseDto = z.infer<typeof diagnosticResponseSchema>;

export const diagnosticRequestContextSchema = z.object({
  ageOrRange: z.string().max(20),
  sexAtBirth: z.enum(["MALE", "FEMALE", "INTERSEX", "UNKNOWN"]).optional(),
  pregnancyStatus: z.string().max(50).optional(),
  presentingComplaint: z.string().max(500),
  symptoms: z.array(z.string().max(200)).max(30),
  symptomDuration: z.string().max(100).optional(),
  relevantPositives: z.array(z.string().max(200)).max(30).default([]),
  relevantNegatives: z.array(z.string().max(200)).max(30).default([]),
  vitals: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  medicalHistory: z.array(z.string().max(200)).max(30).default([]),
  familyHistory: z.array(z.string().max(200)).max(20).default([]),
  currentMedications: z.array(z.string().max(200)).max(30).default([]),
  allergies: z.array(z.string().max(200)).max(20).default([]),
  labResults: z.array(z.object({ name: z.string(), value: z.string(), unit: z.string().optional() })).max(30).default([]),
  approvedNlpEntities: z.array(z.string().max(200)).max(30).default([]),
  previousRelevantDiagnoses: z.array(z.string().max(200)).max(20).default([]),
  renalInformation: z.string().max(200).optional(),
  hepaticInformation: z.string().max(200).optional(),
  clinicianQuestion: z.string().max(500).optional(),
});
export type DiagnosticRequestContext = z.infer<typeof diagnosticRequestContextSchema>;
