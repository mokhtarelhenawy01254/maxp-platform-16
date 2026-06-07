from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.intents_schemas import (
    IntentDefinitionCreate,
    IntentDefinitionResponse,
    IntentDefinitionUpdate,
)
from src.db.models.intent import IntentDefinition
from src.db.session import get_session
from src.intent.dynamic_registry import dynamic_intent_registry

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/intents", tags=["intents"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _intent_to_response(intent: IntentDefinition) -> IntentDefinitionResponse:
    return IntentDefinitionResponse(
        id=intent.id,
        intent=intent.intent,
        action_type=intent.action_type,
        risk_level=intent.risk_level,
        next_state=intent.next_state,
        required_slots=intent.required_slots or [],
        guardrails=intent.guardrails or [],
        primary_tool=intent.primary_tool,
        allowed_tools=intent.allowed_tools or [],
        created_at=intent.created_at,
        updated_at=intent.updated_at,
    )


def _audit_log(action: str, intent_slug: str, *, old: dict | None = None, new: dict | None = None) -> None:
    """Structured audit log for intent CRUD changes."""
    logger.info(
        "intent_audit",
        action=action,
        intent=intent_slug,
        old_value=old,
        new_value=new,
    )


# ─── CRUD Endpoints ──────────────────────────────────────────────


@router.post("", response_model=IntentDefinitionResponse, status_code=201)
async def create_intent(body: IntentDefinitionCreate, session: SessionDep) -> IntentDefinitionResponse:
    """Create a new intent definition."""
    # Check for duplicates
    existing = await session.execute(
        select(IntentDefinition).where(IntentDefinition.intent == body.intent)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Intent '{body.intent}' already exists",
        )

    intent = IntentDefinition(
        id=str(uuid.uuid4()),
        intent=body.intent,
        action_type=body.action_type,
        risk_level=body.risk_level,
        next_state=body.next_state,
        required_slots=body.required_slots,
        guardrails=body.guardrails,
        primary_tool=body.primary_tool,
        allowed_tools=body.allowed_tools,
    )
    session.add(intent)
    await session.commit()
    await session.refresh(intent)

    # Invalidate registry cache so new intent is picked up
    await dynamic_intent_registry.load_intents(session, force_reload=True)

    _audit_log("CREATE", body.intent, new=body.model_dump())
    return _intent_to_response(intent)


@router.get("", response_model=list[IntentDefinitionResponse])
async def list_intents(
    session: SessionDep,
    risk_level: str | None = Query(default=None),
    action_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[IntentDefinitionResponse]:
    """List all intent definitions, optionally filtered."""
    stmt = select(IntentDefinition).order_by(IntentDefinition.intent)

    if risk_level:
        stmt = stmt.where(IntentDefinition.risk_level == risk_level.lower())
    if action_type:
        stmt = stmt.where(IntentDefinition.action_type == action_type.lower())

    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return [_intent_to_response(i) for i in result.scalars().all()]


@router.get("/{intent_slug}", response_model=IntentDefinitionResponse)
async def get_intent(intent_slug: str, session: SessionDep) -> IntentDefinitionResponse:
    """Get a specific intent definition by slug."""
    result = await session.execute(
        select(IntentDefinition).where(IntentDefinition.intent == intent_slug)
    )
    intent = result.scalar_one_or_none()
    if not intent:
        raise HTTPException(status_code=404, detail=f"Intent not found: {intent_slug}")
    return _intent_to_response(intent)


@router.patch("/{intent_slug}", response_model=IntentDefinitionResponse)
async def update_intent(
    intent_slug: str, body: IntentDefinitionUpdate, session: SessionDep
) -> IntentDefinitionResponse:
    """Partially update an intent definition."""
    result = await session.execute(
        select(IntentDefinition).where(IntentDefinition.intent == intent_slug)
    )
    intent = result.scalar_one_or_none()
    if not intent:
        raise HTTPException(status_code=404, detail=f"Intent not found: {intent_slug}")

    # Capture old state for audit
    old_state = {
        "action_type": intent.action_type,
        "risk_level": intent.risk_level,
        "next_state": intent.next_state,
        "required_slots": intent.required_slots,
        "guardrails": intent.guardrails,
        "primary_tool": intent.primary_tool,
        "allowed_tools": intent.allowed_tools,
    }

    # Apply partial updates
    update_data = body.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(intent, field_name, value)

    await session.commit()
    await session.refresh(intent)

    # Invalidate registry cache
    await dynamic_intent_registry.load_intents(session, force_reload=True)

    _audit_log("UPDATE", intent_slug, old=old_state, new=update_data)
    return _intent_to_response(intent)


@router.delete("/{intent_slug}", status_code=200)
async def delete_intent(intent_slug: str, session: SessionDep) -> dict:
    """Delete an intent definition."""
    result = await session.execute(
        select(IntentDefinition).where(IntentDefinition.intent == intent_slug)
    )
    intent = result.scalar_one_or_none()
    if not intent:
        raise HTTPException(status_code=404, detail=f"Intent not found: {intent_slug}")

    # Prevent deleting the general.chat fallback
    if intent_slug == "general.chat":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the 'general.chat' fallback intent",
        )

    old_state = {
        "intent": intent.intent,
        "action_type": intent.action_type,
        "risk_level": intent.risk_level,
    }

    await session.delete(intent)
    await session.commit()

    # Invalidate registry cache
    await dynamic_intent_registry.load_intents(session, force_reload=True)

    _audit_log("DELETE", intent_slug, old=old_state)
    return {"deleted": intent_slug}


# ─── Cache Management ────────────────────────────────────────────


@router.post("/cache/reload")
async def reload_intent_cache(session: SessionDep) -> dict:
    """Force-reload the intent registry cache from database."""
    await dynamic_intent_registry.load_intents(session, force_reload=True)
    count = len(dynamic_intent_registry.get_intent_enum())
    logger.info("intent_cache_force_reloaded", intent_count=count)
    return {"reloaded": True, "intent_count": count}
