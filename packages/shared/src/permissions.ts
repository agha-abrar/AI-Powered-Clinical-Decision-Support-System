/**
 * Canonical permission keys. Roles are assigned collections of these via
 * RolePermission; guards check the permission key, never the role name
 * directly, so access stays resource-level and least-privilege.
 */
export const PERMISSIONS = {
  PATIENT_READ: "patient:read",
  PATIENT_WRITE: "patient:write",
  ENCOUNTER_WRITE: "encounter:write",
  CLINICAL_NOTE_WRITE: "clinical-note:write",
  VITALS_WRITE: "vitals:write",
  LAB_WRITE: "lab:write",
  DIAGNOSIS_RUN: "diagnosis:run",
  DIAGNOSIS_CONFIRM: "diagnosis:confirm",
  DIAGNOSIS_MANUAL: "diagnosis:manual",
  TREATMENT_APPROVE: "treatment:approve",
  PRESCRIPTION_READ: "prescription:read",
  PRESCRIPTION_WRITE: "prescription:write",
  PRESCRIPTION_FINALIZE: "prescription:finalize",
  PRESCRIPTION_OVERRIDE_MAJOR: "prescription:override-major",
  REPORT_GENERATE: "report:generate",
  REPORT_APPROVE: "report:approve",
  USER_ADMIN: "user:admin",
  DRUG_DB_ADMIN: "drug-db:admin",
  AUDIT_READ: "audit:read",
  AI_CONFIG_ADMIN: "ai-config:admin",
  SYSTEM_SETTINGS_ADMIN: "system-settings:admin",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<"PHYSICIAN" | "NURSE" | "SYSTEM_ADMIN", PermissionKey[]> = {
  PHYSICIAN: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.ENCOUNTER_WRITE,
    PERMISSIONS.CLINICAL_NOTE_WRITE,
    PERMISSIONS.VITALS_WRITE,
    PERMISSIONS.LAB_WRITE,
    PERMISSIONS.DIAGNOSIS_RUN,
    PERMISSIONS.DIAGNOSIS_CONFIRM,
    PERMISSIONS.DIAGNOSIS_MANUAL,
    PERMISSIONS.TREATMENT_APPROVE,
    PERMISSIONS.PRESCRIPTION_READ,
    PERMISSIONS.PRESCRIPTION_WRITE,
    PERMISSIONS.PRESCRIPTION_FINALIZE,
    PERMISSIONS.PRESCRIPTION_OVERRIDE_MAJOR,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.REPORT_APPROVE,
  ],
  NURSE: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.ENCOUNTER_WRITE,
    PERMISSIONS.CLINICAL_NOTE_WRITE,
    PERMISSIONS.VITALS_WRITE,
    PERMISSIONS.LAB_WRITE,
    PERMISSIONS.REPORT_GENERATE,
  ],
  SYSTEM_ADMIN: [
    PERMISSIONS.USER_ADMIN,
    PERMISSIONS.DRUG_DB_ADMIN,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AI_CONFIG_ADMIN,
    PERMISSIONS.SYSTEM_SETTINGS_ADMIN,
  ],
};
