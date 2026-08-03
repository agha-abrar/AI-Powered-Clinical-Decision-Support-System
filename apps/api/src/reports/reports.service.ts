import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ReportType } from "@prisma/client";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async compile(patientId: string, reportType: ReportType, encounterId: string | undefined, createdByUserId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException({ code: "NOT_FOUND", message: "Patient not found" });

    const [encounters, diagnoses, prescriptions, safetyChecks] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { patientId, ...(encounterId ? { id: encounterId } : {}) },
        include: { clinicalNotes: true, labResults: true, vitals: true },
      }),
      this.prisma.diagnosis.findMany({ where: { patientId, ...(encounterId ? { encounterId } : {}) } }),
      this.prisma.prescription.findMany({ where: { patientId, ...(encounterId ? { encounterId } : {}) }, include: { items: true, safetyChecks: true } }),
      this.prisma.safetyCheck.findMany({ where: { prescription: { patientId } } }),
    ]);

    const content = {
      applicationTitle: "AI-Powered CDSS (educational prototype)",
      disclaimer:
        "Educational prototype. Not clinically validated. Does not replace professional medical judgment. All AI output requires review by an authorized healthcare professional.",
      patient: {
        medicalRecordNumber: patient.medicalRecordNumber,
        fullName: `${patient.firstName} ${patient.lastName}`,
        dateOfBirth: patient.dateOfBirth,
        sexAtBirth: patient.sexAtBirth,
      },
      encounters: encounters.map((e) => ({
        id: e.id,
        chiefComplaint: e.chiefComplaint,
        startedAt: e.startedAt,
        status: e.status,
        notes: e.clinicalNotes.map((n) => ({ noteType: n.noteType, text: n.originalText })),
        labResults: e.labResults.map((l) => ({ testName: l.testName, value: l.value, unit: l.unit })),
      })),
      diagnoses: diagnoses.map((d) => ({
        name: d.name,
        icd10Code: d.icd10Code,
        confidence: d.confidence,
        status: d.status,
        source: d.source,
        explanation: d.explanation,
      })),
      prescriptions: prescriptions.map((p) => ({
        status: p.status,
        items: p.items.map((i) => ({ dose: i.dose, doseUnit: i.doseUnit, frequency: i.frequency, route: i.route })),
        safetyFindings: p.safetyChecks.map((s) => ({ severity: s.severity, description: s.description, blocked: s.blocked })),
      })),
      generatedAt: new Date().toISOString(),
    };

    const report = await this.prisma.clinicalReport.create({
      data: { patientId, encounterId, reportType, status: "DRAFT", content, createdByUserId },
    });

    await this.audit.record({
      actorUserId: createdByUserId,
      patientId,
      action: "REPORT_COMPILED",
      resourceType: "ClinicalReport",
      resourceId: report.id,
    });

    return report;
  }

  async approve(reportId: string, actorUserId: string) {
    const report = await this.prisma.clinicalReport.update({
      where: { id: reportId },
      data: { status: "APPROVED", approvedByUserId: actorUserId, approvedAt: new Date() },
    });
    await this.audit.record({
      actorUserId,
      patientId: report.patientId,
      action: "REPORT_APPROVED",
      resourceType: "ClinicalReport",
      resourceId: reportId,
    });
    return report;
  }

  async exportJson(reportId: string, actorUserId: string) {
    const report = await this.prisma.clinicalReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException({ code: "NOT_FOUND", message: "Report not found" });

    await this.prisma.reportExport.create({ data: { reportId, format: "JSON", exportedByUserId: actorUserId } });
    await this.audit.record({
      actorUserId,
      patientId: report.patientId,
      action: "REPORT_EXPORTED_JSON",
      resourceType: "ClinicalReport",
      resourceId: reportId,
    });
    return report.content;
  }

  /** Renders a real PDF from the compiled report content (never includes API
   * keys, tokens, or hidden model reasoning — see spec section 35). */
  async exportPdf(reportId: string, actorUserId: string): Promise<Buffer> {
    const report = await this.prisma.clinicalReport.findUnique({ where: { id: reportId }, include: { patient: true } });
    if (!report) throw new NotFoundException({ code: "NOT_FOUND", message: "Report not found" });

    const content = report.content as {
      applicationTitle: string;
      disclaimer: string;
      patient: { medicalRecordNumber: string; fullName: string };
      diagnoses: { name: string; confidence: number | null; status: string }[];
      prescriptions: { status: string; safetyFindings: { severity: string; description: string }[] }[];
    };

    const buffer: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).text(content.applicationTitle, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#b45309").text(content.disclaimer, { align: "center" });
      doc.fillColor("black").moveDown();

      doc.fontSize(12).text(`Report ID: ${report.id}`);
      doc.text(`Report type: ${report.reportType}`);
      doc.text(`Patient: ${content.patient.fullName} (MRN ${content.patient.medicalRecordNumber})`);
      doc.moveDown();

      doc.fontSize(13).text("Diagnoses", { underline: true });
      content.diagnoses.forEach((d) => {
        doc.fontSize(10).text(`- ${d.name} (${d.status})${d.confidence !== null ? `, confidence ${d.confidence}%` : ""}`);
      });
      doc.moveDown();

      doc.fontSize(13).text("Prescriptions & Safety Findings", { underline: true });
      content.prescriptions.forEach((p, idx) => {
        doc.fontSize(10).text(`Prescription ${idx + 1}: ${p.status}`);
        p.safetyFindings.forEach((s) => doc.fontSize(9).text(`   [${s.severity}] ${s.description}`));
      });

      doc.moveDown();
      doc.fontSize(8).fillColor("gray").text(`Generated ${new Date().toISOString()}`, { align: "right" });

      doc.end();
    });

    await this.prisma.reportExport.create({ data: { reportId, format: "PDF", exportedByUserId: actorUserId } });
    await this.audit.record({
      actorUserId,
      patientId: report.patientId,
      action: "REPORT_EXPORTED_PDF",
      resourceType: "ClinicalReport",
      resourceId: reportId,
    });

    return buffer;
  }
}
