from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class AgentTemplate(Base):
    __tablename__ = "agent_templates"
    __table_args__ = {"schema": "ai"}

    slug: Mapped[str] = mapped_column(String(100), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    model_policy: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    allowed_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    channels: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    guardrails: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    persona_meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    instructions_agents: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions_soul: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions_tools: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions_persona: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_approval: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    handoffs: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    mcp_servers: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    budget: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    output_schema: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    agents: Mapped[list[Agent]] = relationship("Agent", back_populates="template")


class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_company_agent_name"),
        Index(None, "company_id"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    company_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    template_slug: Mapped[str | None] = mapped_column(
        String(100),
        ForeignKey("ai.agent_templates.slug", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    persona: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    allowed_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    guardrails: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    budget: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    parent_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    metadata_: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    template: Mapped[AgentTemplate | None] = relationship(
        "AgentTemplate",
        back_populates="agents",
    )


class AgentDepartment(Base):
    __tablename__ = "agent_departments"
    __table_args__ = (
        UniqueConstraint("company_id", "key"),
        Index(None, "company_id"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    company_id: Mapped[str] = mapped_column(String, nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    icon: Mapped[str | None] = mapped_column(String, nullable=True, default="🤖")
    sort_order: Mapped[int] = mapped_column(default=100)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    agents: Mapped[list[CompanyAgent]] = relationship(
        "CompanyAgent", back_populates="department", foreign_keys="CompanyAgent.department_id"
    )


class CompanyAgent(Base):
    __tablename__ = "company_agents"
    __table_args__ = (
        Index(None, "company_id"),
        Index(None, "department_id"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    company_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    icon: Mapped[str | None] = mapped_column(String, nullable=True, default="🤖")
    soul: Mapped[str | None] = mapped_column(Text, nullable=True)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="ACTIVE")
    parent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    department_id: Mapped[str | None] = mapped_column(String, ForeignKey("ai.agent_departments.id", ondelete="SET NULL"), nullable=True)
    manager_type: Mapped[str | None] = mapped_column(String, nullable=True, default="AGENT")
    template_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    department: Mapped[AgentDepartment | None] = relationship(
        "AgentDepartment", back_populates="agents", foreign_keys=[department_id]
    )
