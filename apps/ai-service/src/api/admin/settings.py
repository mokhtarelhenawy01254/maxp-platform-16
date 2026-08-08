from __future__ import annotations

import json
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.ai_setting import AiSetting
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]

DEFAULT_CHANNELS = ["MESSENGER", "WHATSAPP", "INSTAGRAM", "TELEGRAM", "DASHBOARD"]

CHANNEL_KEY_MAP = {
    "facebook": "MESSENGER",
    "facebook_messenger": "MESSENGER",
    "messenger": "MESSENGER",
    "whatsapp": "WHATSAPP",
    "instagram": "INSTAGRAM",
    "telegram": "TELEGRAM",
    "chat": "DASHBOARD",
    "dashboard": "DASHBOARD",
    "merchant": "DASHBOARD",
}


def normalize_channel_key(channel: str | None) -> str:
    """Map a runtime channel value to the routing config key."""
    key = str(channel or "").strip().lower()
    return CHANNEL_KEY_MAP.get(key, key.upper())


async def _get_or_create_setting(company_id: str, session: AsyncSession) -> AiSetting:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = AiSetting(company_id=company_id, autoReplyEnabled=True)
        session.add(setting)
        await session.commit()
        await session.refresh(setting)
    return setting


def _parse_channel_map(raw: str | None) -> dict[str, bool]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {str(k).upper(): bool(v) for k, v in data.items()}
    except (json.JSONDecodeError, TypeError):
        pass
    return {}


def _channel_reply_state(setting: AiSetting | None) -> dict[str, bool]:
    parsed = _parse_channel_map(setting.channelReplyEnabled if setting else None)
    return {ch: parsed.get(ch, True) for ch in DEFAULT_CHANNELS}


async def _get_setting_row(company_id: str, session: AsyncSession) -> AiSetting | None:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    return result.scalar_one_or_none()


async def is_channel_reply_enabled(
    company_id: str, channel: str, session: AsyncSession
) -> bool:
    """True when the AI is allowed to auto-reply on this channel for the company.

    Defaults to enabled so existing behaviour is preserved. The global
    ``autoReplyEnabled`` master switch gates everything; an explicit
    ``channelReplyEnabled`` map entry of ``false`` disables that channel.
    """
    row = await _get_setting_row(company_id, session)
    if row is None:
        return True
    if not row.autoReplyEnabled:
        return False
    parsed = _parse_channel_map(row.channelReplyEnabled)
    key = normalize_channel_key(channel)
    return parsed.get(key, True)


# ── Guardrails ──────────────────────────────────────────────────────────


@router.get("/settings/guardrails")
async def get_guardrails(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        return {
            "modelSettings": {},
            "writeToolScopes": {},
            "humanApprovalRequiredForWrite": True,
            "maxRepliesPerCustomer": 5,
        }
    model_settings = {}
    if row.modelSettings:
        try:
            model_settings = json.loads(row.modelSettings)
        except (json.JSONDecodeError, TypeError):
            pass
    write_tool_scopes = {}
    if row.writeToolScopes:
        try:
            write_tool_scopes = json.loads(row.writeToolScopes)
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "modelSettings": model_settings,
        "writeToolScopes": write_tool_scopes,
        "humanApprovalRequiredForWrite": row.humanApprovalRequiredForWrite,
        "maxRepliesPerCustomer": row.maxRepliesPerCustomer,
    }


@router.put("/settings/guardrails")
async def update_guardrails(
    company_id: str = Query(...),
    body: dict[str, Any] = None,
    session: SessionDep = None,
) -> dict[str, Any]:
    setting = await _get_or_create_setting(company_id, session)
    if "modelSettings" in body:
        setting.modelSettings = json.dumps(body["modelSettings"], ensure_ascii=False)
    if "writeToolScopes" in body:
        setting.writeToolScopes = json.dumps(body["writeToolScopes"], ensure_ascii=False)
    if "humanApprovalRequiredForWrite" in body:
        setting.humanApprovalRequiredForWrite = body["humanApprovalRequiredForWrite"]
    if "maxRepliesPerCustomer" in body:
        setting.maxRepliesPerCustomer = body["maxRepliesPerCustomer"]
    await session.commit()
    await session.refresh(setting)
    return {"success": True}


# ── Auto-Reply ──────────────────────────────────────────────────────────


@router.get("/settings/auto-reply")
async def get_auto_reply(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    row = result.scalar_one_or_none()
    return {"autoReplyEnabled": row.autoReplyEnabled if row else True}


@router.put("/settings/auto-reply")
async def update_auto_reply(
    company_id: str = Query(...),
    body: dict[str, Any] = None,
    session: SessionDep = None,
) -> dict[str, Any]:
    setting = await _get_or_create_setting(company_id, session)
    setting.autoReplyEnabled = bool(body.get("autoReplyEnabled", True))
    await session.commit()
    return {"success": True}


# ── Per-channel reply toggle ────────────────────────────────────────────


@router.get("/settings/channel-reply")
async def get_channel_reply(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    row = await _get_setting_row(company_id, session)
    return {"success": True, "channels": _channel_reply_state(row)}


@router.put("/settings/channel-reply")
async def update_channel_reply(
    company_id: str = Query(...),
    body: dict[str, Any] = None,
    session: SessionDep = None,
) -> dict[str, Any]:
    setting = await _get_or_create_setting(company_id, session)
    channels = (body or {}).get("channels") or {}
    if not isinstance(channels, dict):
        raise HTTPException(status_code=400, detail="channels must be an object")
    sanitized: dict[str, bool] = {}
    for key in DEFAULT_CHANNELS:
        val = channels.get(key, True)
        sanitized[key] = bool(val) if isinstance(val, bool) else True
    setting.channelReplyEnabled = json.dumps(sanitized, ensure_ascii=False)
    await session.commit()
    return {"success": True, "channels": sanitized}


# ── Comment Filters ─────────────────────────────────────────────────────


@router.get("/settings/filters")
async def get_filters(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        return {"autoFilterEnabled": False, "negativeKeywords": "", "negativeCommentAction": "hide"}
    return {
        "autoFilterEnabled": row.autoFilterEnabled,
        "negativeKeywords": row.negativeKeywords or "",
        "negativeCommentAction": row.negativeCommentAction,
    }


@router.put("/settings/filters")
async def update_filters(
    company_id: str = Query(...),
    body: dict[str, Any] = None,
    session: SessionDep = None,
) -> dict[str, Any]:
    setting = await _get_or_create_setting(company_id, session)
    if "autoFilterEnabled" in body:
        setting.autoFilterEnabled = bool(body["autoFilterEnabled"])
    if "negativeKeywords" in body:
        setting.negativeKeywords = str(body["negativeKeywords"])
    if "negativeCommentAction" in body:
        setting.negativeCommentAction = str(body["negativeCommentAction"])
    await session.commit()
    return {"success": True}
