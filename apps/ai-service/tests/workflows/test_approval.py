from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agent_framework import Content, WorkflowCheckpoint, WorkflowEvent
from sqlalchemy.ext.asyncio import AsyncSession

from src.workflows.approval import (
    create_approval_draft,
    create_sdk_approval_response,
    execute_approved_action,
    find_pending_sdk_approval_request_id,
    resume_sdk_approval_workflow,
)


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.mark.asyncio
async def test_create_approval_draft_success(mock_session):
    thread_uuid = uuid.uuid4()
    # 1st execute: get_by_request_key (no duplicate) → None.
    # 2nd execute: repo.create thread lookup → thread uuid.
    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=thread_uuid)),
    ]

    result = await create_approval_draft(
        action_type="discount.create",
        action_args={"percent": 15},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
        session=mock_session,
    )

    assert "draft_id" in result
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_create_approval_draft_is_idempotent_for_identical_pending_request(mock_session):
    from src.workflows.approval import _request_key

    existing = MagicMock()
    existing.status = "pending"
    existing.draft_id = "existing-draft"
    existing.id = "row-1"

    # 1st execute: get_by_request_key finds the identical pending draft.
    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=existing)),
    ]

    result = await create_approval_draft(
        action_type="discount.create",
        action_args={"percent": 15},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
        session=mock_session,
    )

    assert result == {"draft_id": "existing-draft", "status": "pending"}
    mock_session.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_approval_draft_stores_sdk_approval_metadata(mock_session):
    thread_uuid = uuid.uuid4()
    mock_session.execute.side_effect = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=thread_uuid)),
    ]

    await create_approval_draft(
        action_type="discount_create",
        action_args={"product_id": "prod_1"},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
        session=mock_session,
        sdk_approval_id="call-1",
    )

    approval = mock_session.add.call_args.args[0]
    assert approval.approval_metadata["sdk_approval_id"] == "call-1"


@pytest.mark.asyncio
async def test_create_sdk_approval_response_from_saved_approval(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.action_type = "discount_create"
    approval.action_args = {"product_id": "prod_1", "discount_percent": 10}
    approval.approval_metadata = {"sdk_approval_id": "call-1"}

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    response = await create_sdk_approval_response(
        draft_id="draft_123",
        approved=True,
        session=mock_session,
    )

    assert response.type == "function_approval_response"
    assert response.id == "call-1"
    assert response.approved is True
    assert response.function_call.name == "discount_create"
    assert response.function_call.arguments["product_id"] == "prod_1"


def test_find_pending_sdk_approval_request_id_matches_content_id():
    function_call = Content.from_function_call(
        call_id="call-1",
        name="discount.create",
        arguments={"percent": 10},
    )
    request = Content.from_function_approval_request(
        function_call=function_call,
        id="call-1",
    )
    checkpoint = WorkflowCheckpoint(
        workflow_name="maxp-orchestration-pipeline",
        graph_signature_hash="abc123",
        checkpoint_id="cp-1",
        pending_request_info_events={
            "req-1": WorkflowEvent.request_info(
                request_id="req-1",
                source_executor_id="agent",
                request_data=request,
                response_type=Content,
            )
        },
    )

    assert find_pending_sdk_approval_request_id(checkpoint, "call-1") == "req-1"


@pytest.mark.asyncio
async def test_resume_sdk_approval_workflow_runs_checkpoint_with_response(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.company_id = "comp1"
    approval.thread_id = "11111111-1111-1111-1111-111111111111"
    approval.action_type = "discount.create"
    approval.action_args = {"percent": 10}
    approval.approval_metadata = {"sdk_approval_id": "call-1"}

    function_call = Content.from_function_call(
        call_id="call-1",
        name="discount.create",
        arguments={"percent": 10},
    )
    request = Content.from_function_approval_request(
        function_call=function_call,
        id="call-1",
    )
    checkpoint = WorkflowCheckpoint(
        workflow_name="maxp-orchestration-pipeline",
        graph_signature_hash="abc123",
        checkpoint_id="cp-1",
        pending_request_info_events={
            "req-1": WorkflowEvent.request_info(
                request_id="req-1",
                source_executor_id="agent",
                request_data=request,
                response_type=Content,
            )
        },
    )

    final_ctx = MagicMock()
    final_ctx.final_reply = "done"

    with (
        patch("src.workflows.approval.ApprovalRepository") as repo_cls,
        patch("src.workflows.approval.PostgresCheckpointStorage") as storage_cls,
        patch("src.workflows.approval.execute_pipeline_workflow", new_callable=AsyncMock) as run_mock,
    ):
        repo_cls.return_value.get_by_draft_id = AsyncMock(return_value=approval)
        storage_cls.return_value.get_latest = AsyncMock(return_value=checkpoint)
        run_mock.return_value = final_ctx

        result = await resume_sdk_approval_workflow(
            draft_id="draft_123",
            approved=True,
            thread_id=str(approval.thread_id),
            customer_id="cust1",
            session=mock_session,
            is_merchant=False,
        )

    assert result is final_ctx
    run_mock.assert_awaited_once()
    kwargs = run_mock.await_args.kwargs
    assert kwargs["restore_checkpoint_id"] == "cp-1"
    assert set(kwargs["responses"]) == {"req-1"}


@pytest.mark.asyncio
async def test_execute_approved_action_success(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "approved"
    approval.company_id = "comp1"
    approval.action_type = "discount.create"
    approval.action_args = {"product_id": "prod_1", "discount_percent": 10, "reason": "test", "company_id": "comp1"}
    approval.thread_id = uuid.uuid4()

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    with patch("src.tools.registry.get_tool") as mock_get_tool:
        mock_tool = MagicMock()
        mock_tool.input_model = MagicMock(return_value=MagicMock())
        mock_tool.func = AsyncMock(
            return_value={"status": "awaiting_approval"}
        )
        mock_get_tool.return_value = mock_tool

        result = await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )

    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_execute_approved_action_resolves_dotted_action_name(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "approved"
    approval.company_id = "comp1"
    approval.action_type = "discount.create"
    approval.action_args = {
        "product_id": "prod_1",
        "discount_percent": 10,
        "reason": "test",
        "company_id": "comp1",
    }

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    with patch("src.tools.registry.get_tool") as mock_get_tool:
        mock_tool = MagicMock()
        mock_tool.input_model = MagicMock(return_value=MagicMock())
        mock_tool.func = AsyncMock(return_value={"status": "ok"})
        mock_get_tool.return_value = mock_tool

        result = await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )

    assert result["status"] == "ok"
    mock_get_tool.assert_called_once_with("discount_create")


@pytest.mark.asyncio
async def test_execute_approved_action_not_found(mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    with pytest.raises(ValueError, match="Approval not found"):
        await execute_approved_action(
            draft_id="nonexistent",
            session=mock_session,
        )


@pytest.mark.asyncio
async def test_execute_approved_action_not_approved(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "pending"

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    with pytest.raises(ValueError, match="not approved"):
        await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )
