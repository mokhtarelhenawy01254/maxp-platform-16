from __future__ import annotations

from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class IntentDefinition(Base):
    __tablename__ = "intent_definitions"
    __table_args__: ClassVar[dict[str, str]] = {"schema": "ai"}

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    intent: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    next_state: Mapped[str] = mapped_column(String(100), nullable=False)
    required_slots: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    guardrails: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    primary_tool: Mapped[str | None] = mapped_column(String(100), nullable=True)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
