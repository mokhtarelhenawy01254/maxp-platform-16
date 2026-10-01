from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _executed_result


class ShippingZoneSetInput(BaseModel):
    governorates: list[str] | str = Field(
        description="Governorate name or list of governorates to set shipping price for (e.g. 'الإسكندرية' or ['القاهرة', 'الجيزة'])"
    )
    price: float = Field(
        description="Shipping cost/price (e.g. 50.0)"
    )
    delivery_time: str = Field(
        default="2-3 أيام",
        description="Expected delivery duration (e.g. '2-3 أيام' or '1-2 days')"
    )
    name: str | None = Field(
        default=None,
        description="Optional name for this shipping zone (e.g. 'شحن الإسكندرية')"
    )
    free_shipping_threshold: float | None = Field(
        default=None,
        description="Optional minimum order amount to qualify for free shipping (e.g. 500.0)"
    )
    is_active: bool = Field(
        default=True,
        description="Whether this shipping rate is active"
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)"
    )


class ShippingRatesInput(BaseModel):
    governorate: str = Field(description="Governorate to check shipping rates for")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingUpdateInput(BaseModel):
    order_id: str = Field(description="Order ID or number to update shipping for")
    address: str | None = Field(default=None, description="New delivery address")
    shipping_class: str | None = Field(default=None, description="New shipping class")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingCompanyGovernoratesInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingCompanyAreasInput(BaseModel):
    government_id: str = Field(description="Governorate/government ID from the shipping company map")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class SearchAreaByTextInput(BaseModel):
    query: str = Field(description="Free-text address or area name to search for, e.g. 'مدينة نصر' or 'القاهرة المعادي'")
    limit: int = Field(default=10, description="Max results to return (1-25)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingTicketCategoriesInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingTicketListInput(BaseModel):
    status: str = Field(default="all", description="Filter by status: 'all', 'open', 'closed'")
    page: int = Field(default=1, description="Page number (default 1)")
    per_page: int = Field(default=10, description="Items per page (1-50, default 10)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingTicketGetInput(BaseModel):
    ticket_id: str | int = Field(description="ID of the shipping ticket to retrieve details and messages for")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingTicketCreateInput(BaseModel):
    content: str = Field(description="Issue description or instructions for the shipping company (e.g. 'العميل يطلب تأجيل الاستلام للغد الساعة 4 عصراً ورقم الهاتف البديل 01012345678')")
    code: str | None = Field(default=None, description="Related shipment tracking number, order number, or AWB")
    category_id: int | str | None = Field(default=None, description="Category or inquiry type ID (from shipping_ticket_categories)")
    priority: str = Field(default="medium", description="Ticket priority: 'low', 'medium', or 'high'")
    related_to: str = Field(default="shipments", description="Related entity: 'shipments', 'branches', 'client_requests', 'others'")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingTicketReplyInput(BaseModel):
    ticket_id: str | int = Field(description="Ticket ID to send the reply to")
    message: str = Field(description="Reply message text sent to the carrier support or delivery captain")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShipmentTrackInput(BaseModel):
    tracking_code: str = Field(description="Shipment tracking number, order number, or AWB to track")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")



async def shipping_rates(input_data: ShippingRatesInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    governorate = input_data.governorate
    if not company_id or not governorate:
        return {"found": False, "error": "Missing company_id or governorate"}

    from src.tools.repositories.shipping_repository import ShippingRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        zone = await ShippingRepository(sess).find_zone_for_governorate(company_id, governorate)

    if not zone:
        return {"found": False, "code": "SHIPPING_RATE_NOT_FOUND", "governorate": governorate}

    return {
        "found": True,
        "governorate": governorate,
        "price": str(zone["price"]),
        "deliveryTime": zone["deliveryTime"],
        "isFlat": True,
    }


async def shipping_update(input_data: ShippingUpdateInput) -> dict[str, Any]:
    """Update an order's delivery address through the backend.

    Runs after merchant approval: reuses the orders-v2 details route (same
    one as order_update_details) so validation, status history, and side
    effects run server-side. `shipping_class` is recorded in order notes
    (the backend route has no shipping-class field).
    """
    company_id = input_data.company_id or ""
    if not company_id or not input_data.order_id:
        return {"success": False, "error": "Missing company_id or order_id"}

    data: dict[str, Any] = {}
    if input_data.address:
        data["shippingAddress"] = input_data.address
    if input_data.shipping_class:
        data["notes"] = f"shipping class → {input_data.shipping_class}"
    if not data:
        return {"success": False, "error": "Nothing to update (provide address and/or shipping_class)"}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.update_order_details(
            company_id, input_data.order_id, data
        )
        return {
            "success": True,
            "orderId": input_data.order_id,
            "updatedFields": list(data.keys()),
            "backend": result,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "orderId": input_data.order_id}


async def shipping_company_governorates(input_data: ShippingCompanyGovernoratesInput) -> dict[str, Any]:
    """Fetch the shipping company's governorate map (canonical list)."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"found": False, "error": "Missing company_id", "governorates": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_company_governorates(company_id)
        governorates = result.get("governments") or result.get("governorates") or result.get("data") or []
        return {
            "found": True,
            "governorates": [
                {"id": str(g.get("id", "")), "name": str(g.get("name", ""))}
                for g in governorates
            ],
            "isFallback": bool(result.get("isFallback")),
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "governorates": []}


async def shipping_company_areas(input_data: ShippingCompanyAreasInput) -> dict[str, Any]:
    """Fetch the shipping company's areas for a specific governorate."""
    company_id = input_data.company_id or ""
    government_id = input_data.government_id
    if not company_id or not government_id:
        return {"found": False, "error": "Missing company_id or government_id", "areas": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_company_areas(company_id, government_id)
        areas = result.get("areas") or result.get("data") or []
        return {
            "found": True,
            "governmentId": government_id,
            "areas": [
                {"id": str(a.get("id", "")), "name": str(a.get("name", ""))}
                for a in areas
            ],
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "areas": []}


async def search_area_by_text(input_data: SearchAreaByTextInput) -> dict[str, Any]:
    """Search the shipping company's area map by free text.

    Returns ranked matches each carrying governorate + area + confidence.
    The agent MUST use these results (never invented names) when resolving
    a customer address against the shipping company's canonical map.
    """
    company_id = input_data.company_id or ""
    query = (input_data.query or "").strip()
    if not company_id or not query:
        return {"found": False, "error": "Missing company_id or query", "matches": []}

    limit = max(1, min(int(input_data.limit or 10), 25))

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.search_area_by_text(company_id, query, limit=limit)
        matches = result.get("matches") or []
        return {
            "found": len(matches) > 0,
            "query": query,
            "matches": matches,
            "count": len(matches),
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "matches": []}


async def shipping_zone_set(input_data: ShippingZoneSetInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    raw_govs = input_data.governorates
    if isinstance(raw_govs, str):
        govs = [g.strip() for g in raw_govs.split(",") if g.strip()]
    elif isinstance(raw_govs, list):
        govs = [str(g).strip() for g in raw_govs if str(g).strip()]
    else:
        govs = []

    if not govs:
        return {"success": False, "error": "يرجى تحديد محافظة واحدة على الأقل"}

    if input_data.price < 0:
        return {"success": False, "error": "سعر الشحن لا يمكن أن يكون سالباً"}

    from src.tools.repositories.shipping_repository import ShippingRepository
    import src.db.session as _db_mod

    if _db_mod.async_session is None:
        await _db_mod.init_db()

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ShippingRepository(sess)
        result = await repo.upsert_zone(
            company_id=company_id,
            governorates=govs,
            price=input_data.price,
            delivery_time=input_data.delivery_time,
            name=input_data.name,
            free_shipping_threshold=input_data.free_shipping_threshold,
            is_active=input_data.is_active,
        )

    return _executed_result("SHIPPING_ZONE_SET", result)


def _format_shipping_zone_set(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("id") and not res.get("success", True):
        return f"تعذر تحديث سعر الشحن: {res.get('error', 'خطأ غير معروف')}"
    govs_str = ", ".join(res.get("governorates", []))
    price = res.get("price")
    time = res.get("deliveryTime")
    action_str = "تم تحديث" if res.get("isUpdated") else "تمت إضافة"
    msg = f"{action_str} سعر الشحن لمحافظة ({govs_str}) بنجاح: {price} ج.م (مدة التوصيل: {time})."
    if res.get("freeShippingThreshold"):
        msg += f" [شحن مجاني للطلبات فوق {res.get('freeShippingThreshold')} ج.م]."
    return msg


async def shipping_ticket_categories(input_data: ShippingTicketCategoriesInput) -> dict[str, Any]:
    """Fetch available ticket categories/inquiry types from the shipping carrier."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id", "categories": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_ticket_categories(company_id)
        categories = result.get("types") or result.get("categories") or result.get("data") or []
        formatted = []
        for cat in categories:
            if isinstance(cat, dict):
                formatted.append({
                    "id": cat.get("id"),
                    "name": cat.get("name") or cat.get("title") or "",
                })
            else:
                formatted.append({"id": str(cat), "name": str(cat)})
        return {
            "success": True,
            "count": len(formatted),
            "categories": formatted,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "categories": []}


async def shipping_ticket_list(input_data: ShippingTicketListInput) -> dict[str, Any]:
    """List support tickets opened with the shipping carrier."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id", "tickets": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_tickets(
            company_id=company_id,
            page=input_data.page,
            per_page=input_data.per_page,
            status=input_data.status,
        )
        data = result.get("data", result)
        tickets = data.get("tickets") or result.get("tickets") or []
        summary = []
        for t in tickets:
            if isinstance(t, dict):
                summary.append({
                    "ticketId": str(t.get("id") or t.get("ticket_id") or ""),
                    "code": str(t.get("code") or t.get("related_value") or ""),
                    "status": str(t.get("status") or t.get("ticket_status") or "open"),
                    "priority": str(t.get("priority", "medium")),
                    "content": str(t.get("content") or t.get("description") or "")[:120],
                    "createdAt": str(t.get("created_at") or t.get("createdAt") or ""),
                })
        return {
            "success": True,
            "count": len(summary),
            "tickets": summary,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "tickets": []}


async def shipping_ticket_get(input_data: ShippingTicketGetInput) -> dict[str, Any]:
    """Retrieve details and messages of a specific shipping ticket."""
    company_id = input_data.company_id or ""
    ticket_id = input_data.ticket_id
    if not company_id or not ticket_id:
        return {"success": False, "error": "Missing company_id or ticket_id"}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_ticket(company_id, str(ticket_id))
        ticket = result.get("ticket") or result.get("data", {}).get("ticket") or result.get("data") or {}
        messages = []
        raw_msgs = ticket.get("messages") or ticket.get("replies") or []
        for m in raw_msgs:
            if isinstance(m, dict):
                messages.append({
                    "sender": "الدعم / شركة الشحن" if m.get("is_client_message") == 0 else "المتجر / العميل",
                    "content": m.get("content") or m.get("message") or "",
                    "time": str(m.get("created_at") or m.get("createdAt") or ""),
                })
        return {
            "success": True,
            "ticketId": str(ticket_id),
            "code": str(ticket.get("code") or ""),
            "status": str(ticket.get("status") or ""),
            "content": str(ticket.get("content") or ""),
            "messages": messages,
            "matchedOrder": ticket.get("matchedOrderSummary") or ticket.get("matchedOrder"),
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


async def shipping_ticket_create(input_data: ShippingTicketCreateInput) -> dict[str, Any]:
    """Create a new support ticket with the shipping company for a shipment/issue."""
    company_id = input_data.company_id or ""
    if not company_id or not input_data.content:
        return _executed_result("SHIPPING_TICKET_CREATE", {"success": False, "error": "Missing company_id or content"})

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.create_shipping_ticket(
            company_id=company_id,
            content=input_data.content,
            category_id=input_data.category_id,
            code=input_data.code,
            priority=input_data.priority,
            related_to=input_data.related_to,
        )
        ticket_id = result.get("ticketId") or result.get("id") or result.get("data", {}).get("id") or result.get("data", {}).get("ticketId")
        return _executed_result("SHIPPING_TICKET_CREATE", {
            "success": True,
            "ticketId": str(ticket_id or ""),
            "code": input_data.code or "",
            "priority": input_data.priority,
            "message": result.get("message") or "تم إنشاء تذكرة الدعم بنجاح لدى شركة الشحن",
        })
    except Exception as exc:
        return _executed_result("SHIPPING_TICKET_CREATE", {"success": False, "error": str(exc)})


async def shipping_ticket_reply(input_data: ShippingTicketReplyInput) -> dict[str, Any]:
    """Send a reply to an open shipping ticket."""
    company_id = input_data.company_id or ""
    ticket_id = input_data.ticket_id
    message = (input_data.message or "").strip()
    if not company_id or not ticket_id or not message:
        return _executed_result("SHIPPING_TICKET_REPLY", {"success": False, "error": "Missing company_id, ticket_id, or message"})

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.reply_shipping_ticket(
            company_id=company_id,
            ticket_id=ticket_id,
            message=message,
        )
        return _executed_result("SHIPPING_TICKET_REPLY", {
            "success": True,
            "ticketId": str(ticket_id),
            "message": result.get("message") or "تم إرسال الرد بنجاح لشركة الشحن",
        })
    except Exception as exc:
        return _executed_result("SHIPPING_TICKET_REPLY", {"success": False, "error": str(exc)})


async def shipment_track(input_data: ShipmentTrackInput) -> dict[str, Any]:
    """Track a shipment by order number, tracking code, or AWB in real time."""
    company_id = input_data.company_id or ""
    code = (input_data.tracking_code or "").strip().lstrip("#").strip()
    if not company_id or not code:
        return {"found": False, "error": "Missing company_id or tracking_code"}

    from src.tools.backend_client import get_backend_client
    from src.tools.repositories.order_repository import OrderRepository
    import src.db.session as _db_mod

    order_info: dict[str, Any] | None = None
    if _db_mod.async_session is not None:
        try:
            async with _db_mod.async_session() as sess:
                repo = OrderRepository(sess)
                order_info = await repo.get_order(company_id, code)
        except Exception:
            pass

    shipping_carrier = str((order_info and order_info.get("shippingCarrier")) or "").upper()
    shipping_company = str((order_info and order_info.get("shippingCompany")) or "")
    resolved_tracking = str((order_info and order_info.get("trackingNumber")) or "")
    turbo_tracking = str((order_info and order_info.get("turboTrackingNumber")) or "")

    client = get_backend_client()
    carrier_tracking: dict[str, Any] | None = None
    # Query Turbo live API only when carrier is TURBO, turboTrackingNumber exists, or order wasn't found locally
    if not order_info or shipping_carrier == "TURBO" or turbo_tracking:
        try:
            track_res = await client.track_shipment_by_code(company_id, turbo_tracking or code)
            if track_res.get("success") or track_res.get("data"):
                carrier_tracking = track_res.get("data") or track_res
        except Exception:
            pass

    if not order_info and not carrier_tracking:
        return {
            "found": False,
            "trackingCode": code,
            "message": f"لم يتم العثور على شحنة أو طلب بالرقم ({code})",
        }

    status = (
        (carrier_tracking and (carrier_tracking.get("status") or carrier_tracking.get("internalStatus")))
        or (order_info and (order_info.get("shipmentStatus") or order_info.get("status")))
        or "PROCESSING"
    )
    order_status = (order_info and order_info.get("status")) or status

    captain_name = (
        (carrier_tracking and carrier_tracking.get("captainName"))
        or (order_info and order_info.get("captainName"))
        or ""
    )
    captain_phone = (
        (carrier_tracking and carrier_tracking.get("captainPhone"))
        or (order_info and order_info.get("captainPhone"))
        or ""
    )
    branch_name = (
        (carrier_tracking and carrier_tracking.get("branchName"))
        or (order_info and order_info.get("branchName"))
        or ""
    )
    shipped_at = str((order_info and order_info.get("shippedAt")) or "")

    carrier_display = (
        shipping_company
        or ("تربو للشحن (Turbo)" if carrier_tracking else "غير محدد بعد")
    )
    final_tracking = resolved_tracking or turbo_tracking or code

    return {
        "found": True,
        "trackingCode": final_tracking,
        "trackingNumber": final_tracking,
        "orderNumber": (order_info and order_info.get("orderNumber")) or code,
        "orderStatus": order_status,
        "status": status,
        "customerName": (order_info and order_info.get("customerName")) or "",
        "customerPhone": (order_info and order_info.get("customerPhone")) or "",
        "governorate": (order_info and order_info.get("governorate")) or "",
        "city": (order_info and order_info.get("city")) or "",
        "address": (order_info and (order_info.get("customerAddress") or order_info.get("shippingAddress"))) or "",
        "carrier": carrier_display,
        "shippingCompany": carrier_display,
        "shippingCarrier": shipping_carrier or ("TURBO" if carrier_tracking else ""),
        "shippedAt": shipped_at,
        "captainName": captain_name,
        "captainPhone": captain_phone,
        "branchName": branch_name,
        "shipments": (order_info and order_info.get("shipments")) or [],
        "liveCarrierData": carrier_tracking,
    }


def _format_shipping_ticket_create(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("success", True):
        return f"تعذر إنشاء تذكرة الشحن: {res.get('error', 'خطأ غير متوقع')}"
    ticket_id = res.get("ticketId") or "غير محدد"
    code = f" للشحنة/الطلب ({res.get('code')})" if res.get("code") else ""
    return f"تم فتح تذكرة دعم جديدة لدى شركة الشحن بنجاح (رقم التذكرة: {ticket_id}){code}."


def _format_shipping_ticket_reply(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("success", True):
        return f"تعذر إرسال الرد على التذكرة: {res.get('error', 'خطأ غير متوقع')}"
    return f"تم إرسال الرد على تذكرة الشحن رقم {res.get('ticketId')} بنجاح."


def _format_shipment_track(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("found"):
        return res.get("message") or f"لم يتم العثور على بيانات تتبع للشحنة {res.get('trackingCode')}."
    order_num = res.get("orderNumber") or ""
    carrier = res.get("shippingCompany") or res.get("carrier") or "غير محدد"
    tracking_num = res.get("trackingNumber") or res.get("trackingCode") or ""
    status = res.get("status", "قيد المعالجة")
    order_status = res.get("orderStatus") or ""
    shipped_at = res.get("shippedAt") or ""
    captain = f" | المندوب: {res.get('captainName')} ({res.get('captainPhone')})" if res.get("captainName") else ""
    branch = f" | الفرع: {res.get('branchName')}" if res.get("branchName") else ""
    date_part = f" | تاريخ الشحن: {shipped_at}" if shipped_at else ""
    order_part = f"الطلب #{order_num} — " if order_num else ""
    status_part = f"{order_status} ({status})" if order_status and order_status != status else status
    return (
        f"{order_part}شركة الشحن: {carrier} | رقم البوليصة/التتبع: {tracking_num} | "
        f"الحالة: {status_part}{date_part}{captain}{branch}."
    )


shipping_rates_tool = FunctionTool(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate. Only needs the governorate name to calculate — do not ask for full address, city, or street. Use this immediately when customer asks about delivery cost, shipping fees, or how much delivery costs.",
    func=shipping_rates,
    input_model=ShippingRatesInput,
)

shipping_zone_set_tool = FunctionTool(
    name="shipping_zone_set",
    description="Create or update shipping price and delivery duration for one or more governorates (e.g. setting Alexandria shipping to 60 EGP). Automatically creates the zone or updates the existing rate if already present.",
    func=shipping_zone_set,
    input_model=ShippingZoneSetInput,
    format_result=_format_shipping_zone_set,
)

shipping_update_tool = FunctionTool(
    name="shipping_update",
    description="Propose updating shipping address or class for an order. REQUIRES MERCHANT APPROVAL.",
    func=shipping_update,
    input_model=ShippingUpdateInput,
)

shipping_company_governorates_tool = FunctionTool(
    name="shipping_company_governorates",
    description="Get the SHIPPING COMPANY's canonical governorate map. Use this BEFORE confirming or editing an order address — the customer's address may use names not supported by the shipping company, so you must map it to this list. Then fetch areas with shipping_company_areas.",
    func=shipping_company_governorates,
    input_model=ShippingCompanyGovernoratesInput,
)

shipping_company_areas_tool = FunctionTool(
    name="shipping_company_areas",
    description="Get the SHIPPING COMPANY's areas for a governorate (pass the government id from shipping_company_governorates). Use to verify/correct the customer's area name before updating an order address.",
    func=shipping_company_areas,
    input_model=ShippingCompanyAreasInput,
)

search_area_by_text_tool = FunctionTool(
    name="search_area_by_text",
    description="Search the SHIPPING COMPANY's entire area map by free text (e.g. 'مدينة نصر' or 'المعادي'). Returns ranked matches with governorate + area + confidence. Use this when a customer's address has an area name but you are not sure which governorate it belongs to, or to resolve a free-text address into the shipping company's canonical governorate/area.",
    func=search_area_by_text,
    input_model=SearchAreaByTextInput,
)

shipping_ticket_categories_tool = FunctionTool(
    name="shipping_ticket_categories",
    description="Get the list of supported ticket categories and inquiry types from the shipping company (e.g. delivery delay, address update, re-delivery request, cash on delivery inquiry).",
    func=shipping_ticket_categories,
    input_model=ShippingTicketCategoriesInput,
)

shipping_ticket_list_tool = FunctionTool(
    name="shipping_ticket_list",
    description="List active and past support tickets opened with the shipping company. Use to check open tickets, complaints, or inquiries regarding shipments.",
    func=shipping_ticket_list,
    input_model=ShippingTicketListInput,
)

shipping_ticket_get_tool = FunctionTool(
    name="shipping_ticket_get",
    description="Get full details, conversation messages, and status history of a specific shipping ticket by its ID.",
    func=shipping_ticket_get,
    input_model=ShippingTicketGetInput,
)

shipping_ticket_create_tool = FunctionTool(
    name="shipping_ticket_create",
    description="Open a new support ticket with the shipping company (e.g. requesting re-delivery, reporting delivery delay, updating phone/address instructions for the delivery captain).",
    func=shipping_ticket_create,
    input_model=ShippingTicketCreateInput,
    format_result=_format_shipping_ticket_create,
)

shipping_ticket_reply_tool = FunctionTool(
    name="shipping_ticket_reply",
    description="Reply to an existing shipping ticket with new information or clarification (e.g. providing alternate phone number or confirmed delivery appointment).",
    func=shipping_ticket_reply,
    input_model=ShippingTicketReplyInput,
    format_result=_format_shipping_ticket_reply,
)

shipment_track_tool = FunctionTool(
    name="shipment_track",
    description="Track a shipment in real-time by order number, tracking number, or AWB. Returns shipping carrier, delivery status, courier/captain contact details, and progress.",
    func=shipment_track,
    input_model=ShipmentTrackInput,
    format_result=_format_shipment_track,
)

__all_tools__ = [
    shipping_rates_tool,
    shipping_zone_set_tool,
    shipping_update_tool,
    shipping_company_governorates_tool,
    shipping_company_areas_tool,
    search_area_by_text_tool,
    shipment_track_tool,
    shipping_ticket_categories_tool,
    shipping_ticket_list_tool,
    shipping_ticket_get_tool,
    shipping_ticket_create_tool,
    shipping_ticket_reply_tool,
]

