from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class AgentTemplate(Base):
    """Single source of truth for agent templates.

    Seeded from `backend/agents/*/agent.json` at deploy time.
    At runtime the prompt registry reads from DB first; file-based
    templates are only used as a dev fallback.
    """
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
    tool_choice: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
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

    agents: Mapped[list["Agent"]] = relationship("Agent", back_populates="template")

    @property
    def soul(self) -> str | None:
        return self.instructions_soul

    @property
    def rules(self) -> str | None:
        return self.instructions_agents

    @property
    def persona(self) -> dict[str, Any]:
        return self.persona_meta


class Agent(Base):
    """Unified agent model — the single source of truth for runtime agent
    instances, replacing the former `CompanyAgent` table.

    Merged fields from `CompanyAgent`: description, icon, soul, rules,
    skills, department_id, manager_type, created_by.
    """
    __tablename__ = "agents"
    __table_args__ = (
        Index(
            "uq_company_agent_name_active",
            "company_id",
            "name",
            unique=True,
            postgresql_where=text("status != 'ARCHIVED'"),
        ),
        Index("ix_agents_company_id", "company_id"),
        Index("ix_agents_department_id", "department_id"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    company_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True, default="🤖")
    soul: Mapped[str | None] = mapped_column(Text, nullable=True)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_slug: Mapped[str | None] = mapped_column(
        String(100),
        ForeignKey("ai.agent_templates.slug", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    model_policy: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    persona: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    custom_instructions: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    allowed_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    channels: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True, default=list)
    guardrails: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    budget: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    parent_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("ai.agent_departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    manager_type: Mapped[str | None] = mapped_column(String(20), nullable=True, default="AGENT")
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    department: Mapped["AgentDepartment | None"] = relationship(
        "AgentDepartment", back_populates="agents", foreign_keys=[department_id]
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

    # Updated: now references Agent instead of CompanyAgent
    agents: Mapped[list[Agent]] = relationship(
        "Agent", back_populates="department", foreign_keys="Agent.department_id"
    )
