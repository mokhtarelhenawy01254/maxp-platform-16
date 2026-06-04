from __future__ import annotations

from typing import Any
import uuid
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.checkpoint import Checkpoint

class RunStateManager:
    """
    Manages the persistence of agent execution states using the Checkpoint model.
    Allows agents to resume from the last known good state.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_state(self, thread_id: str | uuid.UUID, state_id: str, state: dict[str, Any]) -> str:
        """
        Persists the current agent state. 
        Returns the state_id of the saved checkpoint.
        """
        # Normalize thread_id to UUID
        t_id = uuid.UUID(str(thread_id)) if isinstance(thread_id, str) else thread_id
        
        checkpoint = Checkpoint(
            thread_id=t_id,
            checkpoint_id=state_id,
            state=state
        )
        
        # Use merge to update if state_id already exists for this thread
        await self.session.merge(checkpoint)
        await self.session.commit()
        return state_id

    async def load_state(self, thread_id: str | uuid.UUID, state_id: str) -> dict[str, Any] | None:
        """Loads a specific state by its ID."""
        t_id = uuid.UUID(str(thread_id)) if isinstance(thread_id, str) else thread_id
        
        stmt = select(Checkpoint).where(
            Checkpoint.thread_id == t_id,
            Checkpoint.checkpoint_id == state_id
        )
        result = await self.session.execute(stmt)
        checkpoint = result.scalar_one_or_none()
        
        return checkpoint.state if checkpoint else None

    async def get_latest_state(self, thread_id: str | uuid.UUID) -> tuple[str, dict[str, Any]] | None:
        """Retrieves the most recent checkpoint for the given thread."""
        t_id = uuid.UUID(str(thread_id)) if isinstance(thread_id, str) else thread_id
        
        stmt = select(Checkpoint).where(
            Checkpoint.thread_id == t_id
        ).order_by(desc(Checkpoint.created_at))
        
        result = await self.session.execute(stmt)
        checkpoint = result.scalar_one_or_none()
        
        if checkpoint:
            return checkpoint.checkpoint_id, checkpoint.state
        return None
