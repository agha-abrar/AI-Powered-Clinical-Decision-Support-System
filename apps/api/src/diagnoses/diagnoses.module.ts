import { Module } from "@nestjs/common";
import { DiagnosesController } from "./diagnoses.controller";
import { DiagnosesService } from "./diagnoses.service";
import { AiGatewayClient } from "./ai-gateway.client";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [DiagnosesController],
  providers: [DiagnosesService, AiGatewayClient],
  exports: [DiagnosesService],
})
export class DiagnosesModule {}
