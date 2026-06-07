from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = ({"schema": "ai"},)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai.threads.id"), nullable=False
    )
    company_id: Mapped[str] = mapped_column(String, nullable=False)
    draft_id: Mapped[str] = mapped_column(String, nullable=False)
    request_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    action_args: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    channel: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    side_effects: Mapped[str] = mapped_column(String, nullable=False, default="write")
    approval_mode: Mapped[str] = mapped_column(String, nullable=False, default="required")
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    input_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    preview_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    execution_result_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    approval_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=datetime.now
    )
