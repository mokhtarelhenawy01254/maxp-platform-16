import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useProducts } from "./useProducts";

export function useProductsPageController() {
  const productsHook = useProducts();
  const { t, i18n: i18nInstance } = useTranslation();
  const isEn = Boolean(i18nInstance.language && i18nInstance.language.startsWith("en"));

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    products,
    selectedProducts,
    handleBulkVisibility,
    handleBulkDelete,
    clearSelection,
    loadProducts,
    handleWorkflowAction,
    saveQuickEdit,
    handleDuplicate,
    handleDeleteAll,
    handleFilterChange,
    filters,
  } = productsHook;

  const onBulkVisibility = useCallback(
    async (isHidden: boolean) => {
      try {
        const count = await handleBulkVisibility(isHidden);
        if (count) {
          toast.success(
            isEn
              ? `Successfully ${isHidden ? "hidden" : "shown"} ${count} products`
              : `تم ${isHidden ? "إخفاء" : "إظهار"} ${count} منتج بنجاح`
          );
        }
      } catch {
        toast.error(
          isEn
            ? `Error while ${isHidden ? "hiding" : "showing"} products`
            : `حدث خطأ أثناء ${isHidden ? "الإخفاء" : "الإظهار"}`
        );
      }
    },
    [handleBulkVisibility, isEn]
  );

  const onBulkTrackInventory = useCallback(
    async (enabled: boolean) => {
      try {
        const { apiClient } = await import("../../../services/apiClient");
        const ids = Array.from(selectedProducts);
        if (ids.length === 0) return;
        const r = await apiClient.patch("products/bulk/track-inventory", {
          productIds: ids,
          trackInventory: enabled,
          includeVariants: true,
        });
        const cnt = r?.data?.data?.productsUpdated || ids.length;
        toast.success(
          isEn
            ? `Successfully ${enabled ? "enabled" : "disabled"} inventory tracking for ${cnt} products`
            : `تم ${enabled ? "تفعيل" : "إيقاف"} تتبع المخزون لـ ${cnt} منتج`
        );
        clearSelection();
        await loadProducts();
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ||
            (isEn ? "Failed to update inventory tracking" : "فشل تحديث تتبع المخزون")
        );
      }
    },
    [selectedProducts, isEn, clearSelection, loadProducts]
  );

  const onBulkDelete = useCallback(async () => {
    try {
      const count = await handleBulkDelete();
      if (count) {
        toast.success(
          isEn
            ? `Successfully deleted ${count} products`
            : `تم حذف ${count} منتج بنجاح`
        );
      }
    } catch {
      toast.error(
        isEn ? "Failed to delete selected products" : "فشل حذف المنتجات المحددة"
      );
    }
  }, [handleBulkDelete, isEn]);

  const bulkConvertSourceIds = useMemo(
    () => Array.from(selectedProducts),
    [selectedProducts]
  );

  const bulkConvertSourceProducts = useMemo(() => {
    const byId = new Map(products.map((p: any) => [p.id, p]));
    return bulkConvertSourceIds
      .map((id) => {
        const p = byId.get(id);
        return { id, name: p?.name || id };
      })
      .filter(Boolean);
  }, [bulkConvertSourceIds, products]);

  const handleBulkConvertSuccess = useCallback(
    async (result: { convertedCount: number; skippedCount: number }) => {
      setShowBulkConvertModal(false);
      clearSelection();
      await loadProducts();
      if (result.convertedCount > 0) {
        toast.success(
          `تم تحويل ${result.convertedCount} منتج إلى عروض تقديمية${
            result.skippedCount > 0 ? `، وتم تخطي ${result.skippedCount}` : ""
          }`
        );
      } else {
        toast.error("لم يتم تحويل أي منتج — راجع المنتجات المحددة");
      }
    },
    [clearSelection, loadProducts]
  );

  const onWorkflowAction = useCallback(
    async (
      product: any,
      action: "save_draft" | "submit_review" | "approve" | "reject" | "publish" | "unpublish"
    ) => {
      try {
        let rejectionReason: string | null = null;
        if (action === "reject") {
          rejectionReason = prompt("سبب الرفض (اختياري):")?.trim() || null;
        }

        await handleWorkflowAction(product.id, action, rejectionReason);

        const messages: Record<string, string> = {
          save_draft: "تم حفظ المنتج كمسودة",
          submit_review: "تم إرسال المنتج للمراجعة",
          approve: "تم اعتماد المنتج بنجاح",
          reject: "تم رفض المنتج",
          publish: "تم نشر المنتج بنجاح",
          unpublish: "تم إلغاء نشر المنتج",
        };
        toast.success(messages[action] || "تم تحديث حالة المنتج");
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || "حدث خطأ أثناء تحديث الحالة"
        );
      }
    },
    [handleWorkflowAction]
  );

  const onSaveQuickEdit = useCallback(
    async (id: string) => {
      try {
        const success = await saveQuickEdit(id);
        if (success) toast.success("تم تحديث المنتج بنجاح");
        else toast.error("فشل تحديث المنتج");
      } catch {
        toast.error("حدث خطأ أثناء حفظ التعديل السريع");
      }
    },
    [saveQuickEdit]
  );

  const onDuplicate = useCallback(
    async (product: any) => {
      try {
        const success = await handleDuplicate(product);
        if (success) toast.success(`تم نسخ المنتج "${product.name}" بنجاح`);
        else toast.error("فشل نسخ المنتج");
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "حدث خطأ غير متوقع"
        );
      }
    },
    [handleDuplicate]
  );

  const onDeleteAll = useCallback(async () => {
    try {
      const result = await handleDeleteAll();
      if (result) {
        toast.success(
          `تم حذف ${result.deletedProductsCount || 0} منتج و ${
            result.deletedVariantsCount || 0
          } متغير بنجاح`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حذف المنتجات");
    }
  }, [handleDeleteAll]);

  const handleExport = useCallback(async () => {
    try {
      const { apiClient } = await import("../../../services/apiClient");
      const r = await apiClient.get("products/export", {
        params: { format: "csv" },
        responseType: "blob",
      });
      if (r.status === 200) {
        const blob = new Blob([r.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("تم تصدير ملف المنتجات بنجاح");
      }
    } catch {
      toast.error("فشل تصدير ملف المنتجات");
    }
  }, []);

  const handleImportCSV = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const { apiClient } = await import("../../../services/apiClient");
        const text = await file.text();
        const lines = text.split("\n").filter((l) => l.trim());
        const dataLines = lines.slice(1);
        const toImport = dataLines
          .map((line) => {
            const values = line.split(",");
            return {
              name: values[0]?.trim() || "",
              sku: values[1]?.trim() || `SKU-${Date.now()}`,
              price: parseFloat(values[2] || "0") || 0,
              stock: parseInt(values[4] || "0", 10) || 0,
              isActive: true,
            };
          })
          .filter((p) => p.name);
        let count = 0;
        for (const p of toImport) {
          const r = await apiClient.post("products", p);
          if (r.status === 200 || r.status === 201) count++;
        }
        await loadProducts();
        setShowImportModal(false);
        toast.success(`تم استيراد ${count} منتج بنجاح`);
      } catch {
        toast.error("فشل استيراد ملف المنتجات");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [loadProducts]
  );

  const handleStatClick = useCallback(
    (type: "all" | "published" | "low-stock" | "out-of-stock") => {
      if (type === "all") {
        handleFilterChange("statusFilter", "all");
        handleFilterChange("stockFilter", "all");
      } else if (type === "published") {
        handleFilterChange(
          "statusFilter",
          filters.statusFilter === "published" ? "all" : "published"
        );
        handleFilterChange("stockFilter", "all");
      } else if (type === "low-stock") {
        handleFilterChange(
          "stockFilter",
          filters.stockFilter === "low-stock" ? "all" : "low-stock"
        );
        handleFilterChange("statusFilter", "all");
      } else if (type === "out-of-stock") {
        handleFilterChange(
          "stockFilter",
          filters.stockFilter === "out-of-stock" ? "all" : "out-of-stock"
        );
        handleFilterChange("statusFilter", "all");
      }
    },
    [filters.statusFilter, filters.stockFilter, handleFilterChange]
  );

  return {
    ...productsHook,
    isEn,
    viewMode,
    setViewMode,
    showAdvancedFilters,
    setShowAdvancedFilters,
    showImportModal,
    setShowImportModal,
    showQuickAddModal,
    setShowQuickAddModal,
    showBulkConvertModal,
    setShowBulkConvertModal,
    fileInputRef,
    bulkConvertSourceIds,
    bulkConvertSourceProducts,
    onBulkVisibility,
    onBulkTrackInventory,
    onBulkDelete,
    handleBulkConvertSuccess,
    onWorkflowAction,
    onSaveQuickEdit,
    onDuplicate,
    onDeleteAll,
    handleExport,
    handleImportCSV,
    handleStatClick,
  };
}
