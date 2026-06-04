from __future__ import annotations

from unittest.mock import MagicMock
import pytest
from pydantic import ValidationError

from src.contracts.response_schema import AgentResponse
from src.observability.context_metrics import compute_context_metrics
from src.pipeline.context import PipelineContext
from src.pipeline.stages.validate_reply import validate_reply


def test_agent_response_validation():
    # Test valid default structure
    resp = AgentResponse(reply="Hello World")
    assert resp.reply == "Hello World"
    assert resp.confidence == 1.0
    assert resp.action_taken is None
    assert resp.escalation_needed is False

    # Test custom values
    resp = AgentResponse(
        reply="Action taken",
        confidence=0.85,
        action_taken="order.cancel",
        escalation_needed=True,
        escalation_reason="User angry",
        metadata={"channel": "messenger"}
    )
    assert resp.confidence == 0.85
    assert resp.action_taken == "order.cancel"
    assert resp.escalation_needed is True
    assert resp.escalation_reason == "User angry"
    assert resp.metadata == {"channel": "messenger"}

    # Test validation boundaries (confidence ge 0.0, le 1.0)
    with pytest.raises(ValidationError):
        AgentResponse(reply="Test", confidence=1.2)

    with pytest.raises(ValidationError):
        AgentResponse(reply="Test", confidence=-0.1)


def test_compute_context_metrics():
    sys_prompt = "You are a helpful assistant."
    messages = [
        {"role": "user", "content": "How are you?"},
        {"role": "assistant", "content": "Fine, thanks."}
    ]
    tool_ctx = "Tool result for inventory.check:\n[Instock] Rel: 0.95\n"

    # Test Claude model context window utilization calculation
    metrics = compute_context_metrics(
        system_prompt=sys_prompt,
        messages=messages,
        tool_context=tool_ctx,
        model_name="claude-sonnet-4-6",
        original_history_tokens=100,
        compressed_history_tokens=50
    )

    # sys_prompt is 28 chars ~ 7 tokens
    # user content (12 chars ~ 3 tokens) + assistant content (12 chars ~ 3 tokens) = 6 tokens
    # tool_ctx is ~42 chars ~ 10 tokens
    # Total tokens = ~23 tokens
    # Claude context window = 200,000
    assert metrics.total_tokens > 10
    assert metrics.system_prompt_tokens > 0
    assert metrics.context_tokens > 0
    assert metrics.utilization_pct == round((metrics.total_tokens / 200000) * 100, 2)
    assert metrics.relevance_score == 0.95
    assert metrics.compression_ratio == 2.0  # 100 / 50

    # Test Gemini model context window (1,000,000)
    metrics_gemini = compute_context_metrics(
        system_prompt=sys_prompt,
        messages=messages,
        tool_context=tool_ctx,
        model_name="gemini-2.5-flash",
        original_history_tokens=0,
        compressed_history_tokens=0
    )
    assert metrics_gemini.utilization_pct == round((metrics_gemini.total_tokens / 1000000) * 100, 2)
    assert metrics_gemini.compression_ratio == 1.0


@pytest.mark.anyio
async def test_validate_reply_plain_text():
    ctx = PipelineContext(
        message="user msg",
        thread_id="thread_123",
        company_id="company_123",
        customer_id="cust_123"
    )
    ctx.llm_response = "Here is a standard text reply."
    ctx.system_prompt = "System instructions"
    ctx.messages = [{"role": "user", "content": "user msg"}]
    ctx.tool_context = "RAG document content (Rel: 0.88)"
    ctx.original_history_tokens = 40
    ctx.compressed_history_tokens = 20

    updated_ctx = await validate_reply(ctx)

    assert updated_ctx.final_reply == "Here is a standard text reply."
    assert isinstance(updated_ctx.response_contract, AgentResponse)
    assert updated_ctx.response_contract.reply == "Here is a standard text reply."
    assert updated_ctx.response_contract.confidence == 1.0
    
    # Check metrics
    assert updated_ctx.context_metrics is not None
    assert updated_ctx.context_metrics.relevance_score == 0.88
    assert updated_ctx.context_metrics.compression_ratio == 2.0


@pytest.mark.anyio
async def test_validate_reply_json_contract():
    json_response = """
    {
        "reply": "Resolved order successfully.",
        "confidence": 0.9,
        "action_taken": "order.confirm",
        "escalation_needed": false,
        "metadata": {"test": "value"}
    }
    """
    ctx = PipelineContext(
        message="user msg",
        thread_id="thread_123",
        company_id="company_123",
        customer_id="cust_123"
    )
    ctx.llm_response = json_response

    updated_ctx = await validate_reply(ctx)

    assert updated_ctx.final_reply == "Resolved order successfully."
    assert isinstance(updated_ctx.response_contract, AgentResponse)
    assert updated_ctx.response_contract.reply == "Resolved order successfully."
    assert updated_ctx.response_contract.confidence == 0.9
    assert updated_ctx.response_contract.action_taken == "order.confirm"
    assert updated_ctx.response_contract.metadata == {"test": "value"}
