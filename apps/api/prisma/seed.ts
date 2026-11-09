import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { ROLE_PERMISSIONS } from "@cdss/shared";

const prisma = new PrismaClient();

const DEV_PASSWORD = "ChangeMe123!";

async function upsertRolesAndPermissions() {
  const allPermissionKeys = new Set<string>();
  for (const perms of Object.values(ROLE_PERMISSIONS)) perms.forEach((p) => allPermissionKeys.add(p));

  const permissionRecords = await Promise.all(
    Array.from(allPermissionKeys).map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  );
  const permByKey = new Map(permissionRecords.map((p) => [p.key, p]));

  const roleRecords = {} as Record<keyof typeof ROLE_PERMISSIONS, { id: string }>;
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });
    roleRecords[roleName] = role;

    for (const permKey of ROLE_PERMISSIONS[roleName]) {
      const perm = permByKey.get(permKey)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  return roleRecords;
}

async function upsertUser(
  email: string,
  username: string,
  fullName: string,
  roleId: string,
  licenseNumber?: string,
) {
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: "ACTIVE",
      passwordChangeRequired: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email,
      username,
      fullName,
      passwordHash,
      status: "ACTIVE",
      passwordChangeRequired: true,
      licenseNumber,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId } },
    update: {},
    create: { userId: user.id, roleId },
  });
  return user;
}

async function seedMedications() {
  const metformin = await prisma.medication.upsert({
    where: { normalizedGenericName: "metformin" },
    update: {},
    create: {
      genericName: "Metformin",
      normalizedGenericName: "metformin",
      drugClass: "Biguanide",
      duplicateTherapyGroup: "biguanide",
      renalConsiderations: "Reduce dose or avoid in significant renal impairment (risk of lactic acidosis).",
      dataSource: "SEED_SYNTHETIC",
      brands: { create: [{ brandName: "Glucophage", normalizedBrandName: "glucophage" }] },
      strengths: { create: [{ strength: "500mg", route: "oral" }, { strength: "1000mg", route: "oral" }] },
      dosageRules: {
        create: [
          {
            indication: "Type 2 Diabetes Mellitus",
            minAgeYears: 18,
            standardDose: 500,
            doseUnit: "mg",
            frequency: "twice daily",
            maxDailyDose: 2000,
            renalAdjustment: { mild: 1, moderate: 0.5, severe: 0 },
            monitoringNote: "Monitor renal function periodically.",
          },
        ],
      },
    },
  });

  const lisinopril = await prisma.medication.upsert({
    where: { normalizedGenericName: "lisinopril" },
    update: {},
    create: {
      genericName: "Lisinopril",
      normalizedGenericName: "lisinopril",
      drugClass: "ACE inhibitor",
      dataSource: "SEED_SYNTHETIC",
      brands: { create: [{ brandName: "Zestril", normalizedBrandName: "zestril" }] },
      strengths: { create: [{ strength: "10mg", route: "oral" }] },
    },
  });

  const amoxicillin = await prisma.medication.upsert({
    where: { normalizedGenericName: "amoxicillin" },
    update: {},
    create: {
      genericName: "Amoxicillin",
      normalizedGenericName: "amoxicillin",
      drugClass: "Penicillin",
      duplicateTherapyGroup: "penicillin",
      dataSource: "SEED_SYNTHETIC",
      ingredients: { create: [{ ingredientName: "Amoxicillin", normalizedIngredientName: "amoxicillin" }] },
      strengths: { create: [{ strength: "500mg", route: "oral" }] },
    },
  });

  const azithromycin = await prisma.medication.upsert({
    where: { normalizedGenericName: "azithromycin" },
    update: {},
    create: {
      genericName: "Azithromycin",
      normalizedGenericName: "azithromycin",
      drugClass: "Macrolide",
      dataSource: "SEED_SYNTHETIC",
      strengths: { create: [{ strength: "250mg", route: "oral" }] },
    },
  });

  const warfarin = await prisma.medication.upsert({
    where: { normalizedGenericName: "warfarin" },
    update: {},
    create: {
      genericName: "Warfarin",
      normalizedGenericName: "warfarin",
      drugClass: "Vitamin K antagonist",
      dataSource: "SEED_SYNTHETIC",
      strengths: { create: [{ strength: "5mg", route: "oral" }] },
    },
  });

  const ibuprofen = await prisma.medication.upsert({
    where: { normalizedGenericName: "ibuprofen" },
    update: {},
    create: {
      genericName: "Ibuprofen",
      normalizedGenericName: "ibuprofen",
      drugClass: "NSAID",
      dataSource: "SEED_SYNTHETIC",
      strengths: { create: [{ strength: "200mg", route: "oral" }] },
      contraindicationRecords: {
        create: [
          {
            conditionName: "Chronic Kidney Disease",
            conditionCode: "N18.9",
            severity: "MAJOR",
            allowOverride: true,
            notes: "NSAIDs can worsen renal function in patients with CKD.",
            ruleVersion: "1.0.0",
          },
        ],
      },
    },
  });

  // Interaction severity ladder covering all four levels (spec section 33/34):
  await prisma.drugInteraction.upsert({
    where: { medicationAId_medicationBId: { medicationAId: metformin.id, medicationBId: lisinopril.id } },
    update: {},
    create: {
      medicationAId: metformin.id,
      medicationBId: lisinopril.id,
      severity: "MINOR",
      mechanism: "No major pharmacokinetic interaction; renal monitoring is prudent given ACE-inhibitor effect on renal perfusion.",
      clinicalEffect: "Minor renal-monitoring consideration when combining Metformin with Lisinopril.",
      managementAdvice: "Monitor renal function periodically.",
      allowOverride: true,
      ruleVersion: "1.0.0",
    },
  });

  await prisma.drugInteraction.upsert({
    where: { medicationAId_medicationBId: { medicationAId: warfarin.id, medicationBId: ibuprofen.id } },
    update: {},
    create: {
      medicationAId: warfarin.id,
      medicationBId: ibuprofen.id,
      severity: "MAJOR",
      mechanism: "NSAIDs potentiate anticoagulant effect and increase GI bleeding risk.",
      clinicalEffect: "Increased bleeding risk when Ibuprofen is combined with Warfarin.",
      managementAdvice: "Avoid combination where possible; use acetaminophen for analgesia instead.",
      allowOverride: true,
      ruleVersion: "1.0.0",
    },
  });

  await prisma.drugInteraction.upsert({
    where: { medicationAId_medicationBId: { medicationAId: amoxicillin.id, medicationBId: azithromycin.id } },
    update: {},
    create: {
      medicationAId: amoxicillin.id,
      medicationBId: azithromycin.id,
      severity: "MODERATE",
      mechanism: "Combining two antibiotic classes without clear indication increases resistance risk.",
      clinicalEffect: "Redundant antibiotic coverage.",
      managementAdvice: "Confirm indication for dual antibiotic therapy.",
      allowOverride: true,
      ruleVersion: "1.0.0",
    },
  });

  return { metformin, lisinopril, amoxicillin, azithromycin, warfarin, ibuprofen };
}

