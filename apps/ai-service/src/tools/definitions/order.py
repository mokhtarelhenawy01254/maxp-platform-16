from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field, model_validator

import src.db.session as _db_mod
from src.tools.definitions._helpers import _executed_result, _write_result
from src.tools.repositories.order_repository import OrderRepository


def _accept_order_id_aliases(cls, data):
    """Accept order_id / orderNumber as aliases for order_number.

    Why: agent_framework calls `input_model(**arguments)` with field
    NAMES, not validation aliases. The LLM sometimes uses `order_id`
    instead of `order_number` so we translate at validation time.
    """
    if isinstance(data, dict):
        for alias in ("order_id", "orderNumber"):
            if alias in data and "order_number" not in data:
                data["order_number"] = data[alias]
                break
    return data


class OrderLookupInput(BaseModel):
    order_number: str = Field(description="Order number to look up")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")

    @model_validator(mode="before")
    @classmethod
    def _alias(cls, data):  # noqa: N805
        return _accept_order_id_aliases(cls, data)


class OrderLookupByPhoneInput(BaseModel):
    phone: str = Field(description="Customer phone number (Egyptian format: 010..., 01..., or +20...)")
    status: str | None = Field(default=None, description="Optional order status filter")
    limit: int = Field(default=10, description="Max orders to return (1-50)")
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
    customer_name: str | None = Field(default=None, description="Customer name (optional, falls back to profile or phone)")
    customer_phone: str = Field(description="Customer phone number")
    product_name: str = Field(description="Product name or ID")
    product_id: str | None = Field(default=None, description="Product ID (if known)")
    variant_id: str | None = Field(default=None, description="Variant ID (if known)")
    product_price: float | None = Field(default=None, description="Confirmed product unit price")
    product_size: str | None = Field(default=None, description="Confirmed product size")
    product_color: str | None = Field(default=None, description="Confirmed product color")
    quantity: int = Field(default=1, description="Quantity")
    total: float | None = Field(default=None, description="Order total")
    shipping_amount: float | None = Field(default=None, description="Confirmed shipping amount")
    address: str | None = Field(default=None, description="Detailed street address (e.g. شارع جمال عبد الناصر، عمارة 12، شقة 4)")
    city: str | None = Field(default=None, description="City or district (e.g. ميامي، سموحة، مدينة نصر)")
    governorate: str | None = Field(default=None, description="Governorate / Province (e.g. الإسكندرية، القاهرة، الجيزة)")
    confirmed_by_customer: bool | None = Field(default=None, description="Whether the customer explicitly confirmed")
    notes: str | None = Field(default=None, description="Order notes")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderSummaryInput(BaseModel):
    period: str = Field(default="today", description="Period: today, yesterday, week, month")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderRecentListInput(BaseModel):
    status: str | None = Field(
        default=None,
        description="Filter orders by status: CONFIRMED, PENDING, SHIPPED, DELIVERED, CANCELLED. Case-insensitive.",
    )
    period: str | None = Field(
        default=None,
        description="Filter orders by time period: 'today', 'yesterday', 'week', 'month', 'all'. Always use period='yesterday' when asked about yesterday's orders.",
    )
    date: str | None = Field(
        default=None,
        description="Filter orders by specific date in YYYY-MM-DD format (e.g. '2026-09-22') or 'yesterday' or 'today'.",
    )
    limit: int = Field(
        default=25,
        description="Max number of orders to return (1-100, default 25).",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)",
    )


class OrderConfirmInput(BaseModel):
    order_number: str = Field(description="Order number to confirm")
    notes: str | None = Field(default=None, description="Optional confirmation note")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")

    @model_validator(mode="before")
    @classmethod
    def _alias(cls, data):  # noqa: N805
        return _accept_order_id_aliases(cls, data)


