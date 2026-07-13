"""Switch AI key IDs from UUID to String to match MaxP cuids.

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-03 05:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("TRUNCATE TABLE ai.provider_logs, ai.ai_model_configs, ai.ai_keys CASCADE")

    op.execute('ALTER TABLE ai.ai_model_configs DROP CONSTRAINT IF EXISTS ai_model_configs_key_id_fkey')
    op.execute('ALTER TABLE ai.provider_logs DROP CONSTRAINT IF EXISTS provider_logs_key_id_fkey')
    op.execute('DROP INDEX IF EXISTS ai.ix_ai_ai_model_configs_key_id')
    op.execute('DROP INDEX IF EXISTS ai.ix_provider_logs_key_id')
    op.execute('ALTER TABLE ai.ai_keys DROP CONSTRAINT IF EXISTS ai_keys_pkey')

    op.alter_column(
        "ai_keys",
        "id",
        existing_type=postgresql.UUID(as_uuid=True),
        type_=sa.String(length=50),
        existing_nullable=False,
        postgresql_using="id::text",
        schema="ai",
    )
    op.alter_column(
        "ai_model_configs",
        "key_id",
        existing_type=postgresql.UUID(as_uuid=True),
        type_=sa.String(length=50),
        existing_nullable=False,
        postgresql_using="key_id::text",
        schema="ai",
    )
    op.alter_column(
        "provider_logs",
        "key_id",
        existing_type=postgresql.UUID(as_uuid=True),
        type_=sa.String(length=50),
        existing_nullable=True,
        postgresql_using="key_id::text",
        schema="ai",
    )

    op.execute('ALTER TABLE ai.ai_keys ADD CONSTRAINT ai_keys_pkey PRIMARY KEY (id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_ai_ai_model_configs_key_id ON ai.ai_model_configs (key_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_provider_logs_key_id ON ai.provider_logs (key_id)')
    op.execute(
        'ALTER TABLE ai.ai_model_configs '
        'ADD CONSTRAINT ai_model_configs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES ai.ai_keys(id) ON DELETE CASCADE'
    )
    op.execute(
        'ALTER TABLE ai.provider_logs '
        'ADD CONSTRAINT provider_logs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES ai.ai_keys(id) ON DELETE SET NULL'
    )


def downgrade() -> None:
    op.execute('ALTER TABLE ai.ai_model_configs DROP CONSTRAINT IF EXISTS ai_model_configs_key_id_fkey')
    op.execute('ALTER TABLE ai.provider_logs DROP CONSTRAINT IF EXISTS provider_logs_key_id_fkey')
    op.execute('DROP INDEX IF EXISTS ai.ix_ai_ai_model_configs_key_id')
    op.execute('DROP INDEX IF EXISTS ai.ix_provider_logs_key_id')
    op.execute('ALTER TABLE ai.ai_keys DROP CONSTRAINT IF EXISTS ai_keys_pkey')

    op.alter_column(
        "provider_logs",
        "key_id",
        existing_type=sa.String(length=50),
        type_=postgresql.UUID(as_uuid=True),
        existing_nullable=True,
        schema="ai",
    )
    op.alter_column(
        "ai_model_configs",
        "key_id",
        existing_type=sa.String(length=50),
        type_=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        schema="ai",
    )
    op.alter_column(
        "ai_keys",
        "id",
        existing_type=sa.String(length=50),
        type_=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        schema="ai",
    )

    op.execute('ALTER TABLE ai.ai_keys ADD CONSTRAINT ai_keys_pkey PRIMARY KEY (id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_ai_ai_model_configs_key_id ON ai.ai_model_configs (key_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_provider_logs_key_id ON ai.provider_logs (key_id)')
    op.execute(
        'ALTER TABLE ai.ai_model_configs '
        'ADD CONSTRAINT ai_model_configs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES ai.ai_keys(id) ON DELETE CASCADE'
    )
    op.execute(
        'ALTER TABLE ai.provider_logs '
        'ADD CONSTRAINT provider_logs_key_id_fkey '
        'FOREIGN KEY (key_id) REFERENCES ai.ai_keys(id) ON DELETE SET NULL'
    )
