"""add agent_guardrail_rules

Revision ID: 5049cf2020f5
Revises: 4038cf1010f4
Create Date: 2026-07-10 21:20:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '5049cf2020f5'
down_revision: Union[str, None] = '4038cf1010f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create table ai.agent_guardrail_rules
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai.agent_guardrail_rules (
            id VARCHAR(100) NOT NULL PRIMARY KEY,
            agent_id VARCHAR(100) NOT NULL,
            company_id VARCHAR(100) NOT NULL,
            excuse TEXT NOT NULL,
            rebuttal TEXT NOT NULL,
            action TEXT NOT NULL,
            source VARCHAR(30) NOT NULL DEFAULT 'merchant_manual',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            embedding JSONB,
            embedding_provider VARCHAR(32) NOT NULL DEFAULT 'gemini',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            FOREIGN KEY (agent_id) REFERENCES ai.agents (id) ON DELETE CASCADE
        )
    """)

    # 2. Add indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_guardrail_agent_id ON ai.agent_guardrail_rules (agent_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_guardrail_company_id ON ai.agent_guardrail_rules (company_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai.agent_guardrail_rules")
