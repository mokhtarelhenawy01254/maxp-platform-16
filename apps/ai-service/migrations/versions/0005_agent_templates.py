"""Create agent template runtime tables in ai schema.

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-03 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_templates",
        sa.Column("slug", sa.String(100), primary_key=True),
        sa.Column("role", sa.String(50), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("version", sa.String(20), nullable=False, server_default="1.0.0"),
        sa.Column("model_policy", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("allowed_tools", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("allowed_skills", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("channels", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("guardrails", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("persona_meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("instructions_agents", sa.Text(), nullable=True),
        sa.Column("instructions_soul", sa.Text(), nullable=True),
        sa.Column("instructions_tools", sa.Text(), nullable=True),
        sa.Column("instructions_persona", sa.Text(), nullable=True),
        sa.Column("human_approval", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("handoffs", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("mcp_servers", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("budget", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("output_schema", postgresql.JSONB(), nullable=True),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        schema="ai",
    )

    op.create_table(
        "agents",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("company_id", sa.String(100), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("template_slug", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("model", sa.String(200), nullable=True),
        sa.Column("persona", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("allowed_tools", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("allowed_skills", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("guardrails", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("budget", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("parent_id", sa.String(100), nullable=True),
        sa.Column("version", sa.String(20), nullable=False, server_default="1.0.0"),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("metadata_", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["template_slug"], ["ai.agent_templates.slug"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("company_id", "name", name="uq_company_agent_name"),
        schema="ai",
    )


def downgrade() -> None:
    op.drop_table("agents", schema="ai")
    op.drop_table("agent_templates", schema="ai")
