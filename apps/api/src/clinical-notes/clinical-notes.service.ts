import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { DeterministicNlpProvider } from "./nlp-provider.interface";

@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly nlpProvider: DeterministicNlpProvider,
  ) {}

  async create(patientId: string, encounterId: string | undefined, noteType: string, originalText: string, authorId: string) {
    const note = await this.prisma.clinicalNote.create({
      data: { patientId, encounterId, noteType, originalText, authorId, nlpStatus: "PENDING" },
    });
    await this.audit.record({
      actorUserId: authorId,
      patientId,
      action: "CLINICAL_NOTE_CREATED",
      resourceType: "ClinicalNote",
      resourceId: note.id,
    });
    return note;
  }

  async process(noteId: string, actorUserId: string) {
    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException({ code: "NOT_FOUND", message: "Clinical note not found" });

    const start = Date.now();
    const candidates = this.nlpProvider.extract(note.originalText);
    const latencyMs = Date.now() - start;

    await this.prisma.$transaction([
      this.prisma.extractedClinicalEntity.deleteMany({ where: { clinicalNoteId: noteId } }),
      this.prisma.extractedClinicalEntity.createMany({
        data: candidates.map((c) => ({
          clinicalNoteId: noteId,
          category: c.category,
          text: c.text,
          normalizedText: c.normalizedText,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          negated: c.negated,
          confidence: c.confidence,
        })),
      }),
      this.prisma.clinicalNote.update({
        where: { id: noteId },
        data: {
          nlpStatus: "PROCESSED",
          nlpProvider: this.nlpProvider.name,
          modelVersion: this.nlpProvider.version,
          processingLatencyMs: latencyMs,
          processedText: note.originalText,
          version: { increment: 1 },
        },
      }),
    ]);

    await this.audit.record({
      actorUserId,
      patientId: note.patientId,
      action: "CLINICAL_NOTE_NLP_PROCESSED",
      resourceType: "ClinicalNote",
      resourceId: noteId,
      metadata: { entityCount: candidates.length, provider: this.nlpProvider.name },
    });

    return this.prisma.clinicalNote.findUnique({ where: { id: noteId }, include: { entities: true } });
  }

  async updateEntity(entityId: string, actorUserId: string, action: "approve" | "correct" | "reject", correctedText?: string) {
    const entity = await this.prisma.extractedClinicalEntity.findUnique({ where: { id: entityId } });
    if (!entity) throw new NotFoundException({ code: "NOT_FOUND", message: "Extracted entity not found" });

    const updated = await this.prisma.extractedClinicalEntity.update({
      where: { id: entityId },
      data: {
        approved: action === "approve" || action === "correct",
        correctedText: action === "correct" ? correctedText : undefined,
      },
    });

    await this.audit.record({
      actorUserId,
      action: `CLINICAL_ENTITY_${action.toUpperCase()}D`,
      resourceType: "ExtractedClinicalEntity",
      resourceId: entityId,
    });

    if (action === "reject") {
      await this.prisma.clinicalNote.update({
        where: { id: entity.clinicalNoteId },
        data: { nlpStatus: "REJECTED" },
      });
    }

    return updated;
  }
}
