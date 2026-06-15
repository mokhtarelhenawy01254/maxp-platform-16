from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import competitor_tools
from src.tools.definitions._helpers import _executed_result


class CompetitorSearchInput(BaseModel):
    query: str = Field(description="Search text to find competitors by name")
    limit: int = Field(default=10, description="Maximum number of results")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CompetitorGetProductsInput(BaseModel):
    competitor_id: str = Field(description="The competitor ID")
    is_available: bool | None = Field(default=None, description="Filter by availability")
    limit: int = Field(default=20, description="Maximum number of products")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CompetitorPriceCompareInput(BaseModel):
    competitor_id: str = Field(description="Competitor ID to compare against")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CompetitorGetAdsInput(BaseModel):
    competitor_id: str = Field(description="Competitor ID to get ads for")
    limit: int = Field(default=20, description="Maximum number of ads")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CompetitorGenerateReportInput(BaseModel):
    competitor_id: str = Field(description="Competitor ID to analyze")
    report_type: str = Field(default="weekly", description="Report type: weekly or comprehensive")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def competitor_search(input_data: CompetitorSearchInput) -> dict[str, Any]:
    competitors = await competitor_tools.search_competitors(
        input_data.company_id or "", input_data.query, limit=input_data.limit
    )
    return {"competitors": competitors}


async def competitor_get_products(input_data: CompetitorGetProductsInput) -> dict[str, Any]:
    products = await competitor_tools.get_competitor_products(
        input_data.company_id or "", input_data.competitor_id, limit=input_data.limit
    )
    return {"products": products}


async def competitor_price_compare(input_data: CompetitorPriceCompareInput) -> dict[str, Any]:
    return await competitor_tools.competitor_price_compare(
        input_data.company_id or "", input_data.competitor_id
    )


async def competitor_get_ads(input_data: CompetitorGetAdsInput) -> dict[str, Any]:
    ads = await competitor_tools.get_competitor_ads(
        input_data.company_id or "", input_data.competitor_id, limit=input_data.limit
    )
    return {"ads": ads}


async def competitor_generate_report(input_data: CompetitorGenerateReportInput) -> dict[str, Any]:
    result = await competitor_tools.generate_report(
        input_data.company_id or "",
        input_data.competitor_id,
        input_data.report_type,
    )
    return _executed_result("COMPETITOR_REPORT_GENERATED", result)


competitor_search_tool = FunctionTool(
    name="competitor_search",
    description="Search competitors by name or URL.",
    func=competitor_search,
    input_model=CompetitorSearchInput,
)

competitor_get_products_tool = FunctionTool(
    name="competitor_get_products",
    description="List products of a specific competitor.",
    func=competitor_get_products,
    input_model=CompetitorGetProductsInput,
)

competitor_price_compare_tool = FunctionTool(
    name="competitor_price_compare",
    description="Compare prices between your products and a competitor's products.",
    func=competitor_price_compare,
    input_model=CompetitorPriceCompareInput,
)

competitor_get_ads_tool = FunctionTool(
    name="competitor_get_ads",
    description="View ads from a specific competitor.",
    func=competitor_get_ads,
    input_model=CompetitorGetAdsInput,
)

competitor_generate_report_tool = FunctionTool(
    name="competitor_generate_report",
    description="Generate a competitor analysis report (weekly or comprehensive). REQUIRES MERCHANT APPROVAL.",
    func=competitor_generate_report,
    input_model=CompetitorGenerateReportInput,
)

__all_tools__ = [
    competitor_search_tool,
    competitor_get_products_tool,
    competitor_price_compare_tool,
    competitor_get_ads_tool,
    competitor_generate_report_tool,
]
