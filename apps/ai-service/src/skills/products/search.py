from __future__ import annotations
from src.skills.base import Skill
from src.tools.definitions.product import ProductSearchInput, product_search as _product_search_tool


async def search_products(params: ProductSearchInput) -> dict:
    return await _product_search_tool(params)


product_search = Skill(
    name="product_search",
    description=(
        "Search for products by name, keyword, category, image URL, or image bytes. "
        "Use when customer asks about catalog, specific products, shopping, or sends a product image. "
        "Pass image_url when customer sends a product photo."
    ),
    input_schema=ProductSearchInput,
    handler=search_products,
    internal_fields=["company_id", "conversation_id"],
)
