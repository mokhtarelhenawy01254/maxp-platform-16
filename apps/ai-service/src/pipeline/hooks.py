from __future__ import annotations

import os
from typing import Any, Protocol

import structlog

from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


class AgentHook(Protocol):
    """Hook into pipeline stages.

    Each agent can register hooks for custom behaviour (enforcement,
    formatting, validation) without modifying the pipeline itself.
    """

    async def before_llm(
        self,
        ctx: PipelineContext,
        system_prompt: str,
        skills: list[Any],
    ) -> str:
        """Called before the primary LLM call."""
        return system_prompt

    async def after_tools(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> list[dict[str, Any]] | None:
        """Called after tool execution, before the follow-up LLM call."""
        return None

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        """Called after follow-up but before final reply.

        Can mutate ctx (e.g., append response_attachments).
        """


class AttachmentHook:
    """Auto-populate response_attachments from tool results."""

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        _maxp_api_url = os.getenv("MAXP_API_URL", "").rstrip("/")
        for evidence in ctx.tool_evidence:
            result = evidence.get("result", {})
            if not isinstance(result, dict):
                continue
            self._populate_landmark_images(ctx, result, evidence, _maxp_api_url)
            self._populate_product_images(ctx, result, evidence)

        if ctx.response_attachments:
            logger.info(
                "response_attachments_auto_populated",
                count=len(ctx.response_attachments),
                urls=[a.get("url", "")[:120] for a in ctx.response_attachments],
            )

    def _populate_landmark_images(
        self,
        ctx: PipelineContext,
        result: dict,
        evidence: dict,
        maxp_api_url: str,
    ) -> None:
        for branch in result.get("branches") or []:
            img = (branch.get("landmarkImage") or "")
            if not img:
                continue
            img_filename = os.path.basename(img)
            if not ctx.final_reply or (img not in ctx.final_reply and img_filename not in ctx.final_reply):
                continue
            if img.startswith("data:") or img.startswith("http"):
                ctx.response_attachments.append({
                    "type": "image",
                    "url": img,
                    "source": "tool_result",
                    "tool": evidence.get("tool", "booking_info"),
                })
            elif img.startswith("/") and maxp_api_url:
                ctx.response_attachments.append({
                    "type": "image",
                    "url": f"{maxp_api_url}{img}",
                    "source": "tool_result",
                    "tool": evidence.get("tool", "booking_info"),
                })

    def _populate_product_images(
        self,
        ctx: PipelineContext,
        result: dict,
        evidence: dict,
    ) -> None:
        for key in ("results", "products"):
            items = result.get(key) or []
            if not isinstance(items, list):
                continue
            for product in items:
                if not isinstance(product, dict):
                    continue
                for img in (product.get("images") or []):
                    if not img or not isinstance(img, str):
                        continue
                    if not ctx.final_reply or (img not in ctx.final_reply and os.path.basename(img) not in ctx.final_reply):
                        continue
                    if img.startswith(("http://", "https://", "data:")):
                        ctx.response_attachments.append({
                            "type": "image",
                            "url": img,
                            "source": "tool_result",
                            "tool": evidence.get("tool", "product_search"),
                        })
