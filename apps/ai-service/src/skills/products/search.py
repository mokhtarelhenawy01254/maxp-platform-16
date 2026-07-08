from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class ProductSearchInput(BaseModel):
    query: str = Field(description="Search keyword for product name in Arabic or English")
    category: str | None = Field(None, description="Category name filter")
    company_id: str = Field(default="", description="")

async def search_products(params: ProductSearchInput) -> dict:
    from src.tools.product_tools import search_products as _search
    result = await _search(
        company_id=params.company_id,
        query=params.query,
        limit=5,
        use_vector=True,
    )
    return {"results": result.get("products", []), "count": result.get("count", 0), "found": result.get("found", False)}

product_search = Skill(
    name="product_search",
    description="Search for products by name or category. Use when customer asks about catalog, specific products, or shopping.",
    input_schema=ProductSearchInput,
    handler=search_products,
    internal_fields=["company_id"],
)
