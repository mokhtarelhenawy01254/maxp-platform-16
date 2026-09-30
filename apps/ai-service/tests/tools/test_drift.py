"""Drift detector tests — new backend capabilities become catalog rows
(reads auto-activate, writes stay draft) and vanished endpoints get flagged
stale. Mock session + manifest (no HTTP, no Postgres).
"""
from __future__ import annotations

from typing import Any

import pytest

from src.tools.drift import run_drift_check


class _MockResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _MockSession:
    def __init__(self, rows):
        self.rows = rows
        self.merged: list[Any] = []
        self.committed = False

    async def execute(self, *_a, **_kw):
        return _MockResult(self.rows)

    async def merge(self, obj):
        # AsyncSession.merge is awaitable in production — mocks must match
        self.merged.append(obj)

    async def commit(self):
        self.committed = True


def _row(**kw):
    base = dict(
        name="bridge_returns_requests_list",
        domain="returns",
        description_en="x",
        endpoint="/api/v1/returns/requests",
        http_method="GET",
        input_schema={},
        path_params=[],
        permission_key=None,
        app_slug=None,
        risk_level="read",
        exposure_state="active",
        roles=[],
        source="curated",
        catalog_metadata={},
    )
    base.update(kw)
    return type("R", (), base)


MANIFEST = [
    {"method": "GET", "path": "/api/v1/returns/requests", "permissionKey": "orders.view", "appSlug": "order-core"},
    {"method": "POST", "path": "/api/v1/coupons", "permissionKey": "products.create", "appSlug": "coupons-pro"},
    {"method": "GET", "path": "/api/v1/brand-new-widget", "permissionKey": None, "appSlug": None},
]


@pytest.mark.asyncio
async def test_new_manifest_routes_become_catalog_rows():
    session = _MockSession(rows=[_row()])
    stats = await run_drift_check(session, manifest=MANIFEST)

    # GET returns/requests is covered (unchanged) — the other two are new
    assert stats["new_capabilities"] == 2
    # GET is auto-activated, POST stays draft (writes await one-click review)
    assert stats["new_active_reads"] == 1
    merged = session.merged
    by_name = {m.name: m for m in merged}
    widget = by_name["bridge_get_brand_new_widget"]
    assert widget.exposure_state == "active"
    assert widget.risk_level == "read"
    coupon = by_name["bridge_post_coupons"]
    assert coupon.exposure_state == "draft"
    assert coupon.risk_level == "write"
    assert coupon.source == "auto"


@pytest.mark.asyncio
async def test_vanished_endpoint_flagged_stale():
    orphan = _row(name="bridge_removed_thing", endpoint="/api/v1/removed/thing", http_method="GET")
    session = _MockSession(rows=[orphan])
    stats = await run_drift_check(session, manifest=MANIFEST)

    assert stats["stale_flags"] == 1
    assert orphan.catalog_metadata["stale"] is True


@pytest.mark.asyncio
async def test_manifest_fetch_failure_is_swallowed(monkeypatch):
    async def boom():
        raise RuntimeError("backend down")

    monkeypatch.setattr("src.tools.drift.fetch_capability_manifest", boom)
    session = _MockSession(rows=[])
    stats = await run_drift_check(session, manifest=None)
    assert stats == {"new_capabilities": 0, "new_active_reads": 0, "stale_flags": 0, "unchanged": 0}


@pytest.mark.asyncio
async def test_excluded_prefixes_not_present_via_manifest_shape():
    """Internal/super-admin routes are excluded backend-side; the detector
    must not invent rows for paths outside /api/v1/<domain>/..."""
    session = _MockSession(rows=[])
    await run_drift_check(session, manifest=[
        {"method": "GET", "path": "weird-relative-path"},
        {"method": "GET", "path": ""},
    ])
    assert session.merged == []


@pytest.mark.asyncio
async def test_public_routes_auto_hidden():
    """Storefront-public and inbound webhook routes are created as hidden
    auto rows — not agent-callable surface, must not pollute search."""
    session = _MockSession(rows=[])
    stats = await run_drift_check(session, manifest=[
        {"method": "GET", "path": "/api/v1/public/products", "permissionKey": None, "appSlug": None},
        {"method": "POST", "path": "/api/v1/webhook", "permissionKey": None, "appSlug": None},
        {"method": "GET", "path": "/api/v1/products", "permissionKey": "products.view", "appSlug": None},
    ])
    by_name = {m.name: m for m in session.merged}
    assert by_name["bridge_get_public_products"].exposure_state == "hidden"
    assert by_name["bridge_post_webhook"].exposure_state == "hidden"
    assert by_name["bridge_get_products"].exposure_state == "active"
    assert stats["new_active_reads"] == 1  # hidden reads don't count as active
