from __future__ import annotations

import json
import time
from dataclasses import dataclass, asdict
from typing import Any, Optional
from datetime import datetime, timedelta

import structlog
from src.config import get_settings
from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)

class ModelManagerError(Exception):
    """Exception raised by the ModelManager when no suitable key can be found."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(self.message)

@dataclass
class ModelKey:
    """State of a single AI API key."""
    key_id: str
    model: str
    provider: str
    cooldown_until: float = 0.0
    status: str = "ACTIVE"  # ACTIVE, COOLDOWN, PERMANENTLY_DISABLED

class ModelManager:
    """
    Advanced AI Model Manager for key rotation, quota tracking, and circuit breaking.
    Ports the logic from Node.js modelManager.js.
    """

    DEFAULT_COOLDOWN = 30  # seconds
    PERMANENT_COOLDOWN = 86400  # 24 hours
    
    # Mapping of critical errors that trigger permanent cooldown
    CRITICAL_ERRORS = {"LEAKED", "403_INVALID", "PERMISSION_DENIED"}

    def __init__(self):
        self.settings = get_settings()
        # Provider priority order for failover
        self.provider_priority = ["GOOGLE", "GROQ", "OPENROUTER", "NVIDIA", "OPENAI", "ANTHROPIC"]

    def _get_key_state(self, key_id: str) -> ModelKey | None:
        """Fetch key state from Redis."""
        state_json = redis_client.get(f"model_manager:key_state:{key_id}")
        if not state_json:
            return None
        
        data = json.loads(state_json)
        return ModelKey(**data)

    def _set_key_state(self, key: ModelKey) -> None:
        """Persist key state to Redis."""
        redis_client.set(
            f"model_manager:key_state:{key.key_id}",
            json.dumps(asdict(key)),
            ex=PERMANENT_COOLDOWN if key.status == "PERMANENTLY_DISABLED" else 3600,
        )

    def _get_round_robin_index(self, pool_name: str, pool_size: int) -> int:
        """Atomic round-robin index increment in Redis."""
        if pool_size == 0:
            return 0
        
        key = f"model_manager:rr_idx:{pool_name}"
        idx = redis_client.incr(key)
        return (idx or 0) % pool_size

    async def get_next_key(self, model_name: str, company_id: str) -> dict[str, Any]:
        """
        Select the next available API key for a model, with failover support.
        
        Returns:
            Dict containing key_id, api_key, baseUrl, and model.
        """
        # 1. Determine the best provider based on priority
        from src.db.models.provider import AiKey
        from src.db.session import async_session
        
        async with async_session() as session:
            # We iterate through providers in priority order
            for provider_type in self.provider_priority:
                # Find all active keys for this model and provider
                # Note: We assume a helper method or raw SQL to find keys
                # In a real implementation, this would query the ai_keys table
                keys_rows = await session.execute(
                    "SELECT id, api_key, base_url, model_name FROM ai.ai_keys "
                    "WHERE model_name = :model AND provider = :provider AND is_active = true",
                    {"model": model_name, "provider": provider_type},
                )
                keys = keys_rows.fetchall()
                if not keys:
                    continue

                # Filter out keys currently in cooldown
                available_keys = []
                now = time.time()
                
                for k_id, k_api, k_url, k_model in keys:
                    state = self._get_key_state(k_id)
                    if state and (state.status == "PERMANENTLY_DISABLED" or state.cooldown_until > now):
                        continue
                    available_keys.append({
                        "key_id": k_id,
                        "api_key": k_api,
                        "base_url": k_url,
                        "model": k_model,
                    })

                if not available_keys:
                    continue

                # 2. Perform Round-Robin selection
                pool_name = f"{provider_type}:{model_name}"
                idx = self._get_round_robin_index(pool_name, len(available_keys))
                selected_key = available_keys[idx]
                
                # 3. Final check: Company-wide budget
                if await self._is_budget_exceeded(company_id):
                    raise ModelManagerError("BUDGET_EXCEEDED", "Company daily AI budget reached")

                return selected_key

        raise ModelManagerError("ALL_KEYS_UNAVAILABLE", "No available API keys for the requested model")

    async def _is_budget_exceeded(self, company_id: str) -> bool:
        """Check if the company has exceeded its daily budget."""
        # This would query the provider_budget_ledger in Redis
        # For now, we implement a simple check or return False
        return False

    async def record_success(self, key_id: str, usage: dict[str, Any]) -> None:
        """
        Update key usage and reset circuit breaker on success.
        
        usage: { "prompt_tokens": int, "completion_tokens": int, "total_tokens": int }
        """
        # 1. Update usage buckets in Redis (Minute/Day)
        total_tokens = usage.get("total_tokens", 0)
        now = datetime.utcnow()
        minute_bucket = now.strftime("%Y%m%d%H%M")
        day_bucket = now.strftime("%Y%m%d")
        
        # Atomic increment of token usage
        redis_client.incrby(f"model_manager:usage:{key_id}:min:{minute_bucket}", total_tokens)
        redis_client.incrby(f"model_manager:usage:{key_id}:day:{day_bucket}", total_tokens)
        
        # 2. Reset cooldown if it was in COOLDOWN state
        state = self._get_key_state(key_id)
        if state and state.status == "COOLDOWN":
            state.status = "ACTIVE"
            state.cooldown_until = 0.0
            self._set_key_state(state)

    async def record_failure(self, key_id: str, error_type: str, retry_after_ms: int | None = None) -> None:
        """
        Trigger circuit breaker for a failed key.
        
        error_type: '429', 'QUOTA', 'LEAKED', '403_INVALID', 'GENERAL', etc.
        """
        state = self._get_key_state(key_id)
        if not state:
            # Create default state if not exists
            state = ModelKey(key_id=key_id, model="", provider="", status="ACTIVE")

        now = time.time()
        cooldown = self.DEFAULT_COOLDOWN

        if error_type in self.CRITICAL_ERRORS:
            state.status = "PERMANENTLY_DISABLED"
            cooldown = self.PERMANENT_COOLDOWN
        elif error_type in ("429", "QUOTA") and retry_after_ms:
            cooldown = retry_after_ms / 1000.0
        elif error_type in ("429", "QUOTA"):
            cooldown = 60 # 1 minute for rate limits
        else:
            state.status = "COOLDOWN"
            cooldown = self.DEFAULT_COOLDOWN

        state.cooldown_until = now + cooldown
        self._set_key_state(state)
        logger.warning("key tripped circuit breaker", key_id=key_id, error=error_type, cooldown=cooldown)

# Singleton instance
model_manager = ModelManager()
