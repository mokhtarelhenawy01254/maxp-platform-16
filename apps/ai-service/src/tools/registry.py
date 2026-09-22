from __future__ import annotations

import importlib
import pkgutil
from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool

from src.mcp_integration.registry import get_mcp_registry
from src.skills.integration import SKILL_TOOLS, get_skill_tool_names
from src.skills.registry import get_skill_registry
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

# -- Register all tools in SkillRegistry ----------------------------------

_registry = get_skill_registry()
for _t in _ALL_DOMAIN_TOOLS + list(SKILL_TOOLS):
    _registry.register_tool(_t)

# -- Tool groupings ----------------------------------------------------------

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
    "facebook_ad_analyze_product",
    "facebook_ad_get_decision",
    "facebook_ad_record_learned_rule",
    "facebook_ad_account_info",
    "orders_campaign_attribution_report",
    # Smart Seller analytics
    "lead_score",
    "abandoned_carts",
    "pipeline_overview",
    "followup_suggestions",
    "deal_params",
    "purchase_prediction",
    # Storefront management
    "conversion_tools_read",
    "payment_settings_read",
}

READ_TOOL_NAMES: set[str] = CORE_TOOL_NAMES | ADVANCED_TOOL_NAMES | {
    "category_list",
    "offers_list_active",
    "coupon_validate",
    "shipping_company_governorates",
    "shipping_company_areas",
    "search_area_by_text",
    "order_lookup_by_phone",
    "session_search",
    "delegate_task",
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
    "facebook_ad_create_full_draft",
    "facebook_ad_publish_draft",
    "message_broadcast",
    "agent_spawn",
    "shipping_update",
    "hotel_reserve",
    "hotel_cancel_reservation",
    # Storefront management
    "conversion_tool_toggle",
    "conversion_tool_set_threshold",
    "payment_methods_configure",
}

DIRECT_WRITE_TOOL_NAMES: set[str] = {
    "order_create_confirmed",
    "discount_create_draft",
    "facebook_ad_create_full_draft",
    "facebook_ad_publish_draft",
    "knowledge_create_faq",
    "order_confirm",
    "order_update_details",
    "shipping_zone_set",
}


def _resolve_tool_set(names: set[str]) -> list[FunctionTool]:
    """Resolve a set of tool names to FunctionTool instances via registry."""
    resolved: list[FunctionTool] = []
    seen: set[str] = set()
    for name in names:
        tool = _registry.resolve(name)
        if tool and tool.name not in seen:
            resolved.append(tool)
            seen.add(tool.name)
    return resolved


# Set approval modes on write tools (via registry for unified lookup)
for _name in WRITE_TOOL_NAMES:
    _tool = _registry.resolve(_name)
    if _tool:
        _tool.approval_mode = "always_require"

for _name in DIRECT_WRITE_TOOL_NAMES:
    _tool = _registry.resolve(_name)
    if _tool:
        _tool.approval_mode = "never_require"

CORE_TOOLS: list[FunctionTool] = _resolve_tool_set(CORE_TOOL_NAMES)
ADVANCED_TOOLS: list[FunctionTool] = _resolve_tool_set(ADVANCED_TOOL_NAMES)
READ_TOOLS: list[FunctionTool] = _resolve_tool_set(READ_TOOL_NAMES)
WRITE_TOOLS: list[FunctionTool] = _resolve_tool_set(WRITE_TOOL_NAMES)

# -- Backward-compatible re-exports ------------------------------------------
# Import individual tool instances so that existing code doing
#   from src.tools.registry import product_search_tool
# still works. These are resolved from SkillRegistry by canonical name.

