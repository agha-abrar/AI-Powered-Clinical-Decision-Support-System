import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // @ts-expect-error - prisma event typing is provider-specific
    this.$on("warn", (e: unknown) => this.logger.warn(JSON.stringify(e)));
    // @ts-expect-error - prisma event typing is provider-specific
    this.$on("error", (e: unknown) => this.logger.error(JSON.stringify(e)));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }
}
