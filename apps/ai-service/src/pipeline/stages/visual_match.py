"""Stage 0: Match product by image BEFORE LLM sees the message.
Uses hybrid search (image_embedding + text_embedding with RRF) for higher accuracy.
"""

from __future__ import annotations

from typing import Any

from src.pipeline.context import PipelineContext
from src.tools.vector_product_search import vector_product_search


def _build_candidates_block(results: list[dict[str, Any]]) -> str:
    lines = []
    for i, r in enumerate(results[:3], 1):
        score = float(r.get("score", 0))
        name = r.get("name", "منتج")
        price = r.get("price", "")
        lines.append(f"{i}. {name} (سعر {price} جنيه, تشابه {score:.0%})")
    return "\n".join(lines)


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

        base = ctx.message or ""
        if results:
            candidates = _build_candidates_block(results)
            ctx.message = f"""{base}

[🔍 قام النظام بعمل بحث بالصورة ووجد المنتجات التالية:
{candidates}

قارن الصورة مع هذه المنتجات واختر أقرب واحد للصورة المرسلة من العميل.
- إذا وجدت تطابق: أخبر العميل باسم المنتج وسعره واسأله إذا كان يريد الشراء
- إذا لم تجد تطابق تام: أخبر العميل بأقرب البدائل المتاحة]
"""
        else:
            ctx.message = f"{base}\n\n[لم يتم العثور على منتجات مطابقة للصورة. أخبر العميل بلطف واسأله عن تفاصيل أكثر.]"

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
