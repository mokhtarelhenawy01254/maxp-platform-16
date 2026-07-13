"""Add knowledge_embeddings table for semantic FAQ/policy search.

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-15 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
                CREATE EXTENSION IF NOT EXISTS vector;
                EXECUTE '
                    CREATE TABLE IF NOT EXISTS ai.knowledge_embeddings (
                        id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                        company_id     TEXT NOT NULL,
                        source_id      TEXT NOT NULL,
                        source_type    TEXT NOT NULL,
                        title          TEXT NOT NULL,
                        content        TEXT,
                        category       TEXT,
                        tags           TEXT,
                        embed_text     TEXT,
                        text_embedding vector(768),
                        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                        UNIQUE (source_id, source_type)
                    )
                ';
                EXECUTE '
                    CREATE INDEX IF NOT EXISTS ix_knowledge_embeddings_vec
                    ON ai.knowledge_embeddings
                    USING ivfflat (text_embedding vector_cosine_ops)
                    WITH (lists = 10)
                ';
                EXECUTE '
                    CREATE INDEX IF NOT EXISTS ix_knowledge_embeddings_company
                    ON ai.knowledge_embeddings (company_id)
                ';
            ELSE
                RAISE NOTICE ''pgvector not available; skipping ai.knowledge_embeddings'';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai.knowledge_embeddings")
