from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.approval import Approval
from src.db.models.thread import Thread

logger = structlog.get_logger(__name__)

# Belt-and-suspenders default: every draft must carry an expiry so the queue can
# never accumulate immortal pending rows again.
DEFAULT_APPROVAL_TTL_DAYS = 7


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
        request_key: str | None = None,
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
        customer_id = ""
        chan = channel
        try:
            thread_uuid = uuid.UUID(str(thread_id))
            stmt = select(Thread.id).where(
                Thread.id == thread_uuid,
                Thread.company_id == company_id,
            )
        except ValueError:
            parts = thread_id.split(":", 2)
            customer_id = parts[1] if len(parts) > 1 else ""
            chan = parts[2] if len(parts) > 2 else "chat"
            stmt = select(Thread.id).where(
                Thread.company_id == company_id,
                Thread.customer_id == customer_id,
                Thread.channel == chan,
            )
        result = await self._session.execute(stmt)
        resolved_thread_uuid = result.scalar_one_or_none()

        if not resolved_thread_uuid:
            msg = f"Thread not found for company {company_id}, customer {customer_id}, channel {chan}"
            raise ValueError(msg)

        approval = Approval(
            company_id=company_id,
            thread_id=resolved_thread_uuid,
            draft_id=draft_id,
            request_key=request_key or draft_id,
            action_type=action_type,
            action_args=action_args,
            status="pending",
            channel=channel,
            source=source,
            side_effects=side_effects,
            approval_mode=approval_mode,
            expires_at=expires_at or datetime.now(UTC) + timedelta(days=DEFAULT_APPROVAL_TTL_DAYS),
            input_snapshot=input_snapshot,
            preview_snapshot=preview_snapshot,
            approval_metadata=metadata,
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

    async def find_pending_by_fingerprint(self, *, company_id: str, fingerprint: str) -> Approval | None:
        """Find a still-pending draft with the same stable business-intent fingerprint."""
        stmt = (
            select(Approval)
            .where(
                Approval.company_id == company_id,
                Approval.status == "pending",
                Approval.approval_metadata["fingerprint"].astext == fingerprint,
            )
            .order_by(Approval.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def expire_stale(self, company_id: str | None = None) -> int:
        """Mark pending drafts past their expires_at as expired (set-based, single UPDATE)."""
        now = datetime.now(UTC)
        stmt = (
            update(Approval)
            .where(
                Approval.status == "pending",
                Approval.expires_at.is_not(None),
                Approval.expires_at <= now,
            )
            .values(status="expired")
        )
        if company_id:
            stmt = stmt.where(Approval.company_id == company_id)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.rowcount or 0

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
        """Update an approval status by draft ID."""
        values: dict[str, Any] = {"status": status}
        if decided_by is not None:
            values["decided_by"] = decided_by
            values["decided_at"] = datetime.now(UTC)

        stmt = (
            update(Approval)
            .where(Approval.draft_id == draft_id)
            .values(**values)
            .returning(Approval)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        approval = result.scalar_one_or_none()
        if approval:
            logger.info("approval status updated", draft_id=draft_id, status=status)
        return approval

    async def list_by_company(
        self,
        company_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Approval]:
        """List approvals for a company, optionally filtered by status."""
        where = [Approval.company_id == company_id]
        if status:
            where.append(Approval.status == status)
        stmt = (
            select(Approval)
            .where(*where)
            .order_by(Approval.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def transition_status(
        self,
        draft_id: str,
        current_status: str,
        next_status: str,
        decided_by: str | None = None,
    ) -> Approval | None:
        """Atomically transition approval status from current_status to next_status."""
        now = datetime.now(UTC)
        stmt = (
            update(Approval)
            .where(
                Approval.draft_id == draft_id,
                Approval.status == current_status
            )
            .values(status=next_status, decided_by=decided_by, decided_at=now)
            .returning(Approval)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        approval = result.scalar_one_or_none()
        if approval:
            logger.info("approval status transitioned", draft_id=draft_id, from_status=current_status, to_status=next_status)
        return approval
