"""Capability drift detector — compares the backend capability manifest
(GET /api/v1/internal/capabilities, Phase 1) against the agent tool catalog
(code tools mirrored as ``tracked`` rows + curated/active bridge rows).

Findings:
- NEW backend capability with no catalog coverage → ``draft`` row
  (source=auto). Reads can be auto-activated (approved policy: reads go
  live immediately); writes stay ``draft`` until one-click merchant review.
- Catalog endpoint no longer present in the manifest → row flagged stale
  in catalog_metadata (zombie callers like the retired /ai-bridge/* show up
  here).
- Coverage report per domain for the merchant dashboard.

Runs at startup and hourly (asyncio task in main.py); never raises into the
caller — a failed manifest fetch is logged and retried next cycle.
"""
from __future__ import annotations

import time
from typing import Any

import structlog
from sqlalchemy import select

import src.db.session as _db_mod
from src.db.models.agent_tool_catalog import AgentToolCatalog

logger = structlog.get_logger(__name__)

DRIFT_INTERVAL_SECONDS = 60 * 60  # hourly
_manifest_cache: dict[str, Any] = {"at": 0.0, "capabilities": []}


async def fetch_capability_manifest() -> list[dict[str, Any]]:
    """Fetch the backend manifest with a 5-minute cache (matches the
    backend-side cache TTL)."""
    from src.tools.backend_client import get_backend_client

    if time.monotonic() - _manifest_cache["at"] < 300 and _manifest_cache["capabilities"]:
        return _manifest_cache["capabilities"]

    client = get_backend_client()
    result = await client._request("GET", "/api/v1/internal/capabilities")
    capabilities = result.get("capabilities") or []
    _manifest_cache["at"] = time.monotonic()
    _manifest_cache["capabilities"] = capabilities
    return capabilities


def _method_of(route_method: str) -> str:
    return {"ALL": "GET", "PATCH": "PUT"}.get(route_method, route_method)


def _infer_write(method: str) -> bool:
    return method.upper() in ("POST", "PUT", "PATCH", "DELETE")


def _infer_domain(path: str) -> str:
    segment = path.strip("/").split("/")
    # /api/v1/<domain>/...
    if len(segment) >= 3 and segment[0] == "api" and segment[1] == "v1":
        return segment[2].replace("-", "_")
    return "other"


def _bridge_route_name(path: str) -> str:
    """Deterministic bridge row name from a manifest path, e.g.
    /api/v1/brand-new-widget → bridge_brand_new_widget.
    Non-/api/v1 paths return '' (caller skips them)."""
    marker = "/api/v1/"
    if marker not in path:
        return ""
    tail = path.split(marker, 1)[1]
    tail = tail.replace("/", "_").replace("-", "_")
    # strip :param placeholders → stable names
    tail = tail.replace(":", "")
    return f"bridge_{tail}"[:118]


def _humanize_route(route: dict[str, Any]) -> str:
    method = route.get("method") or "GET"
    path = route.get("path") or ""
    name = path.strip("/").split("/")[-1] or path
    pretty = name.replace("-", " ").replace("_", " ").replace(":param", "by id").strip()
    return f"{method} {pretty}"[:300]


def _pairs_from_manifest(manifest: list[dict[str, Any]]) -> set[tuple[str, str]]:
    return {
        (_method_of(str(r.get("method") or "GET")), str(r.get("path") or ""))
        for r in manifest
    }


async def run_drift_check(session: Any, manifest: list[dict[str, Any]] | None = None) -> dict[str, int]:
    """Diff manifest ↔ catalog. Returns counts for logging/tests."""
    stats = {"new_capabilities": 0, "new_active_reads": 0, "stale_flags": 0, "unchanged": 0}

    if manifest is None:
        try:
            manifest = await fetch_capability_manifest()
        except Exception as exc:  # noqa: BLE001 — never raise into the caller
            logger.warning("drift_manifest_fetch_failed", error=str(exc))
            return stats

    rows = (await session.execute(select(AgentToolCatalog))).scalars().all()
    by_endpoint = {
        (r.http_method or "", r.endpoint or ""): r
        for r in rows
        if r.endpoint and r.exposure_state in ("active", "draft")
    }

    for route in manifest:
        method = _method_of(str(route.get("method") or "GET"))
        path = str(route.get("path") or "")
        if not path:
            continue
        if (method, path) in by_endpoint:
            stats["unchanged"] += 1
            continue

        name = _bridge_route_name(path)
        if not name:
            continue  # not a versioned API path — not a store capability
        is_write = _infer_write(method)
        # Auto-activate reads only — writes await one-click review (policy).
        state = "draft" if is_write else "active"

        session.merge(AgentToolCatalog(
            name=name,
            domain=_infer_domain(path),
            description_en=f"Auto-discovered backend capability: {_humanize_route(route)}",
            endpoint=path,
            http_method=method,
            input_schema={"type": "object", "properties": {}},
            path_params=[],
            permission_key=route.get("permissionKey"),
            app_slug=route.get("appSlug"),
            risk_level="write" if is_write else "read",
            exposure_state=state,
            roles=[],
            source="auto",
            catalog_metadata={"manifest_seen_at": time.time()},
        ))
        stats["new_capabilities"] += 1
        if not is_write:
            stats["new_active_reads"] += 1

    # Stale flags: active/draft rows whose endpoint vanished from the manifest
    manifest_pairs = _pairs_from_manifest(manifest)
    for r in rows:
        if not r.endpoint or r.exposure_state not in ("active", "draft"):
            continue
        if (r.http_method or "", r.endpoint) in manifest_pairs:
            continue
        meta = dict(r.catalog_metadata or {})
        if not meta.get("stale"):
            meta["stale"] = True
            meta["stale_detected_at"] = time.time()
            r.catalog_metadata = meta
            stats["stale_flags"] += 1

    await session.commit()
    if stats["new_capabilities"] or stats["stale_flags"]:
        logger.info("drift_check_findings", **stats)
    return stats


async def drift_loop() -> None:
    """Hourly background loop (launched from main.py)."""
    import asyncio

    while True:
        await asyncio.sleep(DRIFT_INTERVAL_SECONDS)
        sf = _db_mod.async_session
        if not sf:
            continue
        try:
            async with sf() as session:
                await run_drift_check(session)
        except Exception as exc:  # noqa: BLE001
            logger.warning("drift_loop_iteration_failed", error=str(exc))


def start_drift_loop() -> None:
    import asyncio

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return  # no running loop (e.g. sync context) — skip
    asyncio.create_task(drift_loop())
