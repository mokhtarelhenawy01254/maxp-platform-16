from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository

logger = structlog.get_logger(__name__)


async def create_approval_draft(
    action_type: str,
    action_args: dict[str, Any],
    company_id: str,
    customer_id: str,
    thread_id: str,
    session: AsyncSession,
) -> dict[str, Any]:
    """Create an approval draft in ai.approvals directly.

    Args:
        action_type: e.g. 'discount.create', 'order.cancel'
        action_args: arguments for the action
        company_id: tenant ID
        customer_id: customer ID
        thread_id: conversation thread ID
        session: DB session

    Returns:
        Dict with draft_id and status
    """
    repo = ApprovalRepository(session)
    approval = await repo.create(
        company_id=company_id,
        thread_id=thread_id,
        draft_id="",  # repo generates its own draft_id
        action_type=action_type,
        action_args=action_args,
    )
    draft_id = str(approval.id) if approval.id else ""

    return {"draft_id": draft_id, "status": "pending"}


async def execute_approved_action(
    draft_id: str,
    session: AsyncSession,
) -> dict[str, Any]:
    """Execute an approved action via the Python tool registry directly.

    Args:
        draft_id: The draft ID to execute
        session: DB session

    Returns:
        Execution result
    """
    repo = ApprovalRepository(session)
    approval = await repo.get_by_draft_id(draft_id)

    if not approval:
        msg = f"Approval not found for draft {draft_id}"
        raise ValueError(msg)

    if approval.status != "approved":
        msg = f"Approval {draft_id} is not approved (status: {approval.status})"
        raise ValueError(msg)

    from src.tools.registry import get_tool

    tool = get_tool(approval.action_type)
    if not tool:
        msg = f"No Python tool handler found for {approval.action_type}"
        raise ValueError(msg)

    input_obj = tool.params_schema(**approval.action_args)
    result = await tool.action(input_obj)

    return result
