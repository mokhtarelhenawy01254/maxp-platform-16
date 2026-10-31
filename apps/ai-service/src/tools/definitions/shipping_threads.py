from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _executed_result


class ShippingThreadListInput(BaseModel):
    status: str | None = Field(
        default=None,
        description="Filter threads by status (e.g. 'OPEN', 'PENDING_MERCHANT', 'RESOLVED', 'CLOSED')",
    )
    unread_only: bool = Field(
        default=False,
        description="Filter only threads with unread messages",
    )
    limit: int = Field(
        default=25,
        description="Maximum number of threads to return (default 25)",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)",
    )


class ShippingThreadGetInput(BaseModel):
    thread_id: str = Field(
        description="ID of the carrier ticket thread to fetch details and messages for",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)",
    )


class ShippingThreadReplyInput(BaseModel):
    thread_id: str = Field(
        description="ID of the carrier ticket thread to send a reply to",
    )
    message: str = Field(
        description="Reply text to send to the shipping company / carrier courier",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)",
    )


class ShippingCustomerAnswerInput(BaseModel):
    order_or_tracking_code: str = Field(
        description="Order number, tracking number, or waybill code to look up for the customer",
    )
    customer_question: str | None = Field(
        default=None,
        description="Optional customer query context",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)",
    )


