from __future__ import annotations

import json
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.tools.names import canonical_tool_name

import structlog
from agent_framework import (
    FunctionTool,
    InlineSkill,
    Skill,
    SkillFrontmatter,
    SkillsProvider,
    SkillsSource,
)

_SKILLS_ROOT = Path(__file__).resolve().parent.parent.parent / "skills"
_SKILL_CACHE_TTL: int = int(os.environ.get("MAXP_SKILL_CACHE_TTL", "300"))  # 5 min default

logger = structlog.get_logger(__name__)


# ── TTL Cache ────────────────────────────────────────────────────────────────


_skill_meta_cache: dict[str, tuple[float, dict[str, Any] | None]] = {}
_skill_json_cache: dict[str, tuple[float, dict[str, Any] | None]] = {}
_skill_md_cache: dict[str, tuple[float, str | None]] = {}


def _cache_get(
    cache: dict[str, tuple[float, Any]],
    key: str,
    ttl: int | None = None,
) -> Any | None:
    """Get from TTL cache. Returns None if missing or expired."""
    ttl = ttl if ttl is not None else _SKILL_CACHE_TTL
    entry = cache.get(key)
    if entry and (time.monotonic() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(cache: dict[str, tuple[float, Any]], key: str, value: Any) -> None:
    """Set in TTL cache."""
    cache[key] = (time.monotonic(), value)


def clear_skills_cache(skill_id: str | None = None) -> None:
    """Clear all skill caches. If skill_id is set, clear only that skill."""
    targets = [skill_id] if skill_id else list(_skill_meta_cache.keys())
    for sid in targets:
        _skill_meta_cache.pop(sid, None)
        _skill_json_cache.pop(sid, None)
        _skill_md_cache.pop(sid, None)
    if skill_id is None:
        _skill_meta_cache.clear()
        _skill_json_cache.clear()
        _skill_md_cache.clear()


# ── Helpers ──────────────────────────────────────────────────────────────────


def _read_skill_json(skill_dir: Path) -> dict[str, Any] | None:
    """Read skill.json from a skill directory (with TTL cache)."""
    skill_id = skill_dir.name
    cached = _cache_get(_skill_json_cache, skill_id)
    if cached is not None:
        return cached

    try:
        data = json.loads((skill_dir / "skill.json").read_text(encoding="utf-8"))
        _cache_set(_skill_json_cache, skill_id, data)
        return data
    except (FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        logger.warning("skill_json_read_failed", path=str(skill_dir), error=str(exc))
        _cache_set(_skill_json_cache, skill_id, None)
        return None


def _read_skill_md(skill_dir: Path) -> str | None:
    """Read SKILL.md from a skill directory (with TTL cache)."""
    skill_id = skill_dir.name
    cached = _cache_get(_skill_md_cache, skill_id)
    if cached is not None:
        return cached

    path = skill_dir / "SKILL.md"
    if not path.exists():
        logger.warning("skill_md_not_found", path=str(path))
        _cache_set(_skill_md_cache, skill_id, None)
        return None
    try:
        content = path.read_text(encoding="utf-8")
        _cache_set(_skill_md_cache, skill_id, content)
        return content
    except OSError as exc:
        logger.warning("skill_md_read_failed", path=str(path), error=str(exc))
        _cache_set(_skill_md_cache, skill_id, None)
        return None


def _get_allowed_skill_dirs(allowed_skills: set[str]) -> list[Path]:
    """Return Path objects for skill directories that exist and have SKILL.md."""
    result: list[Path] = []
    for skill_id in sorted(allowed_skills):
        skill_dir = _SKILLS_ROOT / skill_id
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
            result.append(skill_dir)
    return result


def _skill_metadata_from_dir(skill_dir: Path) -> dict[str, Any] | None:
    """Extract skill metadata from skill.json + SKILL.md in a skill directory (with TTL cache)."""
    skill_id = skill_dir.name
    cached = _cache_get(_skill_meta_cache, skill_id)
    if cached is not None:
        return cached

    config = _read_skill_json(skill_dir)
    if not config:
        _cache_set(_skill_meta_cache, skill_id, None)
        return None
    content = _read_skill_md(skill_dir)
    if content is None:
        _cache_set(_skill_meta_cache, skill_id, None)
        return None
    raw_tools = config.get("allowedTools", [])
    meta = {
        "id": config.get("id", skill_dir.name),
        "name": config.get("displayName", skill_dir.name),
        "description": config.get("description", ""),
        "instructions": content,
        "allowed_tools": [canonical_tool_name(t) for t in raw_tools],
        "requires_human_approval": bool(config.get("requiresHumanApproval", False)),
        "max_tool_count": int(config.get("maxToolCount", 0) or 0),
    }
    _cache_set(_skill_meta_cache, skill_id, meta)
    return meta


def resolve_skill_context(
    planned_tool_names: set[str],
    agent_allowed_skills: set[str],
) -> dict[str, Any] | None:
    """Match planned tool names against agent skills and return the first match's constraints.

    Returns a skill_context dict for ``ToolGateway.execute(skill_context=...)``, or None.
    """
    if not planned_tool_names or not agent_allowed_skills:
        return None
    for skill_dir in _get_allowed_skill_dirs(agent_allowed_skills):
        meta = _skill_metadata_from_dir(skill_dir)
        if meta is None:
            continue
        skill_tools = {canonical_tool_name(t) for t in meta.get("allowed_tools", [])}
        if planned_tool_names & skill_tools:
            return {
                "skill_id": meta["id"],
                "requires_human_approval": meta["requires_human_approval"],
                "max_tool_count": meta["max_tool_count"],
            }
    return None


# ── Skills Block (for pipeline system prompt) ────────────────────────────────


def get_skills_block(allowed_skills: set[str] | None) -> str:
    """Build a ``<skills>`` block with full SKILL.md content for each skill.

    Used by the pipeline path (customer channels) where the LLM cannot
    dynamically call ``load_skill`` during reply generation.
    Includes the full instructions so the agent can apply the skill immediately.
    """
    if not allowed_skills:
        return ""
    lines: list[str] = []
    for skill_dir in _get_allowed_skill_dirs(allowed_skills):
        meta = _skill_metadata_from_dir(skill_dir)
        if meta is None:
            continue
        lines.append(f"<skill id=\"{meta['id']}\">")
        lines.append(f"<name>{meta['name']}</name>")
        lines.append(f"<description>{meta['description']}</description>")
        allowed = meta.get("allowed_tools", [])
        if allowed:
            lines.append(f"<allowed_tools>{' '.join(allowed)}</allowed_tools>")
        lines.append(meta["instructions"])
        lines.append("</skill>")
    if not lines:
        return ""
    return "\n\n" + "\n".join(["<skills>", *lines, "</skills>"])


def get_l1_skills_block(allowed_skills: set[str] | None) -> str:
    """Build an L1 ``<skills_available>`` block with name + description per skill.

    This is the "advertise" step in progressive disclosure — ~100 tokens per skill.
    The LLM sees the metadata and can call ``load_skill`` to get full instructions.
    Used by the SDK Agent Runtime path where dynamic tool calls are supported.
    """
    if not allowed_skills:
        return ""
    lines: list[str] = []
    for skill_dir in _get_allowed_skill_dirs(allowed_skills):
        meta = _skill_metadata_from_dir(skill_dir)
        if meta is None:
            continue
        lines.append(f"  <skill id=\"{meta['id']}\">")
        lines.append(f"    <name>{meta['name']}</name>")
        lines.append(f"    <description>{meta['description']}</description>")
        lines.append("  </skill>")
    if not lines:
        return ""
    return "\n" + "\n".join([
        "<skills_available>",
        "Available skills — call load_skill('<skill_id>') to load full instructions:",
        *lines,
        "</skills_available>",
    ])


# ── L2: Load skill content (for pipeline FunctionTool) ───────────────────────


async def _load_skill_handler(skill_id: str) -> str:
    """Load the full SKILL.md content for a skill (L2 progressive disclosure)."""
    if not skill_id or not skill_id.strip():
        return "Error: Skill ID cannot be empty."
    skill_dir = _SKILLS_ROOT / skill_id.strip()
    if not skill_dir.is_dir():
        return f"Error: Skill '{skill_id}' not found."
    meta = _skill_metadata_from_dir(skill_dir)
    if meta is None:
        return f"Error: Skill '{skill_id}' not found."
    instructions = meta.get("instructions", "")
    header = f"# Skill: {meta['name']}\nDescription: {meta['description']}\n\n"
    return header + instructions


async def _read_skill_resource_handler(skill_id: str, resource_name: str) -> str:
    """Read a supplementary resource file from a skill directory (L3)."""
    if not skill_id or not skill_id.strip():
        return "Error: Skill ID cannot be empty."
    skill_dir = _SKILLS_ROOT / skill_id.strip()
    if not skill_dir.is_dir():
        return f"Error: Skill '{skill_id}' not found."
    resource_path = skill_dir / "references" / resource_name
    if not resource_path.exists():
        resource_path = skill_dir / "assets" / resource_name
    if not resource_path.exists():
        resource_path = skill_dir / resource_name
    if not resource_path.exists() or not resource_path.is_file():
        return f"Error: Resource '{resource_name}' not found in skill '{skill_id}'."
    try:
        return resource_path.read_text(encoding="utf-8")
    except OSError as exc:
        return f"Error: Failed to read resource '{resource_name}': {exc}"


load_skill_tool = FunctionTool(
    name="load_skill",
    description=(
        "Loads the full instructions for a specific skill. "
        "Call this when a task matches one of the available skills listed in <skills_available>. "
        "Pass the skill's id attribute value as skill_id."
    ),
    func=_load_skill_handler,
    input_model={
        "type": "object",
        "properties": {
            "skill_id": {
                "type": "string",
                "description": "The skill ID to load instructions for (from <skills_available>).",
            },
        },
        "required": ["skill_id"],
    },
    approval_mode="never_require",
)

read_skill_resource_tool = FunctionTool(
    name="read_skill_resource",
    description="Reads a supplementary resource file (reference, asset) for a loaded skill.",
    func=_read_skill_resource_handler,
    input_model={
        "type": "object",
        "properties": {
            "skill_id": {"type": "string", "description": "The skill ID."},
            "resource_name": {"type": "string", "description": "The resource filename."},
        },
        "required": ["skill_id", "resource_name"],
    },
    approval_mode="never_require",
)

SKILL_TOOLS: list[FunctionTool] = [
    load_skill_tool,
    read_skill_resource_tool,
]


def get_skill_tool_names() -> list[str]:
    return [t.name for t in SKILL_TOOLS]


# ── SDK SkillsSource: bridges MaxP skill format to agent_framework ───────────


class MaxpSkillsSource(SkillsSource):
    """Custom SkillsSource that reads MaxP's skill.json + SKILL.md format.

    Required by the SDK's ``SkillsProvider`` for the Agent Runtime path.
    """

    def __init__(self, allowed_skills: set[str] | None = None) -> None:
        self._allowed_skills = allowed_skills or set()

    async def get_skills(self) -> list[Skill]:
        skills: list[Skill] = []
        for skill_dir in _get_allowed_skill_dirs(self._allowed_skills):
            meta = _skill_metadata_from_dir(skill_dir)
            if meta is None:
                continue
            allowed_tools_str = " ".join(meta.get("allowed_tools", []))
            frontmatter = SkillFrontmatter(
                name=meta["name"],
                description=meta["description"],
                allowed_tools=allowed_tools_str or None,
            )
            skills.append(
                InlineSkill(
                    frontmatter=frontmatter,
                    instructions=meta["instructions"],
                )
            )
        return skills


def create_skills_provider(allowed_skills: set[str] | None) -> SkillsProvider | None:
    """Create an SDK ``SkillsProvider`` for the Agent Runtime path.

    The provider implements progressive disclosure automatically:
    - L1 metadata (name + description) injected into the system prompt
    - L2 content (full SKILL.md) loaded via ``load_skill`` tool
    - L3 resources via ``read_skill_resource`` tool
    """
    if not allowed_skills:
        return None
    if not _get_allowed_skill_dirs(allowed_skills):
        return None
    try:
        provider = SkillsProvider(
            source=MaxpSkillsSource(allowed_skills),
            disable_caching=False,
        )
        return provider
    except Exception as exc:
        logger.warning("failed_to_create_skills_provider", error=str(exc))
        return None
