from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GuardrailResult:
    allowed: bool
    reason: str | None = None
    violations: list[str] = field(default_factory=list)


class BaseGuardrail(ABC):
    @abstractmethod
    async def validate(self, context: Any, text: str) -> GuardrailResult:
        pass
