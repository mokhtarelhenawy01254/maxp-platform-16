from __future__ import annotations

import asyncio
import time as _time
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import String, cast, func, select, case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.schemas import (
    AiKeyCreate,
    AiKeyRead,
    AiKeyStatusUpdate,
    AiKeyTestResult,
    AiKeyUpdate,
    DashboardStats,
    GlobalConfigRead,
    GlobalConfigUpdate,
    LogEntry,
    LogListResponse,
    ProviderPriorityUpdate,
    ProviderRead,
)
from src.db.models import (
    AiKey,
    AiModelConfig,
    GlobalAiConfig,
    Provider,
    ProviderLog,
)
from src.db.session import get_session
from src.api.admin.auth import verify_admin_jwt
from src.llm.client import OPENAI_COMPAT_PROVIDERS, LLMClient

logger = structlog.get_logger(__name__)
router = APIRouter()


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _generate_key_id() -> str:
    import secrets

    return f"aikey_{secrets.token_urlsafe(16)}"


def _mask_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"


def _to_read(key: AiKey) -> AiKeyRead:
    return AiKeyRead(
        id=key.id,
        name=key.name,
        provider=key.provider,
        base_url=key.base_url,
        is_active=key.is_active,
        key_type=key.key_type,
        company_id=key.company_id,
        max_requests_per_day=key.max_requests_per_day,
        current_usage=key.current_usage,
        priority=key.priority,
        last_used_at=key.last_used_at,
        last_tested_at=key.last_tested_at,
        last_test_status=key.last_test_status,
        created_at=key.created_at,
        updated_at=key.updated_at,
        api_key_masked=_mask_key(key.api_key),
    )


