from __future__ import annotations

from typing import Any

import structlog
from agent_framework import Agent
from agent_framework.orchestrations import MagenticBuilder

from src.config import get_settings
from src.services.agent_registry import get_agent_registry

logger = structlog.get_logger(__name__)


class MagenticOrchestrator:
    """Manager-agent orchestration using Microsoft Agent Framework MagenticBuilder.

    The CEO agent dynamically coordinates specialized agents using
    the Magentic pattern — a manager agent routes tasks to sub-agents.
    Replaces the custom CEO delegation with the standard pattern.
    """

    def __init__(self, llm_client: Any) -> None:
        self._client = llm_client
        self._settings = get_settings()

    def create_ceo_agent(
        self,
        is_merchant: bool = False,
    ) -> Agent:
        if is_merchant:
            instructions = """أنت المدير التنفيذي (CEO Orchestrator) المخصص لمالك المتجر.
مهمتك هي مساعدة التاجر في إدارة متجره من خلال تحليل طلباته وتوجيهها إلى الوكلاء المتخصصين.
رد دائماً باللغة العربية.
استخدم الوكيل المناسب لكل مهمة."""
        else:
            instructions = """أنت المدير التنفيذي (CEO Orchestrator) لنظام خدمة عملاء MaxP.
دورك:
1. استقبل رسالة العميل وحلل نيته
2. اختر الوكيل المتخصص المناسب
3. وجه المهمة للوكيل المختص وانتظر الرد
4. قدم الرد النهائي للعميل

الوكلاء المتاحون سيتم توفيرهم تلقائياً.
رد دائماً باللغة العربية."""

        return Agent(
            client=self._client,
            name="maxp_ceo_orchestrator",
            instructions=instructions,
            tools=[],
        )

    async def build_orchestration(
        self,
        company_id: str,
        is_merchant: bool = False,
    ) -> MagenticBuilder:
        ceo = self.create_ceo_agent(is_merchant=is_merchant)
        builder = MagenticBuilder(manager_agent=ceo)

        registry = get_agent_registry()
        agents = registry.list_agents(company_id)

        for _agent_id, agent, tool_names in agents:
            role = getattr(agent, "role", "UNKNOWN")
            builder.add_agent(
                agent=agent,
                role=role.lower(),
                description=f"Specialist agent for {role} tasks with tools: {', '.join(tool_names)}",
            )

        logger.info("magentic orchestration built", agents=len(agents))
        return builder

    async def run(
        self,
        message: str,
        company_id: str,
        thread_id: str,
        is_merchant: bool = False,
    ) -> Any:
        builder = await self.build_orchestration(company_id, is_merchant=is_merchant)
        orchestrator = builder.build()

        result = await orchestrator.run(
            message=message,
            session_id=thread_id,
        )

        return result
