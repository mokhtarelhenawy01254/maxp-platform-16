"""Capability catalog (ai.agent_tool_catalog) tests — registration machinery,
collision guard, risk→approval mapping, and the generic bridge executor.
Uses an in-memory mock session (no Postgres dependency).
"""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

import src.tools.registry  # noqa: F401 — triggers auto-discovery into SkillRegistry
from src.tools.catalog import (
    approval_mode_for_risk,
    build_catalog_function_tool,
    execute_catalog_tool,
    infer_tool_domain,
    validate_states,
)
from src.tools.names import canonical_tool_name


class _MockResult:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _MockSession:
    """Async-session stand-in; only supports the select/commit surface used
    by catalog.sync_tracked_tools / register_catalog_tools."""

    def __init__(self, rows: list[Any] | None = None):
        self.rows = rows or []
        self.added: list[Any] = []
        self.committed = False

    async def execute(self, *_a, **_kw):
        return _MockResult(self.rows)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True


def _catalog_row(**overrides: Any) -> SimpleNamespace:
    base = dict(
        name="returns_request_update",
        domain="returns",
        description_en="Update the status of a return request.",
        usage_hint_ar=None,
        endpoint="/api/v1/returns/requests/:id",
        http_method="PUT",
        input_schema={
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Return request ID"},
                "status": {"type": "string", "description": "New status"},
            },
            "required": ["id", "status"],
        },
        path_params=["id"],
        permission_key="orders.edit",
        app_slug="order-core",
        risk_level="write",
        exposure_state="active",
        roles=["STORE_MANAGER"],
        source="curated",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def test_approval_mode_from_risk_level():
    assert approval_mode_for_risk("write") == "always_require"
    assert approval_mode_for_risk("read") == "never_require"
    assert approval_mode_for_risk("direct_write") == "never_require"


def test_validate_states_rejects_unknown():
    with pytest.raises(ValueError):
        validate_states(exposure_state="banana")
    with pytest.raises(ValueError):
        validate_states(risk_level="maybe")
    validate_states(exposure_state="active", risk_level="write")


def test_infer_tool_domain_prefix_map():
    assert infer_tool_domain("product_search") == "products"
    assert infer_tool_domain("order_lookup_by_phone") == "orders"
    assert infer_tool_domain("shipping_ticket_create") == "shipping"
    assert infer_tool_domain("totally_unknown") == "other"


def test_build_catalog_function_tool_uses_risk_approval():
    tool = build_catalog_function_tool(_catalog_row())
    assert tool.name == "returns_request_update"
    assert tool.approval_mode == "always_require"
    # input_model must be a real pydantic model — the chat pipeline validates
    # via tool.input_model(**arguments) and dict schemas leave it as None
    assert tool.input_model is not None
    assert "company_id" in tool.input_model.model_fields
    assert "id" in tool.input_model.model_fields

    # required fields are enforced like code tools
    with pytest.raises(Exception):
        tool.input_model(company_id="comp1")  # missing required id/status


def test_build_catalog_function_tool_read_never_requires():
    row = _catalog_row(name="returns_list", http_method="GET", risk_level="read",
                       endpoint="/api/v1/returns/requests", path_params=[])
    tool = build_catalog_function_tool(row)
    assert tool.approval_mode == "never_require"


@pytest.mark.asyncio
async def test_executor_substitutes_path_params(monkeypatch):
    captured: dict[str, Any] = {}

    class _MockClient:
        async def request_capability(self, method, path, params=None, json_body=None):
            captured.update(method=method, path=path, json_body=json_body, params=params)
            return {"success": True, "data": []}

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: _MockClient())

    row = _catalog_row()
    result = await execute_catalog_tool(row, {
        "company_id": "comp1", "id": "ret_9", "status": "APPROVED",
    })
    assert result["success"] is True
    assert captured["method"] == "PUT"
    assert captured["path"] == "/api/v1/returns/requests/ret_9"
    assert captured["json_body"] == {"status": "APPROVED", "companyId": "comp1"}


