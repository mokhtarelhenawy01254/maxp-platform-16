from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def search_competitors(
    company_id: str, query: str, limit: int = 10
) -> list[dict[str, Any]]:
    """Search competitors by name or URL."""
    client = get_backend_client()
    return await client.search_competitors(company_id, query, limit=limit)


async def get_competitor_products(
    company_id: str, competitor_id: str, limit: int = 20
) -> list[dict[str, Any]]:
    """List products of a specific competitor."""
    client = get_backend_client()
    return await client.get_competitor_products(company_id, competitor_id, limit=limit)


async def competitor_price_compare(
    company_id: str, competitor_id: str
) -> dict[str, Any]:
    """Compare prices between your products and a competitor's products."""
    client = get_backend_client()
    return await client.competitor_price_compare(company_id, competitor_id)


async def get_competitor_ads(
    company_id: str, competitor_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    """List ads of a specific competitor."""
    client = get_backend_client()
    return await client.get_competitor_ads(company_id, competitor_id, limit=limit)


async def generate_competitor_report(
    company_id: str, competitor_id: str, report_type: str = "weekly"
) -> dict[str, Any]:
    """Generate an AI analysis report for a competitor (approval-required write)."""
    client = get_backend_client()
    return await client.generate_competitor_report(company_id, competitor_id, report_type)
