import { apiClient } from '../../services/api';

// ============================================================================
// Types & Contracts for Manufacturing Execution System (MES)
// ============================================================================

export type ProductionOrderStatus =
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'QC_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProductionStageType =
  | 'CUTTING'
  | 'PRINTING_EMBROIDERY'
  | 'SEWING'
  | 'FINISHING'
  | 'QC'
  | 'PACKAGING'
  | 'CUSTOM';

export type ProductionStageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type MaterialIssueStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';
export type FinishedGoodsReceiptStatus = 'DRAFT' | 'RECEIVED' | 'CANCELLED';

export interface BomComponentItem {
  id?: string;
  bomId?: string;
  rawMaterialId: string;
  rawMaterialName?: string | null;
  consumptionPerUnit: number;
  unit: string;
  appliesToSizes?: string[];
  appliesToColors?: string[];
  scrapRate: number;
  notes?: string | null;
}

export interface BomStandardStage {
  id?: string;
  bomId?: string;
  name: string;
  stageType: ProductionStageType;
  sequence: number;
  ratePerPiece: number;
  standardMinutes: number;
}

export interface BillOfMaterials {
  id: string;
  companyId: string;
  productId?: string | null;
  code: string;
  name: string;
  version: string;
  baseQuantity: number;
  wasteMarginPercent: number;
  laborCostPerUnit: number;
  overheadCostPerUnit: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  components?: BomComponentItem[];
  standardStages?: BomStandardStage[];
  _count?: {
    orders?: number;
    components?: number;
  };
}

export interface ProductionOrderVariantMatrix {
  id?: string;
  orderId?: string;
  size: string;
  color: string;
  sku?: string | null;
  plannedQuantity: number;
  producedQuantity: number;
  scrappedQuantity: number;
}

