"""Stage 0: Match product by image BEFORE LLM sees the message.
Uses hybrid search (image_embedding + text_embedding with RRF) for higher accuracy.
"""

from __future__ import annotations

from typing import Any

from src.pipeline.context import PipelineContext
from src.tools.vector_product_search import vector_product_search


async def match_product_by_image(ctx: PipelineContext) -> PipelineContext:
    if not ctx.attachments:
        return ctx

    img_url = _first_image_url(ctx.attachments)
    if not img_url:
        return ctx

    try:
        import httpx
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(img_url)
            if resp.status_code != 200:
                return ctx
            img_bytes = resp.content
            ct = resp.headers.get("content-type", "image/jpeg")

        results = await vector_product_search(
            company_id=ctx.company_id,
            query="",
            limit=5,
            image_bytes=img_bytes,
            mime_type=ct,
        )
        ctx.external_memory_context["productSearchResults"] = {"results": results}

        if results:
            top = results[0]
            score = float(top.get("score", 0))
            name = top.get("name", "")
            price = top.get("price", "")

            if score >= 0.8:
                ctx.external_memory_context["productMatched"] = {
                    "name": name, "price": price, "score": score, "exact": True,
                }
                ctx.message = f"العميل مهتم بـ {name} (سعر {price} جنيه) - يريد التفاصيل."
            elif score >= 0.5:
                ctx.external_memory_context["productMatched"] = {
                    "name": name, "price": price, "score": score, "exact": False,
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
