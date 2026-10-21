export interface EasyOrdersProduct {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
  weight?: number;
  dimensions?: unknown;
  easyOrdersId?: string;
  easyOrdersUrl?: string;
}

export interface EasyOrdersSyncLog {
  id: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  totalItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errorMessage?: string;
}

export interface EasyOrdersSettings {
  hasApiKey?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed" | string;
  syncEnabled?: boolean;
}
