import React, { useState, useRef } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import {
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { getImageUrl } from "../../utils/imageUrl";

// Sub-components
import ProductsHeader from "./components/ProductsHeader";
import ProductsStats from "./components/ProductsStats";
import ProductsBulkBar from "./components/ProductsBulkBar";
import ProductsFilters from "./components/ProductsFilters";
import ProductsPagination from "./components/ProductsPagination";
import ProductsTable from "./components/ProductsTable";
import ProductsEmptyState from "./components/ProductsEmptyState";

// Hooks & Types
import { useProducts } from "./hooks/useProducts";
import { getStockStatusColor, getStockStatusText, getStockStatus } from "./components/ProductsTypes";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  isPublishedWorkflow,
} from "./utils/workflow";

// ================================================
// Products Page - Main container
// ================================================

const Products: React.FC = () => {
  const {
    products,
    isLoading,
    error,
    isDeletingAll,
    duplicatingProductId,
    isAdmin,
    isMerchant,
    canSubmitProductReview,
    canCreateProducts,
    canSelectProducts,
    currentPage,
    itemsPerPage,
    totalItems,
    publishedCount,
    sortField,
    sortDirection,
    selectedProducts,
    selectAll,
    editingProduct,
    editPrice,
    editStock,
    editSku,
    filters,
    hasActiveFilters,
    categories,
    allTags,
    sortedProducts,
    totalPages,
    startIndex,
    paginatedProducts,
    setCurrentPage,
    setItemsPerPage,
    handleFilterChange,
    handleSort,
    handleSelectAll,
    handleSelectProduct,
    handleBulkVisibility,
    handleBulkDelete,
    clearSelection,
    resetFilters,
    startQuickEdit,
    cancelQuickEdit,
    setEditPrice,
    setEditStock,
    setEditSku,
    saveQuickEdit,
    handleDuplicate,
    workflowLoadingId,
    handleWorkflowAction,
    handleDelete,
    handleDeleteAll,
    loadProducts,
    prepareStorefrontContext,
    getStorefrontUrl
  } = useProducts();

  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onBulkVisibility = async (isHidden: boolean) => {
    try {
      const count = await handleBulkVisibility(isHidden);
      if (count) toast.success(`تم ${isHidden ? 'إخفاء' : 'إظهار'} ${count} منتج بنجاح`);
    } catch (err) {
      toast.error(`حدث خطأ أثناء ${isHidden ? 'الإخفاء' : 'الإظهار'}`);
    }
  };

  const onBulkDelete = async () => {
    try {
      const count = await handleBulkDelete();
      if (count) toast.success(`تم حذف ${count} منتج بنجاح`);
    } catch (err) {
      tToast.error("products.error_error_1879");
    }
  };

  const onWorkflowAction = async (
    product: any,
    action: "save_draft" | "submit_review" | "approve" | "reject" | "publish" | "unpublish",
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
        approve: "تم اعتماد المنتج",
        reject: "تم رفض المنتج",
        publish: "تم نشر المنتج",
        unpublish: "تم إلغاء نشر المنتج",
      };
      toast.success(messages[action] || "تم تحديث حالة المنتج");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "حدث خطأ أثناء تحديث الحالة");
    }
  };

  const onSaveQuickEdit = async (id: string) => {
    try {
      const success = await saveQuickEdit(id);
      if (success) tToast.success("products.success_update_fdb7");
      else tToast.error("products.failed_update_9e0f");
    } catch (err) {
      tToast.error("products.error_error_ea72");
    }
  };

  const onDuplicate = async (product: any) => {
    try {
      const success = await handleDuplicate(product);
      if (success) toast.success(`✅ تم نسخ المنتج "${product.name}" بنجاح`);
      else tToast.error("products.msg_70a7");
    } catch (err: any) {
      toast.error(`❌ ${err?.response?.data?.error || err?.response?.data?.message || "حدث خطأ غير متوقع"}`);
    }
  };

  const onDeleteAll = async () => {
    try {
      const result = await handleDeleteAll();
      if (result) {
        toast.success(`تم حذف ${result.deletedProductsCount || 0} منتج و ${result.deletedVariantsCount || 0} متغير بنجاح`);
      }
    } catch (err: any) {
      toast.error(err.message || i18n.t("Products.error_error_e01c"));
    }
  };

  const handleExport = async () => {
    // This logic is mostly API-bound, kept here for UI orchestration
    try {
      const { apiClient } = await import("../../services/apiClient");
      const r = await apiClient.get("products/export", { params: { format: "csv" }, responseType: "blob" });
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
        tToast.success("products.msg_bd2e");
      }
    } catch {
      tToast.error("products.msg_0437");
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { apiClient } = await import("../../services/apiClient");
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
      loadProducts();
      setShowImportModal(false);
      toast.success(`تم استيراد ${count} منتج بنجاح`);
    } catch (err) {
      tToast.error("products.error_error_7d31");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <ProductsHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAdmin={isAdmin}
        isMerchant={isMerchant}
        canCreateProducts={canCreateProducts}
        isDeletingAll={isDeletingAll}
        productsCount={products.length}
        isLoading={isLoading}
        onDeleteAll={onDeleteAll}
        onImportClick={() => setShowImportModal(true)}
        onExport={handleExport}
      />

      <ProductsStats
        products={products}
        totalItems={totalItems}
        publishedCount={publishedCount}
      />

      {canSelectProducts && (
        <ProductsBulkBar
          selectedCount={selectedProducts.size}
          onDelete={onBulkDelete}
          onClear={clearSelection}
          onHide={() => onBulkVisibility(true)}
          onUnhide={() => onBulkVisibility(false)}
        />
      )}

      <ProductsFilters
        filters={filters}
        categories={categories}
        allTags={allTags}
        showAdvancedFilters={showAdvancedFilters}
        onFilterChange={handleFilterChange}
        onToggleAdvancedFilters={() => setShowAdvancedFilters((v) => !v)}
        onResetAdvancedFilters={resetFilters}
      />

      {isLoading && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">جاري تحميل المنتجات...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <ProductsEmptyState isMerchant={isMerchant} />
      )}

      {!isLoading && !error && products.length > 0 && viewMode === "table" && (
        <ProductsTable
          products={paginatedProducts}
          selectedProducts={selectedProducts}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
          onSelectProduct={handleSelectProduct}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          formatPrice={formatPrice}
          formatDate={formatDate}
          getStorefrontUrl={getStorefrontUrl}
          prepareStorefrontContext={prepareStorefrontContext}
          editingProductId={editingProduct}
          editPrice={editPrice}
          editStock={editStock}
          editSku={editSku}
          onEditPriceChange={setEditPrice}
          onEditStockChange={setEditStock}
          onEditSkuChange={setEditSku}
          onSaveQuickEdit={onSaveQuickEdit}
          onCancelQuickEdit={cancelQuickEdit}
          onStartQuickEdit={startQuickEdit}
          onDuplicate={onDuplicate}
          duplicatingProductId={duplicatingProductId}
          workflowLoadingId={workflowLoadingId}
          onWorkflowAction={onWorkflowAction}
          canManageWorkflow={isAdmin}
          canSubmitReviewWorkflow={canSubmitProductReview}
          canSelectProducts={canSelectProducts}
          canDeleteProducts={isAdmin}
          onDelete={handleDelete}
        />
      )}

      {!isLoading && !error && products.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <div
                key={product.id}
                className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 ${canSelectProducts && selectedProducts.has(product.id) ? "ring-2 ring-indigo-500" : ""}`}
              >
                <div className="relative">
                  {canSelectProducts && (
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="absolute top-2 right-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded z-10"
                    />
                  )}
                  <a
                    href={getStorefrontUrl(product)}
                    onClick={prepareStorefrontContext}
                    className="block"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {product.mainImage || (product.images && product.images.length > 0) ? (
                      <img
                        src={getImageUrl(product.mainImage || product.images[0]) || ""}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <PhotoIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </a>
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex px-2 py-1 text-[11px] font-semibold rounded-full ${getWorkflowStatusColor(
                        product.workflow.status,
                      )}`}
                    >
                      {getWorkflowStatusLabel(product.workflow.status)}
                    </span>
                    {!isPublishedWorkflow(product.workflow) && (
                      <span className="rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                        Preview
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <a
                    href={`/products/${product.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-900 dark:text-white truncate block hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {product.name}
                  </a>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(product.price)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStockStatusColor(stockStatus)}`}>
                      {getStockStatusText(stockStatus)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && sortedProducts.length > 0 && (
        <ProductsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          hasActiveFilters={hasActiveFilters}
          sortedProductsLength={sortedProducts.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(count) => { setItemsPerPage(count); setCurrentPage(1); }}
        />
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">استيراد منتجات من CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
            />
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
