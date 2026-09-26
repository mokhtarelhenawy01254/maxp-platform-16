from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from src.tools.definitions._unlock import (
    UnlockAdvancedToolsInput,
    unlock_advanced_tools,
)
from src.tools.definitions.tenant_learning import (
    ManageAgentSkillInput,
    manage_agent_skill,
    RecordLearnedRuleInput,
    record_learned_rule,
    UpdateAgentIdentityInput,
    update_agent_identity,
)
from src.tools.registry import WRITE_TOOL_NAMES, get_tool


class TestCopilotToolGovernanceRegistry:
    """Verify that all self-modification and privilege escalation tools require approval in registry."""

    def test_governance_tools_in_write_tool_names(self):
        expected_tools = {
            "manage_agent_skill",
            "record_learned_rule",
            "update_agent_identity",
            "unlock_advanced_tools",
        }
        for name in expected_tools:
            assert name in WRITE_TOOL_NAMES
            tool = get_tool(name)
            assert tool is not None
            assert getattr(tool, "approval_mode", None) == "always_require"


class TestUnlockAdvancedToolsGovernance:
    """Verify unlock_advanced_tools security, scoping, and reversibility (BUG-3 / OWASP LLM06)."""

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    async def test_unlock_without_approval_returns_awaiting_approval(self, mock_audit):
        inp = UnlockAdvancedToolsInput(
            reason="Need competitor and sales deep analysis",
            company_id="comp_123",
            approved=False,
        )
        res = await unlock_advanced_tools(inp)

        assert res["status"] == "awaiting_approval"
        assert res["action_type"] == "unlock_advanced_tools"
        assert res["company_id"] == "comp_123"
        assert "action_args" in res
        assert res["action_args"]["approved"] is True
        assert "STORE_MANAGER_ADVANCED" in res["action_args"]["scope_info"]

        # Scope restriction: HR and payroll must be strictly excluded
        scoped = res["action_args"]["scoped_tools"]
        assert len(scoped) > 0
        for tool_name in scoped:
            assert not tool_name.startswith("hr_")
            assert not tool_name.startswith("payroll_")
            assert not tool_name.startswith("internal_")

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "ADVANCED_TOOLS_UNLOCK_REQUESTED"

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    async def test_unlock_when_approved_executes_and_scopes_tools(self, mock_audit):
        mock_ctx = MagicMock()
        inp = UnlockAdvancedToolsInput(
            reason="Approved analysis",
            company_id="comp_123",
            approved=True,
        )
        res = await unlock_advanced_tools(inp, ctx=mock_ctx)

        assert res["status"] == "SUCCESS"
        assert res["scope"] == "STORE_MANAGER_ADVANCED"
        assert all(not name.startswith(("hr_", "payroll_", "internal_")) for name in res["unlocked_tools"])
        mock_ctx.add_tools.assert_called_once()

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "ADVANCED_TOOLS_UNLOCKED"

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    async def test_unlock_reversibility_via_lock(self, mock_audit):
        inp = UnlockAdvancedToolsInput(
            reason="Task finished",
            company_id="comp_123",
            action="lock",
            approved=True,
        )
        res = await unlock_advanced_tools(inp)

        assert res["status"] == "SUCCESS"
        assert res["scope"] == "LOCKED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "ADVANCED_TOOLS_REVOKED"


class TestRecordLearnedRuleGovernance:
    """Verify record_learned_rule approval gate and audit trail."""

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    async def test_record_rule_without_approval_returns_awaiting_approval(self, mock_audit):
        inp = RecordLearnedRuleInput(
            company_id="comp_123",
            rule_category="SALES",
            rule_title="خصم الكميات للجملة",
            rule_instructions="عرض خصم 10% عند طلب 3 قطع أو أكثر",
            approved=False,
        )
        res = await record_learned_rule(inp)

        assert res["status"] == "awaiting_approval"
        assert res["action_type"] == "record_learned_rule"
        assert res["action_args"]["approved"] is True
        assert res["action_args"]["rule_title"] == "خصم الكميات للجملة"

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "LEARNED_RULE_REQUESTED"


