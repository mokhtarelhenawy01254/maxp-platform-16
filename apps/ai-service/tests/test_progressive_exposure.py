from __future__ import annotations

from unittest.mock import ANY, AsyncMock, MagicMock, patch

import pytest
from agent_framework import FunctionInvocationContext

from src.agents.base import BaseAgent, BaseAgentConfig
from src.tools.gateway import ToolGateway, ToolResultStatus
from src.skills.registry import get_skill_registry
from src.tools.registry import (
    ADVANCED_TOOLS,
    CORE_TOOLS,
    DiscountCreateInput,
    ProductSearchInput,
    UnlockAdvancedToolsInput,
    unlock_advanced_tools,
    unlock_advanced_tools_tool,
)
from src.tools.sdk_gateway import (
    is_gateway_managed_tool,
    requires_sdk_approval,
    wrap_tool_for_gateway,
    wrap_tools_for_gateway,
)


# ---------------------------------------------------------------------------
# Tool separation -- agent starts with CORE_TOOLS only
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
# unlock_advanced_tools -- direct function unit tests
# ---------------------------------------------------------------------------


class TestUnlockAdvancedToolsUnit:
    """Direct tests of the unlock_advanced_tools function."""

    @pytest.mark.asyncio
    async def test_without_approval_returns_awaiting_approval_and_excludes_hr(self):
        """When called without approval, tool returns awaiting_approval and strictly excludes HR/payroll tools."""
        input_data = UnlockAdvancedToolsInput(reason="Need deep analysis")
        result = await unlock_advanced_tools(input_data)

        assert result["status"] == "awaiting_approval"
        assert result["action_type"] == "unlock_advanced_tools"
        assert "action_args" in result
        assert result["action_args"]["approved"] is True
        assert "STORE_MANAGER_ADVANCED" in result["action_args"]["scope_info"]
        scoped = result["action_args"]["scoped_tools"]
        assert len(scoped) > 0
        assert all(not name.startswith(("hr_", "payroll_", "internal_")) for name in scoped)

    @pytest.mark.asyncio
    async def test_with_ctx_injects_scoped_advanced_tools_when_approved(self):
        """When approved, tool injects scoped advanced tools into ctx excluding HR/payroll."""
        mock_ctx = MagicMock(spec=FunctionInvocationContext)

        input_data = UnlockAdvancedToolsInput(reason="Need deep analysis", approved=True)
        result = await unlock_advanced_tools(input_data, ctx=mock_ctx)

        mock_ctx.add_tools.assert_called_once()
        called_args = mock_ctx.add_tools.call_args[0][0]
        unlocked_names = [t.name for t in called_args]
        assert all(not name.startswith(("hr_", "payroll_", "internal_")) for name in unlocked_names)

        assert result["status"] == "SUCCESS"
        assert result["scope"] == "STORE_MANAGER_ADVANCED"
        assert result["unlocked_tools"] == unlocked_names

    @pytest.mark.asyncio
    async def test_without_ctx_returns_success_gracefully_when_approved(self):
        """Pipeline path: ctx is None, tool still returns success when approved."""
        input_data = UnlockAdvancedToolsInput(reason="test", approved=True)
        result = await unlock_advanced_tools(input_data)

        assert result["status"] == "SUCCESS"
        assert result["scope"] == "STORE_MANAGER_ADVANCED"
        assert all(not name.startswith(("hr_", "payroll_", "internal_")) for name in result["unlocked_tools"])


# ---------------------------------------------------------------------------
# Gateway chain -- ToolGateway passes ctx through to the original function
# ---------------------------------------------------------------------------


class TestGatewayCtxInjection:
    """Verify the full gateway -> registry -> original function chain with ctx."""

    @pytest.mark.asyncio
    async def test_gateway_routes_to_awaiting_approval_without_approval(self):
        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            input_data={"reason": "Need advanced tools"},
        )
        assert result["status"] == ToolResultStatus.AWAITING_APPROVAL

    @pytest.mark.asyncio
    async def test_gateway_passes_ctx_to_unlock_advanced_tools_when_approved(self):
        mock_ctx = MagicMock(spec=FunctionInvocationContext)

        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            input_data={"reason": "Need advanced tools", "approved": True},
            ctx=mock_ctx,
        )

        assert result["status"] == ToolResultStatus.SUCCESS
        mock_ctx.add_tools.assert_called_once()
        called_args = mock_ctx.add_tools.call_args[0][0]
        assert all(not t.name.startswith(("hr_", "payroll_", "internal_")) for t in called_args)

    @pytest.mark.asyncio
    async def test_gateway_without_ctx_still_works_when_approved(self):
        """Pipeline path: ToolGateway.execute handles ctx=None when approved."""
        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            input_data={"reason": "test", "approved": True},
        )

        assert result["status"] == ToolResultStatus.SUCCESS
        assert result["result"]["scope"] == "STORE_MANAGER_ADVANCED"

    def test_gateway_inspects_func_signature_for_ctx_parameter(self):
        """ToolGateway should detect ctx parameter in unlock_advanced_tools."""
        import inspect
        tool = unlock_advanced_tools_tool
        sig = inspect.signature(tool.func)
        assert "ctx" in sig.parameters


# ---------------------------------------------------------------------------
# SDK Gateway -- wraps tools correctly
# ---------------------------------------------------------------------------


