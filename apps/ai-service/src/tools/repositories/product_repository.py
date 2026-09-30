from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class ProductRepository(BaseRepository):
    async def update_product_price(self, product_id: str, company_id: str, new_price: float) -> dict[str, Any]:
        row = await self._session.execute(text("""
            UPDATE products
            SET price = :new_price, "updatedAt" = NOW()
            WHERE id = :pid AND "companyId" = :cid
            RETURNING id, name, price
        """), {"pid": product_id, "cid": company_id, "new_price": new_price})
        updated = row.first()
        await self._session.commit()
        if not updated:
            return {"success": False, "error": f"Product '{product_id}' not found for company '{company_id}'"}

        try:
            await self._session.execute(text("""
                UPDATE ai.product_embeddings
                SET price = :new_price, updated_at = NOW()
                WHERE product_id = :pid AND company_id = :cid
            """), {"pid": product_id, "cid": company_id, "new_price": new_price})
            await self._session.commit()
        except Exception:
            pass

        return {
            "success": True,
            "productId": updated.id,
            "name": updated.name,
            "newPrice": float(updated.price),
            "message": f"تم تحديث سعر المنتج '{updated.name}' إلى {updated.price} بنجاح.",
        }

    async def get_product(self, product_id: str, company_id: str) -> dict[str, Any] | None:
        row = await self._session.execute(text("""
            SELECT id, name, price, images
            FROM products WHERE id = :pid AND "companyId" = :cid
        """), {"pid": product_id, "cid": company_id})
        info = row.first()
        return dict(info._mapping) if info else None

    async def resolve_product_by_identifier(self, company_id: str, identifier: str) -> dict[str, Any] | None:
        clean = str(identifier or "").strip()
        if not clean or not company_id:
            return None
        row = await self._session.execute(text("""
            SELECT id, name, sku, price, "comparePrice", stock, "showFakeStock", "isPreOrder", metadata
            FROM products
            WHERE "companyId" = :cid
              AND (id = :ident OR LOWER(COALESCE(sku, '')) = LOWER(:ident) OR LOWER(name) = LOWER(:ident))
            LIMIT 1
        """), {"cid": company_id, "ident": clean})
        found = row.first()
        if found:
            return dict(found._mapping)

        row_like = await self._session.execute(text("""
            SELECT id, name, sku, price, "comparePrice", stock, "showFakeStock", "isPreOrder", metadata
            FROM products
            WHERE "companyId" = :cid
              AND (name ILIKE :pattern OR COALESCE(sku, '') ILIKE :pattern)
            ORDER BY "isActive" DESC, "updatedAt" DESC
            LIMIT 1
        """), {"cid": company_id, "pattern": f"%{clean}%"})
        found_like = row_like.first()
        return dict(found_like._mapping) if found_like else None

    async def _resolve_product_list_details(self, company_id: str, identifiers: list[str]) -> list[dict[str, Any]]:
        resolved: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in identifiers or []:
            item = await self.resolve_product_by_identifier(company_id, str(raw))
            if item and item["id"] not in seen:
                seen.add(item["id"])
                resolved.append({
                    "id": item["id"],
                    "name": item["name"],
                    "sku": item.get("sku") or "",
                    "price": float(item.get("price") or 0),
                    "stock": int(item.get("stock") or 0),
                })
        return resolved

    @staticmethod
    def _parse_metadata(raw_metadata: Any) -> dict[str, Any]:
        import json
        if isinstance(raw_metadata, dict):
            return dict(raw_metadata)
        if isinstance(raw_metadata, str) and raw_metadata.strip():
            try:
                parsed = json.loads(raw_metadata)
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                return {}
        return {}

    async def get_product_conversion_settings(self, product_id: str, company_id: str) -> dict[str, Any]:
        product = await self.resolve_product_by_identifier(company_id, product_id)
        if not product:
            return {"found": False, "error": f"لم يتم العثور على المنتج '{product_id}'"}

        meta = self._parse_metadata(product.get("metadata"))
        upsell_ids = [str(x).strip() for x in (meta.get("upsellProducts") or []) if str(x).strip()]
        cross_sell_ids = [str(x).strip() for x in (meta.get("crossSellProducts") or []) if str(x).strip()]
        related_ids = [str(x).strip() for x in (meta.get("relatedProducts") or []) if str(x).strip()]

        upsell_items = await self._resolve_product_list_details(company_id, upsell_ids)
        cross_sell_items = await self._resolve_product_list_details(company_id, cross_sell_ids)
        related_items = await self._resolve_product_list_details(company_id, related_ids)

        quantity_offers = meta.get("quantityOffers") if isinstance(meta.get("quantityOffers"), list) else []
        volume_discounts = meta.get("volumeDiscounts") if isinstance(meta.get("volumeDiscounts"), list) else []

        return {
            "found": True,
            "productId": product["id"],
            "name": product["name"],
            "sku": product.get("sku") or "",
            "price": float(product.get("price") or 0),
            "comparePrice": float(product["comparePrice"]) if product.get("comparePrice") is not None else None,
            "stock": int(product.get("stock") or 0),
            "editUrl": f"/products/{product['id']}/edit",
            "advancedTabSettings": {
                "upsellProducts": upsell_items,
                "crossSellProducts": cross_sell_items,
                "relatedProducts": related_items,
                "showFakeStock": bool(product.get("showFakeStock")),
                "isPreOrder": bool(product.get("isPreOrder")),
                "excludeFromFreeShipping": bool(meta.get("excludeFromFreeShipping", False)),
                "enableCheckoutForm": bool(meta.get("enableCheckoutForm", True)),
                "showAddToCartButton": bool(meta.get("showAddToCartButton", True)),
                "hasSizeGuide": bool(str(meta.get("sizeGuide") or "").strip()),
                "customAttributesCount": len(meta.get("customAttributes") or []) if isinstance(meta.get("customAttributes"), list) else 0,
            },
            "quantityOffersTabSettings": {
                "quantityOffers": quantity_offers,
                "volumeDiscounts": volume_discounts,
            },
        }

    async def update_product_conversion_settings(
        self,
        product_id: str,
        company_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        import json

        product = await self.resolve_product_by_identifier(company_id, product_id)
        if not product:
            return {"success": False, "error": f"لم يتم العثور على المنتج '{product_id}'"}

        pid = product["id"]
        base_price = float(product.get("price") or 0)
        meta = self._parse_metadata(product.get("metadata"))
        changes_applied: list[str] = []

        if updates.get("cross_sell_products") is not None:
            resolved_cross = await self._resolve_product_list_details(company_id, updates["cross_sell_products"])
            cross_ids = [item["id"] for item in resolved_cross if item["id"] != pid]
            meta["crossSellProducts"] = cross_ids
            names = "، ".join(item["name"] for item in resolved_cross if item["id"] != pid) or "بدون"
            changes_applied.append(f"ربط المنتجات المكملة / يُشترى معًا (Cross-Sell): {names}")

        if updates.get("upsell_products") is not None:
            resolved_upsell = await self._resolve_product_list_details(company_id, updates["upsell_products"])
            upsell_ids = [item["id"] for item in resolved_upsell if item["id"] != pid]
            meta["upsellProducts"] = upsell_ids
            names = "، ".join(item["name"] for item in resolved_upsell if item["id"] != pid) or "بدون"
            changes_applied.append(f"ربط منتجات الترقية (Upsell): {names}")

        if updates.get("related_products") is not None:
            resolved_rel = await self._resolve_product_list_details(company_id, updates["related_products"])
            rel_ids = [item["id"] for item in resolved_rel if item["id"] != pid]
            meta["relatedProducts"] = rel_ids
            names = "، ".join(item["name"] for item in resolved_rel if item["id"] != pid) or "بدون"
            changes_applied.append(f"ربط المنتجات المشابهة (Related): {names}")

        if updates.get("quantity_tiers") is not None:
            raw_tiers = updates["quantity_tiers"] or []
            quantity_offers = []
            volume_discounts = []
            tier_summaries = []
            for idx, tier in enumerate(raw_tiers):
                qty = max(2, int(tier.get("quantity") or 2))
                disc_pct = tier.get("discount_percent")
                unit_price = tier.get("unit_price")
                if unit_price is None and disc_pct is not None:
                    pct = max(0.0, min(95.0, float(disc_pct)))
                    unit_price = round(base_price * (1.0 - pct / 100.0), 2)
                elif unit_price is not None:
                    unit_price = round(max(0.0, float(unit_price)), 2)
                    pct = round(((base_price - unit_price) / base_price) * 100.0, 1) if base_price > 0 else 0.0
                else:
                    continue

                buy_text = tier.get("label") or f"اشترِ {qty} قطع بخصم {pct:g}%"
                quantity_offers.append({
                    "id": f"quantity-offer-{qty}-{idx + 1}",
                    "quantity": qty,
                    "unitPrice": unit_price,
                    "buyText": buy_text,
                    "helperText": f"توفير {pct:g}%",
                    "helperDescription": f"سعر القطعة {unit_price} ج.م بدلاً من {base_price:g} ج.م",
                    "hideUnitPrice": False,
                    "enableFreeShipping": False,
                    "isDefault": idx == 0,
                    "isActive": True,
                    "sortOrder": qty,
                })
                volume_discounts.append({
                    "id": f"volume-discount-{qty}",
                    "minQuantity": qty,
                    "maxQuantity": None,
                    "discountType": "percentage" if disc_pct is not None else "fixed",
                    "discountValue": float(disc_pct) if disc_pct is not None else round(max(0.0, base_price - unit_price), 2),
                    "isActive": True,
                })
                tier_summaries.append(f"{qty} قطع = خصم {pct:g}% (سعر القطعة {unit_price} ج.م)")

            meta["quantityOffers"] = quantity_offers
            meta["volumeDiscounts"] = volume_discounts
            changes_applied.append(f"ضبط شرائح عروض الكمية: {' · '.join(tier_summaries) if tier_summaries else 'تم المسح'}")

        if updates.get("exclude_from_free_shipping") is not None:
            val = bool(updates["exclude_from_free_shipping"])
            meta["excludeFromFreeShipping"] = val
            changes_applied.append(f"استثناء من الشحن المجاني: {'مفعّل' if val else 'غير مفعّل'}")

        if updates.get("enable_checkout_form") is not None:
            val = bool(updates["enable_checkout_form"])
            meta["enableCheckoutForm"] = val
            changes_applied.append(f"فورم الشيك أوت المباشر للمنتج: {'مفعّل' if val else 'متوقف'}")

        show_fake_stock = product.get("showFakeStock")
        if updates.get("show_fake_stock") is not None:
            show_fake_stock = bool(updates["show_fake_stock"])
            changes_applied.append(f"العداد الوهمي للمنتج: {'مفعّل' if show_fake_stock else 'متوقف'}")

        compare_price = product.get("comparePrice")
        if updates.get("compare_price") is not None:
            compare_price = float(updates["compare_price"])
            changes_applied.append(f"سعر الشطب (قبل الخصم): {compare_price} ج.م")

        meta_json = json.dumps(meta, ensure_ascii=False)
        await self._session.execute(text("""
            UPDATE products
            SET metadata = :meta,
                "showFakeStock" = :fake_stock,
                "comparePrice" = :compare_price,
                "updatedAt" = NOW()
            WHERE id = :pid AND "companyId" = :cid
        """), {
            "meta": meta_json,
            "fake_stock": bool(show_fake_stock),
            "compare_price": compare_price,
            "pid": pid,
            "cid": company_id,
        })
        await self._session.commit()

        updated_snapshot = await self.get_product_conversion_settings(pid, company_id)
        updated_snapshot["success"] = True
        updated_snapshot["changesApplied"] = changes_applied
        updated_snapshot["message"] = (
            f"تم تحديث إعدادات التحويل والعروض للمنتج «{product['name']}» بنجاح: "
            + ("؛ ".join(changes_applied) if changes_applied else "لا توجد تغييرات")
        )
        return updated_snapshot

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
        
        # 1. Determine and Auto-Resolve Base SKU Conflicts
        sku = (product_data.get("sku") or "").strip()
        if not sku:
            sku = f"PRD-{int(datetime.utcnow().timestamp())}"
        
        existing_sku = await self._session.execute(text("""
            SELECT id FROM products WHERE "companyId" = :cid AND sku = :sku LIMIT 1
        """), {"cid": company_id, "sku": sku})
        if existing_sku.first():
            sku = f"{sku}-{int(datetime.utcnow().timestamp()) % 10000}"

        # 2. Resolve Category (by ID or exact/partial Name)
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

        # 3. Calculate Stock & Prepare Variants
        raw_variants = product_data.get("variants") or []
        variants_total_stock = sum(int(v.get("stock", 0) or 0) for v in raw_variants)
        base_stock = int(product_data.get("stock") or 0)
        final_stock = variants_total_stock if (variants_total_stock > 0 and base_stock == 0) else (base_stock or variants_total_stock)

        # 4. Generate and Auto-Resolve Slug Conflicts
        clean_slug = re.sub(r"[^\w\s-]", "", name, flags=re.UNICODE).strip()
        clean_slug = re.sub(r"[\s_]+", "-", clean_slug).strip("-")
        if not clean_slug:
            clean_slug = "product"
        ts = int(datetime.utcnow().timestamp())
        slug = f"{clean_slug}-{ts}"

        existing_slug = await self._session.execute(text("""
            SELECT id FROM products WHERE "companyId" = :cid AND slug = :slug LIMIT 1
        """), {"cid": company_id, "slug": slug})
        if existing_slug.first():
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        # 5. Media, Tags, and Workflow Status
        images_list = product_data.get("images") or []
        main_image = images_list[0] if images_list else None
        images_json = json.dumps(images_list, ensure_ascii=False) if images_list else None

        tags_list = product_data.get("tags") or []
        tags_json = json.dumps(tags_list, ensure_ascii=False) if tags_list else None

        # Support DRAFT vs PUBLISHED workflow
        status_req = (product_data.get("status") or "PUBLISHED").upper()
        if status_req == "DRAFT":
            is_active = False
            wf_status = "DRAFT"
        else:
            is_active = bool(product_data.get("is_active", True))
            wf_status = "PUBLISHED" if is_active else "DRAFT"

        metadata_dict = {
            "workflow": {
                "status": wf_status,
                "publishedAt": datetime.utcnow().isoformat() if is_active else None,
                "createdBy": "product-creator-agent"
            }
        }
        metadata_json = json.dumps(metadata_dict, ensure_ascii=False)

        # 6. Insert Product
        await self._session.execute(text("""
            INSERT INTO products (
                id, name, description, sku, price, "comparePrice", cost,
                stock, "trackInventory", "categoryId", slug, "companyId",
                images, "mainImage", tags, metadata, "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :name, :description, :sku, :price, :compare_price, :cost,
                :stock, true, :category_id, :slug, :company_id,
                :images, :main_image, :tags, :metadata, :is_active, NOW(), NOW()
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
            "metadata": metadata_json,
            "is_active": is_active,
        })

        # 7. Insert Variants with Guaranteed Unique SKUs
        created_variants = []
        seen_variant_skus = set()
        for idx, var in enumerate(raw_variants):
            var_id = str(uuid.uuid4())
            var_name = (var.get("name") or f"Variant {idx+1}").strip()
            var_type = var.get("type") or "combined"
            raw_var_sku = (var.get("sku") or f"{sku}-{idx+1}").strip()
            var_sku = raw_var_sku
            if var_sku in seen_variant_skus:
                var_sku = f"{var_sku}-{idx+1}"
            seen_variant_skus.add(var_sku)

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

        # 8. Instant Vector Embedding Sync (Non-blocking for RAG / Semantic Search)
        try:
            from src.memory.episodic_memory import EpisodicMemoryService
            svc = EpisodicMemoryService()
            embed_text = f"{name}. {description or ''}. {' '.join(tags_list)}".strip(". ")
            if resolved_category_name:
                embed_text += f" Category: {resolved_category_name}."

            res = await svc.generate_embedding_with_provider(text=embed_text, task_type="RETRIEVAL_DOCUMENT")
            vec = res.get("vector")
            if vec and len(vec) == 768:
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"
                emb_status = "IN_STOCK" if final_stock > 0 else "OUT_OF_STOCK"
                await self._session.execute(text("""
                    INSERT INTO ai.product_embeddings
                        (id, company_id, product_id, product_name, sku, price, status,
                         text_embedding, embed_text, image_url, description, tags, category, workflow_status)
                    VALUES (gen_random_uuid()::text, :cid, :pid, :name, :sku,
                            :price, :status, :vec, :embed_text, :image_url,
                            :desc, :tags, :cat, :wf)
                    ON CONFLICT (company_id, product_id) DO UPDATE SET
                        product_name = EXCLUDED.product_name,
                        text_embedding = EXCLUDED.text_embedding,
                        embed_text = EXCLUDED.embed_text,
                        price = EXCLUDED.price,
                        status = EXCLUDED.status,
                        workflow_status = EXCLUDED.workflow_status,
                        updated_at = NOW()
                """), {
                    "cid": company_id,
                    "pid": product_id,
                    "name": name,
                    "sku": sku,
                    "price": price,
                    "status": emb_status,
                    "vec": vec_str,
                    "embed_text": embed_text,
                    "image_url": main_image,
                    "desc": description,
                    "tags": tags_json or "[]",
                    "cat": resolved_category_name,
                    "wf": wf_status,
                })
                await self._session.commit()
        except Exception:
            pass  # Non-blocking

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
            "workflowStatus": wf_status,
        }


