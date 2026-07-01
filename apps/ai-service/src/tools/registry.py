from __future__ import annotations

import importlib
import pkgutil
from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool

from src.mcp_integration.registry import get_mcp_registry
from src.skills.integration import SKILL_TOOLS, get_skill_tool_names
from src.tools.names import canonical_tool_name

# -- Auto-discovery ----------------------------------------------------------
# Scan src.tools.definitions for modules exposing __all_tools__ and collect
# every FunctionTool instance automatically. Adding a new domain is now just
# a matter of creating a new module with __all_tools__.
# Private modules (starting with _ but not __) are still discovered because
# they may export tools (e.g. _unlock.py). Only __init__ and __pycache__
# are excluded.

_ALL_DOMAIN_TOOLS: list[FunctionTool] = []
_DEFINITION_MODULE_NAMES: list[str] = []


def _discover_domain_tools() -> list[FunctionTool]:
    """Import every module in src.tools.definitions that exposes __all_tools__
    and return the aggregated list of FunctionTool instances."""
    import src.tools.definitions as _pkg

    tools: list[FunctionTool] = []
    for _importer, module_name, _ispkg in pkgutil.iter_modules(_pkg.__path__):
        if module_name == "__init__" or module_name.startswith("__"):
            continue
        try:
            module = importlib.import_module(f"src.tools.definitions.{module_name}")
        except Exception:
            continue
        module_tools = getattr(module, "__all_tools__", None)
        if module_tools is None:
            continue
        _DEFINITION_MODULE_NAMES.append(module_name)
        tools.extend(module_tools)
    return tools


_ALL_DOMAIN_TOOLS = _discover_domain_tools()

# -- Build ALL_TOOLS dict ----------------------------------------------------

ALL_TOOLS: dict[str, FunctionTool] = {}
for _t in _ALL_DOMAIN_TOOLS + list(SKILL_TOOLS):
    ALL_TOOLS[_t.name] = _t

# -- Tool groupings (name-based, resolved from ALL_TOOLS) ---------------------

CORE_TOOL_NAMES: set[str] = {
    "product_search",
    "category_list",
    "order_lookup",
    "inventory_check",
    "customer_info",
    "shipping_rates",
    "knowledge_search",
    "agent_handoff_to",
    "unlock_advanced_tools",
    "knowledge_ask_merchant",
}

ADVANCED_TOOL_NAMES: set[str] = {
    "product_low_stock",
    "product_top_selling",
    "product_performance",
    "order_summary",
    "order_recent_list",
    "sales_revenue",
    "company_snapshot",
    "competitor_search",
    "competitor_get_products",
    "competitor_price_compare",
    "competitor_get_ads",
    "audit_read",
    "hr_attendance_today",
    # Smart Seller analytics
    "lead_score",
    "abandoned_carts",
    "pipeline_overview",
    "followup_suggestions",
    "deal_params",
    "purchase_prediction",
}

READ_TOOL_NAMES: set[str] = CORE_TOOL_NAMES | ADVANCED_TOOL_NAMES | {
    "category_list",
    "offers_list_active",
    "coupon_validate",
}

WRITE_TOOL_NAMES: set[str] = {
    "product_create",
    "product_update_price",
    "order_create_draft",
    "order_cancel",
    "order_refund",
    "inventory_adjust",
    "discount_create",
    "discount_create_draft",
    "competitor_generate_report",
    "scheduler_create_job",
    "knowledge_create_faq",
    "knowledge_create_policy",
    "facebook_ad_create_draft",
    "message_broadcast",
    "agent_spawn",
    "shipping_update",
}

DIRECT_WRITE_TOOL_NAMES: set[str] = {
    "order_create_confirmed",
}


def _resolve_tool_set(names: set[str]) -> list[FunctionTool]:
    """Resolve a set of tool names to FunctionTool instances from ALL_TOOLS."""
    resolved: list[FunctionTool] = []
    seen: set[str] = set()
    for name in names:
        tool = ALL_TOOLS.get(name)
        if tool and tool.name not in seen:
            resolved.append(tool)
            seen.add(tool.name)
    return resolved


# Set approval modes on write tools
for _name in WRITE_TOOL_NAMES:
    _tool = ALL_TOOLS.get(_name)
    if _tool:
        _tool.approval_mode = "always_require"

for _name in DIRECT_WRITE_TOOL_NAMES:
    _tool = ALL_TOOLS.get(_name)
    if _tool:
        _tool.approval_mode = "never_require"

