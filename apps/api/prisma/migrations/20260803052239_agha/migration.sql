-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'LOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('PHYSICIAN', 'NURSE', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "SexAtBirth" AS ENUM ('MALE', 'FEMALE', 'INTERSEX', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DECLINED', 'WITHDRAWN', 'PENDING');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('OUTPATIENT', 'INPATIENT', 'TELEHEALTH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AllergyType" AS ENUM ('DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "NlpStatus" AS ENUM ('PENDING', 'PROCESSED', 'APPROVED', 'CORRECTED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "EntityCategory" AS ENUM ('SYMPTOM', 'CONDITION', 'OBSERVATION', 'MEDICATION', 'ALLERGY', 'PROCEDURE', 'LAB_CONCEPT', 'ANATOMICAL_TERM', 'DURATION', 'FAMILY_HISTORY');

-- CreateEnum
CREATE TYPE "DiagnosticProvider" AS ENUM ('OPENROUTER', 'LOCAL_DEMO');

-- CreateEnum
CREATE TYPE "DiagnosticRunStatus" AS ENUM ('PENDING', 'COMPLETE', 'INSUFFICIENT_DATA', 'MODEL_REFUSAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('VALID', 'INVALID_SCHEMA', 'REJECTED_UNSAFE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DiagnosisSource" AS ENUM ('AI_SUGGESTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED');

-- CreateEnum
CREATE TYPE "SafetyCheckType" AS ENUM ('DRUG_DRUG', 'DRUG_ALLERGY', 'INGREDIENT_ALLERGY', 'DRUG_CONDITION', 'DUPLICATE_THERAPY', 'DOSE_RANGE', 'RENAL_ADJUSTMENT', 'HEPATIC_ADJUSTMENT', 'AGE_WARNING', 'PREGNANCY_WARNING');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('FULL_CLINICAL', 'DIAGNOSTIC', 'TREATMENT_SUMMARY', 'PRESCRIPTION_HISTORY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'JSON', 'FHIR_JSON', 'CSV', 'XML');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'VALIDATED', 'COMMITTED', 'ROLLED_BACK', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "encryptedMfaSecret" TEXT,
    "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "replacedBy" UUID,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByIp" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaRecoveryCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "usernameTried" TEXT,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" UUID,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "patientId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "redactedMetadata" JSONB,
    "requestId" TEXT,
    "deviceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousHash" TEXT,
    "entryHash" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "medicalRecordNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "normalizedFullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sexAtBirth" "SexAtBirth" NOT NULL,
    "genderIdentity" TEXT,
    "preferredLanguage" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "assignedPhysicianId" UUID,
    "recordedByUserId" UUID NOT NULL,
    "encounterType" "EncounterType" NOT NULL,
    "chiefComplaint" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalMeasurement" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "temperatureC" DOUBLE PRECISION,
    "heartRateBpm" INTEGER,
    "respRateBpm" INTEGER,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "spo2Percent" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" UUID NOT NULL,

    CONSTRAINT "VitalMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "icd10Code" TEXT,
    "onsetDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "allergen" TEXT NOT NULL,
    "normalizedAllergen" TEXT NOT NULL,
    "allergyType" "AllergyType" NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL,
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryResult" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "testName" TEXT NOT NULL,
    "loincCode" TEXT,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "abnormalFlag" TEXT,
    "resultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "authorId" UUID NOT NULL,
    "noteType" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "processedText" TEXT,
    "nlpStatus" "NlpStatus" NOT NULL DEFAULT 'PENDING',
    "nlpProvider" TEXT,
    "modelVersion" TEXT,
    "processingLatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedClinicalEntity" (
    "id" UUID NOT NULL,
    "clinicalNoteId" UUID NOT NULL,
    "category" "EntityCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "negated" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "correctedText" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedClinicalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "description" TEXT NOT NULL,
    "dueDate" DATE,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticRun" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "provider" "DiagnosticProvider" NOT NULL,
    "requestedModel" TEXT,
    "returnedModel" TEXT,
    "promptTemplateVersion" TEXT NOT NULL,
    "sanitizationVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "generationId" TEXT,
    "status" "DiagnosticRunStatus" NOT NULL DEFAULT 'PENDING',
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "fallbackReason" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "clinicalSummary" TEXT,
    "generalLimitations" JSONB,
    "redFlags" JSONB,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" UUID NOT NULL,
    "diagnosticRunId" UUID NOT NULL,
    "diagnosisRank" INTEGER NOT NULL,
    "conditionName" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFactor" (
    "id" UUID NOT NULL,
    "aiAnalysisId" UUID NOT NULL,
    "factor" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importance" INTEGER NOT NULL,
    "polarity" TEXT NOT NULL DEFAULT 'supporting',

    CONSTRAINT "AiFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalGuidelineReference" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "publicationYear" INTEGER NOT NULL,
    "version" TEXT,
    "referenceType" TEXT NOT NULL,
    "conditionCode" TEXT,
    "medicationCode" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalGuidelineReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" UUID NOT NULL,
    "diagnosticRunId" UUID,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "reviewedByUserId" UUID,
    "name" TEXT NOT NULL,
    "icd10Code" TEXT,
    "snomedCode" TEXT,
    "rank" INTEGER,
    "confidence" INTEGER,
    "urgency" "Urgency" NOT NULL DEFAULT 'ROUTINE',
    "source" "DiagnosisSource" NOT NULL,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'SUGGESTED',
    "explanation" TEXT,
    "overrideReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" UUID NOT NULL,
    "diagnosisId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "rationale" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentRecommendation" (
    "id" UUID NOT NULL,
    "treatmentPlanId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lifestyleInterventions" JSONB,
    "medicationOptions" JSONB,
    "monitoringRequirements" JSONB,
    "contraindications" JSONB,
    "patientConsiderations" JSONB,
    "recommendationSource" TEXT NOT NULL DEFAULT 'LOCAL_DEMO',
    "limitations" JSONB,
    "guidelineReferenceId" UUID,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" UUID NOT NULL,
    "genericName" TEXT NOT NULL,
    "normalizedGenericName" TEXT NOT NULL,
    "drugClass" TEXT,
    "indications" JSONB,
    "contraindications" JSONB,
    "renalConsiderations" TEXT,
    "hepaticConsiderations" TEXT,
    "pregnancyConsiderations" TEXT,
    "duplicateTherapyGroup" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dataSource" TEXT NOT NULL DEFAULT 'SEED_SYNTHETIC',
    "dataVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "lastReviewedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationBrand" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "brandName" TEXT NOT NULL,
    "normalizedBrandName" TEXT NOT NULL,

    CONSTRAINT "MedicationBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationIngredient" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "normalizedIngredientName" TEXT NOT NULL,

    CONSTRAINT "MedicationIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationStrength" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "strength" TEXT NOT NULL,
    "route" TEXT NOT NULL,

    CONSTRAINT "MedicationStrength_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugInteraction" (
    "id" UUID NOT NULL,
    "medicationAId" UUID NOT NULL,
    "medicationBId" UUID NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "mechanism" TEXT,
    "clinicalEffect" TEXT,
    "managementAdvice" TEXT,
    "allowOverride" BOOLEAN NOT NULL DEFAULT false,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationContraindication" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "conditionCode" TEXT,
    "conditionName" TEXT NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "allowOverride" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "MedicationContraindication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DosageRule" (
    "id" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "indication" TEXT NOT NULL,
    "minAgeYears" INTEGER,
    "maxAgeYears" INTEGER,
    "standardDose" DOUBLE PRECISION NOT NULL,
    "doseUnit" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "maxDailyDose" DOUBLE PRECISION,
    "renalAdjustment" JSONB,
    "hepaticAdjustment" JSONB,
    "monitoringNote" TEXT,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DosageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "prescriberId" UUID NOT NULL,
    "treatmentPlanId" UUID,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "strength" TEXT,
    "dose" DOUBLE PRECISION NOT NULL,
    "doseUnit" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "durationDays" INTEGER,
    "startDate" DATE,
    "endDate" DATE,
    "quantity" INTEGER,
    "refills" INTEGER NOT NULL DEFAULT 0,
    "indication" TEXT,
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DosageCalculation" (
    "id" UUID NOT NULL,
    "prescriptionItemId" UUID NOT NULL,
    "suggestedDose" DOUBLE PRECISION NOT NULL,
    "doseUnit" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "maxDose" DOUBLE PRECISION,
    "adjustmentNote" TEXT,
    "monitoringNote" TEXT,
    "ruleSource" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "inputsUsed" JSONB NOT NULL,
    "limitations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DosageCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyCheck" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "prescriptionItemId" UUID,
    "checkType" "SafetyCheckType" NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "result" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "ruleVersion" TEXT NOT NULL,
    "acknowledgedByUserId" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalReport" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "reportType" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "narrative" TEXT,
    "content" JSONB NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "exportedByUserId" UUID NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileHash" TEXT,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugDatasetImport" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedByUserId" UUID NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "datasetVersion" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "DrugDatasetImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugDatasetImportItem" (
    "id" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "DrugDatasetImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "status" TEXT NOT NULL,
    "triggeredByUserId" UUID,
    "integrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "patientId" UUID,
    "performedByUserId" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_idx" ON "LoginAttempt"("userId");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_idx" ON "AuditLog"("patientId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_medicalRecordNumber_key" ON "Patient"("medicalRecordNumber");

-- CreateIndex
CREATE INDEX "Patient_normalizedFullName_idx" ON "Patient"("normalizedFullName");

-- CreateIndex
CREATE INDEX "Patient_dateOfBirth_idx" ON "Patient"("dateOfBirth");

-- CreateIndex
CREATE INDEX "PatientConsent_patientId_idx" ON "PatientConsent"("patientId");

-- CreateIndex
CREATE INDEX "Encounter_patientId_startedAt_idx" ON "Encounter"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "VitalMeasurement_patientId_recordedAt_idx" ON "VitalMeasurement"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "MedicalHistory_patientId_idx" ON "MedicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "Allergy_patientId_idx" ON "Allergy"("patientId");

-- CreateIndex
CREATE INDEX "Allergy_normalizedAllergen_idx" ON "Allergy"("normalizedAllergen");

-- CreateIndex
CREATE INDEX "LaboratoryResult_patientId_resultedAt_idx" ON "LaboratoryResult"("patientId", "resultedAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_idx" ON "ClinicalNote"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalNote_encounterId_idx" ON "ClinicalNote"("encounterId");

-- CreateIndex
CREATE INDEX "ExtractedClinicalEntity_clinicalNoteId_idx" ON "ExtractedClinicalEntity"("clinicalNoteId");

-- CreateIndex
CREATE INDEX "FollowUpTask_dueDate_idx" ON "FollowUpTask"("dueDate");

-- CreateIndex
CREATE INDEX "DiagnosticRun_encounterId_createdAt_idx" ON "DiagnosticRun"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosticRun_patientId_idx" ON "DiagnosticRun"("patientId");

-- CreateIndex
CREATE INDEX "AiAnalysis_diagnosticRunId_idx" ON "AiAnalysis"("diagnosticRunId");

-- CreateIndex
CREATE INDEX "AiFactor_aiAnalysisId_idx" ON "AiFactor"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ClinicalGuidelineReference_conditionCode_idx" ON "ClinicalGuidelineReference"("conditionCode");

-- CreateIndex
CREATE INDEX "ClinicalGuidelineReference_medicationCode_idx" ON "ClinicalGuidelineReference"("medicationCode");

-- CreateIndex
CREATE INDEX "Diagnosis_patientId_createdAt_idx" ON "Diagnosis"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Diagnosis_encounterId_idx" ON "Diagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_patientId_idx" ON "TreatmentPlan"("patientId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_diagnosisId_idx" ON "TreatmentPlan"("diagnosisId");

-- CreateIndex
CREATE INDEX "TreatmentRecommendation_treatmentPlanId_idx" ON "TreatmentRecommendation"("treatmentPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_normalizedGenericName_key" ON "Medication"("normalizedGenericName");

-- CreateIndex
CREATE INDEX "Medication_normalizedGenericName_idx" ON "Medication"("normalizedGenericName");

-- CreateIndex
CREATE INDEX "MedicationBrand_normalizedBrandName_idx" ON "MedicationBrand"("normalizedBrandName");

-- CreateIndex
CREATE INDEX "MedicationIngredient_normalizedIngredientName_idx" ON "MedicationIngredient"("normalizedIngredientName");

-- CreateIndex
CREATE INDEX "DrugInteraction_medicationAId_idx" ON "DrugInteraction"("medicationAId");

-- CreateIndex
CREATE INDEX "DrugInteraction_medicationBId_idx" ON "DrugInteraction"("medicationBId");

-- CreateIndex
CREATE UNIQUE INDEX "DrugInteraction_medicationAId_medicationBId_key" ON "DrugInteraction"("medicationAId", "medicationBId");

-- CreateIndex
CREATE INDEX "MedicationContraindication_medicationId_idx" ON "MedicationContraindication"("medicationId");

-- CreateIndex
CREATE INDEX "DosageRule_medicationId_idx" ON "DosageRule"("medicationId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_createdAt_idx" ON "Prescription"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "DosageCalculation_prescriptionItemId_idx" ON "DosageCalculation"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "SafetyCheck_prescriptionId_idx" ON "SafetyCheck"("prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicalReport_patientId_createdAt_idx" ON "ClinicalReport"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_reportId_idx" ON "ReportExport"("reportId");

-- CreateIndex
CREATE INDEX "DrugDatasetImportItem_importId_idx" ON "DrugDatasetImportItem"("importId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_assignedPhysicianId_fkey" FOREIGN KEY ("assignedPhysicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalMeasurement" ADD CONSTRAINT "VitalMeasurement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalMeasurement" ADD CONSTRAINT "VitalMeasurement_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryResult" ADD CONSTRAINT "LaboratoryResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryResult" ADD CONSTRAINT "LaboratoryResult_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedClinicalEntity" ADD CONSTRAINT "ExtractedClinicalEntity_clinicalNoteId_fkey" FOREIGN KEY ("clinicalNoteId") REFERENCES "ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticRun" ADD CONSTRAINT "DiagnosticRun_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticRun" ADD CONSTRAINT "DiagnosticRun_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_diagnosticRunId_fkey" FOREIGN KEY ("diagnosticRunId") REFERENCES "DiagnosticRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFactor" ADD CONSTRAINT "AiFactor_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_diagnosticRunId_fkey" FOREIGN KEY ("diagnosticRunId") REFERENCES "DiagnosticRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecommendation" ADD CONSTRAINT "TreatmentRecommendation_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecommendation" ADD CONSTRAINT "TreatmentRecommendation_guidelineReferenceId_fkey" FOREIGN KEY ("guidelineReferenceId") REFERENCES "ClinicalGuidelineReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationBrand" ADD CONSTRAINT "MedicationBrand_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIngredient" ADD CONSTRAINT "MedicationIngredient_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationStrength" ADD CONSTRAINT "MedicationStrength_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugInteraction" ADD CONSTRAINT "DrugInteraction_medicationAId_fkey" FOREIGN KEY ("medicationAId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugInteraction" ADD CONSTRAINT "DrugInteraction_medicationBId_fkey" FOREIGN KEY ("medicationBId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationContraindication" ADD CONSTRAINT "MedicationContraindication_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DosageRule" ADD CONSTRAINT "DosageRule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DosageCalculation" ADD CONSTRAINT "DosageCalculation_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCheck" ADD CONSTRAINT "SafetyCheck_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCheck" ADD CONSTRAINT "SafetyCheck_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugDatasetImportItem" ADD CONSTRAINT "DrugDatasetImportItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DrugDatasetImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
