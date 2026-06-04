from __future__ import annotations

import pytest
import respx
from httpx import Response

from src.tools.maxp_client import MaxPClient, redact_pii


def test_redact_pii_email():
    data = {"email": "test@example.com", "name": "Ahmed"}
    result = redact_pii(data)
    assert "[EMAIL]" in str(result)
    assert "test@example.com" not in str(result)


def test_redact_pii_phone():
    data = {"phone": "01234567890", "name": "Ali"}
    result = redact_pii(data)
    assert "[PHONE]" in str(result)
    assert "01234567890" not in str(result)


@pytest.mark.asyncio
async def test_call_tool_success():
    client = MaxPClient()
    with respx.mock as mock:
        route = mock.post("https://test.maxp.com/api/v1/ai-bridge/tools/execute").respond(
            json={"result": {"name": "Product A", "price": 100}}
        )
        result = await client.call_tool("product.search", "comp1", {"q": "test"})
        assert result["result"]["name"] == "Product A"
        request = route.calls.last.request
        assert request.headers["Authorization"] == "Bearer test-token"
        assert request.read() == b'{"toolName":"product.search","companyId":"comp1","input":{"q":"test"}}'


@pytest.mark.asyncio
async def test_call_tool_retry():
    client = MaxPClient()
    with respx.mock as mock:
        route = mock.post("https://test.maxp.com/api/v1/ai-bridge/tools/execute").mock(
            side_effect=[Response(503), Response(503), Response(200, json={"result": "ok"})]
        )
        result = await client.call_tool("product.search", "comp1", {})
        assert result["result"] == "ok"
        assert route.call_count == 3


@pytest.mark.asyncio
async def test_call_tool_fails_after_retries():
    client = MaxPClient()
    with respx.mock as mock:
        mock.post("https://test.maxp.com/api/v1/ai-bridge/tools/execute").respond(503)
        with pytest.raises(RuntimeError, match="failed after 3 retries"):
            await client.call_tool("product.search", "comp1", {})


@pytest.mark.asyncio
async def test_get_maxp_client_singleton():
    from src.tools.maxp_client import get_maxp_client

    client1 = get_maxp_client()
    client2 = get_maxp_client()
    assert client1 is client2


@pytest.mark.asyncio
async def test_create_draft_success():
    client = MaxPClient()
    with respx.mock as mock:
        route = mock.post("https://test.maxp.com/api/v1/ai-bridge/approvals/draft").respond(
            json={"draftId": "draft_123", "status": "pending"}
        )
        result = await client.create_draft(
            company_id="comp1",
            action_type="discount.create",
            action_args={"productId": "prod_1"},
            thread_id="thread_1",
        )
        assert result["draftId"] == "draft_123"
        request = route.calls.last.request
        assert request.headers["Authorization"] == "Bearer test-token"
        assert request.read() == (
            b'{"companyId":"comp1","actionType":"discount.create",'
            b'"actionArgs":{"productId":"prod_1"},"threadId":"thread_1"}'
        )


@pytest.mark.asyncio
async def test_create_draft_retry():
    client = MaxPClient()
    with respx.mock as mock:
        route = mock.post("https://test.maxp.com/api/v1/ai-bridge/approvals/draft").mock(
            side_effect=[Response(503), Response(503), Response(200, json={"draftId": "draft_123"})]
        )
        result = await client.create_draft("comp1", "discount.create", {}, "thread_1")
        assert result["draftId"] == "draft_123"
        assert route.call_count == 3
