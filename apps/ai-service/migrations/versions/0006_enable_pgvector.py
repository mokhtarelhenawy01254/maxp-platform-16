"""Enable pgvector extension and add embedding column to agentic_memory_fact.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-04 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai.agentic_memory_fact (
            id VARCHAR NOT NULL PRIMARY KEY,
            company_id VARCHAR NOT NULL,
            customer_id VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            content TEXT NOT NULL,
            confidence FLOAT DEFAULT 1.0,
            importance INTEGER DEFAULT 3,
            embedding_provider VARCHAR(32) NOT NULL DEFAULT 'gemini',
            metadata_json JSON,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_agentic_memory_fact_company_id ON ai.agentic_memory_fact (company_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agentic_memory_fact_customer_id ON ai.agentic_memory_fact (customer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agentic_memory_fact_type ON ai.agentic_memory_fact (type)")
    op.execute(
        "ALTER TABLE ai.agentic_memory_fact ADD COLUMN IF NOT EXISTS embedding vector(768)"
    )
    op.create_index(
        "ix_agentic_memory_fact_embedding",
        "agentic_memory_fact",
        [sa.text("embedding vector_cosine_ops")],
        schema="ai",
        postgresql_using="ivfflat",
    )


def downgrade() -> None:
    op.drop_index("ix_agentic_memory_fact_embedding", schema="ai")
    op.drop_column("agentic_memory_fact", "embedding", schema="ai")