CORE_TOOLS: list[FunctionTool] = _resolve_tool_set(CORE_TOOL_NAMES)
ADVANCED_TOOLS: list[FunctionTool] = _resolve_tool_set(ADVANCED_TOOL_NAMES)
READ_TOOLS: list[FunctionTool] = _resolve_tool_set(READ_TOOL_NAMES)
WRITE_TOOLS: list[FunctionTool] = _resolve_tool_set(WRITE_TOOL_NAMES)

# -- Backward-compatible re-exports ------------------------------------------
# Import individual tool instances so that existing code doing
#   from src.tools.registry import product_search_tool
# still works. These are resolved from ALL_TOOLS by canonical name.

product_search_tool = ALL_TOOLS.get("product_search")
product_create_tool = ALL_TOOLS.get("product_create")
product_low_stock_tool = ALL_TOOLS.get("product_low_stock")
product_top_selling_tool = ALL_TOOLS.get("product_top_selling")
product_update_price_tool = ALL_TOOLS.get("product_update_price")
product_performance_tool = ALL_TOOLS.get("product_performance")
category_list_tool = ALL_TOOLS.get("category_list")
order_lookup_tool = ALL_TOOLS.get("order_lookup")
order_create_draft_tool = ALL_TOOLS.get("order_create_draft")
order_create_confirmed_tool = ALL_TOOLS.get("order_create_confirmed")
order_summary_tool = ALL_TOOLS.get("order_summary")
order_recent_list_tool = ALL_TOOLS.get("order_recent_list")
order_cancel_tool = ALL_TOOLS.get("order_cancel")
order_refund_tool = ALL_TOOLS.get("order_refund")
customer_info_tool = ALL_TOOLS.get("customer_info")
customer_top_buyers_tool = ALL_TOOLS.get("customer_top_buyers")
inventory_check_tool = ALL_TOOLS.get("inventory_check")
inventory_adjust_tool = ALL_TOOLS.get("inventory_adjust")
sales_revenue_tool = ALL_TOOLS.get("sales_revenue")
company_snapshot_tool = ALL_TOOLS.get("company_snapshot")
discount_create_tool = ALL_TOOLS.get("discount_create")
discount_create_draft_tool = ALL_TOOLS.get("discount_create_draft")
whatsapp_send_tool = ALL_TOOLS.get("whatsapp_send")
competitor_search_tool = ALL_TOOLS.get("competitor_search")
competitor_get_products_tool = ALL_TOOLS.get("competitor_get_products")
competitor_price_compare_tool = ALL_TOOLS.get("competitor_price_compare")
competitor_get_ads_tool = ALL_TOOLS.get("competitor_get_ads")
competitor_generate_report_tool = ALL_TOOLS.get("competitor_generate_report")
knowledge_search_tool = ALL_TOOLS.get("knowledge_search")
scheduler_create_job_tool = ALL_TOOLS.get("scheduler_create_job")
knowledge_create_faq_tool = ALL_TOOLS.get("knowledge_create_faq")
knowledge_create_policy_tool = ALL_TOOLS.get("knowledge_create_policy")
facebook_ad_create_draft_tool = ALL_TOOLS.get("facebook_ad_create_draft")
message_broadcast_tool = ALL_TOOLS.get("message_broadcast")
agent_spawn_tool = ALL_TOOLS.get("agent_spawn")
agent_handoff_to_tool = ALL_TOOLS.get("agent_handoff_to")
audit_read_tool = ALL_TOOLS.get("audit_read")
hr_attendance_today_tool = ALL_TOOLS.get("hr_attendance_today")
unlock_advanced_tools_tool = ALL_TOOLS.get("unlock_advanced_tools")
# Promotion / Offer tools
offers_list_active_tool = ALL_TOOLS.get("offers_list_active")
coupon_validate_tool = ALL_TOOLS.get("coupon_validate")

# Smart Seller tools
lead_score_tool = ALL_TOOLS.get("lead_score")
abandoned_carts_tool = ALL_TOOLS.get("abandoned_carts")
pipeline_overview_tool = ALL_TOOLS.get("pipeline_overview")
followup_suggestions_tool = ALL_TOOLS.get("followup_suggestions")
deal_params_tool = ALL_TOOLS.get("deal_params")
purchase_prediction_tool = ALL_TOOLS.get("purchase_prediction")

