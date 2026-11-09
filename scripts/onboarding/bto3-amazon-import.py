#!/usr/bin/env python3
"""
Bto3 e3lanat — Amazon.eg seller onboarding importer.

Reads a JSON file with {"asins": [...]} and imports each product into MaxP with:
  - price = Amazon price * 1.5 (wholesale -> retail)
  - comparePrice = Amazon "Was" price * 1.5 (only when Amazon exposes one)
  - stock = --stock (default 10)
  - images, bullets, specs, weight, ASIN metadata
  - auto-created top-level category mapped from the Amazon breadcrumb

Usage:
  python bto3-amazon-import.py --asins bto3_asins.json --dry-run --limit 2
  python bto3-amazon-import.py --asins bto3_asins.json --limit 20
  python bto3-amazon-import.py --asins bto3_asins.json            # all, resumable
"""

import argparse
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

API_BASE = os.environ.get("MAXP_API_BASE", "https://maxp.online/api/v1")
PUBLIC_BASE = os.environ.get("MAXP_PUBLIC_BASE", "https://maxp.online")
EMAIL = os.environ.get("MAXP_EMAIL", "hermes.agent@maxp.online")
PASSWORD = os.environ.get("MAXP_PASSWORD", "")
MARKUP = 1.5
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

CATEGORY_MAP = {
    "beauty & personal care": "العناية الشخصية",
    "beauty": "العناية الشخصية",
    "الجمال والعناية الشخصية": "العناية الشخصية",
    "العناية الشخصية": "العناية الشخصية",
    "health & household": "الصحة والمنزل",
    "الصحة والمنزل": "الصحة والمنزل",
    "home & kitchen": "المنزل والمطبخ",
    "المنزل والمطبخ": "المنزل والمطبخ",
    "المنزل": "المنزل والمطبخ",
    "kitchen & dining": "المطبخ والسفرة",
    "المطبخ والسفرة": "المطبخ والسفرة",
    "appliances": "أجهزة منزلية",
    "أجهزة منزلية": "أجهزة منزلية",
    "electronics": "إلكترونيات",
    "الإلكترونيات": "إلكترونيات",
    "computers": "كمبيوترات",
    "الكمبيوتر": "كمبيوترات",
    "cell phones & accessories": "موبايلات وإكسسوارات",
    "الموبايلات والإكسسوارات": "موبايلات وإكسسوارات",
    "fashion": "أزياء",
    "الأزياء": "أزياء",
    "sports & outdoors": "رياضة وخارج المنزل",
    "الرياضة والهواء الطلق": "رياضة وخارج المنزل",
    "toys & games": "ألعاب",
    "الألعاب": "ألعاب",
    "tools & home improvement": "أدوات وتحسين المنزل",
    "أدوات وتحسين المنزل": "أدوات وتحسين المنزل",
    "furniture": "أثاث",
    "الأثاث": "أثاث",
    "baby": "مستلزمات أطفال",
    "الرضع": "مستلزمات أطفال",
    "pet supplies": "مستلزمات حيوانات",
    "مستلزمات الحيوانات الأليفة": "مستلزمات حيوانات",
    "office products": "مستلزمات مكتبية",
    "مستلزمات المكتب": "مستلزمات مكتبية",
    "automotive": "سيارات",
    "السيارات": "سيارات",
    "industrial & scientific": "صناعي وعلمي",
    "الصناعة والعلوم": "صناعي وعلمي",
    "musical instruments": "آلات موسيقية",
    "الآلات الموسيقية": "آلات موسيقية",
    "grocery": "بقالة",
    "البقالة": "بقالة",
}


COLOR_WORDS = [
    ("أسود", "black"),
    ("أبيض", "white"),
    ("أخضر", "green"),
    ("فضي", "silver"),
    ("رمادي", "gray"),
    ("رمادي", "grey"),
    ("بني", "brown"),
    ("أزرق", "blue"),
    ("أحمر", "red"),
    ("بيج", "beige"),
    ("ذهبي", "gold"),
    ("وردي", "pink"),
    ("أرجواني", "purple"),
    ("برتقالي", "orange"),
    ("شفاف", "clear"),
]

COLOR_TO_AR = {en: ar for ar, en in COLOR_WORDS}


