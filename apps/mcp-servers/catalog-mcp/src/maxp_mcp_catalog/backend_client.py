from __future__ import annotations

import os

import httpx
import structlog

logger = structlog.get_logger(__name__)


class BackendError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class MaxPBackendClient:
    def __init__(
        self,
        base_url: str | None = None,
        service_token: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._base_url = (base_url or os.environ.get("MAXP_API_URL") or "http://localhost:3007").rstrip("/")
        self._service_token = service_token or os.environ.get("MAXP_SERVICE_TOKEN") or "test-service-token"
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    @property
    def base_url(self) -> str:
        return self._base_url

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers={
                    "Authorization": f"Bearer {self._service_token}",
                    "Content-Type": "application/json",
                },
                timeout=self._timeout,
                trust_env=False,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def execute_tool(
        self,
        *,
        tool: str,
        params: dict[str, object],
        company_id: str,
    ) -> dict[str, object]:
        body = {"tool": tool, "params": params, "company_id": company_id}
        client = self._get_client()
        last_error: BackendError | None = None

        for attempt in range(2):
            try:
                response = await client.post(
                    "/api/v1/ai-bridge/tools/execute",
                    json=body,
                )
            except httpx.RequestError as exc:
                last_error = BackendError(f"backend unreachable: {exc}")
                logger.warning("backend_request_error", tool=tool, attempt=attempt, error=str(exc))
                continue

            if response.status_code >= 500:
                last_error = BackendError(
                    f"backend returned {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )
                logger.warning(
                    "backend_5xx",
                    tool=tool,
                    attempt=attempt,
                    status=response.status_code,
                )
                continue

            if response.status_code >= 400:
                raise BackendError(
                    f"backend returned {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            data = response.json()
            if not isinstance(data, dict):
                raise BackendError(f"backend returned non-object body: {type(data).__name__}")

            if data.get("success") is False:
                error_message = str(data.get("error") or "backend reported failure")
                raise BackendError(error_message, status_code=response.status_code)

            result = data.get("result")
            if not isinstance(result, dict):
                return {"value": result}
            return result

        if last_error is None:
            last_error = BackendError("backend request failed without a captured error")
        raise last_error


_client: MaxPBackendClient | None = None


def get_backend_client() -> MaxPBackendClient:
    global _client
    if _client is None:
        _client = MaxPBackendClient()
    return _client
