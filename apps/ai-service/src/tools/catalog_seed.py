"""Seed curated catalog capabilities (pilot domains: returns, invoices,
coupons) into ai.agent_tool_catalog as active bridge tools.

Each row targets a REAL backend route from the Phase-1 capability manifest.
Descriptions are English (LLM-facing, matching existing tool style);
usage_hint_ar is the Egyptian-Arabic guidance surfaced to merchants.
"""
from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.agent_tool_catalog import AgentToolCatalog

logger = structlog.get_logger(__name__)

# Pilot-domain bridge capabilities. risk_level drives the approval gate:
# read → immediate, write → merchant approval card.
CURATED_CAPABILITIES: list[dict] = [
    # ── Returns ────────────────────────────────────────────────────────
    {
        "name": "returns_requests_list",
        "domain": "returns",
        "description_en": (
            "List customer return requests with optional status filter. "
            "Use when the merchant asks about pending/approved returns or wants a returns overview."
        ),
        "usage_hint_ar": "استخدمها لما التاجر يسأل عن المرتجعات أو عايز يراجع طلبات الإرجاع المعلقة",
        "endpoint": "/api/v1/returns/requests",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status: PENDING, APPROVED, REJECTED, COMPLETED (optional)"},
                "limit": {"type": "integer", "description": "Max results (default 20)"},
            },
        },
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "returns_request_get",
        "domain": "returns",
        "description_en": (
            "Get full details of one return request (items, reason, customer, history) by its ID. "
            "Use after returns_requests_list to inspect a specific return."
        ),
        "usage_hint_ar": "استخدمها لتفاصيل طلب مرتجع معين بعد ما تجيبه من القايمة",
        "endpoint": "/api/v1/returns/requests/:id",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string", "description": "Return request ID"}},
            "required": ["id"],
        },
        "path_params": ["id"],
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "returns_request_review",
        "domain": "returns",
        "description_en": (
            "Record the review decision on a return request: mark it reviewed, set the refund "
            "amount and admin notes (approve/reject is applied by the store team from the review). "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لتسجيل مراجعة طلب المرتجع (مبلغ الاسترداد والملاحظات) — بعد موافقة التاجر",
        "endpoint": "/api/v1/returns/requests/:id",
        "http_method": "PUT",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Return request ID"},
                "isReviewed": {"type": "boolean", "description": "Mark the request as reviewed"},
                "refundAmount": {"type": "number", "description": "Approved refund amount"},
                "adminNotes": {"type": "string", "description": "Decision notes for the store team"},
            },
            "required": ["id"],
        },
        "path_params": ["id"],
        "permission_key": "orders.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    # ── Invoices ───────────────────────────────────────────────────────
    {
        "name": "invoice_list",
        "domain": "invoices",
        "description_en": (
            "List store invoices with optional payment-status filter (PAID, UNPAID, PARTIALLY_PAID). "
            "Use when the merchant asks about invoices or unpaid bills."
        ),
        "usage_hint_ar": "استخدمها لما التاجر يسأل عن الفواتير أو الفواتير غير المدفوعة",
        "endpoint": "/api/v1/order-invoices",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {
                "paymentStatus": {"type": "string", "description": "Filter: PAID, UNPAID, PARTIALLY_PAID (optional)"},
                "limit": {"type": "integer", "description": "Max results (default 20)"},
            },
        },
        "permission_key": "orders.view",
        "app_slug": "order-invoicing",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "invoice_generate_for_order",
        "domain": "invoices",
        "description_en": (
            "Generate an invoice for an order. REQUIRES MERCHANT APPROVAL — the merchant confirms before the invoice is created."
        ),
        "usage_hint_ar": "استخدمها لإنشاء فاتورة لطلب معين — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-invoices/generate/:orderId",
        "http_method": "POST",
        "input_schema": {
            "type": "object",
            "properties": {"orderId": {"type": "string", "description": "Order ID to invoice"}},
            "required": ["orderId"],
        },
        "path_params": ["orderId"],
        "permission_key": "orders.edit",
        "app_slug": "order-invoicing",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "invoice_update_payment_status",
        "domain": "invoices",
        "description_en": (
            "Update an invoice's payment status (PENDING, PAID, PARTIALLY_PAID, CANCELLED, REFUNDED — "
            "e.g. mark PAID after cash collection). REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لتسجيل سداد فاتورة — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-invoices/:id/payment-status",
        "http_method": "PUT",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Invoice ID"},
                "paymentStatus": {"type": "string", "description": "PENDING, PAID, PARTIALLY_PAID, CANCELLED, or REFUNDED"},
            },
            "required": ["id", "paymentStatus"],
        },
        "path_params": ["id"],
        "permission_key": "orders.edit",
        "app_slug": "order-invoicing",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    # ── Coupons ────────────────────────────────────────────────────────
    {
        "name": "coupon_list",
        "domain": "coupons",
        "description_en": (
            "List store coupons with usage counts. Use when the merchant asks about active coupons "
            "or before creating a new one (avoid duplicate codes)."
        ),
        "usage_hint_ar": "استخدمها لعرض الكوبونات أو التأكد من عدم تكرار الكود قبل الإنشاء",
        "endpoint": "/api/v1/coupons",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "Max results (default 20)"}},
        },
        "permission_key": "products.view",
        "app_slug": "coupons-pro",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "coupon_stats",
        "domain": "coupons",
        "description_en": "Coupon performance stats (usage counts, discount totals). Use for 'how are my coupons doing' questions.",
        "usage_hint_ar": "استخدمها لما التاجر يسأل عن أداء الكوبونات",
        "endpoint": "/api/v1/coupons/stats",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "products.view",
        "app_slug": "coupons-pro",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "coupon_create",
        "domain": "coupons",
        "description_en": (
            "Create a coupon (code, percentage or fixed amount, validity window). "
            "REQUIRES MERCHANT APPROVAL — always read coupon_list first to avoid duplicate codes."
        ),
        "usage_hint_ar": "استخدمها لإنشاء كوبون جديد — اتأكد الأول إن الكود مش موجود، وبعد موافقة التاجر",
        "endpoint": "/api/v1/coupons",
        "http_method": "POST",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Coupon code (e.g. SUMMER20)"},
                "name": {"type": "string", "description": "Display name"},
                "type": {"type": "string", "description": "percentage or fixed"},
                "value": {"type": "number", "description": "Discount value (percent 1-100 or fixed amount)"},
                "minOrderAmount": {"type": "number", "description": "Minimum order total (optional)"},
                "usageLimit": {"type": "integer", "description": "Total usage limit (optional)"},
                "validFrom": {"type": "string", "description": "ISO date, e.g. 2026-10-01T00:00:00Z"},
                "validTo": {"type": "string", "description": "ISO date, e.g. 2026-10-31T23:59:59Z"},
            },
            "required": ["code", "name", "type", "value", "validFrom", "validTo"],
        },
        "permission_key": "products.create",
        "app_slug": "coupons-pro",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
]


async def seed_curated_capabilities(session: AsyncSession) -> dict[str, int]:
    """Upsert curated rows; never demote or overwrite manually activated rows."""
    stats = {"created": 0, "updated": 0, "skipped": 0}
    for cap in CURATED_CAPABILITIES:
        existing = (await session.execute(
            select(AgentToolCatalog).where(AgentToolCatalog.name == cap["name"])
        )).scalar_one_or_none()

        if existing is None:
            session.add(AgentToolCatalog(**cap))
            stats["created"] += 1
        elif existing.exposure_state in ("draft", "active"):
            # refresh curated fields but keep operator-controlled state/roles
            changed = False
            for field in ("description_en", "endpoint", "http_method", "input_schema",
                          "path_params", "permission_key", "app_slug", "risk_level"):
                new_value = cap.get(field)
                if new_value is not None and getattr(existing, field) != new_value:
                    setattr(existing, field, new_value)
                    changed = True
            if changed:
                stats["updated"] += 1
            else:
                stats["skipped"] += 1
        else:  # tracked/hidden — operator decided; leave alone
            stats["skipped"] += 1

    await session.commit()
    logger.info("curated_capabilities_seeded", **stats)
    return stats
