from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import order_tools
from src.tools.definitions._helpers import _executed_result, _write_result


class OrderLookupInput(BaseModel):
    order_number: str = Field(description="Order number to look up")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderCreateDraftInput(BaseModel):
    customer_name: str = Field(description="Customer name")
    customer_phone: str = Field(description="Customer phone number")
    product_name: str = Field(description="Product name or ID")
    product_price: float | None = Field(default=None, description="Confirmed product unit price")
    product_size: str | None = Field(default=None, description="Requested product size")
    product_color: str | None = Field(default=None, description="Requested product color")
    quantity: int = Field(default=1, description="Quantity")
    total: float | None = Field(default=None, description="Order total")
    address: str | None = Field(default=None, description="Delivery address")
    city: str | None = Field(default=None, description="City")
    notes: str | None = Field(default=None, description="Order notes")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderCreateConfirmedInput(BaseModel):
    customer_name: str = Field(description="Customer name")
    customer_phone: str = Field(description="Customer phone number")
    product_name: str = Field(description="Product name or ID")
    product_price: float | None = Field(default=None, description="Confirmed product unit price")
    product_size: str | None = Field(default=None, description="Confirmed product size")
    product_color: str | None = Field(default=None, description="Confirmed product color")
    quantity: int = Field(default=1, description="Quantity")
    total: float | None = Field(default=None, description="Order total")
    shipping_amount: float | None = Field(default=None, description="Confirmed shipping amount")
    address: str | None = Field(default=None, description="Delivery address")
    city: str | None = Field(default=None, description="City")
    confirmed_by_customer: bool | None = Field(default=None, description="Whether the customer explicitly confirmed")
    notes: str | None = Field(default=None, description="Order notes")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderSummaryInput(BaseModel):
    period: str = Field(default="today", description="Period: today, yesterday, week, month")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderRecentListInput(BaseModel):
    limit: int = Field(default=10, description="Number of recent orders")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderCancelInput(BaseModel):
    order_number: str = Field(description="Order number to cancel")
    reason: str = Field(description="Reason for cancellation")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderRefundInput(BaseModel):
    order_number: str = Field(description="Order number to refund")
    amount: float | None = Field(default=None, description="Refund amount (full if omitted)")
    reason: str = Field(description="Reason for refund")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def order_lookup(input_data: OrderLookupInput) -> dict[str, Any]:
    result = await order_tools.order_lookup(
        input_data.company_id or "", input_data.order_number
    )
    return {"order": result}


async def order_create_draft(input_data: OrderCreateDraftInput) -> dict[str, Any]:
    return _write_result("order.create_draft", {
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "productName": input_data.product_name,
        "productPrice": input_data.product_price if input_data.product_price is not None else input_data.total,
        "productSize": input_data.product_size,
        "productColor": input_data.product_color,
        "quantity": input_data.quantity,
        "total": input_data.total,
        "address": input_data.address,
        "city": input_data.city,
        "notes": input_data.notes,
    }, input_data.company_id or "")


async def order_create_confirmed(input_data: OrderCreateConfirmedInput) -> dict[str, Any]:
    order_payload = {
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "productName": input_data.product_name,
        "productPrice": input_data.product_price if input_data.product_price is not None else input_data.total,
        "productSize": input_data.product_size,
        "productColor": input_data.product_color,
        "quantity": input_data.quantity,
        "total": input_data.total,
        "shippingAmount": input_data.shipping_amount,
        "address": input_data.address,
        "city": input_data.city,
        "confirmedByCustomer": input_data.confirmed_by_customer,
        "notes": input_data.notes,
    }
    order_payload = {key: value for key, value in order_payload.items() if value is not None}
    result = await order_tools.create_order(input_data.company_id or "", order_payload)
    return _executed_result("ORDER_CREATED", result)


async def order_summary(input_data: OrderSummaryInput) -> dict[str, Any]:
    return await order_tools.order_summary(
        input_data.company_id or "", period=input_data.period
    )


async def order_recent_list(input_data: OrderRecentListInput) -> dict[str, Any]:
    orders = await order_tools.recent_orders(
        input_data.company_id or "", limit=input_data.limit
    )
    return {"orders": orders}


async def order_cancel(input_data: OrderCancelInput) -> dict[str, Any]:
    result = await order_tools.cancel_order(
        input_data.company_id or "",
        input_data.order_number,
        input_data.reason,
    )
    return _executed_result("ORDER_CANCELLED", result)


async def order_refund(input_data: OrderRefundInput) -> dict[str, Any]:
    return _write_result("order.refund", {
        "orderNumber": input_data.order_number,
        "amount": input_data.amount,
        "reason": input_data.reason,
    }, input_data.company_id or "")


order_lookup_tool = FunctionTool(
    name="order_lookup",
    description="Look up an order by its order number. Use when customer asks about order status, delivery status, or wants to check their existing order. Returns order status, items, and delivery info.",
    func=order_lookup,
    input_model=OrderLookupInput,
)

order_create_draft_tool = FunctionTool(
    name="order_create_draft",
    description="Create a draft order for merchant review. Use when customer confirms they want to buy and provides: product name, quantity, size/color, customer name, phone, and delivery governorate. REQUIRES MERCHANT APPROVAL.",
    func=order_create_draft,
    input_model=OrderCreateDraftInput,
)

order_create_confirmed_tool = FunctionTool(
    name="order_create_confirmed",
    description="Create a confirmed order directly after explicit customer confirmation and complete order details.",
    func=order_create_confirmed,
    input_model=OrderCreateConfirmedInput,
)

order_summary_tool = FunctionTool(
    name="order_summary",
    description="Get order summary (counts, revenue) for a period.",
    func=order_summary,
    input_model=OrderSummaryInput,
)

order_recent_list_tool = FunctionTool(
    name="order_recent_list",
    description="List the most recent orders.",
    func=order_recent_list,
    input_model=OrderRecentListInput,
)

order_cancel_tool = FunctionTool(
    name="order_cancel",
    description="Cancel a customer order. REQUIRES MERCHANT APPROVAL.",
    func=order_cancel,
    input_model=OrderCancelInput,
)

order_refund_tool = FunctionTool(
    name="order_refund",
    description="Process a refund for an order. REQUIRES MERCHANT APPROVAL.",
    func=order_refund,
    input_model=OrderRefundInput,
)

__all_tools__ = [
    order_lookup_tool,
    order_create_draft_tool,
    order_create_confirmed_tool,
    order_summary_tool,
    order_recent_list_tool,
    order_cancel_tool,
    order_refund_tool,
]
