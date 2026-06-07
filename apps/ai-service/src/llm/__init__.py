"""LLM client package for the MaxP ai-service.

Exposes the Gemma 4 chat template, the GemmaClient (native Gemini API
adapter that injects Gemma 4's <|tool>/<|tool_call>/<|tool_response>
protocol), and the provider-routing factory used by agent_registry and
the per-role agent modules.
"""

from src.llm.agent_client_factory import build_agent_client
from src.llm.gemma_chat_template import (
    is_gemma_model,
    parse_tool_calls,
    render_tools,
)
from src.llm.gemma_client import GemmaClient, GemmaResponse, build_gemma_client

__all__ = [
    "GemmaClient",
    "GemmaResponse",
    "build_agent_client",
    "build_gemma_client",
    "is_gemma_model",
    "parse_tool_calls",
    "render_tools",
]
