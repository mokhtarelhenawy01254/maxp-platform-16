from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.intent import IntentDefinition

logger = structlog.get_logger(__name__)


class DynamicIntentRegistry:
    def __init__(self) -> None:
        self._intents_cache: dict[str, dict[str, Any]] = {}
        self._tools_cache: dict[str, dict[str, Any]] = {}
        self._enum_cache: list[str] = []
        self._is_loaded = False

    async def load_intents(self, session: AsyncSession, force_reload: bool = False) -> None:
        """Asynchronously load intent definitions from database with static fallback."""
        if self._is_loaded and not force_reload:
            return

        try:
            # Statically import to prevent circular dependencies during module loading
            from src.intent.schema import INTENT_CONFIGURED_TOOLS, INTENT_ENUM, INTENT_POLICIES

            stmt = select(IntentDefinition)
            result = await session.execute(stmt)
            definitions = result.scalars().all()

            if definitions:
                new_enum = []
                new_intents = {}
                new_tools = {}

                for db_intent in definitions:
                    intent_name = db_intent.intent
                    new_enum.append(intent_name)

                    new_intents[intent_name] = {
                        "actionType": db_intent.action_type,
                        "riskLevel": db_intent.risk_level,
                        "nextState": db_intent.next_state,
                        "requiredSlots": db_intent.required_slots or [],
                        "guardrails": db_intent.guardrails or [],
                    }

                    new_tools[intent_name] = {
                        "primaryTool": db_intent.primary_tool,
                        "allowedTools": db_intent.allowed_tools or [],
                    }

                self._enum_cache = new_enum
                self._intents_cache = new_intents
                self._tools_cache = new_tools
                self._is_loaded = True
                logger.info("loaded intent definitions from database", count=len(definitions))
            else:
                logger.warning("intent_definitions table is empty, loading fallback defaults")
                self._load_fallbacks(INTENT_ENUM, INTENT_POLICIES, INTENT_CONFIGURED_TOOLS)
        except Exception as e:
            logger.warning("failed to load intent definitions from database, using fallback schemas", error=str(e))
            from src.intent.schema import INTENT_CONFIGURED_TOOLS, INTENT_ENUM, INTENT_POLICIES
            self._load_fallbacks(INTENT_ENUM, INTENT_POLICIES, INTENT_CONFIGURED_TOOLS)

    def _load_fallbacks(
        self,
        enum_fallback: list[str],
        policies_fallback: dict[str, Any],
        tools_fallback: dict[str, Any]
    ) -> None:
        self._enum_cache = list(enum_fallback)
        self._intents_cache = dict(policies_fallback)
        self._tools_cache = dict(tools_fallback)
        self._is_loaded = True

    def get_intent_enum(self) -> list[str]:
        """Get list of active intent strings."""
        if not self._is_loaded:
            from src.intent.schema import INTENT_ENUM
            return INTENT_ENUM
        return self._enum_cache

    def get_policy(self, intent: str) -> dict[str, Any]:
        """Get policy mapping dict for a given intent."""
        if not self._is_loaded:
            from src.intent.schema import INTENT_POLICIES
            return INTENT_POLICIES.get(intent) or INTENT_POLICIES["general.chat"]
        return self._intents_cache.get(intent) or self._intents_cache.get("general.chat") or {}

    def get_configured_tools(self, intent: str) -> dict[str, Any] | None:
        """Get tools configuration dict for a given intent."""
        if not self._is_loaded:
            from src.intent.schema import INTENT_CONFIGURED_TOOLS
            return INTENT_CONFIGURED_TOOLS.get(intent)
        return self._tools_cache.get(intent)


# Instantiate the global singleton
dynamic_intent_registry = DynamicIntentRegistry()
