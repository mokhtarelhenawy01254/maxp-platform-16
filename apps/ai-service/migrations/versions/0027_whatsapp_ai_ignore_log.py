"""Add WhatsApp AI ignore log table for skip-event stats

Revision ID: 0027
Revises: 0026
Create Date: 2026-08-22 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "0027"
down_revision: Union[str, None] = "0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Skip event log: one row per WhatsApp message that the AI chose NOT to
    # reply to because the sender is on the company's ignore list. The worker
    # inserts here, the stats endpoint reads from here. The list endpoint
    # does not join on this table so writes can be fail-open.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS ai.whatsapp_ai_ignore_log (
            id UUID PRIMARY KEY,
            company_id TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            thread_id TEXT,
            message_mid TEXT,
            skipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    # Stats lookups are always (company_id, skipped_at >= X) — that index
    # covers both the per-day and per-week counts. The unique list lookup
    # already uses (company_id, phone_number) on the parent table, so the
    # log table does not need a phone-level index.
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_wai_log_company_time "
        "ON ai.whatsapp_ai_ignore_log (company_id, skipped_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ai.idx_wai_log_company_time;")
    op.execute("DROP TABLE IF EXISTS ai.whatsapp_ai_ignore_log;")
