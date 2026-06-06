from __future__ import annotations

import re
from typing import Any

import structlog

from src.intent.planner import (
    build_intent_contract,
    to_tool_plan,
)
from src.intent.schema import ToolPlan, is_customer_channel, is_admin_channel

logger = structlog.get_logger(__name__)


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[ً-ٰٟـ]", "", text)
    text = re.sub(r"[أإآ]", "ا", text)
    text = re.sub(r"ى", "ي", text)
    text = re.sub(r"ة", "ه", text)
    text = re.sub(r"[^\w\s.-]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def strip_scenario_prefix(text: str) -> str:
    if not text:
        return ""
    # Remove prefixes like FB: ..., WA: ..., or Codex test prefixes
    text = re.sub(
        r"^\s*(?:FB|WA|LIVE|BATCH)[A-Z0-9_-]{2,100}[:：]\s*", "", text, flags=re.IGNORECASE
    )
    text = re.sub(
        r"^\s*اختبار\s+كودكس\s+(?=[^:：]{0,100}[\d_-])[^:：]{1,100}[:：]\s*", "", text
    )
    text = re.sub(r"^\s*اختبار\s+كودكس\s+بعد\s+النشر\s*[:：]\s*", "", text)
    text = re.sub(r"^\s*اختبار\s+بعد\s+النشر(?:\s+[\w.-]+)?\s*[:：]\s*", "", text)
    text = re.sub(r"^\s*اختبار\s+بعد\s+التحديث\s*[:：]\s*", "", text)
    return text.strip()


def includes_any(text: str, needles: list[str]) -> bool:
    normalized = normalize_text(text)
    return any(normalize_text(needle) in normalized for needle in needles)


def is_ambiguous_create_request(text: str) -> bool:
    normalized = normalize_text(strip_scenario_prefix(text))
    if not normalized:
        return False
    add_hints = ["نضيف", "اضيف", "ضيف", "اضافه", "اعمل", "انشئ", "create", "add"]

    has_add_hint = includes_any(normalized, add_hints) or re.search(r"(?:^|\s)(?:انشاء|اضافه|بناء|تصميم)(?:\s|$)", normalized)
    has_generic_new = re.search(
        r"(?:^|\s)(?:واحد|واحده|واحدة|حاجه|حاجة|شي|شيء)\s+(?:جديد|جديده|جديدة|تاني|تانيه|تانية)(?:\s|$)",
        normalized
    )
    has_domain_hint = re.search(
        r"(?:وكيل|ايجنت|agent|منتج|product|اوردر|order|مهاره|skill|مخزون|inventory|عميل|customer|sales|شحن|hr)",
        normalized,
        re.IGNORECASE
    )

    return has_add_hint and has_generic_new and not has_domain_hint


def resolve_admin_policy_plan(message: str, available_tools: list[str], context: dict[str, Any] | None = None) -> ToolPlan | None:
    text = normalize_text(strip_scenario_prefix(message))
    if not text:
        return None

    last_assistant_text = ""
    if context and "recentMessages" in context:
        for msg in reversed(context["recentMessages"]):
            if msg.get("role") == "assistant":
                last_assistant_text = normalize_text(msg.get("content", ""))
                break

    last_tool_intent = (context or {}).get("lastToolIntent", "")

    # Implementation/Dev Advice
    if (re.search(r"(github|git\s+|main|branch)", text) and re.search(r"(?:ارفع|نشر|push|commit|deploy|التعديلات)", text)) or \
       (re.search(r"(?:برمجي|تصحيح\s+برمجي|التصحيح\s+البرمجي|\bcode\b|implementation|bug|fix)", text)):
        return ToolPlan(
            intent="implementation.advice",
            requiresTool=False,
            primaryTool=None,
            allowedTools=[],
            reason="Internal implementation/deployment/debugging advice should be answered without business tools",
            selectionScore=92.0,
        )

    # HR Attendance
    if (re.search(r"(?:حضور|غياب|محضروش|غايب|غايبين|موظف|موظفين|بصمه|بصمة|attendance|hr)", text) and \
        re.search(r"(?:النهارده|انهارده|اليوم|today|حاليا|دلوقتي|كم|كام|مين|عدد)", text)) or \
       (re.search(r"(?:فين|النتيجه|النتيجة|التقرير|تقرير|فينها|جبت|جبتها|هاتها|اعرضها)", text) and \
        (re.search(r"(?:حضور|غياب|hr|attendance)", last_assistant_text) or last_tool_intent == "hr.attendance.today")):
        return ToolPlan(
            intent="hr.attendance.today",
            requiresTool=True,
            primaryTool="hr_attendance_today",
            allowedTools=["hr_attendance_today"],
            reason="Internal HR attendance request",
        )

    # Audit Read
    if re.search(r"(?:عمليات|قرارات|قرار|لوج|audit|سجل|راجع\s+(?:اخر|آخر)|الأداة|الاداه|نفذها|قام بها)", text):
        return ToolPlan(
            intent="audit.read",
            requiresTool=True,
            primaryTool="audit.read",
            allowedTools=["audit.read"],
            blockedTools=["agent_list_agents", "agent_read_state"],
            reason="Internal audit trail read request",
        )

    # Agent Run Task (Delegation)
    if re.search(r"(?:كلف|كلفه|شغل|جرب|اختبر|اطلب من)\s+(?:وكيل|ايجنت|agent|[\w\s]{2,60})", text) and \
       re.search(r"(?:يعمل|ينفذ|يجهز|يرد|يعالج|يراجع|يبحث|مسوده|مسودة|اوردر|طلب)", text):
        return ToolPlan(
            intent="agents.run_task",
            requiresTool=True,
            primaryTool="agent_run_task",
            allowedTools=["agent_run_task", "agent_list_agents", "agent_read_state"],
            reason="Explicit internal specialist delegation request",
        )

    # New Agent with Skill
    if re.search(r"(?:اعمل|انشئ|انشاء|create|add).{0,40}(?:وكيل|ايجنت|agent).{0,100}(?:مهاره|مهارة|مهارات|skill)", text) or \
       re.search(r"(?:وكيل|ايجنت|agent)\s+(?:جديد|لفيسبوك|للفيسبوك|للمبيعات|للدعم|للرد|بمهاره|بمهارة).{0,100}(?:مهاره|مهارة|مهارات|skill)", text):
        return ToolPlan(
            intent="agents.manage",
            requiresTool=True,
            primaryTool="agent_spawn",
            allowedTools=["agent_spawn", "skill_create", "agent_read_state", "agent_update_profile"],
            reason="Internal new agent request includes a skill to attach",
        )

    # Order Reporting
    if re.search(r"(?:تقرير|report|ملخص|summary)", text) and re.search(r"(?:طلبات|اوردرات|اوردر|orders?)", text):
        return ToolPlan(
            intent="orders",
            requiresTool=True,
            primaryTool="order_summary",
            allowedTools=["order_summary", "order_lookup", "order_recent_list"],
            reason="Internal order reporting request",
        )

    # Order Create Draft
    if re.search(r"(?:اعمل|انشئ|سجل|ضيف|create)", text) and re.search(r"(?:مسوده|مسودة|اوردر|طلب|order)", text):
        return ToolPlan(
            intent="orders.create_draft",
            requiresTool=True,
            primaryTool="order_create_draft",
            allowedTools=["order_create_draft", "product_search", "customer_info"],
            reason="Internal order draft creation request",
        )

    # Order Lookup
    if re.search(r"(?:اوردر|طلب|order)", text) and re.search(r"(?:وصل|فين|حالة|status|lookup|رقم|test-\d+)", text):
        return ToolPlan(
            intent="orders",
            requiresTool=True,
            primaryTool="order_lookup",
            allowedTools=["order_lookup", "order_summary", "order_recent_list"],
            reason="Internal order lookup request",
        )

    # Shipping Rates
    if re.search(r"(?:الشحن|شحن|التوصيل|توصيل|shipping|delivery)", text):
        return ToolPlan(
            intent="shipping.rates",
            requiresTool=True,
            primaryTool="shipping_rates",
            allowedTools=["shipping_rates"],
            reason="Internal shipping-rate read request",
        )

    # Support Handoffs
    if re.search(r"(?:شكوى|شكوي|بايظ|تالف|وحشه|وحشة|complaint|damage)", text):
        return ToolPlan(
            intent="support.complaint",
            requiresTool=True,
            primaryTool="agent_handoff_to",
            allowedTools=["agent_handoff_to", "order_lookup", "customer_info"],
            reason="Internal support complaint handoff request",
        )
    if re.search(r"(?:ارجع|ارتجاع|مرتجع|استرد|فلوسي|فلوس|refund|return)", text):
        return ToolPlan(
            intent="support.refund",
            requiresTool=True,
            primaryTool="agent_handoff_to",
            allowedTools=["agent_handoff_to", "order_lookup", "customer_info"],
            reason="Internal refund/return support handoff request",
        )
    if re.search(r"(?:ابدال|استبدال|ابدل|بدل|exchange)", text):
        return ToolPlan(
            intent="support.exchange",
            requiresTool=True,
            primaryTool="agent_handoff_to",
            allowedTools=["agent_handoff_to", "order_lookup", "customer_info"],
            reason="Internal exchange support handoff request",
        )

    # Confirmation of recent agent proposal
    if (re.search(r"(?:اسم الوكيل المقترح|هل توافق|الدور|وكيل|ايجنت|agent)", last_assistant_text) and \
        re.search(r"(?:تمام|ابدء|ابدأ|انشاء|تنشاء|نفذ|كمل|ابدأ التنفيذ|ابدا التنفيذ)", text)):
        return ToolPlan(
            intent="agents.manage",
            requiresTool=True,
            primaryTool="agent_spawn",
            allowedTools=["agent_spawn", "skill_create", "agent_read_state", "agent_update_profile"],
            reason="Short confirmation continues a recent internal agent proposal",
            missingSlots=[],
        )

    # Agent Read/Manage
    if re.search(r"(?:وكيل|ايجنت|agent)", last_assistant_text) and \
       re.search(r"(?:نضيف|اضيف|ضيف|منتج|كوتشي|صنف|سلعه|سلعة|product)", text):
        return ToolPlan(
            intent="agents.manage",
            requiresTool=True,
            primaryTool="agent_run_task",
            allowedTools=["agent_run_task", "agent_list_agents", "agent_read_state", "agent_spawn", "agent_update_profile", "product_create"],
            reason="Internal follow-up asks newly created product agent to continue",
        )

    if re.search(r"(?:وكيل|ايجنت|agent)", last_assistant_text) and \
       re.search(r"(?:عنده القدره|عنده القدرة|يعمل منتج|capability|قدره|قدرة)", text):
        return ToolPlan(
            intent="agents.read",
            requiresTool=True,
            primaryTool="agent_read_state",
            allowedTools=["agent_read_state", "agent_list_agents"],
            reason="Internal follow-up asks about current specialist capability",
        )

    # Generic Agent Create
    if re.search(r"(?:^|\s)(?:عايز|اعمل|انشئ|وظف|عين|ضيف|create|add)(?:\s+\S+){0,3}\s+(?:وكيل|ايجنت|agent)(?:\s|$)", text) or \
       re.search(r"(?:وكيل|ايجنت|agent)\s+(?:جديد|للمخزون|للمخازن|لفيسبوك|للفيسبوك|للمبيعات|للدعم|للرد)", text):
        return ToolPlan(
            intent="agents.manage",
            requiresTool=True,
            primaryTool="agent_spawn",
            allowedTools=["agent_spawn", "skill_create", "agent_read_state", "agent_update_profile"],
            reason="Internal agent creation or management request",
        )

    # Skill Create
    if re.search(r"(?:مهاره|مهارة|مهارات|skill|skills)", text) and \
       re.search(r"(?:اعمل|انشئ|انشاء|صمم|بناء|create|add|جديد|جديدة|جديده)", text):
        return ToolPlan(
            intent="skills.manage",
            requiresTool=True,
            primaryTool="skill_create",
            allowedTools=["skill_create", "agent_read_state", "agent_update_profile", "agent_list_agents"],
            reason="Internal skill creation request",
        )

    # Product Manage
    if re.search(r"(?:اعمل|انشئ|اضيف|ضيف|نضيف|سجل|ارفع|create|add)", text) and \
       re.search(r"(?:منتج|product|كوتشي|صنف|سلعه|سلعة|بضاعه|بضاعة|تيشيرت)", text):
        return ToolPlan(
            intent="products.manage",
            requiresTool=True,
            primaryTool="product_create",
            allowedTools=["product_create", "product_search", "inventory_check"],
            reason="Internal product creation request",
        )

    # Agent Roster/State
    if (re.search(r"(?:كام|كم|مين|قائمه|قائمة|اختار اسم|اعرض|هات|حالة|حاله)", text) and \
        re.search(r"(?:وكلاء|وكيل|ايجنت|agent)", text)):
        is_capability = re.search(r"(?:عنده القدره|يعمل منتج|capability|قدره|قدرة)", text) or \
                        re.search(r"(?:وكيل|ايجنت|agent)", last_assistant_text)
        return ToolPlan(
            intent="agents.read",
            requiresTool=True,
            primaryTool="agent_read_state" if is_capability else "agent_list_agents",
            allowedTools=["agent_read_state", "agent_list_agents"],
            reason="Internal agent roster/state read request",
        )

    # Inventory Read
    if re.search(r"(?:مخزون|ستوك|stock|inventory|ناقص|منخفضة|منخفضه)", text):
        return ToolPlan(
            intent="inventory",
            requiresTool=True,
            primaryTool="product_low_stock",
            allowedTools=["product_low_stock", "inventory_check", "product_search"],
            reason="Internal inventory read request",
        )

    # Product Catalog
    if re.search(r"(?:منتجات|المنتجات|كتالوج|catalog|products)", text):
        return ToolPlan(
            intent="products",
            requiresTool=True,
            primaryTool="product_search",
            allowedTools=["product_search", "product_low_stock", "product_top_selling", "inventory_check"],
            reason="Internal product catalog read request",
        )

    return None


def resolve_tool_plan(message: str, available_tools: list[str], context: dict[str, Any] | None = None) -> ToolPlan:
    ctx = context or {}
    channel = ctx.get("channel")
    is_cust = is_customer_channel(channel)
    is_ambig = is_ambiguous_create_request(message)

    # Admin/Deterministic Route
    if is_admin_channel(channel):
        admin_plan = resolve_admin_policy_plan(message, available_tools, ctx)
        if admin_plan:
            # Wrap in contract to ensure proper transformation
            contract = build_intent_contract(admin_plan, available_tools, ctx)
            return to_tool_plan(contract, available_tools)
    elif not is_customer_channel(channel):
        # If it's an unknown channel that is not customer, we might want to be careful.
        # For now, let's assume it's not customer and use the fallback.
        # But to be safer, we don't want to default to admin.
        # We'll just let it go to the general chat (fallback) below.
        pass

    # Fallback to general chat
    return ToolPlan(
        intent="general.chat",
        requiresTool=False,
        allowedTools=[],
        blockedTools=[],
        ambiguous=is_ambig,
        reason="Generic request; route to LLM classifier" if is_ambig else "Default chat routing",
    )
