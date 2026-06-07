from __future__ import annotations

from unittest.mock import ANY, AsyncMock, MagicMock, patch

import pytest
from agent_framework import FunctionInvocationContext

from src.agents.base import BaseAgent, BaseAgentConfig
from src.tools.gateway import ToolGateway, ToolResultStatus
from src.tools.registry import (
    ADVANCED_TOOLS,
    CORE_TOOLS,
    unlock_advanced_tools,
    UnlockAdvancedToolsInput,
)
from src.tools.sdk_gateway import wrap_tools_for_gateway


# ---------------------------------------------------------------------------
# Tool separation — agent starts with CORE_TOOLS only
# ---------------------------------------------------------------------------


class TestToolSeparation:
    """Verify that Agents are initialized with only CORE_TOOLS."""

    def test_resolve_tools_returns_only_core_tools(self):
        config = BaseAgentConfig(
            id="test_agent", name="Test Agent", role="SUPPORT", company_id="test_company",
        )
        agent = BaseAgent(config)

        initial_tools = agent._resolve_tools()
        initial_names = {t.name for t in initial_tools}

        core_names = {t.name for t in CORE_TOOLS}
        advanced_names = {t.name for t in ADVANCED_TOOLS}

        assert initial_names == core_names
        assert initial_names.isdisjoint(advanced_names)
        assert "unlock_advanced_tools" in initial_names

    def test_resolve_tools_with_allowed_list(self):
        config = BaseAgentConfig(
            id="test_agent",
            name="Test Agent",
            role="SUPPORT",
            company_id="test_company",
            allowed_tools=["product_search", "order_lookup"],
        )
        agent = BaseAgent(config)

        resolved = agent._resolve_tools()
        resolved_names = {t.name for t in resolved}

        assert "product_search" in resolved_names
        assert "order_lookup" in resolved_names
        assert "unlock_advanced_tools" in resolved_names
        assert "inventory_check" not in resolved_names


# ---------------------------------------------------------------------------
# unlock_advanced_tools — direct function unit tests
# ---------------------------------------------------------------------------


class TestUnlockAdvancedToolsUnit:
    """Direct tests of the unlock_advanced_tools function."""

    @pytest.mark.asyncio
    async def test_with_ctx_injects_advanced_tools(self):
        mock_ctx = MagicMock(spec=FunctionInvocationContext)

        input_data = UnlockAdvancedToolsInput(reason="Need deep analysis")
        result = await unlock_advanced_tools(input_data, ctx=mock_ctx)

        mock_ctx.add_tools.assert_called_once()
        called_args = mock_ctx.add_tools.call_args[0][0]
        assert len(called_args) == len(ADVANCED_TOOLS)
        assert {t.name for t in called_args} == {t.name for t in ADVANCED_TOOLS}

        assert result["status"] == "SUCCESS"
        assert result["unlocked_tools"] == [t.name for t in ADVANCED_TOOLS]

    @pytest.mark.asyncio
    async def test_without_ctx_returns_success_gracefully(self):
        """Pipeline path: ctx is None, tool still returns success."""
        input_data = UnlockAdvancedToolsInput(reason="test")
        result = await unlock_advanced_tools(input_data)

        assert result["status"] == "SUCCESS"
        assert len(result["unlocked_tools"]) == len(ADVANCED_TOOLS)


# ---------------------------------------------------------------------------
# Gateway chain — ToolGateway passes ctx through to the original function
# ---------------------------------------------------------------------------


class TestGatewayCtxInjection:
    """Verify the full gateway → registry → original function chain with ctx."""

    @pytest.mark.asyncio
    async def test_gateway_passes_ctx_to_unlock_advanced_tools(self):
        mock_ctx = MagicMock(spec=FunctionInvocationContext)

        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            input_data={"reason": "Need advanced tools"},
            ctx=mock_ctx,
        )

        assert result["status"] == ToolResultStatus.SUCCESS
        mock_ctx.add_tools.assert_called_once()
        called_args = mock_ctx.add_tools.call_args[0][0]
        assert len(called_args) == len(ADVANCED_TOOLS)

    @pytest.mark.asyncio
    async def test_gateway_without_ctx_still_works(self):
        """Pipeline path: ToolGateway.execute handles ctx=None."""
        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            input_data={"reason": "test"},
        )

        assert result["status"] == ToolResultStatus.SUCCESS
        assert len(result["result"]["unlocked_tools"]) == len(ADVANCED_TOOLS)

    def test_gateway_inspects_func_signature_for_ctx_parameter(self):
        """ToolGateway checks the original function's signature before passing ctx."""
        import inspect

        from src.tools.registry import unlock_advanced_tools, product_search

        assert "ctx" in inspect.signature(unlock_advanced_tools).parameters
        assert "ctx" not in inspect.signature(product_search).parameters


