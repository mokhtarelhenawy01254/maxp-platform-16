from __future__ import annotations

import asyncio
import base64
import ipaddress
import logging
import socket
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse

import httpx
from agent_framework import FunctionTool
from pydantic import BaseModel, Field
from src.tools import product_tools
from src.tools.definitions._helpers import _executed_result, _write_result, period_start_date as _period_start_date
from src.tools.vector_product_search import vector_product_search


def _is_public_image_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return False
    hostname = parsed.hostname.strip().lower()
    if hostname in {"localhost", "localhost.localdomain"}:
        return False
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        return True
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


async def _host_resolves_to_public_ips(hostname: str) -> bool:
    try:
        infos = await asyncio.to_thread(
            socket.getaddrinfo,
            hostname,
            None,
            type=socket.SOCK_STREAM,
        )
    except OSError:
        return False

    addresses = {info[4][0] for info in infos}
    if not addresses:
        return False
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


async def _download_image_url(url: str, max_bytes: int = 5 * 1024 * 1024) -> tuple[bytes, str] | None:
    if not _is_public_image_url(url):
        return None

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=False, trust_env=False) as client:
            current_url = url
            for _ in range(3):
                parsed = urlparse(current_url)
                if not parsed.hostname or not await _host_resolves_to_public_ips(parsed.hostname):
                    return None
                async with client.stream("GET", current_url, headers={"Accept": "image/*"}) as response:
                    if 300 <= response.status_code < 400:
                        redirect_url = response.headers.get("location")
                        if not redirect_url:
                            return None
                        current_url = str(httpx.URL(current_url).join(redirect_url))
                        if not _is_public_image_url(current_url):
                            return None
                        continue
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
                    if not content_type.startswith("image/"):
                        return None
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > max_bytes:
                            return None
                    return bytes(body), content_type
    except httpx.HTTPError:
        return None
    return None


class ProductSearchInput(BaseModel):
    query: str = Field(default="", description="Product name, SKU, or keyword to search for. Leave empty or set list_all=true to browse the full catalog.")
    list_all: bool = Field(default=False, description="Set to true to return ALL available products without filtering. Use when the customer asks to see all products or the full catalog.")
    limit: int = Field(default=5, description="Maximum number of results. Default 5. Use 20+ when list_all is true.")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    use_vector: bool = Field(default=True, description="Enable semantic/vector search fallback when text search returns no results")
    image_bytes: str | None = Field(default=None, description="Optional base64-encoded product image for visual product matching.")
    image_url: str | None = Field(default=None, description="Optional public product image URL for visual product matching.")
    mime_type: str | None = Field(default=None, description="MIME type for image_bytes, e.g. image/jpeg or image/png.")
    product_size: str | None = Field(default=None, description="Optional requested size to filter by.")
    product_color: str | None = Field(default=None, description="Optional requested color to filter by.")
    conversation_id: str | None = Field(default=None, description="Optional conversation ID for memory context.")
    references_previous_product: bool | None = Field(default=None, description="True only when the model-classified turn refers to the previous shown product.")


class ProductVariantInput(BaseModel):
    name: str = Field(description="Variant name e.g. 'أبيض / 38' or 'Black / XL'")
    type: str = Field(default="combined", description="Variant dimension type (color, size, combined)")
    sku: str | None = Field(default=None, description="Optional unique SKU for this specific variant")
    price: float | None = Field(default=None, description="Variant price if different from base product price")
    compare_price: float | None = Field(default=None, description="Variant compare-at price")
    cost: float | None = Field(default=None, description="Cost price")
    stock: int = Field(default=0, description="Stock for this specific variant")
    images: list[str] | None = Field(default=None, description="Image URLs for this variant")


