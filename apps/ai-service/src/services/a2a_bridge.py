from __future__ import annotations

from typing import Any

import structlog

from src.services.agent_manager_service import (
    AgentManagerService,
    get_agent_manager_service,
)
from src.services.agent_registry import AgentRegistry, get_agent_registry
from src.tools.registry import get_tool_names_for_role

logger = structlog.get_logger(__name__)

AGENT_CARD_META: dict[str, dict[str, str]] = {
    "SUPPORT": {
        "name": "Support Agent",
        "description": "Customer service and order follow-up specialist. Handles order status, shipping, returns, and customer inquiries.",
        "default_tools": "order_lookup,customer_info,shipping_rates",
    },
    "ORDER": {
        "name": "Order Agent",
        "description": "Order management specialist. Creates draft orders, processes cancellations, refunds, and shipping updates.",
        "default_tools": "order_create_draft,order_cancel,order_refund",
    },
    "SALES": {
        "name": "Sales Agent",
        "description": "Sales and customer conversion specialist. Handles product inquiries, discounts, and order creation.",
        "default_tools": "product_search,order_create_confirmed,discount_create_draft",
    },
    "INVENTORY": {
        "name": "Inventory & Pricing Agent",
        "description": "Stock and pricing specialist. Handles inventory checks, low stock alerts, product performance, and price updates.",
        "default_tools": "inventory_check,product_low_stock,product_performance,inventory_adjust",
    },
    "MARKETING": {
        "name": "Marketing Agent",
        "description": "Marketing and advertising specialist. Creates ad drafts, manages campaigns, and broadcasts messages.",
        "default_tools": "facebook_ad_create_draft,message_broadcast",
    },
    "FACEBOOK_SALES_SUPPORT": {
        "name": "Facebook & Messenger Agent",
        "description": "Facebook Messenger sales and support specialist. Handles customer conversations, product inquiries, and order processing via Messenger.",
        "default_tools": "product_search,order_lookup,customer_info,facebook_reply",
    },
    "SAS_SALES": {
        "name": "Facebook & Google Sheets Agent",
        "description": "Data integration specialist. Syncs sales data between Facebook and Google Sheets.",
        "default_tools": "order_summary,sales_revenue,product_performance",
    },
}

A2A_BASE_URL = "/a2a"


def build_agent_cards(company_id: str, registry: AgentRegistry | None = None) -> list[dict[str, Any]]:
    """Build A2A Agent Cards for all agents of a company."""
    reg = registry or get_agent_registry()
    cards = []

    for agent_id, agent, tool_names in reg.list_agents(company_id):
        role = getattr(agent, "role", "UNKNOWN")
        meta = AGENT_CARD_META.get(role.upper(), {
            "name": agent.name or role,
            "description": f"Specialist agent for {role} tasks",
            "default_tools": ",".join(tool_names[:3]),
        })

        card = {
            "name": meta["name"],
            "description": meta["description"],
            "url": f"{A2A_BASE_URL}/agents/{agent_id}",
            "agent_id": agent_id,
            "role": role,
            "capabilities": {
                "tools": tool_names,
                "skills": getattr(agent, "skills", []),
            },
            "supported_interfaces": [
                {
                    "type": "JSONRPC",
                    "url": f"{A2A_BASE_URL}/agents/{agent_id}",
                }
            ],
        }
        cards.append(card)

    return cards


async def handle_a2a_task(
    company_id: str,
    agent_id: str,
    message: str,
    thread_id: str = "",
    session_id: str | None = None,
) -> dict[str, Any]:
    """Handle an A2A task request by routing to the appropriate specialist agent."""
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=company_id,
        message=message,
        agent_id=agent_id,
        thread_id=thread_id or session_id or "",
    )

    if result.get("success"):
        return {
            "jsonrpc": "2.0",
            "result": {
                "id": thread_id,
                "status": "completed",
                "artifacts": [
                    {
                        "parts": [
                            {
                                "type": "text",
                                "text": result.get("reply", ""),
                            }
                        ],
                    }
                ],
            },
        }

    return {
        "jsonrpc": "2.0",
        "error": {
            "code": -32000,
            "message": result.get("error", "Agent task failed"),
        },
    }
