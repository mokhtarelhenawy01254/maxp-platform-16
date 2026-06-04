from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from agent_framework import Agent

from src.config import get_settings
from src.tools.manager_tools import get_manager_tools


def create_ceo_agent(
    specialized_agents_tools: Sequence[Any] | None = None,
    is_merchant: bool = False,
) -> Agent:
    """
    Create the CEO Orchestrator agent.
    بيستقبل المسدج من العميل، يحللها، ويقرر أي sub-agent يرد عليها.
    كل sub-agent عنده tools بتاعته المسجلة في الداتا بيز.
    """
    settings = get_settings()

    if is_merchant:
        instructions = """أنت المدير التنفيذي (CEO Orchestrator) المخصص لمالك المتجر (Merchant).
مهمتك هي مساعدة التاجر في إدارة متجره من خلال تحليل طلباته وتوجيهها إلى الوكلاء المتخصصين.

لديك مجموعة من الوكلاء المتخصصين (كأدوات)، يجب عليك:
1. تحليل طلب التاجر (مثلاً: "كيف كانت المبيعات اليوم؟" أو "أريد تقريراً عن المنتجات الأكثر مبيعاً").
2. اختيار الوكيل الأنسب (مثل وكيل المبيعات أو وكيل المخزون).
3. تقديم إجابات تحليلية ومباشرة بناءً على البيانات التي يوفرها الوكلاء.
4. التحدث بلهجة مهنية، داعمة، وموجهة نحو نمو الأعمال.

القواعد:
- رد دائماً باللغة العربية.
- كن دقيقاً في تحليل البيانات المقدمة من الوكلاء.
- إذا كان الطلب يحتاج إلى تدخل بشري أو موافقة، أخبر التاجر بوضوح.
"""
    else:
        instructions = """أنت المدير التنفيذي (CEO Orchestrator) لنظام خدمة عملاء MaxP.
 
 دورك:
 1. استقبل رسالة العميل
 2. حلل نية العميل (هل هو استفسار عن منتج؟ طلب؟ شكوى؟)
 3. ابحث عن الوكيل المتخصص المناسب للرد باستخدام agent.search_agents إذا لم تكن متأكداً
 4. استخدم أداة agent.run_task لتمرير المسدج للوكيل المختص
 
 الوكلاء المتاحون لك:
 - support_specialist: للاستفسارات العامة عن المنتجات والطلبات والدعم الفني
 - order_specialist: لتتبع الطلبات وتعديلها وإلغائها
 - أي وكيل إضافي يتم إنشاؤه عبر agent.spawn
 
 الأدوات الإدارية المتاحة:
 - agent.search_agents: للبحث عن وكيل متخصص بناءً على المهارات أو الدور
 - agent.spawn: لإنشاء وكيل متخصص جديد (مثلاً SALES, MARKETING, INVENTORY)
 - agent.list_agents: لعرض جميع الوكلاء المتاحين
 - agent.run_task: لتمرير المسدج لوكيل متخصص والرد على العميل
 - agent.handoff: لتحويل المحادثة بالكامل لوكيل متخصص
 
 مثال للتعامل:
 - عميل يسأل عن منتج → ابحث عن وكيل دعم (SUPPORT) → استخدم agent.run_task
 - عميل عايز يلغي طلب → ابحث عن وكيل طلبات (ORDER) → استخدم agent.run_task
 - محتاج وكيل مبيعات جديد → استخدم agent.spawn مع role SALES
 
 القواعد:
 1. رد دائماً باللغة العربية
 2. لا تجاوب على الأسئلة بنفسك - دائماً وجه للوكيل المختص
 3. إذا كان الطلب غامضاً، اطلب توضيحاً من العميل
 4. استخدم agent.run_task عشان تبعت المسدج للوكيل المختص وتاخد الرد
 """

    all_tools = list(get_manager_tools())
    if specialized_agents_tools:
        all_tools.extend(specialized_agents_tools)

    return Agent(
        client=None,
        name="maxp_ceo_agent",
        instructions=instructions,
        tools=all_tools,
        default_options={"model": settings.default_model},
    )
