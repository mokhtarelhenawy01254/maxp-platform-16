from __future__ import annotations

from typing import Any

import structlog

from src.guardrails.input import INPUT_GUARDRAILS
from src.intent.planner import build_intent_contract_async, to_tool_plan
from src.intent.schema import is_customer_channel
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


def _tool_name(tool: Any) -> str:
    if isinstance(tool, dict):
        return str(tool.get("name") or tool.get("tool") or "")
    return str(getattr(tool, "name", "") or getattr(tool, "__name__", ""))


def _available_tools(ctx: PipelineContext) -> list[str]:
    if ctx.native_tools:
        return [name for tool in ctx.native_tools if (name := _tool_name(tool))]

    agent = ctx.agent
    # agent_framework.Agent stores tools in default_options['tools'], not as .tools attribute.
    # Try default_options first (for agent_framework.Agent), then fall back to .tools.
    tools: list[Any] = []
    if agent and hasattr(agent, 'default_options') and isinstance(getattr(agent, 'default_options', None), dict):
        opts_tools = agent.default_options.get('tools') or []
        if opts_tools:
            tools = list(opts_tools)
    if not tools:
        tools = list(getattr(agent, "tools", []) or [])
    if not tools and hasattr(agent, "get_tools"):
        tools = [{"name": name} for name in (agent.get_tools() or [])]
    elif not tools and hasattr(agent, "_resolve_tools"):
        try:
            resolved = agent._resolve_tools()
            tools = [{"name": t.name} for t in resolved]
        except Exception:
            pass

    # Append skill tool names for agents that have skills
    if agent and hasattr(agent, "allowed_skills") and agent.allowed_skills:
        from src.skills.integration import get_skill_tool_names
        existing = {_tool_name(t) for t in tools}
        for st_name in get_skill_tool_names():
            if st_name not in existing:
                tools.append({"name": st_name})

    ctx.native_tools = tools
    logger.info('available_tools_debug', agent_type=type(agent).__name__ if agent else None, native_tools_count=len(ctx.native_tools), tools_sample=[_tool_name(t) for t in ctx.native_tools[:10]])
    return [name for tool in tools if (name := _tool_name(tool))]

def get_agent_instructions(agent: Any) -> str:
    if not agent:
        return ""

    # 1. Check instructions attribute/property
    if hasattr(agent, "instructions"):
        try:
            return str(agent.instructions or "")
        except AttributeError:
            pass

    # 2. Check default_options (for agent_framework.Agent)
    if hasattr(agent, "default_options") and isinstance(agent.default_options, dict):
        inst = agent.default_options.get("instructions")
        if inst:
            return str(inst)

    # 3. Check soul field (for CompanyAgent DB model)
    if hasattr(agent, "soul") and agent.soul:
        return str(agent.soul)

    return ""


async def resolve_intent(ctx: PipelineContext) -> PipelineContext:
    # 0. Input Guardrails
    for guardrail in INPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, ctx.message)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "result": {
                    "reason": result.reason,
                    "violations": result.violations,
                },
            }
            return ctx

    # 1. Detect channel from context (set by API layer or orchestration flow)
    ctx.is_customer_channel = is_customer_channel(ctx.channel)
    available_tools = _available_tools(ctx)

    # 2. Resolve relevance plan
    intent_context = {
        "companyId": ctx.company_id,
        "channel": ctx.channel,
        "availableTools": available_tools,
        "preferredModel": getattr(ctx.agent, "model", None),
        "preferredProvider": getattr(getattr(ctx.agent, "config", None), "provider", None),
        "attachments": list(getattr(ctx, "attachments", []) or []),
        "externalMemoryContext": dict(getattr(ctx, "external_memory_context", {}) or {}),
    }
    contract = await build_intent_contract_async(
        message=ctx.message,
        available_tools=available_tools,
        context=intent_context,
        company_id=ctx.company_id,
        client=None,
    )

    # 3. Build tool plan
    ctx.relevance_plan = to_tool_plan(contract, available_tools)

    # 4. Prepare the base system prompt. Full context assembly happens later
    # after RAG and episodic memory stages have populated the context.
    try:
        if ctx.agent:
            ctx.system_prompt = get_agent_instructions(ctx.agent)
    except Exception as exc:
        logger.warning("base_prompt_load_failed", error=str(exc))
        # Fallback: use base instructions
        if ctx.agent and hasattr(ctx.agent, "default_options") and isinstance(ctx.agent.default_options, dict):
            ctx.system_prompt = ctx.agent.default_options.get("instructions")

    # 5. Append available tool descriptions to the system prompt so the agent
    # knows what tools it can use and when. This bridges the gap between the
    # pipeline's intent classification and the model's awareness of tool capabilities.
    if ctx.native_tools and ctx.system_prompt:
        try:
            tool_lines = []
            for tool in ctx.native_tools:
                name = tool.get("name") if isinstance(tool, dict) else getattr(tool, "name", "")
                desc = tool.get("description") if isinstance(tool, dict) else getattr(tool, "description", "")
                if name:
                    tool_lines.append(f"- {name}: {desc}" if desc else f"- {name}")
            if tool_lines:
                ctx.system_prompt += (
                    "\n\n## الأدوات المتاحة (Available Tools)\nيمكنك استخدام الأدوات التالية للرد على العملاء. "
                    "استخدم الأداة المناسبة عندما يطلب العميل الخدمة المرتبطة بها.\n"
                )
                ctx.system_prompt += "\n".join(tool_lines)
        except Exception as exc:
            logger.warning("tool_descriptions_failed", error=str(exc))

    return ctx