class TestManageAgentSkillGovernance:
    """Verify manage_agent_skill approval gate, audit trail, and reversibility."""

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    @patch("src.db.session.async_session")
    async def test_manage_skill_create_without_approval_returns_awaiting_approval(self, mock_sess, mock_audit):
        mock_session_obj = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        mock_session_obj.execute.return_value = mock_res
        mock_sess.return_value.__aenter__.return_value = mock_session_obj

        inp = ManageAgentSkillInput(
            company_id="comp_123",
            action="create",
            name="مهارة التسعير الديناميكي",
            instructions="تحليل هوامش الربح وتقديم عروض تسعير مرنة",
            approved=False,
        )
        res = await manage_agent_skill(inp)

        assert res["status"] == "awaiting_approval"
        assert res["action_type"] == "manage_agent_skill"
        assert res["action_args"]["approved"] is True
        assert res["action_args"]["name"] == "مهارة التسعير الديناميكي"

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "AGENT_SKILL_CREATE_REQUESTED"

    @pytest.mark.asyncio
    @patch("src.db.session.async_session")
    async def test_manage_skill_get_bypasses_approval(self, mock_sess):
        mock_session_obj = AsyncMock()
        mock_skill = MagicMock()
        mock_skill.id = "skill_1"
        mock_skill.name = "مهارة العروض"
        mock_skill.description = "وصف"
        mock_skill.instructions = "تعليمات"
        mock_skill.trigger_phrases = "عرض"
        mock_skill.allowed_tools = []
        mock_skill.enabled = True
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = mock_skill
        mock_session_obj.execute.return_value = mock_res
        mock_sess.return_value.__aenter__.return_value = mock_session_obj

        inp = ManageAgentSkillInput(
            company_id="comp_123",
            action="get",
            skill_id="skill_1",
            approved=False,
        )
        res = await manage_agent_skill(inp)

        assert res["success"] is True
        assert res["skill"]["id"] == "skill_1"
        assert res.get("status") != "awaiting_approval"


class TestUpdateAgentIdentityGovernance:
    """Verify update_agent_identity approval gate, audit trail, and reversibility."""

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    @patch("src.db.session.async_session")
    async def test_update_identity_without_approval_returns_awaiting_approval(self, mock_sess, mock_audit):
        mock_session_obj = AsyncMock()
        mock_agent = MagicMock()
        mock_agent.id = "agent_1"
        mock_agent.name = "المساعد التنفيذي"
        mock_agent.description = "مساعد المتجر"
        mock_agent.role = "MEDIA_BUYER"
        mock_agent.persona_meta = {}
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_agent
        mock_session_obj.execute.return_value = mock_res
        mock_sess.return_value.__aenter__.return_value = mock_session_obj

        inp = UpdateAgentIdentityInput(
            company_id="comp_123",
            name="عباس",
            title="خبير الإعلانات",
            approved=False,
        )
        res = await update_agent_identity(inp)

        assert res["status"] == "awaiting_approval"
        assert res["action_type"] == "update_agent_identity"
        assert res["action_args"]["approved"] is True
        assert res["action_args"]["name"] == "عباس"
        assert res["action_args"]["previous_name"] == "المساعد التنفيذي"

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "AGENT_IDENTITY_UPDATE_REQUESTED"

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    @patch("src.db.session.async_session")
    async def test_manage_skill_revert_restores_previous_revision(self, mock_sess, mock_audit):
        mock_session_obj = AsyncMock()
        mock_skill = MagicMock()
        mock_skill.id = "skill_1"
        mock_skill.name = "مهارة معدلة"
        mock_skill.description = "وصف جديد"
        mock_skill.instructions = "تعليمات جديدة"
        mock_skill.allowed_tools = []
        mock_skill.skill_metadata = {
            "revisions": [
                {
                    "name": "مهارة قديمة",
                    "description": "وصف قديم",
                    "instructions": "تعليمات قديمة",
                    "allowed_tools": ["product_search"],
                }
            ]
        }
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = mock_skill
        mock_session_obj.execute.return_value = mock_res
        mock_sess.return_value.__aenter__.return_value = mock_session_obj

        inp = ManageAgentSkillInput(
            company_id="comp_123",
            action="revert",
            skill_id="skill_1",
            approved=True,
        )
        res = await manage_agent_skill(inp)

        assert res["success"] is True
        assert res["action"] == "revert"
        assert mock_skill.name == "مهارة قديمة"
        assert mock_skill.description == "وصف قديم"
        assert mock_skill.instructions == "تعليمات قديمة"

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "AGENT_SKILL_REVERTED"

    @pytest.mark.asyncio
    @patch("src.tools.repositories.audit_repository.log_agent_audit_event", new_callable=AsyncMock)
    @patch("src.db.session.async_session")
    async def test_update_identity_revert_restores_previous_name(self, mock_sess, mock_audit):
        mock_session_obj = AsyncMock()
        mock_agent = MagicMock()
        mock_agent.id = "agent_1"
        mock_agent.name = "عباس"
        mock_agent.role = "MEDIA_BUYER"
        mock_agent.persona_meta = {
            "identity_history": [
                {"name": "المساعد الأصلي", "description": "وصف أصلي"}
            ]
        }
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_agent
        mock_session_obj.execute.return_value = mock_res
        mock_sess.return_value.__aenter__.return_value = mock_session_obj

        inp = UpdateAgentIdentityInput(
            company_id="comp_123",
            name="عباس",
            action="revert",
            approved=True,
        )
        res = await update_agent_identity(inp)

        assert res["success"] is True
        assert mock_agent.name == "المساعد الأصلي"

        mock_audit.assert_called_once()
        assert mock_audit.call_args[1]["action"] == "AGENT_IDENTITY_REVERTED"
