from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.repositories.stock_monitor_repository import StockMonitorRepository


class InventoryVariantStockScanInput(BaseModel):
    threshold: int = Field(default=5, description="Stock threshold to classify as low stock (default 5)")
    include_out_of_stock_only: bool = Field(default=False, description="If True, return only completely exhausted items (stock = 0)")
    limit: int = Field(default=50, description="Max items to return (1-100)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class InventoryBurnRateForecastInput(BaseModel):
    days_lookback: int = Field(default=7, description="Number of past days to calculate sales velocity from (e.g. 7, 14, 30)")
    limit: int = Field(default=30, description="Max products to analyze (1-50)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def inventory_variant_stock_scan(input_data: InventoryVariantStockScanInput) -> dict[str, Any]:
    """Scan both products and individual variants (sizes/colors) for zero or low stock."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"items": [], "count": 0, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = StockMonitorRepository(sess)
        items = await repo.scan_variant_low_stock(
            company_id=company_id,
            threshold=input_data.threshold,
            include_out_of_stock_only=input_data.include_out_of_stock_only,
            limit=input_data.limit,
        )

    out_of_stock = [i for i in items if i.get("status") == "OUT_OF_STOCK"]
    low_stock = [i for i in items if i.get("status") == "LOW_STOCK"]

    return {
        "count": len(items),
        "outOfStockCount": len(out_of_stock),
        "lowStockCount": len(low_stock),
        "items": items,
    }


async def inventory_burn_rate_forecast(input_data: InventoryBurnRateForecastInput) -> dict[str, Any]:
    """Calculate daily sales velocity and predict exact days until stock depletion for each product."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"products": [], "count": 0, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = StockMonitorRepository(sess)
        products = await repo.calculate_burn_rate_and_forecast(
            company_id=company_id,
            days_lookback=input_data.days_lookback,
            limit=input_data.limit,
        )

    critical = [p for p in products if p.get("riskLevel") == "CRITICAL"]
    warning = [p for p in products if p.get("riskLevel") == "WARNING"]

    return {
        "count": len(products),
        "criticalCount": len(critical),
        "warningCount": len(warning),
        "lookbackDays": input_data.days_lookback,
        "products": products,
    }


def _format_variant_stock_scan(result: dict) -> str:
    count = result.get("count", 0)
    out_cnt = result.get("outOfStockCount", 0)
    low_cnt = result.get("lowStockCount", 0)
    if count == 0:
        return "المخزون ممتاز، لا توجد أصناف أو مقاسات منتهية أو منخفضة الرصيد."
    return f"تم رصد {count} صنف يحتاج انتباه ({out_cnt} نفدت تماماً، {low_cnt} رصيد منخفض)."


def _format_burn_rate_forecast(result: dict) -> str:
    crit = result.get("criticalCount", 0)
    warn = result.get("warningCount", 0)
    if crit == 0 and warn == 0:
        return "معدل استهلاك المخزون آمن ولا توجد أصناف مهددة بالنفاد الوشيك."
    return f"تنبيه استهلاك المخزون: {crit} صنف في حالة حرجة (< 3 أيام)، و {warn} صنف مهدد خلال أسبوع."


inventory_variant_stock_scan_tool = FunctionTool(
    name="inventory_variant_stock_scan",
    description="Perform deep inventory scan across products and individual variants (sizes/colors) to detect depleted or low stock items.",
    func=inventory_variant_stock_scan,
    input_model=InventoryVariantStockScanInput,
    format_result=_format_variant_stock_scan,
)

inventory_burn_rate_forecast_tool = FunctionTool(
    name="inventory_burn_rate_forecast",
    description="Analyze sales velocity (burn rate) over recent days and predict days remaining until stock runs out for each product.",
    func=inventory_burn_rate_forecast,
    input_model=InventoryBurnRateForecastInput,
    format_result=_format_burn_rate_forecast,
)

__all_tools__ = [
    inventory_variant_stock_scan_tool,
    inventory_burn_rate_forecast_tool,
]
