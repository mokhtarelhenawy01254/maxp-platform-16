from __future__ import annotations

from agent_framework.observability import OBSERVABILITY_SETTINGS

from src.observability.agent_runtime import setup_agent_runtime_observability


def test_setup_agent_runtime_observability_enables_sdk_spans():
    setup_agent_runtime_observability()

    assert OBSERVABILITY_SETTINGS.ENABLED is True
    assert OBSERVABILITY_SETTINGS.SENSITIVE_DATA_ENABLED is False