class TestSDKGatewayWrapping:
    """Verify wrap_tool_for_gateway produces correct approval behavior."""

    def _resolve(self, name: str):
        return get_skill_registry().resolve(name)

    def test_write_tool_is_gateway_managed(self):
        write_tool = self._resolve("discount_create")
        assert write_tool is not None
        assert is_gateway_managed_tool(write_tool) is True

    def test_write_tool_requires_sdk_approval(self):
        write_tool = self._resolve("discount_create")
        assert write_tool is not None
        assert requires_sdk_approval(write_tool) is True

    def test_read_tool_does_not_require_sdk_approval(self):
        read_tool = self._resolve("product_search")
        assert read_tool is not None
        assert requires_sdk_approval(read_tool) is False

    @pytest.mark.asyncio
    async def test_write_tool_wrapped_returns_awaiting_approval(self):
        """Write tools routed through gateway return awaiting_approval
        because approval_granted is False -- they need merchant approval."""
        write_tool = self._resolve("discount_create")
        wrapped = wrap_tool_for_gateway(
            write_tool,
            company_id="test_co",
            agent_role="SALES",
            allowed_tools=["discount_create"],
        )

        result = await wrapped.func(
            DiscountCreateInput(
                product_id="prod_1",
                discount_percent=15,
                reason="test",
                company_id="test_co",
            ),
        )
        assert result["status"] == "awaiting_approval"

    @pytest.mark.asyncio
    async def test_read_tool_wrapped_executes_normally(self):
        """Read tools routed through gateway execute normally
        because approval_granted is True for read tools."""
        read_tool = self._resolve("product_search")
        wrapped = wrap_tool_for_gateway(
            read_tool,
            company_id="test_co",
            agent_role="SUPPORT",
            allowed_tools=["product_search"],
        )

        result = await wrapped.func(
            ProductSearchInput(
                query="test",
                company_id="test_co",
            ),
        )
        # Read tools should execute (may return success or error, but not awaiting_approval/forbidden)
        assert result["status"] not in ("awaiting_approval", "forbidden")


# ---------------------------------------------------------------------------
# Multi-turn simulation -- progressive unlock across conversation turns
# ---------------------------------------------------------------------------


class TestMultiTurnProgressiveExposure:
    """Simulate the multi-turn SDK runtime flow using a real
    FunctionInvocationContext with a live tool list (as the SDK does)."""

    @pytest.mark.asyncio
    async def test_unlock_mutates_live_tool_list(self):
        """Turn 1: call unlock -> ctx.add_tools mutates the original list."""
        live_tools = list(CORE_TOOLS)
        core_names = {t.name for t in CORE_TOOLS}
        advanced_names = {t.name for t in ADVANCED_TOOLS}

        # Build a real FunctionInvocationContext sharing the live list
        ctx = FunctionInvocationContext(
            function=MagicMock(),
            arguments={},
            tools=live_tools,
        )

        input_data = UnlockAdvancedToolsInput(reason="Need competitor analysis", approved=True)
        result = await unlock_advanced_tools(input_data, ctx=ctx)

        assert result["status"] == "SUCCESS"

        # After unlock, the live_tools list now includes scoped advanced tools (excluding HR/payroll)
        scoped_advanced_names = {
            t.name for t in ADVANCED_TOOLS
            if not t.name.startswith(("hr_", "payroll_", "internal_"))
        }
        live_names = {t.name for t in live_tools}
        assert core_names.issubset(live_names)
        assert scoped_advanced_names.issubset(live_names)
        assert all(not name.startswith(("hr_", "payroll_", "internal_")) for name in live_names - core_names)

    @pytest.mark.asyncio
    async def test_idempotent_unlock_does_not_duplicate_tools(self):
        """Calling unlock twice with same tools is safe -- no duplicates."""
        live_tools = list(CORE_TOOLS)
        ctx = FunctionInvocationContext(
            function=MagicMock(),
            arguments={},
            tools=live_tools,
        )

        input_data = UnlockAdvancedToolsInput(reason="first unlock", approved=True)
        await unlock_advanced_tools(input_data, ctx=ctx)

        before_count = len(live_tools)

        # Second unlock
        input_data2 = UnlockAdvancedToolsInput(reason="unlock again", approved=True)
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
            UnlockAdvancedToolsInput(reason="test", approved=True), ctx=ctx,
        )

        scoped_advanced_names = {
            t.name for t in ADVANCED_TOOLS
            if not t.name.startswith(("hr_", "payroll_", "internal_"))
        }
        live_names = {t.name for t in live_tools}
        for adv_name in scoped_advanced_names:
            assert adv_name in live_names


# ---------------------------------------------------------------------------
# Gateway permission boundary -- advanced tools blocked before unlock
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

        # Without approval, it routes to AWAITING_APPROVAL (allowed tool, but write/unlock gate requires merchant approval)
        result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            agent_role="SUPPORT",
            allowed_tools=core_tool_names,
            input_data={"reason": "test"},
        )

        assert result["status"] == ToolResultStatus.AWAITING_APPROVAL

        # With approval, it executes successfully
        approved_result = await ToolGateway().execute(
            tool_name="unlock_advanced_tools",
            company_id="test_co",
            agent_role="SUPPORT",
            allowed_tools=core_tool_names,
            input_data={"reason": "test", "approved": True},
        )

        assert approved_result["status"] == ToolResultStatus.SUCCESS
