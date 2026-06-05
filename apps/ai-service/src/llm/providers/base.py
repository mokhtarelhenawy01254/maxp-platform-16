from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderResponse:
    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    usage: dict[str, Any] | None = None
    model: str = ""
    provider: str = ""
    raw: Any = None
    cost: float | None = None
    finish_reason: str | None = None


class BaseProvider(ABC):
    def __init__(self, api_key: str, model: str, **kwargs: Any) -> None:
        self.api_key = api_key
        self.model = model
        self.config = kwargs
        self.timeout_ms = kwargs.get("timeout_ms", 30000)

    @abstractmethod
    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        ...

    async def test_connection(self) -> bool:
        try:
            await self.generate_response(
                [{"role": "user", "content": "test"}],
                max_tokens=10,
            )
            return True
        except Exception:
            return False

    def get_available_models(self) -> list[str]:
        return [self.model]
