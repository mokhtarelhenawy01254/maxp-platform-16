from __future__ import annotations

import datetime
import json
from dataclasses import dataclass, field
from typing import Any

import structlog

from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)

MAX_WINDOW_SIZE = 50
SESSION_TTL_SECONDS = 2 * 60 * 60  # 2 hours

@dataclass
class MemorySession:
    company_id: str
    conversation_id: str
    messages: list[dict[str, Any]] = field(default_factory=list)
    summary: str | None = None
    cart: dict[str, Any] = field(default_factory=dict)
    queried_products: list[Any] = field(default_factory=list)
    last_shown_product_ids: list[str] = field(default_factory=list)
    active_search_filters: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    last_access: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())

class WorkingMemoryService:
    def __init__(self) -> None:
        # L1 cache: { key: MemorySession }
        self._sessions: dict[str, MemorySession] = {}

    def _key(self, company_id: str, conversation_id: str) -> str:
        return f"agent:session:{company_id}:{conversation_id}"

    def _session_to_dict(self, session: MemorySession) -> dict[str, Any]:
        return {
            "company_id": session.company_id,
            "conversation_id": session.conversation_id,
            "messages": session.messages,
            "summary": session.summary,
            "cart": session.cart,
            "queried_products": session.queried_products,
            "last_shown_product_ids": session.last_shown_product_ids,
            "active_search_filters": session.active_search_filters,
            "created_at": session.created_at,
            "last_access": session.last_access,
        }

    def _dict_to_session(self, data: dict[str, Any]) -> MemorySession:
        return MemorySession(
            company_id=data["company_id"],
            conversation_id=data["conversation_id"],
            messages=data.get("messages", []),
            summary=data.get("summary"),
            cart=data.get("cart", {}),
            queried_products=data.get("queried_products", []),
            last_shown_product_ids=data.get("last_shown_product_ids", []),
            active_search_filters=data.get("active_search_filters", {}),
            created_at=data.get("created_at", datetime.datetime.utcnow().isoformat()),
            last_access=data.get("last_access", datetime.datetime.utcnow().isoformat()),
        )

    async def _redis_save(self, key: str, session: MemorySession) -> None:
        if not redis_client.available:
            return
        try:
            data = self._session_to_dict(session)
            await redis_client.set(f"wm:{key}", data, ttl=SESSION_TTL_SECONDS)
        except Exception as e:
            logger.warning("redis save failed", key=key, error=str(e))

    async def _redis_load(self, key: str) -> MemorySession | None:
        if not redis_client.available:
            return None
        try:
            raw = await redis_client.get(f"wm:{key}")
            if raw:
                data = json.loads(raw)
                return self._dict_to_session(data)
        except Exception as e:
            logger.warning("redis load failed", key=key, error=str(e))
        return None

    async def _redis_delete(self, key: str) -> None:
        if not redis_client.available:
            return
        try:
            await redis_client.delete(f"wm:{key}")
        except Exception as e:
            logger.warning("redis delete failed", key=key, error=str(e))

    async def _get_or_load(self, key: str) -> MemorySession | None:
        session = self._sessions.get(key)
        if not session:
            session = await self._redis_load(key)
            if session:
                self._sessions[key] = session
        return session

    async def init_session(self, company_id: str, conversation_id: str) -> MemorySession:
        key = self._key(company_id, conversation_id)
        session = MemorySession(company_id=company_id, conversation_id=conversation_id)
        self._sessions[key] = session
        await self._redis_save(key, session)
        return session

    async def add_message(self, company_id: str, conversation_id: str, message: dict[str, Any] | str) -> MemorySession:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            session = await self.init_session(company_id, conversation_id)

        if isinstance(message, str):
            msg_obj = {"role": "user", "content": message}
        else:
            msg_obj = {
                "role": message.get("role", "user"),
                "content": message.get("content", ""),
            }

        if "modelSelection" in message:
            msg_obj["modelSelection"] = message["modelSelection"]
        if "intentTrace" in message:
            msg_obj["intentTrace"] = message["intentTrace"]
        if isinstance(message, dict) and message.get("attachments"):
            msg_obj["attachments"] = message["attachments"]

        msg_obj["timestamp"] = datetime.datetime.utcnow().isoformat()
        session.messages.append(msg_obj)
        session.last_access = datetime.datetime.utcnow().isoformat()

        if len(session.messages) > MAX_WINDOW_SIZE:
            self._compress_old_messages(session)

        await self._redis_save(key, session)
        return session

    def _compress_old_messages(self, session: MemorySession) -> None:
        overflow = len(session.messages) - MAX_WINDOW_SIZE
        old_messages = session.messages[:overflow]
        session.messages = session.messages[overflow:]
        old_summary_text = f"{session.summary} | " if session.summary else ""
        compressed_lines = [
            f"[{m.get('role', 'user')}]: {str(m.get('content', ''))[:500]}"
            for m in old_messages
        ]
        header = f"[Earlier conversation - {len(old_messages)} message(s)]"
        session.summary = f"{old_summary_text}{header}\n" + "\n".join(compressed_lines)

    async def get_context(self, company_id: str, conversation_id: str) -> dict[str, Any] | None:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            return None
        session.last_access = datetime.datetime.utcnow().isoformat()
        return {
            "summary": session.summary,
            "recentMessages": session.messages,
            "cart": session.cart,
            "queriedProducts": session.queried_products,
            "lastShownProductIds": session.last_shown_product_ids,
            "activeSearchFilters": session.active_search_filters,
        }

    async def update_cart(self, company_id: str, conversation_id: str, cart_data: dict[str, Any]) -> dict[str, Any] | None:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            return None
        session.cart.update(cart_data)
        session.last_access = datetime.datetime.utcnow().isoformat()
        await self._redis_save(key, session)
        return session.cart

    async def add_queried_product(self, company_id: str, conversation_id: str, product: Any) -> list[Any] | None:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            return None
        session.queried_products.append(product)
        session.last_access = datetime.datetime.utcnow().isoformat()
        await self._redis_save(key, session)
        return session.queried_products

    async def update_search_context(self, company_id: str, conversation_id: str, product_ids: list[str] | None = None, filters: dict[str, Any] | None = None) -> dict[str, Any] | None:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            return None

        if product_ids and len(product_ids) > 0:
            session.last_shown_product_ids = product_ids[:20]
        if filters:
            for k, v in filters.items():
                if v is None or v == "":
                    session.active_search_filters.pop(k, None)
                else:
                    session.active_search_filters[k] = v

        session.last_access = datetime.datetime.utcnow().isoformat()
        await self._redis_save(key, session)
        return {
            "lastShownProductIds": session.last_shown_product_ids,
            "activeSearchFilters": session.active_search_filters,
        }

    async def clear_search_context(self, company_id: str, conversation_id: str) -> bool:
        key = self._key(company_id, conversation_id)
        session = await self._get_or_load(key)
        if not session:
            return False
        session.last_shown_product_ids = []
        session.active_search_filters = {}
        session.last_access = datetime.datetime.utcnow().isoformat()
        await self._redis_save(key, session)
        return True

    async def clear_session(self, company_id: str, conversation_id: str) -> bool:
        key = self._key(company_id, conversation_id)
        if key in self._sessions:
            del self._sessions[key]
        await self._redis_delete(key)
        return True

    async def cleanup_expired_sessions(self) -> int:
        now = datetime.datetime.utcnow()
        expired_keys = []
        for key, session in self._sessions.items():
            last_access = datetime.datetime.fromisoformat(session.last_access)
            if (now - last_access).total_seconds() > SESSION_TTL_SECONDS:
                expired_keys.append(key)
        for key in expired_keys:
            self._sessions.pop(key, None)
            await self._redis_delete(key)
        return len(expired_keys)

    def get_active_session_count(self) -> int:
        return len(self._sessions)

working_memory_service = WorkingMemoryService()
