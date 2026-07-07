from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class ProviderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    display_name: str
    adapter_type: str
    base_url: str | None
    default_model: str | None
    is_active: bool


class AiKeyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    provider: str = Field(..., min_length=1, max_length=50)
    base_url: str | None = None
    key_type: Literal["CENTRAL", "COMPANY"] = "CENTRAL"
    company_id: str | None = None
    max_requests_per_day: int = Field(default=1500, ge=1)
    priority: int = Field(default=1, ge=1)
    is_active: bool = True


class AiKeyCreate(AiKeyBase):
    api_key: str = Field(..., min_length=1)
    id: str | None = Field(default=None, min_length=1, max_length=50)


class AiKeyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    api_key: str | None = Field(default=None, min_length=1)
    base_url: str | None = None
    max_requests_per_day: int | None = Field(default=None, ge=1)
    priority: int | None = Field(default=None, ge=1)
    is_active: bool | None = None
    key_type: Literal["CENTRAL", "COMPANY"] | None = None
    company_id: str | None = None


class AiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    provider: str
    base_url: str | None
    is_active: bool
    key_type: str
    company_id: str | None
    max_requests_per_day: int
    current_usage: int
    priority: int
    last_used_at: datetime | None
    last_tested_at: datetime | None
    last_test_status: str | None
    created_at: datetime
    updated_at: datetime
    api_key_masked: str


class AiKeyTestResult(BaseModel):
    id: str
    status: Literal["ok", "error"]
    latency_ms: int | None
    error: str | None
    tested_at: datetime | None


class AiKeyStatusUpdate(BaseModel):
    is_active: bool


class AiModelConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key_id: str
    model_name: str
    is_enabled: bool
    priority: int
    created_at: datetime
    updated_at: datetime


class GlobalConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | uuid.UUID
    default_provider: str | None
    enable_failover: bool
    provider_priority: list[str]
    settings: dict[str, Any]
    updated_at: datetime


class GlobalConfigUpdate(BaseModel):
    default_provider: str | None = None
    enable_failover: bool | None = None
    provider_priority: list[str] | None = None
    settings: dict[str, Any] | None = None


class ProviderPriorityUpdate(BaseModel):
    providers: list[str] = Field(..., min_length=1)


class DashboardStats(BaseModel):
    total_keys: int
    active_keys: int
    keys_by_provider: dict[str, int]
    keys_by_company: dict[str, int]
    requests_today: int
    failures_today: int
    last_24h_success_rate: float


class LogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    key_id: str | None
    action: str
    status: str
    model: str | None
    latency_ms: int | None
    error: str | None
    company_id: str | None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
