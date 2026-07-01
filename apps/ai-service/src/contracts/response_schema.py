from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentResponse(BaseModel):
    """Contract for every agent response."""

    reply: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    action_taken: str | None = None
    escalation_needed: bool = False
    escalation_reason: str | None = None
    silent_escalation: bool = False  # When True, suppress reply and flag for human takeover
    metadata: dict[str, Any] = Field(default_factory=dict)
