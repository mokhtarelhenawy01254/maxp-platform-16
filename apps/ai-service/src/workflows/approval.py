from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository
from src.tools.maxp_client import get_maxp_client

logger = structlog.get_logger(__name__)


async def create_approval_draft(
    action_type: str,
    action_args: dict[str, Any],
    company_id: str,
    customer_id: str,
    thread_id: str,
    session: AsyncSession,
) -> dict[str, Any]:
    """Create an approval draft via MaxP API and record in ai.approvals.

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
    client = get_maxp_client()

    draft_result = await client.create_draft(
        company_id=company_id,
        action_type=action_type,
        action_args=action_args,
        thread_id=thread_id,
    )
    draft_id = draft_result.get("draftId") or draft_result.get("draft_id", "")

    if not draft_id:
        msg = f"Failed to create draft for {action_type}"
        raise RuntimeError(msg)

    repo = ApprovalRepository(session)
    await repo.create(
        company_id=company_id,
        thread_id=thread_id,
        draft_id=draft_id,
        action_type=action_type,
        action_args=action_args,
    )

    return {"draft_id": draft_id, "status": "pending"}


async def execute_approved_action(
    draft_id: str,
    session: AsyncSession,
) -> dict[str, Any]:
    """Execute an approved action via MaxP API.

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

    client = get_maxp_client()
    result = await client.call_tool(
        tool_name=approval.action_type,
        company_id=approval.company_id,
        input_data=approval.action_args,
        thread_id=str(approval.thread_id),
    )

    return result
