from __future__ import annotations

from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.config import get_settings
from src.tools.registry import get_all_tools


def create_order_agent() -> RawClaudeAgent:
    """Create the Order specialized agent."""
    settings = get_settings()

    instructions = """أنت وكيل متخصص في إدارة الطلبات في MaxP.
مهمتك هي مساعدة العملاء في تتبع طلباتهم، تعديل بيانات الطلب، أو إلغاء الطلبات.

القواعد:
1. استخدم أدوات البحث عن الطلبات للتأكد من صحة البيانات.
2. أي عملية تعديل أو إلغاء يجب أن تمر عبر نظام الموافقات (ستقوم الأداة بإرجاع حالة 'awaiting_approval').
3. رد بلغة عربية ودودة ومهنية.
"""

    return RawClaudeAgent(
        name="maxp_order_agent",
        instructions=instructions,
        tools=get_all_tools(),
        default_options={"model": settings.default_model},
    )
