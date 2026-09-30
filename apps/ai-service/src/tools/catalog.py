"""DB-backed agent tool catalog — the capability bridge.

Single source of truth (``ai.agent_tool_catalog``) for which store
capabilities exist and which are exposed to AI agents:

- ``tracked`` rows mirror hand-written FunctionTools from
  ``src/tools/definitions`` (coverage reporting only — never re-registered).
- ``active`` rows are exposed to agents as generic bridge FunctionTools:
  dict JSON-schema + one executor that calls the backend route with the
  stored method/path. Approval gating comes from ``risk_level``
  (write → always_require → merchant approval card).

Adding a backend route today → the drift detector creates a ``draft`` row
(read capabilities can be auto-activated, writes await one-click review —
see src/tools/drift.py).
"""
from __future__ import annotations

import re
from typing import Any

import structlog
from agent_framework import FunctionTool
from sqlalchemy import select

import src.db.session as _db_mod
from src.db.models.agent_tool_catalog import AgentToolCatalog
from src.skills.registry import get_skill_registry
from src.tools.names import canonical_tool_name

logger = structlog.get_logger(__name__)

_EXPOSURE_STATES = {"tracked", "draft", "active", "hidden"}
_RISK_LEVELS = {"read", "write", "direct_write"}

# Prefix map used when mirroring code tools into tracked rows — domain is
# informational (drift reports group by it) so a coarse mapping is enough.
_TOOL_DOMAIN_PREFIXES: tuple[tuple[str, str], ...] = (
    ("product", "products"),
    ("category", "products"),
    ("inventory", "inventory"),
    ("order", "orders"),
    ("customer", "crm"),
    ("sales_", "analytics"),
    ("company_snapshot", "analytics"),
    ("discount", "discounts"),
    ("coupon", "discounts"),
    ("offers", "discounts"),
    ("shipping", "shipping"),
    ("shipment", "shipping"),
    ("payment", "payments"),
    ("conversion", "storefront"),
    ("competitor", "marketing"),
    ("facebook", "marketing"),
    ("whatsapp", "messaging"),
    ("message", "messaging"),
    ("knowledge", "knowledge"),
    ("hr_", "hr"),
    ("booking", "booking"),
    ("hotel", "booking"),
    ("education", "education"),
    ("academy", "education"),
    ("lead_", "crm"),
    ("abandoned", "crm"),
    ("pipeline", "crm"),
    ("followup", "crm"),
    ("deal", "crm"),
    ("purchase_prediction", "crm"),
    ("scheduler", "governance"),
    ("agent_", "governance"),
    ("manage_agent", "governance"),
    ("manage_todo", "governance"),
    ("record_learned", "governance"),
    ("update_agent", "governance"),
    ("unlock", "governance"),
    ("delegate", "governance"),
    ("audit", "governance"),
    ("session", "governance"),
    ("generate", "content"),
    ("check_video", "content"),
)


def infer_tool_domain(name: str) -> str:
    canonical = canonical_tool_name(name).lower()
    for prefix, domain in _TOOL_DOMAIN_PREFIXES:
        if canonical.startswith(prefix):
            return domain
    return "other"


def approval_mode_for_risk(risk_level: str) -> str:
    return "always_require" if risk_level == "write" else "never_require"


def validate_states(*, exposure_state: str | None = None, risk_level: str | None = None) -> None:
    if exposure_state is not None and exposure_state not in _EXPOSURE_STATES:
        raise ValueError(f"Invalid exposure_state '{exposure_state}' — must be one of {sorted(_EXPOSURE_STATES)}")
    if risk_level is not None and risk_level not in _RISK_LEVELS:
        raise ValueError(f"Invalid risk_level '{risk_level}' — must be one of {sorted(_RISK_LEVELS)}")


# ── Generic bridge executor ────────────────────────────────────────────────


