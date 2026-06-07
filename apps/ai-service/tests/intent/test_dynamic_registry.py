from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from src.intent.dynamic_registry import DynamicIntentRegistry
from src.db.models.intent import IntentDefinition
from src.intent.schema import INTENT_ENUM, INTENT_POLICIES, INTENT_CONFIGURED_TOOLS


@pytest.mark.asyncio
async def test_registry_loads_intents_from_db():
    registry = DynamicIntentRegistry()

    # Create mock intent definitions
    mock_def1 = IntentDefinition(
        id="1",
        intent="custom.order_status",
        action_type="read",
        risk_level="medium",
        next_state="read_order_data",
        required_slots=["order_id"],
        guardrails=["tenant_scope"],
        primary_tool="order_lookup",
        allowed_tools=["order_lookup", "customer_info"],
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_def1]
    mock_session.execute.return_value = mock_result

    await registry.load_intents(mock_session)

    assert registry._is_loaded is True
    assert "custom.order_status" in registry.get_intent_enum()
    
    policy = registry.get_policy("custom.order_status")
    assert policy["actionType"] == "read"
    assert policy["riskLevel"] == "medium"
    assert policy["requiredSlots"] == ["order_id"]
    assert policy["guardrails"] == ["tenant_scope"]

    tools = registry.get_configured_tools("custom.order_status")
    assert tools["primaryTool"] == "order_lookup"
    assert tools["allowedTools"] == ["order_lookup", "customer_info"]


@pytest.mark.asyncio
async def test_registry_fallback_on_empty_db():
    registry = DynamicIntentRegistry()

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    # DB returns empty list
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    await registry.load_intents(mock_session)

    assert registry._is_loaded is True
    assert registry.get_intent_enum() == INTENT_ENUM
    assert registry.get_policy("orders.create_draft")["actionType"] == "write"
    assert registry.get_configured_tools("orders")["primaryTool"] == "order_lookup"


@pytest.mark.asyncio
async def test_registry_fallback_on_query_exception():
    registry = DynamicIntentRegistry()

    mock_session = AsyncMock(spec=AsyncSession)
    # execute raises an exception (e.g. table not created yet)
    mock_session.execute.side_effect = Exception("Table not found")

    await registry.load_intents(mock_session)

    assert registry._is_loaded is True
    assert registry.get_intent_enum() == INTENT_ENUM
    assert registry.get_policy("orders.create_draft")["actionType"] == "write"
    assert registry.get_configured_tools("orders")["primaryTool"] == "order_lookup"


def test_registry_unloaded_sync_methods_fallback():
    registry = DynamicIntentRegistry()
    # is_loaded is False, sync methods should use schema fallbacks
    assert registry.get_intent_enum() == INTENT_ENUM
    assert registry.get_policy("orders.create_draft")["actionType"] == "write"
    assert registry.get_configured_tools("orders")["primaryTool"] == "order_lookup"
