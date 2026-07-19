from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class InventoryCheckInput(BaseModel):
    product_name_or_sku: str = Field(description="Product name or SKU to check inventory for")
    size: str | None = Field(None, description="Requested size (e.g. 38, 40, 42)")
    color: str | None = Field(None, description="Requested color (e.g. أسود, أبيض, أحمر)")
    company_id: str = Field(default="", description="")


async def check_inventory(params: InventoryCheckInput) -> dict:
    from src.tools.definitions.inventory import inventory_check, InventoryCheckInput as RealInput
    inp = RealInput(
        product_name_or_sku=params.product_name_or_sku,
        product_size=params.size,
        product_color=params.color,
        company_id=params.company_id,
    )
    return await inventory_check(inp)


inventory_check = Skill(
    name="inventory_check",
    description="Check product inventory, available sizes, and colors. Use when customer asks about size availability, color availability, stock, or product variants. Keywords: مقاس, لون, الوان, مقاسات, موجود, متوفر, size, color, stock, variant",
    input_schema=InventoryCheckInput,
    handler=check_inventory,
    internal_fields=["company_id"],
)
