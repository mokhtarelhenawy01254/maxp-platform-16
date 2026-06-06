from __future__ import annotations

import uuid

import structlog
from agent_framework import CheckpointStorage, WorkflowCheckpoint
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.checkpoint import Checkpoint as CheckpointModel

logger = structlog.get_logger(__name__)


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
        try:
            thread_uuid = uuid.UUID(str(thread_id))
        except ValueError:
            thread_uuid = uuid.UUID(int=0)

        if existing:
            existing.state = state_dict
        else:
            self._session.add(
                CheckpointModel(
                    checkpoint_id=checkpoint.checkpoint_id,
                    thread_id=thread_uuid,
                    state=state_dict,
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
        return WorkflowCheckpoint.from_dict(cp.state)

    async def get_latest(
        self,
        *,
        workflow_name: str,
        thread_id: str | None = None,
    ) -> WorkflowCheckpoint | None:
        stmt = select(CheckpointModel).order_by(CheckpointModel.created_at.desc())
        if thread_id:
            try:
                stmt = stmt.where(CheckpointModel.thread_id == uuid.UUID(str(thread_id)))
            except ValueError:
                return None
        result = await self._session.execute(stmt)
        for cp in result.scalars().all():
            checkpoint = WorkflowCheckpoint.from_dict(cp.state)
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
            WorkflowCheckpoint.from_dict(cp.state) for cp in result.scalars().all()
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
