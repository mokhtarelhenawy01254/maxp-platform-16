"""Add embedding_provider column to agentic_memory_fact for provenance tracking.

The embedding service now records which provider produced each vector
('gemini' for real embeddings, 'pseudo' for deterministic fallbacks).
Storing this as a first-class column allows efficient SQL-level filtering
in similarity search (``WHERE embedding_provider = 'gemini'``) instead of
parsing the metadata JSON every time.

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-04 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE ai.agentic_memory_fact
        ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(32) NOT NULL DEFAULT 'gemini'
        """
    )
    op.create_index(
        "ix_agentic_memory_fact_embedding_provider",
        "agentic_memory_fact",
        ["embedding_provider"],
        schema="ai",
    )
    op.create_index(
        "ix_agentic_memory_fact_company_provider",
        "agentic_memory_fact",
        ["company_id", "embedding_provider"],
        schema="ai",
    )

    # Check if vector extension is active in pg_extension
    bind = op.get_bind()
    has_vector = False

    try:
        from alembic import context
        if context.is_offline_mode():
            has_vector = True
    except Exception:
        pass

    if not has_vector and bind is not None:
        try:
            res = bind.execute(sa.text("SELECT 1 FROM pg_extension WHERE extname = 'vector'"))
            if res is not None:
                has_vector = res.scalar() is not None
        except Exception:
            pass

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema='ai' 
                  AND table_name='agentic_memory_fact' 
                  AND column_name='embedding'
            ) THEN
                UPDATE ai.agentic_memory_fact
                SET embedding_provider = 'pseudo'
                WHERE embedding_provider = 'gemini'
                  AND embedding IS NULL;
            END IF;
        END $$;
        """
    )




def downgrade() -> None:
    op.drop_index("ix_agentic_memory_fact_company_provider", schema="ai")
    op.drop_index("ix_agentic_memory_fact_embedding_provider", schema="ai")
    op.drop_column("agentic_memory_fact", "embedding_provider", schema="ai")
