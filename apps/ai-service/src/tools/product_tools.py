from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any

import structlog

import src.db.session as _db_mod
from src.tools.definitions._helpers import _write_result, period_start_date
from src.tools.repositories.product_search_repository import ProductSearchRepository

logger = structlog.get_logger(__name__)


_VARIANT_SIZE_ALIASES = {"size", "Size", "\u0645\u0642\u0627\u0633", "\u0627\u0644\u0645\u0642\u0627\u0633"}
_VARIANT_COLOR_ALIASES = {"color", "Color", "\u0644\u0648\u0646", "\u0627\u0644\u0644\u0648\u0646"}

_KNOWN_SIZES = {
    "xs", "s", "m", "l", "xl", "xxl", "xxxl", "3xl", "4xl", "5xl",
    "onesize", "one size", "free size", "free", "universal",
    "small", "medium", "large", "extra large",
    "\u0635\u063a\u064a\u0631", "\u0648\u0633\u0637", "\u0643\u0628\u064a\u0631",
}


def _looks_like_size(value: str) -> bool:
    val = value.strip()
    if re.match(r"^\d{1,3}(\.\d)?$", val):
        return True
    if val.lower() in _KNOWN_SIZES:
        return True
    return False


def _parse_variant_name(name: str) -> dict[str, str] | None:
    if not name:
        return None
    parts = re.split(r"\s*[/\-|\u060C,]\s*", name)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) >= 2:
        size_parts = [p for p in parts if _looks_like_size(p)]
        color_parts = [p for p in parts if not _looks_like_size(p)]
        result: dict[str, str] = {}
        if size_parts:
            result["size"] = size_parts[0]
        if color_parts:
            result["color"] = color_parts[0]
        if result:
            return result
    if _looks_like_size(name):
        return {"size": name}
    return None


def _aggregate_variants(
    variants: list[dict[str, Any]], aliases: set[str],
) -> list[dict[str, Any]]:
    is_size_dim = aliases == _VARIANT_SIZE_ALIASES
    is_color_dim = aliases == _VARIANT_COLOR_ALIASES
    result: list[dict[str, Any]] = []
    seen_values: set[str] = set()

    for v in variants:
        vtype = (v.get("type") or "").strip()
        name = v.get("name", "")
        direct_match = vtype in aliases
        parsed = _parse_variant_name(name)

        value = name
        if parsed:
            if is_size_dim and "size" in parsed:
                value = parsed["size"]
            elif is_color_dim and "color" in parsed:
                value = parsed["color"]

        if direct_match:
            pass
        elif parsed:
            if is_size_dim and "size" in parsed:
                pass
            elif is_color_dim and "color" in parsed:
                pass
            else:
                continue
        else:
            continue

        if value in seen_values:
            continue
        seen_values.add(value)

        stock = v.get("stock", 0)
        track = v.get("trackInventory", True)
        if stock is None:
            stock = 0
        result.append({
            "value": value,
            "sku": v.get("sku"),
            "stock": stock,
            "status": "AVAILABLE" if not track else (
                "OUT_OF_STOCK" if stock <= 0 else (
                    "LOW_STOCK" if 0 < stock <= 5 else "IN_STOCK"
                )
            ),
        })
    return result