@pytest.mark.asyncio
async def test_executor_missing_path_param_fails_cleanly(monkeypatch):
    class _MockClient:
        async def request_capability(self, *a, **kw):
            raise AssertionError("must not be called")

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: _MockClient())

    result = await execute_catalog_tool(_catalog_row(), {"company_id": "comp1", "status": "APPROVED"})
    assert result["success"] is False
    assert "id" in result["error"]


@pytest.mark.asyncio
async def test_executor_missing_company_id_fails(monkeypatch):
    result = await execute_catalog_tool(_catalog_row(), {"id": "ret_1"})
    assert result["success"] is False
    assert "company_id" in result["error"]


@pytest.mark.asyncio
async def test_executor_strips_approved_flag(monkeypatch):
    """Approval is enforced by the pipeline gate (risk_level=write) — the
    executor itself must ignore any approved flag in args."""
    captured: dict[str, Any] = {}

    class _MockClient:
        async def request_capability(self, method, path, params=None, json_body=None):
            captured.update(json_body=json_body)
            return {"success": True}

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: _MockClient())

    result = await execute_catalog_tool(_catalog_row(), {
        "company_id": "comp1", "id": "ret_9", "status": "APPROVED", "approved": True,
    })
    assert result["success"] is True
    assert "approved" not in captured["json_body"]


@pytest.mark.asyncio
async def test_register_catalog_tools_collision_guard(monkeypatch):
    """A catalog row whose name collides with a code tool must be SKIPPED —
    SkillRegistry.register_tool silently overwrites (last-wins)."""
    from src.skills.registry import get_skill_registry
    from src.tools.catalog import register_catalog_tools

    registry = get_skill_registry()
    code_tool = registry.resolve("product_search")
    assert code_tool is not None  # exists as a code tool

    row = _catalog_row(name="product_search")  # collision!
    session = _MockSession(rows=[row])

    stats = await register_catalog_tools(session)
    assert stats["skipped_collisions"] == 1
    assert stats["registered"] == 0
    assert registry.resolve("product_search") is code_tool  # untouched


@pytest.mark.asyncio
async def test_register_catalog_tools_registers_active(monkeypatch):
    from src.skills.registry import get_skill_registry
    from src.tools.catalog import register_catalog_tools

    registry = get_skill_registry()
    row = _catalog_row()
    session = _MockSession(rows=[row])

    stats = await register_catalog_tools(session)
    assert stats["registered"] == 1

    registered = registry.resolve("returns_request_update")
    assert registered is not None
    assert registered.approval_mode == "always_require"

    # cleanup the singleton so other tests are unaffected
    registry._tools.pop(canonical_tool_name("returns_request_update"), None)


# ── Phase 3: curated pilot domains ─────────────────────────────────────────


def test_curated_seed_rows_are_consistent():
    """Every curated row must carry a valid state, a real-shaped endpoint,
    matching path_params, and risk_level consistent with its description."""
    from src.tools.catalog_seed import CURATED_CAPABILITIES
    from src.tools.catalog import validate_states
    import re

    assert len(CURATED_CAPABILITIES) >= 8
    names = set()
    for cap in CURATED_CAPABILITIES:
        validate_states(exposure_state=cap["exposure_state"], risk_level=cap["risk_level"])
        assert cap["exposure_state"] == "active"
        assert cap["name"] not in names, f"duplicate curated name {cap['name']}"
        names.add(cap["name"])
        assert cap["endpoint"].startswith("/api/v1/")
        params_in_path = set(re.findall(r"/:([A-Za-z_]+)", cap["endpoint"]))
        assert params_in_path == set(cap.get("path_params", [])), cap["name"]
        if cap["risk_level"] == "write":
            assert "APPROVAL" in cap["description_en"], cap["name"]


def test_curated_names_do_not_collide_with_code_tools():
    """Catalog names must never shadow the 137 code tools."""
    from src.skills.registry import get_skill_registry
    from src.tools.catalog_seed import CURATED_CAPABILITIES

    registry = get_skill_registry()
    for cap in CURATED_CAPABILITIES:
        assert registry.resolve(cap["name"]) is None, (
            f"curated name {cap['name']} collides with a code tool — rename it"
        )
