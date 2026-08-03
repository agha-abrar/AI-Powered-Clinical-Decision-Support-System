import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

interface RawMedicationRow {
  genericName?: string;
  brandNames?: string; // comma-separated
  drugClass?: string;
  strengths?: string; // "500mg oral;250mg IV"
  contraindications?: string;
  renalConsiderations?: string;
  hepaticConsiderations?: string;
  pregnancyConsiderations?: string;
  duplicateTherapyGroup?: string;
  [key: string]: unknown;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

@Injectable()
export class DrugImportService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Accepts already-parsed JSON rows (the API layer parses CSV/JSON into this shape). */
  async preview(fileName: string, rows: RawMedicationRow[], actorUserId: string, datasetVersion: string) {
    const items: { rowNumber: number; rawData: Prisma.InputJsonValue; valid: boolean; errorMessage?: string }[] = [];
    let validCount = 0;

    rows.forEach((row, idx) => {
      const errors: string[] = [];
      if (!row.genericName || row.genericName.trim().length === 0) errors.push("genericName is required");
      if (row.strengths && !/^[^;]+(;[^;]+)*$/.test(row.strengths)) errors.push("strengths format invalid");

      const valid = errors.length === 0;
      if (valid) validCount++;
      items.push({
        rowNumber: idx + 1,
        rawData: row as Prisma.InputJsonValue,
        valid,
        errorMessage: errors.length ? errors.join("; ") : undefined,
      });
    });

    const importRecord = await this.prisma.drugDatasetImport.create({
      data: {
        fileName,
        importedByUserId: actorUserId,
        status: "PREVIEW",
        datasetVersion,
        totalRows: rows.length,
        validRows: validCount,
        invalidRows: rows.length - validCount,
        items: { create: items },
      },
      include: { items: true },
    });

    await this.audit.record({
      actorUserId,
      action: "DRUG_IMPORT_PREVIEWED",
      resourceType: "DrugDatasetImport",
      resourceId: importRecord.id,
      metadata: { totalRows: rows.length, validRows: validCount },
    });

    return importRecord;
  }

  async commit(importId: string, actorUserId: string) {
    const importRecord = await this.prisma.drugDatasetImport.findUnique({
      where: { id: importId },
      include: { items: true },
    });
    if (!importRecord) throw new NotFoundException({ code: "NOT_FOUND", message: "Import not found" });
    if (importRecord.status !== "PREVIEW") {
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Import has already been processed" });
    }
    if (importRecord.invalidRows > 0) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Cannot commit an import containing invalid rows. Fix or exclude them and re-preview.",
      });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of importRecord.items) {
          const row = item.rawData as RawMedicationRow;
          const genericName = row.genericName!.trim();
          const medication = await tx.medication.upsert({
            where: { normalizedGenericName: normalize(genericName) },
            update: {
              drugClass: row.drugClass,
              contraindications: row.contraindications ? row.contraindications.split(";") : undefined,
              renalConsiderations: row.renalConsiderations,
              hepaticConsiderations: row.hepaticConsiderations,
              pregnancyConsiderations: row.pregnancyConsiderations,
              duplicateTherapyGroup: row.duplicateTherapyGroup,
              dataVersion: importRecord.datasetVersion,
              lastReviewedDate: new Date(),
            },
            create: {
              genericName,
              normalizedGenericName: normalize(genericName),
              drugClass: row.drugClass,
              contraindications: row.contraindications ? row.contraindications.split(";") : undefined,
              renalConsiderations: row.renalConsiderations,
              hepaticConsiderations: row.hepaticConsiderations,
              pregnancyConsiderations: row.pregnancyConsiderations,
              duplicateTherapyGroup: row.duplicateTherapyGroup,
              dataSource: "ADMIN_IMPORT",
              dataVersion: importRecord.datasetVersion,
              lastReviewedDate: new Date(),
            },
          });

          if (row.brandNames) {
            for (const brand of row.brandNames.split(",").map((b) => b.trim()).filter(Boolean)) {
              const normalizedBrand = normalize(brand);
              const exists = await tx.medicationBrand.findFirst({
                where: { medicationId: medication.id, normalizedBrandName: normalizedBrand },
              });
              if (!exists) {
                await tx.medicationBrand.create({
                  data: { medicationId: medication.id, brandName: brand, normalizedBrandName: normalizedBrand },
                });
              }
            }
          }

          if (row.strengths) {
            for (const s of row.strengths.split(";").map((x) => x.trim()).filter(Boolean)) {
              const [strength, route] = s.split(" ").filter(Boolean);
              await tx.medicationStrength.create({
                data: { medicationId: medication.id, strength: strength ?? s, route: route ?? "oral" },
              });
            }
          }
        }

        await tx.drugDatasetImport.update({
          where: { id: importId },
          data: { status: "COMMITTED", committedAt: new Date() },
        });
      });
    } catch (err) {
      await this.prisma.drugDatasetImport.update({
        where: { id: importId },
        data: { status: "ROLLED_BACK", errorSummary: { message: (err as Error).message } },
      });
      await this.audit.record({
        actorUserId,
        action: "DRUG_IMPORT_ROLLED_BACK",
        resourceType: "DrugDatasetImport",
        resourceId: importId,
        severity: "WARNING",
        success: false,
      });
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Import failed and was rolled back" });
    }

    await this.audit.record({
      actorUserId,
      action: "DRUG_IMPORT_COMMITTED",
      resourceType: "DrugDatasetImport",
      resourceId: importId,
    });

    return this.prisma.drugDatasetImport.findUnique({ where: { id: importId } });
  }
}