export interface ProductionStage {
  id: string;
  orderId: string;
  name: string;
  stageType: ProductionStageType;
  sequence: number;
  status: ProductionStageStatus;
  ratePerPiece: number;
  standardMinutes: number;
  actualMinutes: number;
  completedQuantity: number;
  stageLaborCost: number;
  assignedWorker?: string | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface MaterialIssueItem {
  id: string;
  issueId: string;
  rawMaterialId: string;
  rawMaterialName?: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  batchNumber?: string | null;
  notes?: string | null;
}

export interface MaterialIssue {
  id: string;
  companyId: string;
  orderId: string;
  issueNumber: string;
  sourceWarehouseId?: string | null;
  status: MaterialIssueStatus;
  date: string;
  totalCost: number;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  items?: MaterialIssueItem[];
}

export interface FinishedGoodsReceiptItem {
  id: string;
  receiptId: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  goodQuantity: number;
  scrapQuantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string | null;
}

export interface FinishedGoodsReceipt {
  id: string;
  companyId: string;
  orderId: string;
  receiptNumber: string;
  targetWarehouseId?: string | null;
  status: FinishedGoodsReceiptStatus;
  date: string;
  totalQuantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string | null;
  createdAt: string;
  items?: FinishedGoodsReceiptItem[];
}

export interface ScrapRecord {
  id: string;
  companyId: string;
  orderId: string;
  stageId?: string | null;
  materialId?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  isNormal: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface ProductionOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  bomId: string;
  productId?: string | null;
  plannedQuantity: number;
  producedQuantity: number;
  scrappedQuantity: number;
  status: ProductionOrderStatus;
  sourceWarehouseId?: string | null;
  targetWarehouseId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  totalCost: number;
  unitCost: number;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  bom?: BillOfMaterials;
  variants?: ProductionOrderVariantMatrix[];
  stages?: ProductionStage[];
  materialIssues?: MaterialIssue[];
  goodsReceipts?: FinishedGoodsReceipt[];
  scrapRecords?: ScrapRecord[];
  costWarnings?: Array<{ rawMaterialId: string; rawMaterialName?: string | null; warning: string }>;
  _count?: {
    materialIssues?: number;
    goodsReceipts?: number;
    scrapRecords?: number;
  };
}

export interface CostAnalysis {
  orderId: string;
  orderNumber: string;
  status: ProductionOrderStatus;
  plannedQuantity: number;
  producedQuantity: number;
  scrappedQuantity: number;
  standardCost: {
    materials: number;
    labor: number;
    overhead: number;
    total: number;
    unitCost: number;
  };
  actualCost: {
    materials: number;
    labor: number;
    overhead: number;
    total: number;
    unitCost: number;
  };
  variance: {
    totalVariance: number;
    unitVariance: number;
    isFavorable: boolean;
  };
}

export interface ManufacturingSettings {
  id?: string;
  companyId: string;
  defaultSourceWarehouseId?: string | null;
  defaultTargetWarehouseId?: string | null;
  defaultOverheadRatePerPiece: number;
  defaultWasteMarginPercent: number;
  wipAccountId?: string | null;
  rawMaterialsAccountId?: string | null;
  accruedWagesAccountId?: string | null;
  overheadAppliedAccountId?: string | null;
  finishedGoodsAccountId?: string | null;
  autoPostingEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantRequirementResolution {
  bomId: string;
  bomCode: string;
  totalPlannedQuantity: number;
  variantCount: number;
  aggregatedMaterials: Array<{
    rawMaterialId: string;
    rawMaterialName?: string | null;
    unit: string;
    baseConsumptionPerUnit: number;
    totalRequiredQuantity: number;
    breakdown: Array<{
      size: string;
      color: string;
      variantQuantity: number;
      componentUnits: number;
    }>;
  }>;
}

export interface WarehouseOption {
  id: string;
  name: string;
  type?: string;
  isDefault?: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  price?: number;
  cost?: number;
}

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  isPostable: boolean;
}

// ============================================================================
// API Service Methods
// ============================================================================

export const manufacturingApi = {
  // Settings
  getSettings: async (): Promise<ManufacturingSettings> => {
    const res = await apiClient.get('/manufacturing/settings');
    return res.data?.data;
  },
  updateSettings: async (data: Partial<ManufacturingSettings>): Promise<ManufacturingSettings> => {
    const res = await apiClient.put('/manufacturing/settings', data);
    return res.data?.data;
  },

  // Bill of Materials (BOM)
  listBoms: async (params?: { search?: string; isActive?: boolean | string; productId?: string }): Promise<BillOfMaterials[]> => {
    const res = await apiClient.get('/manufacturing/boms', { params });
    return res.data?.data || [];
  },
  getBomById: async (id: string): Promise<BillOfMaterials> => {
    const res = await apiClient.get(`/manufacturing/boms/${id}`);
    return res.data?.data;
  },
  createBom: async (data: Partial<BillOfMaterials>): Promise<BillOfMaterials> => {
    const res = await apiClient.post('/manufacturing/boms', data);
    return res.data?.data;
  },
  updateBom: async (id: string, data: Partial<BillOfMaterials>): Promise<BillOfMaterials> => {
    const res = await apiClient.put(`/manufacturing/boms/${id}`, data);
    return res.data?.data;
  },
  deleteBom: async (id: string): Promise<void> => {
    await apiClient.delete(`/manufacturing/boms/${id}`);
  },
  cloneBom: async (id: string, data: { newCode?: string; newVersion?: string; name?: string }): Promise<BillOfMaterials> => {
    const res = await apiClient.post(`/manufacturing/boms/${id}/clone`, data);
    return res.data?.data;
  },
  resolveVariantRequirements: async (
    bomId: string,
    variantMatrix: Array<{ size: string; color: string; plannedQuantity?: number; quantity?: number }>
  ): Promise<VariantRequirementResolution> => {
    const res = await apiClient.post(`/manufacturing/boms/${bomId}/resolve-variants`, { variantMatrix });
    return res.data?.data;
  },

  // Production Orders Lifecycle
  listOrders: async (params?: {
    status?: string | string[];
    search?: string;
    bomId?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ProductionOrder[]> => {
    const res = await apiClient.get('/manufacturing/orders', { params });
    return res.data?.data || [];
  },
  getOrderById: async (id: string): Promise<ProductionOrder> => {
    const res = await apiClient.get(`/manufacturing/orders/${id}`);
    return res.data?.data;
  },
  getOrderCostAnalysis: async (id: string): Promise<CostAnalysis> => {
    const res = await apiClient.get(`/manufacturing/orders/${id}/cost-analysis`);
    return res.data?.data;
  },
  createOrder: async (data: {
    bomId: string;
    productId?: string | null;
    orderNumber?: string;
    plannedQuantity?: number;
    sourceWarehouseId?: string | null;
    targetWarehouseId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    notes?: string | null;
    variantMatrix: Array<{ size: string; color: string; plannedQuantity: number; sku?: string }>;
    stages?: BomStandardStage[];
  }): Promise<ProductionOrder> => {
    const res = await apiClient.post('/manufacturing/orders', data);
    return res.data?.data;
  },
  releaseOrder: async (id: string): Promise<ProductionOrder> => {
    const res = await apiClient.post(`/manufacturing/orders/${id}/release`);
    return res.data?.data;
  },
  startOrder: async (
    id: string,
    data?: { autoIssue?: boolean; sourceWarehouseId?: string | null; notes?: string }
  ): Promise<{ data: ProductionOrder; costWarnings?: any[]; message?: string }> => {
    const res = await apiClient.post(`/manufacturing/orders/${id}/start`, data);
    return {
      data: res.data?.data,
      costWarnings: res.data?.costWarnings || res.data?.data?.costWarnings || [],
      message: res.data?.message,
    };
  },
  updateStageProgress: async (
    orderId: string,
    stageId: string,
    data: {
      completedQuantity?: number;
      scrapQuantity?: number;
      actualMinutes?: number;
      assignedWorker?: string;
      status?: ProductionStageStatus;
      notes?: string;
    }
  ): Promise<ProductionStage> => {
    const res = await apiClient.put(`/manufacturing/orders/${orderId}/stages/${stageId}`, data);
    return res.data?.data;
  },
  issueMaterials: async (
    orderId: string,
    data: {
      sourceWarehouseId?: string | null;
      items: Array<{
        rawMaterialId: string;
        rawMaterialName?: string | null;
        quantity: number;
        unit?: string;
        unitCost?: number;
        notes?: string;
      }>;
      notes?: string;
    }
  ): Promise<{ data: MaterialIssue; costWarnings?: any[]; message?: string }> => {
    const res = await apiClient.post(`/manufacturing/orders/${orderId}/issue-materials`, data);
    return {
      data: res.data?.data,
      costWarnings: res.data?.costWarnings || [],
      message: res.data?.message,
    };
  },
  receiveFinishedGoods: async (
    orderId: string,
    data: {
      targetWarehouseId?: string | null;
      items: Array<{
        size?: string;
        color?: string;
        sku?: string;
        goodQuantity: number;
        scrapQuantity?: number;
        unitCost?: number;
        notes?: string;
      }>;
      notes?: string;
    }
  ): Promise<FinishedGoodsReceipt> => {
    const res = await apiClient.post(`/manufacturing/orders/${orderId}/receive-goods`, data);
    return res.data?.data;
  },
  completeOrder: async (id: string): Promise<ProductionOrder> => {
    const res = await apiClient.post(`/manufacturing/orders/${id}/complete`);
    return res.data?.data;
  },
  cancelOrder: async (id: string, data: { reason: string }): Promise<ProductionOrder> => {
    const res = await apiClient.post(`/manufacturing/orders/${id}/cancel`, data);
    return res.data?.data;
  },
  recordScrap: async (
    orderId: string,
    data: {
      quantity: number;
      stageId?: string | null;
      materialId?: string | null;
      size?: string | null;
      color?: string | null;
      reason?: string;
      cost?: number;
      unit?: string;
      isNormal?: boolean;
      notes?: string;
    }
  ): Promise<ScrapRecord> => {
    const res = await apiClient.post(`/manufacturing/orders/${orderId}/scrap`, data);
    return res.data?.data;
  },

  // Auxiliary data lookups
  getWarehouses: async (): Promise<WarehouseOption[]> => {
    try {
      const res = await apiClient.get('/warehouses');
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return list.map((w: any) => ({
        id: String(w.id),
        name: w.name || 'مستودع بدون اسم',
        isDefault: Boolean(w.isDefault),
      }));
    } catch {
      return [];
    }
  },
  getProducts: async (params?: { search?: string }): Promise<ProductOption[]> => {
    try {
      const res = await apiClient.get('/products', { params });
      const list = Array.isArray(res.data?.data?.products)
        ? res.data.data.products
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.products)
        ? res.data.products
        : [];
      return list.map((p: any) => ({
        id: String(p.id),
        name: p.name || 'منتج غير مسمى',
        sku: p.sku || null,
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
      }));
    } catch {
      return [];
    }
  },
  getAccounts: async (): Promise<AccountOption[]> => {
    try {
      const res = await apiClient.get('/accounting/coa');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return list
        .filter((a: any) => a.isPostable)
        .map((a: any) => ({
          id: String(a.id),
          code: String(a.code),
          name: `${a.code} - ${a.name}`,
          type: a.type,
          isPostable: true,
        }));
    } catch {
      return [];
    }
  },
  getOrderJournalEntries: async (orderNumber: string): Promise<any[]> => {
    try {
      const res = await apiClient.get('/accounting/entries', {
        params: { search: orderNumber, limit: 20 },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return list.filter((e: any) => {
        const narr = String(e.narration || '');
        const srcType = String(e.sourceType || '');
        return narr.includes(orderNumber) || srcType.startsWith('MANUFACTURING_');
      });
    } catch {
      return [];
    }
  },
};
