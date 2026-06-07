"""
@module api.billing
@description Billing API endpoints for provider budget ledger operations.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.billing.ledger import budget_ledger

router = APIRouter(prefix="/billing", tags=["billing"])


class SelectionInput(BaseModel):
    provider: str | None = None
    activeProvider: str | None = None
    modelName: str | None = None
    model: str | None = None
    modelId: str | None = None
    id: str | None = None
    keyId: str | None = None
    apiKeyId: str | None = None
    companyId: str | None = None
    limits: dict[str, Any] | None = None
    rateLimits: dict[str, Any] | None = None
    routingLimits: dict[str, Any] | None = None
    providerBudget: dict[str, Any] | None = None
    providerBudgetLimits: dict[str, Any] | None = None
    budgetLimits: dict[str, Any] | None = None
    quota: dict[str, Any] | None = None
    maxRequestsPerDay: int | None = None
    usage: Any = None
    modelUsage: Any = None
    configuredModel: dict[str, Any] | None = None


class OptionsInput(BaseModel):
    companyId: str | None = None
    now: int | None = None
    estimatedTokens: int | None = None
    reservedTokens: Any = None
    requestAlreadyRecorded: bool | None = None
    provider: str | None = None
    model: str | None = None
    retryAfterMs: int | None = None
    reason: str | None = None
    budgetReservation: dict[str, Any] | None = None


class IncrementInput(BaseModel):
    requests: int = 0
    tokens: int = 0


class CanRouteRequest(BaseModel):
    selection: SelectionInput | None = None
    options: OptionsInput | None = None


class BudgetSnapshotRequest(BaseModel):
    selection: SelectionInput | None = None
    options: OptionsInput | None = None


class IncrementUsageRequest(BaseModel):
    selection: SelectionInput | None = None
    increments: IncrementInput | None = None
    options: OptionsInput | None = None


class RecordAttemptRequest(BaseModel):
    selection: SelectionInput | None = None
    context: OptionsInput | None = None


class RecordUsageRequest(BaseModel):
    selection: SelectionInput | None = None
    context: OptionsInput | None = None


class RecordPenaltyRequest(BaseModel):
    selection: SelectionInput | None = None
    context: OptionsInput | None = None


def _status_to_dict(status) -> dict[str, Any]:
    return {
        "allowed": status.allowed,
        "limited": status.limited,
        "reason": status.reason,
        "limits": status.limits,
        "usage": status.usage,
        "budgetKey": status.budget_key,
        "resetAt": status.reset_at,
        "retryAfterSeconds": status.retry_after_seconds,
        "companyId": status.company_id,
        "error": status.error,
        "estimatedTokens": status.estimated_tokens,
        "penaltyReason": status.penalty_reason,
        "penaltyScore": status.penalty_score,
    }


def _selection_to_dict(sel: SelectionInput | None) -> dict[str, Any] | None:
    if sel is None:
        return None
    return {k: v for k, v in sel.model_dump().items() if v is not None}


def _options_to_dict(opts: OptionsInput | None) -> dict[str, Any] | None:
    if opts is None:
        return None
    return {k: v for k, v in opts.model_dump().items() if v is not None}


@router.post("/can-route")
async def can_route(req: CanRouteRequest) -> dict[str, Any]:
    """
    Check if a request can be routed based on budget limits.
    Returns allowed status with limits and current usage.
    """
    selection_dict = _selection_to_dict(req.selection)
    options_dict = _options_to_dict(req.options)
    status = await budget_ledger.can_route(selection_dict, options_dict)
    return _status_to_dict(status)


@router.post("/snapshot")
async def get_budget_snapshot(req: BudgetSnapshotRequest) -> dict[str, Any]:
    """
    Get a full budget snapshot including usage, limits, and penalty state.
    """
    selection_dict = _selection_to_dict(req.selection)
    options_dict = _options_to_dict(req.options)
    snapshot = await budget_ledger.get_budget_snapshot(selection_dict, options_dict)
    return {
        "limited": snapshot.limited,
        "allowed": snapshot.allowed,
        "reason": snapshot.reason,
        "retryAfterSeconds": snapshot.retry_after_seconds,
        "limits": snapshot.limits,
        "usage": snapshot.usage,
        "penalty": snapshot.penalty,
        "budgetKey": snapshot.budget_key,
    }


@router.post("/increment")
async def increment_usage(req: IncrementUsageRequest) -> dict[str, Any]:
    """
    Record usage increments for a provider.
    """
    selection_dict = _selection_to_dict(req.selection)
    options_dict = _options_to_dict(req.options)
    increments = req.increments.model_dump() if req.increments else {"requests": 0, "tokens": 0}
    result = await budget_ledger.increment_usage(selection_dict, increments, options_dict)
    return {
        "recorded": result.recorded,
        "limits": result.limits,
        "usage": result.usage,
        "budgetKey": result.budget_key,
        "tokens": result.tokens,
        "requests": result.requests,
        "reason": result.reason,
    }


@router.post("/attempt")
async def record_attempt(req: RecordAttemptRequest) -> dict[str, Any]:
    """
    Record an attempt (request + estimated tokens).
    """
    selection_dict = _selection_to_dict(req.selection)
    context_dict = _options_to_dict(req.context)
    result = await budget_ledger.record_attempt(selection_dict, context_dict)
    return {
        "recorded": result.recorded,
        "limits": result.limits,
        "usage": result.usage,
        "budgetKey": result.budget_key,
        "tokens": result.tokens,
        "requests": result.requests,
        "reason": result.reason,
    }


@router.post("/usage")
async def record_usage(req: RecordUsageRequest) -> dict[str, Any]:
    """
    Record actual usage from response (handles reserved tokens).
    """
    selection_dict = _selection_to_dict(req.selection)
    context_dict = _options_to_dict(req.context)
    result = await budget_ledger.record_usage(selection_dict, context_dict)
    return {
        "recorded": result.recorded,
        "limits": result.limits,
        "usage": result.usage,
        "budgetKey": result.budget_key,
        "tokens": result.tokens,
        "requests": result.requests,
        "reason": result.reason,
    }


@router.post("/penalty")
async def record_penalty(req: RecordPenaltyRequest) -> dict[str, Any]:
    """
    Record a penalty (rate limit violation).
    """
    selection_dict = _selection_to_dict(req.selection)
    context_dict = _options_to_dict(req.context)
    result = await budget_ledger.record_penalty(selection_dict, context_dict)
    return result


@router.get("/company/{company_id}/limits")
async def get_company_limits(company_id: str) -> dict[str, Any]:
    """
    Get company-specific budget limits from database.
    """
    limits = await budget_ledger.get_company_limits(company_id)
    return {
        "dailyTokenLimit": limits.daily_token_limit,
        "dailyCostLimit": limits.daily_cost_limit,
    }