product_search_tool = _registry.resolve("product_search")
product_create_tool = _registry.resolve("product_create")
product_low_stock_tool = _registry.resolve("product_low_stock")
product_top_selling_tool = _registry.resolve("product_top_selling")
product_update_price_tool = _registry.resolve("product_update_price")
product_performance_tool = _registry.resolve("product_performance")
category_list_tool = _registry.resolve("category_list")
order_lookup_tool = _registry.resolve("order_lookup")
order_lookup_by_phone_tool = _registry.resolve("order_lookup_by_phone")
order_create_draft_tool = _registry.resolve("order_create_draft")
order_create_confirmed_tool = _registry.resolve("order_create_confirmed")
order_summary_tool = _registry.resolve("order_summary")
order_recent_list_tool = _registry.resolve("order_recent_list")
order_confirm_tool = _registry.resolve("order_confirm")
order_update_details_tool = _registry.resolve("order_update_details")
order_cancel_tool = _registry.resolve("order_cancel")
order_refund_tool = _registry.resolve("order_refund")
customer_info_tool = _registry.resolve("customer_info")
customer_top_buyers_tool = _registry.resolve("customer_top_buyers")
inventory_check_tool = _registry.resolve("inventory_check")
inventory_adjust_tool = _registry.resolve("inventory_adjust")
sales_revenue_tool = _registry.resolve("sales_revenue")
company_snapshot_tool = _registry.resolve("company_snapshot")
discount_create_tool = _registry.resolve("discount_create")
discount_create_draft_tool = _registry.resolve("discount_create_draft")
whatsapp_send_tool = _registry.resolve("whatsapp_send")
shipping_zone_set_tool = _registry.resolve("shipping_zone_set")
shipping_company_governorates_tool = _registry.resolve("shipping_company_governorates")
shipping_company_areas_tool = _registry.resolve("shipping_company_areas")
search_area_by_text_tool = _registry.resolve("search_area_by_text")
competitor_search_tool = _registry.resolve("competitor_search")
competitor_get_products_tool = _registry.resolve("competitor_get_products")
competitor_price_compare_tool = _registry.resolve("competitor_price_compare")
competitor_get_ads_tool = _registry.resolve("competitor_get_ads")
competitor_generate_report_tool = _registry.resolve("competitor_generate_report")
knowledge_search_tool = _registry.resolve("knowledge_search")
scheduler_create_job_tool = _registry.resolve("scheduler_create_job")
knowledge_create_faq_tool = _registry.resolve("knowledge_create_faq")
knowledge_create_policy_tool = _registry.resolve("knowledge_create_policy")
facebook_ad_create_draft_tool = _registry.resolve("facebook_ad_create_draft")
facebook_ad_create_full_draft_tool = _registry.resolve("facebook_ad_create_full_draft")
facebook_ad_publish_draft_tool = _registry.resolve("facebook_ad_publish_draft")
facebook_ad_analyze_product_tool = _registry.resolve("facebook_ad_analyze_product")
facebook_ad_get_decision_tool = _registry.resolve("facebook_ad_get_decision")
facebook_ad_record_learned_rule_tool = _registry.resolve("facebook_ad_record_learned_rule")
facebook_ad_account_info_tool = _registry.resolve("facebook_ad_account_info")
orders_campaign_attribution_report_tool = _registry.resolve("orders_campaign_attribution_report")
message_broadcast_tool = _registry.resolve("message_broadcast")
agent_spawn_tool = _registry.resolve("agent_spawn")
agent_handoff_to_tool = _registry.resolve("agent_handoff_to")
audit_read_tool = _registry.resolve("audit_read")
hr_attendance_today_tool = _registry.resolve("hr_attendance_today")
unlock_advanced_tools_tool = _registry.resolve("unlock_advanced_tools")
# Promotion / Offer tools
offers_list_active_tool = _registry.resolve("offers_list_active")
coupon_validate_tool = _registry.resolve("coupon_validate")

# Smart Seller tools
lead_score_tool = _registry.resolve("lead_score")
abandoned_carts_tool = _registry.resolve("abandoned_carts")
pipeline_overview_tool = _registry.resolve("pipeline_overview")
followup_suggestions_tool = _registry.resolve("followup_suggestions")
deal_params_tool = _registry.resolve("deal_params")
purchase_prediction_tool = _registry.resolve("purchase_prediction")

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
    OrderLookupByPhoneInput,
    OrderCreateDraftInput,
    OrderCreateConfirmedInput,
    OrderSummaryInput,
    OrderRecentListInput,
    OrderConfirmInput,
    OrderUpdateDetailsInput,
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
    ShippingZoneSetInput,
    ShippingUpdateInput,
    ShippingCompanyGovernoratesInput,
    ShippingCompanyAreasInput,
    SearchAreaByTextInput,
)
from src.tools.definitions.governance import (  # noqa: E402 F401
    SchedulerCreateJobInput,
    KnowledgeCreateFaqInput,
    KnowledgeCreatePolicyInput,
    FacebookAdCreateDraftInput,
    MessageBroadcastInput,
)
from src.tools.definitions.facebook_ads import (  # noqa: E402 F401
    FacebookAdAnalyzeProductInput,
    FacebookAdCreateFullDraftInput,
    FacebookAdPublishDraftInput,
    FacebookAdGetDecisionInput,
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
    tools: list[FunctionTool] = []
    if tool_names is not None:
        tools = [t for n in tool_names if (t := _registry.resolve(n)) is not None]
    else:
        tools = list(CORE_TOOLS)

    # Hermes Universal Self-Learning: ensure record_learned_rule and manage_agent_skill are available to all agent roles
    universal_learner = _registry.resolve("record_learned_rule")
    if universal_learner and universal_learner not in tools:
        tools.append(universal_learner)
    skill_manager = _registry.resolve("manage_agent_skill")
    if skill_manager and skill_manager not in tools:
        tools.append(skill_manager)
    return tools


def get_tool_names_for_role(role: str) -> list[str]:
    role_upper = role.upper()
    tool_names = ROLE_TOOLS.get(role_upper)
    names: list[str] = []
    if tool_names is not None:
        names = list(tool_names)
    else:
        names = sorted(CORE_TOOL_NAMES)

    if "record_learned_rule" not in names:
        names.append("record_learned_rule")
    if "manage_agent_skill" not in names:
        names.append("manage_agent_skill")
    return names


def get_tool_name_list(tools: list[FunctionTool]) -> list[str]:
    return [tool.name for tool in tools]


def resolve_tools_from_names(names: list[str]) -> list[FunctionTool]:
    resolved: list[FunctionTool] = []
    seen: set[str] = set()
    for name in names:
        canonical = canonical_tool_name(name)
        tool = _registry.resolve(canonical)
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
    return _registry.get_all_tools() + get_manager_tools() + get_mcp_tools()


def get_tool(name: str) -> FunctionTool | None:
    return _registry.resolve(canonical_tool_name(name))


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
