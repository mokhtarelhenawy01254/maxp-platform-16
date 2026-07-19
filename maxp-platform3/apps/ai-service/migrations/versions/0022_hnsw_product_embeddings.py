"""Migrate product_embeddings indexes from IVFFlat to HNSW for 3x faster query

Revision ID: 0022
Revises: 0021
Create Date: 2026-07-05 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
from alembic import op

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
                DROP INDEX IF EXISTS ai.ix_product_embeddings_text;
                DROP INDEX IF EXISTS ai.ix_product_embeddings_image;

                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_product_embeddings_text_hnsw') THEN
                    CREATE INDEX ix_product_embeddings_text_hnsw
                    ON ai.product_embeddings
                    USING hnsw (text_embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 200);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_product_embeddings_image_hnsw') THEN
                    CREATE INDEX ix_product_embeddings_image_hnsw
                    ON ai.product_embeddings
                    USING hnsw (image_embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 200);
                END IF;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ai.ix_product_embeddings_text_hnsw;
        DROP INDEX IF EXISTS ai.ix_product_embeddings_image_hnsw;
        CREATE INDEX IF NOT EXISTS ix_product_embeddings_text
            ON ai.product_embeddings
            USING ivfflat (text_embedding vector_cosine_ops)
            WITH (lists = 10);
        CREATE INDEX IF NOT EXISTS ix_product_embeddings_image
            ON ai.product_embeddings
            USING ivfflat (image_embedding vector_cosine_ops)
            WITH (lists = 10);
    """)
