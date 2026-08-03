import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const isProd = config.get("NODE_ENV") === "production";

  app.use(helmet());
  app.use(new RequestIdMiddleware().use);

  const allowedOrigins = (config.get("CORS_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger is disabled in production and never includes secret env values —
  // there is nothing sensitive registered on any DTO in this codebase, but we
  // still gate exposure defensively per the spec's "secure Swagger in prod" rule.
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("AI-Powered CDSS API (educational prototype)")
      .setDescription(
        "Not clinically validated. Educational prototype only. All AI output requires professional review.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = config.get("API_PORT") ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CDSS API listening on port ${port} (prod=${isProd})`);
}

bootstrap();
