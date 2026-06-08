from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, cast, String
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
    ProviderPriorityUpdate,
    ProviderRead,
)
from src.db.models import (
    AiKey,
    GlobalAiConfig,
    Provider,
    ProviderLog,
)
from src.db.session import get_session

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
async def list_providers(session: SessionDep) -> list[ProviderRead]:
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
async def create_key(payload: AiKeyCreate, session: SessionDep) -> AiKeyRead:
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
async def get_key(key_id: str, session: SessionDep) -> AiKeyRead:
    key = await session.get(AiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return _to_read(key)


@router.patch("/keys/{key_id}", response_model=AiKeyRead)
async def update_key(
    key_id: str,
    payload: AiKeyUpdate,
    session: SessionDep,
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
async def delete_key(key_id: str, session: SessionDep) -> None:
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
async def test_key(key_id: str, session: SessionDep) -> AiKeyTestResult:
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
async def get_global_config(session: SessionDep) -> GlobalConfigRead:
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
async def get_dashboard(session: SessionDep) -> DashboardStats:
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


@router.get("/logs", response_model=list[LogEntry])
async def list_logs(
    session: SessionDep,
    provider: str | None = None,
    key_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[LogEntry]:
    stmt = select(ProviderLog).order_by(ProviderLog.created_at.desc())
    if provider:
        stmt = stmt.where(ProviderLog.provider == provider)
    if key_id:
        stmt = stmt.where(ProviderLog.key_id == key_id)
    if status:
        stmt = stmt.where(ProviderLog.status == status)
    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return [LogEntry.model_validate(r) for r in result.scalars().all()]
