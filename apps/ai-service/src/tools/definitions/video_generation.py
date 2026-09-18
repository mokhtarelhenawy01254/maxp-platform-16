from __future__ import annotations

from typing import Any

import httpx
import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.config import get_settings

logger = structlog.get_logger(__name__)


class GenerateMarketingVideoInput(BaseModel):
    prompt: str = Field(description="Detailed cinematic description of the video to generate with Google Veo")
    aspect_ratio: str = Field(default="9:16", description="Aspect ratio: '9:16' for Reels/TikTok, '16:9' for YouTube, '1:1' for square feed")
    duration_seconds: int = Field(default=5, description="Duration in seconds (typically 5 or 8)")
    reference_image_url: str | None = Field(default=None, description="Optional image URL or product image for Image-to-Video generation")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CheckVideoStatusInput(BaseModel):
    task_id: str = Field(description="The task ID returned from create_marketing_video")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def generate_marketing_video(input_data: GenerateMarketingVideoInput) -> dict[str, Any]:
    """Trigger an asynchronous Google Veo video generation job."""
    try:
        settings = get_settings()
        api_url = settings.maxp_api_url.rstrip("/")
        if "mokhtarelhenawy.online" in api_url or "localhost" in api_url:
            api_url = "http://127.0.0.1:3007"

        url = f"{api_url}/api/v1/ai-video/generate"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.maxp_service_token}",
            "x-company-id": input_data.company_id or "default",
        }

        payload = {
            "prompt": input_data.prompt,
            "aspectRatio": input_data.aspect_ratio,
            "durationSeconds": input_data.duration_seconds,
            "referenceImageUrl": input_data.reference_image_url,
        }

        async with httpx.AsyncClient(timeout=30.0, trust_env=False, verify=False) as client:
            resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()

        if resp.status_code in (200, 201, 202) and data.get("success"):
            task_info = data.get("data", {})
            return {
                "status": "queued",
                "task_id": task_info.get("taskId"),
                "progress": task_info.get("progress", 5),
                "message": "Video generation started. Use check_video_status with this task_id to monitor progress.",
            }
        else:
            return {
                "status": "error",
                "message": data.get("error") or "Failed to start video generation",
            }
    except Exception as exc:
        logger.error("video_generation_trigger_failed", error=str(exc))
        return {
            "status": "error",
            "message": f"Video generation trigger failed: {str(exc)}",
        }


async def check_video_status(input_data: CheckVideoStatusInput) -> dict[str, Any]:
    """Check the status and progress of a Google Veo video generation job."""
    try:
        settings = get_settings()
        api_url = settings.maxp_api_url.rstrip("/")
        if "mokhtarelhenawy.online" in api_url or "localhost" in api_url:
            api_url = "http://127.0.0.1:3007"

        url = f"{api_url}/api/v1/ai-video/status/{input_data.task_id}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.maxp_service_token}",
            "x-company-id": input_data.company_id or "default",
        }

        async with httpx.AsyncClient(timeout=15.0, trust_env=False, verify=False) as client:
            resp = await client.get(url, headers=headers)
            data = resp.json()

        if resp.status_code == 200 and data.get("success"):
            task = data.get("data", {})
            return {
                "status": task.get("status"),
                "progress": task.get("progress"),
                "video_url": task.get("videoUrl"),
                "error": task.get("error"),
                "is_completed": task.get("status") == "COMPLETED",
                "is_failed": task.get("status") == "FAILED",
            }
        else:
            return {
                "status": "error",
                "message": data.get("error") or "Failed to fetch task status",
            }
    except Exception as exc:
        logger.error("check_video_status_failed", error=str(exc))
        return {
            "status": "error",
            "message": f"Failed to check video status: {str(exc)}",
        }


generate_marketing_video_tool = FunctionTool(
    name="generate_marketing_video",
    description=(
        "Start generating an AI video using Google Veo for marketing, products, or ads. "
        "Provide a detailed visual prompt describing the scene, camera movement, and lighting. "
        "Returns a task_id to track generation progress."
    ),
    func=generate_marketing_video,
    input_model=GenerateMarketingVideoInput,
)

check_video_status_tool = FunctionTool(
    name="check_video_status",
    description="Check the current progress or retrieve the video URL of a previously queued video generation task.",
    func=check_video_status,
    input_model=CheckVideoStatusInput,
)

__all_tools__ = [generate_marketing_video_tool, check_video_status_tool]
