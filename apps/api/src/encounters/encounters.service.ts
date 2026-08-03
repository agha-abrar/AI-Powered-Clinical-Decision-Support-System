import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EncounterType } from "@prisma/client";

export interface CreateEncounterInput {
  patientId: string;
  encounterType: EncounterType;
  chiefComplaint?: string;
  assignedPhysicianId?: string;
}

export interface AddVitalsInput {
  temperatureC?: number;
  heartRateBpm?: number;
  respRateBpm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  spo2Percent?: number;
  weightKg?: number;
  heightCm?: number;
}

export interface AddLabResultInput {
  testName: string;
  loincCode?: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
}

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(input: CreateEncounterInput, recordedByUserId: string) {
    const encounter = await this.prisma.encounter.create({
      data: {
        patientId: input.patientId,
        encounterType: input.encounterType,
        chiefComplaint: input.chiefComplaint,
        assignedPhysicianId: input.assignedPhysicianId,
        recordedByUserId,
        status: "DRAFT",
      },
    });
    await this.audit.record({
      actorUserId: recordedByUserId,
      patientId: input.patientId,
      action: "ENCOUNTER_CREATED",
      resourceType: "Encounter",
      resourceId: encounter.id,
    });
    return encounter;
  }

  async findById(id: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id },
      include: { vitals: true, labResults: true, clinicalNotes: true, diagnoses: true },
    });
    if (!encounter) throw new NotFoundException({ code: "NOT_FOUND", message: "Encounter not found" });
    return encounter;
  }

  async updateStatus(id: string, status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED", actorUserId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id } });
    if (!encounter) throw new NotFoundException({ code: "NOT_FOUND", message: "Encounter not found" });
    const updated = await this.prisma.encounter.update({
      where: { id },
      data: { status, completedAt: status === "COMPLETED" ? new Date() : undefined, version: { increment: 1 } },
    });
    await this.audit.record({
      actorUserId,
      patientId: encounter.patientId,
      action: `ENCOUNTER_${status}`,
      resourceType: "Encounter",
      resourceId: id,
    });
    return updated;
  }

  async addVitals(encounterId: string, input: AddVitalsInput, recordedByUserId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException({ code: "NOT_FOUND", message: "Encounter not found" });
    const vitals = await this.prisma.vitalMeasurement.create({
      data: { patientId: encounter.patientId, encounterId, ...input, recordedByUserId },
    });
    await this.audit.record({
      actorUserId: recordedByUserId,
      patientId: encounter.patientId,
      action: "VITALS_RECORDED",
      resourceType: "VitalMeasurement",
      resourceId: vitals.id,
    });
    return vitals;
  }

  async addLabResult(encounterId: string, input: AddLabResultInput, recordedByUserId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException({ code: "NOT_FOUND", message: "Encounter not found" });
    if (!input.testName || !input.value) {
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "testName and value are required" });
    }
    const lab = await this.prisma.laboratoryResult.create({
      data: { patientId: encounter.patientId, encounterId, ...input },
    });
    await this.audit.record({
      actorUserId: recordedByUserId,
      patientId: encounter.patientId,
      action: "LAB_RESULT_RECORDED",
      resourceType: "LaboratoryResult",
      resourceId: lab.id,
    });
    return lab;
  }
}
