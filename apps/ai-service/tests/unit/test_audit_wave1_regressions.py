"""Regression tests for agent-system audit Wave 1 (safe bug fixes).

Each test pins a bug that crashed or silently misbehaved on the live path.
"""
from __future__ import annotations

import inspect
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from src.llm.client import LLMClient, ProviderResponse
from src.llm.model_manager import ModelManager


# --- Gemini functionResponse.name -------------------------------------------

def test_gemini_function_response_uses_tool_name_not_content() -> None:
    client = LLMClient(provider="GOOGLE", model="gemini-2.5-flash", api_key="x")
    messages = [
        {"role": "user", "content": "price?"},
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {"id": "call_1", "function": {"name": "product_search", "arguments": {"q": "shirt"}}}
            ],
        },
        {"role": "tool", "tool_call_id": "call_1", "content": '{"price": 250}'},
    ]
    _, contents = client._gemini_contents(messages)
    fr = contents[-1]["parts"][0]["functionResponse"]
    assert fr["name"] == "product_search"
    assert fr["response"]["result"] == '{"price": 250}'


def test_gemini_function_response_prefers_explicit_name() -> None:
    client = LLMClient(provider="GOOGLE", model="gemini-2.5-flash", api_key="x")
    messages = [{"role": "tool", "name": "order_lookup", "tool_call_id": "zz", "content": "ok"}]
    _, contents = client._gemini_contents(messages)
    assert contents[0]["parts"][0]["functionResponse"]["name"] == "order_lookup"


# --- model_manager TTL units -------------------------------------------------

async def test_global_config_cache_ttl_is_in_seconds(monkeypatch) -> None:
    mm = ModelManager()
    mm._global_config_cache = {"cached": True}
    now = 1_000_000.0
    monkeypatch.setattr("src.llm.model_manager.time.time", lambda: now)

    # Loaded 5s ago -> still inside the 30s TTL -> served from cache.
    mm._global_config_last_loaded = now - 5
    assert await mm.get_global_ui_config() == {"cached": True}

    # Loaded 100s ago -> expired -> must NOT be served from cache any more.
    # (Previously the seconds delta was compared with a 30_000 "ms" constant,
    # so the cache effectively never expired.)
    mm._global_config_last_loaded = now - 100
    assert await mm.get_global_ui_config() != {"cached": True}


async def test_config_version_check_interval_is_in_seconds(monkeypatch) -> None:
    mm = ModelManager()
    now = 2_000_000.0
    monkeypatch.setattr("src.llm.model_manager.time.time", lambda: now)

    # Checked 1s ago (< 5s interval) -> early return, timestamp untouched.
    mm._config_version_last_checked = now - 1
    await mm.check_config_version()
    assert mm._config_version_last_checked == now - 1

    # Checked 60s ago (> 5s interval) -> must run and refresh the timestamp.
    mm._config_version_last_checked = now - 60
    await mm.check_config_version()
    assert mm._config_version_last_checked == now


# --- validate_reply re-prompt path (was ImportError) -------------------------

async def test_raw_llm_call_with_tools_no_import_error() -> None:
    from src.pipeline.stages import validate_reply

    fake_client = MagicMock()
    fake_client._llm_client = None  # prevent hasattr mock auto-creation
    fake_client.generate = AsyncMock(
        return_value=ProviderResponse(text="السعر 250 جنيه", tool_calls=[])
    )
    ctx = SimpleNamespace(
        llm_client=fake_client,
        agent=None,
        company_id="c1",
        executed_tools=[],
    )
    out = await validate_reply._raw_llm_call_with_tools(
        ctx, [{"role": "user", "content": "كام السعر؟"}]
    )
    assert out == "السعر 250 جنيه"
    fake_client.generate.assert_awaited_once()


# --- facebook_ads budget tool (was NameError: backend) -----------------------

def test_update_budget_defines_backend_before_use() -> None:
    from src.tools.definitions import facebook_ads

    src = inspect.getsource(facebook_ads.facebook_ad_update_budget)
    assert src.index("backend = get_backend_client()") < src.index(
        "backend.update_facebook_campaign_budget"
    )


# --- facebook_page_repository column names -----------------------------------

async def test_facebook_page_repository_uses_prisma_column_names() -> None:
    from src.tools.repositories.facebook_page_repository import FacebookPageRepository

    captured: dict[str, str] = {}

    async def _execute(stmt, params):
        captured["sql"] = str(stmt)
        return SimpleNamespace(first=lambda: ("tok",))

    session = MagicMock()
    session.execute = _execute
    repo = FacebookPageRepository(session)
    assert await repo.get_page_token("c1", "p1") == "tok"
    sql = captured["sql"]
    assert '"pageAccessToken"' in sql and '"pageId"' in sql and '"companyId"' in sql
    assert "page_access_token" not in sql and "company_id" not in sql


# --- canonical_tool_name handoff alias ---------------------------------------