# Backward-compatible re-exports of Input models from definitions modules.
from src.tools.definitions.product import (  # noqa: E402 F401
    ProductSearchInput,
    ProductCreateInput,
    ProductLowStockInput,
    ProductTopSellingInput,
    ProductUpdatePriceInput,
    ProductPerformanceInput,
    CategoryListInput,
)
from src.tools.definitions.order import (  # noqa: E402 F401
    OrderLookupInput,
    OrderCreateDraftInput,
    OrderCreateConfirmedInput,
    OrderSummaryInput,
    OrderRecentListInput,
    OrderCancelInput,
    OrderRefundInput,
)
from src.tools.definitions.customer import (  # noqa: E402 F401
    CustomerInfoInput,
    CustomerTopBuyersInput,
)
from src.tools.definitions.inventory import (  # noqa: E402 F401
    InventoryCheckInput,
    InventoryAdjustInput,
)
from src.tools.definitions.sales import (  # noqa: E402 F401
    SalesRevenueInput,
    CompanySnapshotInput,
    DiscountCreateDraftInput,
    DiscountCreateInput,
    WhatsappSendInput,
)
from src.tools.definitions.competitor import (  # noqa: E402 F401
    CompetitorSearchInput,
    CompetitorGetProductsInput,
    CompetitorPriceCompareInput,
    CompetitorGetAdsInput,
    CompetitorGenerateReportInput,
)
from src.tools.definitions.shipping import (  # noqa: E402 F401
    ShippingRatesInput,
    ShippingUpdateInput,
)
from src.tools.definitions.governance import (  # noqa: E402 F401
    SchedulerCreateJobInput,
    KnowledgeCreateFaqInput,
    KnowledgeCreatePolicyInput,
    FacebookAdCreateDraftInput,
    MessageBroadcastInput,
)
from src.tools.definitions.facebook import (  # noqa: E402 F401
    FacebookReplyInput,
)
from src.tools.definitions.agents import (  # noqa: E402 F401
    AgentSpawnInput,
    AgentHandoffToInput,
)
from src.tools.definitions.audit import (  # noqa: E402 F401
    AuditReadInput,
)
from src.tools.definitions.hr import (  # noqa: E402 F401
    HrAttendanceTodayInput,
)
from src.tools.definitions._unlock import (  # noqa: E402 F401
    UnlockAdvancedToolsInput,
    unlock_advanced_tools,
    unlock_advanced_tools_tool,
)
from src.tools.definitions.smart_seller import (  # noqa: E402 F401
    LeadScoreInput,
    AbandonedCartsInput,
    PipelineOverviewInput,
    FollowupSuggestionsInput,
    DealParamsInput,
    PurchasePredictionInput,
)
from src.tools.definitions.promotions import (  # noqa: E402 F401
    OffersListActiveInput,
    CouponValidateInput,
)

# -- Role-based access -------------------------------------------------------

from src.tools.role_config import load_role_tools  # noqa: E402

ROLE_TOOLS: dict[str, list[str]] = load_role_tools()


def get_tools_for_role(role: str) -> list[FunctionTool]:
    role_upper = role.upper()
    tool_names = ROLE_TOOLS.get(role_upper)
    if tool_names is not None:
        return [ALL_TOOLS[n] for n in tool_names if n in ALL_TOOLS]
    # Unknown role: grant only core read tools as a safe default
    return list(CORE_TOOLS)


def get_tool_names_for_role(role: str) -> list[str]:
    role_upper = role.upper()
    tool_names = ROLE_TOOLS.get(role_upper)
    if tool_names is not None:
        return list(tool_names)
    # Unknown role: safe default -- core read tools only
    return sorted(CORE_TOOL_NAMES)


def get_tool_name_list(tools: list[FunctionTool]) -> list[str]:
    return [tool.name for tool in tools]


def resolve_tools_from_names(names: list[str]) -> list[FunctionTool]:
    resolved: list[FunctionTool] = []
    seen: set[str] = set()
    for name in names:
        canonical = canonical_tool_name(name)
        tool = ALL_TOOLS.get(canonical)
        if tool and tool.name not in seen:
            resolved.append(tool)
            seen.add(tool.name)
    return resolved


def get_read_tools() -> list[FunctionTool]:
    return list(READ_TOOLS)


def get_write_tools() -> list[FunctionTool]:
    return list(WRITE_TOOLS)


def get_all_tools() -> list[FunctionTool]:
    from src.tools.manager_tools import get_manager_tools
    return list(ALL_TOOLS.values()) + get_manager_tools() + get_mcp_tools()


def get_tool(name: str) -> FunctionTool | None:
    return ALL_TOOLS.get(canonical_tool_name(name))


async def _mcp_gateway_placeholder(input_data: dict[str, Any]) -> dict[str, Any]:
    return dict(input_data)


def get_mcp_tools() -> list[FunctionTool]:
    tools: list[FunctionTool] = []
    for tool in get_mcp_registry().get_all_tools():
        name = str(tool.get("name") or "")
        if not name.startswith("mcp_"):
            continue
        tools.append(
            FunctionTool(
                name=name,
                description=str(tool.get("description") or ""),
                func=_mcp_gateway_placeholder,
                input_model=tool.get("input_schema") or {"type": "object"},
                approval_mode="never_require",
            )
        )
    return tools