async function seedGuidelineReferences() {
  await prisma.clinicalGuidelineReference.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Standards of Care in Diabetes",
      organization: "American Diabetes Association",
      publicationYear: 2024,
      referenceType: "clinical_guideline",
      conditionCode: "E11.9",
      status: "active",
      verifiedAt: new Date(),
      verifiedBy: "seed-script",
    },
  });
}

async function seedPatients(
  physicianId: string,
  nurseId: string,
  adminId: string,
  medications: Awaited<ReturnType<typeof seedMedications>>,
) {
  const patientsData = [
    {
      mrn: "MRN-00001",
      firstName: "Maria",
      lastName: "Alvarez",
      dob: new Date("1975-03-14"),
      sex: "FEMALE" as const,
      allergy: null,
      condition: "Type 2 Diabetes Mellitus",
    },
    {
      mrn: "MRN-00002",
      firstName: "James",
      lastName: "Whitfield",
      dob: new Date("1990-07-22"),
      sex: "MALE" as const,
      allergy: { allergen: "Penicillin", severity: "SEVERE" as const },
      condition: null,
    },
    {
      mrn: "MRN-00003",
      firstName: "Priya",
      lastName: "Natarajan",
      dob: new Date("1988-11-02"),
      sex: "FEMALE" as const,
      allergy: null,
      condition: "Chronic Kidney Disease",
    },
  ];

  for (const p of patientsData) {
    const patient = await prisma.patient.upsert({
      where: { medicalRecordNumber: p.mrn },
      update: {},
      create: {
        medicalRecordNumber: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        normalizedFullName: `${p.firstName} ${p.lastName}`.toLowerCase(),
        dateOfBirth: p.dob,
        sexAtBirth: p.sex,
      },
    });

    if (p.allergy) {
      await prisma.allergy.create({
        data: {
          patientId: patient.id,
          allergen: p.allergy.allergen,
          normalizedAllergen: p.allergy.allergen.toLowerCase(),
          allergyType: "DRUG",
          severity: p.allergy.severity,
          reaction: "Anaphylaxis (documented)",
        },
      });
    }
    if (p.condition) {
      await prisma.medicalHistory.create({ data: { patientId: patient.id, condition: p.condition } });
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId: patient.id,
        assignedPhysicianId: physicianId,
        recordedByUserId: nurseId,
        encounterType: "OUTPATIENT",
        chiefComplaint: p.condition ? `Follow-up for ${p.condition}` : "Routine visit",
        status: "IN_PROGRESS",
      },
    });

    await prisma.vitalMeasurement.create({
      data: {
        patientId: patient.id,
        encounterId: encounter.id,
        temperatureC: 37.0,
        heartRateBpm: 78,
        systolicBp: 122,
        diastolicBp: 80,
        recordedByUserId: nurseId,
      },
    });

    // Audit entry: admin created this patient
    await prisma.auditLog.create({
      data: {
        actorUserId: adminId,
        patientId: patient.id,
        action: "patient:create",
        resourceType: "patient",
        resourceId: patient.id,
        success: true,
        severity: "INFO",
        entryHash: `seed-${patient.medicalRecordNumber}`,
      },
    });

    // Create a sample clinical report created by admin
    await prisma.clinicalReport.create({
      data: {
        patientId: patient.id,
        encounterId: encounter.id,
        reportType: "FULL_CLINICAL",
        status: "DRAFT",
        narrative: `Seeded full clinical summary for ${patient.firstName} ${patient.lastName}`,
        content: { summary: `Synthetic full clinical summary for ${patient.medicalRecordNumber}` },
        createdByUserId: adminId,
      },
    });

    // For the first patient, create a physician diagnosis example
    if (patient.medicalRecordNumber === "MRN-00001") {
      const diagnosis = await prisma.diagnosis.create({
        data: {
          patientId: patient.id,
          encounterId: encounter.id,
          reviewedByUserId: physicianId,
          name: "Type 2 Diabetes Mellitus",
          icd10Code: "E11.9",
          rank: 1,
          confidence: 85,
          source: "MANUAL",
          status: "CONFIRMED",
          explanation: "Seeded diagnosis by physician for demo purposes.",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: physicianId,
          patientId: patient.id,
          action: "diagnosis:create",
          resourceType: "diagnosis",
          resourceId: diagnosis.id,
          success: true,
          severity: "INFO",
          entryHash: `seed-dx-${diagnosis.id}`,
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding roles and permissions...");
  const roles = await upsertRolesAndPermissions();

  console.log("Seeding demo users...");
  const physician = await upsertUser("physician@cdss.local", "physician", "Dr. Alex Rivera", roles.PHYSICIAN.id, "MD-SYNTH-001");
  const nurse = await upsertUser("nurse@cdss.local", "nurse", "Nurse Sam Chen", roles.NURSE.id);
  const admin = await upsertUser("admin@cdss.local", "admin", "Admin Jordan Lee", roles.SYSTEM_ADMIN.id);

  console.log("Seeding system settings...");
  await prisma.systemSetting.upsert({
    where: { key: "AUTH_FAILED_LOGIN_LIMIT" },
    update: {},
    create: { key: "AUTH_FAILED_LOGIN_LIMIT", value: "5" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "AUTH_LOCK_MINUTES" },
    update: {},
    create: { key: "AUTH_LOCK_MINUTES", value: "30" },
  });

  console.log("Seeding medications and interactions...");
  const medications = await seedMedications();

  console.log("Seeding guideline references...");
  await seedGuidelineReferences();

  console.log("Seeding synthetic patients...");
  await seedPatients(physician.id, nurse.id, admin.id, medications);

  console.log("Seed complete.");
  console.log("Demo accounts (all use password ChangeMe123!, password change required at first login):");
  console.log("  physician@cdss.local");
  console.log("  nurse@cdss.local");
  console.log("  admin@cdss.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