def test_canonical_tool_name_normalizes_handoff() -> None:
    from src.tools.names import canonical_tool_name

    assert canonical_tool_name("agent.handoff") == "agent_handoff_to"
    assert canonical_tool_name("agent.handoff.to") == "agent_handoff_to"
    assert canonical_tool_name("agent_handoff") == "agent_handoff_to"
    assert canonical_tool_name("agent_handoff_to") == "agent_handoff_to"
    assert canonical_tool_name("product.search") == "product_search"


# --- escalation preservation in SDK workflow snapshot ------------------------

def test_workflow_snapshot_preserves_escalation() -> None:
    from src.pipeline.context import PipelineContext
    from src.pipeline.sdk_workflow import PipelineWorkflowSnapshot

    ctx = PipelineContext(
        message="test",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
    )
    ctx.escalation_requested = True
    ctx.escalation_reason = "hallucination_repeated"
    ctx.llm_response = "invented reply"

    snap = PipelineWorkflowSnapshot.from_context(ctx)
    assert snap.escalation_requested is True
    assert snap.escalation_reason == "hallucination_repeated"

    restored = snap.to_context()
    assert restored.escalation_requested is True
    assert restored.escalation_reason == "hallucination_repeated"


# --- validate_reply clears llm_response on escalation -----------------------

async def test_validate_reply_clears_llm_response_on_escalation() -> None:
    from src.pipeline.context import PipelineContext
    from src.pipeline.stages.validate_reply import validate_reply

    ctx = PipelineContext(
        message="سعر ايه؟",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
    )
    ctx.escalation_requested = True
    ctx.escalation_reason = "forced_escalation_test"
    ctx.llm_response = "hallucinated price 9999"
    ctx.final_reply = "hallucinated price 9999"

    res = await validate_reply(ctx)
    assert res.escalation_requested is True
    assert res.final_reply is None
    assert res.llm_response == ""


# --- runtime agent loads allowed_tools first --------------------------------

def test_build_runtime_agent_reads_allowed_tools_first() -> None:
    from src.workflows.orchestration_flow import _build_runtime_agent_from_db

    fake_agent = SimpleNamespace(
        id="a1",
        name="Sales Bot",
        role="SALES",
        company_id="c1",
        allowed_tools=["product_search", "order_lookup"],
        skills=["old_legacy_tool"],
        channels=["whatsapp"],
        model="deepseek-flash",
        template_slug="sales-agent",
        config={},
    )
    agent, tools = _build_runtime_agent_from_db(fake_agent)
    assert tools == ["product_search", "order_lookup"]
    assert "old_legacy_tool" not in tools


# --- customer channel safety gate -------------------------------------------

def test_customer_channel_empty_allowlist_never_leaks_all_tools() -> None:
    from src.pipeline.context import PipelineContext
    from src.pipeline.stages.skills_pipeline import _filter_skills_for_agent
    from src.skills.registry import get_skill_registry
    from src.tools.registry import CORE_TOOL_NAMES

    reg = get_skill_registry()
    ctx = PipelineContext(
        message="hi",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        is_customer_channel=True,
    )
    ctx.agent = SimpleNamespace(
        id="a1",
        name="Empty Bot",
        role="UNKNOWN",
        allowed_tools=[],
        allowed_skills=[],
    )
    skills = _filter_skills_for_agent(ctx, reg)
    skill_names = {s.name.lower() for s in skills}
    # Must only contain core customer tools, never full platform tools (like HR/Finance/Audit)
    assert skill_names.issubset(CORE_TOOL_NAMES)


# --- tenant isolation in _load_agent_for_files ------------------------------

async def test_load_agent_for_files_enforces_company_id() -> None:
    from src.api.admin.agents import _load_agent_for_files

    captured_stmt: list[str] = []

    async def _mock_execute(stmt):
        captured_stmt.append(str(stmt))
        return SimpleNamespace(scalar_one_or_none=lambda: None)

    session = AsyncMock()
    session.execute = _mock_execute

    await _load_agent_for_files("agent_123", "company_real", session)
    assert len(captured_stmt) == 1
    # SQL must filter by both id and company_id
    assert "company_id" in captured_stmt[0] or "agents.company_id" in captured_stmt[0]


# --- tenant isolation: authoritative company_id over LLM arguments ---------

async def test_skills_pipeline_overwrites_malicious_llm_company_id() -> None:
    from src.pipeline.context import PipelineContext
    from src.pipeline.stages.skills_pipeline import _execute_one_tool

    ctx = PipelineContext(
        message="check order",
        thread_id="t1",
        company_id="tenant_authentic",
        customer_id="cust1",
    )
    # LLM tries to access another tenant's order
    fake_tool_call = {
        "function": {
            "name": "order_lookup",
            "arguments": '{"order_id": "ord_999", "company_id": "tenant_victim"}',
        }
    }
    registry = MagicMock()
    fake_tool = MagicMock()
    fake_tool.func = AsyncMock(return_value={"status": "ok"})
    fake_tool.approval_mode = "automatic"
    registry.resolve.return_value = fake_tool

    await _execute_one_tool(ctx, registry, fake_tool_call)

    # Tool input_model must have been instantiated with tenant_authentic, NEVER tenant_victim
    passed_kwargs = fake_tool.input_model.call_args.kwargs
    assert passed_kwargs.get("company_id") == "tenant_authentic"



