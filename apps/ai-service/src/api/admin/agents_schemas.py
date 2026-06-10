from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AgentTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    role: str
    name: str
    version: str
    model_policy: dict[str, Any]
    allowed_tools: list[str]
    allowed_skills: list[str]
    channels: list[str]
    guardrails: dict[str, Any]
    persona_meta: dict[str, Any]
    instructions_agents: str | None = None
    instructions_soul: str | None = None
    instructions_tools: str | None = None
    instructions_persona: str | None = None
    human_approval: dict[str, Any]
    handoffs: list[dict[str, Any]]
    mcp_servers: list[dict[str, Any]]
    budget: dict[str, Any]
    output_schema: dict[str, Any] | None = None
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AgentTemplateList(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    role: str
    name: str
    version: str
    channels: list[str]
    allowed_tools: list[str]
    allowed_skills: list[str]


class AgentCreate(BaseModel):
    company_id: str = Field(..., min_length=1)
    name: str | None = None
    role: str | None = None
    template_slug: str | None = None
    model: str | None = None
    allowed_tools: list[str] | None = None
    allowed_skills: list[str] | None = None
    persona: dict[str, Any] | None = None
    guardrails: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    parent_id: str | None = None
    config: dict[str, Any] | None = None


class AgentUpdate(BaseModel):
    name: str | None = None
    model: str | None = None
    allowed_tools: list[str] | None = None
    allowed_skills: list[str] | None = None
    persona: dict[str, Any] | None = None
    guardrails: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    config: dict[str, Any] | None = None


class AgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    name: str
    role: str
    template_slug: str | None = None
    status: Literal["ACTIVE", "INACTIVE", "ARCHIVED"]
    model: str | None = None
    persona: dict[str, Any]
    allowed_tools: list[str]
    allowed_skills: list[str]
    guardrails: dict[str, Any]
    budget: dict[str, Any]
    parent_id: str | None = None
    version: str
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AgentChatAttachment(BaseModel):
    type: str = Field(default="image", min_length=1)
    mime_type: str | None = None
    url: str | None = None
    data_url: str | None = None
    base64_data: str | None = None
    file_id: str | None = None
    name: str | None = None
    detail: Literal["low", "high", "auto", "original"] | None = None
    metadata: dict[str, Any] | None = None


class AgentChatRequest(BaseModel):
    company_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    thread_id: str | None = None
    conversation_id: str | None = None
    customer_id: str | None = None
    channel: str | None = None
    agent_config: dict[str, Any] | None = None
    memory_context: dict[str, Any] | None = None
    attachments: list[AgentChatAttachment] = Field(default_factory=list)


class AgentChatResponse(BaseModel):
    status: Literal["ok", "awaiting_approval", "error"]
    thread_id: str
    reply: str | None = None
    response_attachments: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None
    error_code: str | None = None
    draft_id: str | None = None
    agent_id: str
    agent_role: str
    runtime: str = "agent"
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    pipeline_trace: dict[str, Any] | None = None


class SandboxEvaluateRequest(BaseModel):
    company_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    criteria: list[str] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None
    key_id: str | None = None


class SandboxEvaluateResponse(BaseModel):
    success: bool = True
    scores: dict[str, int]
    overall: int
    comment: str = ""
