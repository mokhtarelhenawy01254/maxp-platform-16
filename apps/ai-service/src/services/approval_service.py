from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository
from src.tools.names import canonical_tool_name
from src.tools.registry import get_tool

logger = structlog.get_logger(__name__)

# Default approval expiry: 24 hours
DEFAULT_APPROVAL_TTL_HOURS = 24


class ApprovalService:
    """Service layer for the approval lifecycle.

    Responsibilities:
    - Create approval requests (with persistence guaranteed)
    - Approve / reject with atomic status transitions
    - Execute approved actions via the tool registry
    - Mark expired approvals (timeout handling)
    - Dispatch notifications when approvals are created / resolved
    """

    def __init__(
        self,
        session: AsyncSession,
        notification_handler: Any | None = None,
        approval_ttl_hours: int = DEFAULT_APPROVAL_TTL_HOURS,
    ) -> None:
        self._repo = ApprovalRepository(session)
        self._session = session
        self._notification_handler = notification_handler
        self._approval_ttl_hours = approval_ttl_hours

    # ── Create ────────────────────────────────────────────────────────

    async def request_approval(
        self,
        *,
        action_type: str,
        action_args: dict[str, Any],
        company_id: str,
        customer_id: str,
        thread_id: str,
        channel: str = "chat",
        source: str = "system",
        side_effects: str = "write",
        approval_mode: str = "required",
        sdk_approval_id: str | None = None,
        reason: str | None = None,
        input_snapshot: dict[str, Any] | None = None,
        preview_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create an approval request and persist it.

        This is the single entry point for creating approvals.
        It guarantees persistence regardless of the caller.
        """
        expires_at = datetime.now(UTC) + timedelta(hours=self._approval_ttl_hours)

        approval = await self._repo.create(
            company_id=company_id,
            thread_id=thread_id,
            draft_id=f"{company_id}:{thread_id}:{canonical_tool_name(action_type)}",
            action_type=action_type,
            action_args=action_args,
            channel=channel,
            source=source,
            side_effects=side_effects,
            approval_mode=approval_mode,
            expires_at=expires_at,
            input_snapshot=input_snapshot,
            preview_snapshot=preview_snapshot,
            metadata={
                "sdk_approval_id": sdk_approval_id,
                "customer_id": customer_id,
                "reason": reason,
            } if reason or sdk_approval_id or customer_id else None,
        )

        draft_id = str(approval.draft_id or approval.id or "")

        logger.info(
            "approval requested",
            draft_id=draft_id,
            action_type=action_type,
            company_id=company_id,
        )

        # Dispatch notification (fire-and-forget)
        await self._notify("approval.created", {
            "draft_id": draft_id,
            "action_type": action_type,
            "action_args": action_args,
            "company_id": company_id,
            "thread_id": str(approval.thread_id),
            "expires_at": expires_at.isoformat(),
        })

        return {
            "draft_id": draft_id,
            "status": "pending",
            "expires_at": expires_at.isoformat(),
        }

    # ── Approve / Reject ───────────────────────────────────────────────

    async def approve(
        self,
        draft_id: str,
        *,
        decided_by: str = "merchant",
    ) -> dict[str, Any]:
        """Approve a pending request and execute the action.

        Uses atomic status transition (pending → approved → executing → completed).
        """
        approval = await self._repo.transition_status(
            draft_id=draft_id,
            current_status="pending",
            next_status="approved",
            decided_by=decided_by,
        )
        if not approval:
            # Already approved or not found — try fetching current state
            existing = await self._repo.get_by_draft_id(draft_id)
            if existing and existing.status == "approved":
                return {
                    "draft_id": draft_id,
                    "status": "already_approved",
                    "message": "This approval has already been approved.",
                }
            return {
                "draft_id": draft_id,
                "status": "error",
                "message": f"Approval not found or cannot be approved (current status: {existing.status if existing else 'unknown'}).",
            }

        logger.info("approval approved", draft_id=draft_id, decided_by=decided_by)

        # Dispatch notification
        await self._notify("approval.approved", {
            "draft_id": draft_id,
            "action_type": approval.action_type,
            "company_id": approval.company_id,
            "decided_by": decided_by,
        })

        # Execute the approved action
        result = await self._execute_action(approval)
        return result

    async def reject(
        self,
        draft_id: str,
        *,
        decided_by: str = "merchant",
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Reject a pending approval request."""
        approval = await self._repo.transition_status(
            draft_id=draft_id,
            current_status="pending",
            next_status="rejected",
            decided_by=decided_by,
        )
        if not approval:
            existing = await self._repo.get_by_draft_id(draft_id)
            return {
                "draft_id": draft_id,
                "status": existing.status if existing else "not_found",
                "message": "Approval not found or already resolved.",
            }

        logger.info("approval rejected", draft_id=draft_id, decided_by=decided_by)

        # Update reason if provided
        if reason and approval:
            approval.reason = reason
            await self._session.commit()

        # Dispatch notification
        await self._notify("approval.rejected", {
            "draft_id": draft_id,
            "action_type": approval.action_type,
            "company_id": approval.company_id,
            "decided_by": decided_by,
            "reason": reason,
        })

        return {
            "draft_id": draft_id,
            "status": "rejected",
        }

    # ── Execute ────────────────────────────────────────────────────────

    async def _execute_action(self, approval: Any) -> dict[str, Any]:
        """Execute an approved action via the tool registry."""
        # Atomically transition: approved → executing
        executing = await self._repo.transition_status(
            draft_id=approval.draft_id,
            current_status="approved",
            next_status="executing",
        )
        if not executing:
            logger.error("could not transition to executing", draft_id=approval.draft_id)
            return {
                "draft_id": approval.draft_id,
                "status": "error",
                "message": "Could not start execution — approval may have been processed already.",
            }

        tool = get_tool(canonical_tool_name(approval.action_type))
        if not tool:
            # Revert to approved so it's not stuck in executing
            await self._repo.update_status(approval.draft_id, status="approved")
            logger.error("tool not found for approved action", action_type=approval.action_type)
            return {
                "draft_id": approval.draft_id,
                "status": "error",
                "message": f"No tool handler found for '{approval.action_type}'.",
            }

        try:
            model_data = {k.replace("-", "_"): v for k, v in approval.action_args.items()}
            model_data["company_id"] = approval.company_id
            if hasattr(tool, "input_model") and "approved" in getattr(tool.input_model, "model_fields", {}):
                model_data["approved"] = True
            tool_input = tool.input_model(**model_data)
            result = await tool.func(tool_input)

            await self._repo.update_status(approval.draft_id, status="completed")
            logger.info("approval executed successfully", draft_id=approval.draft_id)

            # Dispatch notification
            await self._notify("approval.executed", {
                "draft_id": approval.draft_id,
                "action_type": approval.action_type,
                "company_id": approval.company_id,
            })

            return {
                "draft_id": approval.draft_id,
                "status": "completed",
                "result": result,
            }
        except Exception as e:
            await self._repo.update_status(approval.draft_id, status="failed")
            logger.error("approval execution failed", draft_id=approval.draft_id, error=str(e))

            await self._notify("approval.execution_failed", {
                "draft_id": approval.draft_id,
                "action_type": approval.action_type,
                "company_id": approval.company_id,
                "error": str(e),
            })

            return {
                "draft_id": approval.draft_id,
                "status": "failed",
                "message": str(e),
            }

    # ── Timeout ────────────────────────────────────────────────────────

    async def expire_stale_approvals(self, company_id: str | None = None) -> int:
        """Mark pending approvals past their expires_at as expired.

        Returns the count of newly expired approvals.
        """
        now = datetime.now(UTC)
        expired_count = 0

        # List all pending approvals for company (or all companies)
        companies = [company_id] if company_id else []
        target_companies = companies or await self._get_all_active_companies()

        for cid in target_companies:
            approvals = await self._repo.list_by_company(cid, status="pending")
            for approval in approvals:
                if approval.expires_at and approval.expires_at <= now:
                    await self._repo.transition_status(
                        draft_id=approval.draft_id,
                        current_status="pending",
                        next_status="expired",
                    )
                    expired_count += 1

                    await self._notify("approval.expired", {
                        "draft_id": approval.draft_id,
                        "action_type": approval.action_type,
                        "company_id": approval.company_id,
                    })

        if expired_count:
            logger.info("expired stale approvals", count=expired_count)
        return expired_count

    async def _get_all_active_companies(self) -> list[str]:
        """Get distinct company IDs that have pending approvals."""
        from sqlalchemy import select, distinct
        from src.db.models.approval import Approval

        stmt = (
            select(Approval.company_id)
            .where(Approval.status == "pending")
            .distinct()
        )
        result = await self._session.execute(stmt)
        return [row[0] for row in result.all()]

    # ── Notifications ──────────────────────────────────────────────────

    async def _notify(self, event_type: str, payload: dict[str, Any]) -> None:
        """Dispatch a notification event.

        Currently logs the event. In production, this can be wired to:
        - WebSocket push to merchant dashboard
        - Webhook to external systems
        - Redis pub/sub for real-time updates
        - QueueService for background processing
        """
        logger.info(
            "approval_notification",
            event_type=event_type,
            **payload,
        )

        if self._notification_handler and callable(self._notification_handler):
            try:
                await self._notification_handler(event_type, payload)
            except Exception as exc:
                logger.warning("notification handler failed", event_type=event_type, error=str(exc))

    # ── Query helpers ──────────────────────────────────────────────────

    async def get_approval(self, draft_id: str) -> Any | None:
        """Get an approval by draft ID."""
        return await self._repo.get_by_draft_id(draft_id)

    async def list_approvals(
        self,
        company_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Any]:
        """List approvals for a company."""
        return await self._repo.list_by_company(company_id, status, limit, offset)
