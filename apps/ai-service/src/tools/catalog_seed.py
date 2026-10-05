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
            "List customer return requests with optional date range and status filter. "
            "When the merchant asks about returns for yesterday, today, or a specific period, ALWAYS pass dateFrom and dateTo (YYYY-MM-DD format). "
            "Never guess or declare zero returns without querying the exact date range."
        ),
        "usage_hint_ar": "استخدمها لما التاجر يسأل عن المرتجعات أو طلبات الإرجاع المعلقة أو مرتجعات فترة معينة (اليوم أو أمس مع تمرير dateFrom و dateTo)",
        "endpoint": "/api/v1/returns/requests",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {
                "dateFrom": {"type": "string", "description": "Filter returns created on or after date (YYYY-MM-DD, e.g. '2026-09-29')"},
                "dateTo": {"type": "string", "description": "Filter returns created on or before date (YYYY-MM-DD, e.g. '2026-09-29')"},
                "status": {"type": "string", "description": "Filter by return status: PENDING, APPROVED, REJECTED, COMPLETED (optional)"},
                "search": {"type": "string", "description": "Search by orderNumber, trackingNumber, or customer phone/name"},
                "page": {"type": "integer", "description": "Page number (default 1)"},
                "limit": {"type": "integer", "description": "Max results per page (default 50, max 100)"},
            },
        },
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
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
    # ── Loyalty (crm-loyalty app) ─────────────────────────────────────
    {
        "name": "loyalty_programs_list",
        "domain": "loyalty",
        "description_en": (
            "List customer loyalty programs with tiers and status. Use when the merchant asks "
            "about loyalty programs or before loyalty operations."
        ),
        "usage_hint_ar": "استخدمها لما التاجر يسأل عن برامج الولاء أو قبل أي عملية نقاط",
        "endpoint": "/api/v1/hr/customer-loyalty/programs",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "customers.view",
        "app_slug": "crm-loyalty",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "loyalty_customers_list",
        "domain": "loyalty",
        "description_en": (
            "List customers enrolled in the loyalty program with their points and tier. "
            "Use for 'who has the most points' or customer loyalty lookups."
        ),
        "usage_hint_ar": "استخدمها لعرض عملاء الولاء ونقاطهم ومستوياتهم",
        "endpoint": "/api/v1/hr/customer-loyalty/customers",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "limit": {"type": "integer", "description": "Max results (default 20)"},
        }},
        "permission_key": "customers.view",
        "app_slug": "crm-loyalty",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "loyalty_add_points",
        "domain": "loyalty",
        "description_en": (
            "Add loyalty points to a customer's balance. REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لإضافة نقاط ولاء لعميل — بعد موافقة التاجر",
        "endpoint": "/api/v1/hr/customer-loyalty/add-points",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "customerId": {"type": "string", "description": "Customer ID"},
            "points": {"type": "number", "description": "Points to add"},
            "reason": {"type": "string", "description": "Reason for the adjustment"},
        }, "required": ["customerId", "points"]},
        "permission_key": "customers.edit",
        "app_slug": "crm-loyalty",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "loyalty_redeem_points",
        "domain": "loyalty",
        "description_en": (
            "Redeem (deduct) loyalty points from a customer's balance, e.g. against a reward. "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لصرف نقاط ولاء من رصيد عميل — بعد موافقة التاجر",
        "endpoint": "/api/v1/hr/customer-loyalty/redeem-points",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "customerId": {"type": "string", "description": "Customer ID"},
            "points": {"type": "number", "description": "Points to redeem"},
            "reason": {"type": "string", "description": "Redemption reason"},
        }, "required": ["customerId", "points"]},
        "permission_key": "customers.edit",
        "app_slug": "crm-loyalty",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "loyalty_system_settings_read",
        "domain": "loyalty",
        "description_en": "Read loyalty system settings (points-per-pound, tier rules, cashback). Use before explaining loyalty rules to the merchant.",
        "usage_hint_ar": "استخدمها لقراءة قواعد الولاء (نقاط لكل جنيه/مستويات/كاش باك)",
        "endpoint": "/api/v1/hr/customer-loyalty/system-settings",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "customers.view",
        "app_slug": "crm-loyalty",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Landing pages ──────────────────────────────────────────────────
    {
        "name": "landing_pages_list",
        "domain": "landing_pages",
        "description_en": (
            "List product landing pages with publish status. Use when the merchant asks "
            "about landing pages or before creating one."
        ),
        "usage_hint_ar": "استخدمها لعرض لاندينج بيدج المنتجات وحالة النشر",
        "endpoint": "/api/v1/product-landings",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "limit": {"type": "integer", "description": "Max results (default 20)"},
        }},
        "permission_key": "products.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "landing_page_get",
        "domain": "landing_pages",
        "description_en": "Get one landing page's full content by ID. Use after landing_pages_list to inspect a page.",
        "usage_hint_ar": "استخدمها لتفاصيل لاندينج بيدج معينة",
        "endpoint": "/api/v1/product-landings/:id",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Landing page ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "products.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "landing_page_publish_toggle",
        "domain": "landing_pages",
        "description_en": (
            "Publish or unpublish a product landing page. REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لنشر أو إيقاف لاندينج بيدج — بعد موافقة التاجر",
        "endpoint": "/api/v1/product-landings/:id/status",
        "http_method": "PATCH",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Landing page ID"},
            "status": {"type": "string", "description": "published or draft"},
        }, "required": ["id", "status"]},
        "path_params": ["id"],
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "landing_page_ai_content",
        "domain": "landing_pages",
        "description_en": (
            "Generate AI marketing content for a product landing page (headlines, sections, CTA). "
            "REQUIRES MERCHANT APPROVAL — generation overwrites the page's AI-generated sections."
        ),
        "usage_hint_ar": "استخدمها لتوليد محتوى تسويقي بالذكاء الاصطناعي للاندينج بيدج — بعد موافقة التاجر",
        "endpoint": "/api/v1/product-landings/:id/ai-content",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Landing page ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Outgoing webhooks (webhooks-pro app) ───────────────────────────
    {
        "name": "webhooks_list",
        "domain": "webhooks",
        "description_en": (
            "List outgoing order webhooks with their target URLs and event types. Use when the "
            "merchant asks about integrations/webhooks."
        ),
        "usage_hint_ar": "استخدمها لعرض الويب هوكس الصادرة وعناوينها",
        "endpoint": "/api/v1/order-webhooks",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "settings.read",
        "app_slug": "webhooks-pro",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "webhook_create",
        "domain": "webhooks",
        "description_en": (
            "Create an outgoing webhook (target URL + events). REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لإنشاء ويب هوك جديد — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-webhooks",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "url": {"type": "string", "description": "Target HTTPS URL"},
            "events": {"type": "array", "description": "Event names to subscribe, e.g. order.created"},
        }, "required": ["url"]},
        "permission_key": "settings.manage",
        "app_slug": "webhooks-pro",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "webhook_test",
        "domain": "webhooks",
        "description_en": "Send a test payload to a webhook endpoint and report the delivery result.",
        "usage_hint_ar": "استخدمها لاختبار ويب هوك بإرسال بيلد تجريبي",
        "endpoint": "/api/v1/order-webhooks/:id/test",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Webhook ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "settings.read",
        "app_slug": "webhooks-pro",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "webhook_logs",
        "domain": "webhooks",
        "description_en": "Read a webhook's delivery logs (successes, failures, response codes). Use to debug failed integrations.",
        "usage_hint_ar": "استخدمها لتشخيص فشل الويب هوك من سجل التسليم",
        "endpoint": "/api/v1/order-webhooks/:id/logs",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Webhook ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "settings.read",
        "app_slug": "webhooks-pro",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "webhook_delete",
        "domain": "webhooks",
        "description_en": "Delete an outgoing webhook. REQUIRES MERCHANT APPROVAL.",
        "usage_hint_ar": "استخدمها لحذف ويب هوك — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-webhooks/:id",
        "http_method": "DELETE",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Webhook ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "settings.manage",
        "app_slug": "webhooks-pro",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Product reviews moderation ─────────────────────────────────────
    {
        "name": "reviews_list",
        "domain": "reviews",
        "description_en": (
            "List product reviews with status filter (pending/approved/rejected). Use when the "
            "merchant asks about customer reviews or before moderation."
        ),
        "usage_hint_ar": "استخدمها لعرض تقييمات العملاء على المنتجات وفلترتها بالحالة",
        "endpoint": "/api/v1/reviews",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "status": {"type": "string", "description": "Filter: pending, approved, rejected (optional)"},
            "limit": {"type": "integer", "description": "Max results (default 20)"},
        }},
        "permission_key": "products.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "review_approve",
        "domain": "reviews",
        "description_en": "Approve a product review so it shows on the storefront. REQUIRES MERCHANT APPROVAL.",
        "usage_hint_ar": "استخدمها لقبول تقييم منتج — بعد موافقة التاجر",
        "endpoint": "/api/v1/reviews/:id/approve",
        "http_method": "PUT",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Review ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "review_reject",
        "domain": "reviews",
        "description_en": "Reject a product review so it stays hidden from the storefront. REQUIRES MERCHANT APPROVAL.",
        "usage_hint_ar": "استخدمها لرفض تقييم منتج — بعد موافقة التاجر",
        "endpoint": "/api/v1/reviews/:id/reject",
        "http_method": "PUT",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Review ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "reviews_bulk_action",
        "domain": "reviews",
        "description_en": (
            "Apply a bulk action (approve/reject/delete) to multiple reviews at once. "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لقبول أو رفض مجموعة تقييمات مرة واحدة — بعد موافقة التاجر",
        "endpoint": "/api/v1/reviews/bulk-action",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "reviewIds": {"type": "array", "description": "Review IDs to act on"},
            "action": {"type": "string", "description": "approve, reject, or delete"},
        }, "required": ["reviewIds", "action"]},
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Import / export jobs ───────────────────────────────────────────
    {
        "name": "import_jobs_list",
        "domain": "import_export",
        "description_en": "List data import jobs (orders/products/customers) with their progress and status.",
        "usage_hint_ar": "استخدمها لعرض عمليات الاستيراد الجارية أو السابقة وحالتها",
        "endpoint": "/api/v1/import-jobs/list",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "products.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "import_job_status",
        "domain": "import_export",
        "description_en": "Get one import job's progress (processed/total rows, errors). Use after starting an import.",
        "usage_hint_ar": "استخدمها لمتابعة تقدم عملية استيراد معينة",
        "endpoint": "/api/v1/import-jobs/status/:jobId",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "jobId": {"type": "string", "description": "Import job ID"},
        }, "required": ["jobId"]},
        "path_params": ["jobId"],
        "permission_key": "products.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "import_job_pause_resume",
        "domain": "import_export",
        "description_en": (
            "Pause or resume a running import job. REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لإيقاف أو استكمال عملية استيراد — بعد موافقة التاجر",
        "endpoint": "/api/v1/import-jobs/:action/:jobId",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "action": {"type": "string", "description": "pause or resume"},
            "jobId": {"type": "string", "description": "Import job ID"},
        }, "required": ["action", "jobId"]},
        "path_params": ["action", "jobId"],
        "permission_key": "products.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Order workflow / custom statuses ───────────────────────────────
    {
        "name": "order_statuses_list",
        "domain": "order_workflow",
        "description_en": (
            "List the store's custom order statuses (with colors and ordering). Use when the "
            "merchant asks about their status pipeline or before status operations."
        ),
        "usage_hint_ar": "استخدمها لعرض حالات الطلبات المخصصة وترتيبها",
        "endpoint": "/api/v1/order-status",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "order_workflow_config_read",
        "domain": "order_workflow",
        "description_en": "Read the order workflow configuration (enabled transitions, enforcement mode).",
        "usage_hint_ar": "استخدمها لقراءة إعدادات مسار الطلبات والانتقالات المسموحة",
        "endpoint": "/api/v1/order-workflow/config",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "order_workflow_approvals_pending",
        "domain": "order_workflow",
        "description_en": (
            "List orders waiting in the workflow approvals queue (e.g. discount approvals). "
            "Use when the merchant asks what needs their decision."
        ),
        "usage_hint_ar": "استخدمها لعرض الطلبات المستنية قرار في طابور الموافقات",
        "endpoint": "/api/v1/order-workflow/approvals/pending",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "orders.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "order_status_create",
        "domain": "order_workflow",
        "description_en": (
            "Create a custom order status (name, color, pipeline position). "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لإنشاء حالة طلب مخصصة جديدة — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-status",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {
            "name": {"type": "string", "description": "Status display name"},
            "color": {"type": "string", "description": "Hex color, e.g. #22c55e"},
        }, "required": ["name"]},
        "permission_key": "orders.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "order_status_update_mapping",
        "domain": "order_workflow",
        "description_en": (
            "Update a custom status's mapping to carrier/woocommerce statuses. "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لتحديث ربط حالة مخصصة بحالات شركات الشحن أو ووكومرس — بعد موافقة التاجر",
        "endpoint": "/api/v1/order-status/:id/mapping",
        "http_method": "PUT",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Status ID"},
            "mapping": {"type": "object", "description": "Mapping object per backend contract"},
        }, "required": ["id", "mapping"]},
        "path_params": ["id"],
        "permission_key": "orders.edit",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Affiliates (read + settings) ───────────────────────────────────
    {
        "name": "affiliates_list",
        "domain": "affiliates",
        "description_en": (
            "List affiliate partners with status and performance. Use when the merchant asks "
            "about their affiliate program."
        ),
        "usage_hint_ar": "استخدمها لعرض شركاء الأفلييت وأدائهم",
        "endpoint": "/api/v1/affiliates",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "limit": {"type": "integer", "description": "Max results (default 20)"},
        }},
        "permission_key": "reports.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "affiliate_settings_read",
        "domain": "affiliates",
        "description_en": "Read affiliate program settings (commission percent, program status).",
        "usage_hint_ar": "استخدمها لقراءة إعدادات برنامج الأفلييت ونسبة العمولة",
        "endpoint": "/api/v1/affiliate-settings",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "reports.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "affiliate_settings_update",
        "domain": "affiliates",
        "description_en": (
            "Update affiliate program settings (e.g. commission percent). "
            "REQUIRES MERCHANT APPROVAL."
        ),
        "usage_hint_ar": "استخدمها لتعديل إعدادات برنامج الأفلييت — بعد موافقة التاجر",
        "endpoint": "/api/v1/affiliate-settings",
        "http_method": "PUT",
        "input_schema": {"type": "object", "properties": {
            "commissionPercent": {"type": "number", "description": "Affiliate commission percent"},
        }},
        "permission_key": "settings.manage",
        "app_slug": "order-core",
        "risk_level": "write",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Pixels / tracking ──────────────────────────────────────────────
    {
        "name": "pixel_profiles_list",
        "domain": "pixels",
        "description_en": (
            "List configured Facebook pixel profiles and their connection status. Use when the "
            "merchant asks about tracking setup."
        ),
        "usage_hint_ar": "استخدمها لعرض بكسلات فيسبوك المربوطة وحالتها",
        "endpoint": "/api/v1/storefront-settings/pixels",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "settings.read",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "pixel_diagnostics",
        "domain": "pixels",
        "description_en": (
            "Run pixel diagnostics (connection, token permissions, event delivery). Use to "
            "debug 'events not showing in events manager' complaints."
        ),
        "usage_hint_ar": "استخدمها لتشخيص مشاكل البكسل (الاتصال/الصلاحيات/توصيل الأحداث)",
        "endpoint": "/api/v1/storefront-settings/pixel-diagnostics",
        "http_method": "POST",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "settings.read",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },
    {
        "name": "tiktok_events_configs_list",
        "domain": "pixels",
        "description_en": "List TikTok Events API configurations and their test status.",
        "usage_hint_ar": "استخدمها لعرض إعدادات تتبع تيك توك وحالتها",
        "endpoint": "/api/v1/tiktok/events/configs",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "settings.read",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER"],
        "source": "curated",
    },

    # ── Staff & HR capabilities (read-only for the bridge) ───────────────
    {
        "name": "team_users_list",
        "domain": "staff",
        "description_en": (
            "List team members and staff (name, role, active status, email, phone, last login). "
            "READ-ONLY — use when the merchant asks for an employee/team report or staff overview."
        ),
        "usage_hint_ar": "استخدمها لعرض تقرير أعضاء الفريق والموظفين وأدوارهم وحالة نشاطهم (قراءة فقط)",
        "endpoint": "/api/v1/companies/:companyId/users",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "companyId": {"type": "string", "description": "Company ID (auto-filled with the store ID)"},
            "search": {"type": "string", "description": "Search term for name or email"},
            "role": {"type": "string", "description": "Filter by role (OWNER, COMPANY_ADMIN, MANAGER, AGENT)"},
            "isActive": {"type": "string", "description": "Filter by active state ('true' or 'false')"},
            "limit": {"type": "integer", "description": "Max results to return (default 25)"},
            "page": {"type": "integer", "description": "Page number (default 1)"},
        }},
        "path_params": ["companyId"],
        "permission_key": "users.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "team_users_statistics",
        "domain": "staff",
        "description_en": "Team size, active headcount, and role-distribution statistics. READ-ONLY.",
        "usage_hint_ar": "استخدمها لإحصائيات الفريق والعدد الإجمالي وتوزيع الأدوار (قراءة فقط)",
        "endpoint": "/api/v1/companies/:companyId/users/statistics",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "companyId": {"type": "string", "description": "Company ID (auto-filled with the store ID)"},
        }},
        "path_params": ["companyId"],
        "permission_key": "users.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "team_user_get",
        "domain": "staff",
        "description_en": "Detailed profile and settings of a specific company team member by ID. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض بيانات مستخدم أو عضو فريق محدد بالتفصيل (قراءة فقط)",
        "endpoint": "/api/v1/companies/:companyId/users/:userId",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "companyId": {"type": "string", "description": "Company ID (auto-filled with the store ID)"},
            "userId": {"type": "string", "description": "Target user ID"},
        }, "required": ["userId"]},
        "path_params": ["companyId", "userId"],
        "permission_key": "users.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_employees_list",
        "domain": "staff",
        "description_en": (
            "List HR employees with employeeNumber, department, position, hireDate, status, and contract. "
            "Use when detailed HR roster information is requested."
        ),
        "usage_hint_ar": "استخدمها لعرض قائمة موظفي الموارد البشرية وتفاصيل أقسامهم ومناصبهم وعقودهم (قراءة فقط)",
        "endpoint": "/api/v1/hr/employees",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "search": {"type": "string", "description": "Search by employee name or code"},
            "departmentId": {"type": "string", "description": "Filter by department ID"},
            "status": {"type": "string", "description": "ACTIVE, ON_LEAVE, PROBATION, TERMINATED"},
            "limit": {"type": "integer", "description": "Max results (default 25)"},
            "page": {"type": "integer", "description": "Page number (default 1)"},
        }},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_employees_stats",
        "domain": "staff",
        "description_en": "HR summary statistics: total employee count, active, on probation, on leave, and department distribution.",
        "usage_hint_ar": "استخدمها لعرض إحصائيات الموظفين الإجمالية ومعدلات الحضور والإجازات (قراءة فقط)",
        "endpoint": "/api/v1/hr/employees/stats",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_employee_get",
        "domain": "staff",
        "description_en": "Get detailed profile and job records of a specific HR employee by ID. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض ملف موظف محدد ببياناته الوظيفية وعقده (قراءة فقط)",
        "endpoint": "/api/v1/hr/employees/:id",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "string", "description": "Employee ID"},
        }, "required": ["id"]},
        "path_params": ["id"],
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_online_team",
        "domain": "staff",
        "description_en": "List employees currently online and active in the system right now. READ-ONLY.",
        "usage_hint_ar": "استخدمها لمعرفة أعضاء الفريق المتصلين أونلاين في الوقت الحالي (قراءة فقط)",
        "endpoint": "/api/v1/hr/online-team",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_departments_list",
        "domain": "staff",
        "description_en": "List company departments, their manager, and headcount. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض أقسام الشركة وإداراتها ومدرائها (قراءة فقط)",
        "endpoint": "/api/v1/hr/departments",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_departments_stats",
        "domain": "staff",
        "description_en": "Department headcount statistics and budget allocations. READ-ONLY.",
        "usage_hint_ar": "استخدمها لإحصائيات وتوزيع الموظفين على الأقسام المختلفة (قراءة فقط)",
        "endpoint": "/api/v1/hr/departments/stats",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_attendance_list",
        "domain": "staff",
        "description_en": "List attendance records, check-in/out times, and work hours. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض سجلات الحضور والانصراف والتأخير وساعات العمل (قراءة فقط)",
        "endpoint": "/api/v1/hr/attendance",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "date": {"type": "string", "description": "Specific date YYYY-MM-DD"},
            "startDate": {"type": "string", "description": "Range start date YYYY-MM-DD"},
            "endDate": {"type": "string", "description": "Range end date YYYY-MM-DD"},
            "employeeId": {"type": "string", "description": "Filter by employee ID"},
        }},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_shifts_list",
        "domain": "staff",
        "description_en": "List work shifts, schedules, working hours, and grace periods. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض مواعيد الشيفتات وساعات العمل المعتمدة (قراءة فقط)",
        "endpoint": "/api/v1/hr/shifts",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {}},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "hr_leaves_list",
        "domain": "staff",
        "description_en": "List employee leave requests, approved vacations, and pending balances. READ-ONLY.",
        "usage_hint_ar": "استخدمها لعرض الإجازات وطلبات العطلات السنوية والمرضية (قراءة فقط)",
        "endpoint": "/api/v1/hr/leaves",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "status": {"type": "string", "description": "PENDING, APPROVED, REJECTED"},
            "employeeId": {"type": "string", "description": "Filter by employee ID"},
            "startDate": {"type": "string", "description": "Filter from start date"},
        }},
        "permission_key": "users.view",
        "app_slug": "hr-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "team_monitor_overview",
        "domain": "staff",
        "description_en": (
            "Live team monitoring telemetry: who is working right now, active work seconds, "
            "idle/sleep time, break durations, and productivity scores. READ-ONLY."
        ),
        "usage_hint_ar": "استخدمها للرصد الحي لنشاط وإنتاجية الفريق وساعات العمل والتوقف والبريك (قراءة فقط)",
        "endpoint": "/api/v1/employee-monitor/team/overview",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "date": {"type": "string", "description": "Target date YYYY-MM-DD (defaults to today)"},
        }},
        "permission_key": "users.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "employee_monitor_summary",
        "domain": "staff",
        "description_en": (
            "Daily productivity summary for an employee: active seconds, idle/sleep time, "
            "break breakdown, top applications, and productivity score. READ-ONLY."
        ),
        "usage_hint_ar": "استخدمها لملخص إنتاجية موظف محدد وتفاصيل استخدام التطبيقات وفترات البريك (قراءة فقط)",
        "endpoint": "/api/v1/employee-monitor/summary/:employeeId",
        "http_method": "GET",
        "input_schema": {"type": "object", "properties": {
            "employeeId": {"type": "string", "description": "Target employee ID"},
            "date": {"type": "string", "description": "Target date YYYY-MM-DD (defaults to today)"},
        }, "required": ["employeeId"]},
        "path_params": ["employeeId"],
        "permission_key": "users.view",
        "app_slug": "order-core",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["STORE_MANAGER", "EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    # ── Treasury & Expenses ────────────────────────────────────────────
    {
        "name": "bridge_get_treasury_expenses",
        "domain": "treasury",
        "description_en": (
            "List and search company treasury expenses and outflows with date range filtering (startDate, endDate in YYYY-MM-DD), "
            "categoryId, type (OPEX/CAPEX), status (PAID/PENDING), and keyword search. "
            "Returns expenses list with details, totalCount, and totalAmount. READ-ONLY."
        ),
        "usage_hint_ar": "استعلام وبحث في سجل نفقات ومصروفات الشركة وتفاصيلها وفلترتها بالفترة والتصنيف والحالة (قراءة فقط)",
        "endpoint": "/api/v1/treasury/expenses",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {
                "startDate": {"type": "string", "description": "Filter expenses on or after date (YYYY-MM-DD, e.g. '2026-09-01')"},
                "endDate": {"type": "string", "description": "Filter expenses on or before date (YYYY-MM-DD, e.g. '2026-09-30')"},
                "categoryId": {"type": "string", "description": "Filter by expense category ID"},
                "type": {"type": "string", "description": "Filter by expense type: OPEX or CAPEX"},
                "status": {"type": "string", "description": "Filter by status: PAID or PENDING"},
                "search": {"type": "string", "description": "Search keyword matching title, expenseNumber, beneficiary, or invoiceNumber"},
                "page": {"type": "integer", "description": "Page number (default 1)"},
                "limit": {"type": "integer", "description": "Max results per page (default 30, max 100)"},
            },
        },
        "permission_key": "treasury.view",
        "app_slug": "treasury-expenses",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "bridge_get_treasury_expenses_stats",
        "domain": "treasury",
        "description_en": (
            "Get aggregate statistics for company expenses: current month total expenses, last month expenses, "
            "month-over-month delta percentage, OPEX vs CAPEX breakdown, and breakdown by expense category. READ-ONLY."
        ),
        "usage_hint_ar": "استعراض إحصائيات ومؤشرات النفقات الشهرية وتوزيعها حسب التصنيفات ومقارنتها بالشهر السابق (قراءة فقط)",
        "endpoint": "/api/v1/treasury/expenses/stats",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
        "permission_key": "treasury.view",
        "app_slug": "treasury-expenses",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["EXECUTIVE_ASSISTANT"],
        "source": "curated",
    },
    {
        "name": "bridge_get_treasury_categories",
        "domain": "treasury",
        "description_en": (
            "List all treasury expense categories (e.g. Marketing & Ads, Salaries, Utilities, Rent) with their IDs, names, types (OPEX/CAPEX), colors, and icons. READ-ONLY."
        ),
        "usage_hint_ar": "استعراض قائمة تصنيفات النفقات المعتمدة في الخزينة لمعرفة معرفات التصنيفات (قراءة فقط)",
        "endpoint": "/api/v1/treasury/categories",
        "http_method": "GET",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "description": "Filter by category type: OPEX or CAPEX"}
            },
        },
        "permission_key": "treasury.view",
        "app_slug": "treasury-expenses",
        "risk_level": "read",
        "exposure_state": "active",
        "roles": ["EXECUTIVE_ASSISTANT"],
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
            # refresh curated fields but keep operator-controlled state
            changed = False
            for field in ("description_en", "endpoint", "http_method", "input_schema",
                          "path_params", "permission_key", "app_slug", "risk_level"):
                new_value = cap.get(field)
                if new_value is not None and getattr(existing, field) != new_value:
                    setattr(existing, field, new_value)
                    changed = True

            # Merge newly curated roles into existing roles
            curated_roles = cap.get("roles") or []
            existing_roles = list(existing.roles or [])
            for r in curated_roles:
                if r not in existing_roles:
                    existing_roles.append(r)
                    changed = True
            if changed:
                existing.roles = existing_roles
                stats["updated"] += 1
            else:
                stats["skipped"] += 1
        else:  # tracked/hidden — operator decided; leave alone
            stats["skipped"] += 1

    await session.commit()
    logger.info("curated_capabilities_seeded", **stats)
    return stats
