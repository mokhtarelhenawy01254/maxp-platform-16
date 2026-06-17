"""
@module intent.schema
@description Canonical intent classification schema for LLM structured output.
Defines the unified contract for intent + slot extraction across all providers.
All enum values are English. No customer-facing text in schema.

This file is the Python counterpart to Node.js intentClassificationSchema.js.
Both files should be kept in sync until Node.js migrates to Python.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

SCHEMA_VERSION = "1.0.0"


class Intent(str, Enum):
    """Intent enum - all possible intents the classifier can return."""
    GENERAL_CHAT = "general.chat"
    IMPLEMENTATION_ADVICE = "implementation.advice"
    GOALS_CREATE_PRODUCT = "goals.create_product"
    GOALS_CREATE_AGENT_WITH_SKILL = "goals.create_agent_with_skill"
    AGENTS_RUN_TASK = "agents.run_task"
    AGENTS_MANAGE = "agents.manage"
    AGENTS_READ = "agents.read"
    AUDIT_READ = "audit.read"
    SKILLS_MANAGE = "skills.manage"
    SKILLS_READ = "skills.read"
    PRODUCTS_MANAGE = "products.manage"
    ORDERS_CREATE_DRAFT = "orders.create_draft"
    ORDERS_CREATE_CONFIRMED = "orders.create_confirmed"
    ORDERS = "orders"
    ORDERS_CANCEL = "orders.cancel"
    ORDERS_REFUND = "orders.refund"
    INVENTORY = "inventory"
    PRODUCTS = "products"
    CATALOG_CATEGORIES = "catalog.categories"
    SHIPPING_RATES = "shipping.rates"
    SUPPORT_EXCHANGE = "support.exchange"
    SUPPORT_REFUND = "support.refund"
    SUPPORT_COMPLAINT = "support.complaint"
    CUSTOMERS = "customers"
    SALES = "sales"
    COMPANY_SNAPSHOT = "company.snapshot"
    HR_ATTENDANCE_TODAY = "hr.attendance.today"


class ConfidenceLevel(str, Enum):
    """Confidence levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ToolEligibility(str, Enum):
    """Tool eligibility status."""
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    NEEDS_CLARIFICATION = "needs_clarification"


class ReasonCode(str, Enum):
    """Reason codes for classification decisions."""
    PRODUCT_NAME_FOUND = "PRODUCT_NAME_FOUND"
    PRODUCT_NAME_AMBIGUOUS = "PRODUCT_NAME_AMBIGUOUS"
    PRODUCT_NAME_MISSING = "PRODUCT_NAME_MISSING"
    CUSTOMER_NAME_FOUND = "CUSTOMER_NAME_FOUND"
    CUSTOMER_NAME_MISSING = "CUSTOMER_NAME_MISSING"
    PHONE_FOUND = "PHONE_FOUND"
    PHONE_INVALID_FORMAT = "PHONE_INVALID_FORMAT"
    PHONE_MISSING = "PHONE_MISSING"
    PRICE_FOUND = "PRICE_FOUND"
    PRICE_MISSING = "PRICE_MISSING"
    CITY_FOUND = "CITY_FOUND"
    CITY_MISSING = "CITY_MISSING"
    QUANTITY_FOUND = "QUANTITY_FOUND"
    QUANTITY_DEFAULT = "QUANTITY_DEFAULT"
    SIZE_FOUND = "SIZE_FOUND"
    SIZE_MISSING = "SIZE_MISSING"
    COLOR_FOUND = "COLOR_FOUND"
    COLOR_MISSING = "COLOR_MISSING"
    CONFIRMATION_FOUND = "CONFIRMATION_FOUND"
    CONFIRMATION_MISSING = "CONFIRMATION_MISSING"
    ORDER_NUMBER_FOUND = "ORDER_NUMBER_FOUND"
    ORDER_NUMBER_MISSING = "ORDER_NUMBER_MISSING"
    SKILL_NAME_FOUND = "SKILL_NAME_FOUND"
    SKILL_NAME_MISSING = "SKILL_NAME_MISSING"
    AGENT_NAME_FOUND = "AGENT_NAME_FOUND"
    AGENT_NAME_MISSING = "AGENT_NAME_MISSING"
    AGENT_ROLE_FOUND = "AGENT_ROLE_FOUND"
    AGENT_ROLE_MISSING = "AGENT_ROLE_MISSING"
    INTENT_AMBIGUOUS = "INTENT_AMBIGUOUS"
    INTENT_CLEAR = "INTENT_CLEAR"
    SLOTS_COMPLETE = "SLOTS_COMPLETE"
    SLOTS_INCOMPLETE = "SLOTS_INCOMPLETE"
    CONVERSATION_CONTEXT_USED = "CONVERSATION_CONTEXT_USED"
    EXEMPLAR_MATCH_FOUND = "EXEMPLAR_MATCH_FOUND"
    CLASSIFIER_UNAVAILABLE = "CLASSIFIER_UNAVAILABLE"


