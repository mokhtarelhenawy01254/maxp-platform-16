import { apiClient } from "../../../services/apiClient";
import { ProcurementCatalogItem } from "./types";

function extractImageUrl(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") {
    const trimmed = img.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0) {
          const first = arr[0];
          return typeof first === "string" ? first : (first?.url || null);
        }
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (Array.isArray(img) && img.length > 0) {
    const first = img[0];
    return typeof first === "string" ? first : (first?.url || null);
  }
  return null;
}

export async function fetchProcurementCatalog(
  search = "",
  signal?: AbortSignal
): Promise<ProcurementCatalogItem[]> {
  const query = search.trim();

  // 1. Try dedicated endpoint first
  try {
    const res = await apiClient.get("/procurement/catalog-items", {
      params: { search: query || undefined, limit: 100 },
      signal,
    });

    const data: any = res.data;
    const raw = data?.items || data?.data || (Array.isArray(data) ? data : null);
    if (Array.isArray(raw)) {
      return raw.map((item: any) => ({
        id: String(item.id || `${item.productId}_${item.variantId || "default"}`),
        productId: String(item.productId || item.id),
        variantId: item.variantId || null,
        name: String(item.name || item.productName || ""),
        variantName: item.variantName || null,
        sku: item.sku || null,
        barcode: item.barcode || null,
        cost: Number(item.cost ?? item.purchaseCost ?? item.unitPrice ?? 0),
        price: Number(item.price ?? 0),
        stock: Number(item.stock ?? item.quantity ?? 0),
        imageUrl: extractImageUrl(item.imageUrl || item.image || item.mainImage),
        category: item.category || null,
        type: item.type || "product",
      }));
    }
  } catch (err: any) {
    if (err?.name === "CanceledError" || err?.name === "AbortError") {
      throw err;
    }
    // Fallback to /products
  }

  // 2. Fallback to /products + /dental-lab/materials
  try {
    const [productsRes, materialsRes] = await Promise.all([
      apiClient.get("/products", {
        params: { search: query || undefined, limit: 100 },
        signal,
      }).catch(() => ({ data: { data: [] } })),
      !query
        ? apiClient.get("/dental-lab/materials", { signal }).catch(() => ({ data: { data: [] } }))
        : Promise.resolve({ data: { data: [] } }),
    ]);

    const items: ProcurementCatalogItem[] = [];
    const pData: any = productsRes?.data;
    const prods = pData?.data || pData?.products || [];

    if (Array.isArray(prods)) {
      prods.forEach((p: any) => {
        const variants = p.productVariants || p.variants || [];
        const baseImg = extractImageUrl(p.mainImage || p.images);
        const categoryName = p.category?.name || (typeof p.category === "string" ? p.category : null);

        if (Array.isArray(variants) && variants.length > 0) {
          variants.forEach((v: any) => {
            const vImg = extractImageUrl(v.images) || baseImg;
            items.push({
              id: `v_${v.id}`,
              productId: p.id,
              variantId: v.id,
              name: p.name,
              variantName: v.name || `${v.type || ""}: ${v.value || ""}`.trim() || null,
              sku: v.sku || p.sku || null,
              cost: Number(v.cost ?? p.cost ?? 0),
              price: Number(v.price ?? p.price ?? 0),
              stock: Number(v.stock ?? 0),
              imageUrl: vImg,
              category: categoryName,
              type: "product",
            });
          });
        } else {
          items.push({
            id: `p_${p.id}`,
            productId: p.id,
            variantId: null,
            name: p.name,
            variantName: null,
            sku: p.sku || null,
            cost: Number(p.cost ?? p.price ?? 0),
            price: Number(p.price ?? 0),
            stock: Number(p.stock ?? 0),
            imageUrl: baseImg,
            category: categoryName,
            type: "product",
          });
        }
      });
    }

    const mData: any = materialsRes?.data;
    const materials = mData?.data || [];
    if (Array.isArray(materials)) {
      materials.forEach((m: any) => {
        items.push({
          id: `mat_${m.id}`,
          productId: m.id,
          variantId: null,
          name: m.name,
          variantName: null,
          sku: m.code || null,
          cost: Number(m.costPerUnit || 0),
          price: 0,
          stock: Number(m.currentStock || m.quantity || 0),
          imageUrl: null,
          category: m.category || null,
          type: "dental_material",
        });
      });
    }

    return items;
  } catch (error) {
    console.error("Failed to fetch procurement catalog fallback:", error);
    return [];
  }
}
