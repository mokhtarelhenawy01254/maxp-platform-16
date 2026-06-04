from __future__ import annotations

import enum
from datetime import date

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.models.tool_call import ToolCall

logger = structlog.get_logger(__name__)

MODEL_COST_PER_1K: dict[str, dict[str, float]] = {
    "claude-sonnet-4-6": {"input": 0.003, "output": 0.015},
    "claude-haiku-3-5": {"input": 0.00025, "output": 0.00125},
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
}

DEFAULT_SOFT_CAP = 5.0
DEFAULT_HARD_CAP = 20.0


class CostTier(enum.Enum):
    OK = "ok"
    SOFT_CAP_WARNING = "soft_cap_warning"
    HARD_CAP_REACHED = "hard_cap_reached"


async def get_daily_cost(session: AsyncSession, company_id: str) -> float:
    today = date.today()
    stmt = (
        select(func.count(ToolCall.id))
        .where(
            ToolCall.company_id == company_id,
            func.date(ToolCall.created_at) == today,
        )
    )
    result = await session.execute(stmt)
    count = result.scalar() or 0

    est_input_tokens = count * 500
    est_output_tokens = count * 200

    settings = get_settings()
    model = settings.default_model

    costs = MODEL_COST_PER_1K.get(model, {"input": 0.003, "output": 0.015})
    cost = (est_input_tokens / 1000 * costs["input"]) + (est_output_tokens / 1000 * costs["output"])

    return round(cost, 4)


async def check_cost_limit(session: AsyncSession, company_id: str) -> CostTier:
    daily_cost = await get_daily_cost(session, company_id)
    settings = get_settings()

    soft_cap = getattr(settings, "cost_soft_cap", DEFAULT_SOFT_CAP)
    hard_cap = getattr(settings, "cost_hard_cap", DEFAULT_HARD_CAP)

    if daily_cost >= hard_cap:
        logger.warning("hard cap reached", company_id=company_id, daily_cost=daily_cost, hard_cap=hard_cap)
        return CostTier.HARD_CAP_REACHED

    if daily_cost >= soft_cap:
        logger.warning("soft cap warning", company_id=company_id, daily_cost=daily_cost, soft_cap=soft_cap)
        return CostTier.SOFT_CAP_WARNING

    return CostTier.OK
