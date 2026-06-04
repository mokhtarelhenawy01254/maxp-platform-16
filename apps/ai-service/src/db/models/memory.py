from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class AgenticMemoryFact(Base):
    __tablename__ = "agentic_memory_fact"
    __table_args__ = ({"schema": "ai"},)

    id = Column(String, primary_key=True)
    company_id = Column(String, index=True, nullable=False)
    customer_id = Column(String, index=True, nullable=False)
    type = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    importance = Column(Integer, default=3)
    embedding = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