# ---------------------------------------------------------------------------
# SDK Wrapper — _gateway_func signature enables native ctx injection
# ---------------------------------------------------------------------------


class TestSdkWrapperInjection:
    """When tools are wrapped for the gateway, the _gateway_func declares ctx
    so the SDK runtime can inject FunctionInvocationContext automatically."""

    def test_wrapped_unlock_tool_detects_context_parameter(self):
        """The wrapper's _gateway_func has ctx: FunctionInvocationContext | None,
        so the SDK will detect it and inject the context at runtime."""
        from src.tools.registry import unlock_advanced_tools_tool

        wrapped = wrap_tools_for_gateway(
            [unlock_advanced_tools_tool],
            company_id="test_co",
            agent_role="SUPPORT",
        )

        assert len(wrapped) == 1
        fw_tool = wrapped[0]
        assert getattr(fw_tool, "_context_parameter_name", None) == "ctx"

    def test_regular_tool_wrapper_also_detects_context_parameter(self):
        """All gateway-wrapped tools now have ctx in _gateway_func so
        the SDK can safely pass FunctionInvocationContext to every tool.
        Tools that don't need it simply ignore the parameter."""
        from src.tools.registry import product_search_tool

        wrapped = wrap_tools_for_gateway(
            [product_search_tool],
            company_id="test_co",
            agent_role="SUPPORT",
        )

        assert len(wrapped) == 1
        fw_tool = wrapped[0]
        # Every wrapped tool now declares ctx so the SDK runtime
        # can consistently inject FunctionInvocationContext
        assert getattr(fw_tool, "_context_parameter_name", None) == "ctx"


# ---------------------------------------------------------------------------
# End-to-end — process_task with progressive exposure
# ---------------------------------------------------------------------------


class TestProcessTaskProgressiveExposure:
    """Full flow: agent.build -> framework_agent.run -> progressive exposure."""

    @pytest.mark.asyncio
    async def test_agent_build_passes_core_tools_to_client(self):
        """Verify that when the framework Agent is built, the client receives
        only CORE_TOOLS (via build_agent_client)."""
        config = BaseAgentConfig(
            id="e2e_test", name="E2E Agent", role="SUPPORT", company_id="e2e_co",
        )
        agent = BaseAgent(config)

        with patch("src.agents.base.build_agent_client") as mock_client, \
             patch("src.agents.base.get_all_tools", return_value=[]):
            mock_client.return_value = MagicMock()
            agent.build()

        mock_client.assert_called_once()
        _call_args, _call_kwargs = mock_client.call_args
        passed_tools = _call_kwargs.get("tools", [])
        passed_names = {t.name for t in passed_tools}

        core_names = {t.name for t in CORE_TOOLS}
        advanced_names = {t.name for t in ADVANCED_TOOLS}

        assert passed_names == core_names
        assert passed_names.isdisjoint(advanced_names)
        assert "unlock_advanced_tools" in passed_names

    @pytest.mark.asyncio
    async def test_agent_build_passes_gateway_wrapped_tools_to_client(self):
        """The tools passed to the client are gateway-wrapped with ctx
        injection for SDK runtime."""
        config = BaseAgentConfig(
            id="e2e_test", name="E2E Agent", role="SUPPORT", company_id="e2e_co",
        )
        agent = BaseAgent(config)

        with patch("src.agents.base.build_agent_client") as mock_client, \
             patch("src.agents.base.get_all_tools", return_value=[]):
            mock_client.return_value = MagicMock()
            agent.build()

        _call_args, _call_kwargs = mock_client.call_args
        passed_tools = _call_kwargs.get("tools", [])

        unlock_tool = next(
            (t for t in passed_tools if t.name == "unlock_advanced_tools"),
            None,
        )
        assert unlock_tool is not None
        # The SDK will detect ctx parameter and inject FunctionInvocationContext
        assert getattr(unlock_tool, "_context_parameter_name", None) == "ctx"

    @pytest.mark.asyncio
    async def test_process_task_internal_task_has_unlock_tool_available(self):
        """Internal tasks running via SDK runtime have unlock_advanced_tools
        available in the tool list passed to the client."""
        config = BaseAgentConfig(
            id="e2e_test", name="E2E Agent", role="SUPPORT", company_id="e2e_co",
        )
        agent = BaseAgent(config)

        # Verify _resolve_tools includes unlock_advanced_tools
        resolved = agent._resolve_tools()
        resolved_names = {t.name for t in resolved}
        assert "unlock_advanced_tools" in resolved_names

        # Verify SDK runtime path uses these tools
        sdk_session = object()
        sdk_response = MagicMock()
        sdk_response.text = "sdk reply"
        sdk_response.user_input_requests = []

        framework_agent = MagicMock()
        framework_agent.create_session.return_value = sdk_session
        framework_agent.run = AsyncMock(return_value=sdk_response)

        with patch.object(agent, "build", return_value=framework_agent), \
             patch("src.agents.base.execute_pipeline", new=AsyncMock()) as pipeline:
            result = await agent.process_task({
                "description": "Analyze sales data",
                "job_id": "job_1",
            })

        assert result["status"] == "SUCCESS"
        assert result["result"]["runtime"] == "sdk_agent"
        pipeline.assert_not_called()


