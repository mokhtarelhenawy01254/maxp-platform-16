from __future__ import annotations

from typing import Any

import structlog
from agent_framework import Agent
from agent_framework.orchestrations import MagenticBuilder

from src.agents.middleware import build_maxp_function_middleware
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
        company_id: str = "",
    ) -> Agent:
        if is_merchant:
            instructions = """You are the CEO Orchestrator for the store owner.
Your task is to help the merchant manage their store by analyzing their requests and routing them to the appropriate specialized agents.
Use the right agent for each task.
Reply in the merchant's language naturally."""
        else:
            instructions = """You are the CEO Orchestrator for MaxP customer service.
Your role:
1. Receive the customer message and analyze their intent
2. Choose the appropriate specialized agent
3. Route the task to the chosen agent and wait for a response
4. Provide the final response to the customer

Available agents will be provided automatically.
Reply in the customer's language naturally and professionally."""

        return Agent(
            client=self._client,
            name="maxp_ceo_orchestrator",
            instructions=instructions,
            tools=[],
            middleware=build_maxp_function_middleware(company_id, "CEO"),
        )

    async def build_orchestration(
        self,
        company_id: str,
        is_merchant: bool = False,
    ) -> MagenticBuilder:
        ceo = self.create_ceo_agent(is_merchant=is_merchant, company_id=company_id)
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