def _clean_html_description(desc: str | None) -> str:
    if not desc or not isinstance(desc, str):
        return ""
    # Convert block tags / line breaks to newlines
    clean = re.sub(r"<(?:p|div|br|li|h[1-6])[^>]*>", "\n", desc, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    clean = re.sub(r"<[^>]+>", " ", clean)
    # Collapse multiple spaces and newlines
    clean = re.sub(r"[ \t]+", " ", clean)
    clean = re.sub(r"\n\s*\n+", "\n", clean).strip()
    return clean[:800]


def _fmt_num(val: float | int) -> str:
    try:
        f = float(val)
        return str(int(f)) if f.is_integer() else f"{f:.2f}".rstrip("0").rstrip(".")
    except (TypeError, ValueError):
        return str(val)


def _parse_quantity_offers(p: dict[str, Any]) -> list[dict[str, Any]]:
    raw_meta = p.get("metadata")
    meta: dict[str, Any] = {}
    if isinstance(raw_meta, dict):
        meta = raw_meta
    elif isinstance(raw_meta, str) and raw_meta.strip():
        try:
            parsed = json.loads(raw_meta)
            if isinstance(parsed, dict):
                meta = parsed
        except Exception:
            meta = {}

    raw_offers = (
        p.get("quantityOffers")
        or meta.get("quantityOffers")
        or meta.get("multiPackOffers")
        or meta.get("volumeDiscounts")
        or []
    )
    try:
        base_price = float(p.get("price") or 0)
    except (TypeError, ValueError):
        base_price = 0.0
    try:
        compare_price = float(p.get("comparePrice") or 0) if p.get("comparePrice") is not None else 0.0
    except (TypeError, ValueError):
        compare_price = 0.0

    if not isinstance(raw_offers, list) or not raw_offers:
        # Fallback: if product has a valid price, automatically generate standard 2-piece and 3-piece offers
        # so that every product in the catalog has bundle quantity offers (يطبق على كل المنتجات)
        if base_price > 0:
            if base_price >= 200:
                discount2 = 20.0
                discount3 = 30.0
            elif base_price >= 100:
                discount2 = 10.0
                discount3 = 20.0
            else:
                discount2 = round(base_price * 0.05, 2)
                discount3 = round(base_price * 0.10, 2)

            unit2 = max(base_price - discount2, 1.0)
            unit3 = max(base_price - discount3, 1.0)

            raw_offers = [
                {"quantity": 2, "unitPrice": unit2},
                {"quantity": 3, "unitPrice": unit3},
            ]
        else:
            return []

    ref_unit_price = compare_price if compare_price > base_price else base_price

    normalized: list[dict[str, Any]] = []
    for item in raw_offers:
        if not isinstance(item, dict):
            continue
        try:
            qty = int(item.get("quantity") or item.get("minQuantity") or 0)
        except (TypeError, ValueError):
            qty = 0
        if qty <= 0:
            continue

        try:
            unit_price = float(item.get("unitPrice") or item.get("price") or 0)
        except (TypeError, ValueError):
            unit_price = 0.0
        try:
            total_price = float(item.get("totalPrice") or (qty * unit_price))
        except (TypeError, ValueError):
            total_price = qty * unit_price

        if total_price <= 0 and unit_price <= 0:
            continue
        if unit_price <= 0 and qty > 0:
            unit_price = round(total_price / qty, 2)

        original_total = round(qty * ref_unit_price, 2) if ref_unit_price > 0 else 0.0

        if qty == 2:
            qty_label = "عرض القطعتين"
            buy_prefix = "اشتري قطعتين"
        elif qty == 3:
            qty_label = "عرض الـ 3 قطع"
            buy_prefix = "اشتري 3 قطع"
        else:
            qty_label = f"عرض {qty} قطع"
            buy_prefix = f"اشتري {qty} قطع"

        if original_total > total_price:
            summary = f"{qty_label} بـ {_fmt_num(total_price)} جنيه بدل {_fmt_num(original_total)} جنيه (سعر القطعة {_fmt_num(unit_price)} جنيه)"
            clean_buy_text = f"{buy_prefix} بـ {_fmt_num(total_price)} بدل {_fmt_num(original_total)} ج.م"
        else:
            summary = f"{qty_label} بـ {_fmt_num(total_price)} جنيه (سعر القطعة {_fmt_num(unit_price)} جنيه)"
            clean_buy_text = f"{buy_prefix} بـ {_fmt_num(total_price)} ج.م"

        raw_buy_text = str(item.get("buyText") or "").strip()
        if not raw_buy_text or (qty != 2 and "2 قطعة" in raw_buy_text):
            buy_text = clean_buy_text
        else:
            buy_text = raw_buy_text

        normalized.append({
            "quantity": qty,
            "unitPrice": int(unit_price) if unit_price.is_integer() else round(unit_price, 2),
            "totalPrice": int(total_price) if total_price.is_integer() else round(total_price, 2),
            "originalTotal": (int(original_total) if original_total.is_integer() else round(original_total, 2)) if original_total > total_price else None,
            "buyText": buy_text,
            "summary": summary,
        })

    normalized.sort(key=lambda o: o["quantity"])
    return normalized


def _map_product(p: dict[str, Any]) -> dict[str, Any]:
    variants = p.get("productVariants") or p.get("_variants") or []
    size_variants = _aggregate_variants(variants, _VARIANT_SIZE_ALIASES)
    color_variants = _aggregate_variants(variants, _VARIANT_COLOR_ALIASES)
    quantity_offers = _parse_quantity_offers(p)

    price_val = p.get("price")
    compare_val = p.get("comparePrice")
    discount_summary: str | None = None
    try:
        p_f = float(price_val or 0)
        c_f = float(compare_val or 0) if compare_val is not None else 0.0
        if c_f > p_f > 0:
            discount_summary = f"سعر القطعة {_fmt_num(p_f)} جنيه بدل {_fmt_num(c_f)} جنيه"
        elif p_f > 0:
            discount_summary = f"سعر القطعة {_fmt_num(p_f)} جنيه"
    except (TypeError, ValueError):
        pass

    offers_summary = "، و".join(o["summary"] for o in quantity_offers) if quantity_offers else None

    mapped: dict[str, Any] = {
        "id": p.get("id"),
        "name": p.get("name"),
        "sku": p.get("sku"),
        "price": price_val,
        "comparePrice": compare_val,
        "discountSummary": discount_summary,
        "quantityOffers": quantity_offers,
        "offersSummary": offers_summary,
        "stock": p.get("stock"),
        "status": _availability_status(p),
        "categoryName": p.get("categoryName"),
        "featured": bool(p.get("isFeatured")),
        "description": _clean_html_description(p.get("description")),
        "images": _parse_images(p),
        "availableSizes": size_variants,
        "availableColors": color_variants,
    }
    return mapped


def _availability_status(product: dict[str, Any]) -> str:
    stock = product.get("stock", 0)
    track = product.get("trackInventory", True)
    if not track:
        return "AVAILABLE"
    if stock is None or stock <= 0:
        return "OUT_OF_STOCK"
    return "IN_STOCK"


def _is_valid_image_url(url: str) -> bool:
    return bool(url and (
        url.startswith("http://")
        or url.startswith("https://")
        or url.startswith("/")  # relative server path — will be made absolute
    ))


def _make_absolute_url(url: str) -> str:
    if url.startswith("/"):
        from src.config import get_settings
        base = (get_settings().maxp_api_url or "").rstrip("/")
        return f"{base}{url}"
    return url


def _parse_images(product: dict[str, Any]) -> list[str]:
    images: list[str] = []
    main = product.get("mainImage")
    if main and _is_valid_image_url(str(main)):
        images.append(_make_absolute_url(str(main)))
    extra = product.get("images")
    if isinstance(extra, list):
        for img in extra:
            if img and _is_valid_image_url(str(img)):
                images.append(_make_absolute_url(str(img)))
    elif isinstance(extra, str):
        try:
            parsed = json.loads(extra)
            if isinstance(parsed, list):
                for img in parsed:
                    if img and _is_valid_image_url(str(img)):
                        images.append(_make_absolute_url(str(img)))
        except json.JSONDecodeError:
            pass
    return images[:8]


async def enrich_vector_results(
    company_id: str,
    vec_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Enrich semantic/image vector search results with full product catalog details (comparePrice, quantityOffers, variants)."""
    if not company_id or not vec_results:
        return vec_results
    try:
        sf = _db_mod.async_session
        async with sf() as sess:
            repo = ProductSearchRepository(sess)
            catalog_raw, variants_map = await repo.search_products_with_categories(
                company_id, "", limit=100
            )
        by_id: dict[str, dict[str, Any]] = {}
        by_name: dict[str, dict[str, Any]] = {}
        for p in catalog_raw:
            pid = p.get("id")
            if pid and pid in variants_map:
                p["productVariants"] = variants_map[pid]
            mapped = _map_product(p)
            if pid:
                by_id[str(pid)] = mapped
            pname = (p.get("name") or "").strip().lower()
            if pname:
                by_name[pname] = mapped

        enriched: list[dict[str, Any]] = []
        for vr in vec_results:
            vid = str(vr.get("id") or "")
            vname = (vr.get("name") or "").strip().lower()
            full = by_id.get(vid) or by_name.get(vname)
            if full:
                merged = dict(full)
                if "score" in vr:
                    merged["score"] = vr["score"]
                if "rerank" in vr:
                    merged["rerank"] = vr["rerank"]
                if vr.get("image_url") and not merged.get("image_url"):
                    merged["image_url"] = vr["image_url"]
                enriched.append(merged)
            else:
                enriched.append(vr)
        return enriched
    except Exception as exc:
        logger.warning("enrich_vector_results_failed", error=str(exc))
        return vec_results


async def search_products(
    company_id: str,
    query: str,
    limit: int = 5,
    use_vector: bool = True,
    product_size: str | None = None,
    product_color: str | None = None,
    conversation_id: str | None = None,
    references_previous_product: bool | None = None,
) -> dict[str, Any]:
    """Search active catalog products by name or SKU. Empty query returns all products."""
    if not company_id:
        return {"found": False, "code": "MISSING_COMPANY", "query": query, "products": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        products_raw, variants_map = await repo.search_products_with_categories(
            company_id, query or "", limit
        )

    # Attach variants to products
    for p in products_raw:
        pid = p.get("id")
        if pid and pid in variants_map:
            p["productVariants"] = variants_map[pid]

    mapped = [_map_product(p) for p in products_raw]
    return {"found": True, "count": len(mapped), "query": query, "products": mapped}


async def low_stock_products(
    company_id: str, threshold: int = 5, limit: int = 10
) -> dict[str, Any]:
    """List low-stock or out-of-stock active products."""
    if not company_id:
        return {"count": 0, "products": [], "code": "MISSING_COMPANY"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        data = await repo.get_low_stock_products(company_id, threshold, limit)

    if not data:
        return {"count": 0, "products": [], "code": "NO_LOW_STOCK_PRODUCTS"}

    mapped = []
    for p in data:
        stock = p.get("stock", 0)
        low_vars = p.get("low_variants")
        if isinstance(low_vars, str):
            import json
            try:
                low_vars = json.loads(low_vars)
            except Exception:
                low_vars = []
        elif not isinstance(low_vars, list):
            low_vars = []

        min_v = p.get("min_variant_stock")
        effective_stock = min_v if (min_v is not None and min_v < stock) else stock
        status = "OUT_OF_STOCK" if effective_stock <= 0 else "LOW_STOCK"
        item = {
            "id": p.get("id"),
            "name": p.get("name"),
            "sku": p.get("sku"),
            "stockRemaining": effective_stock,
            "totalStock": stock,
            "price": str(p.get("price", 0)),
            "status": status,
        }
        if low_vars:
            item["lowStockVariants"] = [
                {"name": v.get("name"), "stock": v.get("stock"), "sku": v.get("sku")}
                for v in low_vars
            ]
        mapped.append(item)

    return {"count": len(mapped), "products": mapped}


async def top_selling_products(
    company_id: str, period: str = "month", limit: int = 5
) -> dict[str, Any]:
    """List top-selling products for a time period."""
    if not company_id:
        return {"count": 0, "products": [], "code": "MISSING_COMPANY", "period": period}

    start_date = period_start_date(period)

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        data = await repo.get_top_selling_products(company_id, start_date, limit)

    if not data:
        return {"count": 0, "products": [], "code": "NO_SALES_DATA", "period": period}

    result = []
    for i, p in enumerate(data):
        result.append({
            "rank": i + 1,
            "productName": p.get("productName", ""),
            "quantitySold": p.get("quantitySold", 0),
            "revenue": str(p.get("revenue", 0)),
        })

    return {"count": len(result), "products": result, "period": period}


async def list_categories(
    company_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    """List all available product categories by scanning the catalog."""
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        categories_raw = await repo.get_categories(company_id, limit)

    result = []
    for cat in categories_raw:
        result.append({
            "category": cat.get("name", ""),
            "productCount": cat.get("product_count", 0),
        })

    return {
        "found": len(result) > 0,
        "count": len(result),
        "categories": result,
    }
