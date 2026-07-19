"""Add product_embeddings table for vector/semantic product search.

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-09 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
                CREATE EXTENSION IF NOT EXISTS vector;
                EXECUTE '
                    CREATE TABLE IF NOT EXISTS ai.product_embeddings (
                        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                        company_id      TEXT NOT NULL,
                        product_id      TEXT NOT NULL,
                        product_name    TEXT NOT NULL,
                        sku             TEXT,
                        price           NUMERIC,
                        status          TEXT DEFAULT ''IN_STOCK'',
                        text_embedding  vector(768),
                        image_embedding vector(768),
                        embed_text      TEXT,
                        image_url       TEXT,
                        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                        UNIQUE (company_id, product_id)
                    )
                ';
                EXECUTE '
                    CREATE INDEX IF NOT EXISTS ix_product_embeddings_text
                    ON ai.product_embeddings
                    USING ivfflat (text_embedding vector_cosine_ops)
                    WITH (lists = 10)
                ';
                EXECUTE '
                    CREATE INDEX IF NOT EXISTS ix_product_embeddings_image
                    ON ai.product_embeddings
                    USING ivfflat (image_embedding vector_cosine_ops)
                    WITH (lists = 10)
                ';
                EXECUTE '
                    CREATE INDEX IF NOT EXISTS ix_product_embeddings_company
                    ON ai.product_embeddings (company_id)
                ';
            ELSE
                RAISE NOTICE 'pgvector extension is not available; skipping ai.product_embeddings';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai.product_embeddings")
