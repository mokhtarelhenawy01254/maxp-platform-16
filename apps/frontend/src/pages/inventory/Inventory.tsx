import React, { useCallback, useMemo, useState, useEffect } from "react";
import i18n from "../../i18n";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useCurrency } from "../../hooks/useCurrency";
import {
  CubeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { companyAwareApi } from "../../services/companyAwareApi";
import CreateInventoryProductDialog from "./components/CreateInventoryProductDialog";
import { useAuth } from "../../hooks/useAuthSimple";

interface InventoryItem {
  id: string; // Internal inventory ID
  productId: string;
  productName: string;
  sku: string;
  price: number;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  available: number;
  reserved: number;
  reorderPoint?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  updatedAt: string;
  canEditStock?: boolean;
  stockLocation?: "COMPANY" | "COMPANY_WAREHOUSE" | "MERCHANT";
  stockLocationLabel?: string;
}

interface StockAlert {
  id: string;
  type: "low_stock" | "out_of_stock";
  priority: "critical" | "high" | "medium" | "low";
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  message: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity?: number;
  createdAt: string;
  isRead: boolean;
}

type StockMovementType =
  | "IN"
  | "OUT"
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

type StockMovementReason =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "RETURN";

interface StockUpdateState {
  productId: string;
  warehouseId: string;
  quantity: number;
  type: StockMovementType;
  reason: StockMovementReason;
  reference: string;
  notes: string;
  batchNumber: string;
  expiryDate: string;
  isApproved: boolean;
}

interface InventoryApiItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  available: number;
  reserved: number;
  reorderPoint?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  updatedAt: string;
  products?: {
    name?: string;
    sku?: string;
    price?: number;
  };
  warehouses?: {
    name?: string;
  };
  canEditStock?: boolean;
  stockLocation?: "COMPANY" | "COMPANY_WAREHOUSE" | "MERCHANT";
  stockLocationLabel?: string;
}

interface InventoryListResponse {
  success?: boolean;
  data?: InventoryApiItem[];
  message?: string;
}

interface WarehousesResponse {
  success?: boolean;
  data?: { id: string; name: string }[];
}

interface AlertsResponse {
  success?: boolean;
  data?: {
    lowStock?: Array<Partial<StockAlert>>;
    outOfStock?: Array<Partial<StockAlert>>;
  };
}

