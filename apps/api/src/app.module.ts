import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { PatientsModule } from "./patients/patients.module";
import { MedicationsModule } from "./medications/medications.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { DiagnosesModule } from "./diagnoses/diagnoses.module";
import { EncountersModule } from "./encounters/encounters.module";
import { ClinicalNotesModule } from "./clinical-notes/clinical-notes.module";
import { TreatmentsModule } from "./treatments/treatments.module";
import { ReportsModule } from "./reports/reports.module";
import { UsersModule } from "./users/users.module";
import { SettingsModule } from "./settings/settings.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    AuthModule,
    AuditModule,
    PatientsModule,
    MedicationsModule,
    PrescriptionsModule,
    DiagnosesModule,
    EncountersModule,
    ClinicalNotesModule,
    TreatmentsModule,
    ReportsModule,
    UsersModule,
    SettingsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
