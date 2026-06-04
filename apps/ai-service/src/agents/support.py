from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]
from agent_framework.openai import OpenAIChatCompletionClient

from src.config import get_settings
from src.tools.registry import get_all_tools


def create_support_agent() -> Agent | RawClaudeAgent:
    """Create the support agent with read-only tools."""
    settings = get_settings()

    instructions = """أنت مساعد دعم عملاء لـ MaxP، منصة تجارة إلكترونية متكاملة. \
مهمتك مساعدة العملاء في استفساراتهم عن المنتجات والطلبات.

You are a customer support agent for MaxP, a complete e-commerce platform. \
Your role is to help customers with product and order inquiries.

القواعد:
1. رد دايماً باللغة العربية الفصحى أو العامية المصرية حسب ما يناسب السياق
2. Always be polite and professional
3. استخدم الأدوات المتاحة لجلب معلومات المنتجات والطلبات
4. إذا احتجت توضيح من العميل، اسأل بطريقة لطيفة
5. لا تقم بأي إجراءات كتابية (خصومات، إلغاء طلبات) - هذه تحتاج موافقة المدير
"""

    if settings.default_llm_provider == "anthropic":
        return RawClaudeAgent(
            name="maxp_support_agent",
            instructions=instructions,
            tools=get_all_tools(),
            default_options={"model": settings.default_model},
        )

    if settings.default_llm_provider == "google":
        client = OpenAIChatCompletionClient(
            api_key=settings.google_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            model=settings.google_gemini_model,
        )
        return Agent(
            client=client,
            name="maxp_support_agent",
            instructions=instructions,
            tools=get_all_tools(),
            default_options={"model": settings.google_gemini_model},
        )

    if settings.default_llm_provider == "openai":
        client = OpenAIChatCompletionClient(
            api_key=settings.openai_api_key,
            model=settings.default_model,
        )
        return Agent(
            client=client,
            name="maxp_support_agent",
            instructions=instructions,
            tools=get_all_tools(),
            default_options={"model": settings.default_model},
        )

    raise ValueError(f"Unsupported LLM provider: {settings.default_llm_provider}")
