from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.workflows.support_flow import run_support


@pytest.mark.asyncio
async def test_run_support_with_mock_agent():
    """Test run_support with a mocked agent."""
    mock_agent = MagicMock()
    mock_agent.name = "maxp_support_agent"
    mock_response = MagicMock()
    mock_response.__str__ = MagicMock(return_value="مرحباً! كيف يمكنني مساعدتك؟")

    mock_agent.run = AsyncMock(return_value=mock_response)
    mock_agent.create_session = AsyncMock()

    result = await run_support(
        message="مرحبا",
        thread_id="comp1:cust1:chat",
        company_id="comp1",
        customer_id="cust1",
        agent_override=mock_agent,
    )

    assert result["reply"] == "مرحباً! كيف يمكنني مساعدتك؟"
    assert result["thread_id"] == "comp1:cust1:chat"
    mock_agent.run.assert_awaited_once()
    mock_agent.create_session.assert_awaited_once_with(session_id="comp1:cust1:chat")
