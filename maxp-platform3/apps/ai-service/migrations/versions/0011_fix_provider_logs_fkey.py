"""Fix provider_logs foreign key to reference public.ai_keys.

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-08 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing FK if it exists
    op.execute('ALTER TABLE ai.provider_logs DROP CONSTRAINT IF EXISTS provider_logs_key_id_fkey')
    
    # Add correct FK to public.ai_keys
    op.execute(
        'ALTER TABLE ai.provider_logs '
        'ADD CONSTRAINT provider_logs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES public.ai_keys(id) ON DELETE SET NULL'
    )


def downgrade() -> None:
    op.execute('ALTER TABLE ai.provider_logs DROP CONSTRAINT IF EXISTS provider_logs_key_id_fkey')
    op.execute(
        'ALTER TABLE ai.provider_logs '
        'ADD CONSTRAINT provider_logs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES ai.ai_keys(id) ON DELETE SET NULL'
    )