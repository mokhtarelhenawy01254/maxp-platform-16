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