INTENT_ENUM = [e.value for e in Intent]
CONFIDENCE_ENUM = [e.value for e in ConfidenceLevel]
TOOL_ELIGIBILITY_ENUM = [e.value for e in ToolEligibility]
REASON_CODE_ENUM = [e.value for e in ReasonCode]

CONFIDENCE_LEVELS = CONFIDENCE_ENUM
TOOL_ELIGIBILITY = TOOL_ELIGIBILITY_ENUM
REASON_CODES = REASON_CODE_ENUM

CUSTOMER_CHANNELS = {"CHAT", "FACEBOOK", "MESSENGER", "FB", "WHATSAPP", "WA"}
ADMIN_CHANNELS = {"ADMIN", "INTERNAL", "DEV", "TEST"}

DEFAULT_GUARDRAILS = ["tenant_scope", "tool_allowlist", "schema_validation", "audit_trail"]

INTENT_POLICIES: dict[str, dict[str, Any]] = {
    "general.chat": {
        "actionType": "chat",
        "riskLevel": "low",
        "nextState": "respond",
        "requiredSlots": [],
        "guardrails": ["no_live_data_claims"],
    },
    "implementation.advice": {
        "actionType": "analysis",
        "riskLevel": "low",
        "nextState": "respond",
        "requiredSlots": [],
        "guardrails": ["no_live_company_data"],
    },
    "goals.create_product": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "execute_saved_goal",
        "requiredSlots": ["name", "price"],
        "guardrails": [*DEFAULT_GUARDRAILS, "draft_only_review_required", "idempotency"],
    },
    "goals.create_agent_with_skill": {
        "actionType": "workflow",
        "riskLevel": "high",
        "nextState": "execute_saved_goal",
        "requiredSlots": ["agent", "skill"],
        "guardrails": [*DEFAULT_GUARDRAILS, "explicit_user_confirmation", "least_privilege_tools"],
    },
    "agents.run_task": {
        "actionType": "handoff",
        "riskLevel": "medium",
        "nextState": "delegate_to_specialist",
        "requiredSlots": ["task"],
        "guardrails": [*DEFAULT_GUARDRAILS, "specialist_tool_scope"],
    },
    "agents.manage": {
        "actionType": "workflow",
        "riskLevel": "high",
        "nextState": "agent_control_plane",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "least_privilege_tools", "state_machine_or_role_slot"],
    },
    "agents.read": {
        "actionType": "read",
        "riskLevel": "low",
        "nextState": "read_current_state",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "audit.read": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_audit_trail",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "append_only_audit"],
    },
    "skills.manage": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "create_or_update_skill",
        "requiredSlots": ["displayName", "description"],
        "guardrails": [*DEFAULT_GUARDRAILS, "controlled_skill_write", "allowed_tool_subset"],
    },
    "skills.read": {
        "actionType": "read",
        "riskLevel": "low",
        "nextState": "read_skill_registry",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "products.manage": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "create_product_draft",
        "requiredSlots": ["name", "price"],
        "guardrails": [*DEFAULT_GUARDRAILS, "draft_only_review_required", "conflict_check"],
    },
    "orders.create_draft": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "create_order_draft_pending_approval",
        "requiredSlots": ["productName", "productPrice", "customerName", "customerPhone"],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_approval", "conflict_check"],
    },
    "orders.create_confirmed": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "create_confirmed_order",
        "requiredSlots": [
            "productName",
            "productPrice",
            "customerName",
            "customerPhone",
            "city",
            "confirmedByCustomer",
        ],
        "guardrails": [
            *DEFAULT_GUARDRAILS,
            "explicit_customer_confirmation",
            "idempotency",
            "conflict_check",
        ],
    },
    "orders": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_order_data",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "orders.cancel": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "cancel_order",
        "requiredSlots": ["orderNumber", "cancelReason"],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_approval"],
    },
    "orders.refund": {
        "actionType": "write",
        "riskLevel": "high",
        "nextState": "refund_order",
        "requiredSlots": ["orderNumber", "refundReason"],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_approval", "refund_requires_review"],
    },
    "inventory": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_inventory_data",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "products": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_catalog_data",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "catalog.categories": {
        "actionType": "read",
        "riskLevel": "low",
        "nextState": "read_catalog_categories",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "shipping.rates": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_shipping_rate",
        "requiredSlots": ["governorate"],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "support.exchange": {
        "actionType": "handoff",
        "riskLevel": "high",
        "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "no_policy_promise"],
    },
    "support.refund": {
        "actionType": "handoff",
        "riskLevel": "high",
        "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "refund_requires_review"],
    },
    "support.complaint": {
        "actionType": "handoff",
        "riskLevel": "high",
        "nextState": "handoff_to_human",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS, "human_in_the_loop", "complaint_review"],
    },
    "customers": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_customer_data",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "sales": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_sales_data",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "company.snapshot": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_company_snapshot",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
    "hr.attendance.today": {
        "actionType": "read",
        "riskLevel": "medium",
        "nextState": "read_hr_attendance",
        "requiredSlots": [],
        "guardrails": [*DEFAULT_GUARDRAILS],
    },
}

