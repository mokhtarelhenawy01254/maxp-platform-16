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
    from src.llm.key_resolver import get_active_key

    settings = get_settings()
    google_key = await get_active_key("GOOGLE")
    if not google_key:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "reason": "No LLM provider is configured",
            },
        )
    return JSONResponse(
        status_code=200,
        content={
            "status": "ready",
            "service": settings.app_name,
            "version": settings.version,
            "provider": "google",
            "configured_providers": ["google"],
        },
    )
