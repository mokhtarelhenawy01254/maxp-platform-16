from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import pytest
from src.prompts.template_registry import PromptTemplateRegistry, PromptTemplate


@pytest.fixture
def temp_agents_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # Create a test agent structure
        agent_dir = tmp_path / "test-agent"
        agent_dir.mkdir(parents=True)
        
        manifest = """{
            "slug": "test-agent",
            "name": "Test Agent",
            "role": "TESTER",
            "version": "1.0.0",
            "instructions": {
                "soul": "SOUL.md",
                "persona": "PERSONA.md",
                "tools": "TOOLS.md",
                "agents": "AGENTS.md"
            },
            "personaMeta": {
                "language": "arabic",
                "tone": "friendly"
            },
            "channels": ["chat"]
        }"""
        (agent_dir / "agent.json").write_text(manifest, encoding="utf-8")
        (agent_dir / "SOUL.md").write_text("Soul: Help {{ company_name }}.", encoding="utf-8")
        (agent_dir / "PERSONA.md").write_text("## Constraints\n- Be polite.", encoding="utf-8")
        (agent_dir / "TOOLS.md").write_text("Use tester_tool.", encoding="utf-8")
        (agent_dir / "AGENTS.md").write_text("No sub-agents.", encoding="utf-8")
        
        yield tmp_path


def test_registry_loads_templates(temp_agents_dir):
    registry = PromptTemplateRegistry(agents_root=temp_agents_dir)
    registry.load_templates()
    
    template = registry.get_template("test-agent")
    assert template is not None
    assert template.name == "Test Agent"
    assert template.role == "TESTER"
    assert "Help {{ company_name }}" in template.soul
    assert "tester_tool" in template.tools


def test_registry_build_prompt(temp_agents_dir):
    registry = PromptTemplateRegistry(agents_root=temp_agents_dir)
    registry.load_templates()
    
    hydrated = registry.build_prompt(
        role="TESTER",
        variables={"company_name": "AcmeCorp"}
    )
    
    assert hydrated is not None
    assert "AcmeCorp" in hydrated.text
    assert "TESTER" in hydrated.text
    assert "test-agent" == hydrated.template_slug


def test_registry_fallback_chain(temp_agents_dir):
    registry = PromptTemplateRegistry(agents_root=temp_agents_dir)
    registry.load_templates()
    
    # Non-existent role should hit fallback
    hydrated = registry.build_prompt(
        role="NON_EXISTENT",
        variables={"company_name": "FallbackCorp"}
    )
    
    assert hydrated is not None
    assert "FallbackCorp" in hydrated.text
    assert "NON_EXISTENT" in hydrated.text
    assert "__fallback__" == hydrated.template_slug
