from __future__ import annotations

import os
from typing import Any

import httpx
import structlog
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

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
        url = f"{backend_url.rstrip('/')}/api/v1/ai-video/generate"
        payload = {
            "prompt": prompt,
            "aspectRatio": aspect_ratio,
            "durationSeconds": duration_seconds,
            "referenceImageUrl": reference_image_url,
        }
        headers = {"x-company-id": company_id}

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
        url = f"{backend_url.rstrip('/')}/api/v1/ai-video/status/{task_id}"
        headers = {"x-company-id": company_id}

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
        url = f"{backend_url.rstrip('/')}/api/v1/ai-video/history"
        headers = {"x-company-id": company_id}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.json()
        except Exception as e:
            logger.error("list_recent_videos_error", error=str(e))
            return {"success": False, "error": str(e)}
