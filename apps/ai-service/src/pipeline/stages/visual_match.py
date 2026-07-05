"""Stage 0: Match product by image BEFORE LLM sees the message."""

from __future__ import annotations

from typing import Any

from src.pipeline.context import PipelineContext
from src.tools.definitions.product import product_search, ProductSearchInput


async def match_product_by_image(ctx: PipelineContext) -> PipelineContext:
    """Pre-process image attachments: vector search → match → remove image from LLM input."""
    if not ctx.attachments:
        return ctx

    img_url = _first_image_url(ctx.attachments)
    if not img_url:
        return ctx

    try:
        result = await product_search(ProductSearchInput(
            query="", image_url=img_url, use_vector=True, company_id=ctx.company_id,
        ))
        ctx.external_memory_context["productSearchResults"] = result

        if result.get("results"):
            top = result["results"][0]
            score = float(top.get("score") or top.get("similarity") or 0)
            name = top.get("productName") or top.get("name", "")
            price = top.get("price", "")
            pid = top.get("id") or top.get("productId", "")

            if score >= 0.8:
                ctx.external_memory_context["productMatched"] = {
                    "name": name, "price": price, "id": pid, "score": score, "exact": True
                }
                ctx.message = f"العميل مهتم بـ {name} (سعر {price} جنيه) - يريد التفاصيل."
            elif score >= 0.5:
                ctx.external_memory_context["productMatched"] = {
                    "name": name, "price": price, "id": pid, "score": score, "exact": False
                }
                ctx.message = f"العميل بيسأل عن حاجة شبه صورة - أقرب حاجة عندنا: {name} بسعر {price} جنيه."
            else:
                ctx.message = "العميل بعت صورة لم نجد لها منتج مطابق. أخبره بلطف."
        else:
            ctx.message = "العميل بعت صورة لم نجد لها منتج مطابق. أخبره بلطف."

        ctx.attachments = []

    except Exception:
        ctx.message = f"{ctx.message}\n\n[العميل أرسل صورة مع الرسالة.]"

    return ctx


def _first_image_url(attachments: list[dict[str, Any]]) -> str | None:
    for a in attachments or []:
        if a.get("type") in ("image", "photo"):
            url = a.get("url", "")
            if url:
                return url
    return None
