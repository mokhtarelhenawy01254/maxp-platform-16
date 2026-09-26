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

# ── Tenant-scoped learned skills cache (Hermes Multi-Tenant Engine) ──────────
# Key = company_id, Value = dict[skill_id, normalized metadata dict].
_tenant_skills_cache: dict[str, dict[str, dict[str, Any]]] = {}

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


def register_tenant_skill_in_cache(company_id: str, skill_meta: dict[str, Any]) -> None:
    """Registers a dynamically learned skill for a specific merchant tenant."""
    if not company_id or not skill_meta:
        return
    if company_id not in _tenant_skills_cache:
        _tenant_skills_cache[company_id] = {}
    skill_id = skill_meta.get("id") or skill_meta.get("skill_id")
    if skill_id:
        _tenant_skills_cache[company_id][skill_id] = skill_meta


def get_tenant_skills_from_cache(company_id: str) -> list[dict[str, Any]]:
    """Returns all cached learned skills for a specific merchant tenant."""
    if not company_id or company_id not in _tenant_skills_cache:
        return []
    return list(_tenant_skills_cache[company_id].values())


def clear_skills_cache(skill_id: str | None = None, company_id: str | None = None) -> None:
    if company_id:
        if skill_id and company_id in _tenant_skills_cache:
            _tenant_skills_cache[company_id].pop(skill_id, None)
        else:
            _tenant_skills_cache.pop(company_id, None)
    elif skill_id:
        _skill_meta_cache.pop(skill_id, None)
        _skill_json_cache.pop(skill_id, None)
        _skill_md_cache.pop(skill_id, None)
        _db_skills_cache.pop(skill_id, None)
    else:
        _skill_meta_cache.clear()
        _skill_json_cache.clear()
        _skill_md_cache.clear()
        _db_skills_cache.clear()
        _tenant_skills_cache.clear()


