from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class AgentToolCatalog(Base):
    """DB-backed capability catalog: single source of truth for what store
    capabilities exist and which are exposed to AI agents.

    exposure_state lifecycle:
      - tracked : implemented as a hand-written FunctionTool in
                  src/tools/definitions (registry is the source of truth;
                  row exists only for coverage/drift reporting — never
                  re-registered from here).
      - draft   : backend capability auto-discovered by the drift detector
                  (or curated but not yet activated). Reads may be
                  auto-activated; writes await one-click merchant review.
      - active  : exposed to agents through the generic bridge executor.
      - hidden  : explicitly excluded from agents.

    risk_level drives the approval gate: write → always_require (merchant
    approval card), read/direct_write → never_require.
    """

    __tablename__ = "agent_tool_catalog"
    __table_args__: ClassVar[dict[str, str]] = {"schema": "ai"}

    name: Mapped[str] = mapped_column(String(120), primary_key=True)
    domain: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    usage_hint_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    endpoint: Mapped[str | None] = mapped_column(String(300), nullable=True)
    http_method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    input_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    path_params: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    permission_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    app_slug: Mapped[str | None] = mapped_column(String(100), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="read")
    exposure_state: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", index=True)
    roles: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="auto")
    catalog_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