INTENT_CONFIGURED_TOOLS: dict[str, dict[str, Any]] = {
    "orders.create_draft": {
        "primaryTool": "order_create_draft",
        "allowedTools": ["order_create_draft", "product_search", "customer_info"],
    },
    "orders.create_confirmed": {
        "primaryTool": "order_create_confirmed",
        "allowedTools": [
            "order_create_confirmed",
            "order_create_draft",
            "inventory_check",
            "product_search",
            "shipping_rates",
            "customer_info",
        ],
    },
    "orders": {
        "primaryTool": "order_lookup",
        "allowedTools": ["order_lookup", "order_summary", "order_recent_list"],
    },
    "orders.cancel": {
        "primaryTool": "order_cancel",
        "allowedTools": ["order_cancel", "order_lookup", "customer_info"],
    },
    "orders.refund": {
        "primaryTool": "order_refund",
        "allowedTools": ["order_refund", "order_lookup", "customer_info"],
    },
    "inventory": {
        "primaryTool": "inventory_check",
        "allowedTools": ["inventory_check", "product_search", "product_low_stock"],
    },
    "products": {
        "primaryTool": "product_search",
        "allowedTools": [
            "product_search",
            "category_list",
            "product_low_stock",
            "product_top_selling",
            "inventory_check",
        ],
    },
    "catalog.categories": {
        "primaryTool": "category_list",
        "allowedTools": [
            "category_list",
            "product_search",
        ],
    },
    "products.read": {
        "primaryTool": "product_search",
        "allowedTools": [
            "product_search",
            "category_list",
            "product_low_stock",
            "product_top_selling",
            "inventory_check",
        ],
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
        "allowedTools": [
            "agent_spawn",
            "skill_create",
            "agent_read_state",
            "agent_update_profile",
            "agent_list_agents",
            "agent_run_task",
            "agent_assign_task",
        ],
    },
    "agents.read": {
        "primaryTool": "agent_list_agents",
        "allowedTools": ["agent_list_agents", "agent_read_state"],
    },
    "skills.manage": {
        "primaryTool": "skill_create",
        "allowedTools": [
            "skill_create",
            "agent_read_state",
            "agent_update_profile",
            "agent_list_agents",
        ],
    },
    "sales": {
        "primaryTool": "company_snapshot",
        "allowedTools": ["company_snapshot", "sales_revenue", "order_summary", "order_recent_list"],
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
class SlotValues:
    """Extracted slot values from the message."""
    productName: str | None = None
    productPrice: float | None = None
    productSize: str | None = None
    productColor: str | None = None
    quantity: int | None = None
    customerName: str | None = None
    customerPhone: str | None = None
    governorate: str | None = None
    city: str | None = None
    address: str | None = None
    orderNumber: str | None = None
    confirmedByCustomer: bool | None = None
    skillName: str | None = None
    skillDescription: str | None = None
    agentName: str | None = None
    agentRole: str | None = None
    taskDescription: str | None = None
    requestedProductImage: bool | None = None
    referencesPreviousProduct: bool | None = None
    shippingDestination: str | None = None
    exchangeReason: str | None = None
    cancelReason: str | None = None
    refundReason: str | None = None
    complaintDetails: str | None = None
    listAll: bool | None = None


@dataclass
class ToolEligibilityResult:
    status: ToolEligibility
    blockedReason: str | None = None
    requiredTool: str | None = None


@dataclass
class AlternativeIntent:
    intent: str
    confidence: float


@dataclass
class ClassifierResult:
    intent: str = Intent.GENERAL_CHAT.value
    confidence: float = 0.8
    confidenceLevel: str = ConfidenceLevel.MEDIUM.value
    ambiguous: bool = False
    clarificationQuestion: str | None = None
    slots: dict[str, Any] = field(default_factory=dict)
    missingSlots: list[str] = field(default_factory=list)
    toolEligibility: str = ToolEligibility.ALLOWED.value
    reasonCodes: list[str] = field(default_factory=list)
    alternativeIntents: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class IntentContract:
    schemaVersion: str = "2026-05-model-intent-v2"
    intent: str = Intent.GENERAL_CHAT.value
    confidence: float = 0.66
    source: str = "semantic-chat"
    decision: str = "answer"
    actionType: str = "chat"
    riskLevel: str = "low"
    requiresTool: bool = False
    route: dict[str, Any] = field(
        default_factory=lambda: {"primaryTool": None, "allowedTools": [], "blockedTools": []}
    )
    requiredSlots: list[str] = field(default_factory=list)
    missingSlots: list[str] = field(default_factory=list)
    slots: dict[str, Any] = field(default_factory=dict)
    classification: dict[str, Any] = field(default_factory=dict)
    guardrails: list[str] = field(default_factory=list)
    reason: str = ""


@dataclass
class ToolPlan:
    intent: str = Intent.GENERAL_CHAT.value
    requiresTool: bool = False
    primaryTool: str | None = None
    allowedTools: list[str] = field(default_factory=list)
    blockedTools: list[str] = field(default_factory=list)
    reason: str = ""
    goalRunId: str | None = None
    selectionScore: float | None = None
    confidence: float = 0.0
    confidenceLevel: str = ""
    clarificationQuestion: str | None = None
    classification: dict[str, Any] | None = None
    alternatives: list[dict[str, Any]] = field(default_factory=list)
    missingSlots: list[str] = field(default_factory=list)
    slots: dict[str, Any] = field(default_factory=dict)
    ambiguous: bool = False
    trustedLocalRoute: bool = False
    blockedReason: str | None = None


@dataclass
class IntentClassificationResult:
    """Canonical intent classification result."""
    schemaVersion: str = SCHEMA_VERSION
    intent: str = Intent.GENERAL_CHAT.value
    confidence: float = 0.0
    confidenceLevel: str = ConfidenceLevel.LOW.value
    slots: dict[str, Any] = field(default_factory=dict)
    missingSlots: list[str] = field(default_factory=list)
    ambiguity: bool = False
    clarificationQuestion: str | None = None
    toolEligibility: ToolEligibility | None = None
    reasonCodes: list[str] = field(default_factory=list)
    alternativeIntents: list[AlternativeIntent] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        result = {
            "schemaVersion": self.schemaVersion,
            "intent": self.intent,
            "confidence": self.confidence,
            "confidenceLevel": self.confidenceLevel,
            "slots": self.slots,
            "missingSlots": self.missingSlots,
            "ambiguity": self.ambiguity,
            "clarificationQuestion": self.clarificationQuestion,
            "toolEligibility": {
                "status": self.toolEligibility.value if self.toolEligibility else None,
                "blockedReason": None,
                "requiredTool": None,
            } if self.toolEligibility else None,
            "reasonCodes": self.reasonCodes,
            "alternativeIntents": [
                {"intent": a.intent, "confidence": a.confidence}
                for a in self.alternativeIntents
            ],
        }
        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> IntentClassificationResult:
        tool_eligibility = None
        if data.get("toolEligibility"):
            status_str = data["toolEligibility"].get("status", "blocked")
            try:
                tool_eligibility = ToolEligibility(status_str)
            except ValueError:
                tool_eligibility = ToolEligibility.BLOCKED

        alternative_intents = []
        for alt in data.get("alternativeIntents", []):
            if isinstance(alt, dict):
                alternative_intents.append(
                    AlternativeIntent(intent=alt.get("intent", ""), confidence=alt.get("confidence", 0.0))
                )

        return cls(
            schemaVersion=data.get("schemaVersion", SCHEMA_VERSION),
            intent=data.get("intent", Intent.GENERAL_CHAT.value),
            confidence=data.get("confidence", 0.0),
            confidenceLevel=data.get("confidenceLevel", ConfidenceLevel.LOW.value),
            slots=data.get("slots", {}),
            missingSlots=data.get("missingSlots", []),
            ambiguity=data.get("ambiguity", False),
            clarificationQuestion=data.get("clarificationQuestion"),
            toolEligibility=tool_eligibility,
            reasonCodes=data.get("reasonCodes", []),
            alternativeIntents=alternative_intents,
        )


INTENT_CLASSIFICATION_SCHEMA = {
    "type": "object",
    "required": [
        "schemaVersion",
        "intent",
        "confidence",
        "confidenceLevel",
        "slots",
        "missingSlots",
        "ambiguity",
        "clarificationQuestion",
        "toolEligibility",
        "reasonCodes",
        "alternativeIntents",
    ],
    "additionalProperties": False,
    "properties": {
        "schemaVersion": {"type": "string", "const": SCHEMA_VERSION},
        "intent": {"type": "string", "enum": INTENT_ENUM},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "confidenceLevel": {"type": "string", "enum": CONFIDENCE_ENUM},
        "slots": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "productName",
                "productPrice",
                "productSize",
                "productColor",
                "quantity",
                "customerName",
                "customerPhone",
                "governorate",
                "city",
                "address",
                "orderNumber",
                "confirmedByCustomer",
                "skillName",
                "skillDescription",
                "agentName",
                "agentRole",
                "taskDescription",
                "requestedProductImage",
                "referencesPreviousProduct",
                "shippingDestination",
                "exchangeReason",
                "cancelReason",
                "refundReason",
                "complaintDetails",
                "listAll",
            ],
            "properties": {
                "productName": {"type": ["string", "null"]},
                "productPrice": {"type": ["number", "null"]},
                "productSize": {"type": ["string", "null"]},
                "productColor": {"type": ["string", "null"]},
                "quantity": {"type": ["number", "null"]},
                "customerName": {"type": ["string", "null"]},
                "customerPhone": {"type": ["string", "null"]},
                "governorate": {"type": ["string", "null"]},
                "city": {"type": ["string", "null"]},
                "address": {"type": ["string", "null"]},
                "orderNumber": {"type": ["string", "null"]},
                "confirmedByCustomer": {"type": ["boolean", "null"]},
                "skillName": {"type": ["string", "null"]},
                "skillDescription": {"type": ["string", "null"]},
                "agentName": {"type": ["string", "null"]},
                "agentRole": {"type": ["string", "null"]},
                "taskDescription": {"type": ["string", "null"]},
                "requestedProductImage": {"type": ["boolean", "null"]},
                "referencesPreviousProduct": {"type": ["boolean", "null"]},
                "shippingDestination": {"type": ["string", "null"]},
                "exchangeReason": {"type": ["string", "null"]},
                "cancelReason": {"type": ["string", "null"]},
                "refundReason": {"type": ["string", "null"]},
                "complaintDetails": {"type": ["string", "null"]},
                "listAll": {"type": ["boolean", "null"]},
            },
        },
        "missingSlots": {"type": "array", "items": {"type": "string"}},
        "ambiguity": {"type": "boolean"},
        "clarificationQuestion": {"type": ["string", "null"]},
        "toolEligibility": {
            "type": "object",
            "required": ["status", "blockedReason", "requiredTool"],
            "additionalProperties": False,
            "properties": {
                "status": {"type": "string", "enum": TOOL_ELIGIBILITY_ENUM},
                "blockedReason": {"type": ["string", "null"]},
                "requiredTool": {"type": ["string", "null"]},
            },
        },
        "reasonCodes": {"type": "array", "items": {"type": "string"}},
        "alternativeIntents": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["intent", "confidence"],
                "additionalProperties": False,
                "properties": {
                    "intent": {"type": "string", "enum": INTENT_ENUM},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
            },
        },
    },
}


