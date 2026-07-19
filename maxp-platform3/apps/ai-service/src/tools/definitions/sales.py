from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import governance_tools, sales_tools
from src.tools.definitions._helpers import _write_result


class SalesRevenueInput(BaseModel):
    period: str = Field(default="month", description="Period: today, yesterday, week, month")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CompanySnapshotInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class DiscountCreateDraftInput(BaseModel):
    product_id: str = Field(description="Product ID or SKU to apply discount to")
    discount_percent: float = Field(description="Discount percentage (1-100)")
    reason: str | None = Field(default=None, description="Business reason for the discount")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class DiscountCreateInput(DiscountCreateDraftInput):
    """Backward-compatible input model for the existing discount.create action."""


class WhatsappSendInput(BaseModel):
    phone: str = Field(description="Customer phone number in international format")
    message: str = Field(description="Message text to send")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def sales_revenue(input_data: SalesRevenueInput) -> dict[str, Any]:
    return await sales_tools.sales_revenue(
        input_data.company_id or "", period=input_data.period
    )


async def company_snapshot(input_data: CompanySnapshotInput) -> dict[str, Any]:
    return await sales_tools.company_snapshot(input_data.company_id or "")


async def discount_create_draft(input_data: DiscountCreateDraftInput) -> dict[str, Any]:
    return _write_result("discount.create_draft", {
        "productId": input_data.product_id,
        "discountPercent": input_data.discount_percent,
        "reason": input_data.reason,
    }, input_data.company_id or "")


async def discount_create(input_data: DiscountCreateInput) -> dict[str, Any]:
    return _write_result("discount.create", {
        "productId": input_data.product_id,
        "discountPercent": input_data.discount_percent,
        "reason": input_data.reason,
    }, input_data.company_id or "")


async def whatsapp_send(input_data: WhatsappSendInput) -> dict[str, Any]:
    return await governance_tools.send_whatsapp(
        input_data.company_id or "", input_data.phone, input_data.message
    )


sales_revenue_tool = FunctionTool(
    name="sales_revenue",
    description="Return revenue and sales metrics for a period.",
    func=sales_revenue,
    input_model=SalesRevenueInput,
)

company_snapshot_tool = FunctionTool(
    name="company_snapshot",
    description="Return a quick operational snapshot for the company (today orders, pending, low stock, revenue).",
    func=company_snapshot,
    input_model=CompanySnapshotInput,
)

discount_create_draft_tool = FunctionTool(
    name="discount_create_draft",
    description="Create a discount proposal draft that requires human approval.",
    func=discount_create_draft,
    input_model=DiscountCreateDraftInput,
)

discount_create_tool = FunctionTool(
    name="discount_create",
    description="Create a discount for a product. REQUIRES MERCHANT APPROVAL.",
    func=discount_create,
    input_model=DiscountCreateInput,
)

whatsapp_send_tool = FunctionTool(
    name="whatsapp_send",
    description="Send a WhatsApp message to a customer.",
    func=whatsapp_send,
    input_model=WhatsappSendInput,
)

__all_tools__ = [
    sales_revenue_tool,
    company_snapshot_tool,
    discount_create_draft_tool,
    discount_create_tool,
    whatsapp_send_tool,
]
