from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from src.observability.cost import CostTier, check_cost_limit, get_daily_cost


@pytest.mark.asyncio
async def test_get_daily_cost_returns_float():
    session = AsyncMock()

    class MockResult:
        scalar = staticmethod(lambda: 0)

    session.execute.return_value = MockResult()

    cost = await get_daily_cost(session, "comp1")
    assert isinstance(cost, float)
    assert cost == 0.0


@pytest.mark.asyncio
async def test_check_cost_limit_returns_ok():
    session = AsyncMock()

    class MockResult:
        scalar = staticmethod(lambda: 0)

    session.execute.return_value = MockResult()

    with patch("src.observability.cost.get_settings") as mock_settings:
        settings = type("Settings", (), {"cost_soft_cap": 5.0, "cost_hard_cap": 20.0, "default_model": "claude-sonnet-4-6"})()
        mock_settings.return_value = settings

        tier = await check_cost_limit(session, "comp1")
        assert tier == CostTier.OK


@pytest.mark.asyncio
async def test_check_cost_limit_returns_enum():
    session = AsyncMock()

    class MockResult:
        scalar = staticmethod(lambda: 0)

    session.execute.return_value = MockResult()

    with patch("src.observability.cost.get_settings") as mock_settings:
        settings = type("Settings", (), {"cost_soft_cap": 5.0, "cost_hard_cap": 20.0, "default_model": "claude-sonnet-4-6"})()
        mock_settings.return_value = settings

        tier = await check_cost_limit(session, "comp1")
        assert isinstance(tier, CostTier)
