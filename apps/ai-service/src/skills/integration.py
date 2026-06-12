from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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

logger = structlog.get_logger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _read_skill_json(skill_dir: Path) -> dict[str, Any] | None:
    """Read skill.json from a skill directory."""
    try:
        return json.loads((skill_dir / "skill.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        logger.warning("skill_json_read_failed", path=str(skill_dir), error=str(exc))
        return None


def _read_skill_md(skill_dir: Path) -> str | None:
    """Read SKILL.md from a skill directory."""
    path = skill_dir / "SKILL.md"
    if not path.exists():
        logger.warning("skill_md_not_found", path=str(path))
        return None
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        logger.warning("skill_md_read_failed", path=str(path), error=str(exc))
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
    """Extract skill metadata from skill.json + SKILL.md in a skill directory."""
    config = _read_skill_json(skill_dir)
    if not config:
        return None
    content = _read_skill_md(skill_dir)
    if content is None:
        return None
    return {
        "id": config.get("id", skill_dir.name),
        "name": config.get("displayName", skill_dir.name),
        "description": config.get("description", ""),
        "instructions": content,
    }


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
            config = _read_skill_json(skill_dir)
            if config is None:
                continue
            content = _read_skill_md(skill_dir)
            if content is None:
                continue
            frontmatter = SkillFrontmatter(
                name=config.get("displayName", skill_dir.name),
                description=config.get("description", ""),
            )
            skills.append(
                InlineSkill(
                    frontmatter=frontmatter,
                    instructions=content,
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