class ProductCreateInput(BaseModel):
    name: str = Field(description="Product name")
    price: float = Field(description="Product price")
    compare_price: float | None = Field(default=None, description="Compare at price before discount")
    cost: float | None = Field(default=None, description="Cost price")
    sku: str | None = Field(default=None, description="Optional SKU")
    stock: int = Field(default=0, description="Initial stock quantity (or 0 if variants specify individual stocks)")
    description: str | None = Field(default=None, description="Product description")
    category_id: str | None = Field(default=None, description="Optional category ID")
    category_name: str | None = Field(default=None, description="Optional category name to match")
    images: list[str] | None = Field(default=None, description="List of product image URLs")
    tags: list[str] | None = Field(default=None, description="List of search/filter tags")
    variants: list[ProductVariantInput] | None = Field(default=None, description="Optional list of variants (sizes, colors, stocks)")
    is_active: bool = Field(default=True, description="Whether the product is active/published in store")
    status: str = Field(default="PUBLISHED", description="Workflow status: 'PUBLISHED' or 'DRAFT'")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")



class ProductLowStockInput(BaseModel):
    threshold: int = Field(default=5, description="Stock threshold for low-stock alert")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductTopSellingInput(BaseModel):
    limit: int = Field(default=10, description="Number of top-selling products")
    period: str = Field(default="month", description="Period: today, week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductUpdatePriceInput(BaseModel):
    product_id: str = Field(description="Product CUID (e.g. cmu5iix000...). MUST be a valid CUID obtained from product_search, NOT the product name.")
    new_price: float = Field(description="New price")
    reason: str | None = Field(default=None, description="Reason for price change")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductPerformanceInput(BaseModel):
    product_id: str = Field(description="Product ID to get performance for")
    period: str = Field(default="month", description="Period: week, month")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CategoryListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    limit: int = Field(default=50, description="Maximum products to scan for category discovery")


async def product_search(input_data: ProductSearchInput) -> dict[str, Any]:
    query = "" if input_data.list_all else (input_data.query or "")
    limit = max(input_data.limit, 50) if input_data.list_all else min(input_data.limit, 20)
    decoded_image: bytes | None = None
    image_mime_type = input_data.mime_type
    logging.warning("[PS_DEBUG] company_id=%s query=%s list_all=%s limit=%s", input_data.company_id, query, input_data.list_all, limit)
    if input_data.use_vector and not input_data.list_all:
        if input_data.image_bytes:
            try:
                decoded_image = base64.b64decode(input_data.image_bytes, validate=True)
            except (ValueError, TypeError):
                decoded_image = None
        if not decoded_image and input_data.image_url:
            downloaded = await _download_image_url(input_data.image_url)
            if downloaded:
                decoded_image, downloaded_mime_type = downloaded
                image_mime_type = image_mime_type or downloaded_mime_type
        if decoded_image:
            vec_results = await vector_product_search(
                company_id=input_data.company_id or "",
                query=query,
                limit=limit,
                image_bytes=decoded_image,
                mime_type=image_mime_type,
            )
            vec_results = await product_tools.enrich_vector_results(
                input_data.company_id or "", vec_results
            )
            return {"results": vec_results, "count": len(vec_results), "listAll": False, "searchType": "image_semantic"}

    result = await product_tools.search_products(
        input_data.company_id or "",
        query,
        limit=limit or 20,
        use_vector=input_data.use_vector,
        product_size=input_data.product_size,
        product_color=input_data.product_color,
        conversation_id=input_data.conversation_id,
        references_previous_product=input_data.references_previous_product,
    )
    products = result.get("products", [])
    logging.warning("[PS_DEBUG] search_products returned %d products, result keys=%s", len(products), list(result.keys()))

    # Only return full catalog if explicitly requested via list_all or if query was empty
    if not products and (input_data.list_all or not query.strip()):
        catalog = await product_tools.search_products(
            input_data.company_id or "", "", limit=50, use_vector=False,
        )
        cat_products = catalog.get("products", [])
        if cat_products:
            return {"results": cat_products, "count": catalog.get("count", len(cat_products)), "listAll": True, "searchType": "catalog"}

    return {"results": products, "count": result.get("count", 0), "listAll": input_data.list_all, "searchType": "text"}


async def product_create(input_data: ProductCreateInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    payload = {
        "name": input_data.name,
        "price": input_data.price,
        "compare_price": input_data.compare_price,
        "cost": input_data.cost,
        "sku": input_data.sku,
        "stock": input_data.stock,
        "description": input_data.description,
        "category_id": input_data.category_id,
        "category_name": input_data.category_name,
        "images": input_data.images,
        "tags": input_data.tags,
        "variants": [v.model_dump() for v in input_data.variants] if input_data.variants else [],
        "is_active": False if (input_data.status or "").upper() == "DRAFT" else input_data.is_active,
        "status": (input_data.status or "PUBLISHED").upper(),
    }

    from src.tools.repositories.product_repository import ProductRepository
    import src.db.session as _db_mod

    if _db_mod.async_session is None:
        await _db_mod.init_db()

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductRepository(sess)
        result = await repo.create_product_with_variants(company_id, payload)

    return _executed_result("PRODUCT_CREATED", result)




async def product_low_stock(input_data: ProductLowStockInput) -> dict[str, Any]:
    result = await product_tools.low_stock_products(
        input_data.company_id or "", threshold=input_data.threshold
    )
    return {"products": result.get("products", [])}


async def product_top_selling(input_data: ProductTopSellingInput) -> dict[str, Any]:
    return await product_tools.top_selling_products(
        input_data.company_id or "", period=input_data.period, limit=input_data.limit
    )


async def _resolve_product_cuid(company_id: str, identifier: str) -> str | None:
    if not identifier or not company_id:
        return None
    clean = str(identifier).strip()
    import re
    if re.match(r"^c[a-z0-9]{20,}$", clean):
        return clean
    try:
        from src.tools.repositories.product_search_repository import ProductSearchRepository
        import src.db.session as _db_mod
        async with _db_mod.async_session() as sess:
            repo = ProductSearchRepository(sess)
            matches = await repo.search_products(company_id=company_id, query=clean, limit=1)
            if matches and matches[0].get("id"):
                return str(matches[0]["id"])
    except Exception as e:
        logging.warning("resolve_product_cuid_failed: %s", str(e))
    return None


async def product_update_price(input_data: ProductUpdatePriceInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    product_id = input_data.product_id
    if not company_id or not product_id:
        return {"success": False, "error": "Missing company_id or product_id"}

    resolved_id = await _resolve_product_cuid(company_id, product_id)
    if resolved_id:
        product_id = resolved_id

    from src.tools.repositories.product_repository import ProductRepository
    import src.db.session as _db_mod
    async with _db_mod.async_session() as sess:
        repo = ProductRepository(sess)
        return await repo.update_product_price(product_id, company_id, input_data.new_price)


async def product_performance(input_data: ProductPerformanceInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    product_id = input_data.product_id
    period = input_data.period or "month"
    start_date = _period_start_date(period)
    end_date = datetime.utcnow()

    if not company_id or not product_id:
        return {"found": False, "error": "Missing company_id or product_id"}

    from src.tools.repositories.product_repository import ProductRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductRepository(sess)
        product_info = await repo.get_product(product_id, company_id)

        if not product_info:
            return {"found": False, "error": "Product not found"}

        views = await repo.count_visits(product_id, company_id, start_date, end_date)
        add_to_carts = await repo.count_conversion_events(product_id, company_id, "add_to_cart", start_date, end_date)
        purchases = await repo.count_conversion_events(product_id, company_id, "purchase", start_date, end_date)
        sales = await repo.get_sales_aggregate(product_id, company_id, start_date, end_date)

    view_to_cart = round(add_to_carts / views * 100, 2) if views > 0 else 0.0
    cart_to_purchase = round(purchases / add_to_carts * 100, 2) if add_to_carts > 0 else 0.0
    overall_conversion = round(purchases / views * 100, 2) if views > 0 else 0.0

    return {
        "productId": product_info["id"],
        "productName": product_info["name"],
        "price": str(product_info.get("price", 0)),
        "period": period,
        "views": views,
        "addToCarts": add_to_carts,
        "purchases": purchases,
        "conversionRates": {
            "viewToCart": view_to_cart,
            "cartToPurchase": cart_to_purchase,
            "overall": overall_conversion,
        },
        "salesMetrics": {
            "quantitySold": sales["qty_sold"],
            "revenue": str(sales["revenue"]),
        },
    }


async def category_list(input_data: CategoryListInput) -> dict[str, Any]:
    if not input_data.company_id:
        return {"found": False, "count": 0, "categories": [], "error": "Missing company_id"}
    return await product_tools.list_categories(
        company_id=input_data.company_id,
        limit=input_data.limit,
    )


def _format_product_search(result: dict) -> str:
    products = result.get("results") or result.get("products") or result.get("items") or []
    if not isinstance(products, list) or not products:
        if not result.get("found", True):
            return "لم أعثر على منتجات مطابقة."
        return ""
    names = []
    for p in products[:5]:
        name = p.get("productName") or p.get("name") or ""
        price = p.get("price")
        if isinstance(price, dict):
            price = price.get("amount", "")
        compare_price = p.get("comparePrice")
        offers_summary = p.get("offersSummary")
        price_part = f"{price} بدل {compare_price}" if (price and compare_price and compare_price != price) else f"{price}"
        entry = f"{name}{f' ({price_part})' if price_part else ''}"
        if offers_summary:
            entry += f" [{offers_summary}]"
        names.append(entry)
    result_str = ", ".join(filter(None, names))
    if len(products) > 5:
        result_str += "..."
    return result_str


product_search_tool = FunctionTool(
    name="product_search",
    description="Search for products by name, SKU, or keyword. Use this FIRST when customer asks about products, wants to see what's available, or asks for recommendations — never guess or invent products from memory. Set list_all=true to browse the full catalog. Returns products with prices, comparePrice (original price before discount), discountSummary, quantityOffers / offersSummary (2-piece and 3-piece bundle offers), stock, variants, available sizes, available colors, and category info. Use inventory.check for detailed per-variant availability.",
    func=product_search,
    input_model=ProductSearchInput,
    format_result=_format_product_search,
)

def _format_product_create(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("success"):
        return f"تعذر إنشاء المنتج: {res.get('error', 'خطأ غير معروف')}"
    var_count = res.get("variantsCount", 0)
    msg = f"تم إنشاء المنتج '{res.get('name')}' بنجاح (السعر: {res.get('price')} ج.م، كود الصنف: {res.get('sku')}، إجمالي المخزون: {res.get('stock')})."
    if var_count > 0:
        msg += f" تم إضافة {var_count} متغير (مقاسات/ألوان) للمنتج."
    return msg


product_create_tool = FunctionTool(
    name="product_create",
    description="Create a new product in the catalog with optional variants (colors, sizes, stocks).",
    func=product_create,
    input_model=ProductCreateInput,
    format_result=_format_product_create,
)

product_low_stock_tool = FunctionTool(
    name="product_low_stock",
    description="Find products with low stock levels below a threshold.",
    func=product_low_stock,
    input_model=ProductLowStockInput,
)

product_top_selling_tool = FunctionTool(
    name="product_top_selling",
    description="Find top-selling products for a given period.",
    func=product_top_selling,
    input_model=ProductTopSellingInput,
)

product_update_price_tool = FunctionTool(
    name="product_update_price",
    description="Update the price of a product. REQUIRES MERCHANT APPROVAL.",
    func=product_update_price,
    input_model=ProductUpdatePriceInput,
)

product_performance_tool = FunctionTool(
    name="product_performance",
    description="Get sales performance metrics for a specific product.",
    func=product_performance,
    input_model=ProductPerformanceInput,
)

category_list_tool = FunctionTool(
    name="category_list",
    description="List all available product categories with their product counts and sample products.",
    func=category_list,
    input_model=CategoryListInput,
)


class ProductReadConversionInput(BaseModel):
    product_id: str = Field(
        description="Product CUID, SKU, or exact/partial product name to inspect its per-product conversion settings (Advanced tab & Quantity Offers tab)."
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ProductQuantityTierInput(BaseModel):
    quantity: int = Field(description="Minimum quantity for this tier (e.g. 2 or 3)")
    discount_percent: float | None = Field(
        default=None,
        description="Discount percentage for this quantity tier (e.g. 10 for 10%, 15 for 15%)",
    )
    unit_price: float | None = Field(
        default=None,
        description="Optional explicit unit price per item in this tier if discount_percent is not used",
    )
    label: str | None = Field(default=None, description="Optional Arabic display label for the tier")


class ProductConfigureConversionInput(BaseModel):
    product_id: str = Field(
        description="Target product CUID, SKU, or product name to configure conversion/advanced settings for. Pass 'all' or 'الكل' when clearing quantity offers across all products in the store."
    )
    cross_sell_products: list[str] | None = Field(
        default=None,
        description="Optional list of complementary product IDs, SKUs, or names to link as Cross-Sell / Bought Together (منتجات مكملة / يُشترى معًا) in the product's Advanced tab.",
    )
    upsell_products: list[str] | None = Field(
        default=None,
        description="Optional list of higher-tier product IDs, SKUs, or names to link as Upsell (منتجات الترقية) in the product's Advanced tab.",
    )
    related_products: list[str] | None = Field(
        default=None,
        description="Optional list of similar product IDs, SKUs, or names to link as Related Products (المنتجات المشابهة) in the product's Advanced tab.",
    )
    quantity_tiers: list[ProductQuantityTierInput] | None = Field(
        default=None,
        description="Optional list of per-product quantity discount tiers (شرائح عروض الكمية في تبويب عروض الكميات), e.g. [{'quantity': 2, 'discount_percent': 10}, {'quantity': 3, 'discount_percent': 15}]. Pass [] or set clear_quantity_offers=True to remove all quantity offers.",
    )
    clear_quantity_offers: bool | None = Field(
        default=None,
        description="Set to True to completely clear/remove/delete all quantity discount tiers and bundle offers from this product (or from all products if product_id='all').",
    )
    clear_compare_prices: bool | None = Field(
        default=None,
        description="Set to True to completely clear/remove/reset compare-at strikethrough discount prices (سعر الشطب قبل الخصم وشارات الخصم المئوية) from this product (or across all products in the store if product_id='all').",
    )
    show_fake_stock: bool | None = Field(
        default=None,
        description="Optional toggle for the per-product urgency fake stock counter (عداد وهمي) in the Advanced tab.",
    )
    exclude_from_free_shipping: bool | None = Field(
        default=None,
        description="Optional toggle to exclude this specific product from free shipping in the Advanced tab.",
    )
    enable_checkout_form: bool | None = Field(
        default=None,
        description="Optional toggle to enable direct checkout form on this specific product page in the Advanced tab.",
    )
    compare_price: float | None = Field(
        default=None,
        description="Optional compare-at strike price (سعر الشطب قبل الخصم) for this product.",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def product_read_conversion(input_data: ProductReadConversionInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id or not input_data.product_id:
        return {"found": False, "error": "معرف المتجر أو المنتج مفقود"}

    from src.tools.repositories.product_repository import ProductRepository
    import src.db.session as _db_mod

    if _db_mod.async_session is None:
        await _db_mod.init_db()

    async with _db_mod.async_session() as sess:
        repo = ProductRepository(sess)
        return await repo.get_product_conversion_settings(input_data.product_id, company_id)


async def product_configure_conversion(input_data: ProductConfigureConversionInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id or not input_data.product_id:
        return {"success": False, "error": "معرف المتجر أو المنتج مفقود"}

    updates: dict[str, Any] = {}
    if input_data.cross_sell_products is not None:
        updates["cross_sell_products"] = input_data.cross_sell_products
    if input_data.upsell_products is not None:
        updates["upsell_products"] = input_data.upsell_products
    if input_data.related_products is not None:
        updates["related_products"] = input_data.related_products
    if input_data.quantity_tiers is not None:
        updates["quantity_tiers"] = [t.model_dump() for t in input_data.quantity_tiers]
    if input_data.clear_quantity_offers is not None:
        updates["clear_quantity_offers"] = input_data.clear_quantity_offers
    if input_data.clear_compare_prices is not None:
        updates["clear_compare_prices"] = input_data.clear_compare_prices
    if input_data.show_fake_stock is not None:
        updates["show_fake_stock"] = input_data.show_fake_stock
    if input_data.exclude_from_free_shipping is not None:
        updates["exclude_from_free_shipping"] = input_data.exclude_from_free_shipping
    if input_data.enable_checkout_form is not None:
        updates["enable_checkout_form"] = input_data.enable_checkout_form
    if input_data.compare_price is not None:
        updates["compare_price"] = input_data.compare_price


    from src.tools.repositories.product_repository import ProductRepository
    import src.db.session as _db_mod

    if _db_mod.async_session is None:
        await _db_mod.init_db()

    async with _db_mod.async_session() as sess:
        repo = ProductRepository(sess)
        return await repo.update_product_conversion_settings(input_data.product_id, company_id, updates)


def _format_product_read_conversion(result: dict[str, Any]) -> str:
    if not result.get("found"):
        return f"تعذر قراءة إعدادات المنتج: {result.get('error', 'المنتج غير موجود')}"
    adv = result.get("advancedTabSettings") or {}
    qty_tab = result.get("quantityOffersTabSettings") or {}
    cross = ", ".join(f"{p['name']} ({p['price']} ج.م)" for p in (adv.get("crossSellProducts") or [])) or "غير محدد"
    upsell = ", ".join(f"{p['name']} ({p['price']} ج.م)" for p in (adv.get("upsellProducts") or [])) or "غير محدد"
    related = ", ".join(f"{p['name']} ({p['price']} ج.م)" for p in (adv.get("relatedProducts") or [])) or "غير محدد"
    offers = qty_tab.get("quantityOffers") or []
    offers_str = (
        " · ".join(f"{o.get('quantity')} قطع بسعر قطعة {o.get('unitPrice')} ج.م" for o in offers)
        if offers
        else "لا توجد شرائح مخصصة"
    )
    return (
        f"إعدادات المنتج «{result.get('name')}» (SKU: {result.get('sku')} — السعر: {result.get('price')} ج.م):\n"
        f"- تبويب «متقدم» (/products/{result.get('productId')}/edit):\n"
        f"  • منتجات مكملة / يُشترى معًا (Cross-Sell): {cross}\n"
        f"  • منتجات الترقية (Upsell): {upsell}\n"
        f"  • المنتجات المشابهة (Related): {related}\n"
        f"  • عداد وهمي: {'مفعّل' if adv.get('showFakeStock') else 'متوقف'}\n"
        f"  • فورم الشيك أوت المباشر: {'مفعّل' if adv.get('enableCheckoutForm') else 'متوقف'}\n"
        f"- تبويب «عروض الكميات»:\n"
        f"  • الشرائح: {offers_str}"
    )


def _format_product_configure_conversion(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر تحديث إعدادات التحويل للمنتج: {result.get('error', 'خطأ غير معروف')}"
    return result.get("message", "تم تحديث إعدادات التحويل للمنتج بنجاح.")


product_read_conversion_tool = FunctionTool(
    name="product_read_conversion",
    description=(
        "Read a single product's conversion & advanced settings from its 'متقدم' (Advanced) tab and 'عروض الكميات' (Quantity Offers) tab: "
        "linked Cross-Sell / Bought Together products, Upsell products, Related products, quantity discount tiers, fake stock counter, "
        "direct checkout form toggle, and free-shipping exclusion. Use whenever the merchant asks about conversion/upsell/cross-sell/bundle settings for a specific product."
    ),
    func=product_read_conversion,
    input_model=ProductReadConversionInput,
    format_result=_format_product_read_conversion,
)

product_configure_conversion_tool = FunctionTool(
    name="product_configure_conversion",
    description=(
        "Configure or clear per-product conversion, bundle, cross-sell, upsell, related products, quantity discount tiers (شرائح عروض الكميات), "
        "compare-at strikethrough discount prices (سعر الشطب وشارة الخصم), fake stock urgency counter, or checkout settings for a single specific product "
        "(or pass product_id='all' with clear_quantity_offers=True and/or clear_compare_prices=True to clear offers and discount badges across all products in the store). "
        "Use clear_quantity_offers=True and/or clear_compare_prices=True whenever the merchant asks to remove/delete/cancel offers or discounts on a product or all products ('عايز اشيل عروض', 'احذف العروض', 'شيل سعر الشطب'). "
        "Requires merchant approval."
    ),
    func=product_configure_conversion,
    input_model=ProductConfigureConversionInput,
    format_result=_format_product_configure_conversion,
)


__all_tools__ = [
    product_search_tool,
    product_create_tool,
    product_low_stock_tool,
    product_top_selling_tool,
    product_update_price_tool,
    product_performance_tool,
    category_list_tool,
    product_read_conversion_tool,
    product_configure_conversion_tool,
]
