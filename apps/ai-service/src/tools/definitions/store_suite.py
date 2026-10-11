from __future__ import annotations

from typing import Any, Literal

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


# ── 1. Bulk Orders Management Tool ───────────────────────────────────────────
class OrdersBulkStatusUpdateInput(BaseModel):
    order_ids: list[str] = Field(description="List of order numbers or order IDs to update in bulk")
    status: Literal["PENDING", "CONFIRMED", "PREPARATION", "HOLD", "SHIPPED", "DELIVERED", "CANCELLED", "SCHEDULED"] = Field(
        description="Target order status to apply across all specified orders"
    )
    notes: str | None = Field(default=None, description="Optional administrative notes or explanation for the bulk status change")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def orders_bulk_status_update(input_data: OrdersBulkStatusUpdateInput) -> dict[str, Any]:
    """Update status of multiple orders in a single bulk operation."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    try:
        payload: dict[str, Any] = {
            "orderIds": input_data.order_ids,
            "status": input_data.status,
            "notes": input_data.notes or f"Bulk status update to {input_data.status} by Saleem",
        }
        if company_id:
            payload["companyId"] = company_id
        res = await client._request("POST", "/api/v1/orders/bulk/status", json_body=payload)
        return {
            "success": True,
            "targetStatus": input_data.status,
            "ordersCount": len(input_data.order_ids),
            "response": res,
            "message": f"تم تحديث حالة {len(input_data.order_ids)} طلب إلى {input_data.status} بنجاح",
        }
    except Exception as exc:
        logger.error("orders_bulk_status_update_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر تحديث الطلبات المجمعة: {exc}",
        }


# ── 2. Order Preparation & Hold Tool ─────────────────────────────────────────
class OrderSetPreparationHoldInput(BaseModel):
    order_id: str = Field(description="Order number or order ID to place in warehouse preparation or administrative hold")
    action: Literal["PREPARATION", "HOLD", "RELEASE_HOLD"] = Field(
        description="Action to perform: PREPARATION (تجهيز الطرود), HOLD (تعليق الطلب), RELEASE_HOLD (إلغاء التعليق وإعادته لمؤكد)"
    )
    reason: str | None = Field(default=None, description="Reason for placing on hold or special preparation instructions")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def order_set_preparation_hold(input_data: OrderSetPreparationHoldInput) -> dict[str, Any]:
    """Place an order in warehouse preparation status, administrative hold, or release from hold."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    target_status = "CONFIRMED" if input_data.action == "RELEASE_HOLD" else input_data.action
    note_text = input_data.reason or f"Action {input_data.action} via Saleem Executive Assistant"
    try:
        payload: dict[str, Any] = {
            "orderIds": [input_data.order_id],
            "status": target_status,
            "notes": note_text,
        }
        if company_id:
            payload["companyId"] = company_id
        res = await client._request("POST", "/api/v1/orders/bulk/status", json_body=payload)
        action_labels = {
            "PREPARATION": "قيد التجهيز في المستودع",
            "HOLD": "معلق إدارياً (On Hold)",
            "RELEASE_HOLD": "تم إلغاء التعليق وتأكيد الطلب",
        }
        return {
            "success": True,
            "orderId": input_data.order_id,
            "action": input_data.action,
            "status": target_status,
            "response": res,
            "message": f"الطلب {input_data.order_id}: {action_labels.get(input_data.action, target_status)}",
        }
    except Exception as exc:
        logger.error("order_set_preparation_hold_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر تغيير حالة تجهيز/تعليق الطلب: {exc}",
        }


