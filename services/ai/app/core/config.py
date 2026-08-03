"""
Centralized settings for the AI gateway service.

The OpenRouter API key and all provider-routing/privacy toggles are loaded
strictly from environment variables. Nothing here is hard-coded, and this
module is the only place permitted to read OPENROUTER_API_KEY.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- OpenRouter ---
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str | None = None
    openrouter_site_url: str = "http://localhost"
    openrouter_app_name: str = "AI-Powered-CDSS"
    openrouter_timeout_seconds: int = 30
    openrouter_max_retries: int = 2
    openrouter_temperature: float = 0.1
    openrouter_top_p: float = 0.9
    openrouter_max_output_tokens: int = 3000
    openrouter_require_zdr: bool = True
    openrouter_deny_data_collection: bool = True
    openrouter_require_parameters: bool = True
    openrouter_allow_fallbacks: bool = False

    # --- Provider selection ---
    ai_external_processing_enabled: bool = True
    ai_enable_local_fallback: bool = True
    ai_diagnosis_provider: str = "openrouter"  # "openrouter" | "local-demo"

    # --- Service ---
    ai_service_port: int = 8001
    log_level: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()
