from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

INTENT_ENUM = [
    "general.chat",
    "implementation.advice",
    "goals.create_product",
    "goals.create_agent_with_skill",
    "agents.run_task",
    "agents.manage",
    "agents.read",
    "audit.read",
    "skills.manage",
    "skills.read",
    "products.manage",
    "orders.create_draft",
    "orders.create_confirmed",
    "orders",
    "inventory",
    "products",
    "shipping.rates",
    "support.exchange",
    "support.refund",
    "support.complaint",
    "customers",
    "sales",
    "company.snapshot",
    "hr.attendance.today",
]

CONFIDENCE_LEVELS = ["high", "medium", "low"]
TOOL_ELIGIBILITY = ["allowed", "blocked", "needs_clarification"]

REASON_CODES = [
    "PRODUCT_NAME_FOUND", "PRODUCT_NAME_AMBIGUOUS", "PRODUCT_NAME_MISSING",
    "CUSTOMER_NAME_FOUND", "CUSTOMER_NAME_MISSING",
    "PHONE_FOUND", "PHONE_INVALID_FORMAT", "PHONE_MISSING",
    "PRICE_FOUND", "PRICE_MISSING",
    "CITY_FOUND", "CITY_MISSING",
    "QUANTITY_FOUND", "QUANTITY_DEFAULT",
    "SIZE_FOUND", "SIZE_MISSING",
    "COLOR_FOUND", "COLOR_MISSING",
    "CONFIRMATION_FOUND", "CONFIRMATION_MISSING",
    "ORDER_NUMBER_FOUND", "ORDER_NUMBER_MISSING",
    "SKILL_NAME_FOUND", "SKILL_NAME_MISSING",
    "AGENT_NAME_FOUND", "AGENT_NAME_MISSING",
    "AGENT_ROLE_FOUND", "AGENT_ROLE_MISSING",
    "INTENT_AMBIGUOUS", "INTENT_CLEAR",
    "SLOTS_COMPLETE", "SLOTS_INCOMPLETE",
    "CONVERSATION_CONTEXT_USED", "EXEMPLAR_MATCH_FOUND",
]

CUSTOMER_CHANNELS = {"FACEBOOK", "MESSENGER", "FB", "WHATSAPP", "WA"}

DEFAULT_GUARDRAILS = ["tenant_scope", "tool_allowlist", "schema_validation", "audit_trail"]

INTENT_POLICIES: dict[str, dict[str, Any]] = {
    "general.chat": {
        "actionType": "chat", "riskLevel": "low", "nextState": "respond",
        "requiredSlots": [], "guardrails": ["no_live_data_claims"],
    },
    "implementation.advice": {
        "actionType": "analysis", "riskLevel": "low", "nextState": "respond",
        "requiredSlots": [], "guardrails": ["no_live_company_data"],
    },
    "goals.create_product": {
        "actionType": "write", "riskLevel": "high", "nextState": "execute_saved_goal",
        "requiredSlots": ["name", "price"],
        "guardrails": [*DEFAULT_GUARDRAILS, "draft_only_review_required", "idempotency"],
    },
    "goals.create_agent_with_skill": {
        "actionType": "workflow", "riskLevel": "high", "nextState": "execute_saved_goal",
        "requiredSlots": ["agent", "skill"],
        "guardrails": [*DEFAULT_GUARDRAILS, "explicit_user_confirmation", "least_privilege_tools"],
    },
    "agents.run_task": {
        "actionType": "handoff", "riskLevel": "medium", "nextState": "delegate_to_specialist",
        "requiredSlots": ["task"],
        "guardrails": [*DEFAULT_GUARDRAILS, "specialist_tool_scope"],
    },
    "agents.manage": {
        "actionType": "workflow", "riskLevel": "high", "nextState": "agent_control_plane",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "least_privilege_tools", "state_machine_or_role_slot"],
    },
    "agents.read": {
        "actionType": "read", "riskLevel": "low", "nextState": "read_current_state",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "audit.read": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_audit_trail",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS, "append_only_audit"],
    },
    "skills.manage": {
        "actionType": "write", "riskLevel": "high", "nextState": "create_or_update_skill",
        "requiredSlots": ["displayName", "description"],
        "guardrails": [*DEFAULT_GUARDRAILS, "controlled_skill_write", "allowed_tool_subset"],
    },
    "skills.read": {
        "actionType": "read", "riskLevel": "low", "nextState": "read_skill_registry",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "products.manage": {
        "actionType": "write", "riskLevel": "high", "nextState": "create_product_draft",
        "requiredSlots": ["name", "price"],
        "guardrails": [*DEFAULT_GUARDRAILS, "draft_only_review_required", "conflict_check"],
    },
    "orders.create_draft": {
        "actionType": "write", "riskLevel": "high", "nextState": "create_order_draft_pending_approval",
        "requiredSlots": ["productName", "productPrice", "customerName", "customerPhone"],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_approval", "conflict_check"],
    },
    "orders.create_confirmed": {
        "actionType": "write", "riskLevel": "high", "nextState": "create_confirmed_order",
        "requiredSlots": ["productName", "productPrice", "customerName", "customerPhone", "city", "confirmedByCustomer"],
        "guardrails": [*DEFAULT_GUARDRAILS, "explicit_customer_confirmation", "idempotency", "conflict_check"],
    },
    "orders": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_order_data",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "inventory": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_inventory_data",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "products": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_catalog_data",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "shipping.rates": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_shipping_rate",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "support.exchange": {
        "actionType": "handoff", "riskLevel": "high", "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "no_policy_promise"],
    },
    "support.refund": {
        "actionType": "handoff", "riskLevel": "high", "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "refund_requires_review"],
    },
    "support.complaint": {
        "actionType": "handoff", "riskLevel": "high", "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "complaint_review"],
    },
    "customers": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_customer_data",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "sales": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_sales_data",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "company.snapshot": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_company_snapshot",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "hr.attendance.today": {
        "actionType": "read", "riskLevel": "medium", "nextState": "read_hr_attendance",
        "requiredSlots": [], "guardrails": [*DEFAULT_GUARDRAILS],
    },
}

