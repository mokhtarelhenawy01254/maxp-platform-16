from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _executed_result
from src.tools.vector_product_search import vector_product_search


class InventoryCheckInput(BaseModel):
    product_name_or_sku: str = Field(description="Product name or SKU to check inventory for")
    product_size: str | None = Field(default=None, description="Optional requested size")
    product_color: str | None = Field(default=None, description="Optional requested color")
    conversation_id: str | None = Field(default=None, description="Optional conversation ID for previous-product context")
    references_previous_product: bool | None = Field(default=None, description="True when the turn refers to the previous shown product")
    use_vector: bool = Field(default=True, description="Enable semantic/vector search fallback")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class InventoryAdjustInput(BaseModel):
    product_id: str = Field(description="Product ID to adjust")
    quantity_delta: int = Field(description="Quantity change (positive to add, negative to remove)")
    reason: str | None = Field(default=None, description="Reason for adjustment")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def inventory_check(input_data: InventoryCheckInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"found": False, "code": "MISSING_COMPANY", "error": "Missing company_id"}

    product_name = input_data.product_name_or_sku
    if not product_name:
        return {"found": False, "code": "MISSING_PRODUCT_NAME", "error": "No product name or SKU provided"}

    from src.tools.repositories.inventory_repository import InventoryRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = InventoryRepository(sess)
        product = await repo.find_product_by_name_or_sku(company_id, product_name)

        similar_suggestions: list[dict] = []
        if not product:
            try:
                vec_results = await vector_product_search(
                    query=product_name,
                    company_id=company_id,
                    limit=3,
                    min_score=0.45,
                )
                if vec_results:
                    top = vec_results[0]
                    top_sku = top.get("sku")
                    if top_sku:
                        product = await repo.find_product_by_sku(top_sku, company_id)
                    similar_suggestions = [
                        {"name": r["name"], "price": r["price"], "status": r["status"], "score": r["score"]}
                        for r in vec_results
                    ]
            except Exception:
                pass

        if not product:
            resp: dict = {"found": False, "code": "PRODUCT_NOT_FOUND", "queriedName": product_name}
            if similar_suggestions:
                resp["similar"] = similar_suggestions
                resp["message"] = f"'{product_name}' غير موجود، لكن وجدنا منتجات مشابهة"
            else:
                resp["error"] = f"No product matching '{product_name}'"
            return resp

        variants = await repo.fetch_variants(product["id"])

    from src.tools.product_tools import (_VARIANT_COLOR_ALIASES,
                                         _VARIANT_SIZE_ALIASES, _aggregate_variants,
                                         _availability_status, _parse_images)

    product["productVariants"] = variants
    size_variants = _aggregate_variants(variants, _VARIANT_SIZE_ALIASES)
    color_variants = _aggregate_variants(variants, _VARIANT_COLOR_ALIASES)
    images = _parse_images(product)

    result: dict[str, Any] = {
        "found": True,
        "productId": product["id"],
        "productName": product["name"],
        "sku": product["sku"],
        "price": {"amount": float(product.get("price", 0)), "currency": "EGP"},
        "stock": product.get("stock", 0),
        "trackInventory": product.get("trackInventory", True),
        "images": images,
        "status": _availability_status(product),
        "availableSizes": size_variants,
        "availableColors": color_variants,
    }

    compare_price = product.get("comparePrice")
    if compare_price is not None:
        result["comparePrice"] = {"amount": float(compare_price), "currency": "EGP"}

    req_size = input_data.product_size
    req_color = input_data.product_color
    if req_size or req_color:
        constraint_details: dict[str, Any] = {"matched": [], "missing": []}
        all_available = True

        if req_size:
            matched = [v for v in variants if req_size.lower() in v.get("name", "").lower()]
            if matched:
                for v in matched:
                    constraint_details["matched"].append({
                        "type": "SIZE", "value": v["name"],
                        "status": "IN_STOCK" if v.get("stock", 0) > 0 or not v.get("trackInventory", True) else "OUT_OF_STOCK",
                        "stock": v.get("stock", 0),
                    })
            else:
                constraint_details["missing"].append({"type": "SIZE", "requestedValue": req_size, "status": "NOT_FOUND"})
                all_available = False

        if req_color:
            matched = [v for v in variants if req_color.lower() in v.get("name", "").lower()]
            if matched:
                for v in matched:
                    constraint_details["matched"].append({
                        "type": "COLOR", "value": v["name"],
                        "status": "IN_STOCK" if v.get("stock", 0) > 0 or not v.get("trackInventory", True) else "OUT_OF_STOCK",
                        "stock": v.get("stock", 0),
                    })
            else:
                constraint_details["missing"].append({"type": "COLOR", "requestedValue": req_color, "status": "NOT_FOUND"})
                all_available = False

        result["requestedSize"] = req_size
        result["requestedColor"] = req_color
        result["constraintAvailable"] = all_available if not any(m.get("status") == "OUT_OF_STOCK" for m in constraint_details["matched"]) else False
        result["constraintDetails"] = constraint_details

    return result


async def inventory_adjust(input_data: InventoryAdjustInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    product_id = input_data.product_id
    delta = input_data.quantity_delta

    if not company_id or not product_id:
        return {"success": False, "error": "Missing company_id or product_id"}

    from src.tools.repositories.inventory_repository import InventoryRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        await InventoryRepository(sess).update_stock(product_id, company_id, delta)

    return _executed_result("INVENTORY_ADJUSTED", {
        "productId": product_id,
        "quantityDelta": delta,
        "reason": input_data.reason,
    })


def _format_inventory_check(result: dict) -> str:
    if not result.get("found"):
        return f"المنتج '{result.get('queriedName', '')}' غير متوفر حالياً."
    return ""


inventory_check_tool = FunctionTool(
    name="inventory_check",
    description="Check product inventory and validate requested size or color against active variants.",
    func=inventory_check,
    input_model=InventoryCheckInput,
    format_result=_format_inventory_check,
)

inventory_adjust_tool = FunctionTool(
    name="inventory_adjust",
    description="Propose adjusting inventory quantity. REQUIRES MERCHANT APPROVAL.",
    func=inventory_adjust,
    input_model=InventoryAdjustInput,
)

__all_tools__ = [
    inventory_check_tool,
    inventory_adjust_tool,
]
