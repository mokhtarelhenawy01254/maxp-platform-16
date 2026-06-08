"""Fix ai_keys provider column type from enum to varchar.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-08 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if public.ai_keys exists and provider is enum type
    # Alter column to varchar if it's an enum
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'ai_keys' 
                AND column_name = 'provider'
                AND data_type = 'USER-DEFINED'
            ) THEN
                ALTER TABLE public.ai_keys 
                ALTER COLUMN provider TYPE VARCHAR(50) 
                USING provider::text;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Cannot easily downgrade enum type, skip
    pass