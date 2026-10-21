import React from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";

// Sub-components
import ProductsHeader from "./components/ProductsHeader";
import ProductsStats from "./components/ProductsStats";
import ProductsBulkBar from "./components/ProductsBulkBar";
import ProductsFilters from "./components/ProductsFilters";
import ProductsPagination from "./components/ProductsPagination";
import ProductsTable from "./components/ProductsTable";
import ProductsEmptyState from "./components/ProductsEmptyState";
import { BulkConvertModal } from "./components/BulkConvertModal";
import ProductMobileCard from "./components/ProductMobileCard";
import { QuickAddProductModal } from "./components/QuickAddProductModal";
import { ProductsGrid } from "./components/ProductsGrid";
import { ProductsImportCSVModal } from "./components/ProductsImportCSVModal";

// Page Controller Hook
import { useProductsPageController } from "./hooks/useProductsPageController";

// ================================================
// Products Page - Main container
// ================================================

export const Products: React.FC = () => {
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
    offersCount,
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
    clearSelection,
    resetFilters,
    startQuickEdit,
    cancelQuickEdit,
    setEditPrice,
    setEditStock,
    setEditSku,
    workflowLoadingId,
    handleDelete,
    loadProducts,
    prepareStorefrontContext,
    getStorefrontUrl,
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
  } = useProductsPageController();

  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  return (
    <div className="space-y-3 sm:space-y-5 font-sans" dir="rtl">
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
        onQuickAddClick={() => setShowQuickAddModal(true)}
      />

      <ProductsStats
        products={products}
        totalItems={totalItems}
        publishedCount={publishedCount}
        activeStockFilter={filters.stockFilter}
        activeStatusFilter={filters.statusFilter}
        onStatClick={handleStatClick}
      />

      {canSelectProducts && (
        <ProductsBulkBar
          selectedCount={selectedProducts.size}
          onDelete={onBulkDelete}
          onClear={clearSelection}
          onHide={() => onBulkVisibility(true)}
          onUnhide={() => onBulkVisibility(false)}
          onConvertToPresentations={() => setShowBulkConvertModal(true)}
          onEnableTrack={() => onBulkTrackInventory(true)}
          onDisableTrack={() => onBulkTrackInventory(false)}
        />
      )}

      <ProductsFilters
        filters={filters}
        categories={categories}
        allTags={allTags}
        offersCount={offersCount}
        showAdvancedFilters={showAdvancedFilters}
        onFilterChange={handleFilterChange}
        onToggleAdvancedFilters={() => setShowAdvancedFilters((v) => !v)}
        onResetAdvancedFilters={resetFilters}
      />

      {isLoading && (
        <div className="bg-card rounded-xl shadow-xs border border-border/70 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-muted-foreground text-xs font-medium">جاري تحميل المنتجات...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-600">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <ProductsEmptyState
          isMerchant={isMerchant}
          onQuickAddClick={() => setShowQuickAddModal(true)}
        />
      )}

      {!isLoading && !error && products.length > 0 && viewMode === "table" && (
        <>
          {/* Mobile Card List (< sm:) */}
          <div className="block sm:hidden space-y-3">
            {paginatedProducts.map((product) => (
              <ProductMobileCard
                key={product.id}
                product={product}
                selected={selectedProducts.has(product.id)}
                onSelect={handleSelectProduct}
                canSelect={canSelectProducts}
                formatPrice={formatPrice}
                formatDate={formatDate}
                getStorefrontUrl={getStorefrontUrl}
                prepareStorefrontContext={prepareStorefrontContext}
                isEditing={editingProduct === product.id}
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
                canDelete={isAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Desktop & Tablet Table (sm: and above) */}
          <div className="hidden sm:block">
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
          </div>
        </>
      )}

      {!isLoading && !error && products.length > 0 && viewMode === "grid" && (
        <ProductsGrid
          products={paginatedProducts}
          canSelectProducts={canSelectProducts}
          selectedProducts={selectedProducts}
          onSelectProduct={handleSelectProduct}
          getStorefrontUrl={getStorefrontUrl}
          prepareStorefrontContext={prepareStorefrontContext}
          formatPrice={formatPrice}
        />
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
          onItemsPerPageChange={(count) => {
            setItemsPerPage(count);
            setCurrentPage(1);
          }}
        />
      )}

      <ProductsImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportCSV={handleImportCSV}
        fileInputRef={fileInputRef}
        isEn={isEn}
      />

      {showBulkConvertModal && bulkConvertSourceIds.length > 0 && (
        <BulkConvertModal
          open={showBulkConvertModal}
          sourceProductIds={bulkConvertSourceIds}
          sourceProducts={bulkConvertSourceProducts}
          onClose={() => setShowBulkConvertModal(false)}
          onSuccess={handleBulkConvertSuccess}
        />
      )}

      {showQuickAddModal && (
        <QuickAddProductModal
          open={showQuickAddModal}
          onClose={() => setShowQuickAddModal(false)}
          onSuccess={() => loadProducts()}
        />
      )}
    </div>
  );
};

export default Products;
