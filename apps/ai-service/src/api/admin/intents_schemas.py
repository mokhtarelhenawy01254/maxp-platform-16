from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class IntentDefinitionBase(BaseModel):
    intent: str = Field(..., min_length=1, max_length=100, description="Unique intent slug (e.g. orders.create_draft)")
    action_type: str = Field(..., min_length=1, max_length=50, description="Action type (e.g. read, write, handoff, chat)")
    risk_level: str = Field(..., min_length=1, max_length=50, description="Risk level (low, medium, high, critical)")
    next_state: str = Field(..., min_length=1, max_length=100, description="Next state name")
    required_slots: list[str] = Field(default_factory=list, description="Required slots lists")
    guardrails: list[str] = Field(default_factory=list, description="Guardrails applied")
    primary_tool: str | None = Field(default=None, max_length=100, description="Primary tool name")
    allowed_tools: list[str] = Field(default_factory=list, description="Allowed tools list")

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = ["low", "medium", "high", "critical"]
        if v.lower() not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}")
        return v.lower()

    @field_validator("primary_tool")
    @classmethod
    def validate_primary_tool(cls, v: str | None) -> str | None:
        if v is None:
            return v
        # Validate that the tool exists in our system registry
        from src.tools.registry import ALL_TOOLS
        snake_name = v.replace(".", "_")
        if snake_name not in ALL_TOOLS:
            raise ValueError(f"primary_tool '{v}' does not exist in the tool registry")
        return v

    @field_validator("allowed_tools")
    @classmethod
    def validate_allowed_tools(cls, v: list[str]) -> list[str]:
        from src.tools.registry import ALL_TOOLS
        for tool in v:
            snake_name = tool.replace(".", "_")
            if snake_name not in ALL_TOOLS:
                raise ValueError(f"allowed_tool '{tool}' does not exist in the tool registry")
        return v


class IntentDefinitionCreate(IntentDefinitionBase):
    pass


class IntentDefinitionUpdate(BaseModel):
    action_type: str | None = Field(default=None, min_length=1, max_length=50)
    risk_level: str | None = Field(default=None, min_length=1, max_length=50)
    next_state: str | None = Field(default=None, min_length=1, max_length=100)
    required_slots: list[str] | None = None
    guardrails: list[str] | None = None
    primary_tool: str | None = Field(default=None, max_length=100)
    allowed_tools: list[str] | None = None

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = ["low", "medium", "high", "critical"]
        if v.lower() not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}")
        return v.lower()

    @field_validator("primary_tool")
    @classmethod
    def validate_primary_tool(cls, v: str | None) -> str | None:
        if v is None:
            return v
        from src.tools.registry import ALL_TOOLS
        snake_name = v.replace(".", "_")
        if snake_name not in ALL_TOOLS:
            raise ValueError(f"primary_tool '{v}' does not exist in the tool registry")
        return v

    @field_validator("allowed_tools")
    @classmethod
    def validate_allowed_tools(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        from src.tools.registry import ALL_TOOLS
        for tool in v:
            snake_name = tool.replace(".", "_")
            if snake_name not in ALL_TOOLS:
                raise ValueError(f"allowed_tool '{tool}' does not exist in the tool registry")
        return v


class IntentDefinitionResponse(IntentDefinitionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