async def shipping_thread_list(input_data: ShippingThreadListInput) -> dict[str, Any]:
    """List carrier ticket conversation threads for the merchant company."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_threads(
            company_id=company_id,
            status=input_data.status,
            unread_only=input_data.unread_only,
            limit=input_data.limit,
        )
        threads = result.get("threads") or []
        return {
            "success": True,
            "count": len(threads),
            "threads": threads,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "threads": []}


async def shipping_thread_get(input_data: ShippingThreadGetInput) -> dict[str, Any]:
    """Get full details and message history for a specific carrier ticket thread."""
    company_id = input_data.company_id or ""
    thread_id = input_data.thread_id
    if not company_id or not thread_id:
        return {"success": False, "error": "Missing company_id or thread_id"}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_thread(company_id=company_id, thread_id=thread_id)
        if not result.get("success", False):
            return {"success": False, "error": result.get("error", "Thread not found")}
        return result
    except Exception as exc:
        return {"success": False, "error": str(exc)}


async def shipping_thread_reply(input_data: ShippingThreadReplyInput) -> dict[str, Any]:
    """Send a reply to an open carrier ticket thread.

    Requires merchant approval before execution as this communicates externally
    with shipping companies.
    """
    company_id = input_data.company_id or ""
    thread_id = input_data.thread_id
    message = (input_data.message or "").strip()
    if not company_id or not thread_id or not message:
        return _executed_result("SHIPPING_THREAD_REPLY", {
            "success": False,
            "error": "Missing company_id, thread_id, or message",
        })

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.reply_shipping_thread(
            company_id=company_id,
            thread_id=thread_id,
            message=message,
        )
        return _executed_result("SHIPPING_THREAD_REPLY", {
            "success": True,
            "threadId": thread_id,
            "message": result.get("message") or "تم إرسال الرد إلى شركة الشحن بنجاح",
            "replyResult": result,
        })
    except Exception as exc:
        return _executed_result("SHIPPING_THREAD_REPLY", {"success": False, "error": str(exc)})


async def shipping_customer_answer(input_data: ShippingCustomerAnswerInput) -> dict[str, Any]:
    """Formulate an exact, hallucination-free answer to customer inquiries about shipment status."""
    company_id = input_data.company_id or ""
    code = (input_data.order_or_tracking_code or "").strip()
    if not company_id or not code:
        return {
            "success": False,
            "error": "Missing company_id or order_or_tracking_code",
            "answer": "يرجى تزويدي برقم الأوردر أو رقم التتبع للتحقق من حالة الشحنة.",
        }

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()

    try:
        track_res = await client.track_shipment_by_code(company_id, code)
        data = track_res.get("data") or track_res.get("shipment") or track_res
        status = str(data.get("status") or data.get("current_status") or "").strip()
        carrier = str(data.get("shippingCompany") or data.get("carrier") or "شركة الشحن").strip()
        captain_name = data.get("captainName") or data.get("courierName") or None
        captain_phone = data.get("captainPhone") or data.get("courierPhone") or None
        last_update = data.get("lastUpdate") or data.get("updatedAt") or "محدث قريباً"

        if not status or track_res.get("success") is False:
            return {
                "success": True,
                "found": False,
                "answer": f"عذراً، لم يتم العثور على أي شحنة مسجلة برقم '{code}' في النظام حالياً. يرجى مراجعة الرقم والتأكد منه.",
            }

        # Status translation map
        status_translations = {
            "NEW": "جديدة وفي انتظار الاستلام",
            "PICKED_UP": "تم استلامها من المتجر وجاري النقل",
            "IN_TRANSIT": "في طريقها للفرع الرئيسي",
            "OUT_FOR_DELIVERY": "خرجت مع المندوب للتسليم اليوم",
            "DELIVERED": "تم التسليم للعميل بنجاح",
            "CANCELLED": "تم إلغاء الشحنة",
            "RETURNED": "مرتجع للمتجر",
            "POSTPONED": "تم تأجيل موعد التسليم بناءً على طلب العميل",
            "FAILED_ATTEMPT": "محاولة تسليم غير ناجحة (تعذر الوصول للعميل)",
        }
        status_ar = status_translations.get(status.upper(), status)

        courier_part = f" مع المندوب {captain_name}" if captain_name else ""
        if captain_phone:
            courier_part += f" (هاتف: {captain_phone})"

        answer = f"شحنتك رقم {code} تابعة لـ {carrier}. حالتها الحالية هي: {status_ar}{courier_part}. (آخر تحديث: {last_update})."

        return {
            "success": True,
            "found": True,
            "orderNumber": code,
            "carrier": carrier,
            "status": status,
            "statusArabic": status_ar,
            "courier": courier_part.strip(),
            "answer": answer,
        }
    except Exception as exc:
        return {
            "success": True,
            "found": False,
            "error": str(exc),
            "answer": f"لم يتم العثور على بيانات شحنة مطابقة للرقم {code}. يرجى التحقق من الرقم.",
        }


def _format_thread_list(result: dict[str, Any]) -> str:
    if not result.get("success", False):
        return f"فشل جلب محادثات شركات الشحن: {result.get('error')}"
    threads = result.get("threads", [])
    if not threads:
        return "لا توجد محادثات مفتوحة مع شركات الشحن حالياً."
    lines = [f"تم العثور على {len(threads)} محادثة/تذكرة:"]
    for t in threads:
        lines.append(f"• تذكرة #{t.get('code') or t.get('externalId')} ({t.get('providerKey')}) — حالة: {t.get('status')} | غير مقروء: {t.get('unreadCount', 0)}")
    return "\n".join(lines)


def _format_customer_answer(result: dict[str, Any]) -> str:
    return result.get("answer", "لا تتوفر إجابة حالياً.")


shipping_thread_list_tool = FunctionTool(
    name="shipping_thread_list",
    description="List carrier ticket conversation threads and inquiries between the store and shipping companies.",
    func=shipping_thread_list,
    input_model=ShippingThreadListInput,
    format_result=_format_thread_list,
)

shipping_thread_get_tool = FunctionTool(
    name="shipping_thread_get",
    description="Get conversation details and full message logs for a carrier ticket thread.",
    func=shipping_thread_get,
    input_model=ShippingThreadGetInput,
)

shipping_thread_reply_tool = FunctionTool(
    name="shipping_thread_reply",
    description="Send a message reply to an open shipping ticket/thread with the carrier. Requires merchant approval.",
    func=shipping_thread_reply,
    input_model=ShippingThreadReplyInput,
)

shipping_customer_answer_tool = FunctionTool(
    name="shipping_customer_answer",
    description="Generate a factual, verified answer for customer questions about shipment location, delay reason, or delivery status without hallucinations.",
    func=shipping_customer_answer,
    input_model=ShippingCustomerAnswerInput,
    format_result=_format_customer_answer,
)

__all_tools__ = [
    shipping_thread_list_tool,
    shipping_thread_get_tool,
    shipping_thread_reply_tool,
    shipping_customer_answer_tool,
]
