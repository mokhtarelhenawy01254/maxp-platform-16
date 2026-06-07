from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import Boolean, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class Skill(Base):
    __tablename__ = "skills"
    __table_args__: ClassVar[dict[str, str]] = {"schema": "ai"}

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    company_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_phrases: Mapped[str] = mapped_column(String, nullable=False, default="")
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    channels: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_tool_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skill_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
