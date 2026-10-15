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
    is_active: bool = True
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
    persona_meta: dict[str, Any] = {}
    instructions_soul: str | None = None
    budget: dict[str, Any] = {}
    is_active: bool = True
    tool_choice: str | None = None
    companies_count: int = 0


class AgentCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    company_id: str = Field(..., min_length=1)
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    role: str | None = None
    template_slug: str | None = None
    model: str | None = None
    allowed_tools: list[str] | None = None
    allowed_skills: list[str] | None = None
    allowed_channels: list[str] | None = None
    persona: dict[str, Any] | None = None
    soul: str | None = None
    rules: str | None = None
    guardrails: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    parent_id: str | None = None
    config: dict[str, Any] | None = None
    department: str | None = None
    department_id: str | None = None
    safety_mode: str | None = None



class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    model: str | None = None
    soul: str | None = None
    rules: str | None = None
    soulInstructions: str | None = None
    agentInstructions: str | None = None
    toolsInstructions: str | None = None
    personaInstructions: str | None = None
    allowed_tools: list[str] | None = None
    allowed_skills: list[str] | None = None
    allowed_channels: list[str] | None = None
    persona: dict[str, Any] | None = None
    guardrails: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    config: dict[str, Any] | None = None


class AgentStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "INACTIVE"]


class AgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    company_id: str
    name: str
    role: str
    description: str | None = None
    icon: str | None = None
    soul: str | None = None
    rules: str | None = None
    skills_raw: str | None = Field(default=None, alias="skillsRaw")
    template_slug: str | None = None
    status: Literal["ACTIVE", "INACTIVE", "ARCHIVED"]
    model: str | None = None
    persona: dict[str, Any]
    allowed_tools: list[str]
    allowed_skills: list[str]
    allowed_channels: list[str] = []
    guardrails: dict[str, Any]
    budget: dict[str, Any]
    parent_id: str | None = None
    department_id: str | None = Field(default=None, alias="departmentId")
    department_key: str | None = Field(default=None, alias="departmentKey")
    department_name: str | None = Field(default=None, alias="departmentName")
    department_icon: str | None = Field(default=None, alias="departmentIcon")
    manager_type: str | None = Field(default=None, alias="managerType")
    created_by: str | None = Field(default=None, alias="createdBy")
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
    compiled_system_prompt: str | None = None


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


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    agent_id: str
    title: str
    description: str | None = None
    status: str
    priority: str = "medium"
    checked_out_by: str | None = None
    checked_out_at: datetime | None = None
    completed_at: datetime | None = None
    created_by: str | None = None
    parent_task_id: str | None = None
    trace_id: str | None = None
    task_metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    company_id: str = Field(..., min_length=1)
    agent_id: str | None = None
    title: str = Field(..., min_length=1)
    description: str | None = None
    priority: str = "medium"
    created_by: str | None = None
    parent_task_id: str | None = None
    trace_id: str | None = None
    metadata: dict[str, Any] | None = None


class TaskActionRequest(BaseModel):
    agent_id: str = Field(..., min_length=1)
    result: dict[str, Any] | None = None
    error: str | None = None


class DepartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    key: str
    name: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 100


class AgentSummary(BaseModel):
    id: str
    name: str
    role: str
    status: str = "ACTIVE"
    model: str | None = None
    template_slug: str | None = None
    version: str | None = None
    allowed_tools: list[str] = []
    allowed_skills: list[str] = []
    allowed_channels: list[str] = []


class ProfileSummary(BaseModel):
    slug: str
    name: str
    role: str
    version: str | None = None
    allowed_tools: list[str] = []
    allowed_skills: list[str] = []


class InboxSummary(BaseModel):
    total: int = 0
    active: int = 0
    pending: int = 0
    checked_out: int = 0
    completed: int = 0
    failed: int = 0


class ToolSummary(BaseModel):
    name: str
    description: str = ""
    side_effects: str = "read"
    requires_approval: bool = False
    handler: str = ""


class ManagerContextResponse(BaseModel):
    manager: AgentSummary | None = None
    agents: list[AgentSummary] = []
    profiles: list[ProfileSummary] = []
    tools: list[ToolSummary] = []
    skills: list[dict[str, Any]] = []
    inbox: InboxSummary = Field(default_factory=InboxSummary)


class AgentTemplateCompanyDiff(BaseModel):
    field: str
    type: str  # "modified" | "added" | "removed"
    template_value: Any | None = None
    agent_value: Any | None = None


class AgentTemplateCompany(BaseModel):
    company_id: str
    company_name: str
    agent_id: str
    agent_name: str
    agent_role: str
    agent_status: str
    agent_version: str
    agent_model: str | None = None
    template_slug: str | None = None
    diff_count: int = 0
    diffs: list[AgentTemplateCompanyDiff] = []
    agent: dict[str, Any] | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AgentTemplateCompaniesResponse(BaseModel):
    template_slug: str
    template_name: str
    template_version: str
    total_companies: int
    companies: list[AgentTemplateCompany]


class TeamMapNode(BaseModel):
    id: str
    name: str
    role: str
    status: str = "ACTIVE"
    model: str | None = None
    template_slug: str | None = Field(default=None, alias="templateSlug")
    department_name: str | None = Field(default=None, alias="departmentName")
    department_icon: str | None = Field(default=None, alias="departmentIcon")
    manager_type: str | None = Field(default=None, alias="managerType")
    children: list[TeamMapNode] = []

    model_config = ConfigDict(populate_by_name=True)


class TeamMapResponse(BaseModel):
    success: bool = True
    tree: list[TeamMapNode] = []
    agents: list[AgentSummary] = []
    count: int = 0


class AgentFileTool(BaseModel):
    name: str
    description: str = ""
    sideEffects: str = "read"


class AgentFileSkill(BaseModel):
    id: str
    displayName: str | None = None
    description: str | None = None
    allowedTools: list[str] = []


class AgentFilesResponse(BaseModel):
    success: bool = True
    agent: dict[str, Any]
    profile: dict[str, Any] | None = None
    files: dict[str, str]
    tools: list[AgentFileTool] = []
    skills: list[AgentFileSkill] = []


class AgentFilesSaveRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    role: str | None = None
    model: str | None = None
    allowedTools: list[str] | None = None
    allowedSkills: list[str] | None = None
    allowedChannels: list[str] | None = None
    soulInstructions: str | None = None
    agentInstructions: str | None = None
    toolsInstructions: str | None = None
    personaInstructions: str | None = None
    style: str | None = None
    policies: dict[str, Any] | None = None
    config: dict[str, Any] | None = None