@router.get("/providers", response_model=list[ProviderRead])
async def list_providers(
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> list[ProviderRead]:
    result = await session.execute(
        select(Provider).where(Provider.is_active.is_(True)).order_by(Provider.name)
    )
    return [ProviderRead.model_validate(p) for p in result.scalars().all()]


@router.get("/keys", response_model=list[AiKeyRead])
async def list_keys(
    session: SessionDep,
    provider: str | None = None,
    company_id: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    admin: dict | None = Depends(verify_admin_jwt),
) -> list[AiKeyRead]:
    stmt = select(AiKey).order_by(AiKey.provider, AiKey.priority, AiKey.created_at)
    if provider:
        stmt = stmt.where(cast(AiKey.provider, String) == provider)
    if company_id:
        stmt = stmt.where(AiKey.company_id == company_id)
    if is_active is not None:
        stmt = stmt.where(AiKey.is_active == is_active)
    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return [_to_read(k) for k in result.scalars().all()]


@router.post("/keys", response_model=AiKeyRead, status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: AiKeyCreate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> AiKeyRead:
    provider = await session.get(Provider, payload.provider)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {payload.provider}")

    if payload.key_type == "COMPANY" and not payload.company_id:
        raise HTTPException(
            status_code=400,
            detail="company_id is required when key_type is COMPANY",
        )

    key = AiKey(
        id=payload.id or _generate_key_id(),
        name=payload.name,
        provider=payload.provider,
        api_key=payload.api_key,
        base_url=payload.base_url or provider.base_url,
        key_type=payload.key_type,
        company_id=payload.company_id,
        max_requests_per_day=payload.max_requests_per_day,
        priority=payload.priority,
        is_active=payload.is_active,
    )
    session.add(key)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Key name '{payload.name}' already exists for provider '{payload.provider}'",
        ) from exc
    await session.refresh(key)

    if payload.models:
        for i, model_name in enumerate(payload.models):
            model_name = model_name.strip()
            if not model_name:
                continue
            session.add(
                AiModelConfig(
                    id=f"{key.id}_model_{i}",
                    key_id=key.id,
                    model_name=model_name,
                    is_enabled=True,
                    priority=i + 1,
                )
            )
        await session.commit()

    session.add(
        ProviderLog(
            provider=key.provider,
            key_id=key.id,
            action="key.created",
            status="ok",
        )
    )
    await session.commit()

    logger.info("ai_key_created", key_id=str(key.id), provider=key.provider, name=key.name)
    return _to_read(key)


@router.get("/keys/{key_id}", response_model=AiKeyRead)
async def get_key(
    key_id: str,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> AiKeyRead:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return _to_read(key)


@router.patch("/keys/{key_id}", response_model=AiKeyRead)
async def update_key(
    key_id: str,
    payload: AiKeyUpdate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> AiKeyRead:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(key, field, value)
    key.updated_at = datetime.now()

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Name conflict for this provider") from exc
    await session.refresh(key)

    session.add(
        ProviderLog(
            provider=key.provider,
            key_id=key.id,
            action="key.updated",
            status="ok",
        )
    )
    await session.commit()

    logger.info("ai_key_updated", key_id=str(key.id), fields=list(data.keys()))
    return _to_read(key)


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    key_id: str,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> None:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    provider = key.provider
    await session.delete(key)
    await session.commit()
    logger.info("ai_key_deleted", key_id=str(key_id), provider=provider)


@router.patch("/keys/{key_id}/status", response_model=AiKeyRead)
async def set_key_status(
    key_id: str,
    payload: AiKeyStatusUpdate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> AiKeyRead:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = payload.is_active
    key.updated_at = datetime.now()
    await session.commit()
    await session.refresh(key)
    return _to_read(key)


@router.post("/keys/{key_id}/test", response_model=AiKeyTestResult)
async def test_key(
    key_id: str,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> AiKeyTestResult:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    provider = await session.get(Provider, key.provider)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Provider '{key.provider}' not found")

    started = datetime.now()
    status_label = "error"
    error_msg: str | None = None
    latency: int | None = None
    try:
        import httpx

        test_url = provider.base_url or "https://api.openai.com/v1"
        headers = {"Authorization": f"Bearer {key.api_key}"}
        async with httpx.AsyncClient(timeout=10.0, trust_env=False) as client:
            resp = await client.get(test_url, headers=headers)
        latency = int((datetime.now() - started).total_seconds() * 1000)
        if resp.status_code < 500:
            status_label = "ok"
        else:
            error_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        latency = latency if latency else int((datetime.now() - started).total_seconds() * 1000)
        error_msg = str(exc)[:500]

    key.last_tested_at = datetime.now()
    key.last_test_status = status_label
    await session.commit()

    session.add(
        ProviderLog(
            provider=key.provider,
            key_id=key.id,
            action="key.test",
            status=status_label,
            latency_ms=latency,
            error=error_msg,
        )
    )
    await session.commit()

    return AiKeyTestResult(
        id=key.id,
        status="ok" if status_label == "ok" else "error",
        latency_ms=latency,
        error=error_msg,
        tested_at=key.last_tested_at,
    )


@router.post("/provider-priority", response_model=GlobalConfigRead)
async def set_provider_priority(
    payload: ProviderPriorityUpdate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> GlobalConfigRead:
    result = await session.execute(select(GlobalAiConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = GlobalAiConfig(
            default_provider=payload.providers[0] if payload.providers else None,
            provider_priority=payload.providers,
        )
        session.add(config)
    else:
        config.provider_priority = payload.providers
        if not config.default_provider and payload.providers:
            config.default_provider = payload.providers[0]
        config.updated_at = datetime.now()
    await session.commit()
    await session.refresh(config)
    return GlobalConfigRead.model_validate(config)


@router.get("/config", response_model=GlobalConfigRead)
async def get_global_config(
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> GlobalConfigRead:
    result = await session.execute(select(GlobalAiConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = GlobalAiConfig(provider_priority=[])
        session.add(config)
        await session.commit()
        await session.refresh(config)
    return GlobalConfigRead.model_validate(config)


@router.patch("/config", response_model=GlobalConfigRead)
async def update_global_config(
    payload: GlobalConfigUpdate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> GlobalConfigRead:
    result = await session.execute(select(GlobalAiConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = GlobalAiConfig(provider_priority=[])
        session.add(config)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(config, field, value)
    config.updated_at = datetime.now()
    await session.commit()
    await session.refresh(config)
    return GlobalConfigRead.model_validate(config)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> DashboardStats:
    from datetime import datetime, timedelta

    keys_result = await session.execute(select(AiKey))
    keys = list(keys_result.scalars().all())

    total = len(keys)
    active = sum(1 for k in keys if k.is_active)

    by_provider: dict[str, int] = {}
    by_company: dict[str, int] = {}
    for k in keys:
        by_provider[k.provider] = by_provider.get(k.provider, 0) + 1
        if k.company_id:
            by_company[k.company_id] = by_company.get(k.company_id, 0) + 1

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    logs_result = await session.execute(
        select(ProviderLog).where(ProviderLog.created_at >= today_start)
    )
    today_logs = list(logs_result.scalars().all())
    requests_today = len(today_logs)
    failures_today = sum(1 for log_entry in today_logs if log_entry.status == "error")

    cutoff = datetime.now(UTC) - timedelta(hours=24)
    recent_result = await session.execute(
        select(ProviderLog).where(ProviderLog.created_at >= cutoff)
    )
    recent = list(recent_result.scalars().all())
    if recent:
        ok_count = sum(1 for log_entry in recent if log_entry.status == "ok")
        success_rate = round(ok_count / len(recent) * 100, 2)
    else:
        success_rate = 100.0

    return DashboardStats(
        total_keys=total,
        active_keys=active,
        keys_by_provider=by_provider,
        keys_by_company=by_company,
        requests_today=requests_today,
        failures_today=failures_today,
        last_24h_success_rate=success_rate,
    )


@router.get("/logs", response_model=LogListResponse)
async def list_logs(
    session: SessionDep,
    provider: str | None = None,
    key_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    admin: dict | None = Depends(verify_admin_jwt),
) -> LogListResponse:
    # 1. ORM stats query
    orm_stats_stmt = select(
        func.count(ProviderLog.id).label("total"),
        func.sum(case((ProviderLog.status.in_(["success", "ok"]), 1), else_=0)).label("success"),
        func.sum(case((ProviderLog.status.in_(["failed", "error"]), 1), else_=0)).label("failed"),
        func.sum(ProviderLog.latency_ms).label("total_latency"),
        func.count(ProviderLog.latency_ms).label("latency_count")
    )
    if provider:
        orm_stats_stmt = orm_stats_stmt.where(ProviderLog.provider == provider)
    if key_id:
        orm_stats_stmt = orm_stats_stmt.where(ProviderLog.key_id == key_id)
    if status:
        if status == "success":
            orm_stats_stmt = orm_stats_stmt.where(ProviderLog.status.in_(["success", "ok"]))
        elif status == "failed":
            orm_stats_stmt = orm_stats_stmt.where(ProviderLog.status.in_(["failed", "error"]))
        else:
            orm_stats_stmt = orm_stats_stmt.where(ProviderLog.status == status)

    orm_stats_res = (await session.execute(orm_stats_stmt)).one()
    orm_total = orm_stats_res.total or 0
    orm_success = orm_stats_res.success or 0
    orm_failed = orm_stats_res.failed or 0
    orm_tot_latency = orm_stats_res.total_latency or 0
    orm_lat_count = orm_stats_res.latency_count or 0

    # 2. Public (Raw SQL) stats query
    clause, p = _build_public_filters(provider, key_id, status)
    pub_total = 0
    pub_success = 0
    pub_failed = 0
    pub_tot_latency = 0
    pub_lat_count = 0

    from sqlalchemy import text as _t
    try:
        pub_stats_res = await session.execute(_t(f"""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN status IN ('success', 'ok') THEN 1 ELSE 0 END) AS success,
                   SUM(CASE WHEN status IN ('failed', 'error') THEN 1 ELSE 0 END) AS failed,
                   SUM("latencyMs") AS total_latency,
                   COUNT("latencyMs") AS latency_count
            FROM public.ai_provider_logs
            WHERE {clause}
        """), p)
        pub_stats = pub_stats_res.mappings().one()
        pub_total = pub_stats["total"] or 0
        pub_success = pub_stats["success"] or 0
        pub_failed = pub_stats["failed"] or 0
        pub_tot_latency = pub_stats["total_latency"] or 0
        pub_lat_count = pub_stats["latency_count"] or 0
    except Exception as _pub_stats_exc:
        logger.warning("public_stats_query_failed", error=str(_pub_stats_exc))

    total = orm_total + pub_total
    success_count = orm_success + pub_success
    failed_count = orm_failed + pub_failed
    
    tot_latency = orm_tot_latency + pub_tot_latency
    lat_count = orm_lat_count + pub_lat_count
    avg_latency = round(tot_latency / lat_count) if lat_count > 0 else 0

    # 3. Fetch records
    fetch_limit = offset + limit
    stmt = select(ProviderLog).order_by(ProviderLog.created_at.desc(), ProviderLog.id.desc())
    if provider:
        stmt = stmt.where(ProviderLog.provider == provider)
    if key_id:
        stmt = stmt.where(ProviderLog.key_id == key_id)
    if status:
        if status == "success":
            stmt = stmt.where(ProviderLog.status.in_(["success", "ok"]))
        elif status == "failed":
            stmt = stmt.where(ProviderLog.status.in_(["failed", "error"]))
        else:
            stmt = stmt.where(ProviderLog.status == status)

    stmt = stmt.limit(fetch_limit)
    result = await session.execute(stmt)
    rows = [LogEntry.model_validate(r) for r in result.scalars().all()]

    try:
        pp = {**p, "lim": fetch_limit}
        pub = await session.execute(_t(f"""
            SELECT id, provider, "keyId" AS key_id, action, status,
                   model, "latencyMs" AS latency_ms,
                    COALESCE(CAST(COALESCE(metadata, '{{}}') AS jsonb)->>'error', NULLIF(COALESCE(message, ''), '')) AS error,
                   CAST(COALESCE(metadata, '{{}}') AS jsonb)->>'response' AS response,
                   "companyId" AS company_id, "createdAt" AS created_at
            FROM public.ai_provider_logs
            WHERE {clause}
            ORDER BY "createdAt" DESC, id DESC LIMIT :lim
        """), pp)
        rows.extend(LogEntry.model_validate(r) for r in pub.mappings().all())
    except Exception as _pub_exc:
        logger.warning("public_logs_query_failed", error=str(_pub_exc))

    # Move sorting and slicing outside try-except so they ALWAYS execute!
    rows.sort(key=lambda r: r.created_at.replace(tzinfo=None) if r.created_at.tzinfo else r.created_at, reverse=True)
    rows = rows[offset:offset + limit]

    return LogListResponse(
        items=rows,
        total=total,
        success_count=success_count,
        failed_count=failed_count,
        avg_latency=avg_latency
    )


def _build_public_filters(
    provider: str | None,
    key_id: str | None,
    status: str | None,
) -> tuple[str, dict]:
    clause = []
    params: dict = {}
    if provider:
        clause.append("provider = :provider")
        params["provider"] = provider
    if key_id:
        clause.append('"keyId" = :key_id')
        params["key_id"] = key_id
    if status:
        if status == "success":
            clause.append("status IN ('success', 'ok')")
        elif status == "failed":
            clause.append("status IN ('failed', 'error')")
        else:
            clause.append("status = :status")
            params["status"] = status
    return " AND ".join(clause) if clause else "TRUE", params



_DEFAULT_TEST_MODELS: dict[str, str] = {
    "GOOGLE": "gemini-2.5-flash",
    "OLLAMA": "llama3.2",
    "GROQ": "openai/gpt-oss-120b",
    "OPENAI": "gpt-4o-mini",
    "DEEPSEEK": "deepseek-v4-flash",
    "ANTHROPIC": "claude-sonnet-4-20250514",
    "CEREBRAS": "qwen-3-235b-a22b-instruct-2507",
    "MISTRAL": "mistral-large-latest",
    "SAMBANOVA": "DeepSeek-V3.1",
    "OPENROUTER": "openrouter/auto",
    "NVIDIA": "openai/gpt-oss-120b",
    "HUGGINGFACE": "mistralai/Mistral-7B-Instruct-v0.3",
    "GITHUB": "gpt-4o",
}


def _build_test_client(provider_type: str, api_key: str, model: str | None = None) -> LLMClient:
    ptype = provider_type.upper()
    base_url = None if ptype == "GOOGLE" else OPENAI_COMPAT_PROVIDERS.get(ptype)
    resolved_model = model or _DEFAULT_TEST_MODELS.get(ptype, "gpt-4o-mini")
    return LLMClient(provider=ptype, model=resolved_model, api_key=api_key, base_url=base_url)


class KeyTestRequest(BaseModel):
    provider: str
    api_key: str
    model: str | None = None
    messages: list[dict] | None = None
    prompt: str | None = None
    timeout_ms: int | None = None


class KeyTestResponse(BaseModel):
    success: bool
    latency_ms: float
    model: str
    error: str | None = None
    reply: str | None = None


@router.post("/test", response_model=KeyTestResponse)
async def test_key_raw(
    body: KeyTestRequest,
    admin: dict | None = Depends(verify_admin_jwt),
) -> KeyTestResponse:
    """Test a raw provider API key by sending a simple completion request. Used by super admin dashboard."""
    try:
        client = _build_test_client(body.provider, body.api_key, body.model)
    except ValueError as exc:
        return KeyTestResponse(success=False, latency_ms=0, model="", error=str(exc))

    if body.messages:
        prompt_messages = body.messages
        max_tokens = 512
    elif body.prompt:
        prompt_messages = [{"role": "user", "content": body.prompt}]
        max_tokens = 512
    else:
        prompt_messages = [{"role": "user", "content": "Hi"}]
        max_tokens = 5

    started = _time.perf_counter()
    try:
        response = await client.generate(prompt_messages, max_tokens=max_tokens)
        latency_ms = round((_time.perf_counter() - started) * 1000, 2)
        used_model = response.model or client.model
        reply_text = str(response.text or "")
        logger.info(
            "raw_key_test_ok",
            provider=body.provider.upper(),
            model=used_model,
            latency_ms=latency_ms,
        )
        return KeyTestResponse(success=True, latency_ms=latency_ms, model=used_model, reply=reply_text)
    except Exception as exc:
        latency_ms = round((_time.perf_counter() - started) * 1000, 2)
        error_msg = str(exc)[:500]
        logger.warning(
            "raw_key_test_failed",
            provider=body.provider.upper(),
            error=error_msg,
            latency_ms=latency_ms,
        )
        return KeyTestResponse(success=False, latency_ms=latency_ms, model=client.model, error=error_msg, reply=None)


class KeyHealthRequest(BaseModel):
    keys: list[dict]


@router.post("/health", response_model=list[KeyTestResponse])
async def health_check_keys(
    body: KeyHealthRequest,
    admin: dict | None = Depends(verify_admin_jwt),
) -> list[KeyTestResponse]:
    """Batch health check for multiple raw API keys."""

    async def _test_one(entry: dict) -> KeyTestResponse:
        provider_type = str(entry.get("provider", "")).strip()
        api_key = str(entry.get("api_key", "")).strip()
        model = str(entry.get("model", "")).strip() or None
        if not provider_type or not api_key:
            return KeyTestResponse(success=False, latency_ms=0, model="", error="provider and api_key are required")
        try:
            client = _build_test_client(provider_type, api_key, model)
        except ValueError as exc:
            return KeyTestResponse(success=False, latency_ms=0, model="", error=str(exc))

        started = _time.perf_counter()
        try:
            response = await client.generate([{"role": "user", "content": "Hi"}], max_tokens=5)
            latency_ms = round((_time.perf_counter() - started) * 1000, 2)
            used_model = response.model or client.model
            return KeyTestResponse(success=True, latency_ms=latency_ms, model=used_model)
        except Exception as exc:
            latency_ms = round((_time.perf_counter() - started) * 1000, 2)
            error_msg = str(exc)[:500]
            return KeyTestResponse(success=False, latency_ms=latency_ms, model=client.model, error=error_msg)

    return list(await asyncio.gather(*[_test_one(entry) for entry in body.keys]))