def get_provider_schema(provider: str) -> dict[str, Any]:
    """Get the JSON Schema for a specific provider."""
    if provider == "openai":
        return get_openai_schema()
    elif provider == "gemini":
        return get_gemini_schema()
    elif provider == "anthropic":
        return get_anthropic_schema()
    else:
        return INTENT_CLASSIFICATION_SCHEMA


def get_openai_schema() -> dict[str, Any]:
    """OpenAI structured output schema. Uses json_schema response format."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "intent_classification",
            "strict": True,
            "schema": INTENT_CLASSIFICATION_SCHEMA,
        },
    }


def get_gemini_schema() -> dict[str, Any]:
    """Gemini response schema. Uses response_schema with application/json mime type."""
    return {
        "responseMimeType": "application/json",
        "responseSchema": _convert_to_gemini_schema(INTENT_CLASSIFICATION_SCHEMA),
    }


def _convert_to_gemini_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Convert canonical schema to Gemini-compatible format."""
    import copy
    gemini_schema = copy.deepcopy(schema)

    properties = gemini_schema.get("properties", {})
    for key, prop in properties.items():
        if "type" in prop and isinstance(prop["type"], list):
            non_null_types = [t for t in prop["type"] if t != "null"]
            prop["type"] = non_null_types[0] if non_null_types else "string"

        if "properties" in prop:
            prop["properties"] = _convert_to_gemini_schema(prop)["properties"]

    return gemini_schema