class OrderUpdateDetailsInput(BaseModel):
    order_number: str = Field(description="Order number or ID to update")
    shipping_address: dict[str, Any] | None = Field(
        default=None,
        description="Structured delivery address object with keys like governorate, city, area, address, phone",
    )
    customer_name: str | None = Field(default=None, description="Customer name")
    customer_phone: str | None = Field(default=None, description="Customer phone number")
    city: str | None = Field(default=None, description="City / area name")
    governorate: str | None = Field(default=None, description="Governorate name")
    notes: str | None = Field(default=None, description="Order notes")
    metadata_patch: dict[str, Any] | None = Field(
        default=None,
        description="Deep-merged metadata patch to attach to the order (e.g. address resolution audit fields)",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")

    @model_validator(mode="before")
    @classmethod
    def _alias(cls, data):  # noqa: N805
        return _accept_order_id_aliases(cls, data)


class OrderCancelInput(BaseModel):
    order_number: str = Field(description="Order number to cancel")
    reason: str = Field(description="Reason for cancellation")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")

    @model_validator(mode="before")
    @classmethod
    def _alias(cls, data):  # noqa: N805
        return _accept_order_id_aliases(cls, data)


class OrderRefundInput(BaseModel):
    order_number: str = Field(description="Order number to refund")
    amount: float | None = Field(default=None, description="Refund amount (full if omitted)")
    reason: str = Field(description="Reason for refund")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")

    @model_validator(mode="before")
    @classmethod
    def _alias(cls, data):  # noqa: N805
        return _accept_order_id_aliases(cls, data)


async def order_lookup(input_data: OrderLookupInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    order_number = input_data.order_number
    if not company_id or not order_number:
        return {"order": {"found": False, "code": "MISSING_PARAMS", "orderNumber": order_number}}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        order = await repo.get_order(company_id, order_number)
        if not order:
            return {"order": {"found": False, "code": "ORDER_NOT_FOUND", "orderNumber": order_number}}
        items = await repo.get_order_items(order["id"])

    if not items and order.get("guestItems"):
        import json
        try:
            raw_guest_items = order["guestItems"]
            parsed_items = json.loads(raw_guest_items) if isinstance(raw_guest_items, str) else raw_guest_items
            if isinstance(parsed_items, list):
                items = [
                    {
                        "name": gi.get("name") or gi.get("productName") or "",
                        "qty": gi.get("quantity") or gi.get("qty") or 1,
                        "price": gi.get("price") or 0,
                        "productColor": gi.get("color") or gi.get("productColor") or "",
                        "productSize": gi.get("size") or gi.get("productSize") or "",
                    }
                    for gi in parsed_items
                    if isinstance(gi, dict)
                ]
        except Exception:
            pass

    customer_name = order.get("customerName") or ""
    customer_phone = order.get("customerPhone") or ""

    return {"order": {
        "found": True,
        "orderNumber": str(order.get("orderNumber", order_number)),
        "status": order.get("status"),
        "customStatusCode": order.get("customStatusCode") or "",
        "paymentStatus": order.get("paymentStatus"),
        "paymentMethod": str(order.get("paymentMethod") or ""),
        "total": str(order.get("total", 0)),
        "shippingCost": str(order.get("shipping", 0)),
        "customer": customer_name,
        "phone": customer_phone,
        "governorate": order.get("governorate") or "",
        "city": order.get("city") or "",
        "address": order.get("customerAddress") or order.get("shippingAddress") or "",
        "notes": order.get("notes") or "",
        "shippingCompany": order.get("shippingCompany") or "",
        "shippingCarrier": order.get("shippingCarrier") or "",
        "trackingNumber": order.get("trackingNumber") or "",
        "shipmentStatus": order.get("shipmentStatus") or "",
        "shippedAt": str(order.get("shippedAt") or ""),
        "captainName": order.get("captainName") or "",
        "captainPhone": order.get("captainPhone") or "",
        "branchName": order.get("branchName") or "",
        "branchPhone": order.get("branchPhone") or "",
        "delayReason": order.get("delayReason") or "",
        "returnReason": order.get("returnReason") or "",
        "shipments": order.get("shipments") or [],
        "items": [
            {
                "name": i.get("name", ""),
                "qty": i.get("qty", 1),
                "price": str(i.get("price", 0)),
                "color": i.get("productColor") or "",
                "size": i.get("productSize") or "",
            }
            for i in items
        ],
        "createdAt": str(order.get("createdAt") or ""),
        "confirmedAt": str(order.get("confirmedAt") or ""),
        "deliveredAt": str(order.get("deliveredAt") or ""),
        "updatedAt": str(order.get("updatedAt") or ""),
    }}


async def order_lookup_by_phone(input_data: OrderLookupByPhoneInput) -> dict[str, Any]:
    """Search orders for a customer by phone number.

    Queries the orders table directly (same pattern as order_lookup), matching
    customerPhone for regular orders and guestPhone for storefront guest
    orders. The customer usually doesn't remember their order number — this
    lets the agent find all orders for the number they provide.
    """
    company_id = input_data.company_id or ""
    phone = (input_data.phone or "").strip()
    if not company_id or not phone:
        return {"found": False, "code": "MISSING_PARAMS", "phone": phone}

    sf = _db_mod.async_session
    limit = max(1, min(input_data.limit, 50))
    async with sf() as sess:
        repo = OrderRepository(sess)
        orders = await repo.get_orders_by_phone(
            company_id,
            phone,
            limit=limit,
            status=input_data.status,
        )

    return {
        "found": bool(orders),
        "phone": phone,
        "count": len(orders),
        "orders": [
            {
                "orderNumber": o.get("orderNumber") or o.get("order_number") or "",
                "status": o.get("status", ""),
                "paymentStatus": o.get("paymentStatus", ""),
                "total": str(o.get("total", 0)),
                "customerName": o.get("customerName") or o.get("customer_name") or o.get("guestName") or "",
                "shippingCompany": o.get("shippingCompany") or "",
                "shippingCarrier": o.get("shippingCarrier") or "",
                "trackingNumber": o.get("trackingNumber") or "",
                "shipmentStatus": o.get("shipmentStatus") or "",
                "createdAt": str(o.get("createdAt") or o.get("created_at") or ""),
            }
            for o in orders
        ],
    }


async def order_create_draft(input_data: OrderCreateDraftInput) -> dict[str, Any]:
    """Create a PENDING order for merchant review.

    Runs after merchant approval: the order lands in the dashboard with
    status PENDING (repo.create_order always inserts PENDING) so the store
    team confirms/fulfills it through the normal pipeline.
    """
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    order_payload = {
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
        "confirmedByCustomer": False,
        "notes": input_data.notes,
    }
    order_payload = {key: value for key, value in order_payload.items() if value is not None}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        result = await repo.create_order(company_id, order_payload)
    return _executed_result("ORDER_DRAFT_CREATED", result)


async def order_create_confirmed(input_data: OrderCreateConfirmedInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    order_payload = {
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "productName": input_data.product_name,
        "productId": input_data.product_id,
        "variantId": input_data.variant_id,
        "productPrice": input_data.product_price if input_data.product_price is not None else input_data.total,
        "productSize": input_data.product_size,
        "productColor": input_data.product_color,
        "quantity": input_data.quantity,
        "total": input_data.total,
        "shippingAmount": input_data.shipping_amount,
        "address": input_data.address,
        "city": input_data.city,
        "governorate": input_data.governorate,
        "confirmedByCustomer": input_data.confirmed_by_customer,
        "notes": input_data.notes,
    }
    order_payload = {key: value for key, value in order_payload.items() if value is not None}

    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        result = await repo.create_order(company_id, order_payload)
    return _executed_result("ORDER_CREATED", result)


async def order_summary(input_data: OrderSummaryInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"period": input_data.period, "totalOrders": 0, "paidRevenue": "0", "paidOrdersCount": 0, "avgOrderValue": "0", "byStatus": {}, "summary": "لا توجد طلبات مسجلة"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        res = await repo.get_order_summary(company_id, input_data.period)

    tot = res.get("totalOrders", 0)
    res["summary"] = f"إجمالي عدد الطلبات في فترة ({input_data.period}): {tot} طلباً مسجلاً."
    return res


async def order_recent_list(input_data: OrderRecentListInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"orders": [], "count": 0, "total_in_period": 0}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        orders = await repo.get_recent_orders(
            company_id=company_id,
            limit=input_data.limit,
            status=input_data.status,
            period=input_data.period,
            date=input_data.date,
        )
        total_matching = getattr(repo, "last_total_matching", len(orders))
    return {
        "orders": orders,
        "count": len(orders),
        "total_in_period": total_matching,
        "period": input_data.period,
        "status": input_data.status,
        "date": input_data.date,
        "note": f"تم استرجاع أحدث {len(orders)} طلباً من إجمالي {total_matching} طلباً مسجلاً في هذه الفترة.",
    }


async def order_cancel(input_data: OrderCancelInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id or not input_data.order_number:
        return {"status": "error", "result": {"success": False, "error": "Missing company_id or order_number"}}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        result = await repo.cancel_order(company_id, input_data.order_number)
    return _executed_result("ORDER_CANCELLED", result)


async def order_confirm(input_data: OrderConfirmInput) -> dict[str, Any]:
    """Confirm an existing order through the backend.

    Reuses the merchant order-status route so all side effects run:
    confirmedAt/confirmedBy, ORDER_CONFIRMED WhatsApp notification, and
    Turbo auto-shipment (passing the order to the shipping company).
    """
    company_id = input_data.company_id or ""
    if not company_id or not input_data.order_number:
        return {
            "success": False,
            "error": "Missing company_id or order_number",
            "orderNumber": input_data.order_number,
        }

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.confirm_order(
            company_id,
            input_data.order_number,
            notes=input_data.notes,
        )
        return {
            "success": True,
            "orderNumber": input_data.order_number,
            "newStatus": "CONFIRMED",
            "backend": result,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "orderNumber": input_data.order_number,
        }


async def order_update_details(input_data: OrderUpdateDetailsInput) -> dict[str, Any]:
    """Update order address/contact details through the backend.

    Applies the address using the SHIPPING COMPANY's governorate/area names —
    never invent locations that are not in the shipping map.
    """
    company_id = input_data.company_id or ""
    if not company_id or not input_data.order_number:
        return {
            "success": False,
            "error": "Missing company_id or order_number",
            "orderNumber": input_data.order_number,
        }

    data: dict[str, Any] = {}
    if input_data.shipping_address is not None:
        data["shippingAddress"] = input_data.shipping_address
    if input_data.customer_name is not None:
        data["customerName"] = input_data.customer_name
    if input_data.customer_phone is not None:
        data["customerPhone"] = input_data.customer_phone
    if input_data.city is not None:
        data["city"] = input_data.city
    if input_data.governorate is not None:
        data["governorate"] = input_data.governorate
    if input_data.notes is not None:
        data["notes"] = input_data.notes
    if input_data.metadata_patch is not None:
        data["metadataPatch"] = input_data.metadata_patch

    if not data:
        return {
            "success": False,
            "error": "Nothing to update",
            "orderNumber": input_data.order_number,
        }

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.update_order_details(
            company_id,
            input_data.order_number,
            data,
        )
        return {
            "success": True,
            "orderNumber": input_data.order_number,
            "updatedFields": result.get("updatedFields", []),
            "backend": result,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "orderNumber": input_data.order_number,
        }


async def order_refund(input_data: OrderRefundInput) -> dict[str, Any]:
    """Process a refund through the backend payment-status route.

    Runs after merchant approval: marks the order's paymentStatus REFUNDED
    via orders-v2 so the change lands in the order's status history (real
    audit trail), instead of writing SQL directly.
    """
    company_id = input_data.company_id or ""
    if not company_id or not input_data.order_number:
        return {
            "success": False,
            "error": "Missing company_id or order_number",
            "orderNumber": input_data.order_number,
        }

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    notes_parts: list[str] = []
    if input_data.amount is not None:
        notes_parts.append(f"partial refund amount: {input_data.amount}")
    if input_data.reason:
        notes_parts.append(f"reason: {input_data.reason}")
    notes = " | ".join(notes_parts) or None

    try:
        result = await client.update_order_payment_status(
            company_id,
            input_data.order_number,
            "REFUNDED",
            notes=notes,
        )
        return {
            "success": True,
            "orderNumber": input_data.order_number,
            "paymentStatus": "REFUNDED",
            "partialAmount": input_data.amount,
            "backend": result,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "orderNumber": input_data.order_number,
        }


def _format_order_lookup(result: dict) -> str:
    order_data = result.get("order") if isinstance(result.get("order"), dict) else result
    if not isinstance(order_data, dict):
        return ""
    if order_data.get("found") is False:
        return f"لم يتم العثور على طلب برقم {order_data.get('orderNumber') or ''}"
    num = order_data.get("orderNumber") or order_data.get("number") or order_data.get("id") or ""
    raw_status = str(order_data.get("status") or "").upper()
    status_ar = {
        "PENDING": "قيد المراجعة والتجهيز",
        "CONFIRMED": "تم تأكيد الطلب وجاري تجهيزه للشحن",
        "PROCESSING": "جاري التجهيز والشحن",
        "SHIPPED": "تم شحن الطلب وهو في الطريق للعميل مع شركة الشحن",
        "DELIVERED": "تم تسليم الطلب بنجاح للعميل",
        "CANCELLED": "تم إلغاء الطلب",
        "RETURNED": "مرتجع",
    }.get(raw_status, raw_status or "مسجل")
    total = order_data.get("total") or ""
    items = order_data.get("items") or []
    items_str = ", ".join(i.get("name", "") for i in items if isinstance(i, dict) and i.get("name"))
    total_part = f"، الإجمالي: {total} ج" if total else ""
    items_part = f"، المنتجات: {items_str}" if items_str else ""

    shipping_company = order_data.get("shippingCompany") or ""
    tracking_number = order_data.get("trackingNumber") or ""
    shipped_at = order_data.get("shippedAt") or ""
    captain_name = order_data.get("captainName") or ""
    captain_phone = order_data.get("captainPhone") or ""

    shipping_parts = []
    if shipping_company:
        shipping_parts.append(f"شركة الشحن: {shipping_company}")
    if tracking_number:
        shipping_parts.append(f"رقم البوليصة/التتبع: {tracking_number}")
    if shipped_at:
        shipping_parts.append(f"تاريخ الشحن: {shipped_at}")
    if captain_name:
        cap_str = f"{captain_name} ({captain_phone})" if captain_phone else captain_name
        shipping_parts.append(f"المندوب: {cap_str}")

    shipping_summary = f" | {'، '.join(shipping_parts)}" if shipping_parts else ""
    return f"طلب رقم #{num} - حالته: {status_ar}{total_part}{items_part}{shipping_summary}"


def _format_order_lookup_by_phone(result: dict) -> str:
    orders = result.get("orders") or []
    if not orders:
        return "لم يتم العثور على طلبات سابقة مسجلة برقم هذا الهاتف"
    summaries = []
    for o in orders[:5]:
        num = o.get("orderNumber") or o.get("id") or ""
        st = o.get("status") or ""
        tot = o.get("total") or ""
        carrier = o.get("shippingCompany") or ""
        track = o.get("trackingNumber") or ""
        ship_txt = f"، الشحن: {carrier}" + (f" #{track}" if track else "") if carrier else ""
        summaries.append(f"طلب #{num} (الحالة: {st}، المبلغ: {tot} ج{ship_txt})")
    return f"تم العثور على {len(orders)} طلب: " + " | ".join(summaries)


order_lookup_tool = FunctionTool(
    name="order_lookup",
    description="Look up an order by its order number or tracking number (AWB). Use when merchant or customer asks about order status, which shipping company/carrier the order belongs to, tracking/AWB number, delivery status, or items. Returns order status, shippingCompany, trackingNumber, shipment details, items, and customer info.",
    func=order_lookup,
    input_model=OrderLookupInput,
    format_result=_format_order_lookup,
)

order_lookup_by_phone_tool = FunctionTool(
    name="order_lookup_by_phone",
    description="Search all orders for a customer by their PHONE NUMBER. USE THIS when the customer asks about 'my orders' / 'my order' but does not know the order number — pass the phone number they provide. Returns a list of matching orders (orderNumber, status, total, date). If empty, the number has no orders.",
    func=order_lookup_by_phone,
    input_model=OrderLookupByPhoneInput,
    format_result=_format_order_lookup_by_phone,
)

order_create_draft_tool = FunctionTool(
    name="order_create_draft",
    description="Save a pending order for merchant review ONLY when the customer has NOT yet confirmed. Use this as a draft/quote step when you are still collecting order details. REQUIRES MERCHANT APPROVAL — do NOT use when customer already said اوكد/اكد/نعم/confirm.",
    func=order_create_draft,
    input_model=OrderCreateDraftInput,
)

order_create_confirmed_tool = FunctionTool(
    name="order_create_confirmed",
    description="Create and confirm an order in the system immediately. USE THIS when the customer explicitly confirms with اوكد / اكد / نعم / confirm / تمام after you showed them the order summary. You MUST fill: customer_name, customer_phone, product_name, quantity, address. Pull all values from the conversation history — do NOT ask the customer again.",
    func=order_create_confirmed,
    input_model=OrderCreateConfirmedInput,
)

order_summary_tool = FunctionTool(
    name="order_summary",
    description="Get aggregate order summary, total order count, and revenue for a time period ('today', 'yesterday', 'week', 'month', 'all'). ALWAYS USE THIS tool when asked for the number or count of orders (e.g. 'عدد الأوردرات في آخر أسبوع', 'كام أوردر جالنا'). Returns the true totalOrders count without any list limits.",
    func=order_summary,
    input_model=OrderSummaryInput,
)

order_recent_list_tool = FunctionTool(
    name="order_recent_list",
    description="List and browse individual order records with customer and tracking details. Supports filtering by status ('CONFIRMED', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'), period ('today', 'yesterday', 'week', 'month', 'all'), or date. For order counts only, use order_summary instead.",
    func=order_recent_list,
    input_model=OrderRecentListInput,
)

order_cancel_tool = FunctionTool(
    name="order_cancel",
    description="Cancel a customer order. REQUIRES MERCHANT APPROVAL.",
    func=order_cancel,
    input_model=OrderCancelInput,
)

order_confirm_tool = FunctionTool(
    name="order_confirm",
    description="Confirm an existing order after the customer explicitly agrees on the order and the delivery address. This moves the order to CONFIRMED, notifies the customer, and hands it over to the shipping company. NEVER call this before the address is verified against the shipping company's map and the customer confirmed.",
    func=order_confirm,
    input_model=OrderConfirmInput,
)

order_update_details_tool = FunctionTool(
    name="order_update_details",
    description="Update an existing order's delivery address / customer contact details. Use after the customer provides a corrected address that matches the shipping company's governorate/area map. Pass structured shipping_address with keys: governorate, city/area, address, phone. NEVER invent locations not present in the shipping company map.",
    func=order_update_details,
    input_model=OrderUpdateDetailsInput,
)

order_refund_tool = FunctionTool(
    name="order_refund",
    description="Process a refund for an order. REQUIRES MERCHANT APPROVAL.",
    func=order_refund,
    input_model=OrderRefundInput,
)

__all_tools__ = [
    order_lookup_tool,
    order_lookup_by_phone_tool,
    order_create_draft_tool,
    order_create_confirmed_tool,
    order_summary_tool,
    order_recent_list_tool,
    order_confirm_tool,
    order_update_details_tool,
    order_cancel_tool,
    order_refund_tool,
]
