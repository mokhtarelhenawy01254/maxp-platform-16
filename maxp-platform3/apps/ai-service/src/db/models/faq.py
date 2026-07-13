from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class FAQ(Base):
    __tablename__ = "faqs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    company_id: Mapped[str] = mapped_column("companyId", String, nullable=False, index=True)
    question: Mapped[str] = mapped_column(String, nullable=False)
    answer: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False, default="general")
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    helpful: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notHelpful: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    isActive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)
    embeddingGeneratedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
