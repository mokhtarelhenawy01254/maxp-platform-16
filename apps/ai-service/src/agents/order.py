from __future__ import annotations

from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.config import get_settings
from src.tools.registry import get_all_tools


def create_order_agent() -> RawClaudeAgent:
    """Create the Order specialized agent."""
    settings = get_settings()

    instructions = """You are a specialized order management agent for MaxP.
Your task is to help customers track their orders, modify order details, or cancel orders.

Rules:
1. Use order lookup tools to verify data before taking action.
2. Any modification or cancellation must go through the approval system (the tool will return 'awaiting_approval' status).
3. Reply in the customer's language naturally and professionally.
"""

    return RawClaudeAgent(
        name="maxp_order_agent",
        instructions=instructions,
        tools=get_all_tools(),
        default_options={"model": settings.default_model},
    )
