import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string | undefined, limit: number) {
    if (!q) {
      const items = await this.prisma.medication.findMany({
        where: { active: true },
        take: limit,
        orderBy: { genericName: "asc" },
        include: { brands: true },
      });
      return items;
    }
    const normalized = q.toLowerCase();
    const items = await this.prisma.medication.findMany({
      where: {
        active: true,
        OR: [
          { normalizedGenericName: { contains: normalized } },
          { brands: { some: { normalizedBrandName: { contains: normalized } } } },
        ],
      },
      take: limit,
      include: { brands: true, strengths: true },
    });
    return items;
  }

  async findById(id: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      include: {
        brands: true,
        ingredients: true,
        strengths: true,
        dosageRules: true,
        contraindicationRecords: true,
      },
    });
    if (!medication) throw new NotFoundException({ code: "NOT_FOUND", message: "Medication not found" });
    return medication;
  }
}
