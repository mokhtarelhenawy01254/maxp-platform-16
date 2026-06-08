from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.telegram_config import TelegramConfig


class TelegramConfigRepository:
    """Repository for ai.telegram_configs CRUD operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_active_config(self, company_id: str) -> TelegramConfig | None:
        """Get the first active Telegram config for a company."""
        stmt = select(TelegramConfig).where(
            TelegramConfig.company_id == company_id,
            TelegramConfig.is_active == True
        ).limit(1)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_config(self, company_id: str, data: dict[str, Any]) -> TelegramConfig:
        """Upsert telegram configuration."""
        existing = await self.get_active_config(company_id)
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            self._session.add(existing)
            await self._session.commit()
            await self._session.refresh(existing)
            return existing

        config = TelegramConfig(company_id=company_id, **data)
        self._session.add(config)
        await self._session.commit()
        await self._session.refresh(config)
        return config
