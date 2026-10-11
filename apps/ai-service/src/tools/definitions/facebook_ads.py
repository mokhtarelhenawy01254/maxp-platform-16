from __future__ import annotations

import json
import uuid
import urllib.parse
import re
from typing import Any, Literal
from datetime import datetime, timezone

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field
from sqlalchemy import text

import src.db.session as _db_mod

logger = structlog.get_logger(__name__)


def _format_meta_publish_error(error_code: str | None, error_message: str | None) -> str:
    """Translate technical Meta or backend errors into courteous, actionable Arabic business messages."""
    code = str(error_code or "").upper()
    msg = str(error_message or "").strip()

    if code == "FACEBOOK_PIXEL_NOT_IN_ACCOUNT" or "البكسل المختار" in msg or "pixel" in msg.lower():
        return (
            "تم حفظ المسودات الإعلانية بنجاح في النظام ✅ ولكن تعذر النشر التلقائي المباشر على فيسبوك لأن بكسل المتجر غير مرتبط بالحساب الإعلاني المختار حالياً. "
            "يمكنك مراجعة المسودة وتأكيد ربط البكسل بالحساب من تبويب الربط، ثم إطلاق الإعلان بضغطة زر واحدة."
        )
    if code == "FACEBOOK_PAGE_NOT_CONNECTED" or "صفحة فيسبوك" in msg or "page" in msg.lower():
        return (
            "تم حفظ المسودات بنجاح ✅ ولكن تعذر النشر على فيسبوك لعدم توفر صلاحية النشر على الصفحة المختارة. "
            "يرجى التأكد من اتصال الصفحة في إعدادات الربط."
        )
    if "token" in msg.lower() or "auth" in msg.lower() or "جلسة" in msg or ("مطلوب" in msg and "تسجيل" in msg):
        return (
            "تم حفظ المسودات بنجاح ✅ ولكن يحتاج الربط مع فيسبوك إلى تجديد تسجيل الدخول (Access Token). "
            "يرجى تجديد الربط من صفحة إعلانات فيسبوك ثم الضغط على زر نشر المسودة."
        )
    if "payment" in msg.lower() or "billing" in msg.lower() or "مدفوعات" in msg:
        return (
            "تم حفظ المسودات بنجاح ✅ ولكن الحساب الإعلاني في فيسبوك يتطلب إضافة وسيلة دفع صالحة قبل تفعيل الحملات."
        )
    if "2490487" in msg or "عرض الأسعار" in msg or "bid" in msg.lower():
        return (
            "تم حفظ المسودات بنجاح ✅ ولكن استراتيجية عروض الأسعار في الحساب تحتاج ضبطاً (تم اعتماد استراتيجية أقل تكلفة تلقائياً للحملات القادمة)."
        )

    # Clean fallback: sanitize internal endpoint names, HTTP status codes, and error traces
    cleaned = re.sub(r"(POST|GET|PUT|DELETE)\s+/api/[^\s]+", "", msg).strip()
    cleaned = re.sub(r"Request failed:\s*", "", cleaned).strip()
    cleaned = re.sub(r"HTTPConnectionPool[^\)]+\)", "", cleaned).strip()
    if not cleaned or len(cleaned) < 5 or "http" in cleaned.lower() or cleaned == "Invalid parameter":
        cleaned = "يرجى مراجعة إعدادات الحساب الإعلاني وتأكيد النشر من لوحة التحكم."

    return f"تم حفظ المسودات الإعلانية بنجاح في النظام ✅ ولكن لم يكتمل النشر المباشر على فيسبوك: {cleaned}"


class FacebookAdAnalyzeProductInput(BaseModel):
    product_id: str | None = Field(default=None, description="The ID of the product to analyze")
    product_slug: str | None = Field(default=None, description="The slug of the product to analyze")
    product_name: str | None = Field(default=None, description="Name search term if ID/slug unknown")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AdAngleDraft(BaseModel):
    angle: str = Field(description="Angle name (e.g. 'pain_point', 'direct_offer', 'social_proof')")
    campaign_name: str = Field(description="Campaign name in Meta Ads")
    adset_name: str = Field(description="AdSet name")
    ad_name: str = Field(description="Ad name")
    primary_text: str = Field(description="Ad main copy / primary text")
    headline: str = Field(description="Punchy headline (under 40 chars)")
    description: str | None = Field(default=None, description="Optional news feed link description")
    call_to_action: str = Field(default="SHOP_NOW", description="CTA button (SHOP_NOW, LEARN_MORE, ORDER_NOW)")
    budget_amount: float = Field(default=200.0, description="Daily budget in account currency")
    target_country: str = Field(default="EG", description="Target country code (e.g. EG, SA, AE)")
    target_genders: str | None = Field(default="ALL", description="ALL, WOMEN, or MEN")
    age_min: int = Field(default=18, description="Minimum age")
    age_max: int = Field(default=45, description="Maximum age")
    image_url: str | None = Field(default=None, description="Image creative URL")
    notes: str | None = Field(default=None, description="Strategy rationale or key selling points")
    placement_type: str | None = Field(default="AUTOMATIC", description="AUTOMATIC or MANUAL placements")
    placements: list[str] | None = Field(default=None, description="List of placements if MANUAL (e.g. ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'FACEBOOK_REELS', 'INSTAGRAM_REELS'])")
    target_cities: list[str] | None = Field(default=None, description="List of target city names (e.g. ['Cairo', 'Alexandria', 'Giza', 'الرياض'])")
    target_regions: list[str] | None = Field(default=None, description="List of target governorates / regions in Egypt or country (e.g. ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدلتا'])")
    target_interests: list[str] | None = Field(default=None, description="List of detailed targeting interests if specified")
    target_custom_locations: list[dict[str, Any]] | None = Field(default=None, description="GPS locations with latitude, longitude, radius (km), and distance_unit for map pin-drop targeting")
    excluded_regions: list[str] | None = Field(default=None, description="List of governorates/regions to EXCLUDE (e.g. high cancellation or return areas like أسيوط، سوهاج)")
    excluded_cities: list[str] | None = Field(default=None, description="List of city names to EXCLUDE")
    excluded_custom_locations: list[dict[str, Any]] | None = Field(default=None, description="GPS locations to EXCLUDE")


class FacebookAdSearchTargetingInput(BaseModel):
    query: str = Field(description="Search keyword (e.g. city name like 'الرياض', 'جدة', 'الشيخ زايد', 'مدينة نصر', or interest like 'أحذية', 'عناية بالبشرة')")
    search_type: Literal["adgeolocation", "adinterest"] = Field(default="adgeolocation", description="'adgeolocation' to search cities/regions/locations worldwide, or 'adinterest' to search official Meta interest categories")
    country_code: str | None = Field(default="EG", description="Target 2-letter country code (EG, SA, AE, US, etc.)")
    limit: int = Field(default=10, description="Max results to return")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FacebookAdCreateFullDraftInput(BaseModel):
    product_id: str | None = Field(default=None, description="ID of the product being advertised")
    product_url: str | None = Field(default=None, description="Landing page or product URL")
    angles: list[AdAngleDraft] = Field(description="List of ad draft angles. If the merchant requested 1 angle, pass ONLY 1 angle. Otherwise pass 1 to 3 angles as needed.")
    publish_now: bool = Field(default=False, description="If True, directly publish the ad to Meta Ads Manager immediately instead of only saving a draft.")
    ad_account_id: str | None = Field(default=None, description="Meta Ad Account ID if specified")
    page_id: str | None = Field(default=None, description="Facebook Page ID if specified")
    pixel_id: str | None = Field(default=None, description="Meta Pixel ID if specified")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FacebookAdGetDecisionInput(BaseModel):
    ad_id: str | None = Field(default=None, description="Specific Meta Ad ID or internal Ad ID to evaluate")
    campaign_id: str | None = Field(default=None, description="Specific Meta Campaign ID or internal Campaign ID to evaluate")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    status: str | None = Field(default="ACTIVE", description="Filter by status: ACTIVE, PAUSED, or ALL")
    limit: int = Field(default=10, description="Max campaigns and ads to evaluate (default 10)")


