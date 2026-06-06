from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.agents.middleware import MaxPFunctionAuditMiddleware
from src.services.agent_registry import AgentRegistry
from src.tools.registry import ProductCreateInput


@pytest.mark.asyncio
async def test_spawn_wraps_tools_with_gateway(monkeypatch):
    settings = MagicMock(default_model="gemini-2.5-flash", default_llm_provider="google")
    monkeypatch.setattr("src.services.agent_registry.get_settings", lambda: settings)
    monkeypatch.setattr(
        "src.services.agent_registry.build_agent_client_async",
        AsyncMock(return_value=MagicMock()),
    )

    registry = AgentRegistry()
    agent, agent_id = await registry.spawn(
        company_id="comp1",
        role="INVENTORY",
        allowed_tools=["product_create"],
        name="Inventory Agent",
    )

    tools = agent.default_options["tools"]
    middleware = getattr(agent, "middleware", [])
    result = await tools[0].func(
        ProductCreateInput(
            name="Shoe",
            price=100,
        )
    )

    assert agent_id.startswith("agent_")
    assert any(isinstance(item, MaxPFunctionAuditMiddleware) for item in middleware)
    assert result["status"] == "success"
    assert result["result"]["status"] == "awaiting_approval"
    assert result["result"]["action_type"] == "product.create"
    assert result["result"]["company_id"] == "comp1"