# ---------------------------------------------------------------------------
# Multi-turn simulation — progressive unlock across conversation turns
# ---------------------------------------------------------------------------


class TestMultiTurnProgressiveExposure:
    """Simulate the multi-turn SDK runtime flow using a real
    FunctionInvocationContext with a live tool list (as the SDK does)."""

    @pytest.mark.asyncio
    async def test_unlock_mutates_live_tool_list(self):
        """Turn 1: call unlock → ctx.add_tools mutates the original list."""
        live_tools = list(CORE_TOOLS)
        core_names = {t.name for t in CORE_TOOLS}
        advanced_names = {t.name for t in ADVANCED_TOOLS}

        # Build a real FunctionInvocationContext sharing the live list
        ctx = FunctionInvocationContext(
            function=MagicMock(),
            arguments={},
            tools=live_tools,
        )

        input_data = UnlockAdvancedToolsInput(reason="Need competitor analysis")
        result = await unlock_advanced_tools(input_data, ctx=ctx)

        assert result["status"] == "SUCCESS"

        # After unlock, the live_tools list now includes advanced tools
        live_names = {t.name for t in live_tools}
        assert core_names.issubset(live_names)
        assert advanced_names.issubset(live_names)

    @pytest.mark.asyncio
    async def test_idempotent_unlock_does_not_duplicate_tools(self):
        """Calling unlock twice with same tools is safe — no duplicates."""
        live_tools = list(CORE_TOOLS)
        ctx = FunctionInvocationContext(
            function=MagicMock(),
            arguments={},
            tools=live_tools,
        )

        input_data = UnlockAdvancedToolsInput(reason="first unlock")
        await unlock_advanced_tools(input_data, ctx=ctx)

        before_count = len(live_tools)

        # Second unlock
        input_data2 = UnlockAdvancedToolsInput(reason="unlock again")
        result2 = await unlock_advanced_tools(input_data2, ctx=ctx)

        assert result2["status"] == "SUCCESS"
        assert len(live_tools) == before_count  # no growth on duplicate add

    @pytest.mark.asyncio
    async def test_advanced_tool_names_visible_in_context_after_unlock(self):
        """After unlock, advanced tool names appear in the context's tool list."""
        live_tools = list(CORE_TOOLS)
        ctx = FunctionInvocationContext(
            function=MagicMock(),
            arguments={},
            tools=live_tools,
        )

        await unlock_advanced_tools(
            UnlockAdvancedToolsInput(reason="test"), ctx=ctx,
        )

        live_names = {t.name for t in live_tools}
        for adv_tool in ADVANCED_TOOLS:
            assert adv_tool.name in live_names


# ---------------------------------------------------------------------------
# Gateway permission boundary — advanced tools blocked before unlock
# ---------------------------------------------------------------------------


class TestPermissionBoundary:
    """Advanced tools should be unreachable through the gateway when only
    CORE_TOOLS are in the allowed list."""

    @pytest.mark.asyncio
    async def test_advanced_tool_forbidden_with_core_only_allowed(self):
        """Advanced tools return FORBIDDEN when allowed_tools has only core."""
        core_tool_names = [t.name for t in CORE_TOOLS]
        advanced_tool = ADVANCED_TOOLS[0]

        result = await ToolGateway().execute(
            tool_name=advanced_tool.name,
            company_id="test_co",
            agent_role="SUPPORT",
            allowed_tools=core_tool_names,
            input_data={},
        )

        assert result["status"] == ToolResultStatus.FORBIDDEN

    @pytest.mark.asyncio
    async def test_core_tool_allowed_with_core_only_allowed(self):
        """Core tools work normally when allowed_tools has core tools."""
        core_tool_names = [t.name for t in CORE_TOOLS]

        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            agent_role="SUPPORT",
            allowed_tools=core_tool_names,
            input_data={"reason": "test"},
        )

        assert result["status"] == ToolResultStatus.SUCCESS
