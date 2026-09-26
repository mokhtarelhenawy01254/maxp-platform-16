from __future__ import annotations

import json
import math
import os
import re
from typing import Any, Protocol

import structlog

from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)

GENERIC_PRODUCT_WORDS: set[str] = {
    # Footwear / Apparel Categories
    "كوتشي", "حذاء", "شوز", "سنيكرز", "فستان", "طقم", "ساعة", "ساعه", "بنطلون", "قميص",
    "تيشيرت", "شنطة", "شنطه", "سليبر", "صندل", "شبشب", "بوط", "هاف", "فلات", "بلوزة", "عباية",
    # Materials & Styles
    "جلد", "قطن", "طبيعي", "صناعي", "مريح", "اصلي", "أصلي", "فاخر", "سواريه", "كاجوال",
    "رياضي", "كلاسيك", "مودرن", "طبي", "طبيعيه", "طبيعية", "شمواه", "ووتربروف", "ووتر",
    "مستورد", "محلي", "تركي", "مصري", "مستورده", "مستوردة",
    # Demographics & Fit
    "رجالي", "حريمي", "اطفال", "أطفال", "بناتي", "ولادي", "شبابي", "مقاس", "مقاسات",
    # Colors
    "ابيض", "أبيض", "اسود", "أسود", "احمر", "أحمر", "ازرق", "أزرق", "كحلي", "رمادي",
    "بيج", "بني", "هافان", "زيتي", "نبيتي", "رصاصي", "ألوان", "الوان", "لون",
    # Generic Commerce Terms
    "كبير", "صغير", "منتج", "موديل", "متاح", "متوفر", "سعر", "اسعار", "أسعار",
    "جملة", "قطاعي", "عرض", "عروض", "قطعة", "خامة", "خامات", "جديد", "شياكة", "أحدث"
}


def _normalize_image_key(url: str) -> str:
    """Extract canonical path/key to deduplicate across domain/protocol variations (e.g. localhost vs production CDN)."""
    if not url:
        return ""
    clean = str(url).strip()
    if "://" in clean:
        parts = clean.split("://", 1)[1]
        if "/" in parts:
            clean = "/" + parts.split("/", 1)[1]
    return clean.split("?")[0].rstrip("/").lower()


def _is_image_already_sent(url: str, already_sent_urls: set[str] | None) -> bool:
    """Return True if image URL or its canonical path was already sent to customer."""
    if not already_sent_urls:
        return False
    if url in already_sent_urls:
        return True
    key = _normalize_image_key(url)
    if key:
        for u in already_sent_urls:
            if _normalize_image_key(u) == key:
                return True
    return False