INTENT_CONFIGURED_TOOLS: dict[str, dict[str, Any]] = {
    "orders.create_draft": {
        "primaryTool": "order_create_draft",
        "allowedTools": ["order_create_draft", "product_search", "customer_info"],
    },
    "orders": {
        "primaryTool": "order_lookup",
        "allowedTools": ["order_lookup", "order_summary", "order_recent_list"],
    },
    "inventory": {
        "primaryTool": "product_low_stock",
        "allowedTools": ["product_low_stock", "inventory_check", "product_search"],
    },
    "products": {
        "primaryTool": "product_search",
        "allowedTools": ["product_search", "product_low_stock", "product_top_selling", "inventory_check"],
    },
    "shipping.rates": {
        "primaryTool": "shipping_rates",
        "allowedTools": ["shipping_rates"],
    },
    "support.complaint": {
        "primaryTool": "agent_handoff_to",
        "allowedTools": ["agent_handoff_to", "order_lookup", "customer_info"],
    },
    "support.refund": {
        "primaryTool": "agent_handoff_to",
        "allowedTools": ["agent_handoff_to", "order_lookup", "customer_info"],
    },
    "support.exchange": {
        "primaryTool": "agent_handoff_to",
        "allowedTools": ["agent_handoff_to", "order_lookup", "customer_info"],
    },
    "products.manage": {
        "primaryTool": "product_create",
        "allowedTools": ["product_create", "product_search", "inventory_check"],
    },
    "hr.attendance.today": {
        "primaryTool": "hr_attendance_today",
        "allowedTools": ["hr_attendance_today"],
    },
    "agents.manage": {
        "primaryTool": "agent_spawn",
        "allowedTools": ["agent_spawn", "skill_create", "agent_read_state", "agent_update_profile", "agent_list_agents", "agent_run_task", "agent_assign_task"],
    },
    "agents.read": {
        "primaryTool": "agent_list_agents",
        "allowedTools": ["agent_list_agents", "agent_read_state"],
    },
    "skills.manage": {
        "primaryTool": "skill_create",
        "allowedTools": ["skill_create", "agent_read_state", "agent_update_profile", "agent_list_agents"],
    },
    "sales": {
        "primaryTool": "sales_revenue",
        "allowedTools": ["sales_revenue", "company_snapshot"],
    },
    "customers": {
        "primaryTool": "customer_info",
        "allowedTools": ["customer_info", "customer_top_buyers"],
    },
    "company.snapshot": {
        "primaryTool": "company_snapshot",
        "allowedTools": ["company_snapshot", "sales_revenue"],
    },
}

DECISION_MAP = {
    "chat": "answer",
    "analysis": "answer",
    "read": "execute_tool",
    "write": "execute_tool",
    "workflow": "execute_tool",
    "handoff": "delegate",
}


@dataclass
class ClassifierResult:
    intent: str = "general.chat"
    confidence: float = 0.8
    confidenceLevel: str = "medium"
    ambiguous: bool = False
    clarificationQuestion: str | None = None
    slots: dict[str, Any] = field(default_factory=dict)
    missingSlots: list[str] = field(default_factory=list)
    toolEligibility: str = "allowed"
    reasonCodes: list[str] = field(default_factory=list)
    alternativeIntents: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class IntentContract:
    schemaVersion: str = "2026-05-model-intent-v2"
    intent: str = "general.chat"
    confidence: float = 0.66
    source: str = "semantic-chat"
    decision: str = "answer"
    actionType: str = "chat"
    riskLevel: str = "low"
    requiresTool: bool = False
    route: dict[str, Any] = field(default_factory=lambda: {"primaryTool": None, "allowedTools": [], "blockedTools": []})
    requiredSlots: list[str] = field(default_factory=list)
    missingSlots: list[str] = field(default_factory=list)
    guardrails: list[str] = field(default_factory=list)
    reason: str = ""


@dataclass
class ToolPlan:
    intent: str = "general.chat"
    requiresTool: bool = False
    primaryTool: str | None = None
    allowedTools: list[str] = field(default_factory=list)
    blockedTools: list[str] = field(default_factory=list)
    reason: str = ""
    goalRunId: str | None = None
    selectionScore: float | None = None
    classification: dict[str, Any] | None = None
    alternatives: list[dict[str, Any]] = field(default_factory=list)
    missingSlots: list[str] = field(default_factory=list)
    ambiguous: bool = False
    trustedLocalRoute: bool = False
    blockedReason: str | None = None


def get_policy(intent: str) -> dict[str, Any]:
    return INTENT_POLICIES.get(intent) or INTENT_POLICIES["general.chat"]


def is_customer_channel(channel: str | None) -> bool:
    return (channel or "").strip().upper() in CUSTOMER_CHANNELS
