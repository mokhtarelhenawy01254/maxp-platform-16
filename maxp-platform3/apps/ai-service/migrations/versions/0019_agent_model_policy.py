from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add model_policy column
    op.add_column(
        "agents",
        sa.Column(
            "model_policy",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        schema="ai",
    )

    # 2. Backfill existing agents from their linked templates if available
    op.execute(
        """
        UPDATE ai.agents a
        SET model_policy = t.model_policy
        FROM ai.agent_templates t
        WHERE a.template_slug = t.slug
        AND a.model_policy = '{}'::jsonb
        """
    )


def downgrade() -> None:
    op.drop_column("agents", "model_policy", schema="ai")
