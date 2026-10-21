export interface InventoryItem {
  id: string; // Internal inventory ID
  productId: string;
  productName: string;
  sku: string;
  price: number;
  cost?: number | null;
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

export interface StockAlert {
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

export type StockMovementType =
  | "IN"
  | "OUT"
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export type StockMovementReason =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "RETURN";

export interface StockUpdateState {
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

export interface TransferDataState {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  notes: string;
  batchNumber: string;
}

export interface InventoryApiItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  available: number;
  reserved: number;
  cost?: number | null;
  reorderPoint?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  updatedAt: string;
  products?: {
    name?: string;
    sku?: string;
    price?: number;
    cost?: number | null;
  };
  warehouses?: {
    name?: string;
  };
  canEditStock?: boolean;
  stockLocation?: "COMPANY" | "COMPANY_WAREHOUSE" | "MERCHANT";
  stockLocationLabel?: string;
}

export interface InventoryListResponse {
  success?: boolean;
  data?: InventoryApiItem[];
  message?: string;
}

export interface WarehousesResponse {
  success?: boolean;
  data?: { id: string; name: string }[];
}

export interface AlertsResponse {
  success?: boolean;
  data?: {
    lowStock?: Array<Partial<StockAlert>>;
    outOfStock?: Array<Partial<StockAlert>>;
  };
}

export interface StockMutationResponse {
  success?: boolean;
  message?: string;
}
