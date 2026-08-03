import { Module } from "@nestjs/common";
import { MedicationsController } from "./medications.controller";
import { MedicationsService } from "./medications.service";
import { DrugImportService } from "./drug-import.service";
import { DrugImportController } from "./drug-import.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [MedicationsController, DrugImportController],
  providers: [MedicationsService, DrugImportService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
