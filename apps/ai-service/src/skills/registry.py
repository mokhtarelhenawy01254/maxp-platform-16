from __future__ import annotations

from typing import Any

from .base import Skill


class SkillRegistry:
    def __init__(self):
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        self._skills[skill.name] = skill

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def clear(self) -> None:
        self._skills.clear()

    def get_all(self) -> list[Skill]:
        return list(self._skills.values())

    def get_names(self) -> list[str]:
        return list(self._skills.keys())

    def to_openai_tools(self) -> list[dict]:
        return [s.to_openai_tool() for s in self._skills.values()]

    def to_gemini_tools(self) -> list[dict]:
        return [s.to_gemini_tool() for s in self._skills.values()]


_global_registry: SkillRegistry | None = None


def get_skill_registry() -> SkillRegistry:
    global _global_registry
    if _global_registry is None:
        _global_registry = SkillRegistry()
    return _global_registry
