"""Create skills table for filesystem skill seeding.

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-07 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names(schema="ai")
    if "skills" not in tables:
        op.create_table(
            "skills",
            sa.Column("id", sa.String(length=100), primary_key=True),
            sa.Column("company_id", sa.String(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("version", sa.String(length=20), nullable=False, server_default="1.0.0"),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("trigger_phrases", sa.String(), nullable=False, server_default=""),
            sa.Column("instructions", sa.Text(), nullable=False),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("allowed_tools", postgresql.JSONB(), nullable=False, server_default="[]"),
            sa.Column("channels", postgresql.JSONB(), nullable=False, server_default="[]"),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("requires_human_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("max_tool_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("skill_metadata", postgresql.JSONB(), nullable=True),
            sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
            schema="ai",
        )
        op.create_index("ix_ai_skills_company_id", "skills", ["company_id"], schema="ai")


def downgrade() -> None:
    op.drop_index("ix_ai_skills_company_id", table_name="skills", schema="ai")
    op.drop_table("skills", schema="ai")
