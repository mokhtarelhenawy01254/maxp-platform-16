from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseToolParser(ABC):
    supports_streaming: bool = False
    supports_required_and_named: bool = True

    @abstractmethod
    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        ...

    @abstractmethod
    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        ...

    def parse_stream(
        self, prev: str, curr: str, delta: str
    ) -> list[dict[str, Any]]:
        raise NotImplementedError(f"{type(self).__name__} does not support streaming")

    def model_key(self) -> str:
        return type(self).__name__


__all__ = ["BaseToolParser"]
