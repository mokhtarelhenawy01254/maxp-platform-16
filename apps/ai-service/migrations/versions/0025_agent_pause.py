"""Add agentPaused + pauseReason columns to ai_settings

Revision ID: 0025
Revises: 0024
Create Date: 2026-08-09 12:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_settings",
        sa.Column("agentPaused", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema="ai",
    )
    op.add_column(
        "ai_settings",
        sa.Column("pauseReason", sa.Text(), nullable=True),
        schema="ai",
    )


def downgrade() -> None:
    op.drop_column("ai_settings", "pauseReason", schema="ai")
    op.drop_column("ai_settings", "agentPaused", schema="ai")
