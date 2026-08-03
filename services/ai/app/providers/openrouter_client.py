from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass, field

import httpx

from app.core.config import Settings

MAX_RESPONSE_BYTES = 2_000_000  # protection against runaway/oversized responses
_RETRYABLE_STATUS = {429, 502, 503, 504}


class OpenRouterError(Exception):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


@dataclass
class CircuitBreaker:
    """Trivial in-memory circuit breaker; trips after N consecutive failures
    and stays open for cooldown_seconds before allowing a trial request."""

    failure_threshold: int = 5
    cooldown_seconds: float = 30.0
    _consecutive_failures: int = field(default=0, init=False)
    _opened_at: float | None = field(default=None, init=False)

    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        if time.monotonic() - self._opened_at >= self.cooldown_seconds:
            # half-open: allow a trial request
            return False
        return True

    def record_success(self) -> None:
        self._consecutive_failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.failure_threshold:
            self._opened_at = time.monotonic()


_breaker = CircuitBreaker()


class OpenRouterClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def chat_completion_structured(
        self,
        system_prompt: str,
        user_message: str,
        json_schema: dict,
        correlation_id: str,
    ) -> dict:
        if not self.settings.openrouter_api_key:
            raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter API key is not configured", retryable=False)

        if _breaker.is_open():
            raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter circuit breaker is open", retryable=False)

        provider_routing = {
            "zdr": self.settings.openrouter_require_zdr,
            "data_collection": "deny" if self.settings.openrouter_deny_data_collection else "allow",
            "require_parameters": self.settings.openrouter_require_parameters,
            "allow_fallbacks": self.settings.openrouter_allow_fallbacks,
        }

        body = {
            "model": self.settings.openrouter_model,
            "temperature": self.settings.openrouter_temperature,
            "top_p": self.settings.openrouter_top_p,
            "max_tokens": self.settings.openrouter_max_output_tokens,
            "provider": provider_routing,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "diagnostic_response", "strict": True, "schema": json_schema},
            },
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        }

        headers = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.settings.openrouter_site_url,
            "X-Title": self.settings.openrouter_app_name,
            "X-Correlation-Id": correlation_id,
        }

        timeout = httpx.Timeout(
            connect=10.0,
            read=float(self.settings.openrouter_timeout_seconds),
            write=10.0,
            pool=10.0,
        )

        last_error: OpenRouterError | None = None
        for attempt in range(self.settings.openrouter_max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(
                        f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions",
                        json=body,
                        headers=headers,
                    )
            except httpx.TimeoutException:
                last_error = OpenRouterError("AI_PROVIDER_UNAVAILABLE", "Request to OpenRouter timed out", retryable=True)
                await self._maybe_backoff(attempt)
                continue
            except httpx.RequestError as exc:
                last_error = OpenRouterError("AI_PROVIDER_UNAVAILABLE", f"Network error contacting OpenRouter: {exc}", retryable=True)
                await self._maybe_backoff(attempt)
                continue

            if resp.status_code == 200:
                if len(resp.content) > MAX_RESPONSE_BYTES:
                    _breaker.record_failure()
                    raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter response exceeded maximum allowed size", retryable=False)
                _breaker.record_success()
                return resp.json()

            if resp.status_code in _RETRYABLE_STATUS:
                last_error = OpenRouterError(
                    "AI_PROVIDER_UNAVAILABLE", f"OpenRouter transient error (HTTP {resp.status_code})", retryable=True
                )
                _breaker.record_failure()
                await self._maybe_backoff(attempt)
                continue

            # Deterministic client errors are never retried (auth failure, invalid
            # request, invalid schema, privacy-routing failure, etc.)
            _breaker.record_failure()
            if resp.status_code == 401:
                raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter authentication failed", retryable=False)
            if resp.status_code == 400:
                raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter rejected the request (invalid schema or parameters)", retryable=False)
            raise OpenRouterError("AI_PROVIDER_UNAVAILABLE", f"OpenRouter returned HTTP {resp.status_code}", retryable=False)

        raise last_error or OpenRouterError("AI_PROVIDER_UNAVAILABLE", "OpenRouter request failed", retryable=True)

    async def _maybe_backoff(self, attempt: int) -> None:
        base_delay = min(2**attempt, 8)
        jitter = random.uniform(0, 0.5)
        await asyncio.sleep(base_delay + jitter)
