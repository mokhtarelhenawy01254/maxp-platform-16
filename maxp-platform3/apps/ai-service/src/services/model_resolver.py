from dataclasses import dataclass
from typing import Any

import structlog

from src.llm.model_manager import ModelManagerError, RoutingResult, model_manager

logger = structlog.get_logger(__name__)


@dataclass
class ModelResolution:
    provider: str
    model_name: str
    key_id: str
    api_key: str
    base_url: str | None = None

    @classmethod
    def from_routing_result(cls, r: RoutingResult) -> "ModelResolution":
        return cls(
            provider=r.provider,
            model_name=r.model,
            key_id=r.key_id,
            api_key=r.api_key,
            base_url=r.base_url,
        )


class ModelResolver:
    """Single source of truth for model resolution.

    Resolves (model_name, company_id) → (provider, api_key, key_id) from the database only.
    Never falls back to environment variables or hardcoded defaults.
    """

    async def resolve(
        self,
        model_name: str,
        company_id: str,
        *,
        preferred_provider: str | None = None,
        key_id: str | None = None,
    ) -> ModelResolution:
        if not model_name:
            raise ValueError("model_name is required")
        if not company_id:
            raise ValueError("company_id is required")

        try:
            result = await model_manager.get_next_key(
                model_name,
                company_id,
                preferred_provider=preferred_provider,
                key_id=key_id,
            )
        except ModelManagerError as e:
            logger.error(
                "model_resolution_failed",
                model=model_name,
                company_id=company_id,
                error=e.message,
            )
            raise ValueError(
                f"No active API key for model '{model_name}' in company '{company_id}'. "
                f"Check ai_keys and ai_model_configs tables."
            ) from e

        return ModelResolution.from_routing_result(result)

    async def resolve_for_company(
        self,
        company_id: str,
    ) -> ModelResolution | None:
        """Resolve the highest-priority active model for a company."""
        from sqlalchemy import select

        from src.db import session
        from src.db.models.provider import AiKey, AiModelConfig

        if session.async_session is None:
            return None

        async with session.async_session() as db:
            stmt = (
                select(AiModelConfig.model_name)
                .join(AiKey, AiKey.id == AiModelConfig.key_id)
                .where(AiKey.company_id == company_id, AiKey.is_active == True, AiModelConfig.is_enabled == True)
                .order_by(AiModelConfig.priority)
                .limit(1)
            )
            row = await db.execute(stmt)
            model_name = row.scalar_one_or_none()
        if not model_name:
            return None

        return await self.resolve(model_name, company_id)


resolver = ModelResolver()
