import { Module } from "@nestjs/common";
import { PrescriptionsController } from "./prescriptions.controller";
import { PrescriptionsService } from "./prescriptions.service";
import { MedicationSafetyService } from "../safety-checks/medication-safety.service";
import { DosageService } from "../safety-checks/dosage.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, MedicationSafetyService, DosageService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
