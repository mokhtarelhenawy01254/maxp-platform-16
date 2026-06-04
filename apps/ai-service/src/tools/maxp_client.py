from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import httpx
import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)

PII_PATTERNS = [
    (re.compile(r'\b[\w\.-]+@[\w\.-]+\.\w+\b'), '[EMAIL]'),
    (re.compile(r'\b(\+?20)?0?1[0-9]{9}\b'), '[PHONE]'),
    (re.compile(r'\b(?:ش|ال)[^،\.]{5,50}(?:ة|تان|ون|ين)\b'), '[ADDRESS]'),
]


def redact_pii(data: dict[str, Any]) -> dict[str, Any]:
    serialized = json.dumps(data, default=str)
    for pattern, replacement in PII_PATTERNS:
        serialized = pattern.sub(replacement, serialized)
    return json.loads(serialized)  # type: ignore[no-any-return]


class MaxPClient:
    """HTTP client for calling MaxP backend tool endpoints."""

    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.maxp_api_url.rstrip("/")
        self.token = settings.maxp_service_token
        self._client: httpx.AsyncClient | None = None
        self._log = logger

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def call_tool(
        self,
        tool_name: str,
        company_id: str,
        input_data: dict[str, Any],
        thread_id: str | None = None,
    ) -> dict[str, Any]:
        client = await self._get_client()
        body = {
            "toolName": tool_name,
            "companyId": company_id,
            "input": input_data,
        }
        if thread_id:
            body["threadId"] = thread_id

        self._log.info("calling maxp tool", tool_name=tool_name, company_id=company_id)

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.post("/api/v1/ai-bridge/tools/execute", json=body)
                response.raise_for_status()
                result: dict[str, Any] = response.json()
                redacted = redact_pii(result)
                self._log.info("maxp tool success", tool_name=tool_name, result=redacted)
                return result
            except httpx.HTTPStatusError as e:
                last_error = e
                self._log.warning(
                    "maxp tool http error",
                    tool_name=tool_name,
                    status=e.response.status_code,
                    attempt=attempt + 1,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                last_error = e
                self._log.warning(
                    "maxp tool request error",
                    tool_name=tool_name,
                    error=str(e),
                    attempt=attempt + 1,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        self._log.error("maxp tool failed after retries", tool_name=tool_name, error=str(last_error))
        raise RuntimeError(f"Tool {tool_name} failed after 3 retries") from last_error

    async def get_product(self, company_id: str, product_id: str) -> dict[str, Any] | None:
        return await self.call_tool("product.search", company_id, {"productId": product_id})

    async def get_order(self, company_id: str, order_number: str) -> dict[str, Any] | None:
        return await self.call_tool("order.lookup", company_id, {"orderNumber": order_number})

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def create_draft(
        self,
        company_id: str,
        action_type: str,
        action_args: dict[str, Any],
        thread_id: str,
    ) -> dict[str, Any]:
        """Create an approval draft in MaxP.

        Args:
            company_id: Tenant ID
            action_type: e.g. 'discount.create', 'order.cancel'
            action_args: arguments for the action
            thread_id: conversation thread ID

        Returns:
            Draft creation result with draft_id
        """
        client = await self._get_client()
        body = {
            "companyId": company_id,
            "actionType": action_type,
            "actionArgs": action_args,
            "threadId": thread_id,
        }

        self._log.info("creating draft", action_type=action_type, company_id=company_id)

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.post("/api/v1/ai-bridge/approvals/draft", json=body)
                response.raise_for_status()
                result: dict[str, Any] = response.json()
                self._log.info("draft created", draft_id=result.get("draftId", ""))
                return result
            except httpx.HTTPStatusError as e:
                last_error = e
                self._log.warning(
                    "draft creation http error",
                    status=e.response.status_code,
                    attempt=attempt + 1,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                last_error = e
                self._log.warning(
                    "draft creation network error",
                    error=str(e),
                    attempt=attempt + 1,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        self._log.error("draft creation failed", action_type=action_type, error=str(last_error))
        raise RuntimeError(f"Draft creation failed for {action_type} after 3 retries") from last_error


_client_instance: MaxPClient | None = None


def get_maxp_client() -> MaxPClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = MaxPClient()
    return _client_instance
