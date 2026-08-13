import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreatePatientRequestDto, UpdatePatientRequestDto } from "./dto/patients.dto";
import { Prisma } from "@prisma/client";

function normalizeName(first: string, middle: string | undefined, last: string): string {
  return [first, middle, last].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

export function calculateAge(dateOfBirth: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = at.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(dto: CreatePatientRequestDto, actorUserId: string) {
    const normalizedFullName = normalizeName(dto.firstName, dto.middleName, dto.lastName);

    const duplicate = await this.prisma.patient.findFirst({
      where: {
        normalizedFullName,
        dateOfBirth: new Date(dto.dateOfBirth),
      },
    });
    if (duplicate) {
      throw new ConflictException({
        code: "CONFLICT_VERSION",
        message: `A patient with the same name and date of birth already exists (MRN ${duplicate.medicalRecordNumber}). Confirm this is not a duplicate before proceeding.`,
      });
    }

    const patient = await this.prisma.patient.create({
      data: {
        medicalRecordNumber: dto.medicalRecordNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        normalizedFullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        sexAtBirth: dto.sexAtBirth,
        genderIdentity: dto.genderIdentity,
        preferredLanguage: dto.preferredLanguage,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        emergencyContact: dto.emergencyContact,
      },
    });

    await this.audit.record({
      actorUserId,
      patientId: patient.id,
      action: "PATIENT_CREATED",
      resourceType: "Patient",
      resourceId: patient.id,
    });

    return this.toResponse(patient);
  }

  async update(id: string, dto: UpdatePatientRequestDto, actorUserId: string) {
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: "NOT_FOUND", message: "Patient not found" });
    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: "CONFLICT_VERSION",
        message: "This patient record was modified by someone else. Reload and reapply your changes.",
      });
    }

    const firstName = dto.firstName ?? existing.firstName;
    const middleName = dto.middleName ?? existing.middleName ?? undefined;
    const lastName = dto.lastName ?? existing.lastName;

    const updated = await this.prisma.patient.update({
      where: { id, version: dto.version },
      data: {
        firstName,
        middleName,
        lastName,
        normalizedFullName: normalizeName(firstName, middleName, lastName),
        phone: dto.phone ?? existing.phone,
        email: dto.email ?? existing.email,
        address: dto.address ?? existing.address,
        emergencyContact: dto.emergencyContact ?? existing.emergencyContact,
        preferredLanguage: dto.preferredLanguage ?? existing.preferredLanguage,
        version: { increment: 1 },
      },
    });

    await this.audit.record({
      actorUserId,
      patientId: id,
      action: "PATIENT_UPDATED",
      resourceType: "Patient",
      resourceId: id,
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: "NOT_FOUND", message: "Patient not found" });

    const updated = await this.prisma.patient.update({ where: { id }, data: { active: false, version: { increment: 1 } } });

    await this.audit.record({
      actorUserId,
      patientId: id,
      action: "PATIENT_DELETED",
      resourceType: "Patient",
      resourceId: id,
    });

    return this.toResponse(updated);
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException({ code: "NOT_FOUND", message: "Patient not found" });
    return this.toResponse(patient);
  }

  async search(params: {
    q?: string;
    minAge?: number;
    maxAge?: number;
    diagnosis?: string;
    medication?: string;
    page: number;
    pageSize: number;
    sortBy: "lastName" | "dateOfBirth" | "createdAt";
    sortDir: "asc" | "desc";
  }) {
    const { q, minAge, maxAge, diagnosis, medication, page, pageSize, sortBy, sortDir } = params;

    const now = new Date();
    const dobUpperBound = minAge !== undefined ? new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate()) : undefined;
    const dobLowerBound = maxAge !== undefined ? new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate()) : undefined;

    const where: Prisma.PatientWhereInput = {
      active: true,
      ...(q
        ? {
            OR: [
              { normalizedFullName: { contains: q.toLowerCase() } },
              { medicalRecordNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(dobUpperBound || dobLowerBound
        ? {
            dateOfBirth: {
              ...(dobLowerBound ? { gte: dobLowerBound } : {}),
              ...(dobUpperBound ? { lte: dobUpperBound } : {}),
            },
          }
        : {}),
      ...(diagnosis
        ? { diagnoses: { some: { name: { contains: diagnosis, mode: "insensitive" } } } }
        : {}),
      ...(medication
        ? {
            prescriptions: {
              some: { items: { some: { medication: { normalizedGenericName: { contains: medication.toLowerCase() } } } } },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async timeline(patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException({ code: "NOT_FOUND", message: "Patient not found" });

    const [encounters, notes, diagnoses, prescriptions, followUps] = await Promise.all([
      this.prisma.encounter.findMany({ where: { patientId }, orderBy: { startedAt: "asc" } }),
      this.prisma.clinicalNote.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
      this.prisma.diagnosis.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
      this.prisma.prescription.findMany({ where: { patientId }, orderBy: { createdAt: "asc" }, include: { items: true } }),
      this.prisma.followUpTask.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
    ]);

    const events = [
      { type: "PATIENT_CREATED", at: patient.createdAt, data: { medicalRecordNumber: patient.medicalRecordNumber } },
      ...encounters.map((e) => ({ type: "ENCOUNTER", at: e.startedAt, data: e })),
      ...notes.map((n) => ({ type: "CLINICAL_NOTE", at: n.createdAt, data: n })),
      ...diagnoses.map((d) => ({ type: "DIAGNOSIS", at: d.createdAt, data: d })),
      ...prescriptions.map((p) => ({ type: "PRESCRIPTION", at: p.createdAt, data: p })),
      ...followUps.map((f) => ({ type: "FOLLOW_UP", at: f.createdAt, data: f })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return { patientId, events };
  }

  private toResponse(patient: {
    id: string;
    medicalRecordNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: Date;
    sexAtBirth: string;
    genderIdentity: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    emergencyContact: string | null;
    preferredLanguage: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }) {
    // Age is always derived, never persisted (spec section 14).
    return { ...patient, age: calculateAge(patient.dateOfBirth) };
  }
}
