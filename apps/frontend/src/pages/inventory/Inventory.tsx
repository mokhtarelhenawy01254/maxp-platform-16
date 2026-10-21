import React from "react";
import CreateInventoryProductDialog from "./components/CreateInventoryProductDialog";
import { useInventoryController } from "./components/main/useInventoryController";
import { InventoryHeader } from "./components/main/InventoryHeader";
import { InventoryTelemetryCards } from "./components/main/InventoryTelemetryCards";
import { InventoryStockAlertsBanner } from "./components/main/InventoryStockAlertsBanner";
import { InventoryFilterPanel } from "./components/main/InventoryFilterPanel";
import { InventoryItemsTable } from "./components/main/InventoryItemsTable";
import { ItemDetailsModal } from "./components/main/ItemDetailsModal";
import { StockUpdateModal } from "./components/main/StockUpdateModal";
import { StockTransferModal } from "./components/main/StockTransferModal";
import type { InventoryItem } from "./components/main/types";

export const Inventory: React.FC = () => {
  const {
    inventory,
    alerts,
    loading,
    warehouses,
    filters,
    setFilters,
    stockUpdate,
    setStockUpdate,
    transferData,
    setTransferData,
    selectedItem,
    setSelectedItem,
    showItemModal,
    setShowItemModal,
    showCreateProductModal,
    setShowCreateProductModal,
    showStockUpdateModal,
    setShowStockUpdateModal,
    showTransferModal,
    setShowTransferModal,
    isMerchant,
    stats,
    inventoryProductOptions,
    canEditAnyStock,
    fetchInventory,
    updateStock,
    transferStock,
    downloadCSV,
    handleInventoryProductCreated,
  } = useInventoryController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const handleOpenTransfer = (item: InventoryItem) => {
    setTransferData((prev) => ({
      ...prev,
      productId: item.productId,
      fromWarehouseId: item.warehouseId,
      batchNumber: item.batchNumber || "",
    }));
    setShowTransferModal(true);
  };

  const handleOpenSupply = (item: InventoryItem) => {
    setStockUpdate((prev) => ({
      ...prev,
      productId: item.productId,
      warehouseId: item.warehouseId,
      batchNumber: item.batchNumber || "",
      type: "IN",
      reason: "PURCHASE",
    }));
    setShowStockUpdateModal(true);
  };

  const handleOpenDispense = (item: InventoryItem) => {
    setStockUpdate((prev) => ({
      ...prev,
      productId: item.productId,
      warehouseId: item.warehouseId,
      batchNumber: item.batchNumber || "",
      type: "OUT",
      reason: "SALE",
    }));
    setShowStockUpdateModal(true);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <InventoryHeader
        isMerchant={isMerchant}
        canEditAnyStock={canEditAnyStock}
        onDownloadCsv={downloadCSV}
        onCreateProduct={() => setShowCreateProductModal(true)}
        onOpenStockUpdate={() => {
          setStockUpdate((prev) => ({
            ...prev,
            warehouseId: prev.warehouseId || warehouses[0]?.id || "",
          }));
          setShowStockUpdateModal(true);
        }}
      />

      {/* Telemetry Strip - Linear Single Chassis */}
      <InventoryTelemetryCards
        totalItems={stats.totalItems}
        totalValue={stats.totalValue}
        lowStockCount={stats.lowStockCount}
        outOfStockCount={stats.outOfStockCount}
      />

      {/* Stock Alerts */}
      <InventoryStockAlertsBanner alerts={alerts} />

      {/* Filters */}
      <InventoryFilterPanel
        filters={filters}
        warehouses={warehouses}
        onFilterChange={setFilters}
        onResetFilters={() =>
          setFilters({
            warehouseId: "",
            lowStock: false,
            outOfStock: false,
          })
        }
      />

      {/* Inventory Mobile Cards & Desktop Table */}
      <InventoryItemsTable
        inventory={inventory}
        onViewDetails={(item) => {
          setSelectedItem(item);
          setShowItemModal(true);
        }}
        onOpenTransfer={handleOpenTransfer}
        onOpenSupply={handleOpenSupply}
        onOpenDispense={handleOpenDispense}
      />

      {/* Item Details Modal */}
      <ItemDetailsModal
        item={selectedItem}
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
      />

      {/* Create Product Dialog */}
      <CreateInventoryProductDialog
        open={showCreateProductModal}
        warehouses={warehouses}
        defaultWarehouseId={filters.warehouseId || warehouses[0]?.id || ""}
        onClose={() => setShowCreateProductModal(false)}
        onCreated={handleInventoryProductCreated}
      />

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={showStockUpdateModal}
        onClose={() => setShowStockUpdateModal(false)}
        stockUpdate={stockUpdate}
        onStockUpdateChange={setStockUpdate}
        onSubmit={updateStock}
        inventoryProductOptions={inventoryProductOptions}
        warehouses={warehouses}
      />

      {/* Transfer Modal */}
      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        transferData={transferData}
        onTransferDataChange={setTransferData}
        onSubmit={transferStock}
        inventory={inventory}
        warehouses={warehouses}
      />
    </div>
  );
};

export default Inventory;