interface StockMutationResponse {
  success?: boolean;
  message?: string;
}

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

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    [],
  );
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

  const [transferData, setTransferData] = useState({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: 0,
    notes: "",
    batchNumber: "",
  });
  const isMerchant = user?.role === "MERCHANT";

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
        // Flatten alerts if needed, or handle based on backend structure
        const { lowStock = [], outOfStock = [] } = response.data.data || {};
        const allAlerts = [
          ...lowStock.map((item) => ({
            ...item,
            type: "low_stock",
            priority: "high",
            message: "مخزون منخفض",
          })),
          ...outOfStock.map((item) => ({
            ...item,
            type: "out_of_stock",
            priority: "critical",
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

  const handleInventoryProductCreated = async (product: { id: string; name?: string }) => {
    await fetchInventory();
    await fetchAlerts();
    toast.success(`تم إضافة "${product.name || "المنتج"}" وإرساله للمراجعة بنجاح`);
  };

  const downloadCSV = () => {
    const headers = [
      "Product",
      "SKU",
      "Warehouse",
      "Batch",
      "Quantity",
      "Available",
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

  const getStockStatus = (item: InventoryItem) => {
    if (item.available === 0) {
      return { status: "نفد المخزون", color: "text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300", dot: "bg-rose-500" };
    }

    if (item.available <= (item.reorderPoint || 0)) {
      return { status: "مخزون منخفض", color: "text-amber-700 bg-amber-50 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300", dot: "bg-amber-500" };
    }

    return { status: "متوفر", color: "text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300", dot: "bg-emerald-500" };
  };

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getInventoryStats = () => {
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
  };

  const stats = getInventoryStats();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            {isMerchant ? "مخزوني" : "إدارة المخزون"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {isMerchant
              ? "متابعة المنتجات المسندة لك والأرصدة المتاحة في مخازنك أو مخازن الشركة"
              : "متابعة وإدارة مستويات المخزون والتنبيهات لجميع منتجات الشركة"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all"
          >
            تصدير CSV
          </button>
          <button
            onClick={() => setShowCreateProductModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-2xs active:scale-[0.98] transition-all"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            إضافة منتج للمخزن
          </button>
          {canEditAnyStock && (
            <button
              onClick={() => {
                setStockUpdate((previous) => ({
                  ...previous,
                  warehouseId: previous.warehouseId || warehouses[0]?.id || "",
                }));
                setShowStockUpdateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              تحديث المخزون
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>إجمالي المنتجات</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {stats.totalItems.toLocaleString()}
            </div>
          </div>
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>إجمالي قيمة المخزون</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {formatPrice(stats.totalValue)}
            </div>
          </div>
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>مخزون منخفض</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.lowStockCount}
            </div>
          </div>
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>نفد من المخزون</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {stats.outOfStockCount}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            تنبيهات المخزون ({alerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertPriorityColor(alert.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium dark:text-gray-100">
                      {alert.productName}
                    </h3>
                    <p className="text-sm mt-1 dark:text-gray-300">
                      {alert.message}
                    </p>
                    <p className="text-xs mt-2 dark:text-gray-400">
                      المخزون الحالي: {alert.currentStock} | نقطة الطلب:{" "}
                      {alert.reorderPoint}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-white/50 dark:bg-black/20">
                    {alert.priority === "critical"
                      ? "حرج"
                      : alert.priority === "high"
                        ? "عالي"
                        : alert.priority === "medium"
                          ? "متوسط"
                          : "منخفض"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              بحث عن منتج
            </label>
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو الـ SKU..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              المستودع
            </label>
            <select
              value={filters.warehouseId}
              onChange={(e) =>
                setFilters({ ...filters, warehouseId: e.target.value })
              }
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer transition-all"
            >
              <option value="">جميع المستودعات</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  warehouseId: "",
                  lowStock: false,
                  outOfStock: false,
                })
              }
              className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg active:scale-[0.98] transition-all"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) =>
                setFilters({ ...filters, lowStock: e.target.checked })
              }
              className="rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500 dark:bg-gray-700"
            />
            <span>مخزون منخفض فقط</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={filters.outOfStock}
              onChange={(e) =>
                setFilters({ ...filters, outOfStock: e.target.checked })
              }
              className="rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500 dark:bg-gray-700"
            />
            <span>نفد المخزون فقط</span>
          </label>
        </div>
      </div>

      {/* Inventory Mobile Cards & Desktop Table */}
      <div className="bg-white dark:bg-gray-900 shadow-2xs rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-800">
        {/* Mobile View (< sm:) */}
        <div className="block sm:hidden divide-y divide-gray-100 dark:divide-gray-700/60 p-3 space-y-3">
          {inventory.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800/90 rounded-xl p-3.5 border border-gray-200/80 dark:border-gray-700/60 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.sku && <span dir="ltr" className="font-mono text-[11px]">{item.sku}</span>}
                      <span>•</span>
                      <span>{item.warehouseName}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${stockStatus.color}`}
                  >
                    {stockStatus.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/40 p-2.5 rounded-lg text-center">
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">الإجمالي</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">المتاح</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.available}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">التكلفة</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(item.price)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-gray-400 dark:text-gray-500 text-[11px]">
                    {item.batchNumber ? `دفعة: ${item.batchNumber}` : "بدون دفعة"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowItemModal(true);
                      }}
                      className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      title="تفاصيل"
                    >
                      <EyeIcon className="h-4.5 w-4.5" />
                    </button>
                    {item.canEditStock !== false && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferData({
                              ...transferData,
                              productId: item.productId,
                              fromWarehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || "",
                            });
                            setShowTransferModal(true);
                          }}
                          className="p-1.5 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                          title="نقل"
                        >
                          <ArrowPathIcon className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStockUpdate({
                              ...stockUpdate,
                              productId: item.productId,
                              warehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || "",
                              type: "IN",
                              reason: "PURCHASE",
                            });
                            setShowStockUpdateModal(true);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          title="توريد"
                        >
                          <PlusIcon className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStockUpdate({
                              ...stockUpdate,
                              productId: item.productId,
                              warehouseId: item.warehouseId,
                              batchNumber: item.batchNumber || "",
                              type: "OUT",
                              reason: "SALE",
                            });
                            setShowStockUpdateModal(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          title="صرف"
                        >
                          <MinusIcon className="h-4.5 w-4.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (sm: and above) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المنتج / SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المستودع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الدفعة / الصلاحية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الكمية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المتاح
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  التكلفة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/60 dark:bg-gray-800/60 divide-y divide-gray-200 dark:divide-gray-700">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800/80 last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">
                        {item.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                      <div>{item.warehouseName}</div>
                      {item.stockLocationLabel && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          {item.stockLocationLabel}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                      <div>{item.batchNumber || "---"}</div>
                      {item.expiryDate && (
                        <div className="text-[10px] text-rose-500">
                          {formatDate(item.expiryDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white font-mono tabular-nums font-bold">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-semibold">
                      {item.available}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${stockStatus.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${stockStatus.dot}`} />
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white font-mono tabular-nums font-semibold">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {item.canEditStock !== false && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setTransferData({
                                  ...transferData,
                                  productId: item.productId,
                                  fromWarehouseId: item.warehouseId,
                                  batchNumber: item.batchNumber || "",
                                });
                                setShowTransferModal(true);
                              }}
                              className="p-1.5 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="نقل مخزن"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStockUpdate({
                                  ...stockUpdate,
                                  productId: item.productId,
                                  warehouseId: item.warehouseId,
                                  batchNumber: item.batchNumber || "",
                                  type: "IN",
                                  reason: "PURCHASE",
                                });
                                setShowStockUpdateModal(true);
                              }}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="توريد"
                            >
                              <PlusIcon className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStockUpdate({
                                  ...stockUpdate,
                                  productId: item.productId,
                                  warehouseId: item.warehouseId,
                                  batchNumber: item.batchNumber || "",
                                  type: "OUT",
                                  reason: "SALE",
                                });
                                setShowStockUpdateModal(true);
                              }}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="صرف"
                            >
                              <MinusIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-16">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
              لا توجد بيانات مخزون حالياً
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ابدأ بإضافة منتجاتك أو سجل كميات المخزون المتاحة.
            </p>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                تفاصيل المخزون - {selectedItem.productName}
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  معلومات المنتج
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl space-y-1.5 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-white">اسم المنتج:</strong> {selectedItem.productName}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-white">SKU:</strong> <span dir="ltr" className="font-mono">{selectedItem.sku || "—"}</span>
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-white">السعر:</strong> {formatPrice(selectedItem.price)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  حالة المخزون
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1.5 text-gray-700 dark:text-gray-300">
                      <p>
                        <strong className="text-gray-900 dark:text-white">المستودع:</strong> {selectedItem.warehouseName}
                      </p>
                      <p>
                        <strong className="text-gray-900 dark:text-white">رقم الدفعة:</strong> {selectedItem.batchNumber || "بدون"}
                      </p>
                      <p>
                        <strong className="text-gray-900 dark:text-white">تاريخ الصلاحية:</strong>{" "}
                        {selectedItem.expiryDate ? formatDate(selectedItem.expiryDate) : "---"}
                      </p>
                    </div>
                    <div className="space-y-1.5 text-gray-700 dark:text-gray-300">
                      <p>
                        <strong className="text-gray-900 dark:text-white">الكمية الإجمالية:</strong> {selectedItem.quantity}
                      </p>
                      <p>
                        <strong className="text-gray-900 dark:text-white">المتاح للبيع:</strong> {selectedItem.available}
                      </p>
                      <p>
                        <strong className="text-gray-900 dark:text-white">المحجوز:</strong> {selectedItem.reserved}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateInventoryProductDialog
        open={showCreateProductModal}
        warehouses={warehouses}
        defaultWarehouseId={filters.warehouseId || warehouses[0]?.id || ""}
        onClose={() => setShowCreateProductModal(false)}
        onCreated={handleInventoryProductCreated}
      />

      {/* Stock Update Modal */}
      {showStockUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                تحديث المخزون
              </h3>
              <button
                type="button"
                onClick={() => setShowStockUpdateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المنتج *
                </label>
                <select
                  value={stockUpdate.productId}
                  onChange={(e) =>
                    setStockUpdate({
                      ...stockUpdate,
                      productId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">اختر المنتج</option>
                  {inventoryProductOptions.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    المستودع *
                  </label>
                  <select
                    value={stockUpdate.warehouseId}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        warehouseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={warehouses.length === 0}
                  >
                    {warehouses.length === 0 ? (
                      <option value="">لا توجد مخازن متاحة</option>
                    ) : (
                      warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    نوع الحركة
                  </label>
                  <select
                    value={stockUpdate.type}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        type: e.target.value as StockMovementType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="IN">إدخال (توريد)</option>
                    <option value="OUT">إخراج (صرف)</option>
                    <option value="ADJUSTMENT_IN">تعديل إضافة</option>
                    <option value="ADJUSTMENT_OUT">تعديل سحب</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الكمية *
                  </label>
                  <input
                    type="number"
                    value={stockUpdate.quantity}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    السبب
                  </label>
                  <select
                    value={stockUpdate.reason}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        reason: e.target.value as StockMovementReason,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PURCHASE">شراء</option>
                    <option value="SALE">بيع</option>
                    <option value="ADJUSTMENT">تعديل</option>
                    <option value="DAMAGE">تلف</option>
                    <option value="RETURN">مرتجع</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    رقم الدفعة (Batch)
                  </label>
                  <input
                    type="text"
                    value={stockUpdate.batchNumber}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        batchNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="رقم الدفعة أو Lot"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ الصلاحية
                  </label>
                  <input
                    type="date"
                    value={stockUpdate.expiryDate}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center cursor-pointer bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  <input
                    type="checkbox"
                    checked={!stockUpdate.isApproved}
                    onChange={(e) =>
                      setStockUpdate({
                        ...stockUpdate,
                        isApproved: !e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
                  />
                  <span className="mr-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                    يتطلب موافقة المدير (حفظ كمسودة)
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المرجع
                </label>
                <input
                  type="text"
                  value={stockUpdate.reference}
                  onChange={(e) =>
                    setStockUpdate({
                      ...stockUpdate,
                      reference: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="رقم الطلب أو إذن الاستلام"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={stockUpdate.notes}
                  onChange={(e) =>
                    setStockUpdate({ ...stockUpdate, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowStockUpdateModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={updateStock}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all"
              >
                تحديث المخزون
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                نقل مخزون بين المستودعات
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                سيتم نقل الكمية المحددة من مستودع المصدر إلى مستودع الوجهة بشكل مباشر.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    من مستودع
                  </label>
                  <input
                    type="text"
                    value={
                      inventory.find(
                        (i) => i.warehouseId === transferData.fromWarehouseId,
                      )?.warehouseName || ""
                    }
                    disabled
                    className="w-full px-3 py-2 text-sm border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    إلى مستودع *
                  </label>
                  <select
                    value={transferData.toWarehouseId}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        toWarehouseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">اختر الوجهة</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الكمية *
                  </label>
                  <input
                    type="number"
                    value={transferData.quantity}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    max={
                      inventory.find(
                        (i) =>
                          i.productId === transferData.productId &&
                          i.warehouseId === transferData.fromWarehouseId,
                      )?.available || 0
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الدفعة (Batch)
                  </label>
                  <input
                    type="text"
                    value={transferData.batchNumber}
                    disabled
                    className="w-full px-3 py-2 text-sm border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات التحويل
                </label>
                <textarea
                  value={transferData.notes}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="ملاحظات التحويل..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={transferStock}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm transition-all"
              >
                بدء النقل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
