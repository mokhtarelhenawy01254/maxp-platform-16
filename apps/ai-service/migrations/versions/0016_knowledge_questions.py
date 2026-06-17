from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_questions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("company_id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=True),
        sa.Column("channel", sa.String(), nullable=True),
        sa.Column("customer_question", sa.Text(), nullable=False),
        sa.Column("context", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("merchant_answer", sa.Text(), nullable=True),
        sa.Column("answered_by", sa.String(), nullable=True),
        sa.Column("answered_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("knowledge_embedding_id", sa.String(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        schema="ai",
    )
    op.create_index(
        "ix_knowledge_questions_company_status",
        "knowledge_questions",
        ["company_id", "status"],
        schema="ai",
    )
    op.create_index(
        "ix_knowledge_questions_status",
        "knowledge_questions",
        ["status"],
        schema="ai",
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_questions_status", table_name="knowledge_questions", schema="ai")
    op.drop_index("ix_knowledge_questions_company_status", table_name="knowledge_questions", schema="ai")
    op.drop_table("knowledge_questions", schema="ai")
