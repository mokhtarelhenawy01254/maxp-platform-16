"""Add AI provider/key management tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-03 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PROVIDERS = [
    ("GOOGLE", "Google Gemini", "openai_compat", "https://generativelanguage.googleapis.com/v1beta/openai/", "gemma-3-27b-it"),
    ("DEEPSEEK", "DeepSeek", "openai_compat", "https://api.deepseek.com", "deepseek-chat"),
    ("OPENAI", "OpenAI", "openai_compat", "https://api.openai.com/v1", "gpt-4o-mini"),
    ("ANTHROPIC", "Anthropic Claude", "anthropic_native", "https://api.anthropic.com", "claude-3-5-sonnet-20241022"),
    ("HUGGINGFACE", "HuggingFace", "openai_compat", "https://api-inference.huggingface.co/models", "meta-llama/Llama-3-8b-chat-hf"),
    ("OLLAMA", "Ollama (Local)", "openai_compat", "http://localhost:11434/v1", "llama3"),
    ("GROQ", "Groq", "openai_compat", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    ("OPENROUTER", "OpenRouter", "openai_compat", "https://openrouter.ai/api/v1", "meta-llama/llama-3.1-70b-instruct"),
    ("NVIDIA", "NVIDIA NIM", "openai_compat", "https://integrate.api.nvidia.com/v1", "meta/llama-3.1-70b-instruct"),
    ("CEREBRAS", "Cerebras", "openai_compat", "https://api.cerebras.ai/v1", "llama-3.3-70b"),
    ("GITHUB", "GitHub Models", "openai_compat", "https://models.inference.ai.azure.com", "gpt-4o-mini"),
    ("SAMBANOVA", "SambaNova", "openai_compat", "https://api.sambanova.ai/v1", "Meta-Llama-3.1-70B-Instruct"),
    ("MISTRAL", "Mistral AI", "openai_compat", "https://api.mistral.ai/v1", "mistral-large-latest"),
]


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS ai")

    op.create_table(
        "providers",
        sa.Column("name", sa.String(length=50), primary_key=True),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("adapter_type", sa.String(length=50), nullable=False),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("default_model", sa.String(length=200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        schema="ai",
    )

    op.create_table(
        "ai_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("api_key", sa.Text(), nullable=False),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("key_type", sa.String(length=20), nullable=False, server_default="CENTRAL"),
        sa.Column("company_id", sa.String(length=100), nullable=True),
        sa.Column("max_requests_per_day", sa.Integer(), nullable=False, server_default="1500"),
        sa.Column("current_usage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_used_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_tested_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_test_status", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["provider"], ["ai.providers.name"], ondelete="RESTRICT"
        ),
        sa.UniqueConstraint("provider", "name", name="uq_provider_key_name"),
        schema="ai",
    )
    op.create_index("ix_ai_keys_company_id", "ai_keys", ["company_id"], schema="ai")

    op.create_table(
        "ai_model_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_name", sa.String(length=200), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["key_id"], ["ai.ai_keys.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("key_id", "model_name", name="uq_key_model"),
        schema="ai",
    )
    op.create_index("ix_ai_model_configs_key_id", "ai_model_configs", ["key_id"], schema="ai")

    op.create_table(
        "global_ai_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("default_provider", sa.String(length=50), nullable=True),
        sa.Column("enable_failover", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "provider_priority",
            postgresql.ARRAY(sa.String(length=50)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("settings", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        schema="ai",
    )

    op.create_table(
        "provider_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("key_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("model", sa.String(length=200), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("company_id", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["key_id"], ["ai.ai_keys.id"], ondelete="SET NULL"
        ),
        schema="ai",
    )
    op.create_index("ix_provider_logs_provider", "provider_logs", ["provider"], schema="ai")
    op.create_index("ix_provider_logs_key_id", "provider_logs", ["key_id"], schema="ai")
    op.create_index("ix_provider_logs_created_at", "provider_logs", ["created_at"], schema="ai")

    op.bulk_insert(
        sa.table(
            "providers",
            sa.column("name", sa.String),
            sa.column("display_name", sa.String),
            sa.column("adapter_type", sa.String),
            sa.column("base_url", sa.Text),
            sa.column("default_model", sa.String),
            schema="ai",
        ),
        [
            {
                "name": name,
                "display_name": display,
                "adapter_type": adapter,
                "base_url": base_url,
                "default_model": default_model,
            }
            for name, display, adapter, base_url, default_model in PROVIDERS
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_provider_logs_created_at", table_name="provider_logs", schema="ai")
    op.drop_index("ix_provider_logs_key_id", table_name="provider_logs", schema="ai")
    op.drop_index("ix_provider_logs_provider", table_name="provider_logs", schema="ai")
    op.drop_table("provider_logs", schema="ai")
    op.drop_table("global_ai_config", schema="ai")
    op.drop_index("ix_ai_model_configs_key_id", table_name="ai_model_configs", schema="ai")
    op.drop_table("ai_model_configs", schema="ai")
    op.drop_index("ix_ai_keys_company_id", table_name="ai_keys", schema="ai")
    op.drop_table("ai_keys", schema="ai")
    op.drop_table("providers", schema="ai")
