"""Add WhatsApp AI ignore list table for Do-Not-Reply feature

Revision ID: 0026
Revises: 0025
Create Date: 2026-08-21 20:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0026"
down_revision: Union[str, None] = "0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS ai.whatsapp_ai_ignore_list (
            id UUID PRIMARY KEY,
            company_id TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            label TEXT,
            notes TEXT,
            added_by_user_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_wai_company_phone UNIQUE (company_id, phone_number)
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_wai_company_phone "
        "ON ai.whatsapp_ai_ignore_list (company_id, phone_number);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ai.idx_wai_company_phone;")
    op.execute("DROP TABLE IF EXISTS ai.whatsapp_ai_ignore_list;")
