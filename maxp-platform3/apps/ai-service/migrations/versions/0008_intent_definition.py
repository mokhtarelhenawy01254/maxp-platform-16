"""Create intent_definitions table and seed with default values.

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-04 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

try:
    from src.intent.schema import INTENT_POLICIES, INTENT_CONFIGURED_TOOLS
except ImportError:
    INTENT_POLICIES = {}
    INTENT_CONFIGURED_TOOLS = {}

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'intent_definitions',
        sa.Column('id', sa.String(length=100), primary_key=True),
        sa.Column('intent', sa.String(length=100), nullable=False, unique=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False),
        sa.Column('next_state', sa.String(length=100), nullable=False),
        sa.Column('required_slots', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('guardrails', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('primary_tool', sa.String(length=100), nullable=True),
        sa.Column('allowed_tools', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        schema='ai'
    )

    op.create_index(
        'ix_ai_intent_definitions_intent',
        'intent_definitions',
        ['intent'],
        schema='ai'
    )

    seed_records = []
    for intent_name, policy in INTENT_POLICIES.items():
        tools_config = INTENT_CONFIGURED_TOOLS.get(intent_name, {})
        seed_records.append({
            'id': str(uuid.uuid4()),
            'intent': intent_name,
            'action_type': policy['actionType'],
            'risk_level': policy['riskLevel'],
            'next_state': policy['nextState'],
            'required_slots': policy.get('requiredSlots', []),
            'guardrails': policy.get('guardrails', []),
            'primary_tool': tools_config.get('primaryTool'),
            'allowed_tools': tools_config.get('allowedTools', []),
        })

    op.bulk_insert(
        sa.table(
            'intent_definitions',
            sa.column('id', sa.String),
            sa.column('intent', sa.String),
            sa.column('action_type', sa.String),
            sa.column('risk_level', sa.String),
            sa.column('next_state', sa.String),
            sa.column('required_slots', postgresql.JSONB),
            sa.column('guardrails', postgresql.JSONB),
            sa.column('primary_tool', sa.String),
            sa.column('allowed_tools', postgresql.JSONB),
            schema='ai'
        ),
        seed_records
    )


def downgrade() -> None:
    op.drop_index('ix_ai_intent_definitions_intent', table_name='intent_definitions', schema='ai')
    op.drop_table('intent_definitions', schema='ai')
