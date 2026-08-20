"""Add channelReplyEnabled column to ai_settings

Revision ID: 0024
Revises: 0023
Create Date: 2026-08-08 12:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_settings",
        sa.Column("channelReplyEnabled", sa.Text(), nullable=True),
        schema="ai",
    )
    op.execute("UPDATE ai.ai_settings SET \"autoReplyEnabled\" = true WHERE \"autoReplyEnabled\" = false")


def downgrade() -> None:
    op.drop_column("ai_settings", "channelReplyEnabled", schema="ai")
