from __future__ import annotations

from typing import Any, Literal

from agent_framework import FunctionInvocationContext, FunctionTool
from pydantic import BaseModel, Field

from src.mcp_integration.registry import get_mcp_registry
from src.tools import (
    competitor_tools,
    customer_tools,
    governance_tools,
    order_tools,
    product_tools,
    sales_tools,
)
from src.tools.backend_client import get_backend_client
from src.tools.names import canonical_tool_name
from src.tools.vector_product_search import vector_product_search

# ── Helpers ──────────────────────────────────────────────────────────────────


def _write_result(name: str, action_args: dict[str, Any], company_id: str) -> dict[str, Any]:
    """Return a structured 'awaiting_approval' result for write tools."""
    return {
        "status": "awaiting_approval",
        "action_type": name,
        "action_args": action_args,
        "company_id": company_id,
    }


def _executed_result(action: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "EXECUTED",
        "action": action,
        "result": result,
    }


# ── Product Tools ────────────────────────────────────────────────────────────


class ProductSearchInput(BaseModel):
    query: str = Field(default="", description="Search query for products (name, SKU, or keyword). Leave empty when list_all is true.")
    list_all: bool = Field(default=False, description="Set to true to return ALL available products without filtering. Use when the customer asks to see all products or the full catalog.")
    limit: int = Field(default=5, description="Maximum number of results. Default 5. Use 20+ when list_all is true.")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    use_vector: bool = Field(default=True, description="Enable semantic/vector search fallback when text search returns no results")


class ProductCreateInput(BaseModel):
    name: str = Field(description="Product name")
    price: float = Field(description="Product price")
    sku: str | None = Field(default=None, description="Optional SKU")
    stock: int = Field(default=0, description="Initial stock quantity")
    description: str | None = Field(default=None, description="Product description")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductLowStockInput(BaseModel):
    threshold: int = Field(default=5, description="Stock threshold for low-stock alert")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductTopSellingInput(BaseModel):
    limit: int = Field(default=10, description="Number of top-selling products")
    period: str = Field(default="month", description="Period: today, week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductUpdatePriceInput(BaseModel):
    product_id: str = Field(description="Product ID")
    new_price: float = Field(description="New price")
    reason: str | None = Field(default=None, description="Reason for price change")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductPerformanceInput(BaseModel):
    product_id: str = Field(description="Product ID to get performance for")
    period: str = Field(default="month", description="Period: week, month")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def product_search(input_data: ProductSearchInput) -> dict[str, Any]:
    query = "" if input_data.list_all else (input_data.query or "")
    limit = input_data.limit if input_data.list_all else min(input_data.limit, 20)
    result = await product_tools.search_products(
        input_data.company_id or "", query, limit=limit, use_vector=input_data.use_vector
    )
    products = result.get("products", [])
    if input_data.list_all:
        products = [{"name": p.get("name"), "price": p.get("price"), "sku": p.get("sku"), "status": p.get("status"), "mainImage": p.get("mainImage")} for p in products]

    # Vector fallback: if text search returned no results and we have a query, use semantic search
    if not products and query and not input_data.list_all and input_data.use_vector:
        vec_results = await vector_product_search(
            company_id=input_data.company_id or "",
            query=query,
            limit=limit,
        )
        if vec_results:
            products = vec_results
            return {"results": products, "count": len(products), "listAll": False, "searchType": "semantic"}

    return {"results": products, "count": result.get("count", 0), "listAll": input_data.list_all, "searchType": "text"}


async def product_create(input_data: ProductCreateInput) -> dict[str, Any]:
    return _write_result("product.create", {
        "name": input_data.name,
        "price": input_data.price,
        "sku": input_data.sku,
        "stock": input_data.stock,
        "description": input_data.description,
    }, input_data.company_id or "")


async def product_low_stock(input_data: ProductLowStockInput) -> dict[str, Any]:
    result = await product_tools.low_stock_products(
        input_data.company_id or "", threshold=input_data.threshold
    )
    return {"products": result.get("products", [])}


async def product_top_selling(input_data: ProductTopSellingInput) -> dict[str, Any]:
    return await product_tools.top_selling_products(
        input_data.company_id or "", period=input_data.period, limit=input_data.limit
    )


async def product_update_price(input_data: ProductUpdatePriceInput) -> dict[str, Any]:
    return _write_result("product.updatePrice", {
        "productId": input_data.product_id,
        "newPrice": input_data.new_price,
        "reason": input_data.reason,
    }, input_data.company_id or "")


async def product_performance(input_data: ProductPerformanceInput) -> dict[str, Any]:
    client = get_backend_client()
    return await client.get_product_performance(
        input_data.company_id or "",
        input_data.product_id,
        period=input_data.period,
    )


product_search_tool = FunctionTool(
    name="product_search",
    description="Search for products by name, SKU, or keyword. Set list_all=true to browse the full catalog. Returns products with prices, stock, and availability.",
    func=product_search,
    input_model=ProductSearchInput,
)

product_create_tool = FunctionTool(
    name="product_create",
    description="Create a new product in the catalog. REQUIRES MERCHANT APPROVAL.",
    func=product_create,
    input_model=ProductCreateInput,
)

product_low_stock_tool = FunctionTool(
    name="product_low_stock",
    description="Find products with low stock levels below a threshold.",
    func=product_low_stock,
    input_model=ProductLowStockInput,
)

product_top_selling_tool = FunctionTool(
    name="product_top_selling",
    description="Find top-selling products for a given period.",
    func=product_top_selling,
    input_model=ProductTopSellingInput,
)

product_update_price_tool = FunctionTool(
    name="product_update_price",
    description="Update the price of a product. REQUIRES MERCHANT APPROVAL.",
    func=product_update_price,
    input_model=ProductUpdatePriceInput,
)

product_performance_tool = FunctionTool(
    name="product_performance",
    description="Get sales performance metrics for a specific product.",
    func=product_performance,
    input_model=ProductPerformanceInput,
)


# ── Order Tools ──────────────────────────────────────────────────────────────


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
    client = get_backend_client()
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
    }
    order_payload = {key: value for key, value in order_payload.items() if value is not None}
    result = await client.create_order(input_data.company_id or "", order_payload)
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
    client = get_backend_client()
    result = await client.cancel_order(
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
    description="Look up an order by its order number. Returns order status, items, and delivery info.",
    func=order_lookup,
    input_model=OrderLookupInput,
)

