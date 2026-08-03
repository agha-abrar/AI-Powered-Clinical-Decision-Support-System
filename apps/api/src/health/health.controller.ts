import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../common/prisma/prisma.service";

@ApiTags("health")
@Controller("api/v1/health")
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Get()
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("dependencies")
  async dependencies() {
    const dbStatus = await this.checkDatabase();
    const aiStatus = await this.checkAiService();
    return {
      database: dbStatus,
      aiService: aiStatus,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up", latencyMs: Date.now() - start };
    } catch {
      return { status: "down" };
    }
  }

  private async checkAiService(): Promise<{ status: string; latencyMs?: number }> {
    const base = this.config.get<string>("AI_SERVICE_URL");
    if (!base) return { status: "not_configured" };
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return { status: res.ok ? "up" : "degraded", latencyMs: Date.now() - start };
    } catch {
      return { status: "down" };
    }
  }
}
