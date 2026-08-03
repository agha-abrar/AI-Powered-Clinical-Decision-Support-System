from __future__ import annotations

from app.core.config import Settings, get_settings
from app.providers.local_demo_diagnosis_provider import LocalDemoDiagnosisProvider
from app.providers.openrouter_diagnosis_provider import DiagnosisGenerationError, OpenRouterDiagnosisProvider
from app.schemas.diagnosis import DiagnosticRequestContext


class ProviderUnavailableError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


async def run_diagnostic_analysis(context: DiagnosticRequestContext, correlation_id: str, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    local_provider = LocalDemoDiagnosisProvider()

    if settings.ai_diagnosis_provider == "local-demo":
        return await local_provider.generate(context, correlation_id)

    openrouter_provider = OpenRouterDiagnosisProvider(settings)
    try:
        return await openrouter_provider.generate(context, correlation_id)
    except DiagnosisGenerationError as exc:
        # A privacy-routing failure must NEVER be silently downgraded to a
        # less-private path — if local fallback is disabled, fail loudly.
        if exc.code == "AI_PRIVACY_ROUTING_FAILED":
            if not settings.ai_enable_local_fallback:
                raise ProviderUnavailableError(exc.code, exc.message) from exc
        elif not settings.ai_enable_local_fallback:
            raise ProviderUnavailableError(exc.code, exc.message) from exc

        return await local_provider.generate(context, correlation_id, fallback_reason=exc.message)
