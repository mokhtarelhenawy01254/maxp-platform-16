import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { useAuth } from "../../../../hooks/useAuthSimple";
import type {
  InventoryItem,
  StockAlert,
  StockUpdateState,
  TransferDataState,
  InventoryListResponse,
  WarehousesResponse,
  AlertsResponse,
  StockMutationResponse,
} from "./types";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};

export function useInventoryController() {
  const { user } = useAuth();
  const isMerchant = user?.role === "MERCHANT";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [filters, setFilters] = useState({
    warehouseId: "",
    lowStock: false,
    outOfStock: false,
  });

  const [stockUpdate, setStockUpdate] = useState<StockUpdateState>({
    productId: "",
    warehouseId: "",
    quantity: 0,
    type: "IN",
    reason: "PURCHASE",
    reference: "",
    notes: "",
    batchNumber: "",
    expiryDate: "",
    isApproved: true,
  });

  const [transferData, setTransferData] = useState<TransferDataState>({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: 0,
    notes: "",
    batchNumber: "",
  });

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await companyAwareApi.get<WarehousesResponse>("/warehouses");
      if (response.data.success) {
        const nextWarehouses = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setWarehouses(nextWarehouses);
        setStockUpdate((previous) =>
          previous.warehouseId || nextWarehouses.length === 0
            ? previous
            : { ...previous, warehouseId: nextWarehouses[0].id },
        );
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;
      if (filters.lowStock) params.lowStock = "true";
      if (filters.outOfStock) params.outOfStock = "true";

      const response = await companyAwareApi.get<InventoryListResponse>(
        "/inventory",
        { params },
      );
      if (response.data.success) {
        const rawData = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        const items: InventoryItem[] = rawData.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.products?.name || "منتج بدون اسم",
          sku: item.products?.sku || "",
          price: Number(item.products?.price || 0),
          cost:
            item.cost !== undefined && item.cost !== null
              ? Number(item.cost)
              : item.products?.cost !== undefined && item.products?.cost !== null
              ? Number(item.products.cost)
              : null,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouses?.name || "---",
          quantity: item.quantity,
          available: item.available,
          reserved: item.reserved,
          reorderPoint: item.reorderPoint,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          updatedAt: item.updatedAt,
          canEditStock: item.canEditStock !== false,
          stockLocation: item.stockLocation,
          stockLocationLabel: item.stockLocationLabel,
        }));
        setInventory(items);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await companyAwareApi.get<AlertsResponse>("/inventory/alerts");
      if (response.data.success) {
        const { lowStock = [], outOfStock = [] } = response.data.data || {};
        const allAlerts = [
          ...lowStock.map((item) => ({
            ...item,
            type: "low_stock" as const,
            priority: "high" as const,
            message: "مخزون منخفض",
          })),
          ...outOfStock.map((item) => ({
            ...item,
            type: "out_of_stock" as const,
            priority: "critical" as const,
            message: "نفد المخزون",
          })),
        ] as StockAlert[];
        setAlerts(allAlerts);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
    fetchWarehouses();
  }, [fetchAlerts, fetchInventory, fetchWarehouses]);

  const updateStock = async () => {
    try {
      if (
        !stockUpdate.productId ||
        !stockUpdate.warehouseId ||
        stockUpdate.quantity <= 0
      ) {
        toast.error("يرجى اختيار المنتج والمستودع وتحديد كمية صالحة");
        return;
      }
      const response = await companyAwareApi.post<StockMutationResponse>(
        "/inventory/update-stock",
        stockUpdate as unknown as Record<string, unknown>,
      );

      if (response.data.success) {
        fetchInventory();
        fetchAlerts();
        setShowStockUpdateModal(false);
        setStockUpdate({
          productId: "",
          warehouseId: "",
          quantity: 0,
          type: "IN",
          reason: "PURCHASE",
          reference: "",
          notes: "",
          batchNumber: "",
          expiryDate: "",
          isApproved: true,
        });
        toast.success(response.data.message || "تم تحديث المخزون بنجاح");
      } else {
        toast.error(response.data.message || "فشل تحديث المخزون");
      }
    } catch (error: unknown) {
      console.error("Error updating stock:", error);
      toast.error(getErrorMessage(error, "فشل تحديث المخزون"));
    }
  };

  const transferStock = async () => {
    try {
      if (
        !transferData.fromWarehouseId ||
        !transferData.toWarehouseId ||
        transferData.quantity <= 0
      ) {
        toast.error("يرجى اختيار مستودع المصدر ومستودع الوجهة وتحديد كمية صالحة");
        return;
      }
      const response = await companyAwareApi.post<StockMutationResponse>(
        "/inventory/transfer",
        transferData,
      );
      if (response.data.success) {
        fetchInventory();
        setShowTransferModal(false);
        setTransferData({
          productId: "",
          fromWarehouseId: "",
          toWarehouseId: "",
          quantity: 0,
          notes: "",
          batchNumber: "",
        });
        toast.success("تم تحويل المخزون بنجاح");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "فشل تحويل المخزون"));
    }
  };

  const handleInventoryProductCreated = async () => {
    setShowCreateProductModal(false);
    await fetchInventory();
    await fetchAlerts();
  };

  const downloadCSV = () => {
    const headers = [
      "Product",
      "SKU",
      "Warehouse",
      "Batch",
      "Quantity",
      "Available",
      "Price",
      "Cost",
      "Expiry",
    ];
    const rows = inventory.map((item) => [
      item.productName,
      item.sku,
      item.warehouseName,
      item.batchNumber || "",
      item.quantity,
      item.available,
      item.price,
      item.cost || "",
      item.expiryDate || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventory_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف المخزون بنجاح");
  };

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce(
      (acc, item) => acc + item.available * item.price,
      0,
    );
    const lowStockCount = inventory.filter(
      (item) =>
        item.available > 0 && item.available <= (item.reorderPoint || 0),
    ).length;
    const outOfStockCount = inventory.filter(
      (item) => item.available === 0,
    ).length;

    return { totalItems, totalValue, lowStockCount, outOfStockCount };
  }, [inventory]);

  const inventoryProductOptions = useMemo(() => {
    const uniqueProducts = new Map<string, InventoryItem>();

    inventory.forEach((item) => {
      if (!uniqueProducts.has(item.productId)) {
        uniqueProducts.set(item.productId, item);
      }
    });

    return [...uniqueProducts.values()];
  }, [inventory]);

  const canEditAnyStock = !isMerchant || inventory.some((item) => item.canEditStock !== false);

  return {
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
    fetchAlerts,
    fetchWarehouses,
    updateStock,
    transferStock,
    downloadCSV,
    handleInventoryProductCreated,
  };
}
