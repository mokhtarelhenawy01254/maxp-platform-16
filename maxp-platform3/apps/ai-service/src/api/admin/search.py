from __future__ import annotations

import base64
import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.tools.vector_product_search import vector_product_search

logger = structlog.get_logger(__name__)
router = APIRouter()


class VisualSearchRequest(BaseModel):
    company_id: str = Field(..., description="Tenant/company ID")
    query: str = Field(default="", description="Free-text query")
    image_base64: str | None = Field(default=None, description="Base64-encoded image bytes")
    mime_type: str = Field(default="image/jpeg", description="MIME type of the image")
    top_k: int = Field(default=5, ge=1, le=50, description="Max results")
    min_score: float = Field(default=0.30, ge=0.0, le=1.0, description="Minimum similarity threshold")


@router.post("/search/visual")
async def visual_search(body: VisualSearchRequest):
    if not body.company_id:
        raise HTTPException(status_code=400, detail="company_id is required")
    if not body.query and not body.image_base64:
        raise HTTPException(status_code=400, detail="Either query or image_base64 must be provided")

    image_bytes = base64.b64decode(body.image_base64) if body.image_base64 else None

    try:
        results = await vector_product_search(
            company_id=body.company_id,
            query=body.query,
            limit=body.top_k,
            min_score=body.min_score,
            image_bytes=image_bytes,
            mime_type=body.mime_type or "image/jpeg",
        )
        return {"success": True, "data": results}
    except Exception as exc:
        logger.error("visual_search failed", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))
