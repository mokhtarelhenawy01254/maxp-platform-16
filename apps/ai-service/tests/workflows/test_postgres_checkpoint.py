from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_framework import WorkflowCheckpoint

from src.workflows.postgres_checkpoint import PostgresCheckpointStorage


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.delete = AsyncMock()
    return session


def _mock_result(scalar_one_or_none_return):
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=scalar_one_or_none_return)
    return result


@pytest.fixture
def storage(mock_session):
    return PostgresCheckpointStorage(mock_session)


@pytest.mark.asyncio
async def test_save_new_checkpoint(storage, mock_session):
    mock_session.execute.return_value = _mock_result(None)

    cp = WorkflowCheckpoint(
        workflow_name="test_workflow",
        graph_signature_hash="abc123",
        checkpoint_id="cp-1",
    )

    result = await storage.save(cp)

    assert result == "cp-1"
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_existing_checkpoint(storage, mock_session):
    existing = MagicMock()
    mock_session.execute.return_value = _mock_result(existing)

    cp = WorkflowCheckpoint(
        workflow_name="test_workflow",
        graph_signature_hash="abc123",
        checkpoint_id="cp-1",
    )

    result = await storage.save(cp)

    assert result == "cp-1"
    mock_session.add.assert_not_called()
    mock_session.commit.assert_awaited_once()
    assert existing.state is not None


@pytest.mark.asyncio
async def test_delete_existing_checkpoint(storage, mock_session):
    existing = MagicMock()
    mock_session.execute.return_value = _mock_result(existing)
    mock_session.delete = AsyncMock()

    result = await storage.delete("cp-1")

    assert result is True
    mock_session.delete.assert_awaited_once_with(existing)
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_missing_checkpoint(storage, mock_session):
    mock_session.execute.return_value = _mock_result(None)

    result = await storage.delete("cp-1")

    assert result is False
    mock_session.delete.assert_not_called()