def get_anthropic_schema() -> dict[str, Any]:
    """Anthropic tool use schema. Uses input_schema for tool definition."""
    return {
        "name": "classify_intent",
        "description": "Classify user intent and extract slots from the message",
        "input_schema": INTENT_CLASSIFICATION_SCHEMA,
    }


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str]


def validate_classification_result(result: dict[str, Any]) -> ValidationResult:
    """Validate a classification result against the schema."""
    errors: list[str] = []

    if not result or not isinstance(result, dict):
        return ValidationResult(valid=False, errors=["Result is not an object"])

    required_fields = ["intent", "confidence", "slots", "missingSlots", "toolEligibility", "reasonCodes"]
    for field_name in required_fields:
        if field_name not in result or result.get(field_name) is None:
            errors.append(f"Missing required field: {field_name}")

    if result.get("intent") and result["intent"] not in INTENT_ENUM:
        errors.append(f"Invalid intent: {result['intent']}")

    confidence = result.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
            errors.append(f"Invalid confidence: {confidence}")

    if result.get("slots") and not isinstance(result["slots"], dict):
        errors.append("slots must be an object")

    if result.get("missingSlots") and not isinstance(result["missingSlots"], list):
        errors.append("missingSlots must be an array")

    tool_eligibility = result.get("toolEligibility")
    if tool_eligibility:
        status = tool_eligibility.get("status") if isinstance(tool_eligibility, dict) else None
        if not status or status not in TOOL_ELIGIBILITY_ENUM:
            errors.append(f"Invalid toolEligibility.status: {status}")

    if result.get("reasonCodes") and not isinstance(result["reasonCodes"], list):
        errors.append("reasonCodes must be an array")

    return ValidationResult(valid=len(errors) == 0, errors=errors)


def create_fallback_result(reason: str = "CLASSIFIER_UNAVAILABLE") -> dict[str, Any]:
    """Create a default classification result for fallback."""
    return {
        "schemaVersion": SCHEMA_VERSION,
        "intent": Intent.GENERAL_CHAT.value,
        "confidence": 0.1,
        "confidenceLevel": ConfidenceLevel.LOW.value,
        "slots": {},
        "missingSlots": [],
        "ambiguity": True,
        "clarificationQuestion": None,
        "toolEligibility": {
            "status": ToolEligibility.BLOCKED.value,
            "blockedReason": reason,
            "requiredTool": None,
        },
        "reasonCodes": [ReasonCode.INTENT_AMBIGUOUS.value],
        "alternativeIntents": [],
    }


def get_policy(intent: str) -> dict[str, Any]:
    return INTENT_POLICIES.get(intent) or INTENT_POLICIES[Intent.GENERAL_CHAT.value]


def is_admin_channel(channel: str | None) -> bool:
    return (channel or "").strip().upper() in ADMIN_CHANNELS


def is_customer_channel(channel: str | None) -> bool:
    return (channel or "").strip().upper() in CUSTOMER_CHANNELS
