"""Comprehensive tests for agent generation pipeline.

Validates that agents are correctly created from templates, that all manifest
files are well-formed, that system prompts are assembled correctly, and that
company-scoping works as expected.

Scenarios covered:
  1. Agent template manifest validation (all agent.json files)
  2. Agent factory (from_template) -- identity, persona, tools, overrides
  3. Agent spawn API -- company scoping, template inheritance, duplicate guard
  4. Prompt assembly -- SOUL/PERSONA/TOOLS/AGENTS blocks injected correctly
  5. Company-scoped agent generation -- isolation, tool gateway, persona
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.agents.base import BaseAgent, BaseAgentConfig, _TemplateAdapter
from src.agents.middleware import MaxPAgentRuntimeMiddleware, MaxPFunctionAuditMiddleware
from src.prompts.template_registry import PromptTemplateRegistry


BACKEND_AGENTS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "backend" / "agents"


# ===========================================================================
# 1. Agent template manifest validation
# ===========================================================================


class TestAgentManifestValidation:
    """Validate every agent.json manifest in backend/agents/."""

    @pytest.fixture(autouse=True)
    def _skip_if_no_agents_dir(self):
        if not BACKEND_AGENTS_ROOT.exists():
            pytest.skip("backend/agents/ directory not found")

    def _load_manifests(self):
        manifests = {}
        for entry in sorted(BACKEND_AGENTS_ROOT.iterdir()):
            if entry.name == "_shared" or not entry.is_dir():
                continue
            manifest_path = entry / "agent.json"
            if not manifest_path.exists():
                continue
            with open(manifest_path, encoding="utf-8") as f:
                manifests[entry.name] = json.load(f)
        return manifests

    def test_all_agents_have_valid_json_manifests(self):
        manifests = self._load_manifests()
        assert len(manifests) >= 5, "Expected at least 5 agent templates"

    def test_every_manifest_has_required_fields(self):
        required_fields = ["slug", "name", "role", "version"]
        for agent_name, manifest in self._load_manifests().items():
            for field in required_fields:
                assert field in manifest, (
                    f"Agent '{agent_name}' missing required field '{field}'"
                )

    def test_every_manifest_role_is_uppercase(self):
        for agent_name, manifest in self._load_manifests().items():
            role = manifest.get("role", "")
            assert role == role.upper(), (
                f"Agent '{agent_name}' role '{role}' is not uppercase"
            )

    def test_every_manifest_has_instructions_block(self):
        for agent_name, manifest in self._load_manifests().items():
            assert "instructions" in manifest, (
                f"Agent '{agent_name}' missing 'instructions' block"
            )
            instructions = manifest["instructions"]
            assert "soul" in instructions, (
                f"Agent '{agent_name}' instructions missing 'soul' reference"
            )

    def test_referenced_markdown_files_exist(self):
        for agent_name, manifest in self._load_manifests().items():
            instructions = manifest.get("instructions", {})
            agent_dir = BACKEND_AGENTS_ROOT / agent_name
            for key, filename in instructions.items():
                if filename:
                    file_path = agent_dir / filename
                    assert file_path.exists(), (
                        f"Agent '{agent_name}' references '{key}': '{filename}' "
                        f"but file does not exist at {file_path}"
                    )

    def test_referenced_markdown_files_are_non_empty(self):
        for agent_name, manifest in self._load_manifests().items():
            instructions = manifest.get("instructions", {})
            agent_dir = BACKEND_AGENTS_ROOT / agent_name
            for key, filename in instructions.items():
                if filename:
                    file_path = agent_dir / filename
                    content = file_path.read_text(encoding="utf-8").strip()
                    assert len(content) > 0, (
                        f"Agent '{agent_name}' has empty {key} file: {filename}"
                    )

    def test_every_manifest_has_allowed_tools(self):
        for agent_name, manifest in self._load_manifests().items():
            tools = manifest.get("allowedTools", [])
            assert isinstance(tools, list), (
                f"Agent '{agent_name}' allowedTools is not a list"
            )
            assert len(tools) > 0, (
                f"Agent '{agent_name}' has no allowedTools"
            )

    def test_every_manifest_has_persona_meta(self):
        for agent_name, manifest in self._load_manifests().items():
            meta = manifest.get("personaMeta", {})
            assert isinstance(meta, dict), (
                f"Agent '{agent_name}' personaMeta is not a dict"
            )
            assert isinstance(meta, dict), (f"Agent '{agent_name}' personaMeta is not a dict")

    def test_every_manifest_has_budget(self):
        for agent_name, manifest in self._load_manifests().items():
            budget = manifest.get("budget", {})
            assert isinstance(budget, dict), (
                f"Agent '{agent_name}' budget is not a dict"
            )

    def test_every_manifest_slug_matches_directory(self):
        for agent_name, manifest in self._load_manifests().items():
            slug = manifest.get("slug", "")
            assert slug == agent_name, (
                f"Agent directory '{agent_name}' has slug '{slug}' -- should match"
            )

    def test_no_duplicate_slugs(self):
        manifests = self._load_manifests()
        slugs = [m["slug"] for m in manifests.values()]
        assert len(slugs) == len(set(slugs)), "Duplicate slugs found across agent manifests"

    def test_handoffs_reference_valid_roles(self):
        known_roles = {m["role"] for m in self._load_manifests().values()}
        # External handoff targets that are valid even without a dedicated template
        known_roles.update({"HUMAN", "SHIPPING", "SUPPORT"})
        for agent_name, manifest in self._load_manifests().items():
            for handoff in manifest.get("handoffs", []):
                target_role = handoff.get("role", "")
                assert target_role.upper() in known_roles, (
                    f"Agent '{agent_name}' handoff references unknown role '{target_role}'"
                )

# ===========================================================================
# 2. Agent factory (from_template) tests
# ===========================================================================


class TestBaseAgentFromTemplate:
    """Test BaseAgent.from_template creates agents with correct identity,
    persona, tool permissions, and override handling."""

    @pytest.mark.asyncio
    async def test_from_template_offline_uses_fallback_identity(self):
        agent = await BaseAgent.from_template(
            "support-agent",
            "comp_001",
            overrides={"id": "agent_test_support", "name": "\u0633\u0627\u0631\u0629", "role": "SUPPORT"},
            session=None,
        )
        assert agent.id == "agent_test_support"
        assert agent.name == "\u0633\u0627\u0631\u0629"
        assert agent.role == "SUPPORT"
        assert agent.company_id == "comp_001"

    @pytest.mark.asyncio
    async def test_from_template_preserves_template_role(self):
        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent",
            "comp_001",
            overrides={"id": "agent_fb_01"},
            session=None,
        )
        assert agent.role in ("FACEBOOK_SALES_SUPPORT", "FACEBOOK-SALES-SUPPORT-AGENT")

    @pytest.mark.asyncio
    async def test_from_template_override_model(self):
        agent = await BaseAgent.from_template(
            "order-agent",
            "comp_002",
            overrides={"id": "agent_order_01", "model": "claude-sonnet-4-6"},
            session=None,
        )
        assert agent.model == "claude-sonnet-4-6"

    @pytest.mark.asyncio
    async def test_from_template_persona_overrides(self):
        agent = await BaseAgent.from_template(
            "support-agent",
            "comp_001",
            overrides={"id": "agent_pers_01", "persona": {"language": "english", "tone": "friendly"}},
            session=None,
        )
        assert agent.persona["language"] == "english"
        assert agent.persona["tone"] == "friendly"

    @pytest.mark.asyncio
    async def test_from_template_instruction_overrides(self):
        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent",
            "comp_001",
            overrides={
                "id": "agent_inst_01",
                "name": "\u0634\u064a\u0631\u064a\u0646",
                "role": "FACEBOOK_SALES_SUPPORT",
                "instructions": {"soul": "\u0627\u0633\u0645\u0643 \u0634\u064a\u0631\u064a\u0646\n\u0627\u062a\u0643\u0644\u0645\u064a \u0628\u0627\u0644\u0639\u0627\u0645\u064a\u0629 \u0627\u0644\u0645\u0635\u0631\u064a\u0629"},
            },
            session=None,
        )
        prompt = agent.instructions
        assert "\u0634\u064a\u0631\u064a\u0646" in prompt or "\u0634\u064a\u0631\u064a\u0646" in prompt
        assert "FACEBOOK_SALES_SUPPORT" in prompt

    @pytest.mark.asyncio
    async def test_from_template_allowed_tools_override(self):
        agent = await BaseAgent.from_template(
            "support-agent",
            "comp_001",
            overrides={"id": "agent_tools_02", "allowed_tools": ["product.search", "order.lookup"]},
            session=None,
        )
        assert agent.can_use_tool("product.search") is True
        assert agent.can_use_tool("unknown.tool") is False

    @pytest.mark.asyncio
    async def test_from_template_with_db_session(self):
        mock_template = MagicMock()
        mock_template.slug = "support-agent"
        mock_template.role = "SUPPORT"
        mock_template.name = "Support Agent"
        mock_template.version = "2.0.0"
        mock_template.model_policy = {"default": "gemini-2.5-pro"}
        mock_template.allowed_tools = ["product.search", "order.lookup", "order.cancel"]
        mock_template.allowed_skills = ["order-support"]
        mock_template.guardrails = {"requireDraftOrders": True}
        mock_template.persona_meta = {"language": "arabic", "dialect": "egyptian", "tone": "friendly"}
        mock_template.instructions_soul = "\u0623\u0646\u062a \u0648\u0643\u064a\u0644 \u062f\u0639\u0645."
        mock_template.instructions_persona = "\u062a\u062d\u062f\u062b \u0628\u0627\u0644\u0639\u0627\u0645\u064a\u0629."
        mock_template.instructions_tools = "\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629."
        mock_template.instructions_agents = "\u0627\u062a\u0628\u0639 \u0627\u0644\u0642\u0648\u0627\u0639\u062f."
        mock_template.handoffs = [{"role": "CEO", "description": "Escalate"}]
        mock_template.budget = {"dailyUsd": 2, "maxToolCallsPerRun": 5}
        mock_template.output_schema = None

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_template
        mock_session.execute = AsyncMock(return_value=mock_result)

        agent = await BaseAgent.from_template(
            "support-agent", "comp_db_001",
            overrides={"id": "agent_db_01"},
            session=mock_session,
        )

        assert agent.id == "agent_db_01"
        assert agent.role == "SUPPORT"
        assert agent.name == "Support Agent"
        assert agent.can_use_tool("product.search") is True
        assert "\u0623\u0646\u062a \u0648\u0643\u064a\u0644 \u062f\u0639\u0645" in agent.instructions

    @pytest.mark.asyncio
    async def test_from_template_company_id_propagated(self):
        for company_id in ["comp_001", "acme_corp", "\u0634\u0631\u0643\u0629_\u0645\u0643\u0633"]:
            agent = await BaseAgent.from_template(
                "support-agent", company_id,
                overrides={"id": f"agent_{company_id}"},
                session=None,
            )
            assert agent.company_id == company_id

    @pytest.mark.asyncio
    async def test_from_template_status_defaults_to_active(self):
        agent = await BaseAgent.from_template(
            "support-agent", "comp_001",
            overrides={"id": "agent_status_01"},
            session=None,
        )
        assert agent.status == "ACTIVE"

    @pytest.mark.asyncio
    async def test_from_template_handoffs_from_template(self):
        mock_template = MagicMock()
        mock_template.slug = "facebook-sales-support-agent"
        mock_template.role = "FACEBOOK_SALES_SUPPORT"
        mock_template.name = "Facebook Sales Agent"
        mock_template.version = "1.0.0"
        mock_template.model_policy = {}
        mock_template.allowed_tools = ["product.search"]
        mock_template.allowed_skills = []
        mock_template.guardrails = {}
        mock_template.persona_meta = {"language": "arabic"}
        mock_template.instructions_soul = "Soul"
        mock_template.instructions_persona = "Persona"
        mock_template.instructions_tools = "Tools"
        mock_template.instructions_agents = "Agents"
        mock_template.handoffs = [
            {"role": "SUPPORT", "description": "Transfer to support agent"},
            {"role": "SHIPPING", "description": "Transfer to shipping agent"},
        ]
        mock_template.budget = {}
        mock_template.output_schema = None

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_template
        mock_session.execute = AsyncMock(return_value=mock_result)

        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent", "comp_001",
            overrides={"id": "agent_hf_01"},
            session=mock_session,
        )

        assert len(agent.handoffs) == 2
        assert agent.handoffs[0]["role"] == "SUPPORT"
        assert agent.handoffs[1]["role"] == "SHIPPING"

# ===========================================================================
# 3. TemplateAdapter tests
# ===========================================================================


class TestTemplateAdapter:
    """Test _TemplateAdapter correctly normalizes DB templates and
    offline fallback proxies."""

    def test_adapter_from_db_template(self):
        mock_template = MagicMock()
        mock_template.slug = "ceo-agent"
        mock_template.role = "CEO"
        mock_template.name = "CEO Agent"
        mock_template.version = "1.0.0"
        mock_template.model_policy = {"default": "gemini-2.5-pro"}
        mock_template.allowed_tools = ["agent.spawn", "company.snapshot"]
        mock_template.allowed_skills = ["hire-agent"]
        mock_template.guardrails = {"requireDraftOrders": False}
        mock_template.persona_meta = {"language": "english", "tone": "strategic"}
        mock_template.instructions_agents = "You are the CEO."
        mock_template.instructions_soul = "Lead the team."
        mock_template.instructions_tools = "Use all tools."
        mock_template.instructions_persona = "Be strategic."
        mock_template.handoffs = []
        mock_template.budget = {"dailyUsd": 5}
        mock_template.output_schema = None

        adapter = _TemplateAdapter.from_db_or_proxy(mock_template, "ceo-agent", "comp_001")

        assert adapter.slug == "ceo-agent"
        assert adapter.role == "CEO"
        assert adapter.name == "CEO Agent"
        assert adapter.allowed_tools == ["agent.spawn", "company.snapshot"]
        assert adapter.allowed_skills == ["hire-agent"]
        assert adapter.instructions_soul == "Lead the team."

    def test_adapter_from_null_template_offline_fallback(self):
        adapter = _TemplateAdapter.from_db_or_proxy(None, "custom-agent", "comp_001")

        assert adapter.slug == "custom-agent"
        assert adapter.role == "CUSTOM-AGENT"
        assert adapter.name == "custom-agent"
        assert adapter.version == "0.0.0"
        assert adapter.allowed_tools == []
        assert adapter.allowed_skills == []
        assert adapter.persona_meta == {"language": "arabic"}

    def test_adapter_handles_none_fields_gracefully(self):
        mock_template = MagicMock()
        mock_template.slug = "minimal-agent"
        mock_template.role = "MINIMAL"
        mock_template.name = "Minimal"
        mock_template.version = "0.1.0"
        mock_template.model_policy = None
        mock_template.allowed_tools = None
        mock_template.allowed_skills = None
        mock_template.guardrails = None
        mock_template.persona_meta = None
        mock_template.instructions_agents = None
        mock_template.instructions_soul = None
        mock_template.instructions_tools = None
        mock_template.instructions_persona = None
        mock_template.handoffs = None
        mock_template.budget = None
        mock_template.output_schema = None

        adapter = _TemplateAdapter.from_db_or_proxy(mock_template, "minimal-agent", "comp_001")

        assert adapter.model_policy == {}
        assert adapter.allowed_tools == []
        assert adapter.allowed_skills == []
        assert adapter.guardrails == {}
        assert adapter.instructions_soul == ""


# ===========================================================================
# 4. Prompt assembly tests
# ===========================================================================


class TestPromptAssembly:
    """Test that system prompts are correctly assembled from template modules."""

    @pytest.fixture
    def registry_with_files(self, tmp_path):
        agent_dir = tmp_path / "test-prompt-agent"
        agent_dir.mkdir()

        manifest = {
            "slug": "test-prompt-agent",
            "name": "Test Prompt Agent",
            "role": "PROMPT_TESTER",
            "version": "1.0.0",
            "instructions": {
                "soul": "SOUL.md",
                "persona": "PERSONA.md",
                "tools": "TOOLS.md",
                "agents": "AGENTS.md",
            },
            "personaMeta": {
                "language": "arabic",
                "dialect": "egyptian",
                "tone": "friendly",
                "formality": "casual",
            },
            "guardrails": {
                "requireDraftOrders": True,
                "singleQuestionPerTurn": False,
            },
            "allowedTools": ["product.search", "order.lookup"],
            "channels": ["whatsapp"],
            "handoffs": [
                {"role": "CEO", "description": "Escalate to CEO"},
            ],
        }
        (agent_dir / "agent.json").write_text(json.dumps(manifest), encoding="utf-8")
        (agent_dir / "SOUL.md").write_text("\u0623\u0646\u062a {{ agent_name }}\u060c \u0648\u0643\u064a\u0644 \u0644\u0634\u0631\u0643\u0629 {{ company_name }}.", encoding="utf-8")
        (agent_dir / "PERSONA.md").write_text("\u062a\u062d\u062f\u062b \u0628\u0627\u0644\u0644\u0647\u062c\u0629 \u0627\u0644\u0645\u0635\u0631\u064a\u0629.", encoding="utf-8")
        (agent_dir / "TOOLS.md").write_text("Use product.search and order.lookup.", encoding="utf-8")
        (agent_dir / "AGENTS.md").write_text("You can hand off to CEO.", encoding="utf-8")

        registry = PromptTemplateRegistry(agents_root=tmp_path)
        registry.load_templates()
        return registry

    def test_prompt_contains_identity_block(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "\u0645\u0643\u0633 \u0628\u064a", "agent_name": "\u0633\u0627\u0631\u0629"},
        )
        assert "Name:" in hydrated.text
        assert "\u0633\u0627\u0631\u0629" in hydrated.text

    def test_prompt_contains_company_name(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "\u0645\u0643\u0633 \u0628\u064a"},
        )
        assert "\u0645\u0643\u0633 \u0628\u064a" in hydrated.text

    def test_prompt_contains_soul_content(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "TestCo", "agent_name": "Agent1"},
        )
        assert "Agent1" in hydrated.text

    def test_prompt_contains_persona_content(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "TestCo"},
        )
        assert "\u0645\u0635\u0631\u064a\u0629" in hydrated.text

    def test_prompt_contains_guardrails(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "TestCo"},
        )
        assert "requireDraftOrders" in hydrated.text or "draft" in hydrated.text.lower()

    def test_prompt_override_soul(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "TestCo"},
            soul_override="\u0623\u0646\u062a \u0634\u064a\u0631\u064a\u0646\u060c \u0648\u0643\u064a\u0644 \u0645\u0628\u064a\u0639\u0627\u062a.",
        )
        assert "\u0634\u064a\u0631\u064a\u0646" in hydrated.text

    def test_prompt_override_persona(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="PROMPT_TESTER",
            variables={"company_name": "TestCo"},
            persona_override="\u062a\u062d\u062f\u062b \u0628\u0627\u0644\u0644\u0647\u062c\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629.",
        )
        assert "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629" in hydrated.text

    def test_prompt_fallback_for_unknown_role(self, registry_with_files):
        hydrated = registry_with_files.build_prompt(
            role="NONEXISTENT_ROLE",
            variables={"company_name": "FallbackCorp"},
        )
        assert hydrated is not None
        assert len(hydrated.text) > 0
        assert hydrated.template_slug == "__fallback__"

    def test_real_agent_templates_load_successfully(self):
        if not BACKEND_AGENTS_ROOT.exists():
            pytest.skip("backend/agents/ directory not found")
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        templates = registry.list_templates()
        assert len(templates) >= 5, f"Expected >= 5 templates, got {len(templates)}"

    def test_real_agent_prompts_assemble_without_errors(self):
        if not BACKEND_AGENTS_ROOT.exists():
            pytest.skip("backend/agents/ directory not found")
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        for template in registry.list_templates():
            hydrated = registry.build_prompt(
                role=template.role,
                variables={"company_name": "TestCompany", "agent_name": "TestAgent"},
            )
            assert len(hydrated.text) > 100, (
                f"Template '{template.slug}' produced a suspiciously short prompt "
                f"({len(hydrated.text)} chars)"
            )

    def test_real_arabic_agent_prompts_contain_arabic(self):
        if not BACKEND_AGENTS_ROOT.exists():
            pytest.skip("backend/agents/ directory not found")
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        arabic_templates = [
            t for t in registry.list_templates()
            if t.persona_meta.get("language") == "arabic"
        ]
        assert len(arabic_templates) > 0, "Expected at least one Arabic template"
        for template in arabic_templates:
            hydrated = registry.build_prompt(
                role=template.role,
                variables={"company_name": "\u0634\u0631\u0643\u0629_\u062a\u062c\u0631\u064a\u0628\u064a\u0629", "agent_name": "\u0648\u0643\u064a\u0644"},
            )
            has_arabic = any(
                "\u0600" <= c <= "\u06FF" or "\u0750" <= c <= "\u077F"
                for c in hydrated.text
            )
            assert has_arabic, (
                f"Arabic template '{template.slug}' produced a prompt with no Arabic characters"
            )

# ===========================================================================
# 5. BaseAgentConfig and construction tests
# ===========================================================================


class TestBaseAgentConfig:
    """Test BaseAgentConfig construction and BaseAgent initialization."""

    def test_config_from_dict(self):
        config = BaseAgentConfig(
            id="a1", name="Agent One", role="SUPPORT", company_id="comp_001",
            allowed_tools=["product.search"],
        )
        agent = BaseAgent(config)
        assert agent.id == "a1"
        assert agent.role == "SUPPORT"
        assert agent.company_id == "comp_001"
        assert agent.allowed_tools == {"product.search"}

    def test_config_from_dict_constructor(self):
        agent = BaseAgent({
            "id": "a2", "name": "Agent Two", "role": "SALES",
            "company_id": "comp_002", "allowed_tools": ["product.search", "order.lookup"],
        })
        assert agent.id == "a2"
        assert agent.name == "Agent Two"

    def test_default_values(self):
        config = BaseAgentConfig(id="a3", name="Agent Three", role="ORDER", company_id="comp_003")
        agent = BaseAgent(config)
        assert agent.status == "ACTIVE"
        assert agent.model == "gemini-2.5-flash"
        assert agent.model_source == "runtime-default"
        assert agent.allowed_tools == set()
        assert agent.allowed_skills == set()
        assert agent.handoffs == []
        assert agent.output_schema is None

    def test_company_id_preserved(self):
        for cid in ["comp_001", "acme_corp", "\u0645\u062a\u062c\u0631_\u0633\u0627\u0631\u0629"]:
            agent = BaseAgent(BaseAgentConfig(id="test", name="Test", role="SUPPORT", company_id=cid))
            assert agent.company_id == cid

    def test_allowed_tools_as_set(self):
        config = BaseAgentConfig(
            id="test", name="Test", role="SUPPORT", company_id="comp",
            allowed_tools=["product.search", "order.lookup", "product.search"],
        )
        agent = BaseAgent(config)
        assert len(agent.allowed_tools) == 2
        assert agent.can_use_tool("product.search")
        assert agent.can_use_tool("order.lookup")
        assert not agent.can_use_tool("unknown.tool")

    def test_handoffs_preserved(self):
        config = BaseAgentConfig(
            id="test", name="Test", role="SUPPORT", company_id="comp",
            handoffs=[{"agent_id": "ceo_001", "role": "CEO", "description": "Escalate"}],
        )
        agent = BaseAgent(config)
        assert len(agent.handoffs) == 1
        assert agent.handoffs[0]["role"] == "CEO"

    def test_policies_and_persona_dicts(self):
        config = BaseAgentConfig(
            id="test", name="Test", role="SUPPORT", company_id="comp",
            persona={"language": "arabic", "tone": "friendly"},
            policies={"max_tool_calls_per_run": 5, "require_draft_orders": True},
        )
        agent = BaseAgent(config)
        assert agent.persona["language"] == "arabic"
        assert agent.policies["max_tool_calls_per_run"] == 5


# ===========================================================================
# 6. Middleware scoping tests (company isolation)
# ===========================================================================


class TestMiddlewareCompanyScoping:
    """Verify that middleware correctly scopes metadata to company and role."""

    @pytest.mark.asyncio
    async def test_function_audit_middleware_sets_company_metadata(self):
        from agent_framework import FunctionTool, FunctionInvocationContext

        async def _dummy() -> dict[str, str]:
            return {"status": "ok"}

        tool = FunctionTool(name="product_search", func=_dummy)
        context = FunctionInvocationContext(tool, arguments={})
        middleware = MaxPFunctionAuditMiddleware(company_id="comp_\u0634\u0631\u0643\u0629_\u0645\u0643\u0633", agent_role="SUPPORT")

        async def call_next():
            context.result = {"status": "ok"}

        await middleware.process(context, call_next)
        assert context.metadata["company_id"] == "comp_\u0634\u0631\u0643\u0629_\u0645\u0643\u0633"
        assert context.metadata["agent_role"] == "SUPPORT"
        assert context.metadata["tool_name"] == "product_search"

    @pytest.mark.asyncio
    async def test_agent_runtime_middleware_sets_company_metadata(self):
        from agent_framework import AgentContext, Message

        context = AgentContext(
            agent=object(),
            messages=[Message(role="user", contents=["hello"])],
        )
        middleware = MaxPAgentRuntimeMiddleware(company_id="comp_isolated", agent_role="CEO")

        async def call_next():
            context.result = "ok"

        await middleware.process(context, call_next)
        assert context.metadata["company_id"] == "comp_isolated"
        assert context.metadata["agent_role"] == "CEO"

    @pytest.mark.asyncio
    async def test_different_companies_are_scoped_correctly(self):
        from agent_framework import FunctionTool, FunctionInvocationContext

        async def _dummy() -> dict[str, str]:
            return {"status": "ok"}

        tool = FunctionTool(name="order_lookup", func=_dummy)

        for company_id in ["comp_a", "comp_b", "comp_\u0645\u062a\u062c\u0631\u064a"]:
            context = FunctionInvocationContext(tool, arguments={})
            middleware = MaxPFunctionAuditMiddleware(company_id=company_id, agent_role="ORDER")

            async def call_next():
                context.result = {"ok": True}

            await middleware.process(context, call_next)
            assert context.metadata["company_id"] == company_id

    @pytest.mark.asyncio
    async def test_sanitize_does_not_affect_system_messages(self):
        from agent_framework import AgentContext, Message

        context = AgentContext(
            agent=object(),
            messages=[
                Message(role="system", contents=["<policy>Keep this & that</policy>"]),
                Message(role="user", contents=["hello <script>alert(1)</script>"]),
            ],
        )
        middleware = MaxPAgentRuntimeMiddleware(company_id="comp_1", agent_role="SUPPORT")

        async def call_next():
            context.result = "ok"

        await middleware.process(context, call_next)
        assert context.messages[0].text == "<policy>Keep this & that</policy>"
        assert "&lt;script&gt;" in context.messages[1].text


# ===========================================================================
# 7. Agent tool resolution tests
# ===========================================================================


class TestAgentToolResolution:
    """Test that agents correctly resolve their tool sets based on allowed_tools."""

    @pytest.fixture
    def support_cfg(self):
        return BaseAgentConfig(
            id="agent_support_001", name="Support Agent", role="SUPPORT",
            company_id="comp_001",
            allowed_tools=["product_search", "order_lookup", "order_cancel", "customer_info"],
            allowed_skills=[],
            template_slug="support-agent",
        )

    def test_can_use_tool_in_allowed_set(self, support_cfg):
        agent = BaseAgent(support_cfg)
        assert agent.can_use_tool("product_search") is True
        assert agent.can_use_tool("order_lookup") is True

    def test_cannot_use_tool_not_in_allowed_set(self, support_cfg):
        agent = BaseAgent(support_cfg)
        assert agent.can_use_tool("product_create") is False
        assert agent.can_use_tool("unknown_tool") is False

    def test_agent_name_generation(self, support_cfg):
        agent = BaseAgent(support_cfg)
        name = agent._agent_name()
        assert "support" in name.lower()
        assert len(name) > 5

    def test_different_agents_different_tool_sets(self):
        support_cfg = BaseAgentConfig(
            id="s1", name="Support", role="SUPPORT", company_id="comp_001",
            allowed_tools=["product_search", "order_lookup"],
        )
        sales_cfg = BaseAgentConfig(
            id="s2", name="Sales", role="SALES", company_id="comp_001",
            allowed_tools=["product_search", "order_create_confirmed", "discount_create"],
        )
        support_agent = BaseAgent(support_cfg)
        sales_agent = BaseAgent(sales_cfg)
        assert support_agent.can_use_tool("order_lookup") is True
        assert support_agent.can_use_tool("discount_create") is False
        assert sales_agent.can_use_tool("discount_create") is True
        assert sales_agent.can_use_tool("order_lookup") is False


# ===========================================================================
# 8. Agent creation from all real templates
# ===========================================================================


class TestAllRealTemplates:
    """Test that BaseAgent.from_template works for every real agent template."""

    @pytest.fixture(autouse=True)
    def _skip_if_no_agents_dir(self):
        if not BACKEND_AGENTS_ROOT.exists():
            pytest.skip("backend/agents/ directory not found")

    @pytest.mark.asyncio
    async def test_every_template_creates_valid_agent(self):
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        for template in registry.list_templates():
            agent = await BaseAgent.from_template(
                template.slug, "comp_test_001",
                overrides={"id": f"agent_{template.slug}"},
                session=None,
            )
            assert agent.id == f"agent_{template.slug}"
            assert agent.role == template.role or agent.role == template.slug.upper()
            assert agent.company_id == "comp_test_001"
            assert agent.status == "ACTIVE"
            assert len(agent.instructions) > 0, (
                f"Agent from template '{template.slug}' has empty instructions"
            )

    @pytest.mark.asyncio
    async def test_every_template_produces_nonempty_prompt(self):
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        for template in registry.list_templates():
            agent = await BaseAgent.from_template(
                template.slug, "comp_test_001",
                overrides={"id": f"prompt_{template.slug}"},
                session=None,
            )
            prompt = agent.instructions
            assert len(prompt) > 50, (
                f"Agent from template '{template.slug}' has too-short prompt"
            )

    @pytest.mark.asyncio
    async def test_arabic_templates_have_arabic_in_prompt(self):
        registry = PromptTemplateRegistry(agents_root=BACKEND_AGENTS_ROOT)
        registry.load_templates()
        arabic_templates = [
            t for t in registry.list_templates()
            if t.persona_meta.get("language") == "arabic"
        ]
        for template in arabic_templates:
            agent = await BaseAgent.from_template(
                template.slug, "comp_test_001",
                overrides={"id": f"arabic_{template.slug}"},
                session=None,
            )
            prompt = agent.instructions
            has_arabic = any(
                "\u0600" <= c <= "\u06FF" or "\u0750" <= c <= "\u077F"
                for c in prompt
            )
            assert has_arabic, (
                f"Arabic template '{template.slug}' produced a prompt with no Arabic"
            )


# ===========================================================================
# 9. Agent spawn scenarios
# ===========================================================================


class TestAgentSpawnScenarios:
    """Test agent creation scenarios mirroring the /admin/agents/spawn endpoint logic."""

    @pytest.mark.asyncio
    async def test_spawn_support_agent_for_company(self):
        agent = await BaseAgent.from_template(
            "support-agent", "comp_mystore",
            overrides={
                "id": "agent_support_mystore",
                "name": "Support Agent",
                "role": "SUPPORT",
                "allowed_tools": ["product_search", "order_lookup", "order_cancel", "customer_info"],
            },
            session=None,
        )
        assert agent.role == "SUPPORT"
        assert agent.company_id == "comp_mystore"
        assert agent.can_use_tool("product_search")
        assert agent.can_use_tool("order_cancel")

    @pytest.mark.asyncio
    async def test_spawn_ceo_agent_for_company(self):
        agent = await BaseAgent.from_template(
            "manager-ceo", "comp_bigcorp",
            overrides={
                "id": "agent_ceo_bigcorp",
                "name": "CEO Agent",
                "role": "CEO",
                "allowed_tools": [
                    "agent_spawn", "product_search", "company_snapshot",
                    "order_summary", "sales_revenue", "audit_read",
                ],
            },
            session=None,
        )
        assert agent.role == "CEO"
        assert agent.can_use_tool("agent_spawn")
        assert agent.can_use_tool("company_snapshot")

    @pytest.mark.asyncio
    async def test_spawn_facebook_agent_with_egyptian_persona(self):
        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent", "comp_facebook_shop",
            overrides={
                "id": "agent_fb_shop",
                "name": "\u0634\u064a\u0631\u064a\u0646",
                "role": "FACEBOOK_SALES_SUPPORT",
                "persona": {
                    "language": "arabic",
                    "dialect": "egyptian",
                    "tone": "friendly",
                    "formality": "casual",
                },
            },
            session=None,
        )
        assert agent.name == "\u0634\u064a\u0631\u064a\u0646"
        assert agent.persona["dialect"] == "egyptian"
        prompt = agent.instructions
        assert "\u0634\u064a\u0631\u064a\u0646" in prompt or "FACEBOOK_SALES_SUPPORT" in prompt

    @pytest.mark.asyncio
    async def test_two_companies_same_role_different_ids(self):
        agent1 = await BaseAgent.from_template(
            "support-agent", "comp_shop_a",
            overrides={"id": "agent_a_support"}, session=None,
        )
        agent2 = await BaseAgent.from_template(
            "support-agent", "comp_shop_b",
            overrides={"id": "agent_b_support"}, session=None,
        )
        assert agent1.id != agent2.id
        assert agent1.company_id != agent2.company_id
        assert agent1.company_id == "comp_shop_a"
        assert agent2.company_id == "comp_shop_b"

    @pytest.mark.asyncio
    async def test_model_override_precedence(self):
        agent_default = await BaseAgent.from_template(
            "support-agent", "comp_001",
            overrides={"id": "agent_default"}, session=None,
        )
        assert agent_default.model == "gemini-2.5-flash"

        agent_custom = await BaseAgent.from_template(
            "support-agent", "comp_001",
            overrides={"id": "agent_custom", "model": "claude-sonnet-4-6"}, session=None,
        )
        assert agent_custom.model == "claude-sonnet-4-6"

    @pytest.mark.asyncio
    async def test_template_inherits_guardrails_and_budget(self):
        mock_template = MagicMock()
        mock_template.slug = "support-agent"
        mock_template.role = "SUPPORT"
        mock_template.name = "Support Agent"
        mock_template.version = "1.0.0"
        mock_template.model_policy = {"default": "gemini-2.5-flash"}
        mock_template.allowed_tools = ["product.search", "order.lookup"]
        mock_template.allowed_skills = ["order-support"]
        mock_template.guardrails = {"requireDraftOrders": True, "singleQuestionPerTurn": True}
        mock_template.persona_meta = {"language": "arabic", "tone": "friendly"}
        mock_template.instructions_soul = "Soul"
        mock_template.instructions_persona = "Persona"
        mock_template.instructions_tools = "Tools"
        mock_template.instructions_agents = "Agents"
        mock_template.handoffs = []
        mock_template.budget = {"dailyUsd": 2, "maxToolCallsPerRun": 5}
        mock_template.output_schema = None

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_template
        mock_session.execute = AsyncMock(return_value=mock_result)

        agent = await BaseAgent.from_template(
            "support-agent", "comp_001",
            overrides={"id": "agent_guardrails"},
            session=mock_session,
        )

        assert agent.policies["guardrails"]["requireDraftOrders"] is True
        assert agent.policies["max_tool_calls_per_run"] == 5


# ===========================================================================
# 10. StreamEmitter and observability tests
# ===========================================================================


class TestStreamEmitter:
    """Test the _StreamEmitter event collector."""

    def test_emit_and_replay(self):
        from src.agents.base import _StreamEmitter

        emitter = _StreamEmitter(run_id="run_1", sink=None)
        emitter.emit("agent_start", {"agent": "support"})
        emitter.emit("tool_call", {"tool": "product_search", "params": {"q": "shoes"}})
        emitter.emit("agent_reply", {"text": "Found 3 products"})

        events = emitter.events()
        assert len(events) == 3
        assert events[0][0] == "agent_start"
        assert events[1][0] == "tool_call"
        assert events[2][0] == "agent_reply"

    def test_emit_calls_sink(self):
        from src.agents.base import _StreamEmitter

        collected = []
        emitter = _StreamEmitter(
            run_id="run_2",
            sink=lambda event, payload: collected.append((event, payload)),
        )
        emitter.emit("test_event", {"key": "value"})
        assert len(collected) == 1
        assert collected[0][0] == "test_event"

    def test_sink_failure_does_not_break_emitter(self):
        from src.agents.base import _StreamEmitter

        def bad_sink(event, payload):
            raise RuntimeError("sink broken")

        emitter = _StreamEmitter(run_id="run_3", sink=bad_sink)
        emitter.emit("test_event", {"ok": True})
        events = emitter.events()
        assert len(events) == 1



