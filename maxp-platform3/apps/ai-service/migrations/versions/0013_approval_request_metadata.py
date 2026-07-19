"""Add approval request metadata columns.

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-10 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS request_key TEXT")
    op.execute(
        """
        UPDATE ai.approvals
        SET request_key = COALESCE(NULLIF(request_key, ''), draft_id, id::text)
        WHERE request_key IS NULL OR request_key = ''
        """
    )
    op.execute("ALTER TABLE ai.approvals ALTER COLUMN request_key SET NOT NULL")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_approvals_request_key "
        "ON ai.approvals (request_key)"
    )
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'chat'")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system'")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS side_effects TEXT NOT NULL DEFAULT 'write'")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS approval_mode TEXT NOT NULL DEFAULT 'required'")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS reason TEXT")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS input_snapshot JSONB")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS preview_snapshot JSONB")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS execution_result_snapshot JSONB")
    op.execute("ALTER TABLE ai.approvals ADD COLUMN IF NOT EXISTS approval_metadata JSONB")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ai.uq_ai_approvals_request_key")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS approval_metadata")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS execution_result_snapshot")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS preview_snapshot")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS input_snapshot")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS expires_at")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS reason")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS approval_mode")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS side_effects")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS source")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS channel")
    op.execute("ALTER TABLE ai.approvals DROP COLUMN IF EXISTS request_key")