order_create_draft_tool = FunctionTool(
    name="order_create_draft",
    description="Create a draft order for merchant review. REQUIRES MERCHANT APPROVAL.",
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


# ── Shipping Tools ────────────────────────────────────────────────────────────


class ShippingRatesInput(BaseModel):
    governorate: str = Field(description="Governorate to check shipping rates for")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingUpdateInput(BaseModel):
    order_id: str = Field(description="Order ID or number to update shipping for")
    address: str | None = Field(default=None, description="New delivery address")
    shipping_class: str | None = Field(default=None, description="New shipping class")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def shipping_rates(input_data: ShippingRatesInput) -> dict[str, Any]:
    client = get_backend_client()
    return await client.get_shipping_rates(input_data.company_id or "", input_data.governorate)


async def shipping_update(input_data: ShippingUpdateInput) -> dict[str, Any]:
    return _write_result("shipping.update", {
        "orderId": input_data.order_id,
        "address": input_data.address,
        "shippingClass": input_data.shipping_class,
    }, input_data.company_id or "")


shipping_rates_tool = FunctionTool(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate.",
    func=shipping_rates,
    input_model=ShippingRatesInput,
)

shipping_update_tool = FunctionTool(
    name="shipping_update",
    description="Propose updating shipping address or class for an order. REQUIRES MERCHANT APPROVAL.",
    func=shipping_update,
    input_model=ShippingUpdateInput,
)


# ── Inventory Tools ──────────────────────────────────────────────────────────


class InventoryCheckInput(BaseModel):
    product_name_or_sku: str = Field(description="Product name or SKU to check inventory for")
    product_size: str | None = Field(default=None, description="Optional requested size")
    product_color: str | None = Field(default=None, description="Optional requested color")
    conversation_id: str | None = Field(default=None, description="Optional conversation ID for previous-product context")
    references_previous_product: bool | None = Field(default=None, description="True when the turn refers to the previous shown product")
    use_vector: bool = Field(default=True, description="Enable semantic/vector search fallback")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class InventoryAdjustInput(BaseModel):
    product_id: str = Field(description="Product ID to adjust")
    quantity_delta: int = Field(description="Quantity change (positive to add, negative to remove)")
    reason: str | None = Field(default=None, description="Reason for adjustment")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def inventory_check(input_data: InventoryCheckInput) -> dict[str, Any]:
    client = get_backend_client()
    bridge_input = {
        key: value
        for key, value in {
            "productNameOrSku": input_data.product_name_or_sku,
            "productSize": input_data.product_size,
            "productColor": input_data.product_color,
            "conversationId": input_data.conversation_id,
            "referencesPreviousProduct": input_data.references_previous_product,
            "useVector": input_data.use_vector,
        }.items()
        if value is not None
    }
    response = await client.execute_bridge_tool(
        input_data.company_id or "",
        "inventory.check",
        bridge_input,
        thread_id=input_data.conversation_id,
    )
    result = response.get("result", response)
    if isinstance(result, dict) and result.get("success") is True and isinstance(result.get("output"), dict):
        return result["output"]
    if isinstance(result, dict) and result.get("success") is True and isinstance(result.get("result"), dict):
        return result["result"]
    return result


async def inventory_adjust(input_data: InventoryAdjustInput) -> dict[str, Any]:
    client = get_backend_client()
    result = await client.adjust_inventory(
        input_data.company_id or "",
        input_data.product_id,
        input_data.quantity_delta,
        input_data.reason,
    )
    return _executed_result("INVENTORY_ADJUSTED", result)


inventory_check_tool = FunctionTool(
    name="inventory_check",
    description="Check product inventory and validate requested size or color against active variants.",
    func=inventory_check,
    input_model=InventoryCheckInput,
)

inventory_adjust_tool = FunctionTool(
    name="inventory_adjust",
    description="Propose adjusting inventory quantity. REQUIRES MERCHANT APPROVAL.",
    func=inventory_adjust,
    input_model=InventoryAdjustInput,
)


# ── Customer Tools ───────────────────────────────────────────────────────────


class CustomerInfoInput(BaseModel):
    query: str = Field(description="Phone number, name, or email to look up")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CustomerTopBuyersInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of customers")
    period: str = Field(default="month", description="Period: week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def customer_info(input_data: CustomerInfoInput) -> dict[str, Any]:
    return await customer_tools.customer_info(
        input_data.company_id or "", input_data.query
    )


async def customer_top_buyers(input_data: CustomerTopBuyersInput) -> dict[str, Any]:
    customers = await customer_tools.top_buyers(
        input_data.company_id or "", limit=input_data.limit, period=input_data.period
    )
    return {"customers": customers}


customer_info_tool = FunctionTool(
    name="customer_info",
    description="Look up a customer by phone number, name, or email.",
    func=customer_info,
    input_model=CustomerInfoInput,
)

customer_top_buyers_tool = FunctionTool(
    name="customer_top_buyers",
    description="List top buyers for a selected period.",
    func=customer_top_buyers,
    input_model=CustomerTopBuyersInput,
)


# ── Sales Tools ──────────────────────────────────────────────────────────────


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

# ── Competitor Tools ─────────────────────────────────────────────────────────


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
    client = get_backend_client()
    result = await client.generate_competitor_report(
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


# ── Facebook Tools ───────────────────────────────────────────────────────────


class FacebookReplyInput(BaseModel):
    recipient_id: str = Field(description="The Facebook Page-Scoped ID (PSID) of the customer recipient")
    message: str | None = Field(default=None, description="The text message content to send")
    page_id: str = Field(description="The Facebook Page ID representing the sending page")
    message_type: Literal["TEXT", "IMAGE"] = Field(default="TEXT", description="The Facebook message type to send")
    media_url: str | None = Field(default=None, description="Media URL to send as a Messenger image attachment")
    image_url: str | None = Field(default=None, description="Image URL to send as a Messenger image attachment")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_reply(input_data: FacebookReplyInput) -> dict[str, Any]:
    media_url = input_data.media_url or input_data.image_url
    return await governance_tools.send_facebook_reply(
        input_data.company_id or "",
        input_data.recipient_id,
        input_data.message or "",
        input_data.page_id,
        message_type=input_data.message_type,
        media_url=media_url,
    )


facebook_reply_tool = FunctionTool(
    name="facebook_reply",
    description="Send a direct Facebook Messenger text or image reply to a customer.",
    func=facebook_reply,
    input_model=FacebookReplyInput,
)


# ── Governance / Admin Tools ─────────────────────────────────────────────────


class SchedulerCreateJobInput(BaseModel):
    description: str = Field(description="Natural language description of the scheduled task")
    task_type: str | None = Field(default=None, description="Optional task type")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class KnowledgeCreateFaqInput(BaseModel):
    question: str = Field(description="FAQ question")
    answer: str = Field(description="FAQ answer")
    category: str | None = Field(default=None, description="Optional category")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class KnowledgeCreatePolicyInput(BaseModel):
    title: str = Field(description="Policy title")
    content: str = Field(description="Policy content")
    category: str | None = Field(default=None, description="Optional category")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FacebookAdCreateDraftInput(BaseModel):
    objective: str = Field(description="Ad objective")
    primary_text: str = Field(description="Primary ad text")
    budget: float | None = Field(default=None, description="Optional budget")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class MessageBroadcastInput(BaseModel):
    message: str = Field(description="Broadcast message content")
    audience: str = Field(description="Target audience (e.g. 'all', 'vip')")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def scheduler_create_job(input_data: SchedulerCreateJobInput) -> dict[str, Any]:
    return _write_result("scheduler.create_job", {
        "description": input_data.description,
        "taskType": input_data.task_type,
    }, input_data.company_id or "")


async def knowledge_create_faq(input_data: KnowledgeCreateFaqInput) -> dict[str, Any]:
    return _write_result("knowledge.create_faq", {
        "question": input_data.question,
        "answer": input_data.answer,
        "category": input_data.category,
    }, input_data.company_id or "")


async def knowledge_create_policy(input_data: KnowledgeCreatePolicyInput) -> dict[str, Any]:
    return _write_result("knowledge.create_policy", {
        "title": input_data.title,
        "content": input_data.content,
        "category": input_data.category,
    }, input_data.company_id or "")


async def facebook_ad_create_draft(input_data: FacebookAdCreateDraftInput) -> dict[str, Any]:
    return _write_result("facebook_ad.create_draft", {
        "objective": input_data.objective,
        "primaryText": input_data.primary_text,
        "budget": input_data.budget,
    }, input_data.company_id or "")


async def message_broadcast(input_data: MessageBroadcastInput) -> dict[str, Any]:
    return _write_result("message.broadcast", {
        "message": input_data.message,
        "audience": input_data.audience,
    }, input_data.company_id or "")


scheduler_create_job_tool = FunctionTool(
    name="scheduler_create_job",
    description="Create a natural-language scheduled routine proposal. REQUIRES MERCHANT APPROVAL.",
    func=scheduler_create_job,
    input_model=SchedulerCreateJobInput,
)

knowledge_create_faq_tool = FunctionTool(
    name="knowledge_create_faq",
    description="Create an approved FAQ entry from a reviewed Agentic RAG learning proposal. REQUIRES MERCHANT APPROVAL.",
    func=knowledge_create_faq,
    input_model=KnowledgeCreateFaqInput,
)

knowledge_create_policy_tool = FunctionTool(
    name="knowledge_create_policy",
    description="Create an approved policy entry from a reviewed Agentic RAG learning proposal. REQUIRES MERCHANT APPROVAL.",
    func=knowledge_create_policy,
    input_model=KnowledgeCreatePolicyInput,
)

facebook_ad_create_draft_tool = FunctionTool(
    name="facebook_ad_create_draft",
    description="Create a Facebook ad draft for merchant review. REQUIRES MERCHANT APPROVAL.",
    func=facebook_ad_create_draft,
    input_model=FacebookAdCreateDraftInput,
)

message_broadcast_tool = FunctionTool(
    name="message_broadcast",
    description="Broadcast a message to customers. REQUIRES MERCHANT APPROVAL.",
    func=message_broadcast,
    input_model=MessageBroadcastInput,
)


# ── Agent Management Tools ───────────────────────────────────────────────────


class AgentSpawnInput(BaseModel):
    name: str = Field(description="Agent name")
    role: str = Field(description="Agent role (e.g. SALES, SUPPORT)")
    model: str | None = Field(default=None, description="Model to use")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentHandoffToInput(BaseModel):
    target_role: str = Field(description="Role of the agent to transfer to")
    reason: str = Field(description="Brief reason for the transfer")
    context: str | None = Field(default=None, description="Key information to pass")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def agent_spawn(input_data: AgentSpawnInput) -> dict[str, Any]:
    return _write_result("agent.spawn", {
        "name": input_data.name,
        "role": input_data.role,
        "model": input_data.model,
    }, input_data.company_id or "")


async def agent_handoff_to(input_data: AgentHandoffToInput) -> dict[str, Any]:
    from src.services.agent_manager_service import AgentManagerService, get_agent_manager_service
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=f"[Handoff] Reason: {input_data.reason}\nContext: {input_data.context or ''}",
        role=input_data.target_role,
        thread_id="",
    )
    return {
        "status": "HANDOFF_INITIATED",
        "targetRole": input_data.target_role,
        "reason": input_data.reason,
        "reply": result.get("reply", ""),
    }


agent_spawn_tool = FunctionTool(
    name="agent_spawn",
    description="Create a new specialist agent. REQUIRES MERCHANT APPROVAL.",
    func=agent_spawn,
    input_model=AgentSpawnInput,
)

agent_handoff_to_tool = FunctionTool(
    name="agent_handoff_to",
    description="Transfer the conversation to a specialist agent. Use when the customer needs expertise outside your role.",
    func=agent_handoff_to,
    input_model=AgentHandoffToInput,
)


# ── Audit Tools ──────────────────────────────────────────────────────────────


class AuditReadInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of audit entries")
    agent_id: str | None = Field(default=None, description="Optional agent ID to filter by")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def audit_read(input_data: AuditReadInput) -> dict[str, Any]:
    client = get_backend_client()
    return await client.get_audit_trail(
        input_data.company_id or "",
        limit=input_data.limit,
        agent_id=input_data.agent_id,
    )


audit_read_tool = FunctionTool(
    name="audit_read",
    description="Read agent audit trail / decision log.",
    func=audit_read,
    input_model=AuditReadInput,
)


# ── HR Tools ────────────────────────────────────────────────────────────────


class HrAttendanceTodayInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def hr_attendance_today(input_data: HrAttendanceTodayInput) -> dict[str, Any]:
    return {
        "date": "",
        "totalEmployees": 0,
        "present": 0,
        "late": 0,
        "absent": 0,
        "absentEmployees": [],
        "presentEmployees": [],
        "note": "HR attendance service not yet connected. This is a placeholder.",
    }


hr_attendance_today_tool = FunctionTool(
    name="hr_attendance_today",
    description="Get today's attendance summary for the company.",
    func=hr_attendance_today,
    input_model=HrAttendanceTodayInput,
)


# ── Tool Accessors ───────────────────────────────────────────────────────────

# ── Tool Groups (Progressive Exposure) ─────────────────────────────────────────
# Core tools are available from the start. Advanced tools are unlocked via gateway.

class UnlockAdvancedToolsInput(BaseModel):
    reason: str = Field(description="Reason why advanced tools are needed for the current task")

async def unlock_advanced_tools(
    input_data: UnlockAdvancedToolsInput,
    ctx: FunctionInvocationContext | None = None,
) -> dict[str, Any]:
    if ctx is not None:
        ctx.add_tools(ADVANCED_TOOLS)
    return {
        "status": "SUCCESS",
        "message": "Advanced tools have been unlocked. You can now use tools for deep analysis, reporting, and competitor research.",
        "unlocked_tools": [t.name for t in ADVANCED_TOOLS],
    }

unlock_advanced_tools_tool = FunctionTool(
    name="unlock_advanced_tools",
    description="Unlock advanced analysis and reporting tools when the user request requires deep data mining or competitor research.",
    func=unlock_advanced_tools,
    input_model=UnlockAdvancedToolsInput,
)

CORE_TOOLS: list[FunctionTool] = [
    product_search_tool,
    order_lookup_tool,
    inventory_check_tool,
    customer_info_tool,
    shipping_rates_tool,
    agent_handoff_to_tool,
    unlock_advanced_tools_tool,
]

ADVANCED_TOOLS: list[FunctionTool] = [
    product_low_stock_tool,
    product_top_selling_tool,
    product_performance_tool,
    order_summary_tool,
    order_recent_list_tool,
    sales_revenue_tool,
    company_snapshot_tool,
    competitor_search_tool,
    competitor_get_products_tool,
    competitor_price_compare_tool,
    competitor_get_ads_tool,
    audit_read_tool,
    hr_attendance_today_tool,
]

# All read-only tools
READ_TOOLS: list[FunctionTool] = CORE_TOOLS + ADVANCED_TOOLS

# All write tools that require merchant approval before execution.
WRITE_TOOLS: list[FunctionTool] = [
    product_create_tool,
    product_update_price_tool,
    order_create_draft_tool,
    order_cancel_tool,
    order_refund_tool,
    inventory_adjust_tool,
    discount_create_tool,
    discount_create_draft_tool,
    competitor_generate_report_tool,
    scheduler_create_job_tool,
    knowledge_create_faq_tool,
    knowledge_create_policy_tool,
    facebook_ad_create_draft_tool,
    message_broadcast_tool,
    agent_spawn_tool,
    shipping_update_tool,
]

for _write_tool in WRITE_TOOLS:
    _write_tool.approval_mode = "always_require"

DIRECT_WRITE_TOOLS: list[FunctionTool] = [
    order_create_confirmed_tool,
]

for _direct_write_tool in DIRECT_WRITE_TOOLS:
    _direct_write_tool.approval_mode = "never_require"

# All tools (including manager tools for template resolution)
ALL_TOOLS: dict[str, FunctionTool] = {t.name: t for t in READ_TOOLS + WRITE_TOOLS + DIRECT_WRITE_TOOLS + [
    facebook_reply_tool,
    agent_handoff_to_tool,
]}


def get_read_tools() -> list[FunctionTool]:
    return list(READ_TOOLS)


# Backward-compatible name map used by the DB-backed agent registry.
_ALL_TOOLS = ALL_TOOLS

# Role-specific tool names stored in company_agents.skills.
ROLE_TOOLS: dict[str, list[str]] = {
    "SUPPORT": [
        "product_search",
        "order_lookup",
        "order_cancel",
        "customer_info",
        "shipping_rates",
        "shipping_update",
        "agent_handoff_to",
    ],
    "ORDER": [
        "order_lookup",
        "order_summary",
        "order_recent_list",
        "order_create_draft",
        "order_create_confirmed",
        "order_cancel",
        "order_refund",
    ],
    "SALES": [
        "product_search",
        "product_top_selling",
        "product_performance",
        "customer_info",
        "inventory_check",
        "order_create_draft",
        "order_create_confirmed",
        "discount_create_draft",
        "shipping_rates",
    ],
    "INVENTORY": [
        "product_search",
        "product_low_stock",
        "product_create",
        "inventory_check",
        "inventory_adjust",
        "product_update_price",
        "discount_create_draft",
        "audit_read",
    ],
    "MARKETING": [
        "product_search",
        "inventory_check",
        "sales_revenue",
        "company_snapshot",
        "facebook_ad_create_draft",
        "message_broadcast",
        "audit_read",
    ],
    "FACEBOOK_SALES_SUPPORT": [
        "product_search",
        "inventory_check",
        "customer_info",
        "order_lookup",
        "order_create_draft",
        "order_create_confirmed",
        "shipping_rates",
        "facebook_reply",
        "agent_handoff_to",
    ],
    "SAS_SALES": [
        "product_search",
        "inventory_check",
        "order_create_draft",
        "order_lookup",
        "shipping_rates",
        "facebook_reply",
    ],
    "COMPETITOR": [
        "competitor_search",
        "competitor_get_products",
        "competitor_price_compare",
        "competitor_get_ads",
        "competitor_generate_report",
        "product_search",
        "inventory_check",
        "audit_read",
    ],
    "CEO": [],
}

# Manager tools (agent.spawn, agent.list_agents, agent.run_task, agent.handoff)
# live in manager_tools.py and are attached to the CEO, not persisted per sub-agent.


def get_tools_for_role(role: str) -> list[FunctionTool]:
    """Return FunctionTool objects appropriate for a given agent role."""
    role_upper = role.upper()
    tool_names = ROLE_TOOLS.get(role_upper, [])
    if not tool_names and role_upper not in ROLE_TOOLS:
        tool_names = list(_ALL_TOOLS.keys())
    return [_ALL_TOOLS[name] for name in tool_names if name in _ALL_TOOLS]


def get_tool_names_for_role(role: str) -> list[str]:
    """Return tool names for DB persistence."""
    role_upper = role.upper()
    tool_names = ROLE_TOOLS.get(role_upper, [])
    if not tool_names and role_upper not in ROLE_TOOLS:
        tool_names = list(_ALL_TOOLS.keys())
    return list(tool_names)


def get_tool_name_list(tools: list[FunctionTool]) -> list[str]:
    """Extract names from FunctionTool objects."""
    return [tool.name for tool in tools]


def resolve_tools_from_names(names: list[str]) -> list[FunctionTool]:
    """Resolve stored tool names back to FunctionTool objects."""
    resolved: list[FunctionTool] = []
    seen: set[str] = set()
    for name in names:
        canonical = canonical_tool_name(name)
        tool = _ALL_TOOLS.get(canonical)
        if tool and tool.name not in seen:
            resolved.append(tool)
            seen.add(tool.name)
    return resolved


def get_write_tools() -> list[FunctionTool]:
    return list(WRITE_TOOLS)


def get_all_tools() -> list[FunctionTool]:
    """Return ALL_TOOLS, including manager tools (lazy import to avoid circular deps)."""
    from src.tools.manager_tools import get_manager_tools
    return list(ALL_TOOLS.values()) + get_manager_tools() + get_mcp_tools()


def get_tool(name: str) -> FunctionTool | None:
    return ALL_TOOLS.get(canonical_tool_name(name))


async def _mcp_gateway_placeholder(input_data: dict[str, Any]) -> dict[str, Any]:
    return dict(input_data)


def get_mcp_tools() -> list[FunctionTool]:
    """Return discovered MCP tools as SDK FunctionTool descriptors.

    Execution is still routed through ToolGateway by sdk_gateway.wrap_tool_for_gateway.
    """
    tools: list[FunctionTool] = []
    for tool in get_mcp_registry().get_all_tools():
        name = str(tool.get("name") or "")
        if not name.startswith("mcp_"):
            continue
        tools.append(
            FunctionTool(
                name=name,
                description=str(tool.get("description") or ""),
                func=_mcp_gateway_placeholder,
                input_model=tool.get("input_schema") or {"type": "object"},
                approval_mode="never_require",
            )
        )
    return tools
