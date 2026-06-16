from __future__ import annotations

from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool
from pydantic import BaseModel, Field


class UnlockAdvancedToolsInput(BaseModel):
    reason: str = Field(description="Reason why advanced tools are needed for the current task")


async def unlock_advanced_tools(
    input_data: UnlockAdvancedToolsInput,
    ctx: FunctionInvocationContext | None = None,
) -> dict[str, Any]:
    # ADVANCED_TOOLS is resolved at call time to avoid circular imports.
    # The gateway sets this on the context when the tool is invoked.
    from src.tools.registry import ADVANCED_TOOLS
    if ctx is not None:
        ctx.add_tools(ADVANCED_TOOLS)
    return {
        "status": "SUCCESS",
        "message": "Advanced tools have been unlocked. You can now use tools for deep analysis, reporting, and competitor research.",
        "unlocked_tools": [t.name for t in ADVANCED_TOOLS],
    }


unlock_advanced_tools_tool = FunctionTool(
    name="unlock_advanced_tools",
    description="Unlock advanced analysis and reporting tools when the user request requires deep data mining or competitor research.",
    func=unlock_advanced_tools,
    input_model=UnlockAdvancedToolsInput,
)

__all_tools__ = [unlock_advanced_tools_tool]
