"""Create ai.self_review_log table for LLM-as-Judge review tracking

Revision ID: 0023
Revises: 0022
Create Date: 2026-07-12 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
from alembic import op

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai.self_review_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            agent_slug TEXT,
            reply_preview VARCHAR(300),
            model_used TEXT,
            latency_ms INTEGER,
            status TEXT NOT NULL DEFAULT 'approved',
            violations JSONB,
            reason TEXT,
            verdict_raw JSONB,
            metadata_ JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_self_review_log_company_id ON ai.self_review_log (company_id);
        CREATE INDEX IF NOT EXISTS idx_self_review_log_created_at ON ai.self_review_log (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_self_review_log_status ON ai.self_review_log (status);
        CREATE INDEX IF NOT EXISTS idx_self_review_log_agent_id ON ai.self_review_log (agent_id);
        CREATE INDEX IF NOT EXISTS idx_self_review_log_company_agent ON ai.self_review_log (company_id, agent_id, created_at DESC);
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS ai.self_review_log;
    """)