# ── 3. Bot Automation Management Tool ────────────────────────────────────────
class BotAutomationManageInput(BaseModel):
    action: Literal["READ", "UPDATE"] = Field(default="READ", description="Action: READ settings or UPDATE settings")
    welcome_enabled: bool | None = Field(default=None, description="Enable or disable automated welcome message")
    welcome_message: str | None = Field(default=None, description="Automated welcome message text")
    default_reply_enabled: bool | None = Field(default=None, description="Enable or disable automated fallback reply")
    default_reply: str | None = Field(default=None, description="Automated fallback reply text")
    channels: list[str] | None = Field(default=None, description="Active channels, e.g. ['WHATSAPP', 'FACEBOOK']")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def bot_automation_manage(input_data: BotAutomationManageInput) -> dict[str, Any]:
    """Inspect or update bot chat automation, auto-reply, and welcome message settings."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    params = {"companyId": company_id} if company_id else None
    try:
        if input_data.action == "READ":
            res = await client._request("GET", "/api/v1/bot-automation/settings", params=params)
            return {"success": True, "action": "READ", "settings": res.get("data", res)}

        update_payload: dict[str, Any] = {}
        if input_data.welcome_enabled is not None:
            update_payload["welcomeEnabled"] = input_data.welcome_enabled
        if input_data.welcome_message is not None:
            update_payload["welcomeMessage"] = input_data.welcome_message
        if input_data.default_reply_enabled is not None:
            update_payload["defaultReplyEnabled"] = input_data.default_reply_enabled
        if input_data.default_reply is not None:
            update_payload["defaultReply"] = input_data.default_reply
        if input_data.channels is not None:
            update_payload["channels"] = input_data.channels
        if company_id:
            update_payload["companyId"] = company_id

        res = await client._request("PUT", "/api/v1/bot-automation/settings", json_body=update_payload)
        return {
            "success": True,
            "action": "UPDATE",
            "updatedSettings": update_payload,
            "response": res,
            "message": "تم تحديث إعدادات أتمتة المحادثات والردود التلقائية بنجاح",
        }
    except Exception as exc:
        logger.error("bot_automation_manage_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر استدعاء أو تحديث أتمتة المحادثات: {exc}",
        }


# ── 4. Returns Settings & Reasons Tool ────────────────────────────────────────
class ReturnsSettingsManageInput(BaseModel):
    action: Literal["GET_SETTINGS", "GET_REASONS", "UPDATE_SETTINGS"] = Field(
        default="GET_SETTINGS",
        description="Action: GET_SETTINGS (قوانين وإعدادات الإرجاع), GET_REASONS (قائمة وأسباب المرتجعات), UPDATE_SETTINGS (تحديث القوانين)"
    )
    allow_returns: bool | None = Field(default=None, description="Allow customer returns toggle")
    return_window_days: int | None = Field(default=None, description="Number of days allowed for return window (e.g. 14)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def returns_settings_manage(input_data: ReturnsSettingsManageInput) -> dict[str, Any]:
    """Inspect returns policy settings, return window, root cause reasons, or update policies."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    params = {"companyId": company_id} if company_id else None
    try:
        if input_data.action == "GET_SETTINGS":
            res = await client._request("GET", "/api/v1/returns/settings", params=params)
            return {"success": True, "action": "GET_SETTINGS", "settings": res.get("data", res)}
        elif input_data.action == "GET_REASONS":
            res = await client._request("GET", "/api/v1/returns/reasons", params=params)
            return {"success": True, "action": "GET_REASONS", "reasons": res.get("data", res)}
        else:
            payload: dict[str, Any] = {}
            if input_data.allow_returns is not None:
                payload["allowReturns"] = input_data.allow_returns
            if input_data.return_window_days is not None:
                payload["returnWindowDays"] = input_data.return_window_days
            if company_id:
                payload["companyId"] = company_id
            res = await client._request("PUT", "/api/v1/returns/settings", json_body=payload)
            return {
                "success": True,
                "action": "UPDATE_SETTINGS",
                "response": res,
                "message": "تم تحديث سياسات وإعدادات المرتجعات بنجاح",
            }
    except Exception as exc:
        logger.error("returns_settings_manage_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر استدعاء أو تحديث إعدادات المرتجعات: {exc}",
        }


