from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop old strict unique constraint
    op.drop_constraint("uq_company_agent_name", "agents", schema="ai", type_="unique")

    # 2. Create partial unique index excluding archived agents
    op.create_index(
        "uq_company_agent_name_active",
        "agents",
        ["company_id", "name"],
        unique=True,
        schema="ai",
        postgresql_where=sa.text("status != 'ARCHIVED'"),
    )


def downgrade() -> None:
    # 1. Drop partial unique index
    op.drop_index(
        "uq_company_agent_name_active",
        table_name="agents",
        schema="ai",
    )

    # 2. Re-create strict unique constraint
    op.create_unique_constraint(
        "uq_company_agent_name",
        "agents",
        ["company_id", "name"],
        schema="ai",
    )
