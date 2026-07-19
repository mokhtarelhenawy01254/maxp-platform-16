from __future__ import annotations

import structlog
from agent_framework.observability import OBSERVABILITY_SETTINGS, enable_instrumentation

logger = structlog.get_logger(__name__)


def setup_agent_runtime_observability() -> None:
    """Enable Microsoft Agent Framework runtime spans on MaxP's OTel provider."""
    enable_instrumentation(enable_sensitive_data=False)
    logger.info(
        "agent-framework observability enabled",
        enabled=OBSERVABILITY_SETTINGS.ENABLED,
        sensitive_data=OBSERVABILITY_SETTINGS.SENSITIVE_DATA_ENABLED,
    )
