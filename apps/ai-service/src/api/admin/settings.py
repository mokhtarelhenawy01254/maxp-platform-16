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


async def _get_or_create_setting(company_id: str, session: AsyncSession) -> AiSetting:
    result = await session.execute(
        select(AiSetting).where(AiSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = AiSetting(company_id=company_id)
        session.add(setting)
        await session.commit()
        await session.refresh(setting)
    return setting


# ── Guardrails ──────────────────────────────────────────────────────────


@router.get("/settings/guardrails")
async def get_guardrails(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    result = await session.execute(
        text("""
            SELECT model_settings, write_tool_scopes,
                   human_approval_required_for_write, max_replies_per_customer
            FROM ai.ai_settings WHERE company_id = :cid
        """),
        {"cid": company_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return {
            "modelSettings": {},
            "writeToolScopes": {},
            "humanApprovalRequiredForWrite": True,
            "maxRepliesPerCustomer": 5,
        }
    model_settings = {}
    if row["model_settings"]:
        try:
            model_settings = json.loads(row["model_settings"])
        except (json.JSONDecodeError, TypeError):
            pass
    write_tool_scopes = {}
    if row["write_tool_scopes"]:
        try:
            write_tool_scopes = json.loads(row["write_tool_scopes"])
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "modelSettings": model_settings,
        "writeToolScopes": write_tool_scopes,
        "humanApprovalRequiredForWrite": row["human_approval_required_for_write"],
        "maxRepliesPerCustomer": row["max_replies_per_customer"],
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
        text("SELECT auto_reply_enabled FROM ai.ai_settings WHERE company_id = :cid"),
        {"cid": company_id},
    )
    row = result.mappings().one_or_none()
    return {"autoReplyEnabled": row["auto_reply_enabled"] if row else False}


@router.put("/settings/auto-reply")
async def update_auto_reply(
    company_id: str = Query(...),
    body: dict[str, Any] = None,
    session: SessionDep = None,
) -> dict[str, Any]:
    setting = await _get_or_create_setting(company_id, session)
    setting.autoReplyEnabled = bool(body.get("autoReplyEnabled", False))
    await session.commit()
    return {"success": True}


# ── Comment Filters ─────────────────────────────────────────────────────


@router.get("/settings/filters")
async def get_filters(
    company_id: str = Query(...),
    session: SessionDep = None,
) -> dict[str, Any]:
    result = await session.execute(
        text("""
            SELECT auto_filter_enabled, negative_keywords, negative_comment_action
            FROM ai.ai_settings WHERE company_id = :cid
        """),
        {"cid": company_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return {"autoFilterEnabled": False, "negativeKeywords": "", "negativeCommentAction": "hide"}
    return {
        "autoFilterEnabled": row["auto_filter_enabled"],
        "negativeKeywords": row["negative_keywords"] or "",
        "negativeCommentAction": row["negative_comment_action"],
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
