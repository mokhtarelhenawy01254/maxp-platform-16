from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_templates",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        schema="ai",
    )


def downgrade() -> None:
    op.drop_column("agent_templates", "is_active", schema="ai")
