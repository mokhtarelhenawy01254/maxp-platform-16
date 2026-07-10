from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.auth import verify_admin_jwt
from src.db.repo.guardrail_repo import GuardrailRepository
from src.db.session import get_session
from src.guardrails.translator import GuardrailTranslator
from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


class GuardrailRuleCreate(BaseModel):
    feedbackText: str = Field(..., min_length=1, description="Raw merchant feedback")
    companyId: str = Field(..., description="The merchant company ID")
    source: str = Field(default="merchant_manual", description="Source of the rule")


class GuardrailRuleUpdate(BaseModel):
    excuse: str | None = None
    rebuttal: str | None = None
    action: str | None = None
    isActive: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ConflictCheckRequest(BaseModel):
    feedbackText: str = Field(..., min_length=1, description="Raw merchant feedback to check")
    companyId: str = Field(..., description="The merchant company ID")


class GuardrailRuleResponse(BaseModel):
    id: str
    agentId: str = Field(..., alias="agentId")
    companyId: str = Field(..., alias="companyId")
    excuse: str
    rebuttal: str
    action: str
    source: str
    isActive: bool = Field(..., alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ConflictCheckResponse(BaseModel):
    conflictDetected: bool = Field(..., alias="conflictDetected")
    conflictingRule: dict | None = Field(default=None, alias="conflictingRule")

    model_config = ConfigDict(populate_by_name=True)


@router.get("/admin/agents/{agent_id}/guardrails", response_model=list[GuardrailRuleResponse])
async def list_guardrails(
    agent_id: str,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> list[GuardrailRuleResponse]:
    """List all active guardrail rules for the given agent."""
    repo = GuardrailRepository(session)
    rules = await repo.list_rules(agent_id, active_only=True)
    return [
        GuardrailRuleResponse(
            id=r.id,
            agentId=r.agent_id,
            companyId=r.company_id,
            excuse=r.excuse,
            rebuttal=r.rebuttal,
            action=r.action,
            source=r.source,
            isActive=r.is_active,
        )
        for r in rules
    ]


@router.post("/admin/agents/{agent_id}/guardrails", response_model=GuardrailRuleResponse)
async def create_guardrail(
    agent_id: str,
    body: GuardrailRuleCreate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> GuardrailRuleResponse:
    """Create a new guardrail rule from plain merchant feedback."""
    translator = GuardrailTranslator()
    
    # 1. Translate feedback into structured JSON
    translated = await translator.translate_feedback(body.feedbackText, body.companyId)
    
    # 2. Generate embedding vector for semantic search
    embedding = await translator.generate_embedding(translated["excuse"])
    
    # 3. Save to database
    repo = GuardrailRepository(session)
    rule_data = {
        "id": f"gr_{uuid.uuid4().hex[:22]}",
        "agent_id": agent_id,
        "company_id": body.companyId,
        "excuse": translated["excuse"],
        "rebuttal": translated["rebuttal"],
        "action": translated["action"],
        "source": body.source,
        "is_active": True,
        "embedding": embedding,
    }
    
    rule = await repo.create_rule(rule_data)
    await session.commit()
    
    # 4. Invalidate Redis cache
    if redis_client.available:
        await redis_client.delete(f"guardrails:{agent_id}")
        
    return GuardrailRuleResponse(
        id=rule.id,
        agentId=rule.agent_id,
        companyId=rule.company_id,
        excuse=rule.excuse,
        rebuttal=rule.rebuttal,
        action=rule.action,
        source=rule.source,
        isActive=rule.is_active,
    )


@router.put("/admin/agents/{agent_id}/guardrails/{rule_id}", response_model=GuardrailRuleResponse)
async def update_guardrail(
    agent_id: str,
    rule_id: str,
    body: GuardrailRuleUpdate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> GuardrailRuleResponse:
    """Update a specific guardrail rule."""
    repo = GuardrailRepository(session)
    rule = await repo.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Guardrail rule not found")
        
    update_data = {}
    if body.excuse is not None:
        update_data["excuse"] = body.excuse
        # Regenerate embedding if the excuse/trigger changes
        translator = GuardrailTranslator()
        update_data["embedding"] = await translator.generate_embedding(body.excuse)
        
    if body.rebuttal is not None:
        update_data["rebuttal"] = body.rebuttal
    if body.action is not None:
        update_data["action"] = body.action
    if body.isActive is not None:
        update_data["is_active"] = body.isActive
        
    updated_rule = await repo.update_rule(rule_id, update_data)
    await session.commit()
    
    # Invalidate Redis cache
    if redis_client.available:
        await redis_client.delete(f"guardrails:{agent_id}")
        
    return GuardrailRuleResponse(
        id=updated_rule.id,
        agentId=updated_rule.agent_id,
        companyId=updated_rule.company_id,
        excuse=updated_rule.excuse,
        rebuttal=updated_rule.rebuttal,
        action=updated_rule.action,
        source=updated_rule.source,
        isActive=updated_rule.is_active,
    )


@router.delete("/admin/agents/{agent_id}/guardrails/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guardrail(
    agent_id: str,
    rule_id: str,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> None:
    """Soft delete/deactivate a guardrail rule."""
    repo = GuardrailRepository(session)
    rule = await repo.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Guardrail rule not found")
        
    await repo.deactivate_rule(rule_id)
    await session.commit()
    
    # Invalidate Redis cache
    if redis_client.available:
        await redis_client.delete(f"guardrails:{agent_id}")


@router.post("/admin/agents/{agent_id}/guardrails/conflict-check", response_model=ConflictCheckResponse)
async def check_guardrail_conflict(
    agent_id: str,
    body: ConflictCheckRequest,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> ConflictCheckResponse:
    """Check if the proposed feedback conflicts with existing rules."""
    translator = GuardrailTranslator()
    
    # 1. Translate feedback
    translated = await translator.translate_feedback(body.feedbackText, body.companyId)
    
    # 2. Generate embedding for translation
    embedding = await translator.generate_embedding(translated["excuse"])
    if not embedding:
        return ConflictCheckResponse(conflictDetected=False, conflictingRule=None)
        
    # 3. Fetch existing rules
    repo = GuardrailRepository(session)
    db_rules = await repo.list_rules(agent_id, active_only=True)
    existing_rules = [
        {
            "id": r.id,
            "excuse": r.excuse,
            "rebuttal": r.rebuttal,
            "action": r.action,
            "embedding": r.embedding,
        }
        for r in db_rules
    ]
    
    # 4. Run semantic conflict check
    conflict = await translator.check_conflict(embedding, existing_rules, threshold=0.85)
    
    if conflict:
        return ConflictCheckResponse(
            conflictDetected=True,
            conflictingRule={
                "id": conflict["id"],
                "excuse": conflict["excuse"],
                "rebuttal": conflict["rebuttal"],
                "action": conflict["action"],
            }
        )
        
    return ConflictCheckResponse(conflictDetected=False, conflictingRule=None)
