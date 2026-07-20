import { useState, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";

export interface ProductPresentation {
  id?: string;
  name: string;
  slug: string;
  images: string[];
  mainImage?: string;
  title?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export function useProductPresentations(productId: string | null) {
  const [presentations, setPresentations] = useState<ProductPresentation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPresentations = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/${productId}/presentations`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPresentations(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const addPresentation = useCallback(
    async (data: Partial<ProductPresentation>) => {
      if (!productId) return null;
      try {
        const res = await apiClient.post(
          `/products/${productId}/presentations`,
          data,
        );
        if (res.data?.success && res.data.data) {
          setPresentations((prev) => [...prev, res.data.data]);
          return res.data.data;
        }
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.message || "فشل في إنشاء العرض التقديمي",
        );
      }
      return null;
    },
    [productId],
  );

  const updatePresentation = useCallback(
    async (
      presentationId: string,
      data: Partial<ProductPresentation>,
    ) => {
      if (!productId) return null;
      try {
        const res = await apiClient.put(
          `/products/${productId}/presentations/${presentationId}`,
          data,
        );
        if (res.data?.success && res.data.data) {
          setPresentations((prev) =>
            prev.map((p) =>
              p.id === presentationId ? res.data.data : p,
            ),
          );
          return res.data.data;
        }
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.message || "فشل في تحديث العرض التقديمي",
        );
      }
      return null;
    },
    [productId],
  );

  const deletePresentation = useCallback(
    async (presentationId: string) => {
      if (!productId) return;
      try {
        await apiClient.delete(
          `/products/${productId}/presentations/${presentationId}`,
        );
        setPresentations((prev) =>
          prev.filter((p) => p.id !== presentationId),
        );
      } catch {
        // ignore
      }
    },
    [productId],
  );

  return {
    presentations,
    loading,
    fetchPresentations,
    addPresentation,
    updatePresentation,
    deletePresentation,
  };
}
