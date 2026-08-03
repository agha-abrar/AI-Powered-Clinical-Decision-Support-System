import { Module } from "@nestjs/common";
import { SettingsController, SettingsService } from "./settings.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
