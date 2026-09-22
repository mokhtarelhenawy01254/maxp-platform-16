from __future__ import annotations

import hashlib
import json
from typing import Any

import structlog
from agent_framework import Content, WorkflowCheckpoint
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository
from src.pipeline.context import PipelineContext
from src.pipeline.sdk_workflow import execute_pipeline_workflow
from src.tools.names import canonical_tool_name
from src.workflows.postgres_checkpoint import PostgresCheckpointStorage

logger = structlog.get_logger(__name__)
PIPELINE_WORKFLOW_NAME = "maxp-orchestration-pipeline"


def _request_key(
    *,
    company_id: str,
    thread_id: str,
    action_type: str,
    action_args: dict[str, Any],
) -> str:
    payload = json.dumps(action_args, sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return f"{company_id}:{thread_id}:{action_type}:{digest}"


async def create_approval_draft(
    action_type: str,
    action_args: dict[str, Any],
    company_id: str,
    customer_id: str,
    thread_id: str,
    session: AsyncSession,
    sdk_approval_id: str | None = None,
    channel: str = "chat",
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
    request_key = _request_key(
        company_id=company_id,
        thread_id=thread_id,
        action_type=action_type,
        action_args=action_args,
    )

    # Idempotency: an identical pending request (same company/thread/action/args)
    # re-surfaces the existing draft instead of crashing on the unique key.
    existing = await repo.get_by_request_key(request_key)
    if existing is not None and str(existing.status or "") == "pending":
        return {"draft_id": str(existing.draft_id or existing.id or ""), "status": "pending"}
    if existing is not None:
        # Same action was already resolved (approved/rejected/executed) — the
        # merchant may legitimately ask again, so mint a fresh unique key.
        import uuid as _uuid

        request_key = f"{request_key}:{_uuid.uuid4().hex[:8]}"

    approval = await repo.create(
        company_id=company_id,
        thread_id=thread_id,
        draft_id=request_key,
        request_key=request_key,
        action_type=action_type,
        action_args=action_args,
        channel=channel,
        metadata={"sdk_approval_id": sdk_approval_id} if sdk_approval_id else None,
    )
    draft_id = str(approval.draft_id or approval.id or "")

    return {"draft_id": draft_id, "status": "pending"}


async def create_sdk_approval_response(
    draft_id: str,
    approved: bool,
    session: AsyncSession,
) -> Content:
    """Build an agent-framework approval response from a saved MaxP approval."""
    repo = ApprovalRepository(session)
    approval = await repo.get_by_draft_id(draft_id)

    if not approval:
        msg = f"Approval not found for draft {draft_id}"
        raise ValueError(msg)

    metadata = approval.approval_metadata or {}
    approval_id = metadata.get("sdk_approval_id") or approval.draft_id
    function_call = Content.from_function_call(
        call_id=str(approval_id),
        name=approval.action_type,
        arguments=approval.action_args,
    )
    return Content.from_function_approval_response(
        approved=approved,
        id=str(approval_id),
        function_call=function_call,
    )


def _content_ids(content: Any) -> set[str]:
    ids: set[str] = set()
    for attr in ("id", "call_id"):
        value = getattr(content, attr, None)
        if value:
            ids.add(str(value))

    function_call = getattr(content, "function_call", None)
    if function_call is not None:
        ids.update(_content_ids(function_call))

    additional = getattr(content, "additional_properties", None) or {}
    if isinstance(additional, dict):
        for key in ("request_id", "id", "call_id"):
            value = additional.get(key)
            if value:
                ids.add(str(value))

    return ids


def find_pending_sdk_approval_request_id(
    checkpoint: WorkflowCheckpoint,
    sdk_approval_id: str | None,
) -> str | None:
    """Map a MaxP saved SDK approval id to the SDK workflow request id."""
    if not sdk_approval_id:
        return None

    expected = str(sdk_approval_id)
    for request_id, event in checkpoint.pending_request_info_events.items():
        if str(request_id) == expected:
            return str(request_id)
        if expected in _content_ids(getattr(event, "data", None)):
            return str(request_id)
    return None


async def resume_sdk_approval_workflow(
    *,
    draft_id: str,
    approved: bool,
    thread_id: str,
    customer_id: str,
    session: AsyncSession,
    is_merchant: bool = False,
) -> PipelineContext | None:
    """Resume a paused SDK workflow from a saved approval, when SDK state exists."""
    repo = ApprovalRepository(session)
    approval = await repo.get_by_draft_id(draft_id)
    if not approval:
        return None

    metadata = approval.approval_metadata or {}
    sdk_approval_id = metadata.get("sdk_approval_id")
    if not sdk_approval_id:
        return None

    storage = PostgresCheckpointStorage(session)
    checkpoint = await storage.get_latest(
        workflow_name=PIPELINE_WORKFLOW_NAME,
        thread_id=thread_id,
    )
    if checkpoint is None:
        return None

    request_id = find_pending_sdk_approval_request_id(checkpoint, str(sdk_approval_id))
    if request_id is None:
        return None

    sdk_response = await create_sdk_approval_response(
        draft_id=draft_id,
        approved=approved,
        session=session,
    )

    from src.pipeline.stages.skills_pipeline import process_with_skills
    from src.pipeline.stages.validate_reply import validate_reply

    context = PipelineContext(
        message="",
        thread_id=thread_id,
        company_id=approval.company_id,
        customer_id=customer_id,
        channel="merchant" if is_merchant else "chat",
    )

    return await execute_pipeline_workflow(
        context,
        [
            process_with_skills,
            validate_reply,
        ],
        checkpoint_storage=storage,
        restore_checkpoint_id=checkpoint.checkpoint_id,
        responses={request_id: sdk_response},
    )


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

    # 1. Atomically try to transition from 'approved' to 'executing'
    approval = await repo.transition_status(
        draft_id=draft_id,
        current_status="approved",
        next_status="executing"
    )
    if approval:
        transitioned_status = getattr(approval, "status", "executing")
        if transitioned_status == "approved":
            approval.status = "executing"
        elif transitioned_status != "executing":
            approval = None

    if not approval:
        # If it failed, it means it's either not 'approved' or already being executed/completed
        actual_approval = await repo.get_by_draft_id(draft_id)
        if not actual_approval:
             msg = f"Approval not found for draft {draft_id}"
             raise ValueError(msg)

        msg = f"Approval {draft_id} is not approved (current: {actual_approval.status})"
        raise ValueError(msg)

    from src.tools.registry import get_tool

    tool = get_tool(canonical_tool_name(approval.action_type))
    if not tool:
        # Transition back to approved if tool not found so it's not stuck in 'executing'
        await repo.update_status(draft_id, status="approved")
        msg = f"No Python tool handler found for {approval.action_type}"
        raise ValueError(msg)

    try:
        input_obj = tool.input_model(**approval.action_args)
        result = await tool.func(input_obj)

        # 2. Successfully completed
        await repo.update_status(draft_id, status="completed")
        return result
    except Exception as e:
        # 3. Failed execution
        await repo.update_status(draft_id, status="failed")
        logger.error("tool execution failed", draft_id=draft_id, error=str(e))
        raise e
