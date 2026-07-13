from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class AgentGuardrailRule(Base):
    """SQLAlchemy model for merchant-defined anti-rationalization guardrail rules.

    Stored in the `ai` schema to align with other agent models.
    """
    __tablename__ = "agent_guardrail_rules"
    __table_args__ = (
        Index("ix_guardrail_agent_id", "agent_id"),
        Index("ix_guardrail_company_id", "company_id"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    agent_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("ai.agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    company_id: Mapped[str] = mapped_column(String(100), nullable=False)
    excuse: Mapped[str] = mapped_column(Text, nullable=False)
    rebuttal: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="merchant_manual")
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    embedding_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="gemini")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
