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
        img = r.get("image_url", "")
        if img:
            lines.append(f"{i}. ![{name}]({img}) — سعر {price} جنيه, تشابه {score:.0%}")
        else:
            lines.append(f"{i}. {name} (سعر {price} جنيه, تشابه {score:.0%})")
    return "\n".join(lines)


async def match_product_by_image(ctx: PipelineContext) -> PipelineContext:
    if not ctx.attachments:
        return ctx

    image_urls = _all_image_urls(ctx.attachments)
    if not image_urls:
        return ctx

    try:
        import httpx
        all_results: list[dict[str, Any]] = []

        for img_url in image_urls:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(img_url)
                if resp.status_code != 200:
                    continue
                img_bytes = resp.content
                ct = resp.headers.get("content-type", "image/jpeg")

            results = await vector_product_search(
                company_id=ctx.company_id,
                query=ctx.message or "",
                limit=5,
                image_bytes=img_bytes,
                mime_type=ct,
            )
            # Merge results from this image, keeping highest scores
            existing = {r.get("name", ""): r for r in all_results}
            for r in results:
                name = r.get("name", "")
                if name and float(r.get("score", 0)) > float(existing.get(name, {}).get("score", 0)):
                    existing[name] = r
            all_results = sorted(existing.values(), key=lambda x: -float(x.get("score", 0)))[:5]

        base = ctx.message or ""
        if all_results:
            candidates = _build_candidates_block(all_results)
            ctx.message = f"""{base}

[🔍 تم البحث بالصورة — أقرب المنتجات المطابقة:
{candidates}

قارن صور المنتجات أعلاه مع صورة العميل واختر الأنسب.
- تطابق: أخبر العميل باسم المنتج وسعره واسأله عن رغبته في الشراء
- تطابق تقريبي: اشرح للعميل الفرق واسأله عن رأيه]
"""
        else:
            ctx.message = f"{base}\n\n[العميل أرسل صورة. استخدم أداة product_search للبحث عن منتجات مشابهة بناءً على وصف الصورة.]"

    except Exception:
        ctx.message = f"{ctx.message}\n\n[العميل أرسل صورة مع الرسالة.]"

    return ctx


def _all_image_urls(attachments: list[dict[str, Any]]) -> list[str]:
    urls = []
    for a in attachments or []:
        if a.get("type") in ("image", "photo"):
            url = a.get("url", "")
            if url:
                urls.append(url)
    return urls
