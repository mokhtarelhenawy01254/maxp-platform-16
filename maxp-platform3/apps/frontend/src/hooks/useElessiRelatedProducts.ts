import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import type { ElessiRelatedProduct } from "../data/mockData";

interface RelatedProductsResponseItem {
  id: string;
  name: string;
  price?: number | string;
  images?: string[] | string;
}

const parseImages = (images: string | string[] | undefined): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [images];
    } catch {
      return [images];
    }
  }
  return [];
};

const formatCurrency = (value: number | string | undefined): string => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export interface UseElessiRelatedProductsResult {
  products: ElessiRelatedProduct[];
  loading: boolean;
}

export const useElessiRelatedProducts = (
  productId?: string,
  companyId?: string | null,
  limit: number = 4,
): UseElessiRelatedProductsResult => {
  const [products, setProducts] = useState<ElessiRelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelatedProducts = useCallback(async () => {
    if (!productId || !companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get(`/public/products/${productId}/related`, {
        params: { companyId, limit },
      });

      if (response.data?.success) {
        const items = response.data.data as RelatedProductsResponseItem[];
        const mapped = (items || []).map((item) => {
          const images = parseImages(item.images);
          return {
            id: item.id,
            name: item.name,
            price: formatCurrency(item.price),
            image: {
              src: images[0] || "https://via.placeholder.com/480x600?text=Product",
              alt: item.name,
            },
          };
        });
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("❌ [ElessiRelatedProducts] Error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, limit, productId]);

  useEffect(() => {
    void fetchRelatedProducts();
  }, [fetchRelatedProducts]);

  return {
    products,
    loading,
  };
};
