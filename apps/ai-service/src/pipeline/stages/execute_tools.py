from __future__ import annotations

from src.pipeline.context import PipelineContext
from src.tools.gateway import ToolGateway


async def execute_tools(ctx: PipelineContext) -> PipelineContext:
    if not ctx.execution_plan:
        return ctx

    gateway = ToolGateway()

    # 1. Handle Deterministic Read
    read_exec = ctx.execution_plan.get("deterministicReadExecution")
    if read_exec:
        result = await gateway.execute(
            company_id=ctx.company_id,
            agent=ctx.agent,
            tool=read_exec["tool"],
            native_name=read_exec["nativeName"],
            params=read_exec["params"],
            source="intent-read-planner",
            relevance_plan=ctx.relevance_plan,
            user_message=ctx.message,
        )
        ctx.tool_context += f"Tool result for {read_exec['tool']}:\n{result.result}\n\n"
        ctx.executed_tools.append({"tool": read_exec["tool"], "success": result.success, "result": result.result})
        ctx.tool_evidence.append({"tool": read_exec["tool"], "success": result.success, "result": result.result})

    # 2. Handle Deterministic Action
    action_exec = ctx.execution_plan.get("deterministicActionExecution")
    if action_exec:
        result = await gateway.execute(
            company_id=ctx.company_id,
            agent=ctx.agent,
            tool=action_exec["tool"],
            native_name=action_exec["nativeName"],
            params=action_exec["params"],
            source="intent-action-planner",
            relevance_plan=ctx.relevance_plan,
            user_message=ctx.message,
        )
        ctx.tool_context += f"Tool result for {action_exec['tool']}:\n{result.result}\n\n"
        ctx.executed_tools.append({"tool": action_exec["tool"], "success": result.success, "result": result.result})
        ctx.tool_evidence.append({"tool": action_exec["tool"], "success": result.success, "result": result.result})

    # 3. Call LLM to generate response using tool results
    if ctx.agent and ctx.agent.client:
        from agent_framework import Message

        messages = [Message(role=m["role"], contents=[m["content"]]) for m in ctx.messages]
        if ctx.tool_context:
            messages.append(Message(
                role="user",
                contents=[f"[Tool Results]\n{ctx.tool_context}\n[/Tool Results]\n\nWrite a concise reply based on the results."]
            ))

        response = await ctx.agent.client.get_response(messages)
        ctx.llm_response = response.text
        ctx.llm_result = response

    return ctx
