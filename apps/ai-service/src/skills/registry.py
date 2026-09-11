from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool

from .base import Skill


class SkillRegistry:
    def __init__(self):
        self._skills: dict[str, Skill] = {}
        self._tools: dict[str, FunctionTool] = {}
        self._groups: dict[str, set[str]] = {}

    def register(self, skill: Skill) -> None:
        self._skills[skill.name] = skill

    def register_tool(self, tool: FunctionTool, group: str | None = None) -> None:
        self._tools[tool.name] = tool
        if group:
            if group not in self._groups:
                self._groups[group] = set()
            self._groups[group].add(tool.name)

    def resolve(self, name: str) -> FunctionTool | None:
        tool = self._tools.get(name)
        if tool:
            return tool
        skill = self._skills.get(name)
        if skill:
            return self._skill_to_function_tool(skill)
        return None

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def clear(self) -> None:
        self._skills.clear()
        self._tools.clear()
        self._groups.clear()

    def get_all(self) -> list[Skill]:
        return list(self._skills.values())

    def get_names(self) -> list[str]:
        return list(self._skills.keys()) + list(self._tools.keys())

    def get_all_tools(self) -> list[FunctionTool]:
        tools: dict[str, FunctionTool] = dict(self._tools)
        for skill in self._skills.values():
            if skill.name not in tools:
                tools[skill.name] = self._skill_to_function_tool(skill)
        return list(tools.values())

    def get_tools_for_group(self, group: str) -> list[FunctionTool]:
        names = self._groups.get(group, set())
        result = []
        for name in names:
            tool = self._tools.get(name)
            if tool:
                result.append(tool)
        return result

    def to_openai_tools(self) -> list[dict]:
        return [t.to_json_schema_spec() if hasattr(t, 'to_json_schema_spec') else self._fallback_schema(t) for t in self.get_all_tools()]

    def to_gemini_tools(self) -> list[dict]:
        return [s.to_gemini_tool() for s in self._skills.values()]

    def _skill_to_function_tool(self, skill: Skill) -> FunctionTool:
        async def _handler(input_data: Any) -> Any:
            return await skill.execute(**input_data.model_dump())
        return FunctionTool(
            name=skill.name,
            description=skill.description,
            func=_handler,
            input_model=skill.input_schema,
        )

    def _fallback_schema(self, tool: FunctionTool) -> dict:
        schema = tool.input_model.model_json_schema() if hasattr(tool, 'input_model') and hasattr(tool.input_model, 'model_json_schema') else {"type": "object"}
        schema.setdefault("additionalProperties", False)
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": getattr(tool, 'description', ''),
                "parameters": schema,
                "strict": True,
            }
        }


_global_registry: SkillRegistry | None = None


def get_skill_registry() -> SkillRegistry:
    global _global_registry
    if _global_registry is None:
        _global_registry = SkillRegistry()
    return _global_registry
