import { Module } from "@nestjs/common";
import { TreatmentsController } from "./treatments.controller";
import { TreatmentsService } from "./treatments.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
