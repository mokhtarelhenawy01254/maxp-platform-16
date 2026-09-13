from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class ProductRepository(BaseRepository):
    async def get_product(self, product_id: str, company_id: str) -> dict[str, Any] | None:
        row = await self._session.execute(text("""
            SELECT id, name, price, images
            FROM products WHERE id = :pid AND "companyId" = :cid
        """), {"pid": product_id, "cid": company_id})
        info = row.first()
        return dict(info._mapping) if info else None

    async def count_visits(self, product_id: str, company_id: str, start: datetime, end: datetime) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*) AS cnt FROM product_visits
            WHERE "productId" = :pid AND "companyId" = :cid
              AND "visitedAt" BETWEEN :start AND :end
        """), {"pid": product_id, "cid": company_id, "start": start, "end": end})
        first = row.first()
        return first.cnt if first else 0

    async def count_conversion_events(self, product_id: str, company_id: str, event_type: str, start: datetime, end: datetime) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*) AS cnt FROM conversion_events
            WHERE "productId" = :pid AND "companyId" = :cid
              AND "eventType" = :evt
              AND "createdAt" BETWEEN :start AND :end
        """), {"pid": product_id, "cid": company_id, "evt": event_type, "start": start, "end": end})
        first = row.first()
        return first.cnt if first else 0

    async def get_sales_aggregate(self, product_id: str, company_id: str, start: datetime, end: datetime) -> dict[str, Any]:
        row = await self._session.execute(text("""
            SELECT COALESCE(SUM(oi.quantity), 0)::int AS qty_sold,
                   COALESCE(SUM(oi.total), 0) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi."orderId"
            WHERE oi."productId" = :pid AND o."companyId" = :cid
              AND o."createdAt" BETWEEN :start AND :end
              AND o.status != 'CANCELLED'
        """), {"pid": product_id, "cid": company_id, "start": start, "end": end})
        first = row.first()
        return dict(first._mapping) if first else {"qty_sold": 0, "revenue": 0}

    async def create_product_with_variants(self, company_id: str, product_data: dict[str, Any]) -> dict[str, Any]:
        import json
        import re
        import uuid

        product_id = str(uuid.uuid4())
        name = (product_data.get("name") or "").strip()
        description = product_data.get("description")
        price = float(product_data.get("price") or 0.0)
        compare_price = float(product_data["compare_price"]) if product_data.get("compare_price") is not None else None
        cost = float(product_data["cost"]) if product_data.get("cost") is not None else None
        
        # Determine SKU
        sku = product_data.get("sku")
        if not sku:
            sku = f"PRD-{int(datetime.utcnow().timestamp())}"

        # Resolve category if category_name given
        category_id = product_data.get("category_id")
        category_name = product_data.get("category_name")
        resolved_category_name = None
        if category_id:
            cat_row = await self._session.execute(text("""
                SELECT id, name FROM categories WHERE id = :cat_id AND "companyId" = :cid LIMIT 1
            """), {"cat_id": category_id, "cid": company_id})
            c_first = cat_row.first()
            if c_first:
                resolved_category_name = c_first.name
        elif category_name:
            cat_row = await self._session.execute(text("""
                SELECT id, name FROM categories
                WHERE "companyId" = :cid AND (name ILIKE :cname OR slug ILIKE :cname)
                LIMIT 1
            """), {"cid": company_id, "cname": f"%{category_name.strip()}%"})
            c_first = cat_row.first()
            if c_first:
                category_id = c_first.id
                resolved_category_name = c_first.name

        # Calculate stock and prepare variants
        raw_variants = product_data.get("variants") or []
        variants_total_stock = sum(int(v.get("stock", 0) or 0) for v in raw_variants)
        base_stock = int(product_data.get("stock") or 0)
        final_stock = variants_total_stock if (variants_total_stock > 0 and base_stock == 0) else (base_stock or variants_total_stock)

        # Generate unique slug
        clean_slug = re.sub(r"[^\w\s-]", "", name, flags=re.UNICODE).strip()
        clean_slug = re.sub(r"[\s_]+", "-", clean_slug).strip("-")
        if not clean_slug:
            clean_slug = "product"
        ts = int(datetime.utcnow().timestamp())
        slug = f"{clean_slug}-{ts}"

        # Prepare images & tags
        images_list = product_data.get("images") or []
        main_image = images_list[0] if images_list else None
        images_json = json.dumps(images_list, ensure_ascii=False) if images_list else None

        tags_list = product_data.get("tags") or []
        tags_json = json.dumps(tags_list, ensure_ascii=False) if tags_list else None

        is_active = bool(product_data.get("is_active", True))

        # Insert Product
        await self._session.execute(text("""
            INSERT INTO products (
                id, name, description, sku, price, "comparePrice", cost,
                stock, "trackInventory", "categoryId", slug, "companyId",
                images, "mainImage", tags, "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :name, :description, :sku, :price, :compare_price, :cost,
                :stock, true, :category_id, :slug, :company_id,
                :images, :main_image, :tags, :is_active, NOW(), NOW()
            )
        """), {
            "id": product_id,
            "name": name,
            "description": description,
            "sku": sku,
            "price": price,
            "compare_price": compare_price,
            "cost": cost,
            "stock": final_stock,
            "category_id": category_id,
            "slug": slug,
            "company_id": company_id,
            "images": images_json,
            "main_image": main_image,
            "tags": tags_json,
            "is_active": is_active,
        })

        # Insert Variants
        created_variants = []
        for idx, var in enumerate(raw_variants):
            var_id = str(uuid.uuid4())
            var_name = (var.get("name") or f"Variant {idx+1}").strip()
            var_type = var.get("type") or "combined"
            var_sku = var.get("sku") or f"{sku}-{idx+1}"
            var_price = float(var["price"]) if var.get("price") is not None else price
            var_compare = float(var["compare_price"]) if var.get("compare_price") is not None else compare_price
            var_cost = float(var["cost"]) if var.get("cost") is not None else cost
            var_stock = int(var.get("stock") or 0)
            var_images = json.dumps(var["images"], ensure_ascii=False) if var.get("images") else None

            await self._session.execute(text("""
                INSERT INTO product_variants (
                    id, "productId", name, type, sku, price, "comparePrice", cost,
                    stock, "trackInventory", "isActive", "sortOrder", images, "createdAt", "updatedAt"
                ) VALUES (
                    :id, :product_id, :name, :type, :sku, :price, :compare_price, :cost,
                    :stock, true, true, :sort_order, :images, NOW(), NOW()
                )
            """), {
                "id": var_id,
                "product_id": product_id,
                "name": var_name,
                "type": var_type,
                "sku": var_sku,
                "price": var_price,
                "compare_price": var_compare,
                "cost": var_cost,
                "stock": var_stock,
                "sort_order": idx,
                "images": var_images,
            })

            created_variants.append({
                "id": var_id,
                "name": var_name,
                "type": var_type,
                "sku": var_sku,
                "price": var_price,
                "comparePrice": var_compare,
                "stock": var_stock,
            })

        await self._session.commit()

        return {
            "success": True,
            "productId": product_id,
            "name": name,
            "slug": slug,
            "sku": sku,
            "price": price,
            "comparePrice": compare_price,
            "stock": final_stock,
            "categoryId": category_id,
            "categoryName": resolved_category_name,
            "variantsCount": len(created_variants),
            "variants": created_variants,
            "isActive": is_active,
        }

