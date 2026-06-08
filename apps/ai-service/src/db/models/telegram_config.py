from __future__ import annotations

import uuid
from datetime import datetime
from typing import ClassVar

from sqlalchemy import TIMESTAMP, Boolean, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class TelegramConfig(Base):
    """Configuration for Telegram Userbots/Bots per company."""
    __tablename__ = "telegram_configs"
    __table_args__: ClassVar[dict[str, str]] = {"schema": "ai"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    api_id: Mapped[str | None] = mapped_column(String, nullable=True)
    api_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    session_string: Mapped[str | None] = mapped_column(Text, nullable=True)
    bot_token: Mapped[str | None] = mapped_column(String, nullable=True)
    bot_username: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    config_type: Mapped[str] = mapped_column(String, default="USERBOT") # USERBOT | BOT
    label: Mapped[str] = mapped_column(String, default="Main Account")

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=datetime.now
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=datetime.now, onupdate=datetime.now
    )
