from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.memory.episodic_memory import episodic_memory_service

logger = structlog.get_logger(__name__)
router = APIRouter()


class EmbeddingRequest(BaseModel):
    text: str | None = Field(default=None, description="Text to generate embedding for")
    image_bytes: str | None = Field(default=None, description="Base64 encoded image bytes")
    mime_type: str | None = Field(default=None, description="MIME type of the image")
    dimension: int = Field(default=768, description="Dimension of the embedding vector")


class EmbeddingResponse(BaseModel):
    embedding: list[float] = Field(..., description="The generated embedding vector")


@router.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(body: EmbeddingRequest) -> EmbeddingResponse:
    """
    Generate an embedding vector for a given text and/or image.
    """
    if not body.text and not body.image_bytes:
        raise HTTPException(status_code=400, detail="Either text or image_bytes must be provided")
        
    try:
        embedding = await episodic_memory_service.generate_embedding_async(
            text=body.text,
            image_bytes=body.image_bytes,
            mime_type=body.mime_type,
            dimension=body.dimension
        )
        return EmbeddingResponse(embedding=embedding)
    except Exception as exc:
        logger.error("Failed to generate embedding", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embedding: {exc}"
        )
