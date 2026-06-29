"""Product search skill — looks up products in the catalog by name/category/price."""
from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class ProductSearchInput(BaseModel):
    query: str = Field(description="Search keyword for product name in Arabic or English")
    category: str | None = Field(None, description="Category name filter (e.g. 'شوك ويف', 'عطور', 'ملابس')")
    min_price: float | None = Field(None, description="Minimum price filter (EGP)")
    max_price: float | None = Field(None, description="Maximum price filter (EGP)")

async def search_products(params: ProductSearchInput) -> dict:
    """Execute product search via the Node.js backend's product search endpoint."""
    # ponytail: stub — calls actual product search service
    # Replace with httpx call to Node.js backend's /api/v1/ai-bridge/tools/execute
    return {
        "results": [
            {"name": "شوك ويف فانيليا", "price": 80.0, "stock": 15},
            {"name": "شوك ويف شوكولاتة", "price": 85.0, "stock": 10},
        ],
        "total": 2,
    }

product_search = Skill(
    name="product_search",
    description="Search for products by name, category, or price range. Use when customer asks about catalog, specific products, or shopping. Arabic keywords: منتجات, كتالوج, عندك, عايز, شوف, بتبيع, متاح",
    input_schema=ProductSearchInput,
    handler=search_products,
)
