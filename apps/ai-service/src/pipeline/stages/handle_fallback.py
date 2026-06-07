from __future__ import annotations

import re

from agent_framework import Message

from src.pipeline.context import PipelineContext
from src.pipeline.llm_messages import to_client_messages
from src.pipeline.provider_errors import provider_error_result


def _strip_tool_sections(prompt: str) -> str:
    """Remove tool inventory sections before no-evidence fallback generation."""
    if not prompt:
        return ""
    stripped = re.sub(
        r"\[(?:AVAILABLE_TOOLS|TOOLS)\].*?\[/(?:AVAILABLE_TOOLS|TOOLS)\]",
        "",
        prompt,
        flags=re.IGNORECASE | re.DOTALL,
    )
    stripped = re.sub(
        r"<(?:available_tools|tools)\b[^>]*>.*?</(?:available_tools|tools)>",
        "",
        stripped,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return stripped.strip()


def _provider_error(ctx: PipelineContext, exc: Exception) -> None:
    ctx.early_return = {
        "status": "PROVIDER_ERROR",
        "result": provider_error_result(exc),
    }


def _voice_profile(ctx: PipelineContext) -> str:
    agent_persona = getattr(ctx.agent, "persona", {}) if ctx.agent else {}
    if not isinstance(agent_persona, dict):
        agent_persona = {}
    return "\n".join(
        str(agent_persona.get(key) or "").strip()
        for key in ("soulInstructions", "soul_instructions", "personaInstructions", "persona_instructions")
        if str(agent_persona.get(key) or "").strip()
    )


def _is_classifier_unavailable(ctx: PipelineContext) -> bool:
    plan = getattr(ctx, "relevance_plan", None)
    if getattr(plan, "blockedReason", None) == "CLASSIFIER_UNAVAILABLE":
        return True
    classification = getattr(plan, "classification", None) or {}
    return bool(isinstance(classification, dict) and classification.get("classifierUnavailable"))


async def handle_fallback(ctx: PipelineContext) -> PipelineContext:
    if not ctx.llm_response:
        client = getattr(ctx, "llm_client", None) or (getattr(ctx.agent, "client", None) if ctx.agent else None)
        if client:
            messages = ctx.messages or [
                {"role": "system", "content": ctx.system_prompt or ""},
                {"role": "user", "content": ctx.message},
            ]
            requires_tool = bool(getattr(ctx.relevance_plan, "requiresTool", False))
            classifier_unavailable = _is_classifier_unavailable(ctx)
            if (requires_tool and not ctx.tool_evidence) or classifier_unavailable:
                voice_profile = _voice_profile(ctx)
                evidence_status = (
                    "The structured LLM intent classifier was unavailable for this turn, so tool execution was disabled."
                    if classifier_unavailable
                    else "The model-classified plan requires a tool, but no tool result is available for this turn."
                )
                messages = [
                    {
                        "role": "system",
                        "content": (
                            "You write customer-facing chat replies for the selected MaxP agent. "
                            "Return plain text only. Do not emit JSON, function-call syntax, or tool-call syntax. "
                            "Do not invent product, order, shipping, customer, price, stock, or action-completion facts."
                            f"\n\nAgent voice profile:\n{_strip_tool_sections(voice_profile)}"
                        ).strip(),
                    },
                    {"role": "user", "content": ctx.message},
                ]
                messages.append({
                    "role": "user",
                    "content": (
                        "[Tool Evidence Missing]\n"
                        f"{evidence_status} "
                        "Generate a natural customer-facing reply that does not invent product, order, shipping, "
                        "customer, price, stock, or action-completion facts. Ask for the missing detail or say you "
                        "need to check it through the system.\n"
                        "[/Tool Evidence Missing]"
                    ),
                })
            if ctx.early_return:
                messages.append({
                    "role": "user",
                    "content": (
                        "[Guardrail Result]\n"
                        f"{ctx.early_return.get('result')}\n"
                        "[/Guardrail Result]\n"
                        "Generate an appropriate natural reply without exposing internal policy details."
                    ),
                })
            try:
                response = await client.get_response(
                    to_client_messages(messages),
                    options={"tools_enabled": False, "temperature": 0.2},
                )
                ctx.llm_response = response.text if hasattr(response, "text") else str(response)
            except Exception as exc:
                if not ((requires_tool and not ctx.tool_evidence) or classifier_unavailable):
                    _provider_error(ctx, exc)
                    return ctx
                ctx.llm_response = ""
            if ((requires_tool and not ctx.tool_evidence) or classifier_unavailable) and not ctx.llm_response.strip():
                retry_messages = [
                    Message(
                        role="system",
                        contents=[
                            "You are a customer-chat reply writer. Return one plain text message only. "
                            "No JSON. No function calls. No tool calls. No structured syntax."
                        ],
                    ),
                    Message(
                        role="user",
                        contents=[
                            "Live system data was not available for this turn, so the agent cannot confirm facts. "
                            "Write a short natural reply in the customer's language/dialect that asks to check or "
                            "requests the missing detail without inventing availability, price, stock, order, or shipping facts.\n"
                            f"Customer message: {ctx.message}"
                        ],
                    ),
                ]
                try:
                    retry = await client.get_response(
                        retry_messages,
                        options={"tools_enabled": False, "temperature": 0.2},
                    )
                    ctx.llm_response = retry.text if hasattr(retry, "text") else str(retry)
                except Exception as exc:
                    _provider_error(ctx, exc)
        else:
            ctx.early_return = {
                "status": "LLM_CLIENT_UNAVAILABLE",
                "result": {"reply": ""},
            }

    return ctx
