import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import type { DeletedProduct } from "../TrashProductCard";

export function useProductsTrashController() {
  const [products, setProducts] = useState<DeletedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDeletedProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { apiClient } = await import("../../../services/apiClient");
      const response = await apiClient.get("/products/trash/all");
      if (response.data?.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching deleted products:", error);
      tToast.error("productsTrash.failed_fetch_bddf");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletedProducts();
  }, [fetchDeletedProducts]);

  const handleRestore = async (productId: string) => {
    setRestoring(productId);
    try {
      const { apiClient } = await import("../../../services/apiClient");
      const response = await apiClient.post(`/products/${productId}/restore`);
      if (response.data?.success) {
        tToast.success("productsTrash.msg_b52a");
        setProducts((prev) => (prev || []).filter((p) => p.id !== productId));
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error restoring product:", error);
      tToast.error("productsTrash.msg_9da5");
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    setDeleting(productId);
    try {
      const { apiClient } = await import("../../../services/apiClient");
      const response = await apiClient.delete(`/products/${productId}/permanent`);
      if (response.data?.success) {
        tToast.success("productsTrash.success_delete_4f2e");
        setProducts((prev) => (prev || []).filter((p) => p.id !== productId));
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error permanently deleting product:", error);
      tToast.error("productsTrash.failed_delete_c5b3");
    } finally {
      setDeleting(null);
    }
  };

  const handleRestoreAll = async () => {
    if (selectedProducts.size === 0) {
      tToast.error("productsTrash.msg_d600");
      return;
    }

    setLoading(true);
    try {
      const { apiClient } = await import("../../../services/apiClient");
      let successCount = 0;
      for (const productId of selectedProducts) {
        try {
          const response = await apiClient.post(`/products/${productId}/restore`);
          if (response.data?.success) {
            successCount++;
          }
        } catch (e) {
          console.error(`Error restoring product ${productId}:`, e);
        }
      }

      if (successCount > 0) {
        toast.success(`تم استعادة ${successCount} منتج بنجاح`);
        fetchDeletedProducts();
        setSelectedProducts(new Set());
      }
    } catch (error) {
      console.error("Error restoring all products:", error);
      tToast.error("productsTrash.failed_restore_ea6a");
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDeleteAll = async () => {
    if (selectedProducts.size === 0) {
      tToast.error("productsTrash.msg_1884");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف ${selectedProducts.size} منتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setLoading(true);
    try {
      const { apiClient } = await import("../../../services/apiClient");
      let successCount = 0;
      for (const productId of selectedProducts) {
        try {
          const response = await apiClient.delete(`/products/${productId}/permanent`);
          if (response.data?.success) {
            successCount++;
          }
        } catch (e) {
          console.error(`Error permanently deleting product ${productId}:`, e);
        }
      }

      if (successCount > 0) {
        toast.success(`تم حذف ${successCount} منتج نهائياً`);
        fetchDeletedProducts();
        setSelectedProducts(new Set());
      }
    } catch (error) {
      console.error("Error deleting all products:", error);
      tToast.error("productsTrash.failed_delete_c5b3");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set((products || []).map((p) => p.id)));
    }
  };

  return {
    products,
    loading,
    selectedProducts,
    restoring,
    deleting,
    fetchDeletedProducts,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handlePermanentDeleteAll,
    toggleSelect,
    toggleSelectAll,
  };
}
