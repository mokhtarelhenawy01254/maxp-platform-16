"""Create ai.agent_tool_catalog — DB-backed capability catalog for agents.

Revision ID: 0028
Revises: 0027
Create Date: 2026-09-30 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0028"
down_revision: Union[str, None] = "0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names(schema="ai")
    if "agent_tool_catalog" not in tables:
        op.create_table(
            "agent_tool_catalog",
            sa.Column("name", sa.String(length=120), primary_key=True),
            sa.Column("domain", sa.String(length=60), nullable=False),
            sa.Column("description_en", sa.Text(), nullable=False),
            sa.Column("usage_hint_ar", sa.Text(), nullable=True),
            sa.Column("endpoint", sa.String(length=300), nullable=True),
            sa.Column("http_method", sa.String(length=10), nullable=True),
            sa.Column("input_schema", postgresql.JSONB(), nullable=False, server_default="{}"),
            sa.Column("path_params", postgresql.JSONB(), nullable=False, server_default="[]"),
            sa.Column("permission_key", sa.String(length=100), nullable=True),
            sa.Column("app_slug", sa.String(length=100), nullable=True),
            sa.Column("risk_level", sa.String(length=20), nullable=False, server_default="read"),
            sa.Column("exposure_state", sa.String(length=20), nullable=False, server_default="draft"),
            sa.Column("roles", postgresql.JSONB(), nullable=False, server_default="[]"),
            sa.Column("source", sa.String(length=20), nullable=False, server_default="auto"),
            sa.Column("catalog_metadata", postgresql.JSONB(), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
            schema="ai",
        )
        op.create_index("ix_ai_agent_tool_catalog_domain", "agent_tool_catalog", ["domain"], schema="ai")
        op.create_index("ix_ai_agent_tool_catalog_exposure_state", "agent_tool_catalog", ["exposure_state"], schema="ai")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names(schema="ai")
    if "agent_tool_catalog" in tables:
        op.drop_index("ix_ai_agent_tool_catalog_exposure_state", table_name="agent_tool_catalog", schema="ai")
        op.drop_index("ix_ai_agent_tool_catalog_domain", table_name="agent_tool_catalog", schema="ai")
        op.drop_table("agent_tool_catalog", schema="ai")