# ── 5. Unified Inbox Stats & Conversations Tool ──────────────────────────────
class UnifiedInboxManageInput(BaseModel):
    action: Literal["GET_STATS", "LIST_CONVERSATIONS"] = Field(
        default="GET_STATS", description="Action: GET_STATS (إحصائيات الصندوق الموحد) or LIST_CONVERSATIONS (أحدث المحادثات)"
    )
    limit: int = Field(default=10, description="Max conversations to retrieve")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def unified_inbox_manage(input_data: UnifiedInboxManageInput) -> dict[str, Any]:
    """Retrieve omnichannel unified inbox telemetry, conversation counts across channels, and recent threads."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    params: dict[str, Any] = {"limit": input_data.limit}
    if company_id:
        params["companyId"] = company_id

    try:
        if input_data.action == "GET_STATS":
            res = await client._request("GET", "/api/v1/unified-inbox/stats", params=params)
            return {"success": True, "action": "GET_STATS", "stats": res.get("data", res)}
        else:
            res = await client._request("GET", "/api/v1/unified-inbox/conversations", params=params)
            return {"success": True, "action": "LIST_CONVERSATIONS", "conversations": res.get("data", res)}
    except Exception as exc:
        logger.error("unified_inbox_manage_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر جلب بيانات الصندوق الموحد: {exc}",
        }


# ── 6. Facebook Pages Connected Tool ──────────────────────────────────────────
class FacebookPagesConnectedListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_pages_connected_list(input_data: FacebookPagesConnectedListInput) -> dict[str, Any]:
    """List all connected Facebook pages, active webhook status, page tokens, and page IDs for the merchant."""
    company_id = input_data.company_id or ""
    client = get_backend_client()
    params = {"companyId": company_id} if company_id else None
    try:
        try:
            res = await client._request("GET", "/api/v1/facebook/connected", params=params)
        except Exception:
            res = await client._request("GET", "/api/v1/integrations/facebook/connected", params=params)
        pages = res.get("pages") if isinstance(res.get("pages"), list) else (res.get("data") if isinstance(res.get("data"), list) else res)
        return {
            "success": True,
            "pages": pages,
            "message": "تم جلب الصفحات المتصلة بحساب فيسبوك بنجاح",
        }
    except Exception as exc:
        logger.error("facebook_pages_connected_list_failed", error=str(exc))
        return {
            "success": False,
            "error": str(exc),
            "message": f"تعذر استعراض صفحات فيسبوك المربوطة: {exc}",
        }


# ── FunctionTool Instances ───────────────────────────────────────────────────
orders_bulk_status_update_tool = FunctionTool(
    name="orders_bulk_status_update",
    description="Bulk update statuses across multiple orders at once (CONFIRMED, PREPARATION, HOLD, SHIPPED, DELIVERED, CANCELLED). Powers Bulk Orders operations.",
    func=orders_bulk_status_update,
    input_model=OrdersBulkStatusUpdateInput,
)

order_set_preparation_hold_tool = FunctionTool(
    name="order_set_preparation_hold",
    description="Place an order into warehouse PREPARATION packing status or administrative HOLD status, or release it back to CONFIRMED. Powers Order Preparation & Hold workflows.",
    func=order_set_preparation_hold,
    input_model=OrderSetPreparationHoldInput,
)

bot_automation_manage_tool = FunctionTool(
    name="bot_automation_manage",
    description="Inspect or update automated chat bot welcome messages, default replies, and active channels (WhatsApp, Facebook). Powers Chat Automation workflows.",
    func=bot_automation_manage,
    input_model=BotAutomationManageInput,
)

returns_settings_manage_tool = FunctionTool(
    name="returns_settings_manage",
    description="Inspect return settings, allowed return window, return reasons catalog, or update return policies. Powers Returns Settings and Reasons Analytics.",
    func=returns_settings_manage,
    input_model=ReturnsSettingsManageInput,
)

unified_inbox_manage_tool = FunctionTool(
    name="unified_inbox_manage",
    description="Retrieve omnichannel unified inbox telemetry, conversation counts, platform breakdowns (WhatsApp, Messenger, Instagram), and recent threads. Powers Unified Inbox.",
    func=unified_inbox_manage,
    input_model=UnifiedInboxManageInput,
)

facebook_pages_connected_list_tool = FunctionTool(
    name="facebook_pages_connected_list",
    description="List connected Facebook pages, statuses, page IDs, and connection diagnostics. Powers Facebook Pages Connect workflows.",
    func=facebook_pages_connected_list,
    input_model=FacebookPagesConnectedListInput,
)

__all_tools__ = [
    orders_bulk_status_update_tool,
    order_set_preparation_hold_tool,
    bot_automation_manage_tool,
    returns_settings_manage_tool,
    unified_inbox_manage_tool,
    facebook_pages_connected_list_tool,
]