def _substitute_path(endpoint: str, path_params: list[str], args: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Fill ``:param`` placeholders from args; return (path, leftover args)."""
    remaining = dict(args)
    path = endpoint
    for param in path_params:
        token = f":{param}"
        if token in path:
            value = remaining.pop(param, None) or remaining.pop(param.replace("-", "_"), None)
            if value is None:
                raise ValueError(f"Missing required path parameter '{param}'")
            path = path.replace(token, str(value))
    if ":" in path.replace("https://", "").replace("http://", "") and re.search(r"/:[A-Za-z_]", path):
        raise ValueError(f"Unresolved path parameters in endpoint: {path}")
    return path, remaining


async def execute_catalog_tool(row: AgentToolCatalog, args: dict[str, Any]) -> dict[str, Any]:
    """Execute an active catalog capability against the backend."""
    from src.tools.backend_client import get_backend_client

    company_id = str(args.pop("company_id", "") or "")
    user_id = args.pop("user_id", None)
    approved = args.pop("approved", None)  # approval is enforced by the gate, never by the tool
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    if not row.endpoint or not row.http_method:
        return {"success": False, "error": f"Catalog tool '{row.name}' has no endpoint configured"}

    try:
        path, leftover = _substitute_path(row.endpoint, list(row.path_params or []), args)
    except ValueError as exc:
        return {"success": False, "error": str(exc)}

    client = get_backend_client()
    method = row.http_method.upper()
    try:
        if method == "GET":
            result = await client.request_capability(method, path, params={**leftover, "companyId": company_id})
        else:
            result = await client.request_capability(
                method, path, json_body={**leftover, "companyId": company_id},
            )
        return {
            "success": True,
            "capability": row.name,
            "result": result,
        }
    except Exception as exc:  # noqa: BLE001 — tool results must not raise into the pipeline
        logger.warning("catalog_tool_failed", tool=row.name, error=str(exc))
        return {"success": False, "error": str(exc), "capability": row.name}


def _make_schema(row: AgentToolCatalog) -> dict[str, Any]:
    schema = dict(row.input_schema or {})
    schema.setdefault("type", "object")
    properties = dict(schema.get("properties") or {})
    properties.setdefault("company_id", {"type": "string", "description": "Tenant ID (auto-injected)"})
    schema["properties"] = properties
    return schema


_JSON_TYPES: dict[str, type] = {
    "string": str,
    "number": float,
    "integer": int,
    "boolean": bool,
    "array": list,
    "object": dict,
}


def _schema_to_pydantic(name: str, schema: dict[str, Any]):
    """Build a pydantic model from the catalog JSON schema.

    The chat pipeline validates args via ``tool.input_model(**arguments)``
    and a dict schema leaves ``input_model`` as None (agent-framework stores
    it separately) — so bridge tools must carry a real model. LLM-visible
    validation errors then match code tools' behavior.
    """
    from pydantic import BaseModel, Field, create_model

    properties: dict[str, Any] = schema.get("properties") or {}
    required = set(schema.get("required") or [])

    fields: dict[str, tuple[type, Any]] = {}
    for prop_name, prop in properties.items():
        prop_type = _JSON_TYPES.get(str(prop.get("type", "string")), str)
        is_required = prop_name in required and prop_name != "company_id"
        description = str(prop.get("description") or "")
        if is_required:
            fields[prop_name] = (prop_type, Field(description=description))
        else:
            default = prop.get("default")
            fields[prop_name] = (prop_type | None, Field(default=default, description=description))

    if not fields:
        fields["company_id"] = (str | None, Field(default=None, description="Tenant ID (auto-injected)"))

    return create_model(f"{name}_Input", __base__=BaseModel, **fields)


def build_catalog_function_tool(row: AgentToolCatalog) -> FunctionTool:
    name = canonical_tool_name(row.name)
    schema = _make_schema(row)

    async def _executor(input_data: Any) -> dict[str, Any]:
        args = dict(input_data) if isinstance(input_data, dict) else (
            input_data.model_dump(exclude_none=True) if hasattr(input_data, "model_dump") else {}
        )
        return await execute_catalog_tool(row, args)

    return FunctionTool(
        name=name,
        description=row.description_en,
        func=_executor,
        input_model=_schema_to_pydantic(name, schema),
        approval_mode=approval_mode_for_risk(row.risk_level),
    )


# ── Startup registration ───────────────────────────────────────────────────


async def register_catalog_tools(session: Any) -> dict[str, int]:
    """Register all ``active`` catalog rows into the SkillRegistry.

    Collision guard: a catalog row whose canonical name already resolves to
    a code tool is SKIPPED loudly (SkillRegistry.register_tool silently
    overwrites — that must never happen for code tools).
    """
    registry = get_skill_registry()
    stats = {"registered": 0, "skipped_collisions": 0, "invalid": 0}

    rows = (await session.execute(
        select(AgentToolCatalog).where(AgentToolCatalog.exposure_state == "active")
    )).scalars().all()

    for row in rows:
        try:
            validate_states(exposure_state=row.exposure_state, risk_level=row.risk_level)
        except ValueError as exc:
            logger.error("catalog_row_invalid", tool=row.name, error=str(exc))
            stats["invalid"] += 1
            continue

        canonical = canonical_tool_name(row.name)
        if registry.resolve(canonical) is not None:
            logger.error(
                "catalog_tool_name_collision_skipped",
                tool=canonical,
                hint="rename the catalog row — code tools own their names",
            )
            stats["skipped_collisions"] += 1
            continue

        registry.register_tool(build_catalog_function_tool(row))
        stats["registered"] += 1

    if stats["registered"] or stats["skipped_collisions"]:
        logger.info("catalog_tools_registered", **stats)
    return stats


async def sync_tracked_tools(session: Any) -> dict[str, int]:
    """Mirror every code FunctionTool into a ``tracked`` catalog row.

    Coverage reporting uses these rows; they are never re-registered as
    bridge tools. Endpoint/risk fields on existing tracked rows are left
    untouched when manually curated.
    """
    from src.tools.registry import WRITE_TOOL_NAMES, DIRECT_WRITE_TOOL_NAMES

    registry = get_skill_registry()
    stats = {"created": 0, "updated": 0}

    existing = {
        row.name: row
        for row in (await session.execute(select(AgentToolCatalog))).scalars().all()
    }

    for tool in registry.get_all_tools():
        name = canonical_tool_name(tool.name)
        if name.startswith("mcp_"):
            continue
        risk = "write" if name in WRITE_TOOL_NAMES else (
            "direct_write" if name in DIRECT_WRITE_TOOL_NAMES else "read"
        )
        description = (getattr(tool, "description", "") or "")[:2000]
        row = existing.get(name)
        if row is None:
            session.add(AgentToolCatalog(
                name=name,
                domain=infer_tool_domain(name),
                description_en=description,
                risk_level=risk,
                exposure_state="tracked",
                source="curated",
            ))
            stats["created"] += 1
        elif row.exposure_state == "tracked":
            # keep curated endpoint fields; refresh risk + description drift
            if row.risk_level != risk or row.description_en != description:
                row.risk_level = risk
                row.description_en = description
                stats["updated"] += 1

    await session.commit()
    logger.info("catalog_tracked_tools_synced", **stats)
    return stats


async def register_catalog_at_startup() -> dict[str, int]:
    """Startup hook: sync tracked rows then register active bridge tools."""
    sf = _db_mod.async_session
    if not sf:
        logger.warning("catalog_startup_skipped", reason="no async_session")
        return {"registered": 0, "skipped_collisions": 0, "invalid": 0}

    async with sf() as session:
        try:
            await sync_tracked_tools(session)
        except Exception as exc:  # noqa: BLE001 — never block startup on catalog sync
            logger.error("catalog_tracked_sync_failed", error=str(exc))
        return await register_catalog_tools(session)


# ── Role augmentation (used by activation flows) ───────────────────────────


def add_tool_to_roles_yaml(tool_name: str, roles: list[str]) -> int:
    """Append a tool to role lists in role_tools.yaml + the in-memory
    ROLE_TOOLS mapping. Persisted so restarts and role_registry reloads
    both pick it up. Returns number of roles updated."""
    import yaml

    from src.tools.registry import ROLE_TOOLS

    canonical = canonical_tool_name(tool_name)
    updated = 0
    path = _role_tools_path()
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    else:
        data = {}

    roles_map: dict[str, list[str]] = data.get("roles", {}) or {}
    for role in roles:
        entries = roles_map.get(role)
        if entries is None:
            continue  # unknown role — never invent one
        if canonical in entries:
            continue
        entries.append(canonical)
        updated += 1

    if updated:
        with open(path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)
        # in-memory augmentation for immediate effect (same process)
        for role in roles:
            if role in ROLE_TOOLS and canonical not in ROLE_TOOLS[role]:
                ROLE_TOOLS[role].append(canonical)
    return updated


def _role_tools_path():
    from pathlib import Path

    return Path(__file__).parent / "role_tools.yaml"