async def hydrate_tenant_skills_from_db(company_id: str, session: Any = None) -> list[dict[str, Any]]:
    """Load tenant-scoped skills and playbooks from PostgreSQL into _tenant_skills_cache.
    Ensures learned rules and custom skills persist across PM2 reloads and service restarts.
    """
    if not company_id:
        return []

    # If already populated in cache, return cached entries
    if company_id in _tenant_skills_cache and _tenant_skills_cache[company_id]:
        return list(_tenant_skills_cache[company_id].values())

    from sqlalchemy import select as sa_select
    from src.db.models.skill import Skill as SkillModel

    async def _do_load(sess: Any) -> list[dict[str, Any]]:
        stmt = sa_select(SkillModel).where(
            SkillModel.company_id == company_id,
            SkillModel.enabled == True,
        )
        result = await sess.execute(stmt)
        skills = result.scalars().all()
        for skill in skills:
            register_tenant_skill_in_cache(company_id, {
                "id": skill.id,
                "name": skill.name,
                "description": skill.description or "",
                "instructions": skill.instructions or skill.content or "",
                "content": skill.content or skill.instructions or "",
                "allowed_tools": skill.allowed_tools or [],
                "trigger_phrases": skill.trigger_phrases or "",
                "enabled": skill.enabled,
                "priority": skill.priority,
                "skill_metadata": skill.skill_metadata or {},
            })
        logger.info("tenant_skills_hydrated_from_db", company_id=company_id, count=len(skills))
        return get_tenant_skills_from_cache(company_id)

    if session is not None:
        return await _do_load(session)

    try:
        from src.db.session import async_session
        if async_session:
            async with async_session() as new_session:
                return await _do_load(new_session)
    except Exception as exc:
        logger.warning("hydrate_tenant_skills_from_db_failed", company_id=company_id, error=str(exc))

    return []


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
        raw_triggers = skill.trigger_phrases or ""
        trigger_list = [t.strip() for t in raw_triggers.split(",") if t.strip()] if raw_triggers else []
        _db_skills_cache[skill.id] = {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description or "",
            "instructions": skill.content or skill.instructions or "",
            "allowed_tools": [canonical_tool_name(t) for t in allowed],
            "trigger_phrases": trigger_list,
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
    raw_triggers = config.get("triggerPhrases", [])
    meta = {
        "id": config.get("id", skill_dir.name),
        "name": config.get("displayName", skill_dir.name),
        "description": config.get("description", ""),
        "instructions": content,
        "allowed_tools": [canonical_tool_name(t) for t in raw_tools],
        "trigger_phrases": raw_triggers if isinstance(raw_triggers, list) else [],
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


from src.agents.role_registry import get_role, all_roles

ROLE_DOMAIN_MAP: dict[str, set[str]] = {
    k: {spec.domain, "GENERAL", *[s.upper() for s in spec.approval_policy.get("allowed_scopes", [])]}
    for k, spec in all_roles().items()
}
ROLE_DOMAIN_MAP.update({
    "CUSTOMER_SUPPORT": {"CUSTOMER_SUPPORT", "SUPPORT", "GENERAL"},
    "GENERAL": {"GENERAL"},
})



def get_skills_block(
    allowed_skills: set[str] | None,
    company_id: str | None = None,
    agent_role: str | None = None,
    user_message: str | None = None,
) -> str:
    lines: list[str] = []
    if allowed_skills:
        for meta in _iter_allowed_skills_meta(allowed_skills):
            lines.append(f'<skill id="{meta["id"]}">')
            lines.append(f'<name>{meta["name"]}</name>')
            lines.append(f'<description>{meta["description"]}</description>')
            triggers = meta.get("trigger_phrases", [])
            if triggers:
                lines.append(f'<trigger_phrases>{" | ".join(triggers[:10])}</trigger_phrases>')
            allowed = meta.get("allowed_tools", [])
            if allowed:
                lines.append(f'<allowed_tools>{" ".join(allowed)}</allowed_tools>')
            lines.append(meta["instructions"])
            lines.append("</skill>")

    # Hermes Multi-Tenant Progressive Disclosure (L0 Index vs L1 Active Skills)
    l0_index_parts: list[str] = []
    l1_active_parts: list[str] = []

    if company_id:
        allowed_domains = ROLE_DOMAIN_MAP.get(agent_role.upper(), {get_role(agent_role).domain, "GENERAL"}) if agent_role else None
        tenant_skills = get_tenant_skills_from_cache(company_id)
        lower_user_msg = (user_message or "").lower()

        for t_skill in tenant_skills:
            if not t_skill.get("enabled", True):
                continue

            meta = t_skill.get("skill_metadata") or {}
            # Verify status is ACTIVE (or not PENDING/REJECTED)
            status = meta.get("status") or ("ACTIVE" if t_skill.get("enabled") else "PENDING_APPROVAL")
            if status != "ACTIVE":
                continue

            skill_domain = (meta.get("skill_type") or "GENERAL").upper()
            if allowed_domains and skill_domain not in allowed_domains:
                continue  # Role-based domain isolation: skip non-matching skills

            skill_id = t_skill.get("id") or ""
            skill_name = t_skill.get("name") or "مهارة تشغيلية"
            # Hermes standard: description <= 60 chars ending with a period
            raw_desc = t_skill.get("description") or skill_name
            desc_60 = raw_desc[:59].strip()
            if not desc_60.endswith("."):
                desc_60 = f"{desc_60}."

            raw_trig = meta.get("trigger_phrases") or t_skill.get("trigger_phrases") or []
            if isinstance(raw_trig, str):
                triggers = [t.strip() for t in raw_trig.split(",") if t.strip()]
            elif isinstance(raw_trig, list):
                triggers = [str(t).strip() for t in raw_trig if str(t).strip()]
            else:
                triggers = []

            # Check for JIT L1 match against incoming message or active domain playbook
            is_playbook = (
                "playbook" in skill_id.lower()
                or meta.get("skill_type") == "PLAYBOOK"
                or (allowed_domains and skill_domain in allowed_domains and "playbook" in skill_name.lower())
            )
            is_hit = is_playbook or (any(trig in lower_user_msg for trig in triggers) if (lower_user_msg and triggers) else False)

            if is_hit:
                instr = t_skill.get("instructions") or t_skill.get("content") or ""
                if instr:
                    l1_active_parts.append(
                        f'<active_skill id="{skill_id}" name="{skill_name}">'
                        f'\n{instr.strip()}\n'
                        f'</active_skill>'
                    )
            else:
                # Level 0 (L0) compact index: consumes almost 0 tokens
                triggers_repr = ", ".join(triggers[:4]) if triggers else "عام"
                l0_index_parts.append(
                    f'  <skill id="{skill_id}" name="{skill_name}" description="{desc_60}" triggers="{triggers_repr}" />'
                )

    if not lines and not l0_index_parts and not l1_active_parts:
        return ""

    result = []
    if lines:
        result.append("<skills>\n" + "\n".join(lines) + "\n</skills>")

    if l0_index_parts:
        result.append(
            f'<available_skills company_id="{company_id}">\n'
            + "\n".join(l0_index_parts)
            + "\n</available_skills>"
        )

    if l1_active_parts:
        result.append(
            f'<active_tenant_skills company_id="{company_id}">\n'
            + "\n".join(l1_active_parts)
            + "\n</active_tenant_skills>"
        )

    return "\n\n" + "\n\n".join(result)



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


def get_skill_allowed_tools(skill_id: str) -> list[str]:
    """Return allowed tools for a skill — DB cache first, filesystem fallback.

    Replaces direct filesystem reads in BaseAgent._resolve_tools().
    """
    meta = _get_skill_meta(skill_id)
    if not meta:
        return []
    tools = meta.get("allowed_tools")
    if tools is not None:
        return [canonical_tool_name(str(t)) for t in tools]
    tools = meta.get("allowedTools", meta.get("tools", []))
    return [canonical_tool_name(str(t)) for t in tools]


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
