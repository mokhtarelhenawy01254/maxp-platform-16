from __future__ import annotations

import warnings
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "maxp-ai-service"
    version: str = "0.2.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    database_url: str = Field(..., description="Postgres connection URL")

    maxp_api_url: str = Field(..., description="MaxP backend API base URL")
    maxp_service_token: str = Field(
        ...,
        repr=False,
        description="Sensitive: MaxP service auth token",
    )

    anthropic_api_key: str | None = Field(
        default=None,
        repr=False,
        description="Sensitive: Anthropic API key",
    )
    openai_api_key: str | None = Field(
        default=None,
        repr=False,
        description="Sensitive: OpenAI API key",
    )
    google_api_key: str | None = Field(
        default=None,
        repr=False,
        description="Sensitive: Google AI API key (for Gemini)",
    )

    default_llm_provider: Literal["anthropic", "openai", "google"] = "anthropic"
    default_model: str = "claude-sonnet-4-6"
    google_gemini_model: str = "gemma-4-31b-it"

    otlp_endpoint: str | None = Field(
        default=None,
        description="OpenTelemetry OTLP HTTP endpoint (e.g. http://jaeger:4318/v1/traces)",
    )
    sentry_dsn: str | None = Field(
        default=None,
        repr=False,
        description="Sentry DSN for error tracking",
    )

    cost_soft_cap: float = Field(default=5.0, description="Soft daily cost cap per company ($)")
    cost_hard_cap: float = Field(default=20.0, description="Hard daily cost cap per company ($)")

    agents_templates_root: str | None = Field(
        default=None,
        description="Path to backend agents/ directory with agent.json templates",
    )

    redis_url: str | None = Field(
        default=None,
        description="Redis connection URL (e.g. redis://localhost:6379/0)",
    )

    mcp_servers: list[dict] | None = Field(
        default=None,
        description="List of MCP server configs: [{name, url, api_key?}]",
    )

    prompt_cache_ttl: int = Field(
        default=1800,
        description="TTL in seconds for cached prompts (default 30 min)",
    )

    enable_pgvector: bool = Field(
        default=True,
        description="Use pgvector for embedding search instead of client-side cosine similarity",
    )

    enable_magentic_orchestration: bool = Field(
        default=False,
        description="Use MagenticBuilder for CEO orchestration (requires agent-framework-orchestrations)",
    )

    log_level: str = "INFO"
    cors_origins: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_required(self) -> Settings:
        if self.environment in ("staging", "production"):
            if not self.anthropic_api_key and not self.openai_api_key and not self.google_api_key:
                msg = "At least one LLM API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY) is required in staging/production"
                raise ValueError(msg)
            if not self.maxp_api_url or "localhost" in self.maxp_api_url.lower():
                warnings.warn(
                    f"MAXP_API_URL is set to localhost ({self.maxp_api_url}) in {self.environment} mode",
                    stacklevel=2,
                )
            if not self.maxp_service_token:
                msg = "MAXP_SERVICE_TOKEN is required in staging/production"
                raise ValueError(msg)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
