"""Add description, tags, category, workflow_status to product_embeddings

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-05 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = 'product_embeddings') THEN
                ALTER TABLE ai.product_embeddings ADD COLUMN IF NOT EXISTS description TEXT;
                ALTER TABLE ai.product_embeddings ADD COLUMN IF NOT EXISTS tags TEXT;
                ALTER TABLE ai.product_embeddings ADD COLUMN IF NOT EXISTS category TEXT;
                ALTER TABLE ai.product_embeddings ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'PUBLISHED';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE ai.product_embeddings DROP COLUMN IF EXISTS description;
        ALTER TABLE ai.product_embeddings DROP COLUMN IF EXISTS tags;
        ALTER TABLE ai.product_embeddings DROP COLUMN IF EXISTS category;
        ALTER TABLE ai.product_embeddings DROP COLUMN IF EXISTS workflow_status;
    """)
