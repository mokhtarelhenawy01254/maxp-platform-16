from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.approval import Approval
from src.db.models.thread import Thread

logger = structlog.get_logger(__name__)


class ApprovalRepository:
    """Repository for ai.approvals CRUD operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        company_id: str,
        thread_id: str,
        draft_id: str,
        action_type: str,
        action_args: dict[str, Any],
        request_key: str,
        channel: str = "chat",
        source: str = "system",
        side_effects: str = "write",
        approval_mode: str = "required",
        expires_at: datetime | None = None,
        input_snapshot: dict[str, Any] | None = None,
        preview_snapshot: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Approval:
        """Create a new pending approval record."""
        parts = thread_id.split(":", 2)
        customer_id = parts[1] if len(parts) > 1 else ""
        chan = parts[2] if len(parts) > 2 else "chat"

        stmt = select(Thread.id).where(
            Thread.company_id == company_id,
            Thread.customer_id == customer_id,
            Thread.channel == chan,
        )
        result = await self._session.execute(stmt)
        thread_uuid = result.scalar_one_or_none()

        if not thread_uuid:
            msg = f"Thread not found for company {company_id}, customer {customer_id}, channel {chan}"
            raise ValueError(msg)

        approval = Approval(
            company_id=company_id,
            thread_id=thread_uuid,
            draft_id=draft_id,
            request_key=request_key,
            action_type=action_type,
            action_args=action_args,
            status="pending",
            channel=channel,
            source=source,
            side_effects=side_effects,
            approval_mode=approval_mode,
            expires_at=expires_at,
            input_snapshot=input_snapshot,
            preview_snapshot=preview_snapshot,
            metadata=metadata,
        )
        self._session.add(approval)
        await self._session.commit()
        await self._session.refresh(approval)
        logger.info("approval created", draft_id=draft_id, action_type=action_type)
        return approval

    async def get_by_request_key(self, request_key: str) -> Approval | None:
        """Get an approval by its unique request key."""
        stmt = select(Approval).where(Approval.request_key == request_key)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_draft_id(self, draft_id: str) -> Approval | None:
        """Get an approval by its draft_id."""
        stmt = select(Approval).where(Approval.draft_id == draft_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_status(
        self,
        draft_id: str,
        status: str,
        decided_by: str | None = None,
    ) -> Approval | None:
        """Update approval status (approved/rejected)."""
        now = datetime.now(UTC)
        stmt = (
            update(Approval)
            .where(Approval.draft_id == draft_id)
            .values(status=status, decided_by=decided_by, decided_at=now)
            .returning(Approval)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        approval = result.scalar_one_or_none()
        if approval:
            logger.info("approval updated", draft_id=draft_id, status=status)
        return approval
