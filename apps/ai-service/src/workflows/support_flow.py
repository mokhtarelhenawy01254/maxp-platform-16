from __future__ import annotations

import asyncio
from typing import Any

import structlog
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.support import create_support_agent

logger = structlog.get_logger(__name__)


async def run_support(
    message: str,
    thread_id: str,
    company_id: str,
    customer_id: str,
    session: AsyncSession | None = None,
    agent_override: RawClaudeAgent | None = None,
) -> dict[str, Any]:
    """Run the support agent for a single customer message.

    Args:
        message: Customer message text
        thread_id: Conversation thread ID (companyId:customerId:channel)
        company_id: Tenant ID
        customer_id: Customer ID
        session: Optional DB session
        agent_override: Optional pre-configured agent (for testing)

    Returns:
        Dict with reply text, thread_id, and tool_results
    """
    agent = agent_override or await create_support_agent(company_id=company_id)

    # create_session is not always async in all agent implementations
    if asyncio.iscoroutinefunction(agent.create_session):
        agent_session = await agent.create_session(session_id=thread_id)
    else:
        agent_session = agent.create_session(session_id=thread_id)

    response = await agent.run(message, session=agent_session)

    return {
        "reply": str(response),
        "thread_id": thread_id,
        "tool_results": [],
    }
