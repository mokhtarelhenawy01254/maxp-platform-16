from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.llm.providers.base import BaseProvider, ProviderResponse

logger = structlog.get_logger(__name__)


class OllamaProvider(BaseProvider):
    def __init__(self, model: str, **kwargs: Any) -> None:
        super().__init__("", model, **kwargs)
        self.base_url = kwargs.get("base_url", "http://localhost:11434")

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        body: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": m.get("role", "user"), "content": m.get("content", "")}
                for m in messages
            ],
            "stream": False,
        }
        if tools:
            body["tools"] = tools
        if options.get("temperature") is not None:
            body["temperature"] = options["temperature"]
        if options.get("max_tokens") is not None:
            body["options"] = {"num_predict": options["max_tokens"]}

        async with httpx.AsyncClient(timeout=max(self.timeout_ms / 1000, 180)) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=body,
            )
            response.raise_for_status()
            data = response.json()

        message = data.get("message", {})
        text = message.get("content", "")

        return ProviderResponse(
            text=text,
            tool_calls=[],
            usage={
                "prompt_tokens": data.get("prompt_eval_count", 0),
                "completion_tokens": data.get("eval_count", 0),
            },
            model=data.get("model", self.model),
            provider="OLLAMA",
            raw=data,
        )

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.is_success
        except Exception:
            return False

    def get_available_models(self) -> list[str]:
        try:
            import httpx
            resp = httpx.get(f"{self.base_url}/api/tags", timeout=5)
            if resp.is_success:
                models = resp.json().get("models", [])
                return [m.get("name", "") for m in models]
        except Exception:
            pass
        return [self.model]
