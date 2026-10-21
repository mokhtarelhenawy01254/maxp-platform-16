export type ReorderView = "product" | "warehouse" | "preorder";

export type StockStatus = "low" | "out" | "safe" | "untracked";

export interface ReorderWarehouse {
  inventoryId: string;
  warehouseId: string;
  warehouseName: string;
  available: number;
  reserved: number;
  quantity: number;
  reorderPoint: number;
  minStock: number;
  batchNumber: string | null;
}

export interface ReorderItem {
  productId: string;
  inventoryId?: string;
  name: string;
  sku: string;
  image: string | null;
  categoryName: string;
  trackInventory: boolean;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderMessage: string | null;
  status: StockStatus;
  urgency?: string;
  available: number;
  reserved: number;
  quantity: number;
  reorderPoint: number;
  minStock: number;
  dailyAvgSales?: number;
  daysUntilStockout?: number;
  suggestedReorder?: number;
  warehouseName?: string;
  warehouses?: ReorderWarehouse[];
}

export interface ReorderResponse {
  success: boolean;
  data?: {
    items: ReorderItem[];
    pagination: { total: number; page: number; limit: number; pages: number };
    summary: ReorderSummary;
  };
  message?: string;
}

export interface ReorderSummary {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  preOrderCount: number;
  untrackedCount: number;
  safeCount: number;
  atRiskValue: number;
}

export const STATUS_META: Record<
  StockStatus,
  { label: string; className: string; dot: string }
> = {
  low: { label: "مخزون منخفض", className: "text-yellow-700 bg-yellow-100 border-yellow-200", dot: "bg-yellow-500" },
  out: { label: "نفد المخزون", className: "text-red-700 bg-red-100 border-red-200", dot: "bg-red-500" },
  safe: { label: "متوفر", className: "text-emerald-700 bg-emerald-100 border-emerald-200", dot: "bg-emerald-500" },
  untracked: { label: "بدون تتبع", className: "text-gray-600 bg-gray-100 border-gray-200", dot: "bg-gray-400" },
};
