from __future__ import annotations

import pytest
from agent_framework import FunctionTool
from pydantic import BaseModel

from src.skills.base import Skill
from src.skills.registry import SkillRegistry, get_skill_registry


class TestInput(BaseModel):
    query: str = "test"


async def dummy_handler(input_data: TestInput) -> dict:
    return {"result": f"handled: {input_data.query}"}


def make_tool(name: str) -> FunctionTool:
    return FunctionTool(
        name=name,
        description=f"Tool {name}",
        func=lambda x: {"done": True},
        input_model=TestInput,
    )


def make_skill(name: str) -> Skill:
    return Skill(
        name=name,
        description=f"Skill {name}",
        input_schema=TestInput,
        handler=dummy_handler,
    )


class TestSkillRegistry:
    def setup_method(self):
        self.r = SkillRegistry()

    def test_register_tool_and_resolve(self):
        tool = make_tool("test_tool")
        self.r.register_tool(tool)
        resolved = self.r.resolve("test_tool")
        assert resolved is not None
        assert resolved.name == "test_tool"

    def test_resolve_unknown_returns_none(self):
        assert self.r.resolve("nonexistent") is None

    def test_register_skill_convert_to_function_tool(self):
        skill = make_skill("test_skill")
        self.r.register(skill)
        resolved = self.r.resolve("test_skill")
        assert resolved is not None
        assert resolved.name == "test_skill"
        # Should be a FunctionTool, not a Skill
        assert isinstance(resolved, FunctionTool)

    def test_get_all_tools_includes_both(self):
        self.r.register_tool(make_tool("tool_a"))
        self.r.register_tool(make_tool("tool_b"))
        self.r.register(make_skill("skill_a"))
        all_tools = self.r.get_all_tools()
        names = {t.name for t in all_tools}
        assert "tool_a" in names
        assert "tool_b" in names
        assert "skill_a" in names
        assert len(all_tools) == 3

    def test_duplicate_register_does_not_duplicate(self):
        self.r.register_tool(make_tool("dup"))
        self.r.register_tool(make_tool("dup"))
        assert len(self.r.get_all_tools()) == 1

    def test_clear_resets_everything(self):
        self.r.register_tool(make_tool("a"))
        self.r.register(make_skill("b"))
        self.r.clear()
        assert len(self.r.get_all_tools()) == 0
        assert self.r.resolve("a") is None

    def test_get_names_from_both_sources(self):
        self.r.register_tool(make_tool("t1"))
        self.r.register(make_skill("s1"))
        names = self.r.get_names()
        assert "t1" in names
        assert "s1" in names
        assert len(names) == 2

    def test_register_tool_with_group(self):
        self.r.register_tool(make_tool("read_tool"), group="read")
        self.r.register_tool(make_tool("write_tool"), group="write")
        read_tools = self.r.get_tools_for_group("read")
        assert len(read_tools) == 1
        assert read_tools[0].name == "read_tool"
        assert len(self.r.get_tools_for_group("nonexistent")) == 0


class TestGlobalRegistry:
    def test_global_registry_is_singleton(self):
        r1 = get_skill_registry()
        r2 = get_skill_registry()
        assert r1 is r2

    def test_global_registry_has_tools_after_import(self):
        from src.tools.registry import ALL_TOOLS
        r = get_skill_registry()
        # Should have the same count (minus duplicates if any)
        resolved_count = len([n for n in ALL_TOOLS if r.resolve(n) is not None])
        assert resolved_count > 0
        assert resolved_count == len(ALL_TOOLS)
