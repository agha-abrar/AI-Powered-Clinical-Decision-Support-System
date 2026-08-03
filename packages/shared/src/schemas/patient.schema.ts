import { z } from "zod";

export const sexAtBirthSchema = z.enum(["MALE", "FEMALE", "INTERSEX", "UNKNOWN"]);

export const createPatientSchema = z.object({
  medicalRecordNumber: z.string().min(3).max(32),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  sexAtBirth: sexAtBirthSchema,
  genderIdentity: z.string().max(50).optional(),
  preferredLanguage: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(500).optional(),
  consentStatus: z.enum(["GRANTED", "DECLINED", "WITHDRAWN", "PENDING"]).default("PENDING"),
});
export type CreatePatientDto = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().extend({
  version: z.number().int().nonnegative(),
});
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;

export const patientSearchQuerySchema = z.object({
  q: z.string().optional(), // free-text: name / MRN
  minAge: z.coerce.number().int().min(0).max(130).optional(),
  maxAge: z.coerce.number().int().min(0).max(130).optional(),
  diagnosis: z.string().optional(),
  medication: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["lastName", "dateOfBirth", "createdAt"]).default("lastName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});
export type PatientSearchQueryDto = z.infer<typeof patientSearchQuerySchema>;
