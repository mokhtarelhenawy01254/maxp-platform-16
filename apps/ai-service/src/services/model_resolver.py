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


async def resolve_db_default_model(company_id: str | None = None) -> str | None:
    """DB-first default model resolution — no env, no hardcoded model names.

    Order:
    1. Company preference: ai.ai_settings.modelSettings (keys: model / chatModel / defaultModel)
    2. Platform explicit: ai.global_ai_config.settings.defaultModel
    3. Platform derived: first enabled model of the global default_provider
    4. Platform derived: first enabled model across providers in global provider_priority order
    """
    from sqlalchemy import select

    from src.db import session as db_session
    from src.db.models.provider import AiKey, AiModelConfig, GlobalAiConfig

    if db_session.async_session is None:
        return None

    async def _first_model_for_provider(provider: str) -> str | None:
        from sqlalchemy import func

        async with db_session.async_session() as db:
            stmt = (
                select(AiModelConfig.model_name)
                .join(AiKey, AiKey.id == AiModelConfig.key_id)
                .where(
                    func.upper(AiKey.provider) == provider.upper(),
                    AiKey.is_active == True,  # noqa: E712
                    AiModelConfig.is_enabled == True,  # noqa: E712
                )
                .order_by(AiModelConfig.priority, AiModelConfig.created_at)
                .limit(1)
            )
            row = await db.execute(stmt)
            return row.scalar_one_or_none()

    try:
        # 1. Company preference
        if company_id:
            from src.db.models.ai_setting import AiSetting

            async with db_session.async_session() as db:
                row = await db.execute(
                    select(AiSetting.modelSettings).where(AiSetting.company_id == company_id)
                )
                raw = row.scalar_one_or_none()
            if raw:
                if isinstance(raw, str):
                    import json as _json

                    try:
                        raw = _json.loads(raw)
                    except Exception:
                        raw = {}
                for key in ("model", "chatModel", "defaultModel"):
                    candidate = (raw or {}).get(key)
                    if candidate and isinstance(candidate, str):
                        return candidate

        # 2-4. Platform defaults from ai.global_ai_config
        async with db_session.async_session() as db:
            row = await db.execute(select(GlobalAiConfig))
            config = row.scalar_one_or_none()
        if not config:
            return None

        raw_settings = config.settings or {}
        if isinstance(raw_settings, str):
            import json as _json

            try:
                raw_settings = _json.loads(raw_settings)
            except Exception:
                raw_settings = {}
        explicit = raw_settings.get("defaultModel")
        if explicit and isinstance(explicit, str):
            return explicit

        if config.default_provider:
            model = await _first_model_for_provider(str(config.default_provider))
            if model:
                return model

        for provider in (config.provider_priority or []):
            model = await _first_model_for_provider(str(provider))
            if model:
                return model

        return None
    except Exception as exc:
        logger.warning("resolve_db_default_model_failed", company_id=company_id, error=str(exc)[:160])
        return None


resolver = ModelResolver()
