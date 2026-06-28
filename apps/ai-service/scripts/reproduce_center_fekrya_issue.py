"""
Reproduction test for Center Fekrya (سنتر فكية) product-search issue.

What it does:
1. Creates a throw-away company + cable category + 3 cable products in a local
   Postgres transaction (and rolls it back).
2. Runs the real ProductSearchRepository.search_products for query "كابل".
3. Simulates the intent planner for a MEDICAL_CENTER agent (booking tools only)
   vs a SALES/ORDER agent (product_search allowed). Shows why product_search
   never gets called for the wrong role.
"""
from __future__ import annotations

import asyncio
import uuid
from decimal import Decimal
from sqlalchemy import text
from src.db import session as db_session
from src.intent.schema import IntentContract
from src.intent.planner import build_intent_contract_async, to_tool_plan, INTENT_CONFIGURED_TOOLS
from src.tools.repositories.product_search_repository import ProductSearchRepository

# Cable products copied from apps/backend/scripts/inject_products_centr_fekrya.js
COMPANY_NAME = "سنتر فكية (TEST)"
CABLE_PRODUCTS = [
    {"name": "كابل USB-C 1 متر", "price": Decimal("25.00")},
    {"name": "كابل لايتنينج 1.5 متر", "price": Decimal("35.00")},
    {"name": "كابل مايكرو USB 2 متر", "price": Decimal("30.00")},
]

MEDICAL_CENTER_TOOLS = [
    "booking_info",
    "booking_slots",
    "booking_reserve",
    "booking_status",
    "agent_handoff_to",
]

SALES_TOOLS = [
    "category_list",
    "customer_info",
    "order_lookup",
    "product_search",
    "agent_handoff_to",
]


async def insert_test_data(session):
    company_id = str(uuid.uuid4())
    category_id = str(uuid.uuid4())
    email = f"{company_id[:8]}@test.local"
    phone = f"+2000000{company_id[:8]}"
    slug = f"fekrya-test-{company_id[:8]}"

    await session.execute(
        text("""
            INSERT INTO companies (id, name, email, phone, slug, "isActive", "createdAt", "updatedAt")
            VALUES (:id, :name, :email, :phone, :slug, true, NOW(), NOW())
        """),
        {"id": company_id, "name": COMPANY_NAME, "email": email, "phone": phone, "slug": slug},
    )
    await session.execute(
        text("""
            INSERT INTO categories (id, name, "companyId", "isActive", "createdAt", "updatedAt")
            VALUES (:id, 'كبلات', :cid, true, NOW(), NOW())
        """),
        {"id": category_id, "cid": company_id},
    )
    for prod in CABLE_PRODUCTS:
        await session.execute(
            text("""
                INSERT INTO products (
                    id, name, price, stock, "mainImage", images,
                    "isActive", "trackInventory", "categoryId", "companyId",
                    "createdAt", "updatedAt"
                )
                VALUES (
                    :id, :name, :price, 50, '', '[]',
                    true, true, :cid, :company_id,
                    NOW(), NOW()
                )
            """),
            {
                "id": str(uuid.uuid4()),
                "name": prod["name"],
                "price": prod["price"],
                "cid": category_id,
                "company_id": company_id,
            },
        )
    return company_id, category_id


async def simulate_runtime_plan(message: str, agent_tools: list[str], company_id: str):
    """Reproduce the real intent planner path with a mocked classifier."""
    import src.intent.classifier as classifier_mod
    from src.intent.classifier import ClassifierResult
    original = classifier_mod.classify_intent

    async def mock_classify(*args, **kwargs):
        return ClassifierResult(
            intent="products",
            confidence=0.92,
            slots={"query": "كابل"},
        )

    classifier_mod.classify_intent = mock_classify
    try:
        contract = await build_intent_contract_async(
            message=message,
            available_tools=agent_tools,
            company_id=company_id,
        )
        plan = to_tool_plan(contract, agent_tools)
        return contract, plan
    finally:
        classifier_mod.classify_intent = original


async def main():
    await db_session.init_db()

    async with db_session.async_session() as session:
        company_id, category_id = await insert_test_data(session)

        repo = ProductSearchRepository(session)
        text_results = await repo.search_products(company_id, "كابل", limit=5)
        print("\n=== 1. Direct product_search (text) ===")
        print(f"Query: 'كابل' | Company: {company_id}")
        print(f"Found {len(text_results)} product(s):")
        for p in text_results:
            print(f"  - {p['name']} | {p['price']} EGP | stock={p['stock']}")

        print("\n=== 2. Agent routing simulation (real planner) ===")
        for label, tools in [
            ("MEDICAL_CENTER agent (booking-only)", MEDICAL_CENTER_TOOLS),
            ("SALES/ORDER agent (has product_search)", SALES_TOOLS),
        ]:
            contract, plan = await simulate_runtime_plan("عندك كابل؟", tools, company_id)
            print(f"\n{label}")
            print(f"  classified intent={contract.intent}")
            print(f"  requiresTool={plan.requiresTool}")
            print(f"  primaryTool={plan.primaryTool}")
            print(f"  allowedTools={plan.allowedTools}")
            if not plan.requiresTool or plan.primaryTool is None:
                print("  => product_search WILL NOT be executed")

        await session.rollback()
        print("\n=== Test data rolled back (no permanent changes) ===")


if __name__ == "__main__":
    asyncio.run(main())

