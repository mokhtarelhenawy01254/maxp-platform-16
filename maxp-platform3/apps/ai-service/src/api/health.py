from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.config import get_settings

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
    }


@router.get("/ready")
async def ready() -> JSONResponse:
    settings = get_settings()
    configured_providers = {
        name: key
        for name, key in [
            ("anthropic", settings.anthropic_api_key),
            ("openai", settings.openai_api_key),
            ("google", settings.google_api_key),
        ]
        if key
    }
    if not configured_providers:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "reason": "No LLM provider is configured",
            },
        )
    primary = list(configured_providers.keys())[0]
    return JSONResponse(
        status_code=200,
        content={
            "status": "ready",
            "service": settings.app_name,
            "version": settings.version,
            "provider": primary,
            "configured_providers": list(configured_providers.keys()),
        },
    )
