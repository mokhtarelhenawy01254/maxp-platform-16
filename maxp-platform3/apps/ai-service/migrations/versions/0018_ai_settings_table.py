from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_settings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("companyId", sa.String(), nullable=False),
        sa.Column("autoReplyEnabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("promptTemplate", sa.Text(), nullable=True),
        sa.Column("responseRules", sa.Text(), nullable=True),
        sa.Column("modelSettings", sa.Text(), nullable=True),
        sa.Column("writeToolScopes", sa.Text(), nullable=True),
        sa.Column(
            "humanApprovalRequiredForWrite", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column("maxRepliesPerCustomer", sa.Integer(), nullable=False, server_default=sa.text("5")),
        sa.Column("autoFilterEnabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("negativeKeywords", sa.Text(), nullable=True),
        sa.Column("negativeCommentAction", sa.String(), nullable=False, server_default=sa.text("'hide'")),
        sa.Column(
            "createdAt", postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updatedAt", postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("companyId"),
        schema="ai",
    )
    op.create_index(None, "ai_settings", ["companyId"], schema="ai")

    op.execute(
        """
        INSERT INTO ai.ai_settings (id, "companyId", "autoReplyEnabled", "promptTemplate",
                                    "responseRules", "modelSettings", "writeToolScopes",
                                    "humanApprovalRequiredForWrite", "maxRepliesPerCustomer",
                                    "autoFilterEnabled", "negativeKeywords", "negativeCommentAction",
                                    "createdAt", "updatedAt")
        SELECT id, "companyId", "autoReplyEnabled", "promptTemplate",
               "responseRules", "modelSettings", "writeToolScopes",
               "humanApprovalRequiredForWrite", "maxRepliesPerCustomer",
               "autoFilterEnabled", "negativeKeywords", "negativeCommentAction",
               "createdAt", "updatedAt"
        FROM public.ai_settings
        ON CONFLICT ("companyId") DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("ai_settings", schema="ai")