def find_color(text):
    for ar, en in COLOR_WORDS:
        if ar in text:
            return ar
    for ar, en in COLOR_WORDS:
        if re.search(rf"\b{re.escape(en)}\b", text, re.I):
            return ar
    return None


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def http_json(path, method="GET", token=None, body=None, timeout=90, retries=3):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    last_error = None
    for attempt in range(retries):
        req = urllib.request.Request(API_BASE + path, data=data, method=method)
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", UA)
        if data is not None:
            req.add_header("Content-Type", "application/json; charset=utf-8")
        if token:
            req.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(4 * (attempt + 1))
                continue
            try:
                return exc.code, json.loads(raw)
            except Exception:
                return exc.code, {"raw": raw[:500]}
        except Exception as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(4 * (attempt + 1))
                continue
            raise last_error
    raise last_error


def amazon_fetch(asin, attempt=1):
    url = f"https://www.amazon.eg/dp/{asin}?th=1&psc=1"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ar,en;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            return resp.read().decode("utf-8", "replace")
    except Exception as exc:
        if attempt >= 3:
            raise
        time.sleep(4 * attempt)
        return amazon_fetch(asin, attempt + 1)


def parse_price(html):
    patterns = [
        r'id="corePriceDisplay[^"]*"[\s\S]{0,2500}?<span class="a-offscreen">([^<]+)</span>',
        r'id="corePrice_feature_div"[\s\S]{0,2000}?<span class="a-offscreen">([^<]+)</span>',
        r'"priceAmount":\s*([0-9.]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            raw = re.sub(r"[^\d.]", "", match.group(1))
            try:
                return float(raw)
            except ValueError:
                pass
    return None


def parse_list_price(html):
    patterns = [
        r'basisPrice[\s\S]{0,800}?<span class="a-offscreen">([^<]+)</span>',
        r'Was:\s*(?:EGP|E£|ج\.م)\s*([\d,.]+)',
        r'كان:\s*(?:EGP|E£|ج\.م)\s*([\d,.]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            raw = re.sub(r"[^\d.]", "", match.group(1))
            try:
                return float(raw)
            except ValueError:
                pass
    return None


def parse_bullets(html):
    match = re.search(r'id="feature-bullets"([\s\S]*?)</div>\s*</div>', html)
    if not match:
        return []
    items = [clean(x) for x in re.findall(r'<span class="a-list-item">([\s\S]*?)</span>', match.group(1))]
    return [x for x in items if x and "See more" not in x]


def is_product_image(url):
    low = (url or "").lower()
    if any(bad in low for bad in (".css", ".js", "_rc", "auiclients", "sprite", "/g/", "logo", "nav-")):
        return False
    if re.search(r"\.(jpg|jpeg|png|webp)(\?|$)", low):
        return True
    if "m.media-amazon.com/images/i/" in low and re.search(r"_(ac|sl|sx|ss|ql|ul|sr|fmwebp)_", low):
        return True
    return False


def parse_images(html):
    images = []

    # 1) colorImages JSON block (brace matching instead of a fragile regex)
    marker = html.find('"colorImages"')
    if marker != -1:
        start = html.find("{", marker)
        if start != -1:
            depth = 0
            for index in range(start, min(len(html), start + 300000)):
                char = html[index]
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            data = json.loads(html[start : index + 1])
                            for group in data.values():
                                if not isinstance(group, list):
                                    continue
                                for item in group:
                                    hi = item.get("hiRes") or item.get("large")
                                    if hi and is_product_image(hi) and hi not in images:
                                        images.append(hi)
                        except Exception:
                            pass
                        break

    # 2) landing image / dynamic image data
    if not images:
        for pattern in (
            r'id="landingImage"[^>]*src="([^"]+)"',
            r'data-old-hires="([^"]+)"',
            r'id="landingImage"[^>]*data-src="([^"]+)"',
        ):
            match = re.search(pattern, html, re.S)
            if match and is_product_image(match.group(1)) and match.group(1) not in images:
                images.append(match.group(1))

    if not images:
        match = re.search(r'data-a-dynamic-image="([^"]+)"', html, re.S)
        if match:
            import html as html_lib
            payload = html_lib.unescape(match.group(1))
            for url in re.findall(r'https://[^"\\]+', payload):
                if is_product_image(url) and url not in images:
                    images.append(url)

    # 3) last resort: any valid product image URL in the page
    if not images:
        candidates = re.findall(r'https://m\.media-amazon\.com/images/I/[^"\'\\\s]+', html)
        for url in candidates:
            if is_product_image(url) and url not in images:
                images.append(url)

    return images[:8]


def parse_brand(html):
    match = re.search(r'id="bylineInfo"[^>]*>(.*?)</a>', html, re.S)
    if not match:
        return None
    brand = clean(match.group(1))
    brand = re.sub(r"^(العلامة التجارية|Brand|Visit the|زيارة متجر)\s*:?\s*", "", brand, flags=re.I)
    return brand.strip() or None


def parse_text(html):
    return clean(html)


def parse_specs(html):
    text = parse_text(html)
    specs = {}

    model = re.search(
        r"(?:رقم الموديل|Item model number|Model number)\s*[:\s]\s*([A-Za-z0-9][A-Za-z0-9._/-]{1,30})",
        text,
        re.I,
    )
    if model:
        specs["model"] = model.group(1)

    color = re.search(
        r"(?:اللون|Color|Colour)\s*[:\s]\s*(أخضر|أسود|أبيض|فضي|رمادي|بني|أزرق|أحمر|بيج|ذهبي|وردي|أرجواني|برتقالي|شفاف|"
        r"Green|Black|White|Silver|Grey|Gray|Brown|Blue|Red|Beige|Gold|Pink|Purple|Orange|Clear)",
        text,
        re.I,
    )
    if color:
        specs["color"] = color.group(1)

    material = re.search(
        r"(?:مادة الشفرة|Material|Blade Material)\s*[:\s]\s*(ستانلس ستيل|ستانليس ستيل|فولاذ|حديد|ألومنيوم|الومنيوم|بلاستيك|خشب|زجاج|قطن|جلد|"
        r"Stainless Steel|Steel|Iron|Aluminum|Aluminium|Plastic|Wood|Glass|Cotton|Leather)",
        text,
        re.I,
    )
    if material:
        specs["material"] = material.group(1)

    weight = re.search(
        r"(?:وزن السلعة|Item Weight)\s*[:\s]\s*([\d.,]+)\s*(جرام|جم|كجم|كيلو|غرام|Grams|Gram|g|kg)",
        text,
        re.I,
    )
    if weight:
        specs["weight"] = f"{weight.group(1)} {weight.group(2)}"

    country = re.search(
        r"(?:بلد الصنع|Country of origin)\s*[:\s]\s*(الصين|مصر|تركيا|الهند|فيتنام|تايلاند|اليابان|كوريا|ألمانيا|إيطاليا|أمريكا|"
        r"China|Egypt|Turkey|India|Vietnam|Thailand|Japan|Korea|Germany|Italy|USA)",
        text,
        re.I,
    )
    if country:
        specs["country"] = country.group(1)

    department = re.search(
        r"(?:القسم|Department)\s*[:\s]\s*(الرجال|النساء|أطفال|رجالي|حريمي|أطفال|"
        r"Men|Women|Kids|Unisex)",
        text,
        re.I,
    )
    if department:
        specs["department"] = department.group(1)

    power = re.search(r"(?:الطاقة|Power)\s*[:\s]\s*(\d+(?:\.\d+)?\s*(?:واط|W))", text, re.I)
    if power:
        specs["power"] = power.group(1)

    battery = re.search(
        r"(?:البطارية|Battery)\s*[:\s]\s*(\d+\s*(?:mAh|مللي أمبير(?:/الساعة)?))",
        text,
        re.I,
    )
    if battery:
        specs["battery"] = battery.group(1)

    return {k: v for k, v in specs.items() if v}


def parse_breadcrumb(html):
    match = re.search(r'id="wayfinding-breadcrumbs_feature_div"([\s\S]*?)</ul>', html)
    if not match:
        return []
    return [clean(x) for x in re.findall(r'<a[^>]*>([\s\S]*?)</a>', match.group(1)) if clean(x)]


def parse_rating(html):
    rating = None
    reviews = None
    match = re.search(r'id="acrPopover"[^>]*title="([^"]+)"', html)
    if match:
        rating = clean(match.group(1))
    match = re.search(r'id="acrCustomerReviewText"[^>]*>([^<]+)<', html)
    if match:
        reviews = clean(match.group(1))
    return rating, reviews


def build_description(product):
    bullets = product["bullets"]
    specs = product["specs"]
    rows = [
        f"<p>{product['title']}</p>",
        "<h3>المواصفات</h3>",
        "<ul>",
    ]
    if product.get("brand"):
        rows.append(f"<li>العلامة التجارية: {product['brand']}</li>")
    for label, value in specs.items():
        ar = {
            "model": "رقم الموديل",
            "color": "اللون",
            "material": "المادة",
            "weight": "الوزن",
            "country": "بلد الصنع",
            "department": "القسم",
            "power": "الطاقة",
            "battery": "البطارية",
        }.get(label, label)
        rows.append(f"<li>{ar}: {value}</li>")
    rows.append("</ul>")
    if bullets:
        rows.append("<h3>أبرز المميزات</h3><ul>")
        for bullet in bullets:
            rows.append(f"<li>{bullet}</li>")
        rows.append("</ul>")
    return "".join(rows)


def upload_category_image(token, category_id, image_url):
    if not category_id or not image_url:
        return False
    try:
        url = image_url if not image_url.startswith("/") else PUBLIC_BASE + image_url
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "image/jpeg")
        ext = "jpg"
        if "png" in content_type or image_url.lower().endswith(".png"):
            ext, content_type = "png", "image/png"
        elif "webp" in content_type or image_url.lower().endswith(".webp"):
            ext, content_type = "webp", "image/webp"
        elif "jpeg" in content_type or "jpg" in content_type or image_url.lower().endswith((".jpg", ".jpeg")):
            ext, content_type = "jpg", "image/jpeg"

        boundary = "----MaxP" + uuid.uuid4().hex
        parts = [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="image"; filename="category.{ext}"\r\n'.encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            data,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
        body = b"".join(parts)
        req = urllib.request.Request(
            f"{API_BASE}/categories/{category_id}",
            data=body,
            method="PUT",
        )
        req.add_header("Accept", "application/json")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req.add_header("Authorization", "Bearer " + token)
        req.add_header("User-Agent", UA)
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8", "replace"))
            return bool((payload.get("data") or {}).get("image"))
    except Exception as exc:
        print("CATEGORY_IMAGE_FAILED", category_id, str(exc)[:160])
        return False


def get_or_create_category(token, categories, name, parent_id=None, image_url=None):
    key = f"{name}|{parent_id or ''}"
    if key in categories:
        return categories[key]
    status, created = http_json("/categories", "POST", token, {
        "name": name,
        "parentId": parent_id,
        "isActive": True,
    })
    if status not in (200, 201):
        print("CATEGORY_FAILED", name, status, json.dumps(created, ensure_ascii=False)[:200])
        return parent_id if parent_id else None
    category_id = (created.get("data") or {}).get("id")
    if category_id:
        categories[key] = category_id
        if parent_id is None:
            categories[name] = category_id
        if image_url:
            upload_category_image(token, category_id, image_url)
    return category_id


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--asins", required=True)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--stock", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--progress", default="bto3-import-progress.json")
    parser.add_argument("--delay", type=float, default=1.5)
    args = parser.parse_args()

    with open(args.asins, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    asins = payload.get("asins") or []

    progress = {"done": {}, "failed": {}, "skipped": {}}
    if os.path.exists(args.progress):
        with open(args.progress, "r", encoding="utf-8") as fh:
            progress = json.load(fh)

    token = None
    categories = {}
    existing_asins = set()

    if not args.dry_run:
        status, login = http_json("/auth/login", "POST", body={"email": EMAIL, "password": PASSWORD})
        if status != 200 or not login.get("data", {}).get("token"):
            print("LOGIN_FAILED", status, login)
            sys.exit(1)
        token = login["data"]["token"]

        status, cats = http_json("/categories", token=token)
        for cat in cats.get("data") or []:
            categories[cat["name"]] = cat["id"]
            categories[f"{cat['name']}|{cat.get('parentId') or ''}"] = cat["id"]

        page = 1
        while True:
            status, products = http_json(f"/products?limit=100&page={page}", token=token)
            rows = products.get("data") or []
            if not rows:
                break
            for product in rows:
                if product.get("externalId"):
                    existing_asins.add(product["externalId"])
            if len(rows) < 100:
                break
            page += 1
        print(f"existing products with ASIN: {len(existing_asins)}")

    exported = 0
    attempted = 0
    for index, asin in enumerate(asins):
        if index < args.start:
            continue
        if args.limit and attempted >= args.limit:
            break
        if asin in progress["done"] or asin in existing_asins:
            progress["skipped"][asin] = "already imported"
            continue

        attempted += 1
        try:
            html = amazon_fetch(asin)
            title_match = re.search(r'id="productTitle"[^>]*>(.*?)</span>', html, re.S)
            title = clean(title_match.group(1)) if title_match else None
            price = parse_price(html)
            if not title or not price:
                progress["failed"][asin] = "missing title/price"
                print(f"SKIP {asin}: missing title/price")
                continue

            product = {
                "asin": asin,
                "title": title,
                "brand": parse_brand(html),
                "price": price,
                "listPrice": parse_list_price(html),
                "bullets": parse_bullets(html),
                "images": parse_images(html),
                "specs": parse_specs(html),
                "breadcrumb": parse_breadcrumb(html),
                "rating": parse_rating(html)[0],
                "reviews": parse_rating(html)[1],
            }
            product["retailPrice"] = round(price * MARKUP, 2)
            if product["specs"].get("color"):
                parsed_color = product["specs"]["color"].strip().lower()
                product["specs"]["color"] = COLOR_TO_AR.get(parsed_color, product["specs"]["color"])
            title_color = find_color(title)
            if title_color:
                product["specs"]["color"] = title_color
            if product["listPrice"] and product["listPrice"] > price:
                product["retailComparePrice"] = round(product["listPrice"] * MARKUP, 2)
            else:
                product["retailComparePrice"] = None

            if not product["images"]:
                progress["failed"][asin] = "no images"
                print(f"SKIP {asin}: no images")
                continue

            print(json.dumps({
                "asin": asin,
                "title": title[:70],
                "wholesale": price,
                "retail": product["retailPrice"],
                "compare": product["retailComparePrice"],
                "images": len(product["images"]),
                "bullets": len(product["bullets"]),
                "category": product["breadcrumb"][-1] if product["breadcrumb"] else None,
            }, ensure_ascii=False))

            if args.dry_run:
                exported += 1
                continue

            breadcrumb = [x for x in product["breadcrumb"] if x]
            top_name = breadcrumb[0].strip() if breadcrumb else ""
            parent_name = CATEGORY_MAP.get(top_name.lower().strip()) or top_name or "منتجات أخرى"
            category_image = product["images"][0] if product["images"] else None
            parent_id = get_or_create_category(
                token, categories, parent_name, None, category_image
            )
            leaf_name = breadcrumb[-1].strip() if len(breadcrumb) > 1 else parent_name
            if leaf_name and leaf_name != parent_name:
                category_id = get_or_create_category(
                    token, categories, leaf_name, parent_id, category_image
                )
            else:
                category_id = parent_id

            weight_kg = None
            if product["specs"].get("weight"):
                match = re.search(r"([\d.]+)", product["specs"]["weight"].replace(",", ""))
                if match:
                    grams = float(match.group(1))
                    weight_kg = round(grams / 1000, 2) if grams > 5 else round(grams, 2)

            meta_description = (
                f"اشترِ {title} بسعر {product['retailPrice']:g} ج.م مع "
                f"الدفع عند الاستلام والتوصيل لكل المحافظات."
            )
            if len(meta_description) > 160:
                meta_description = meta_description[:157].rstrip() + "…"
            meta_title = title if len(title) <= 70 else title[:67].rstrip() + "…"

            payload = {
                "name": title[:250],
                "description": build_description(product),
                "price": product["retailPrice"],
                "comparePrice": product["retailComparePrice"],
                "cost": price,
                "stock": args.stock,
                "sku": f"AMZ-{asin}",
                "trackInventory": True,
                "isActive": True,
                "images": product["images"],
                "tags": [x for x in [product.get("brand"), parent_name, leaf_name, "أمازون"] if x],
                "metadata": {
                    "brand": product.get("brand"),
                    "asin": asin,
                    "amazonUrl": f"https://www.amazon.eg/dp/{asin}",
                    "amazonPriceWholesale": price,
                    "markupPercent": 50,
                    "fullTitle": title,
                    "amazonRating": product.get("rating"),
                    "amazonReviewCount": product.get("reviews"),
                    "metaDescription": meta_description,
                    **product["specs"],
                },
                "metaTitle": meta_title,
                "metaDescription": meta_description,
            }
            if category_id:
                payload["categoryId"] = category_id
            if weight_kg:
                payload["weight"] = weight_kg

            status, created = http_json("/products", "POST", token, payload)
            if status not in (200, 201) or not created.get("success"):
                progress["failed"][asin] = f"create {status}: {json.dumps(created, ensure_ascii=False)[:200]}"
                print("CREATE_FAILED", asin, status, json.dumps(created, ensure_ascii=False)[:240])
                continue

            product_id = (created.get("data") or {}).get("id")
            if product_id:
                http_json(f"/products/{product_id}", "PATCH", token, {
                    "source": "amazon",
                    "externalId": asin,
                })

            progress["done"][asin] = product_id
            exported += 1
            with open(args.progress, "w", encoding="utf-8") as fh:
                json.dump(progress, fh, ensure_ascii=False, indent=2)
            time.sleep(args.delay)
        except Exception as exc:
            progress["failed"][asin] = str(exc)
            print("ERROR", asin, exc)
            time.sleep(2)

    with open(args.progress, "w", encoding="utf-8") as fh:
        json.dump(progress, fh, ensure_ascii=False, indent=2)
    print(f"DONE exported={exported} done={len(progress['done'])} failed={len(progress['failed'])} skipped={len(progress['skipped'])}")


if __name__ == "__main__":
    main()
