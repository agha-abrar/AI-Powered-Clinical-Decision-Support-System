import { MedicationSafetyService, SafetyCheckContext } from "../../src/safety-checks/medication-safety.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";

type MockPrisma = {
  medication: { findMany: jest.Mock };
  drugInteraction: { findMany: jest.Mock };
};

function buildService(mockPrisma: MockPrisma): MedicationSafetyService {
  return new MedicationSafetyService(mockPrisma as unknown as PrismaService);
}

const metformin = {
  id: "med-metformin",
  genericName: "Metformin",
  normalizedGenericName: "metformin",
  drugClass: "Biguanide",
  duplicateTherapyGroup: "biguanide",
  pregnancyConsiderations: null,
  ingredients: [],
  contraindicationRecords: [],
  dosageRules: [],
};

const lisinopril = {
  id: "med-lisinopril",
  genericName: "Lisinopril",
  normalizedGenericName: "lisinopril",
  drugClass: "ACE inhibitor",
  duplicateTherapyGroup: null,
  pregnancyConsiderations: null,
  ingredients: [],
  contraindicationRecords: [],
  dosageRules: [],
};

const amoxicillin = {
  id: "med-amoxicillin",
  genericName: "Amoxicillin",
  normalizedGenericName: "amoxicillin",
  drugClass: "penicillin",
  duplicateTherapyGroup: "penicillin",
  pregnancyConsiderations: null,
  ingredients: [{ normalizedIngredientName: "amoxicillin" }],
  contraindicationRecords: [],
  dosageRules: [],
};

const ibuprofen = {
  id: "med-ibuprofen",
  genericName: "Ibuprofen",
  normalizedGenericName: "ibuprofen",
  drugClass: "NSAID",
  duplicateTherapyGroup: null,
  pregnancyConsiderations: null,
  ingredients: [],
  contraindicationRecords: [
    {
      conditionName: "Chronic Kidney Disease",
      conditionCode: "N18.9",
      severity: "MAJOR",
      allowOverride: true,
      notes: "NSAIDs can worsen renal function in CKD.",
      ruleVersion: "1.0.0",
    },
  ],
  dosageRules: [],
};

describe("MedicationSafetyService — Scenario B: Metformin + Lisinopril (minor renal-monitoring warning)", () => {
  it("produces a MINOR, non-blocking drug-drug interaction result and allows continuation", async () => {
    const mockPrisma: MockPrisma = {
      medication: { findMany: jest.fn().mockResolvedValue([metformin, lisinopril]) },
      drugInteraction: {
        findMany: jest.fn().mockResolvedValue([
          {
            medicationAId: "med-metformin",
            medicationBId: "med-lisinopril",
            severity: "MINOR",
            clinicalEffect: "Minor renal-monitoring consideration.",
            managementAdvice: "Monitor renal function periodically.",
            allowOverride: true,
            ruleVersion: "1.0.0",
          },
        ]),
      },
    };
    const service = buildService(mockPrisma);

    const ctx: SafetyCheckContext = {
      patientId: "patient-1",
      medicationIds: ["med-metformin"],
      existingMedicationIds: ["med-lisinopril"],
      ageYears: 50,
      allergies: [],
      conditions: [],
    };

    const results = await service.runAllChecks(ctx, { "med-metformin": "item-1" });
    const interactionResult = results.find((r) => r.checkType === "DRUG_DRUG");

    expect(interactionResult).toBeDefined();
    expect(interactionResult!.severity).toBe("MINOR");
    expect(interactionResult!.blocked).toBe(false);
    expect(service.isBlocked(results)).toBe(false);
  });
});

describe("MedicationSafetyService — Scenario C: severe penicillin allergy blocks Amoxicillin", () => {
  it("blocks the prescription with a CONTRAINDICATED severity finding", async () => {
    const mockPrisma: MockPrisma = {
      medication: { findMany: jest.fn().mockResolvedValue([amoxicillin]) },
      drugInteraction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(mockPrisma);

    const ctx: SafetyCheckContext = {
      patientId: "patient-2",
      medicationIds: ["med-amoxicillin"],
      existingMedicationIds: [],
      ageYears: 34,
      allergies: [{ normalizedAllergen: "penicillin", severity: "SEVERE", status: "ACTIVE" }],
      conditions: [],
    };

    // Amoxicillin is a penicillin; the allergen match happens against the
    // ingredient list, so we align the fixture's ingredient name accordingly.
    const results = await service.runAllChecks(ctx, { "med-amoxicillin": "item-2" });
    const allergyResult = results.find((r) => r.checkType === "DRUG_ALLERGY" || r.checkType === "INGREDIENT_ALLERGY");

    expect(allergyResult).toBeDefined();
    expect(allergyResult!.severity).toBe("CONTRAINDICATED");
    expect(allergyResult!.blocked).toBe(true);
    expect(service.isBlocked(results)).toBe(true);
  });
});

describe("MedicationSafetyService — Duplicate therapy detection", () => {
  it("flags two medications in the same duplicate-therapy group as MODERATE, non-blocking", async () => {
    const secondPenicillin = { ...amoxicillin, id: "med-other-penicillin", genericName: "Ampicillin", normalizedGenericName: "ampicillin" };
    const mockPrisma: MockPrisma = {
      medication: { findMany: jest.fn().mockResolvedValue([amoxicillin, secondPenicillin]) },
      drugInteraction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(mockPrisma);

    const ctx: SafetyCheckContext = {
      patientId: "patient-3",
      medicationIds: ["med-amoxicillin", "med-other-penicillin"],
      existingMedicationIds: [],
      ageYears: 40,
      allergies: [],
      conditions: [],
    };

    const results = await service.runAllChecks(ctx, { "med-amoxicillin": "item-3a", "med-other-penicillin": "item-3b" });
    const duplicate = results.find((r) => r.checkType === "DUPLICATE_THERAPY");

    expect(duplicate).toBeDefined();
    expect(duplicate!.severity).toBe("MODERATE");
    expect(duplicate!.blocked).toBe(false);
  });
});

describe("MedicationSafetyService — Drug-condition contraindication (Ibuprofen + CKD)", () => {
  it("flags a MAJOR, overridable contraindication when the patient's condition matches", async () => {
    const mockPrisma: MockPrisma = {
      medication: { findMany: jest.fn().mockResolvedValue([ibuprofen]) },
      drugInteraction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(mockPrisma);

    const ctx: SafetyCheckContext = {
      patientId: "patient-4",
      medicationIds: ["med-ibuprofen"],
      existingMedicationIds: [],
      ageYears: 55,
      allergies: [],
      conditions: ["chronic kidney disease"],
    };

    const results = await service.runAllChecks(ctx, { "med-ibuprofen": "item-4" });
    const contraindication = results.find((r) => r.checkType === "DRUG_CONDITION");

    expect(contraindication).toBeDefined();
    expect(contraindication!.severity).toBe("MAJOR");
    // allowOverride is true on the fixture rule, so MAJOR here is not auto-blocked
    expect(contraindication!.blocked).toBe(false);
  });
});
