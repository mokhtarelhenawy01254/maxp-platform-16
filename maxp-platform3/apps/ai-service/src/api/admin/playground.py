from __future__ import annotations

import time as _time
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.auth import verify_admin_jwt
from src.api.admin.keys import OPENAI_COMPAT_PROVIDERS, _DEFAULT_TEST_MODELS
from src.db.models.provider import AiKey
from src.db.session import get_session
from src.llm.client import LLMClient

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


class PlaygroundChatRequest(BaseModel):
    provider: str = Field(..., min_length=1)
    model: str | None = None
    prompt: str = Field(..., min_length=1)
    systemPrompt: str | None = None
    temperature: float | None = None
    maxTokens: int | None = None


class PlaygroundChatResponse(BaseModel):
    success: bool
    reply: str | None = None
    model: str = ""
    provider: str = ""
    latencyMs: float = 0
    inputTokens: int = 0
    outputTokens: int = 0
    error: str | None = None


@router.post("/playground/chat", response_model=PlaygroundChatResponse)
async def playground_chat(
    body: PlaygroundChatRequest,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> PlaygroundChatResponse:
    provider = body.provider.upper()
    result = await session.execute(
        select(AiKey).where(
            AiKey.provider == provider,
            AiKey.is_active.is_(True),
            AiKey.company_id.is_(None),
        ).order_by(AiKey.created_at.desc())
    )
    key = result.scalars().first()
    if not key:
        return PlaygroundChatResponse(
            success=False, error=f"No active central key found for provider: {provider}"
        )

    resolved_model = body.model or _DEFAULT_TEST_MODELS.get(provider, "gpt-4o-mini")
    base_url = key.base_url or (None if provider == "GOOGLE" else OPENAI_COMPAT_PROVIDERS.get(provider))

    try:
        client = LLMClient(
            provider=provider,
            model=resolved_model,
            api_key=key.api_key,
            base_url=base_url,
            key_id=key.id,
        )
    except ValueError as exc:
        return PlaygroundChatResponse(success=False, error=str(exc))

    messages = []
    if body.systemPrompt:
        messages.append({"role": "system", "content": body.systemPrompt})
    messages.append({"role": "user", "content": body.prompt})

    max_tokens = body.maxTokens or 2048
    kwargs = {"max_tokens": max_tokens}
    if body.temperature is not None:
        kwargs["temperature"] = max(0.0, min(2.0, body.temperature))

    started = _time.perf_counter()
    try:
        response = await client.generate(messages, **kwargs)
        latency_ms = round((_time.perf_counter() - started) * 1000, 2)
        used_model = response.model or resolved_model
        reply_text = str(response.text or "")
        usage = response.usage or {}
        input_tokens = usage.get("prompt_tokens") or usage.get("input_tokens") or 0
        output_tokens = usage.get("completion_tokens") or usage.get("output_tokens") or 0
        logger.info(
            "playground_chat_ok",
            provider=provider,
            model=used_model,
            latency_ms=latency_ms,
        )
        return PlaygroundChatResponse(
            success=True,
            reply=reply_text,
            model=used_model,
            provider=provider,
            latencyMs=latency_ms,
            inputTokens=input_tokens,
            outputTokens=output_tokens,
        )
    except Exception as exc:
        latency_ms = round((_time.perf_counter() - started) * 1000, 2)
        error_msg = str(exc)[:500]
        logger.warning("playground_chat_failed", provider=provider, error=error_msg)
        return PlaygroundChatResponse(
            success=False, error=error_msg, latencyMs=latency_ms
        )
