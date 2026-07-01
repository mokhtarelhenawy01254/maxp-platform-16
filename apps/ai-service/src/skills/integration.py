from __future__ import annotations

import json
import os
import time
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
_SKILL_CACHE_TTL: int = int(os.environ.get("MAXP_SKILL_CACHE_TTL", "300"))

logger = structlog.get_logger(__name__)

# ── In-memory DB cache (preloaded at startup) ────────────────────────────────
# Populated by preload_skills_from_db() after seed_skills().
# Key = skill_id, Value = normalized metadata dict.
_db_skills_cache: dict[str, dict[str, Any]] = {}

# ── TTL File Cache (fallback) ────────────────────────────────────────────────
_skill_meta_cache: dict[str, tuple[float, dict[str, Any] | None]] = {}
_skill_json_cache: dict[str, tuple[float, dict[str, Any] | None]] = {}
_skill_md_cache: dict[str, tuple[float, str | None]] = {}


def _cache_get(cache: dict[str, tuple[float, Any]], key: str, ttl: int | None = None) -> Any | None:
    ttl = ttl if ttl is not None else _SKILL_CACHE_TTL
    entry = cache.get(key)
    if entry and (time.monotonic() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(cache: dict[str, tuple[float, Any]], key: str, value: Any) -> None:
    cache[key] = (time.monotonic(), value)


def clear_skills_cache(skill_id: str | None = None) -> None:
    if skill_id:
        _skill_meta_cache.pop(skill_id, None)
        _skill_json_cache.pop(skill_id, None)
        _skill_md_cache.pop(skill_id, None)
        _db_skills_cache.pop(skill_id, None)
    else:
        _skill_meta_cache.clear()
        _skill_json_cache.clear()
        _skill_md_cache.clear()
        _db_skills_cache.clear()


async def preload_skills_from_db(session: Any) -> None:
    """Load all skills from DB into _db_skills_cache.
    Called after seed_skills so the in-memory cache reflects DB state.
    """
    from sqlalchemy import select as sa_select
    from src.db.models.skill import Skill as SkillModel
    result = await session.execute(sa_select(SkillModel))
    skills = result.scalars().all()
    _db_skills_cache.clear()
    for skill in skills:
        allowed = skill.allowed_tools or []
        _db_skills_cache[skill.id] = {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description or "",
            "instructions": skill.content or skill.instructions or "",
            "allowed_tools": [canonical_tool_name(t) for t in allowed],
            "requires_human_approval": bool(skill.requires_human_approval),
            "max_tool_count": int(skill.max_tool_count or 0),
        }
    logger.info("skills_cache_loaded_from_db", count=len(_db_skills_cache))


# ── File-based helpers (fallback) ────────────────────────────────────────────


def _read_skill_json(skill_dir: Path) -> dict[str, Any] | None:
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
    skill_id = skill_dir.name
    cached = _cache_get(_skill_md_cache, skill_id)
    if cached is not None:
        return cached
    path = skill_dir / "SKILL.md"
    if not path.exists():
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


def _skill_metadata_from_dir(skill_dir: Path) -> dict[str, Any] | None:
    skill_id = skill_dir.name
    # 1. DB cache (source of truth after seed)
    if skill_id in _db_skills_cache:
        return _db_skills_cache[skill_id]
    # 2. File TTL cache
    cached = _cache_get(_skill_meta_cache, skill_id)
    if cached is not None:
        return cached
    # 3. Read from files
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


def _get_skill_meta(skill_id: str) -> dict[str, Any] | None:
    """Get skill metadata by ID — DB cache first, then files."""
    if skill_id in _db_skills_cache:
        return _db_skills_cache[skill_id]
    skill_dir = _SKILLS_ROOT / skill_id
    if skill_dir.is_dir():
        return _skill_metadata_from_dir(skill_dir)
    return None


def _get_allowed_skill_dirs(allowed_skills: set[str]) -> list[Path]:
    result: list[Path] = []
    for skill_id in sorted(allowed_skills):
        skill_dir = _SKILLS_ROOT / skill_id
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
            result.append(skill_dir)
    return result


def _iter_allowed_skills_meta(allowed_skills: set[str]):
    """Iterate skill metadata — DB cache first, files fallback."""
    for skill_id in sorted(allowed_skills):
        meta = _get_skill_meta(skill_id)
        if meta:
            yield meta


def resolve_skill_context(
    planned_tool_names: set[str],
    agent_allowed_skills: set[str],
) -> dict[str, Any] | None:
    if not planned_tool_names or not agent_allowed_skills:
        return None
    planned_canonical = {canonical_tool_name(t) for t in planned_tool_names}
    candidates: list[tuple[int, dict[str, Any]]] = []
    for meta in _iter_allowed_skills_meta(agent_allowed_skills):
        skill_tools = set(meta.get("allowed_tools", []))
        overlap = len(planned_canonical & skill_tools)
        if overlap:
            candidates.append((overlap, meta))
    if not candidates:
        return None
    # Largest overlap first; among ties, non-approval skills win
    candidates.sort(key=lambda x: (-x[0], x[1]["requires_human_approval"]))
    meta = candidates[0][1]
    return {
        "skill_id": meta["id"],
        "requires_human_approval": meta["requires_human_approval"],
        "max_tool_count": meta["max_tool_count"],
    }


def get_skills_block(allowed_skills: set[str] | None) -> str:
    if not allowed_skills:
        return ""
    lines: list[str] = []
    for meta in _iter_allowed_skills_meta(allowed_skills):
        lines.append(f'<skill id="{meta["id"]}">')
        lines.append(f'<name>{meta["name"]}</name>')
        lines.append(f'<description>{meta["description"]}</description>')
        allowed = meta.get("allowed_tools", [])
        if allowed:
            lines.append(f'<allowed_tools>{" ".join(allowed)}</allowed_tools>')
        lines.append(meta["instructions"])
        lines.append("</skill>")
    if not lines:
        return ""
    return "\n\n" + "\n".join(["<skills>", *lines, "</skills>"])


def get_l1_skills_block(allowed_skills: set[str] | None) -> str:
    if not allowed_skills:
        return ""
    lines: list[str] = []
    for meta in _iter_allowed_skills_meta(allowed_skills):
        lines.append(f'  <skill id="{meta["id"]}">')
        lines.append(f'    <name>{meta["name"]}</name>')
        lines.append(f'    <description>{meta["description"]}</description>')
        lines.append("  </skill>")
    if not lines:
        return ""
    return "\n" + "\n".join([
        "<skills_available>",
        "Available skills — call load_skill('<skill_id>') to load full instructions:",
        *lines,
        "</skills_available>",
    ])


async def _load_skill_handler(skill_id: str) -> str:
    """Load full skill instructions — DB cache first, files fallback."""
    if not skill_id or not skill_id.strip():
        return "Error: Skill ID cannot be empty."
    sid = skill_id.strip()
    meta = _get_skill_meta(sid)
    if meta is None:
        return f"Error: Skill '{sid}' not found."
    instructions = meta.get("instructions", "")
    header = f"# Skill: {meta['name']}\nDescription: {meta['description']}\n\n"
    allowed = meta.get("allowed_tools", [])
    tools_line = f"Available tools: {', '.join(allowed)}\n\n" if allowed else ""
    return header + tools_line + instructions


async def _read_skill_resource_handler(skill_id: str, resource_name: str) -> str:
    if not skill_id or not skill_id.strip():
        return "Error: Skill ID cannot be empty."
    skill_dir = _SKILLS_ROOT / skill_id.strip()
    if not skill_dir.is_dir():
        return f"Error: Skill '{skill_id}' not found."
    for subdir in ("references", "assets", ""):
        p = skill_dir / subdir / resource_name if subdir else skill_dir / resource_name
        if p.exists() and p.is_file():
            try:
                return p.read_text(encoding="utf-8")
            except OSError as exc:
                return f"Error: Failed to read resource '{resource_name}': {exc}"
    return f"Error: Resource '{resource_name}' not found in skill '{skill_id}'."


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
    description="Read a supplementary resource file from a skill directory.",
    func=_read_skill_resource_handler,
    input_model={
        "type": "object",
        "properties": {
            "skill_id": {"type": "string", "description": "The skill ID."},
            "resource_name": {"type": "string", "description": "File name inside the skill directory."},
        },
        "required": ["skill_id", "resource_name"],
    },
    approval_mode="never_require",
)

SKILL_TOOLS: list[FunctionTool] = [load_skill_tool, read_skill_resource_tool]


def get_skill_tool_names() -> list[str]:
    return [t.name for t in SKILL_TOOLS]


def _build_inline_skill(skill_id: str) -> InlineSkill | None:
    meta = _get_skill_meta(skill_id)
    if not meta:
        return None
    frontmatter = SkillFrontmatter(
        id=meta["id"],
        name=meta["name"],
        description=meta["description"],
        allowed_tools=meta.get("allowed_tools", []),
        requires_human_approval=meta.get("requires_human_approval", False),
        max_tool_count=meta.get("max_tool_count", 0),
    )
    return InlineSkill(frontmatter=frontmatter, content=meta.get("instructions", ""))


def create_skills_provider(allowed_skills: set[str] | None) -> SkillsProvider | None:
    if not allowed_skills:
        return None
    inline_skills = []
    for skill_id in sorted(allowed_skills):
        skill = _build_inline_skill(skill_id)
        if skill:
            inline_skills.append(skill)
    if not inline_skills:
        return None
    return SkillsProvider(source=SkillsSource.INLINE, skills=inline_skills)
