from __future__ import annotations

from fastapi import APIRouter

from src.api.admin.agents import router as agents_router
from src.api.admin.dreamer import router as dreamer_router
from src.api.admin.embeddings import router as embeddings_router
from src.api.admin.keys import router as keys_router
from src.api.admin.knowledge_embeddings import router as knowledge_embeddings_router
from src.api.admin.product_embeddings import router as product_embeddings_router
from src.api.admin.settings import router as settings_router
from src.api.admin.playground import router as playground_router
from src.api.admin.tasks import router as tasks_router

router = APIRouter()
router.include_router(agents_router)
router.include_router(dreamer_router)
router.include_router(embeddings_router)
router.include_router(keys_router)
router.include_router(knowledge_embeddings_router)
router.include_router(product_embeddings_router)
router.include_router(settings_router)
router.include_router(playground_router)
router.include_router(tasks_router)
