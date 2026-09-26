from __future__ import annotations

import uuid

import structlog
from agent_framework import CheckpointStorage, WorkflowCheckpoint
from agent_framework._workflows._checkpoint_encoding import (  # type: ignore[import-not-found]
    decode_checkpoint_value,
    encode_checkpoint_value,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.checkpoint import Checkpoint as CheckpointModel

logger = structlog.get_logger(__name__)


_MAXP_NAMESPACE = uuid.UUID("e4b0113c-411a-4d24-912f-6825a0720448")

def _safe_thread_uuid(thread_id: str | uuid.UUID | None) -> uuid.UUID:
    if not thread_id:
        return uuid.UUID(int=0)
    if isinstance(thread_id, uuid.UUID):
        return thread_id
    try:
        return uuid.UUID(str(thread_id))
    except ValueError:
        return uuid.uuid5(_MAXP_NAMESPACE, str(thread_id))


class PostgresCheckpointStorage(CheckpointStorage):
    """Checkpoint storage backed by PostgreSQL ai.checkpoints table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, checkpoint: WorkflowCheckpoint) -> str:
        stmt = select(CheckpointModel).where(
            CheckpointModel.checkpoint_id == checkpoint.checkpoint_id,
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()

        state_dict = checkpoint.to_dict()
        workflow_state = state_dict.get("state") or {}
        thread_id = workflow_state.get("thread_id") or "unknown"
        thread_uuid = _safe_thread_uuid(thread_id)
        encoded_state = encode_checkpoint_value(state_dict)

        if existing:
            existing.state = encoded_state
        else:
            self._session.add(
                CheckpointModel(
                    checkpoint_id=checkpoint.checkpoint_id,
                    thread_id=thread_uuid,
                    state=encoded_state,
                )
            )
        await self._session.commit()
        logger.debug("checkpoint saved", checkpoint_id=checkpoint.checkpoint_id)
        return checkpoint.checkpoint_id

    async def load(self, checkpoint_id: str) -> WorkflowCheckpoint:
        stmt = select(CheckpointModel).where(
            CheckpointModel.checkpoint_id == checkpoint_id,
        )
        result = await self._session.execute(stmt)
        cp = result.scalar_one_or_none()
        if cp is None:
            from agent_framework import WorkflowCheckpointException

            raise WorkflowCheckpointException(f"Checkpoint {checkpoint_id} not found")
        return WorkflowCheckpoint.from_dict(decode_checkpoint_value(cp.state))

    async def get_latest(
        self,
        *,
        workflow_name: str,
        thread_id: str | None = None,
    ) -> WorkflowCheckpoint | None:
        stmt = select(CheckpointModel).order_by(CheckpointModel.created_at.desc())
        if thread_id:
            stmt = stmt.where(CheckpointModel.thread_id == _safe_thread_uuid(thread_id))
        result = await self._session.execute(stmt)
        for cp in result.scalars().all():
            checkpoint = WorkflowCheckpoint.from_dict(decode_checkpoint_value(cp.state))
            if checkpoint.workflow_name == workflow_name:
                return checkpoint
        return None

    async def list_checkpoint_ids(self, *, workflow_name: str) -> list[str]:
        stmt = select(CheckpointModel.checkpoint_id)
        result = await self._session.execute(stmt)
        return [row[0] for row in result.all()]

    async def list_checkpoints(self, *, workflow_name: str) -> list[WorkflowCheckpoint]:
        stmt = select(CheckpointModel).order_by(CheckpointModel.created_at)
        result = await self._session.execute(stmt)
        return [
            WorkflowCheckpoint.from_dict(decode_checkpoint_value(cp.state))
            for cp in result.scalars().all()
        ]

    async def delete(self, checkpoint_id: str) -> bool:
        stmt = select(CheckpointModel).where(
            CheckpointModel.checkpoint_id == checkpoint_id,
        )
        result = await self._session.execute(stmt)
        cp = result.scalar_one_or_none()
        if cp:
            await self._session.delete(cp)
            await self._session.commit()
            logger.debug("checkpoint deleted", checkpoint_id=checkpoint_id)
            return True
        return False