class FacebookAdUpdateStatusInput(BaseModel):
    campaign_id: str = Field(..., description="معرف الحملة الإعلانية على فيسبوك (Meta Campaign ID) المطلوب إيقافها أو تفعيلها")
    status: Literal["ACTIVE", "PAUSED"] = Field(..., description="الحالة المستهدفة: 'PAUSED' لإيقاف الحملة لحماية الميزانية، أو 'ACTIVE' لتفعيلها/إعادة تشغيلها")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FacebookAdUpdateBudgetInput(BaseModel):
    campaign_id: str = Field(..., description="معرف الحملة الإعلانية على فيسبوك (Meta Campaign ID) المطلوب تعديل ميزانيتها")
    daily_budget: float = Field(..., description="الميزانية اليومية الجديدة بعملة المتجر (مثلاً 500 ج.م)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_ad_analyze_product(input_data: FacebookAdAnalyzeProductInput) -> dict[str, Any]:
    """Analyze a product for Meta ad campaign readiness, calculate target CPA, break-even ROAS, and margins."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    sf = _db_mod.async_session
    if not sf:
        return {"success": False, "error": "Database session unavailable"}

    async with sf() as session:
        query_sql = """
            SELECT p.id, p.name, p.description, p.price, p."comparePrice", p.cost, p.images, p."mainImage", p.stock, p.slug, p."isActive",
                   c.currency, c."customDomain", c.slug as "companySlug"
            FROM public.products p
            LEFT JOIN public.companies c ON c.id = p."companyId"
            WHERE p."companyId" = :cid AND (p."deletedAt" IS NULL)
        """
        params: dict[str, Any] = {"cid": company_id}

        target = (input_data.product_id or input_data.product_slug or input_data.product_name or "").strip()
        if target and ("/" in target):
            target = target.rstrip("/").split("/")[-1]

        if input_data.product_id and not ("/" in (input_data.product_id or "")):
            query_sql += ' AND (p.id = :pid OR p.slug ILIKE :pid OR p.name ILIKE :pid)'
            params["pid"] = input_data.product_id
        elif target:
            query_sql += ' AND (p.slug ILIKE :target OR p.name ILIKE :target OR p.id = :target)'
            params["target"] = f"%{target}%"
        else:
            return {
                "success": False,
                "error": "يرجى تحديد اسم المنتج أو رابطه أو معرفه لتحليله بدقة (لم يتم تمرير اسم منتج).",
                "action": "PRODUCT_NAME_REQUIRED"
            }

        result = await session.execute(text(query_sql), params)
        row = result.first()

        # If full target yielded no row, attempt distinctive keyword matching
        if not row and target:
            words = [w for w in target.replace("-", " ").replace("_", " ").split() if len(w) >= 3 and w.lower() not in ("swan", "سوان", "كوتشي", "حذاء", "شوز", "عرض", "منتج")]
            for w in words[:3]:
                word_sql = query_sql.replace("p.slug ILIKE :target OR p.name ILIKE :target OR p.id = :target", "p.name ILIKE :w OR p.slug ILIKE :w")
                word_res = await session.execute(text(word_sql), {"cid": company_id, "w": f"%{w}%"})
                w_row = word_res.first()
                if w_row:
                    row = w_row
                    break

        if not row:
            return {
                "success": False,
                "error": "لم يتم العثور على المنتج في كتالوج متجرك. يرجى التأكد من اسم المنتج أو رفعه في الكتالوج أولاً.",
                "action": "CATALOG_SEARCH_FAILED"
            }

        product = dict(row._mapping)

    price = float(product.get("price") or 0)
    compare_price = float(product.get("comparePrice") or 0) if product.get("comparePrice") else None
    cost = float(product.get("cost") or 0) if product.get("cost") else None
    stock = int(product.get("stock") or 0)
    currency = str(product.get("currency") or "EGP").upper()

    # Determine storefront product URL
    slug = product.get("slug") or product.get("id")
    domain = product.get("customDomain") or (f"{product.get('companySlug')}.maxp.online" if product.get("companySlug") else "store.maxp.online")
    product_url = f"https://{domain}/product/{slug}"

    # Unit Economics calculations
    has_exact_cost = cost is not None and cost > 0
    gross_margin = (price - cost) if has_exact_cost else (price * 0.45)
    margin_percent = round((gross_margin / price * 100), 1) if price > 0 else 0
    target_cpa = round(gross_margin * 0.45, 2)
    breakeven_roas = round(price / gross_margin, 2) if gross_margin > 0 else 2.0
    recommended_daily_budget = max(150.0, round(target_cpa * 3, 0))

    images_raw = product.get("images")
    parsed_images: list[str] = []
    if images_raw:
        try:
            parsed_images = json.loads(images_raw) if isinstance(images_raw, str) else list(images_raw)
        except Exception:
            parsed_images = [str(images_raw)]
    if product.get("mainImage") and product.get("mainImage") not in parsed_images:
        parsed_images.insert(0, product.get("mainImage"))

    is_in_stock = stock > 0

    return {
        "success": True,
        "product": {
            "id": product.get("id"),
            "name": product.get("name"),
            "slug": product.get("slug"),
            "product_url": product_url,
            "description": product.get("description"),
            "price": price,
            "compare_price": compare_price,
            "cost": cost,
            "has_exact_cost": has_exact_cost,
            "stock": stock,
            "in_stock": is_in_stock,
            "images": parsed_images,
            "main_image": product.get("mainImage") or (parsed_images[0] if parsed_images else None),
        },
        "economics": {
            "gross_margin": round(gross_margin, 2),
            "margin_percent": f"{margin_percent}%",
            "target_cpa": target_cpa,
            "breakeven_roas": breakeven_roas,
            "recommended_daily_budget": recommended_daily_budget,
            "currency": currency,
        },
        "recommendations": [
            f"ميزانية الاختبار اليومية المقترحة: {recommended_daily_budget} {currency} (ما يعادل 3 أضعاف الـ CPA المستهدف لتسريع تعلم الخوارزمية).",
            f"تكلفة الاقتناء المستهدفة (Target CPA): أقصى حد {target_cpa} {currency} لضمان هامش ربح صافي ممتاز.",
            f"نقطة التعادل الإعلاني (Break-even ROAS): {breakeven_roas}x (أي عائد أعلى من ذلك يمثل أرباحاً صافية للمتجر).",
            "جاهزية الإعلان: " + ("المنتج متوفر بالمخزون وجاهز لإطلاق الحملات 🚀" if is_in_stock else "⚠️ تنبيه: المنتج غير متوفر حالياً بالمخزون، يُنصح بتحديث الكمية قبل تفعيل الحملة.")
        ]
    }


async def facebook_ad_create_full_draft(input_data: FacebookAdCreateFullDraftInput) -> dict[str, Any]:
    """Persist generated ad draft angles into PostgreSQL FacebookAdsAiDraftRun & FacebookAdsAiDraft."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    if not input_data.angles:
        return {"success": False, "error": "At least one ad angle draft is required"}

    sf = _db_mod.async_session
    if not sf:
        return {"success": False, "error": "Database session unavailable"}

    run_id = f"run_{uuid.uuid4().hex[:16]}"
    first_angle = input_data.angles[0]

    resolved_product_id = input_data.product_id
    resolved_product_url = input_data.product_url

    async with sf() as session:
        # Auto-resolve product details if missing
        if not resolved_product_id or not resolved_product_url:
            # 1. If explicit product_id was provided, resolve its URL and details directly
            if resolved_product_id:
                prod_row = await session.execute(
                    text("""
                        SELECT p.id, p.slug, c."customDomain", c.slug as "companySlug"
                        FROM public.products p
                        LEFT JOIN public.companies c ON c.id = p."companyId"
                        WHERE p."companyId" = :cid AND (p.id = :pid OR p.slug ILIKE :pid OR p.name ILIKE :pid) AND (p."deletedAt" IS NULL)
                        LIMIT 1
                    """),
                    {"cid": company_id, "pid": resolved_product_id}
                )
                found_prod = prod_row.first()
                if found_prod:
                    fp = dict(found_prod._mapping)
                    resolved_product_id = fp.get("id") or resolved_product_id
                    if not resolved_product_url:
                        dom = fp.get("customDomain") or (f"{fp.get('companySlug')}.maxp.online" if fp.get("companySlug") else "store.maxp.online")
                        resolved_product_url = f"https://{dom}/product/{fp.get('slug') or resolved_product_id}"

            # 2. If product_id was not provided, check angle campaign names and headlines
            if not resolved_product_id or not resolved_product_url:
                candidate_names = []
                for a in input_data.angles:
                    if a.campaign_name:
                        candidate_names.append(a.campaign_name)
                    if a.ad_name:
                        candidate_names.append(a.ad_name)
                    if a.headline:
                        candidate_names.append(a.headline)

                prod_match = None
                for cand in candidate_names:
                    words = [w for w in cand.replace("|", " ").replace("-", " ").split() if len(w) >= 3 and w not in ("Swan", "سوان", "إعلان", "حملة", "عرض", "خصم", "Pre-Order")]
                    for w in words[:4]:
                        row = (await session.execute(
                            text("""
                                SELECT p.id, p.slug, c."customDomain", c.slug as "companySlug"
                                FROM public.products p
                                LEFT JOIN public.companies c ON c.id = p."companyId"
                                WHERE p."companyId" = :cid AND (p."deletedAt" IS NULL)
                                  AND (p.name ILIKE :term OR p.slug ILIKE :term)
                                ORDER BY p."createdAt" DESC LIMIT 1
                            """),
                            {"cid": company_id, "term": f"%{w}%"}
                        )).first()
                        if row:
                            prod_match = row
                            break
                    if prod_match:
                        break

                if prod_match:
                    fp = dict(prod_match._mapping)
                    if not resolved_product_id:
                        resolved_product_id = fp.get("id") or ""
                    if not resolved_product_url:
                        dom = fp.get("customDomain") or (f"{fp.get('companySlug')}.maxp.online" if fp.get("companySlug") else "store.maxp.online")
                        resolved_product_url = f"https://{dom}/product/{fp.get('slug') or resolved_product_id}"

        if not resolved_product_id and not resolved_product_url:
            return {
                "success": False,
                "error": "لم يتم تحديد المنتج المطلوب إنشاء المسودة له. يرجى تمرير معرف أو اسم المنتج صراحة لمنع ربط الإعلان بمنتج خاطئ.",
                "action": "PRODUCT_REQUIRED"
            }

        # Auto-resolve pixel if missing
        resolved_pixel_id = input_data.pixel_id
        if not resolved_pixel_id:
            pix_res = await session.execute(
                text("""
                    SELECT c."pixelId" FROM public.facebook_pixel_configs c
                    JOIN public.storefront_settings s ON s.id = c."storefrontSettingsId"
                    WHERE s."companyId" = :cid AND c."pixelId" IS NOT NULL AND c."pixelId" != ''
                    UNION
                    SELECT "facebookPixelId" AS "pixelId" FROM public.storefront_settings WHERE "companyId" = :cid AND "facebookPixelId" IS NOT NULL AND "facebookPixelId" != ''
                    UNION
                    SELECT "pixelId" FROM public.facebook_campaigns WHERE "companyId" = :cid AND "pixelId" IS NOT NULL AND "pixelId" != ''
                    LIMIT 1
                """),
                {"cid": company_id}
            )
            pix_row = pix_res.first()
            if pix_row and pix_row.pixelId:
                resolved_pixel_id = str(pix_row.pixelId)

        # Auto-resolve ad_account_id if missing
        resolved_ad_account_id = input_data.ad_account_id
        if not resolved_ad_account_id:
            acc_res = await session.execute(
                text("""
                    SELECT "accountId", id FROM public.facebook_ad_accounts 
                    WHERE "companyId" = :cid AND "isActive" = true 
                    ORDER BY "createdAt" DESC LIMIT 1
                """),
                {"cid": company_id}
            )
            acc_row = acc_res.first()
            if acc_row:
                raw_acc = str(acc_row.accountId or acc_row.id)
                resolved_ad_account_id = f"act_{raw_acc}" if raw_acc and not raw_acc.startswith("act_") else raw_acc

        # Auto-resolve page_id if missing
        resolved_page_id = input_data.page_id
        if not resolved_page_id:
            page_res = await session.execute(
                text("""
                    SELECT "pageId" FROM public.facebook_pages 
                    WHERE "companyId" = :cid AND status = 'connected' 
                    ORDER BY "connectedAt" DESC LIMIT 1
                """),
                {"cid": company_id}
            )
            page_row = page_res.first()
            if page_row and page_row.pageId:
                resolved_page_id = str(page_row.pageId)

        resolved_product_url = resolved_product_url or "https://store.maxp.online"

        # Resolve product snapshot (title, price, mainImage)
        resolved_product_snapshot_str = None
        try:
            prod_search_id = resolved_product_id
            prod_res = None
            if prod_search_id:
                prod_res = (await session.execute(
                    text("""
                        SELECT id, name, price, "mainImage", images 
                        FROM public.products 
                        WHERE "companyId" = :cid 
                          AND (id = :pid OR slug ILIKE :pid OR name ILIKE :pid)
                        LIMIT 1
                    """),
                    {"cid": company_id, "pid": prod_search_id}
                )).first()
            if not prod_res and resolved_product_url:
                slug_guess = resolved_product_url.rstrip("/").split("/")[-1]
                if slug_guess and len(slug_guess) > 2:
                    prod_res = (await session.execute(
                        text("""
                            SELECT id, name, price, "mainImage", images 
                            FROM public.products 
                            WHERE "companyId" = :cid 
                              AND (slug ILIKE :slug OR name ILIKE :slug)
                            LIMIT 1
                        """),
                        {"cid": company_id, "slug": f"%{slug_guess}%"}
                    )).first()

            if prod_res:
                resolved_product_snapshot_str = json.dumps({
                    "id": prod_res.id,
                    "name": prod_res.name,
                    "title": prod_res.name,
                    "price": float(prod_res.price or 0),
                    "imageUrl": prod_res.mainImage or "",
                }, ensure_ascii=False)
        except Exception as snap_err:
            logger.warning("failed_to_resolve_product_snapshot", error=str(snap_err))

        # 1. Insert Draft Run
        run_insert_sql = text("""
            INSERT INTO public.facebook_ads_ai_draft_runs (
                id, "companyId", "inputHash", "productUrl", "productSnapshot",
                "adAccountId", "pageId", "pixelId",
                "requestedCampaignCount", "budgetAmount", "targetCountry",
                "ageMin", "ageMax", "requestedStatus", status,
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :companyId, :inputHash, :productUrl, :productSnapshot,
                :adAccountId, :pageId, :pixelId,
                :requestedCampaignCount, :budgetAmount, :targetCountry,
                :ageMin, :ageMax, 'PAUSED', 'COMPLETED',
                NOW(), NOW()
            )
        """)
        await session.execute(run_insert_sql, {
            "id": run_id,
            "companyId": company_id,
            "inputHash": uuid.uuid4().hex,
            "productUrl": resolved_product_url,
            "productSnapshot": resolved_product_snapshot_str,
            "adAccountId": resolved_ad_account_id,
            "pageId": resolved_page_id,
            "pixelId": resolved_pixel_id,
            "requestedCampaignCount": len(input_data.angles),
            "budgetAmount": first_angle.budget_amount,
            "targetCountry": first_angle.target_country,
            "ageMin": first_angle.age_min,
            "ageMax": first_angle.age_max,
        })

        saved_drafts: list[dict[str, Any]] = []

        # 2. Insert Drafts for each angle
        for index, angle in enumerate(input_data.angles, start=1):
            draft_id = f"draft_{uuid.uuid4().hex[:16]}"

            # Automatically inject standard Meta Ads UTM tracking parameters for 100% order attribution
            base_url = (resolved_product_url or "https://store.maxp.online").split("?")[0]
            camp_param = urllib.parse.quote(str(angle.campaign_name or "facebook_campaign"))
            content_param = urllib.parse.quote(str(angle.ad_name or angle.angle or f"angle_{index}"))
            attributed_product_url = f"{base_url}?utm_source=facebook&utm_medium=paid_social&utm_campaign={camp_param}&utm_content={content_param}"

            # 🛡️ Auto-hydrate image URL from product snapshot/database if omitted by LLM
            cand_angle_img = angle.image_url
            if not cand_angle_img and prod_res:
                cand_angle_img = prod_res.mainImage or (prod_res.images[0] if getattr(prod_res, "images", None) and len(prod_res.images) > 0 else None)

            if cand_angle_img and isinstance(cand_angle_img, str) and cand_angle_img.startswith("/"):
                try:
                    parsed_purl = urllib.parse.urlparse(resolved_product_url)
                    cand_angle_img = f"{parsed_purl.scheme}://{parsed_purl.netloc}{cand_angle_img}"
                except Exception:
                    pass

            full_ad_data = {
                "productId": resolved_product_id,
                "productUrl": attributed_product_url,
                "websiteUrl": attributed_product_url,
                "productName": json.loads(resolved_product_snapshot_str).get("name") if resolved_product_snapshot_str else None,
                "campaignName": angle.campaign_name,
                "objective": "OUTCOME_SALES",
                "status": "PAUSED",
                "adSetName": angle.adset_name,
                "budget": angle.budget_amount,
                "country": angle.target_country,
                "ageMin": angle.age_min,
                "ageMax": angle.age_max,
                "genders": angle.target_genders or "ALL",
                "targetCities": getattr(angle, "target_cities", None) or [],
                "targetRegions": getattr(angle, "target_regions", None) or [],
                "targetInterests": getattr(angle, "target_interests", None) or [],
                "targetCustomLocations": getattr(angle, "target_custom_locations", None) or [],
                "customLocations": getattr(angle, "target_custom_locations", None) or [],
                "targetExcludedCities": getattr(angle, "excluded_cities", None) or [],
                "excludedCities": getattr(angle, "excluded_cities", None) or [],
                "targetExcludedRegions": getattr(angle, "excluded_regions", None) or [],
                "excludedRegions": getattr(angle, "excluded_regions", None) or [],
                "excludedCustomLocations": getattr(angle, "excluded_custom_locations", None) or [],
                "targeting": {
                    "ageMin": angle.age_min,
                    "ageMax": angle.age_max,
                    "genders": ["female"] if (angle.target_genders or "").upper() == "WOMEN" else (["male"] if (angle.target_genders or "").upper() == "MEN" else []),
                    "cities": getattr(angle, "target_cities", None) or [],
                    "regions": getattr(angle, "target_regions", None) or [],
                    "interests": getattr(angle, "target_interests", None) or [],
                    "customLocations": getattr(angle, "target_custom_locations", None) or [],
                    "excludedCities": getattr(angle, "excluded_cities", None) or [],
                    "excludedRegions": getattr(angle, "excluded_regions", None) or [],
                    "excludedCustomLocations": getattr(angle, "excluded_custom_locations", None) or [],
                    "countries": [angle.target_country] if angle.target_country else ["EG"],
                },
                "adName": angle.ad_name,
                "primaryText": angle.primary_text,
                "headline": angle.headline,
                "description": angle.description or "",
                "callToAction": angle.call_to_action or "SHOP_NOW",
                "imageUrl": cand_angle_img,
                "adAccountId": resolved_ad_account_id,
                "pageId": resolved_page_id,
                "pixelId": resolved_pixel_id,
                "conversionEvent": "PURCHASE",
                "conversionLocation": "WEBSITE",
                "performanceGoal": "MAXIMIZE_CONVERSIONS",
                "optimizationGoal": "OFFSITE_CONVERSIONS",
                "placementType": getattr(angle, "placement_type", None) or ("MANUAL" if getattr(angle, "placements", None) else "AUTOMATIC"),
                "placements": getattr(angle, "placements", None) or [],
                "advantagePlusPlacements": not bool(getattr(angle, "placements", None) or (getattr(angle, "placement_type", "") or "").upper() == "MANUAL"),
                "advantagePlusAudience": True,
                "bidStrategy": "LOWEST_COST",
                "urlTags": "utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
            }

            draft_insert_sql = text("""
                INSERT INTO public.facebook_ads_ai_drafts (
                    id, "runId", "companyId", "productUrl", "productSnapshot",
                    index, angle, "campaignName", "adSetName", "adName",
                    "primaryText", headline, description, "callToAction",
                    "budgetAmount", "targetCountry", "ageMin", "ageMax",
                    notes, "createFullAdData", status, "createdAt", "updatedAt"
                ) VALUES (
                    :id, :runId, :companyId, :productUrl, :productSnapshot,
                    :index, :angle, :campaignName, :adSetName, :adName,
                    :primaryText, :headline, :description, :callToAction,
                    :budgetAmount, :targetCountry, :ageMin, :ageMax,
                    :notes, :createFullAdData, 'DRAFT', NOW(), NOW()
                )
            """)
            await session.execute(draft_insert_sql, {
                "id": draft_id,
                "runId": run_id,
                "companyId": company_id,
                "productUrl": attributed_product_url,
                "productSnapshot": resolved_product_snapshot_str,
                "index": index,
                "angle": angle.angle,
                "campaignName": angle.campaign_name,
                "adSetName": angle.adset_name,
                "adName": angle.ad_name,
                "primaryText": angle.primary_text,
                "headline": angle.headline,
                "description": angle.description or "",
                "callToAction": angle.call_to_action or "SHOP_NOW",
                "budgetAmount": angle.budget_amount,
                "targetCountry": angle.target_country,
                "ageMin": angle.age_min,
                "ageMax": angle.age_max,
                "notes": angle.notes or "",
                "createFullAdData": json.dumps(full_ad_data, ensure_ascii=False),
            })

            saved_drafts.append({
                "draft_id": draft_id,
                "angle": angle.angle,
                "campaign_name": angle.campaign_name,
                "headline": angle.headline,
                "primary_text": angle.primary_text,
                "budget_amount": angle.budget_amount,
                "status": "DRAFT",
            })

        await session.commit()

        if input_data.publish_now and saved_drafts:
            first_draft_id = saved_drafts[0]["draft_id"]
            try:
                from src.tools.backend_client import BackendAPIError, get_backend_client
                backend = get_backend_client()
                publish_res = await backend.publish_facebook_ad_draft(company_id, first_draft_id)
                if publish_res.get("success"):
                    pub_data = publish_res.get("data", {})
                    fb_ids = pub_data.get("facebookIds", {})
                    fb_campaign_id = fb_ids.get("campaignId") or pub_data.get("campaign", {}).get("facebookCampaignId") or pub_data.get("campaignId") or pub_data.get("campaign", {}).get("id")
                    fb_adset_id = fb_ids.get("adSetId") or pub_data.get("adSet", {}).get("facebookAdSetId") or pub_data.get("adSetId") or pub_data.get("adSet", {}).get("id")
                    fb_ad_id = fb_ids.get("adId") or pub_data.get("ad", {}).get("facebookAdId") or pub_data.get("adId") or pub_data.get("ad", {}).get("id")
                    saved_drafts[0]["status"] = "PUBLISHED"
                    saved_drafts[0]["facebookCampaignId"] = fb_campaign_id
                    saved_drafts[0]["facebookAdSetId"] = fb_adset_id
                    saved_drafts[0]["facebookAdId"] = fb_ad_id
                    return {
                        "success": True,
                        "run_id": run_id,
                        "published": True,
                        "published_draft_id": first_draft_id,
                        "facebook_campaign_id": fb_campaign_id,
                        "facebook_ad_set_id": fb_adset_id,
                        "facebook_ad_id": fb_ad_id,
                        "drafts_count": len(saved_drafts),
                        "drafts": saved_drafts,
                        "message": (
                            f"تم نشر الحملة الإعلانية بنجاح وبشكل فوري على منصة Meta Facebook Ads! "
                            f"(حالة الإعلان: PAUSED لسلامة الميزانية حتى تفعيله). "
                            f"معرف الحملة في فيسبوك: {fb_campaign_id} | "
                            f"معرف الإعلان: {fb_ad_id}"
                        ),
                    }
                else:
                    err_text = publish_res.get("error") or "فشل النشر المباشر"
                    err_code = publish_res.get("errorCode")
                    clean_msg = _format_meta_publish_error(err_code, err_text)
                    return {
                        "success": True,
                        "run_id": run_id,
                        "published": False,
                        "publish_error": clean_msg,
                        "drafts_count": len(saved_drafts),
                        "drafts": saved_drafts,
                        "message": clean_msg,
                    }
            except Exception as pub_exc:
                logger.warning("publish_now_failed", draft_id=first_draft_id, error=str(pub_exc))
                from src.tools.backend_client import BackendAPIError
                err_code = getattr(pub_exc, "error_code", None)
                clean_msg = _format_meta_publish_error(err_code, str(pub_exc))
                return {
                    "success": True,
                    "run_id": run_id,
                    "published": False,
                    "publish_error": clean_msg,
                    "drafts_count": len(saved_drafts),
                    "drafts": saved_drafts,
                    "message": clean_msg,
                }

    return {
        "success": True,
        "run_id": run_id,
        "drafts_count": len(saved_drafts),
        "drafts": saved_drafts,
        "message": "تم إنشاء مسودات الحملات الإعلانية بنجاح، وهي الآن محفوظة في لوحة التحكم وبانتظار مراجعة واعتماد التاجر قبل النشر على ميتا.",
    }


class FacebookAdPublishDraftInput(BaseModel):
    draft_id: str = Field(description="The ID of the ad draft to publish to Meta Marketing API (e.g. 'draft_xxx')")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_ad_publish_draft(input_data: FacebookAdPublishDraftInput) -> dict[str, Any]:
    """Publish an approved Facebook ad draft directly to Meta Ads Manager."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.tools.backend_client import BackendAPIError, get_backend_client
    backend = get_backend_client()
    try:
        res = await backend.publish_facebook_ad_draft(company_id, input_data.draft_id)
        if res.get("success"):
            data = res.get("data", {})
            fb_ids = data.get("facebookIds", {})
            campaign_id = fb_ids.get("campaignId") or data.get("campaign", {}).get("facebookCampaignId") or data.get("campaignId") or data.get("campaign", {}).get("id")
            ad_set_id = fb_ids.get("adSetId") or data.get("adSet", {}).get("facebookAdSetId") or data.get("adSetId") or data.get("adSet", {}).get("id")
            ad_id = fb_ids.get("adId") or data.get("ad", {}).get("facebookAdId") or data.get("adId") or data.get("ad", {}).get("id")
            return {
                "success": True,
                "draft_id": input_data.draft_id,
                "facebook_campaign_id": campaign_id,
                "facebook_ad_set_id": ad_set_id,
                "facebook_ad_id": ad_id,
                "status": "PAUSED",
                "message": (
                    f"تم نشر الحملة الإعلانية بنجاح على منصة Meta Ads بحالة PAUSED! "
                    f"معرف الحملة في فيسبوك: {campaign_id}، معرف المجموعة الإعلانية: {ad_set_id}، معرف الإعلان: {ad_id}."
                ),
            }
        else:
            err_text = res.get("error") or "فشل نشر المسودة إلى فيسبوك"
            err_code = res.get("errorCode")
            clean_msg = _format_meta_publish_error(err_code, err_text)
            return {
                "success": False,
                "draft_id": input_data.draft_id,
                "error": clean_msg,
                "message": clean_msg,
            }
    except Exception as exc:
        logger.warning("facebook_ad_publish_draft_failed", draft_id=input_data.draft_id, error=str(exc))
        from src.tools.backend_client import BackendAPIError
        err_code = getattr(exc, "error_code", None)
        clean_msg = _format_meta_publish_error(err_code, str(exc))
        return {
            "success": False,
            "draft_id": input_data.draft_id,
            "error": clean_msg,
            "message": clean_msg,
        }


def _evaluate_performance_item(
    item_type: Literal["CAMPAIGN", "AD"],
    item_id: str,
    name: str,
    status: str,
    spend: float,
    impressions: int,
    clicks: int,
    purchases: int,
    revenue: float,
    ctr: float,
    price: float,
    cost: float,
    currency: str,
    budget_amount: float = 0.0,
    budget_type: str | None = None,
    campaign_name: str | None = None,
    product_name: str | None = None,
    ads_count: int | None = None,
    delivery_rate: float = 1.0,
    cancellation_rate: float = 0.0,
    store_orders_count: int = 0,
) -> dict[str, Any]:
    margin = price - cost if price > 0 else 0
    cpa = round(spend / purchases, 2) if purchases > 0 else 0.0
    roas = round(revenue / spend, 2) if spend > 0 else 0.0
    breakeven_roas = round(price / margin, 2) if margin > 0 else 2.0
    target_cpa = round(margin * 0.45, 2) if margin > 0 else round(price * 0.25, 2)

    # 2026 Delivery-Adjusted Net CPA (COD Reality)
    effective_delivery = max(delivery_rate, 0.05)
    net_cpa = round(spend / (purchases * effective_delivery), 2) if purchases > 0 else 0.0
    est_delivered_purchases = round(purchases * effective_delivery, 1) if purchases > 0 else 0

    decision = "WATCH"
    rationale = ""
    action_plan = ""

    if spend == 0 or impressions < 500:
        decision = "LEARNING"
        budget_info = f"، الميزانية اليومية: {budget_amount} {currency}" if budget_amount > 0 else ""
        rationale = f"في مرحلة الاستكشاف والتعلم الأولى (الظهور: {impressions}، الإنفاق: {spend} {currency}{budget_info})."
        action_plan = "ترك الحملة/الإعلان يعمل لمدة 24-48 ساعة بدون تعديل لإعطاء خوارزمية ميتا فرصة تثبيت مرحلة التعلم."
    elif purchases > 0:
        if roas >= breakeven_roas and (target_cpa == 0 or cpa <= target_cpa):
            # 2026 COD Gating Guard: Check real store delivery and cancellation rate
            if store_orders_count >= 10 and (delivery_rate < 0.50 or cancellation_rate > 0.35):
                decision = "RISKY_SCALE"
                rationale = (
                    f"تحذير أمان كاش (2026 COD Gating): الأداء الاسمي على ميتا يبدو رابحاً (ROAS: {roas}x, CPA: {cpa} {currency})، "
                    f"ولكن نسبة تسليم المتجر الفعلية ضعيفة ({round(delivery_rate * 100, 1)}%) ونسبة الإلغاء مرتفعة ({round(cancellation_rate * 100, 1)}%). "
                    f"هذا يرفع التكلفة الحقيقية للطلب المُسلّم Net CPA إلى {net_cpa} {currency}. التوسع بالميزانية الآن سيحرق كاش في شحنات مرتجعة."
                )
                action_plan = "تجميد الميزانية حالياً وتفعيل التأكيد الهاتفي الفوري للطلبات لرفع معدل التسليم فوق 60% قبل تنفيذ أي Scale."
            else:
                decision = "SCALE"
                rationale = f"أداء رابح وممتاز: العائد ROAS ({roas}x) يتفوق على نقطة التعادل ({breakeven_roas}x)، وتكلفة الشراء CPA ({cpa} {currency}) ممتازة وضمن المستهدف ({target_cpa} {currency})."
                action_plan = "زيادة الميزانية اليومية بنسبة 20% تدريجياً وتجهيز كرييتف بديل لتفادي تشبع الجمهور."
        elif roas >= 1.0:
            decision = "WATCH"
            rationale = f"تحقق مبيعات بعائد ROAS ({roas}x) يقترب من التعادل ({breakeven_roas}x)، لكن الهامش ضيق."
            action_plan = "مراقبة معدل التحويل CR وسرعة صفحة الهبوط على الهاتف لتحسين الـ CPA."
        else:
            decision = "FIX_OFFER"
            rationale = f"العائد ROAS ({roas}x) أقل من نقطة التعادل ({breakeven_roas}x)، وتكلفة الاكتساب CPA ({cpa} {currency}) تلتهم الربحية."
            action_plan = "تطوير العرض التجاري (عرض قطعتين بخصم إضافي أو شحن مجاني) لرفع متوسط قيمة الطلب AOV."
    else:
        # 0 Purchases
        price_limit = price if price > 0 else 500.0
        if spend > (price_limit * 1.5):
            decision = "KILL"
            rationale = f"تجاوز الإنفاق ({spend} {currency}) حاجز الأمان المالي (1.5x سعر المنتج) دون تسجيل أي طلب شراء مؤكد."
            action_plan = "إيقاف الإعلان/الحملة فوراً لوقف الهدر المالي واختبار زاوية تسويقية جديدة."
        elif impressions > 2000 and ctr < 0.01:
            decision = "FIX_CREATIVE"
            rationale = f"نسبة النقر CTR ({round(ctr * 100, 2)}%) منخفضة جداً (أقل من 1%) رغم تسجيل {impressions} ظهور."
            action_plan = "تغيير الكرييتف الإعلاني (الصورة/الفيديو) وتجديد الهوك (Hook) في أول سطرين."
        elif clicks > 40 and purchases == 0:
            decision = "FIX_LANDING"
            rationale = f"يجلب نقرات مهتمة ({clicks} نقرة) دون تحويلها لطلبات على صفحة المتجر."
            action_plan = "فحص تجربة الشراء بصفحة الهبوط وسرعة التحميل وتسهيل خيار الدفع عند الاستلام."
        else:
            decision = "WATCH"
            rationale = f"البيانات قيد الجمع والتحليل الأولي (الإنفاق: {spend} {currency}، النقرات: {clicks})."
            action_plan = "الانتظار حتى بلوغ 50 نقرة على الأقل قبل اتخاذ قرار حاسم."

    item_dict: dict[str, Any] = {
        "type": item_type,
        "id": item_id,
        "name": name,
        "status": status,
        "spend": spend,
        "impressions": impressions,
        "clicks": clicks,
        "purchases": purchases,
        "revenue": revenue,
        "ctr": f"{round(ctr * 100, 2)}%",
        "cpa": cpa,
        "net_cpa": net_cpa,
        "est_delivered_purchases": est_delivered_purchases,
        "roas": f"{roas}x",
        "breakeven_roas": f"{breakeven_roas}x",
        "target_cpa": target_cpa,
        "currency": currency,
        "decision": decision,
        "analysis": rationale,
        "recommendation": action_plan,
        "store_delivery_rate": f"{round(delivery_rate * 100, 1)}%" if store_orders_count > 0 else "غير محدد",
    }
    if item_type == "CAMPAIGN":
        item_dict["budget_amount"] = budget_amount
        item_dict["budget_type"] = budget_type or "DAILY"
        item_dict["ads_count"] = ads_count or 0
    else:
        item_dict["campaign_name"] = campaign_name or "غير محدد"
        item_dict["product_name"] = product_name

    return item_dict


async def facebook_ad_get_decision(input_data: FacebookAdGetDecisionInput) -> dict[str, Any]:
    """Retrieve dynamic Media Buyer performance decisions (SCALE, KILL, FIX_CREATIVE, FIX_OFFER, WATCH) based on live ad insights & unit economics."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    sf = _db_mod.async_session
    if not sf:
        return {"success": False, "error": "Database session unavailable"}

    async with sf() as session:
        # 1. Fetch store baseline economics (currency, default price, cost, sample product)
        baseline_row = await session.execute(
            text('SELECT c.currency, p.name, p.price, p.cost FROM public.companies c LEFT JOIN public.products p ON p."companyId" = c.id AND p."deletedAt" IS NULL WHERE c.id = :cid ORDER BY p."createdAt" DESC LIMIT 1'),
            {"cid": company_id}
        )
        base_match = baseline_row.first()
        default_currency = str(base_match.currency if base_match and base_match.currency else "EGP").upper()
        default_price = float(base_match.price) if base_match and base_match.price else 500.0
        default_cost = float(base_match.cost) if base_match and base_match.cost else (default_price * 0.5)
        default_prod_name = base_match.name if base_match and base_match.name else None

        # 1.1 Fetch 30-day store COD health (Delivery rate & Cancellation rate)
        cod_stats_row = await session.execute(
            text("""
                SELECT 
                    COUNT(id) AS total_orders,
                    COUNT(id) FILTER (WHERE status::text IN ('DELIVERED', 'COMPLETED')) AS delivered_orders,
                    COUNT(id) FILTER (WHERE status::text IN ('CANCELLED', 'CANCELED', 'RETURNED', 'REJECTED', 'REFUNDED', 'LOST')) AS cancelled_orders
                FROM public.orders
                WHERE "companyId" = :cid
                  AND "createdAt" >= NOW() - INTERVAL '30 days'
            """),
            {"cid": company_id}
        )
        cod_match = cod_stats_row.first()
        store_orders_count = int(cod_match.total_orders or 0) if cod_match else 0
        store_delivered_count = int(cod_match.delivered_orders or 0) if cod_match else 0
        store_cancelled_count = int(cod_match.cancelled_orders or 0) if cod_match else 0

        # Fallback to all-time orders if 30-day window has fewer than 10 orders
        if store_orders_count < 10:
            cod_all_row = await session.execute(
                text("""
                    SELECT 
                        COUNT(id) AS total_orders,
                        COUNT(id) FILTER (WHERE status::text IN ('DELIVERED', 'COMPLETED')) AS delivered_orders,
                        COUNT(id) FILTER (WHERE status::text IN ('CANCELLED', 'CANCELED', 'RETURNED', 'REJECTED', 'REFUNDED', 'LOST')) AS cancelled_orders
                    FROM public.orders
                    WHERE "companyId" = :cid
                """),
                {"cid": company_id}
            )
            cod_all = cod_all_row.first()
            if cod_all and int(cod_all.total_orders or 0) >= 10:
                store_orders_count = int(cod_all.total_orders or 0)
                store_delivered_count = int(cod_all.delivered_orders or 0)
                store_cancelled_count = int(cod_all.cancelled_orders or 0)

        store_delivery_rate = (store_delivered_count / store_orders_count) if store_orders_count > 0 else 1.0
        store_cancellation_rate = (store_cancelled_count / store_orders_count) if store_orders_count > 0 else 0.0

        limit = min(max(input_data.limit or 10, 1), 50)
        status_filter = input_data.status if input_data.status and input_data.status != "ALL" else None

        # 2. Query Campaigns (facebook_campaigns)
        camp_query = """
            SELECT c.id, c."facebookCampaignId", c.name, c.status, c."budgetType", c."budgetAmount", c."createdAt",
                   COALESCE(SUM(i.spend), 0) AS total_spend,
                   COALESCE(SUM(i.impressions), 0) AS total_impressions,
                   COALESCE(SUM(i.clicks), 0) AS total_clicks,
                   COALESCE(SUM(i.purchases), 0) AS total_purchases,
                   COALESCE(SUM(i."purchaseValue"), 0) AS total_revenue,
                   COALESCE(AVG(i.ctr), 0) AS avg_ctr,
                   COUNT(DISTINCT a.id) AS ads_count
            FROM public.facebook_campaigns c
            LEFT JOIN public.facebook_adsets s ON s."campaignId" = c.id
            LEFT JOIN public.facebook_ads a ON a."adSetId" = s.id
            LEFT JOIN public.facebook_ad_insights i ON i."adId" = a.id
            WHERE c."companyId" = :cid
        """
        camp_params: dict[str, Any] = {"cid": company_id, "limit": limit}
        if status_filter:
            camp_query += " AND c.status = :status_filter"
            camp_params["status_filter"] = status_filter
        if input_data.campaign_id:
            camp_query += ' AND (c.id = :camp_id OR c."facebookCampaignId" = :camp_id)'
            camp_params["camp_id"] = input_data.campaign_id

        camp_query += """
            GROUP BY c.id, c."facebookCampaignId", c.name, c.status, c."budgetType", c."budgetAmount", c."createdAt"
            ORDER BY (CASE WHEN c.status = 'ACTIVE' THEN 0 ELSE 1 END), c."createdAt" DESC
            LIMIT :limit
        """
        camp_result = await session.execute(text(camp_query), camp_params)
        camp_rows = camp_result.fetchall()

        # If filtered by ACTIVE but none returned, retry without status filter to show available campaigns
        if not camp_rows and status_filter and not input_data.campaign_id:
            camp_fallback = await session.execute(
                text("""
                    SELECT c.id, c."facebookCampaignId", c.name, c.status, c."budgetType", c."budgetAmount", c."createdAt",
                           COALESCE(SUM(i.spend), 0) AS total_spend,
                           COALESCE(SUM(i.impressions), 0) AS total_impressions,
                           COALESCE(SUM(i.clicks), 0) AS total_clicks,
                           COALESCE(SUM(i.purchases), 0) AS total_purchases,
                           COALESCE(SUM(i."purchaseValue"), 0) AS total_revenue,
                           COALESCE(AVG(i.ctr), 0) AS avg_ctr,
                           COUNT(DISTINCT a.id) AS ads_count
                    FROM public.facebook_campaigns c
                    LEFT JOIN public.facebook_adsets s ON s."campaignId" = c.id
                    LEFT JOIN public.facebook_ads a ON a."adSetId" = s.id
                    LEFT JOIN public.facebook_ad_insights i ON i."adId" = a.id
                    WHERE c."companyId" = :cid
                    GROUP BY c.id, c."facebookCampaignId", c.name, c.status, c."budgetType", c."budgetAmount", c."createdAt"
                    ORDER BY c."createdAt" DESC
                    LIMIT :limit
                """),
                {"cid": company_id, "limit": limit}
            )
            camp_rows = camp_fallback.fetchall()

        # 3. Query Ads (facebook_ads)
        ads_query = """
            SELECT a.id, a."facebookAdId", a.name, a.status, a."createdAt", a."productId",
                   c.name AS campaign_name,
                   c.id AS campaign_id,
                   COALESCE(SUM(i.spend), 0) AS total_spend,
                   COALESCE(SUM(i.impressions), 0) AS total_impressions,
                   COALESCE(SUM(i.clicks), 0) AS total_clicks,
                   COALESCE(SUM(i.purchases), 0) AS total_purchases,
                   COALESCE(SUM(i."purchaseValue"), 0) AS total_revenue,
                   COALESCE(AVG(i.ctr), 0) AS avg_ctr,
                   COALESCE(AVG(i.cpc), 0) AS avg_cpc,
                   p.name AS product_name,
                   p.price AS product_price,
                   p.cost AS product_cost
            FROM public.facebook_ads a
            LEFT JOIN public.facebook_adsets s ON s.id = a."adSetId"
            LEFT JOIN public.facebook_campaigns c ON c.id = s."campaignId"
            LEFT JOIN public.facebook_ad_insights i ON i."adId" = a.id
            LEFT JOIN public.products p ON p.id = a."productId"
            WHERE a."companyId" = :cid
        """
        ads_params: dict[str, Any] = {"cid": company_id, "limit": limit}
        if status_filter:
            ads_query += " AND a.status = :status_filter"
            ads_params["status_filter"] = status_filter
        if input_data.ad_id:
            ads_query += ' AND (a."facebookAdId" = :aid OR a.id = :aid)'
            ads_params["aid"] = input_data.ad_id
        if input_data.campaign_id:
            ads_query += ' AND (c."facebookCampaignId" = :camp_id OR c.id = :camp_id)'
            ads_params["camp_id"] = input_data.campaign_id

        ads_query += """
            GROUP BY a.id, a."facebookAdId", a.name, a.status, a."createdAt", a."productId",
                     c.name, c.id, p.name, p.price, p.cost
            ORDER BY (CASE WHEN a.status = 'ACTIVE' THEN 0 ELSE 1 END), a."createdAt" DESC
            LIMIT :limit
        """
        ads_result = await session.execute(text(ads_query), ads_params)
        ads_rows = ads_result.fetchall()

        # If filtered by ACTIVE but none returned, retry without status filter
        if not ads_rows and status_filter and not input_data.ad_id:
            ads_fallback = await session.execute(
                text("""
                    SELECT a.id, a."facebookAdId", a.name, a.status, a."createdAt", a."productId",
                           c.name AS campaign_name,
                           c.id AS campaign_id,
                           COALESCE(SUM(i.spend), 0) AS total_spend,
                           COALESCE(SUM(i.impressions), 0) AS total_impressions,
                           COALESCE(SUM(i.clicks), 0) AS total_clicks,
                           COALESCE(SUM(i.purchases), 0) AS total_purchases,
                           COALESCE(SUM(i."purchaseValue"), 0) AS total_revenue,
                           COALESCE(AVG(i.ctr), 0) AS avg_ctr,
                           COALESCE(AVG(i.cpc), 0) AS avg_cpc,
                           p.name AS product_name,
                           p.price AS product_price,
                           p.cost AS product_cost
                    FROM public.facebook_ads a
                    LEFT JOIN public.facebook_adsets s ON s.id = a."adSetId"
                    LEFT JOIN public.facebook_campaigns c ON c.id = s."campaignId"
                    LEFT JOIN public.facebook_ad_insights i ON i."adId" = a.id
                    LEFT JOIN public.products p ON p.id = a."productId"
                    WHERE a."companyId" = :cid
                    GROUP BY a.id, a."facebookAdId", a.name, a.status, a."createdAt", a."productId",
                             c.name, c.id, p.name, p.price, p.cost
                    ORDER BY a."createdAt" DESC
                    LIMIT :limit
                """),
                {"cid": company_id, "limit": limit}
            )
            ads_rows = ads_fallback.fetchall()

        # Fallback if no campaigns or ads exist:
        if not camp_rows and not ads_rows:
            rec_text = (
                f"لا توجد حملات أو إعلانات مسجلة حالياً. يمكنك البدء فوراً بإنشاء 3 زوايا إعلانية لمنتج '{default_prod_name}' بسعر {default_price} باستخدام أمر إنشاء المسودة."
                if default_prod_name else
                "لا توجد حملات إعلانية نشطة أو إعلانات مسجلة حالياً. يُرجى رفع منتجات بالمتجر أولاً للبدء في توليد الحملات."
            )
            return {
                "success": True,
                "decision": "NO_DATA",
                "campaigns_count": 0,
                "ad_count": 0,
                "message": rec_text,
                "rules": [
                    "SCALE: تكلفة الاقتناء أقل من الهدف والـ ROAS أعلى من نقطة التعادل بمقدار 20%+ مع ضمان معدل تسليم COD فوق 50%.",
                    "RISKY_SCALE: مؤشرات ميتا رابحة لكن نسبة تسليم المتجر ضعيفة (<50%) أو نسبة الإلغاء مرتفعة (>35%)، مما يهدد بحرق كاش في المرتجعات.",
                    "KILL: تجاوز الإنفاق ضعف سعر المنتج دون تحقيق مبيعات.",
                    "FIX_CREATIVE: تجاوز 2000 ظهور بنسبة نقر (CTR) أقل من 1%.",
                    "FIX_LANDING: نقرات مرتفعة وزيارات للموقع دون إتمام الطلب."
                ]
            }

        # 4. Evaluate each campaign
        campaign_evaluations: list[dict[str, Any]] = []
        for r in camp_rows:
            row = dict(r._mapping)
            c_spend = float(row.get("total_spend") or 0)
            c_impressions = int(row.get("total_impressions") or 0)
            c_clicks = int(row.get("total_clicks") or 0)
            c_purchases = int(row.get("total_purchases") or 0)
            c_revenue = float(row.get("total_revenue") or 0)
            c_ctr = float(row.get("avg_ctr") or (c_clicks / c_impressions if c_impressions > 0 else 0))
            c_budget = float(row.get("budgetAmount") or 0)

            c_eval = _evaluate_performance_item(
                item_type="CAMPAIGN",
                item_id=str(row.get("facebookCampaignId") or row.get("id")),
                name=str(row.get("name") or "حملة إعلانية"),
                status=str(row.get("status") or "ACTIVE"),
                spend=c_spend,
                impressions=c_impressions,
                clicks=c_clicks,
                purchases=c_purchases,
                revenue=c_revenue,
                ctr=c_ctr,
                price=default_price,
                cost=default_cost,
                currency=default_currency,
                budget_amount=c_budget,
                budget_type=row.get("budgetType"),
                ads_count=int(row.get("ads_count") or 0),
                delivery_rate=store_delivery_rate,
                cancellation_rate=store_cancellation_rate,
                store_orders_count=store_orders_count,
            )
            campaign_evaluations.append(c_eval)

        # 5. Evaluate each ad
        ad_evaluations: list[dict[str, Any]] = []
        for r in ads_rows:
            row = dict(r._mapping)
            a_spend = float(row.get("total_spend") or 0)
            a_impressions = int(row.get("total_impressions") or 0)
            a_clicks = int(row.get("total_clicks") or 0)
            a_purchases = int(row.get("total_purchases") or 0)
            a_revenue = float(row.get("total_revenue") or 0)
            a_ctr = float(row.get("avg_ctr") or (a_clicks / a_impressions if a_impressions > 0 else 0))
            a_price = float(row.get("product_price") or default_price)
            a_cost = float(row.get("product_cost") or default_cost)

            a_eval = _evaluate_performance_item(
                item_type="AD",
                item_id=str(row.get("facebookAdId") or row.get("id")),
                name=str(row.get("name") or "إعلان فيسبوك"),
                status=str(row.get("status") or "ACTIVE"),
                spend=a_spend,
                impressions=a_impressions,
                clicks=a_clicks,
                purchases=a_purchases,
                revenue=a_revenue,
                ctr=a_ctr,
                price=a_price,
                cost=a_cost,
                currency=default_currency,
                campaign_name=row.get("campaign_name"),
                product_name=row.get("product_name"),
                delivery_rate=store_delivery_rate,
                cancellation_rate=store_cancellation_rate,
                store_orders_count=store_orders_count,
            )
            ad_evaluations.append(a_eval)

        # Primary representative item (prefer requested or top campaign/ad)
        primary_item = campaign_evaluations[0] if campaign_evaluations else ad_evaluations[0]

        response_payload: dict[str, Any] = {
            "success": True,
            # Backward-compatible single-item fields
            "decision": primary_item.get("decision"),
            "ad_id": primary_item.get("id"),
            "ad_name": primary_item.get("name"),
            "metrics": {
                "spend": primary_item.get("spend"),
                "impressions": primary_item.get("impressions"),
                "clicks": primary_item.get("clicks"),
                "purchases": primary_item.get("purchases"),
                "revenue": primary_item.get("revenue"),
                "ctr": primary_item.get("ctr"),
                "cpa": primary_item.get("cpa"),
                "net_cpa": primary_item.get("net_cpa"),
                "est_delivered_purchases": primary_item.get("est_delivered_purchases"),
                "store_delivery_rate": primary_item.get("store_delivery_rate"),
                "roas": primary_item.get("roas"),
                "breakeven_roas": primary_item.get("breakeven_roas"),
                "target_cpa": primary_item.get("target_cpa"),
                "currency": primary_item.get("currency"),
            },
            "store_cod_health": {
                "total_orders_sample": store_orders_count,
                "delivered_orders": store_delivered_count,
                "cancelled_orders": store_cancelled_count,
                "delivery_rate": f"{round(store_delivery_rate * 100, 1)}%",
                "cancellation_rate": f"{round(store_cancellation_rate * 100, 1)}%",
                "status": "HEALTHY" if store_delivery_rate >= 0.60 and store_cancellation_rate <= 0.25 else ("CRITICAL" if store_delivery_rate < 0.40 else "WARNING"),
            },
            "analysis": primary_item.get("analysis"),
            "recommendation": primary_item.get("recommendation"),
            "evaluated_ads_count": len(ad_evaluations),
            "evaluated_campaigns_count": len(campaign_evaluations),
            # Full multi-item lists
            "campaigns": campaign_evaluations,
            "ads": ad_evaluations,
            "summary": {
                "total_active_campaigns": len([c for c in campaign_evaluations if c.get("status") == "ACTIVE"]),
                "total_active_ads": len([a for a in ad_evaluations if a.get("status") == "ACTIVE"]),
                "total_spend": round(sum(c.get("spend", 0.0) for c in campaign_evaluations) or sum(a.get("spend", 0.0) for a in ad_evaluations), 2),
                "total_revenue": round(sum(c.get("revenue", 0.0) for c in campaign_evaluations) or sum(a.get("revenue", 0.0) for a in ad_evaluations), 2),
                "store_delivery_rate": f"{round(store_delivery_rate * 100, 1)}%",
            },
        }

        # Hermes Autonomous Learning: Automatically distill high-confidence decisions into the merchant's playbook
        if primary_item.get("decision") in ("SCALE", "KILL", "FIX_OFFER", "FIX_CREATIVE"):
            try:
                from src.skills.learner import autonomous_skill_learner
                distill_res = await autonomous_skill_learner.distill_ad_performance(
                    company_id=company_id,
                    ad_metrics={
                        "ad_name": primary_item.get("name"),
                        "product_name": primary_item.get("product_name"),
                        "spend": primary_item.get("spend"),
                        "revenue": primary_item.get("revenue"),
                        "purchases": primary_item.get("purchases"),
                        "ctr": float(str(primary_item.get("ctr", "0")).replace("%", "")) / 100.0,
                        "cpa": primary_item.get("cpa"),
                        "roas": float(str(primary_item.get("roas", "0")).replace("x", "")),
                        "target_cpa": primary_item.get("target_cpa"),
                        "currency": primary_item.get("currency"),
                    },
                    session=session,
                )
                if distill_res.get("success"):
                    response_payload["learned_rule"] = distill_res.get("rule_added")
                    response_payload["playbook_updated"] = True
            except Exception as distill_err:
                logger.warning("auto_distill_on_decision_failed", error=str(distill_err))

        return response_payload


class FacebookAdRecordLearnedRuleInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    skill_type: Literal["MEDIA_BUYER", "SALES_CLOSING"] = Field(default="MEDIA_BUYER", description="Category of rule")
    rule_title: str = Field(description="Brief title of the learned rule")
    rule_instructions: str = Field(description="Specific operational instruction to remember for future campaigns or chats")
    metrics_summary: dict[str, Any] | None = Field(default=None, description="Optional supporting metrics (ROAS, CPA, etc.)")


async def facebook_ad_record_learned_rule(input_data: FacebookAdRecordLearnedRuleInput) -> dict[str, Any]:
    """Hermes /learn command for Media Buyer & Sales: record an explicit rule into the merchant's persistent playbook."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.skills.learner import autonomous_skill_learner
    formatted_rule = f"- [{input_data.rule_title}] {input_data.rule_instructions}"
    skill_id = f"media_buyer_playbook_{company_id}" if input_data.skill_type == "MEDIA_BUYER" else f"sales_closing_playbook_{company_id}"
    skill_name = "كتيب استراتيجيات إعلانات المتجر" if input_data.skill_type == "MEDIA_BUYER" else "كتيب إغلاق المبيعات والرد على الاعتراضات"

    return await autonomous_skill_learner._upsert_playbook_rule(
        company_id=company_id,
        skill_id=skill_id,
        skill_name=skill_name,
        skill_type=input_data.skill_type,
        new_rule_line=formatted_rule,
        rule_metadata={
            "source": "AGENT_EXPLICIT_LEARN",
            "title": input_data.rule_title,
            "metrics": input_data.metrics_summary or {},
            "learned_at": datetime.now(timezone.utc).isoformat(),
        },
    )


# ── New Ad Account Info & Campaign Attribution Tools ──────────────────────────

class FacebookAdAccountInfoInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrdersCampaignAttributionInput(BaseModel):
    period: str = Field(default="30", description="Reporting period in days (e.g. '7', '14', '30', '90')")
    campaign_name: str | None = Field(default=None, description="Optional campaign name filter")
    source: str | None = Field(default=None, description="Optional UTM source filter (e.g. 'facebook', 'instagram')")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_ad_account_info(input_data: FacebookAdAccountInfoInput) -> dict[str, Any]:
    """Retrieve details of connected Facebook Ad Accounts, active account ID, connected Facebook pages, and pixel ID."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    sf = _db_mod.async_session
    if not sf:
        return {"success": False, "error": "Database session unavailable"}

    async with sf() as session:
        # 1. Fetch connected ad accounts
        accounts_res = await session.execute(
            text("""
                SELECT a.id, a."accountId", a.name, a.currency, a.timezone, a."isActive",
                       COUNT(DISTINCT c.id) as campaigns_count
                FROM public.facebook_ad_accounts a
                LEFT JOIN public.facebook_campaigns c ON c."adAccountId" = a.id
                WHERE a."companyId" = :cid
                GROUP BY a.id, a."accountId", a.name, a.currency, a.timezone, a."isActive"
                ORDER BY a."isActive" DESC, a."createdAt" DESC
            """),
            {"cid": company_id}
        )
        acc_rows = accounts_res.fetchall()
        accounts_list = []
        active_account = None
        for r in acc_rows:
            raw_id = str(r.accountId or "")
            clean_acc_id = f"act_{raw_id}" if raw_id and not raw_id.startswith("act_") else raw_id
            acc_data = {
                "id": str(r.id),
                "account_id": clean_acc_id,
                "name": str(r.name or "Unnamed Account"),
                "currency": str(r.currency or "EGP").upper(),
                "timezone": str(r.timezone or "Africa/Cairo"),
                "is_active": bool(r.isActive),
                "campaigns_count": int(r.campaigns_count or 0),
            }
            accounts_list.append(acc_data)
            if r.isActive and active_account is None:
                active_account = acc_data

        # 2. Fetch connected Facebook pages
        pages_res = await session.execute(
            text("""
                SELECT "pageId", "pageName", "instagramAccountId", "instagramAccountName", status
                FROM public.facebook_pages
                WHERE "companyId" = :cid AND status = 'connected'
                ORDER BY "connectedAt" DESC
            """),
            {"cid": company_id}
        )
        page_rows = pages_res.fetchall()
        pages_list = [
            {
                "page_id": str(p.pageId),
                "page_name": str(p.pageName or "Facebook Page"),
                "instagram_account": str(p.instagramAccountName) if p.instagramAccountName else None,
                "status": str(p.status),
            }
            for p in page_rows
        ]

        # 3. Check pixel from recent campaigns, storefront settings, or pixel configs
        pixel_res = await session.execute(
            text("""
                SELECT c."pixelId" FROM public.facebook_pixel_configs c
                JOIN public.storefront_settings s ON s.id = c."storefrontSettingsId"
                WHERE s."companyId" = :cid AND c."pixelId" IS NOT NULL AND c."pixelId" != ''
                UNION
                SELECT "facebookPixelId" AS "pixelId" FROM public.storefront_settings WHERE "companyId" = :cid AND "facebookPixelId" IS NOT NULL AND "facebookPixelId" != ''
                UNION
                SELECT "pixelId" FROM public.facebook_campaigns WHERE "companyId" = :cid AND "pixelId" IS NOT NULL AND "pixelId" != ''
                LIMIT 1
            """),
            {"cid": company_id}
        )
        pixel_row = pixel_res.first()
        pixel_id = str(pixel_row.pixelId) if pixel_row and pixel_row.pixelId else None

        return {
            "success": True,
            "connected": len(accounts_list) > 0,
            "active_ad_account": active_account or (accounts_list[0] if accounts_list else None),
            "accounts_count": len(accounts_list),
            "all_ad_accounts": accounts_list,
            "connected_pages": pages_list,
            "pixel_id": pixel_id,
        }


async def orders_campaign_attribution_report(input_data: OrdersCampaignAttributionInput) -> dict[str, Any]:
    """Retrieve UTM campaign attribution report, order conversions, and actual store sales linked to marketing campaigns."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    sf = _db_mod.async_session
    if not sf:
        return {"success": False, "error": "Database session unavailable"}

    async with sf() as session:
        try:
            days = int(input_data.period or "30")
        except Exception:
            days = 30
        days = min(max(days, 1), 365)

        orders_res = await session.execute(
            text("""
                SELECT "orderNumber", status, total, metadata, "createdAt"
                FROM public.orders
                WHERE "companyId" = :cid 
                  AND status NOT IN ('DRAFT', 'TRASH')
                  AND "createdAt" >= NOW() - (:days || ' days')::interval
                ORDER BY "createdAt" DESC
                LIMIT 500
            """),
            {"cid": company_id, "days": str(days)}
        )
        orders = orders_res.fetchall()

        campaign_map: dict[str, dict[str, Any]] = {}
        source_map: dict[str, dict[str, Any]] = {}
        total_rev = 0.0
        total_cnt = 0
        delivered_cnt = 0
        delivered_rev = 0.0
        cancelled_cnt = 0

        for o in orders:
            meta = o.metadata
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            elif not isinstance(meta, dict):
                meta = {}

            attr = meta.get("attribution") if isinstance(meta, dict) else {}
            if isinstance(attr, str):
                try:
                    attr = json.loads(attr)
                except Exception:
                    attr = {}
            elif not isinstance(attr, dict):
                attr = {}

            src = str(attr.get("source") or attr.get("utm_source") or "direct").strip().lower()
            cmp = str(attr.get("campaignName") or attr.get("utm_campaign") or "unattributed").strip()

            if input_data.source and input_data.source.lower() not in src:
                continue
            if input_data.campaign_name and input_data.campaign_name.lower() not in cmp.lower():
                continue

            total_cnt += 1
            rev = float(o.total or 0)
            total_rev += rev
            status = str(o.status or "").upper()
            if status == "DELIVERED":
                delivered_cnt += 1
                delivered_rev += rev
            elif status in ("CANCELLED", "RETURNED", "DUPLICATE_ORDER"):
                cancelled_cnt += 1

            if src not in source_map:
                source_map[src] = {"source": src, "orders_count": 0, "revenue": 0.0}
            source_map[src]["orders_count"] += 1
            source_map[src]["revenue"] = round(source_map[src]["revenue"] + rev, 2)

            if cmp not in campaign_map:
                campaign_map[cmp] = {"campaign_name": cmp, "source": src, "orders_count": 0, "revenue": 0.0}
            campaign_map[cmp]["orders_count"] += 1
            campaign_map[cmp]["revenue"] = round(campaign_map[cmp]["revenue"] + rev, 2)

        return {
            "success": True,
            "period_days": days,
            "summary": {
                "total_orders": total_cnt,
                "total_revenue": round(total_rev, 2),
                "delivered_orders": delivered_cnt,
                "delivered_revenue": round(delivered_rev, 2),
                "cancelled_orders": cancelled_cnt,
                "average_order_value": round(total_rev / total_cnt, 2) if total_cnt > 0 else 0.0,
                "delivery_rate": f"{round((delivered_cnt / total_cnt) * 100, 1)}%" if total_cnt > 0 else "0.0%",
                "tracked_campaigns_count": len(campaign_map),
                "tracked_sources_count": len(source_map),
            },
            "by_campaign": sorted(list(campaign_map.values()), key=lambda x: x["revenue"], reverse=True)[:15],
            "by_source": sorted(list(source_map.values()), key=lambda x: x["revenue"], reverse=True)[:10],
        }


async def facebook_ad_update_status(input_data: FacebookAdUpdateStatusInput) -> dict[str, Any]:
    """Pause or Resume an active Meta Facebook ad campaign directly."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.tools.backend_client import get_backend_client
    backend = get_backend_client()

    target_campaign_id = str(input_data.campaign_id or "").strip()
    if target_campaign_id and not target_campaign_id.isdigit():
        sf = _db_mod.async_session
        if sf:
            try:
                async with sf() as session:
                    db_camp_res = await session.execute(
                        text('SELECT "facebookCampaignId" FROM public.facebook_campaigns WHERE (id = :cid OR "facebookCampaignId" = :cid) AND "companyId" = :comp_id LIMIT 1'),
                        {"cid": target_campaign_id, "comp_id": company_id}
                    )
                    row = db_camp_res.fetchone()
                    if row and row[0]:
                        target_campaign_id = str(row[0])
            except Exception as resolve_err:
                logger.warning("failed_to_resolve_campaign_id_for_status", error=str(resolve_err))

    res = await backend.update_facebook_campaign_status(
        company_id=company_id,
        campaign_id=target_campaign_id,
        status=input_data.status,
    )

    if res.get("success"):
        # Update local draft record in DB if matches
        sf = _db_mod.async_session
        if sf:
            try:
                async with sf() as session:
                    await session.execute(
                        text("""
                            UPDATE public.facebook_ads_ai_drafts 
                            SET "status" = :st, "updatedAt" = NOW()
                            WHERE "facebookCampaignId" = :cid AND "companyId" = :comp_id
                        """),
                        {"st": input_data.status, "cid": input_data.campaign_id, "comp_id": company_id}
                    )
                    await session.commit()
            except Exception:
                pass

        action_word = "إيقاف" if input_data.status == "PAUSED" else "تفعيل"
        return {
            "success": True,
            "campaign_id": input_data.campaign_id,
            "status": input_data.status,
            "message": f"تم {action_word} الحملة الإعلانية بنجاح على فيسبوك (معرف الحملة: {input_data.campaign_id})."
        }
    else:
        return {
            "success": False,
            "error": res.get("error") or "تعذر تحديث حالة الحملة على فيسبوك",
            "campaign_id": input_data.campaign_id,
        }


async def facebook_ad_update_budget(input_data: FacebookAdUpdateBudgetInput) -> dict[str, Any]:
    """Update daily budget of an active Meta Facebook ad campaign directly."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    # Hard safety ceiling: 10,000 EGP per day
    if input_data.daily_budget > 10000:
        return {
            "success": False,
            "error": "الميزانية اليومية المطلوبة تتجاوز سقف الأمان الأقصى (10,000 ج.م/يوم). يُرجى تعديلها يدوياً إذا كنت متأكداً.",
            "campaign_id": input_data.campaign_id
        }

    target_campaign_id = str(input_data.campaign_id or "").strip()
    if target_campaign_id and not target_campaign_id.isdigit():
        sf = _db_mod.async_session
        if sf:
            try:
                async with sf() as session:
                    db_camp_res = await session.execute(
                        text('SELECT "facebookCampaignId" FROM public.facebook_campaigns WHERE (id = :cid OR "facebookCampaignId" = :cid) AND "companyId" = :comp_id LIMIT 1'),
                        {"cid": target_campaign_id, "comp_id": company_id}
                    )
                    row = db_camp_res.fetchone()
                    if row and row[0]:
                        target_campaign_id = str(row[0])
            except Exception as resolve_err:
                logger.warning("failed_to_resolve_campaign_id_for_budget", error=str(resolve_err))

    res = await backend.update_facebook_campaign_budget(
        company_id=company_id,
        campaign_id=target_campaign_id,
        daily_budget=input_data.daily_budget,
    )

    if res.get("success"):
        return {
            "success": True,
            "campaign_id": input_data.campaign_id,
            "daily_budget": input_data.daily_budget,
            "message": f"تم تعديل الميزانية اليومية للحملة {input_data.campaign_id} بنجاح إلى {input_data.daily_budget} ج.م."
        }
    else:
        return {
            "success": False,
            "error": res.get("error") or "تعذر تعديل ميزانية الحملة على فيسبوك",
            "campaign_id": input_data.campaign_id,
        }


# ── Tool Formatters ──────────────────────────────────────────────────────────

def _format_facebook_ad_analyze_product(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر تحليل بيانات المنتج: {res.get('error', 'خطأ غير معروف')}"
    p_name = res.get("product_name") or "المنتج"
    price = res.get("selling_price", 0)
    margin = res.get("margin_percent", 0)
    cpa = res.get("target_cpa", 0)
    budget = res.get("recommended_daily_budget", 0)
    roas = res.get("break_even_roas", 0)
    return (
        f"تحليل اقتصاديات '{p_name}': سعر البيع {price} ج.م، هامش الربح {margin}%، "
        f"سقف تكلفة الشراء (Target CPA) {cpa} ج.م، الـ Break-even ROAS: {roas}x، "
        f"الميزانية اليومية المقترحة للاختبار: {budget} ج.م."
    )


def _format_facebook_ad_create_full_draft(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر تجهيز مسودات الإعلان: {res.get('error', 'خطأ غير معروف')}"
    
    if res.get("published"):
        camp_id = res.get("facebook_campaign_id") or ""
        ad_id = res.get("facebook_ad_id") or ""
        return f"تم نشر الحملة الإعلانية بنجاح وبشكل فوري على منصة Meta Ads (معرف الحملة: {camp_id}، معرف الإعلان: {ad_id}) بحالة PAUSED للأمان."

    count = res.get("drafts_count", 0)
    drafts = res.get("drafts", [])
    angles = [d.get("angle", "") for d in drafts if isinstance(d, dict)]
    angles_str = "، ".join(filter(None, angles))
    first_draft_id = drafts[0].get("draft_id", "") if drafts else ""
    draft_id_str = f" [رقم المسودة: {first_draft_id}]" if first_draft_id else ""
    angles_info = f" (الزوايا: {angles_str})" if angles_str else ""
    return f"تم حفظ وتجهيز المسودات بنجاح في لوحة التحكم{draft_id_str}{angles_info}. [تنبيه هام: حالة الإعلان الحالية هي DRAFT فقط، لم يتم إرساله أو نشره على فيسبوك بعد. لنشر الإعلان يجب استدعاء أداة facebook_ad_publish_draft]."



def _format_facebook_ad_publish_draft(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر نشر المسودة: {res.get('message') or res.get('error', 'عائق في الاتصال بميتا')}"
    camp_id = res.get("facebook_campaign_id") or ""
    return f"تم نشر الحملة الإعلانية بنجاح على Meta Ads (معرف الحملة: {camp_id}) بحالة PAUSED بانتظار بدء التشغيل."


def _format_facebook_ad_get_decision(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر استخراج قرارات الحملات: {res.get('error', 'خطأ غير معروف')}"
    decisions = res.get("decisions", []) or res.get("campaigns", [])
    if not decisions:
        return "تم فحص الحساب الإعلاني: لا توجد حملات نشطة حالياً بحاجة إلى اتخاذ قرارات فورية."
    summary_parts = []
    for d in decisions[:5]:
        c_name = d.get("campaign_name") or d.get("name") or "حملة"
        dec = d.get("decision") or "WATCH"
        spend = d.get("spend", 0)
        summary_parts.append(f"{c_name}: [{dec}] (الإنفاق: {spend} ج.م)")
    return f"قرارات أداء الحملات ({len(decisions)} حملة): " + " | ".join(summary_parts)


def _format_facebook_ad_account_info(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر استرجاع بيانات الحساب الإعلاني: {res.get('error', 'غير متصل')}"
    accounts = res.get("ad_accounts") or res.get("accounts") or []
    if not accounts and res.get("account_id"):
        accounts = [res]
    if not accounts:
        return "لا توجد حسابات إعلانية متصلة حالياً بمتجرك على فيسبوك."
    acc_strs = []
    for a in accounts[:3]:
        name = a.get("name") or a.get("account_name") or a.get("account_id") or "حساب"
        status = "نشط" if (a.get("is_active") or a.get("status") == "ACTIVE") else "غير مفعّل"
        currency = a.get("currency", "EGP")
        acc_strs.append(f"{name} ({status} - {currency})")
    return f"الحسابات الإعلانية المتصلة: " + "، ".join(acc_strs)


def _format_orders_campaign_attribution_report(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        return f"تعذر استخراج تقرير العائد والربط: {res.get('error', 'لا توجد بيانات')}"
    orders_count = res.get("orders_count") or res.get("total_orders", 0)
    rev = res.get("total_revenue") or res.get("revenue", 0)
    return f"تقرير المبيعات والربط الإعلاني: {orders_count} طلب محقق بإجمالي إيرادات {rev} ج.م."


def _format_facebook_ad_record_learned_rule(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    rule = res.get("rule_title") or res.get("title") or "القاعدة"
    return f"تم تثبيت '{rule}' بنجاح كقاعدة استراتيجية دائمة في كتيب إعلانات المتجر."


def _format_facebook_ad_update_status(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        err = res.get("error", "خطأ غير معروف")
        if isinstance(err, dict):
            inner = err.get("error", err)
            err = inner.get("error_user_msg") or inner.get("message") or str(err)
        return f"تعذر تحديث حالة الحملة: {err}"
    return res.get("message") or f"تم تحديث حالة الحملة {res.get('campaign_id')} إلى {res.get('status')} بنجاح."


def _format_facebook_ad_update_budget(result: dict[str, Any]) -> str:
    res = result.get("result", result) if isinstance(result, dict) else {}
    if not res.get("success"):
        err = res.get("error", "خطأ غير معروف")
        if isinstance(err, dict):
            inner = err.get("error", err)
            err = inner.get("error_user_msg") or inner.get("message") or str(err)
        return f"تعذر تعديل ميزانية الحملة: {err}"
    return res.get("message") or f"تم تعديل ميزانية الحملة {res.get('campaign_id')} إلى {res.get('daily_budget')} ج.م بنجاح."


# ── Tool Definitions ─────────────────────────────────────────────────────────

facebook_ad_analyze_product_tool = FunctionTool(
    name="facebook_ad_analyze_product",
    description="Analyze a catalog product's economics, price, margins, and calculate target CPA and recommended testing budget for Meta Ads.",
    func=facebook_ad_analyze_product,
    input_model=FacebookAdAnalyzeProductInput,
    format_result=_format_facebook_ad_analyze_product,
)

facebook_ad_create_full_draft_tool = FunctionTool(
    name="facebook_ad_create_full_draft",
    description="Create full Facebook ad drafts with multiple strategic angles (Pain-Point, Offer, Social Proof). Set publish_now=True to immediately publish to Meta Ads Manager.",
    func=facebook_ad_create_full_draft,
    input_model=FacebookAdCreateFullDraftInput,
    format_result=_format_facebook_ad_create_full_draft,
)

facebook_ad_publish_draft_tool = FunctionTool(
    name="facebook_ad_publish_draft",
    description="Publish an approved Facebook ad draft directly to Meta Ads Manager and return the live Facebook IDs.",
    func=facebook_ad_publish_draft,
    input_model=FacebookAdPublishDraftInput,
    format_result=_format_facebook_ad_publish_draft,
)

facebook_ad_get_decision_tool = FunctionTool(
    name="facebook_ad_get_decision",
    description="Get Media Buyer performance recommendations (SCALE, KILL, FIX_CREATIVE, WATCH, LEARNING) for active Facebook campaigns and ads based on live unit economics, budgets, and ROAS.",
    func=facebook_ad_get_decision,
    input_model=FacebookAdGetDecisionInput,
    format_result=_format_facebook_ad_get_decision,
)

facebook_ad_record_learned_rule_tool = FunctionTool(
    name="facebook_ad_record_learned_rule",
    description="Record a newly learned operational rule or insight into the merchant's persistent playbook (Hermes self-learning).",
    func=facebook_ad_record_learned_rule,
    input_model=FacebookAdRecordLearnedRuleInput,
    format_result=_format_facebook_ad_record_learned_rule,
)

facebook_ad_account_info_tool = FunctionTool(
    name="facebook_ad_account_info",
    description="Get details of connected Facebook Ad Accounts (Account ID, Name, Currency, Timezone, Active status, Connected Pages, and Pixel ID) for the merchant's store.",
    func=facebook_ad_account_info,
    input_model=FacebookAdAccountInfoInput,
    format_result=_format_facebook_ad_account_info,
)

orders_campaign_attribution_report_tool = FunctionTool(
    name="orders_campaign_attribution_report",
    description="Retrieve UTM campaign attribution analytics and real store sales matching Facebook campaigns and ad sources (revenue, order counts, conversion rates, AOV, utm_source, utm_campaign).",
    func=orders_campaign_attribution_report,
    input_model=OrdersCampaignAttributionInput,
    format_result=_format_orders_campaign_attribution_report,
)

facebook_ad_update_status_tool = FunctionTool(
    name="facebook_ad_update_status",
    description="Pause (PAUSED) or Resume (ACTIVE) an active Facebook Meta Ad campaign directly.",
    func=facebook_ad_update_status,
    input_model=FacebookAdUpdateStatusInput,
    format_result=_format_facebook_ad_update_status,
)

facebook_ad_update_budget_tool = FunctionTool(
    name="facebook_ad_update_budget",
    description="Update the daily budget of an active Facebook Meta Ad campaign directly in EGP (hard safety cap <= 10,000 EGP/day).",
    func=facebook_ad_update_budget,
    input_model=FacebookAdUpdateBudgetInput,
    format_result=_format_facebook_ad_update_budget,
)

async def facebook_ad_search_targeting(input_data: FacebookAdSearchTargetingInput) -> dict[str, Any]:
    """Search Meta Graph API for official geolocation keys (regions, cities) or interests dynamically worldwide."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.tools.backend_client import get_backend_client
    backend = get_backend_client()
    try:
        res = await backend.search_facebook_targeting(
            company_id=company_id,
            query=input_data.query,
            search_type=input_data.search_type,
            country_code=input_data.country_code or "EG",
            limit=input_data.limit,
        )
        return res
    except Exception as exc:
        logger.warning("facebook_ad_search_targeting_failed", error=str(exc))
        return {"success": False, "error": str(exc), "data": []}


def _format_facebook_ad_search_targeting(result: dict[str, Any]) -> str:
    data = result.get("data") or []
    if not data:
        return "لم يتم العثور على نتائج مطابقة في قاعدة بيانات Meta."
    
    lines = [f"نتائج البحث في Meta ({len(data)} نتيجة):"]
    for item in data[:8]:
        name = item.get("name")
        key = item.get("key") or item.get("id")
        type_ = item.get("type") or "interest"
        country = item.get("country_name") or item.get("country_code") or ""
        lines.append(f"- {name} (Key: {key}, Type: {type_}, {country})")
    return "\n".join(lines)


facebook_ad_search_targeting_tool = FunctionTool(
    name="facebook_ad_search_targeting",
    description="Dynamically search Meta Ads Graph API for official geolocation keys (cities, regions, provinces) or interest categories for any country worldwide (EG, SA, AE, US, etc.).",
    func=facebook_ad_search_targeting,
    input_model=FacebookAdSearchTargetingInput,
    format_result=_format_facebook_ad_search_targeting,
)


class FacebookAdInspectTargetingInput(BaseModel):
    campaign_id: str | None = Field(default=None, description="معرف الحملة الإعلانية (Meta Campaign ID) لفحص إعدادات استهداف مجموعاتها الإعلانية")
    adset_id: str | None = Field(default=None, description="معرف المجموعة الإعلانية (Meta AdSet ID) لفحص الاستهداف الجغرافي والديموغرافي اللحظي")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_ad_inspect_targeting(input_data: FacebookAdInspectTargetingInput) -> dict[str, Any]:
    """Inspect live Meta targeting parameters (geolocations, ages, genders, placements, interests) for any campaign or adset."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.tools.backend_client import get_backend_client
    backend = get_backend_client()
    try:
        res = await backend.inspect_facebook_targeting(
            company_id=company_id,
            campaign_id=input_data.campaign_id,
            adset_id=input_data.adset_id,
        )
        return res
    except Exception as exc:
        logger.warning("facebook_ad_inspect_targeting_failed", error=str(exc))
        return {"success": False, "error": str(exc), "data": []}


def _format_facebook_ad_inspect_targeting(result: dict[str, Any]) -> str:
    data = result.get("data") or []
    if not data:
        return "لم يتم العثور على مجموعات إعلانية أو استهداف مسجل لهذه الحملة/المجموعة."

    lines = []
    for item in data:
        name = item.get("adSetName") or "المجموعة الإعلانية"
        status = item.get("status") or "UNKNOWN"
        summary = item.get("summary") or {}
        regions = summary.get("regions") or []
        countries = summary.get("countries") or []
        cities = summary.get("cities") or []
        custom_locs = summary.get("customLocations") or []
        exc_regions = summary.get("excludedRegions") or []
        exc_cities = summary.get("excludedCities") or []
        age = summary.get("ageRange") or "الكل"
        genders = summary.get("genders") or "الجميع"
        interests = summary.get("interests") or []
        is_live = "مباشر من خوادم Meta 🟢" if item.get("isLiveFromMeta") else "من قاعدة البيانات المحلية 🟡"

        loc_parts = []
        if regions:
            loc_parts.append("المحافظات: " + "، ".join(regions))
        if cities:
            loc_parts.append("المدن: " + "، ".join(cities))
        if custom_locs:
            loc_parts.append("نقاط الخريطة: " + "، ".join(custom_locs))
        if countries and not (regions or cities or custom_locs):
            loc_parts.append("الدول: " + "، ".join(countries))

        loc_text = " | ".join(loc_parts) if loc_parts else "الكل"

        exc_parts = []
        if exc_regions:
            exc_parts.append("محافظات مستبعدة: " + "، ".join(exc_regions))
        if exc_cities:
            exc_parts.append("مدن مستبعدة: " + "، ".join(exc_cities))
        exc_text = f" ({' | '.join(exc_parts)})" if exc_parts else ""

        interest_text = f" | الاهتمامات: {', '.join(interests)}" if interests else ""

        lines.append(
            f"🎯 **{name}** (الحالة: {status}) [{is_live}]:\n"
            f"- الاستهداف الجغرافي: {loc_text}{exc_text}\n"
            f"- الفئة العمرية: {age} | الجنس: {genders}{interest_text}"
        )

    return "\n\n".join(lines)


facebook_ad_inspect_targeting_tool = FunctionTool(
    name="facebook_ad_inspect_targeting",
    description="Inspect live Meta targeting parameters (regions, governorates, cities, GPS pin-drops, age, gender, exclusions, interests) directly from Meta Marketing API or database for any Campaign or AdSet ID.",
    func=facebook_ad_inspect_targeting,
    input_model=FacebookAdInspectTargetingInput,
    format_result=_format_facebook_ad_inspect_targeting,
)


__all_tools__ = [
    facebook_ad_analyze_product_tool,
    facebook_ad_create_full_draft_tool,
    facebook_ad_publish_draft_tool,
    facebook_ad_get_decision_tool,
    facebook_ad_record_learned_rule_tool,
    facebook_ad_account_info_tool,
    orders_campaign_attribution_report_tool,
    facebook_ad_update_status_tool,
    facebook_ad_update_budget_tool,
    facebook_ad_search_targeting_tool,
    facebook_ad_inspect_targeting_tool,
]