class AgentHook(Protocol):
    """Hook into pipeline stages.

    Each agent can register hooks for custom behaviour (enforcement,
    formatting, validation) without modifying the pipeline itself.
    """

    async def before_llm(
        self,
        ctx: PipelineContext,
        system_prompt: str,
        skills: list[Any],
    ) -> str:
        """Called before the primary LLM call."""
        return system_prompt

    async def after_tools(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> list[dict[str, Any]] | None:
        """Called after tool execution, before the follow-up LLM call."""
        return None

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        """Called after follow-up but before final reply.

        Can mutate ctx (e.g., append response_attachments).
        """


class AttachmentHook:
    """Auto-populate response_attachments from tool results and sanitize replies."""

    async def before_llm(
        self,
        ctx: PipelineContext,
        system_prompt: str,
        skills: list[Any],
    ) -> str:
        return system_prompt

    async def after_tools(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> list[dict[str, Any]] | None:
        return None

    async def _get_already_sent_image_urls(self, ctx: PipelineContext) -> set[str]:
        """Collect all image URLs already sent to customer in this conversation to prevent duplicate spam."""
        sent_urls: set[str] = set()

        # 1. From working memory / session_state
        if getattr(ctx, "session_state", None):
            for u in (ctx.session_state.get("sent_image_urls") or []):
                if u:
                    sent_urls.add(str(u).strip())

        # 2. From DB message history if session is available
        lookup_id = ctx.conversation_id or ctx.thread_id
        if lookup_id and getattr(ctx, "session", None):
            try:
                from sqlalchemy import text
                res = await ctx.session.execute(
                    text(
                        'SELECT attachments, metadata FROM public.messages '
                        'WHERE "conversationId" = :cid AND "isFromCustomer" = FALSE '
                        'ORDER BY "createdAt" DESC LIMIT 25'
                    ),
                    {"cid": str(lookup_id)},
                )
                for row in res.fetchall():
                    for val in (row[0], row[1]):
                        if not val:
                            continue
                        parsed = json.loads(val) if isinstance(val, str) else val
                        if isinstance(parsed, dict) and "attachments" in parsed:
                            parsed = parsed["attachments"]
                        if isinstance(parsed, list):
                            for item in parsed:
                                if isinstance(item, dict) and item.get("url"):
                                    sent_urls.add(str(item["url"]).strip())
            except Exception as e:
                logger.debug("failed_to_fetch_sent_image_urls", error=str(e))

        return sent_urls

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        _maxp_api_url = os.getenv("MAXP_API_URL", "").rstrip("/")

        # Check if user explicitly asked for photos in this turn or in response to an offer
        user_text = getattr(ctx, "message", None) or getattr(ctx, "user_message", None) or ""
        user_msg = str(user_text).lower()
        photo_keywords = (
            "صور", "صوره", "صورة", "شكل", "شكله", "شكلها", "وريني", "اشوف", "أشوف",
            "كاتالوج", "كتالوج", "الوان", "ألوان", "الوانه", "الوانها", "ع الطبيعة",
            "على الطبيعة", "في الحقيقة", "ابعتلي صوره", "ابعتلي صورته", "ابعت صوره",
            "ابعت صورته", "ابعت الصور", "ابعتهم", "وريني الصور", "وريني شكله",
            "ابعتلي الصور", "ممكن صور", "ممكن صوره", "ممكن اشوف"
        )
        explicit_photo_request = any(k in user_msg for k in photo_keywords)

        # Also detect affirmative responses if the previous assistant message offered photos
        # e.g. "تحب أبعتلك صوره؟" -> user says "اه" / "تمام" / "ياريت" / "ابعت"
        if not explicit_photo_request and any(
            w in user_msg for w in ("اه", "أه", "ايوه", "أيوه", "نعم", "ياريت", "يا ريت", "ابعت", "ابعتلي", "ماشي", "تمام", "اوك", "اوكي", "أوك")
        ):
            recent_msgs = (getattr(ctx, "external_memory_context", None) or {}).get("recentMessages") or []
            last_assistant_msg = ""
            for m in reversed(recent_msgs):
                if isinstance(m, dict) and m.get("role") in ("assistant", "agent"):
                    last_assistant_msg = str(m.get("content") or "").lower()
                    break
            if any(k in last_assistant_msg for k in ("صوره", "صورة", "صور", "شكله", "تشوف", "ألوان")):
                explicit_photo_request = True

        already_sent_urls = await self._get_already_sent_image_urls(ctx)

        for evidence in ctx.tool_evidence:
            result = evidence.get("result", {})
            if not isinstance(result, dict):
                continue
            self._populate_landmark_images(ctx, result, evidence, _maxp_api_url)
            self._populate_product_images(
                ctx, result, evidence, _maxp_api_url,
                already_sent_urls=already_sent_urls,
                explicit_photo_request=explicit_photo_request,
            )

        # Extract any image URLs in text, and strictly strip them so customers never see raw links
        self._extract_and_strip_reply_images(
            ctx, _maxp_api_url,
            already_sent_urls=already_sent_urls,
            explicit_photo_request=explicit_photo_request,
        )

        # Resilient fallback: ONLY if customer explicitly requested photos, but no attachments populated yet
        if not ctx.response_attachments and ctx.company_id and explicit_photo_request:
            await self._fallback_product_images(
                ctx, _maxp_api_url,
                already_sent_urls=already_sent_urls,
                explicit_photo_request=explicit_photo_request,
            )

        # Update session_state with newly sent URLs
        if ctx.response_attachments and getattr(ctx, "session_state", None) is not None:
            existing_sent = list(ctx.session_state.get("sent_image_urls") or [])
            for a in ctx.response_attachments:
                u = a.get("url")
                if u and u not in existing_sent:
                    existing_sent.append(u)
            ctx.session_state["sent_image_urls"] = existing_sent

        if ctx.response_attachments:
            logger.info(
                "response_attachments_auto_populated",
                count=len(ctx.response_attachments),
                urls=[a.get("url", "")[:120] for a in ctx.response_attachments],
            )

    def _populate_landmark_images(
        self,
        ctx: PipelineContext,
        result: dict,
        evidence: dict,
        maxp_api_url: str,
    ) -> None:
        base_url = maxp_api_url or os.getenv("MAXP_API_URL", "https://maxp.online").rstrip("/")
        reply_lower = (ctx.final_reply or "").lower()
        branches = result.get("branches") or []
        for branch in branches:
            img = (branch.get("landmarkImage") or "").strip()
            if not img:
                continue
            branch_name = (branch.get("name") or "").strip().lower()
            name_match = branch_name and branch_name in reply_lower
            img_match = img in (ctx.final_reply or "") or os.path.basename(img) in (ctx.final_reply or "")
            single_match = len(branches) == 1 and bool(ctx.final_reply)

            if not (name_match or img_match or single_match):
                continue

            full_url = img
            if img.startswith("/"):
                full_url = f"{base_url}{img}"

            if full_url.startswith(("http://", "https://", "data:")):
                if not any(a.get("url") == full_url for a in ctx.response_attachments):
                    ctx.response_attachments.append({
                        "type": "image",
                        "url": full_url,
                        "source": "tool_result",
                        "tool": evidence.get("tool", "booking_info"),
                    })

    def _populate_product_images(
        self,
        ctx: PipelineContext,
        result: dict,
        evidence: dict,
        maxp_api_url: str,
        already_sent_urls: set[str] | None = None,
        explicit_photo_request: bool = False,
    ) -> None:
        base_url = maxp_api_url or os.getenv("MAXP_API_URL", "https://maxp.online").rstrip("/")
        reply_lower = (ctx.final_reply or "").lower()
        if not reply_lower:
            return

        # 🛡️ STRICT PHOTO GUARD: Never attach product images unless the user explicitly requested photos!
        if not explicit_photo_request:
            return

        user_text = getattr(ctx, "message", None) or getattr(ctx, "user_message", None) or ""
        recent_msgs = (getattr(ctx, "external_memory_context", None) or {}).get("recentMessages") or []
        recent_text = " ".join(str(m.get("content") or "") for m in recent_msgs[-4:] if isinstance(m, dict))
        search_scope = f"{reply_lower} {str(user_text).lower()} {recent_text.lower()} {str(evidence.get('arguments') or '')}".lower()

        for key in ("results", "products"):
            items = result.get(key) or []
            if not isinstance(items, list):
                continue
            for product in items:
                if not isinstance(product, dict):
                    continue
                raw_images = []
                images_val = product.get("images")
                if isinstance(images_val, list):
                    raw_images.extend(images_val)
                elif isinstance(images_val, str) and images_val.strip():
                    try:
                        parsed = json.loads(images_val)
                        if isinstance(parsed, list):
                            raw_images.extend(parsed)
                        else:
                            raw_images.append(images_val)
                    except Exception:
                        raw_images.append(images_val)

                if product.get("mainImage"):
                    raw_images.append(product.get("mainImage"))
                if product.get("image"):
                    raw_images.append(product.get("image"))
                if product.get("productImage"):
                    raw_images.append(product.get("productImage"))

                if not raw_images:
                    continue

                prod_name = (product.get("name") or "").strip().lower()
                if not prod_name:
                    continue

                def _norm_ar_token(w: str) -> str:
                    w = re.sub(r"^[او]ل", "", w)
                    w = re.sub(r"[أإآ]", "ا", w)
                    w = re.sub(r"ة$", "ه", w)
                    w = re.sub(r"ى$", "ي", w)
                    return w

                # Extract the primary subject part before promotional suffixes (e.g. ".. دلعي نفسك")
                title_clean = re.sub(r"[^\w\s\u0600-\u06FF]", " ", prod_name)
                primary_chunk = re.split(r"[.]{2,}|[.!—–\(\)\[\]؛]|(?:\s+-\s+)", prod_name)[0].strip()
                primary_clean = re.sub(r"[^\w\s\u0600-\u06FF]", " ", primary_chunk)

                name_words = [w for w in primary_clean.split() if len(w) >= 3]
                distinctive_words = [w for w in name_words if w not in GENERIC_PRODUCT_WORDS]

                # Fallback to full title words if primary chunk was too short
                if not distinctive_words:
                    all_name_words = [w for w in title_clean.split() if len(w) >= 3]
                    distinctive_words = [w for w in all_name_words if w not in GENERIC_PRODUCT_WORDS]

                # Check if search scope contains the product name or its distinctive keywords
                if prod_name in search_scope or primary_clean in search_scope:
                    name_match = True
                elif distinctive_words:
                    search_tokens = set(re.findall(r"[\u0600-\u06FF\w]+", search_scope))
                    search_norm = {_norm_ar_token(t) for t in search_tokens}

                    # Direct word match or normalized Arabic root match
                    matched = sum(
                        1 for w in distinctive_words
                        if w in search_tokens or _norm_ar_token(w) in search_norm
                    )
                    # For long marketing titles, matching the core keyword (e.g. الفيونكة / القلوب) is enough
                    name_match = (matched > 0 and (matched >= math.ceil(len(distinctive_words) * 0.4) or matched >= 1))
                elif name_words:
                    name_match = any(w in search_scope for w in name_words)
                else:
                    name_match = False

                img_match = any(
                    os.path.basename(str(img)).strip() in (ctx.final_reply or "")
                    for img in raw_images if img
                )

                if not (name_match or img_match):
                    if len(items) == 1:
                        name_match = True
                    else:
                        continue

                added_for_prod = 0
                max_per_prod = 2 if len(items) == 1 else 1
                max_total_attachments = 4
                for img in raw_images:
                    if not img or not isinstance(img, str):
                        continue
                    if added_for_prod >= max_per_prod or len(ctx.response_attachments) >= max_total_attachments:
                        break
                    img_clean = img.strip()
                    full_url = img_clean
                    if img_clean.startswith("/"):
                        full_url = f"{base_url}{img_clean}"

                    if full_url.startswith(("http://", "https://", "data:")):
                        # 🛡️ DEDUPLICATION GUARD:
                        # Skip if already sent previously
                        if _is_image_already_sent(full_url, already_sent_urls):
                            logger.debug("skipping_duplicate_sent_image", url=full_url[:80])
                            continue

                        if not any(a.get("url") == full_url for a in ctx.response_attachments):
                            ctx.response_attachments.append({
                                "type": "image",
                                "url": full_url,
                                "source": "tool_result",
                                "tool": evidence.get("tool", "product_search"),
                            })
                            added_for_prod += 1

    async def _fallback_product_images(
        self,
        ctx: PipelineContext,
        maxp_api_url: str,
        already_sent_urls: set[str] | None = None,
        explicit_photo_request: bool = False,
    ) -> None:
        """Fetch product images if user explicitly asked for pictures and no attachments populated yet."""
        if not explicit_photo_request:
            return

        user_text = getattr(ctx, "message", None) or getattr(ctx, "user_message", None) or ""

        try:
            import src.db.session as _db_mod
            from src.tools.repositories.product_search_repository import ProductSearchRepository

            clean_user = re.sub(r"[*_~`#]", "", user_text)
            clean_reply = re.sub(r"[*_~`#]", "", ctx.final_reply or "")

            stop_words = {
                "عايز", "عاوز", "اشوف", "أشوف", "صور", "صوره", "صورة", "موديل",
                "ممكن", "وريني", "شكل", "من", "فضلك", "لو", "سمحت", "عندكم",
                "كام", "بكام", "سعر", "اسعار", "الوان", "مقاس", "مقاسات",
                "ابعت", "ابعتلي", "تاني", "كاتالوج", "كتالوج"
            }
            # Look for model names in user message
            eng_tokens = re.findall(r"[a-zA-Z0-9_-]{2,}", clean_user)
            ar_tokens = [w for w in re.findall(r"[\u0600-\u06FF\w]+", clean_user) if w.lower() not in stop_words and len(w) >= 3]
            candidates = eng_tokens + ar_tokens

            # Also check if reply explicitly mentions a model name after 'موديل'
            reply_models = re.findall(r"موديل\s+([a-zA-Z0-9_\u0600-\u06FF]{3,})", clean_reply)
            if reply_models:
                candidates = [m for m in reply_models if m.lower() not in stop_words] + candidates

            if not candidates:
                return

            logger.info("fallback_product_images_start",
                candidates=candidates,
                company_id=ctx.company_id,
            )

            products: list[dict[str, Any]] = []
            if getattr(ctx, "session", None):
                repo = ProductSearchRepository(ctx.session)
                for cand in candidates[:3]:
                    prods = await repo.search_products(ctx.company_id, cand, limit=2)
                    if prods:
                        products.extend(prods)
                        break
            else:
                import src.db.session as _db_mod
                if _db_mod.async_session is None:
                    await _db_mod.init_db()
                if _db_mod.async_session is not None:
                    async with _db_mod.async_session() as session:
                        repo = ProductSearchRepository(session)
                        for cand in candidates[:3]:
                            prods = await repo.search_products(ctx.company_id, cand, limit=2)
                            if prods:
                                products.extend(prods)
                                break

            if products:
                mock_ev = {"tool": "product_search_fallback", "result": {"products": products}}
                self._populate_product_images(
                    ctx, mock_ev["result"], mock_ev, maxp_api_url,
                    already_sent_urls=already_sent_urls,
                    explicit_photo_request=explicit_photo_request,
                )
        except Exception as e:
            logger.warning("fallback_product_images_error", error=str(e), exc_info=True)

    def _extract_and_strip_reply_images(
        self,
        ctx: PipelineContext,
        base_url: str,
        already_sent_urls: set[str] | None = None,
        explicit_photo_request: bool = False,
    ) -> None:
        if not ctx.final_reply:
            return

        base_url = base_url or os.getenv("MAXP_API_URL", "https://maxp.online").rstrip("/")
        image_url_pattern = re.compile(
            r'(?:https?://[^\s)\]<>"\'`]+|/uploads/[^\s)\]<>"\'`]+)\.(?:jpe?g|png|webp|gif)(?:\?[^\s)\]<>"\'`]*)?',
            re.IGNORECASE,
        )

        # 1. Extract any image URLs in text into response_attachments ONLY IF customer asked for photos
        if explicit_photo_request:
            for match in image_url_pattern.finditer(ctx.final_reply):
                if len(ctx.response_attachments) >= 2:
                    break
                url = match.group(0).strip()
                if url.startswith("/"):
                    url = f"{base_url}{url}"
                if url.startswith(("http://", "https://")):
                    # Deduplication check
                    if _is_image_already_sent(url, already_sent_urls):
                        continue
                    if not any(a.get("url") == url for a in ctx.response_attachments):
                        ctx.response_attachments.append({
                            "type": "image",
                            "url": url,
                            "source": "reply_extraction",
                            "tool": "attachment_extractor",
                        })

        # 2. Strip markdown images: ![alt](url)
        cleaned = re.sub(r'!\[.*?\]\([^\)]+\)', '', ctx.final_reply)

        # 3. Strip markdown links to images: [caption](url)
        cleaned = re.sub(
            r'\[.*?\]\((?:https?://|/uploads/)[^\)]+\.(?:jpe?g|png|webp|gif)[^\)]*\)',
            '',
            cleaned,
            flags=re.IGNORECASE,
        )

        # 4. Strip raw image URLs
        cleaned = image_url_pattern.sub('', cleaned)

        # 5. Clean orphaned pointer lines (e.g. lonely arrows)
        lines = []
        for line in cleaned.split('\n'):
            trimmed = line.strip()
            if trimmed in ('👇', '⬇️', '👇🏻', '👇🏼', '👇🏽'):
                continue
            lines.append(line)
        cleaned = '\n'.join(lines)

        # 6. Collapse multiple blank lines
        cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned).strip()

        ctx.final_reply = cleaned
        ctx.llm_response = cleaned

