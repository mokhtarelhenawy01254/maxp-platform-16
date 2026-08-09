from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class AiSetting(Base):
    __tablename__ = "ai_settings"
    __table_args__ = {"schema": "ai"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column("companyId", String, nullable=False, index=True, unique=True)
    autoReplyEnabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    channelReplyEnabled: Mapped[str | None] = mapped_column(Text, nullable=True)
    promptTemplate: Mapped[str | None] = mapped_column(Text, nullable=True)
    responseRules: Mapped[str | None] = mapped_column(Text, nullable=True)
    modelSettings: Mapped[str | None] = mapped_column(Text, nullable=True)
    writeToolScopes: Mapped[str | None] = mapped_column(Text, nullable=True)
    humanApprovalRequiredForWrite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    maxRepliesPerCustomer: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    autoFilterEnabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    negativeKeywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    negativeCommentAction: Mapped[str] = mapped_column(String, nullable=False, default="hide")
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
