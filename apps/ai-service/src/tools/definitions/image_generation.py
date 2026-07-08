from __future__ import annotations

from typing import Any

import structlog
from agent_framework import FunctionTool
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from src.llm.model_manager import ModelManager

logger = structlog.get_logger(__name__)

ALLOWED_MODELS = [
    "google/gemini-3.1-flash-image",
    "google/gemini-3.1-flash-lite-image",
    "google/gemini-3-pro-image",
    "openai/gpt-image-2",
    "openai/gpt-image-1-mini",
    "openai/gpt-5.4-image-2",
    "x-ai/grok-imagine-image-quality",
]

ASPECT_RATIOS: dict[str, dict[str, int]] = {
    "1:1": {"width": 1024, "height": 1024},
    "16:9": {"width": 1344, "height": 768},
    "9:16": {"width": 768, "height": 1344},
    "4:3": {"width": 1152, "height": 896},
    "3:4": {"width": 896, "height": 1152},
    "3:2": {"width": 1216, "height": 832},
}


class GenerateSocialImageInput(BaseModel):
    prompt: str = Field(description="Detailed description of the image to generate")
    model: str = Field(default="google/gemini-3.1-flash-image", description=f"Model to use. Options: {', '.join(ALLOWED_MODELS)}")
    aspect_ratio: str = Field(default="1:1", description=f"Aspect ratio. Options: {', '.join(ASPECT_RATIOS.keys())}")
    style: str | None = Field(default=None, description="Visual style (photorealistic, cinematic, illustration, vector, minimalist, vibrant, dark moody, vintage)")
    negative_prompt: str | None = Field(default=None, description="Things to exclude from the image")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def generate_social_image(input_data: GenerateSocialImageInput) -> dict[str, Any]:
    try:
        model = input_data.model
        if model not in ALLOWED_MODELS:
            return {"status": "error", "message": f"Unsupported model. Choose from: {', '.join(ALLOWED_MODELS)}"}

        mm = ModelManager()
        key = await mm.get_next_key("OPENROUTER", "")
        if not key or not key.api_key:
            return {"status": "error", "message": "No active OpenRouter API key found"}

        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=key.api_key,
            default_headers={
                "HTTP-Referer": "https://maxp.online",
                "X-Title": "MaxP Agent Image Generator",
            },
        )

        system_parts = [
            "You are a professional social media image designer. Generate a high-quality image.",
        ]
        if input_data.style:
            system_parts.append(f"Style: {input_data.style}.")
        if input_data.negative_prompt:
            system_parts.append(f"Avoid: {input_data.negative_prompt}.")
        system_prompt = " ".join(system_parts)

        dims = ASPECT_RATIOS.get(input_data.aspect_ratio, ASPECT_RATIOS["1:1"])

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_data.prompt},
            ],
            extra_body={"response_format": {"type": "image"}},
            timeout=120,
        )

        content = response.choices[0].message.content if response.choices else ""
        model_used = response.model or model

        logger.info("image_generated", model=model_used, aspect_ratio=input_data.aspect_ratio, company=input_data.company_id)

        return {
            "status": "success",
            "image_content": content,
            "model": model_used,
            "aspect_ratio": input_data.aspect_ratio,
            "style": input_data.style,
            "note": (
                "The image URL/content is in the image_content field. "
                "If it's a markdown image (![](...)), extract the URL and send it to the customer. "
                "If it's a data URL, the image is embedded directly."
            ),
        }
    except Exception as exc:
        logger.error("image_generation_failed", error=str(exc))
        return {"status": "error", "message": f"Image generation failed: {str(exc)}"}


generate_social_image_tool = FunctionTool(
    name="generate_social_image",
    description=(
        "Generate a social media image using AI. "
        "Ask the user for a detailed prompt describing what they want. "
        "Offer to choose model, aspect ratio, and style if they're unsure. "
        "After generation, share the image URL with the user and ask if they want adjustments."
    ),
    func=generate_social_image,
    input_model=GenerateSocialImageInput,
)

__all_tools__ = [generate_social_image_tool]
