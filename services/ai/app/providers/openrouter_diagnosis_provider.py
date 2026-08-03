from __future__ import annotations

import hashlib
import json
import time

from pydantic import ValidationError

from app.core.config import Settings
from app.privacy.deidentifier import deidentify_context, contains_forbidden_keys, SANITIZATION_VERSION
from app.prompts.diagnosis.v1 import SYSTEM_PROMPT, PROMPT_TEMPLATE_VERSION, build_user_message
from app.providers.openrouter_client import OpenRouterClient, OpenRouterError
from app.schemas.diagnosis import DiagnosticRequestContext, DiagnosticResponse
from app.schemas.json_schema import DIAGNOSTIC_RESPONSE_JSON_SCHEMA


class DiagnosisGenerationError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class OpenRouterDiagnosisProvider:
    """Owns de-identification -> prompt construction -> OpenRouter call ->
    strict structured-output validation, end to end, for the OPENROUTER
    provider path. Never persists or logs the raw prompt/response."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = OpenRouterClient(settings)

    async def generate(self, context: DiagnosticRequestContext, correlation_id: str) -> dict:
        if not self.settings.ai_external_processing_enabled:
            raise DiagnosisGenerationError("AI_PROVIDER_UNAVAILABLE", "External AI processing is disabled by configuration")
        if not self.settings.openrouter_model:
            raise DiagnosisGenerationError("AI_PROVIDER_UNAVAILABLE", "No OpenRouter model has been configured by an administrator")

        raw = context.model_dump(exclude_none=True)
        forbidden_hits = contains_forbidden_keys(raw)
        if forbidden_hits:
            # Fail safe rather than silently stripping — this indicates a
            # caller bug upstream that must be fixed, not routed around.
            raise DiagnosisGenerationError(
                "AI_PRIVACY_ROUTING_FAILED",
                f"Refusing to contact OpenRouter: forbidden identifying fields present ({', '.join(forbidden_hits)})",
            )

        sanitized = deidentify_context(raw)
        context_json = json.dumps(sanitized, sort_keys=True, default=str)
        input_hash = hashlib.sha256(context_json.encode("utf-8")).hexdigest()
        user_message = build_user_message(context_json)

        start = time.monotonic()
        try:
            raw_result = await self.client.chat_completion_structured(
                SYSTEM_PROMPT, user_message, DIAGNOSTIC_RESPONSE_JSON_SCHEMA, correlation_id
            )
        except OpenRouterError as exc:
            raise DiagnosisGenerationError(exc.code, exc.message) from exc
        latency_ms = int((time.monotonic() - start) * 1000)

        choice = (raw_result.get("choices") or [{}])[0]
        content = choice.get("message", {}).get("content", "")
        try:
            parsed_json = json.loads(content)
            validated = DiagnosticResponse.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise DiagnosisGenerationError("AI_PROVIDER_UNAVAILABLE", f"Structured response failed validation: {exc}") from exc

        usage = raw_result.get("usage") or {}
        return {
            "response": validated,
            "provider": "OPENROUTER",
            "requestedModel": self.settings.openrouter_model,
            "returnedModel": raw_result.get("model"),
            "promptTemplateVersion": PROMPT_TEMPLATE_VERSION,
            "sanitizationVersion": SANITIZATION_VERSION,
            "inputHash": input_hash,
            "generationId": raw_result.get("id"),
            "promptTokens": usage.get("prompt_tokens"),
            "completionTokens": usage.get("completion_tokens"),
            "totalTokens": usage.get("total_tokens"),
            "latencyMs": latency_ms,
            "fallbackUsed": False,
            "fallbackReason": None,
        }
