from __future__ import annotations

from fastapi import APIRouter

from src.api.admin.agents import router as agents_router
from src.api.admin.embeddings import router as embeddings_router
from src.api.admin.keys import router as keys_router
from src.api.admin.tools import router as tools_router

router = APIRouter()
router.include_router(agents_router)
router.include_router(embeddings_router)
router.include_router(keys_router)
router.include_router(tools_router)
