from __future__ import annotations

import os
from typing import Any

import httpx
import structlog
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from maxp_mcp_video.auth_context import get_inbound_value, is_merchant_value

logger = structlog.get_logger(__name__)

DEFAULT_BACKEND_URL = os.environ.get("MAXP_BACKEND_URL", "http://127.0.0.1:3007")


class CreateVideoTaskInput(BaseModel):
    prompt: str = Field(description="Detailed visual prompt describing the video, scene, lighting, camera movement")
    aspect_ratio: str = Field(default="9:16", description="Aspect ratio: '9:16' (Reels/TikTok), '16:9' (YouTube), '1:1' (Square)")
    duration_seconds: int = Field(default=5, description="Duration in seconds (5 or 8)")
    reference_image_url: str | None = Field(default=None, description="Optional image URL for image-to-video generation")
    company_id: str | None = Field(default="default", description="Company / tenant ID")


class CheckVideoStatusInput(BaseModel):
    task_id: str = Field(description="Task ID received from create_video_task")
    company_id: str | None = Field(default="default", description="Company / tenant ID")


def _call_target(
    backend_url: str,
    presented: str,
    suffix: str,
    company_id: str,
) -> tuple[str, Any]:
    """Resolve the request target and headers for this call.

    Merchant-presented requests hit the /ext/video bridge — the tenant is
    derived server-side from the verified credential. Everything else keeps
    the legacy internal path byte-for-byte unchanged.
    """
    base = backend_url.rstrip("/")
    if is_merchant_value(presented):
        return (
            f"{base}/api/v1/public/ext/video{suffix}",
            httpx.Headers([("Authorization", f"Bearer {presented}")]),
        )
    return f"{base}/api/v1/ai-video{suffix}", {"x-company-id": company_id}


def register_tools(mcp: FastMCP, backend_url: str = DEFAULT_BACKEND_URL) -> None:
    @mcp.tool(
        name="create_video_task",
        description="Trigger Google Veo video generation job for ads, product showcases, or social media.",
    )
    async def create_video_task(
        prompt: str,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 5,
        reference_image_url: str | None = None,
        company_id: str = "default",
    ) -> dict[str, Any]:
        url, headers = _call_target(backend_url, get_inbound_value(), "/generate", company_id)
        payload = {
            "prompt": prompt,
            "aspectRatio": aspect_ratio,
            "durationSeconds": duration_seconds,
            "referenceImageUrl": reference_image_url,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                return resp.json()
        except Exception as e:
            logger.error("create_video_task_error", error=str(e))
            return {"success": False, "error": str(e)}

    @mcp.tool(
        name="check_video_status",
        description="Check status, progress, and download/stream URL for a Google Veo video task.",
    )
    async def check_video_status(
        task_id: str,
        company_id: str = "default",
    ) -> dict[str, Any]:
        url, headers = _call_target(backend_url, get_inbound_value(), f"/status/{task_id}", company_id)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.json()
        except Exception as e:
            logger.error("check_video_status_error", error=str(e))
            return {"success": False, "error": str(e)}

    @mcp.tool(
        name="list_recent_videos",
        description="List recent video generation tasks and their completion URLs for a company.",
    )
    async def list_recent_videos(company_id: str = "default") -> dict[str, Any]:
        url, headers = _call_target(backend_url, get_inbound_value(), "/history", company_id)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.json()
        except Exception as e:
            logger.error("list_recent_videos_error", error=str(e))
            return {"success": False, "error": str(e)}
