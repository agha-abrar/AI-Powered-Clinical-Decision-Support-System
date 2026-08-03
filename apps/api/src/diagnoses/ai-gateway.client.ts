import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiagnosticRequestContext, diagnosticResponseSchema, DiagnosticResponseDto } from "@cdss/shared";

export interface AiGatewayResult {
  response: DiagnosticResponseDto;
  provider: "OPENROUTER" | "LOCAL_DEMO";
  requestedModel: string | null;
  returnedModel: string | null;
  promptTemplateVersion: string;
  sanitizationVersion: string;
  inputHash: string;
  generationId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  fallbackUsed: boolean;
  fallbackReason: string | null;
}

/**
 * NestJS never talks to OpenRouter directly (spec section 2/19). This client
 * is the sole bridge to the FastAPI AI gateway, which owns de-identification,
 * prompt construction, and OpenRouter communication. Direct identifiers are
 * never sent in `context` — callers must build DiagnosticRequestContext from
 * already de-identified/aggregated clinical data.
 */
@Injectable()
export class AiGatewayClient {
  constructor(private readonly config: ConfigService) {}

  async requestDiagnosis(context: DiagnosticRequestContext, correlationId: string): Promise<AiGatewayResult> {
    const base = this.config.get<string>("AI_SERVICE_URL");
    if (!base) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_UNAVAILABLE",
        message: "AI service is not configured (AI_SERVICE_URL is unset).",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    let res: Response;
    try {
      res = await fetch(`${base.replace(/\/$/, "")}/api/v1/diagnosis/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Correlation-Id": correlationId },
        body: JSON.stringify({ context }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_UNAVAILABLE",
        message: "Unable to reach the AI service.",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
      throw new ServiceUnavailableException({
        code: body.error?.code ?? "AI_PROVIDER_UNAVAILABLE",
        message: body.error?.message ?? "The AI service returned an error.",
      });
    }

    const payload = (await res.json()) as {
      response: unknown;
      provider: "OPENROUTER" | "LOCAL_DEMO";
      requestedModel?: string | null;
      returnedModel?: string | null;
      promptTemplateVersion: string;
      sanitizationVersion: string;
      inputHash: string;
      generationId?: string | null;
      promptTokens?: number | null;
      completionTokens?: number | null;
      totalTokens?: number | null;
      latencyMs: number;
      fallbackUsed?: boolean;
      fallbackReason?: string | null;
    };

    // Second, independent validation layer — never trust a single layer.
    const parsed = diagnosticResponseSchema.safeParse(payload.response);
    if (!parsed.success) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_UNAVAILABLE",
        message: "The AI service returned a response that failed structured validation.",
      });
    }

    return {
      response: parsed.data,
      provider: payload.provider,
      requestedModel: payload.requestedModel ?? null,
      returnedModel: payload.returnedModel ?? null,
      promptTemplateVersion: payload.promptTemplateVersion,
      sanitizationVersion: payload.sanitizationVersion,
      inputHash: payload.inputHash,
      generationId: payload.generationId ?? null,
      promptTokens: payload.promptTokens ?? null,
      completionTokens: payload.completionTokens ?? null,
      totalTokens: payload.totalTokens ?? null,
      latencyMs: payload.latencyMs,
      fallbackUsed: !!payload.fallbackUsed,
      fallbackReason: payload.fallbackReason ?? null,
    };
  }
}
