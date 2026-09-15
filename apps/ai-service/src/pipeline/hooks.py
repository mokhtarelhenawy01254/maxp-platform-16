from __future__ import annotations

import json
import os
import re
from typing import Any, Protocol

import structlog

from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


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

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        _maxp_api_url = os.getenv("MAXP_API_URL", "").rstrip("/")
        for evidence in ctx.tool_evidence:
            result = evidence.get("result", {})
            if not isinstance(result, dict):
                continue
            self._populate_landmark_images(ctx, result, evidence, _maxp_api_url)
            self._populate_product_images(ctx, result, evidence, _maxp_api_url)

        # Extract any image URLs in text, and strictly strip them so customers never see raw links
        self._extract_and_strip_reply_images(ctx, _maxp_api_url)

        # Resilient fallback: If user requested photos or a product was mentioned, but no attachments yet
        if not ctx.response_attachments and ctx.company_id:
            await self._fallback_product_images(ctx, _maxp_api_url)

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
    ) -> None:
        base_url = maxp_api_url or os.getenv("MAXP_API_URL", "https://maxp.online").rstrip("/")
        reply_lower = (ctx.final_reply or "").lower()

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
                name_words = [w for w in prod_name.split() if len(w) >= 3]
                name_match = prod_name and (prod_name in reply_lower or any(w in reply_lower for w in name_words))
                img_match = any(
                    os.path.basename(str(img)).strip() in (ctx.final_reply or "")
                    for img in raw_images if img
                )
                single_match = len(items) == 1 and bool(ctx.final_reply)

                if not (name_match or img_match or single_match):
                    continue

                added_for_prod = 0
                for img in raw_images:
                    if not img or not isinstance(img, str):
                        continue
                    if added_for_prod >= 2 or len(ctx.response_attachments) >= 4:
                        break
                    img_clean = img.strip()
                    full_url = img_clean
                    if img_clean.startswith("/"):
                        full_url = f"{base_url}{img_clean}"

                    if full_url.startswith(("http://", "https://", "data:")):
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
    ) -> None:
        """Fetch product images if user asked for pictures or model is named in conversation."""
        user_text = getattr(ctx, "message", None) or getattr(ctx, "user_message", None) or ""
        user_msg = str(user_text).lower()
        reply_msg = (ctx.final_reply or "").lower()
        image_keywords = {"صور", "صوره", "صورة", "شكل", "وريني", "اشوف", "أشوف", "الوان", "ألوان", "لون", "موديل"}
        has_intent = any(k in user_msg for k in image_keywords) or any(k in reply_msg for k in ("موديل", "متوفر عندنا"))
        if not has_intent:
            return

        try:
            import src.db.session as _db_mod
            from src.tools.repositories.product_search_repository import ProductSearchRepository

            clean_user = re.sub(r"[*_~`#]", "", user_text)
            clean_reply = re.sub(r"[*_~`#]", "", ctx.final_reply or "")

            stop_words = {
                "عايز", "عاوز", "اشوف", "أشوف", "صور", "صوره", "صورة", "موديل",
                "ممكن", "وريني", "شكل", "من", "فضلك", "لو", "سمحت", "عندكم",
                "كام", "بكام", "سعر", "اسعار", "الوان", "مقاس", "مقاسات"
            }
            # Look for English words first (e.g. Luma, Nike, Samba)
            eng_tokens = re.findall(r"[a-zA-Z0-9_-]{2,}", clean_user)
            ar_tokens = [w for w in re.findall(r"[\u0600-\u06FF\w]+", clean_user) if w.lower() not in stop_words and len(w) >= 3]
            candidates = eng_tokens + ar_tokens

            # Also check if reply explicitly mentions a model name after 'موديل'
            reply_models = re.findall(r"موديل\s+([a-zA-Z0-9_\u0600-\u06FF]+)", clean_reply)
            if reply_models:
                candidates = reply_models + candidates

            logger.info("fallback_product_images_start",
                has_intent=has_intent,
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
                self._populate_product_images(ctx, mock_ev["result"], mock_ev, maxp_api_url)

            logger.info("fallback_product_images_finish",
                found_prods=len(products),
                attachments_count=len(ctx.response_attachments),
            )
        except Exception as e:
            logger.warning("fallback_product_images_error", error=str(e), exc_info=True)

    def _extract_and_strip_reply_images(
        self,
        ctx: PipelineContext,
        base_url: str,
    ) -> None:
        if not ctx.final_reply:
            return

        base_url = base_url or os.getenv("MAXP_API_URL", "https://maxp.online").rstrip("/")
        image_url_pattern = re.compile(
            r'(?:https?://[^\s)\]<>"\'`]+|/uploads/[^\s)\]<>"\'`]+)\.(?:jpe?g|png|webp|gif)(?:\?[^\s)\]<>"\'`]*)?',
            re.IGNORECASE,
        )

        # 1. Extract any image URLs in text into response_attachments
        for match in image_url_pattern.finditer(ctx.final_reply):
            url = match.group(0).strip()
            if url.startswith("/"):
                url = f"{base_url}{url}"
            if url.startswith(("http://", "https://")):
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

