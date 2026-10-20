import { apiClient } from '../../services/api';

// ============================================================================
// Types & Contracts for Manufacturing Execution System (MES)
// ============================================================================

// ============================================================================
// Wave 4: Technical Product Specification (Tech Pack) & Multi-Source Size Charts
// ============================================================================

export type TechPackStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';
export type TechPackFileKind = 'IMAGE' | 'PDF' | 'OTHER';

export interface TechPackFile {
  id: string;
  techPackId: string;
  fileName: string;
  url: string;
  kind: TechPackFileKind;
  uploadedBy?: string | null;
  uploadedAt: string;
}

export interface TechPack {
  id: string;
  companyId: string;
  code: string;
  name: string;
  version: number;
  status: TechPackStatus;
  productId?: string | null;
  bomId?: string | null;
  brand?: string | null;
  fabricSummary?: string | null;
  printDetails?: string | null;
  labelDetails?: string | null;
  packagingDetails?: string | null;
  instructions?: string | null;
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy?: string | null;
  supersedesId?: string | null;
  createdAt: string;
  updatedAt: string;
  files?: TechPackFile[];
  sizeCharts?: Array<{ id: string; code: string; name: string; version: number; status: string }>;
  bom?: { id: string; code: string; name: string } | null;
  filesCount?: number;
  sizeChartsCount?: number;
}

export type SizeChartStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';
export type SizeChartUnit = 'CM' | 'INCH';
export type SizeChartMeasurementMethod = 'FLAT' | 'ROUND';
export type SizeChartRowSource = 'CUSTOMER' | 'PATTERN' | 'FACTORY';

export interface SizeChartRow {
  id?: string;
  chartId?: string;
  sizeLabel: string;
  measurementKey: string;
  value: number;
  tolerance: number;
  source: SizeChartRowSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface SizeChart {
  id: string;
  companyId: string;
  code: string;
  name: string;
  version: number;
  status: SizeChartStatus;
  unit: SizeChartUnit;
  measurementMethod: SizeChartMeasurementMethod;
  productId?: string | null;
  techPackId?: string | null;
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy?: string | null;
  supersedesId?: string | null;
  createdAt: string;
  updatedAt: string;
  rows?: SizeChartRow[];
  rowsCount?: number;
  techPack?: { id: string; code: string; name: string; version: number; status: string } | null;
}

export interface SizeChartMatrixCell {
  sizeLabel: string;
  measurementKey: string;
  tolerance: number;
  customerValue: number | null;
  patternValue: number | null;
  factoryValue: number | null;
  diffPatternVsCustomer: number | null;
  diffFactoryVsCustomer: number | null;
  diffFactoryVsPattern: number | null;
  isToleranceExceeded: boolean;
  exceededSources: Array<{
    comparison: string;
    label: string;
    diff: number;
    allowedTolerance: number;
  }>;
}

export interface SizeChartMatrixResponse {
  chart: {
    id: string;
    code: string;
    name: string;
    version: number;
    status: SizeChartStatus;
    unit: SizeChartUnit;
    measurementMethod: SizeChartMeasurementMethod;
    techPack?: any;
    notes?: string | null;
  };
  sizes: string[];
  measurementKeys: string[];
  totalCells: number;
  exceededCount: number;
  hasExceededTolerance: boolean;
  matrix: SizeChartMatrixCell[];
}



export type ProductionOrderStatus =
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'QC_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProductionOrderType =
  | 'FULL_PACKAGE'
  | 'CMT'
  | 'CUSTOMER_MATERIALS'
  | 'OUTSOURCED'
  | 'SAMPLE'
  | 'REWORK';

export type CustomerOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type CustomerOrderPaymentKind = 'DEPOSIT' | 'INSTALLMENT' | 'FINAL' | 'CUSTOM';

export type CustomerOrderPaymentDueTrigger =
  | 'ON_CONFIRMATION'
  | 'ON_START'
  | 'ON_STAGE'
  | 'ON_DELIVERY'
  | 'MANUAL';

export type CustomerOrderPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface CustomerOrderPayment {
  id: string;
  companyId: string;
  customerOrderId: string;
  kind: CustomerOrderPaymentKind;
  label?: string | null;
  percent?: number | null;
  amount: number;
  dueTrigger: CustomerOrderPaymentDueTrigger;
  dueDate?: string | null;
  status: CustomerOrderPaymentStatus;
  paidAt?: string | null;
  paidAmount?: number | null;
  method?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  customerId?: string | null;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  brandName?: string | null;
  customerCountry?: string | null;
  responsibleUserId?: string | null;
  sourceSampleOrderId?: string | null;
  sourceSampleOrder?: SampleOrder | null;
  status: CustomerOrderStatus;
  expectedDelivery?: string | null;
  notes?: string | null;
  currency: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: ProductionOrder[];
  payments?: CustomerOrderPayment[];
  ordersCount?: number;
  plannedQuantity?: number;
  producedQuantity?: number;
  totalAmount?: number;
  totalActualCost?: number;
  estimatedProfit?: number;
  paidAmount?: number;
  remainingAmount?: number;
}

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
  purchaseUnit?: string | null;
  consumptionUnit?: string | null;
  fabricWidthM?: number | null;
  targetGsm?: number | null;
  composition?: string | null;
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
  executionEntity?: 'INTERNAL' | 'EXTERNAL';
  partnerFactoryId?: string | null;
  partnerFactory?: PartnerFactory | null;
  sentToFactoryAt?: string | null;
  factoryAckReceiptAt?: string | null;
  factoryCompletedAt?: string | null;
  factoryNotes?: string | null;
}

export type StageExecutionEntity = 'INTERNAL' | 'EXTERNAL';
export type AttachmentKind = 'IMAGE' | 'VIDEO' | 'DOC';
export type AttachmentReviewStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'HIDDEN';

export interface PartnerFactory {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  specialty?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  accessToken?: string | null;
  portalEnabled?: boolean;
  portalLastAccessAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    totalStagesCount: number;
    activeStagesCount: number;
    completedStagesCount: number;
    totalLaborCost: number;
  };
}

export interface ManufacturingAttachment {
  id: string;
  companyId: string;
  orderId?: string | null;
  stageId?: string | null;
  partnerFactoryId?: string | null;
  url: string;
  kind: AttachmentKind;
  caption?: string | null;
  uploadedById?: string | null;
  reviewStatus: AttachmentReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectReason?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  stage?: {
    id: string;
    name: string;
    sequence: number;
    status?: string;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    brandName?: string | null;
    plannedQuantity?: number;
    status?: string;
  } | null;
  partnerFactory?: {
    id: string;
    name: string;
    code?: string | null;
    phone?: string | null;
  } | null;
}

export interface FactoryMediaReviewListResponse {
  attachments: ManufacturingAttachment[];
  underReviewCount: number;
  totalCount: number;
}

export interface FactoryPortalContext {
  id: string;
  name: string;
  code?: string | null;
  specialty?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  portalEnabled: boolean;
  portalLastAccessAt?: string | null;
}

export interface FactoryPortalDeliveredMaterial {
  rawMaterialName: string;
  quantity: number;
  unit: string;
  batchNumber?: string | null;
  notes?: string | null;
}

export interface FactoryPortalAssignment {
  id: string;
  name: string;
  stageType: ProductionStageType;
  sequence: number;
  status: ProductionStageStatus;
  completedQuantity: number;
  startedAt?: string | null;
  completedAt?: string | null;
  sentToFactoryAt?: string | null;
  factoryAckReceiptAt?: string | null;
  factoryCompletedAt?: string | null;
  factoryNotes?: string | null;
  order: {
    id: string;
    orderNumber: string;
    brandName?: string | null;
    dueDate?: string | null;
    expectedDelivery?: string | null;
    plannedQuantity: number;
    unit: string;
    notes?: string | null;
    productModel?: string;
    variantMatrix?: Array<{
      size?: string | null;
      color?: string | null;
      sku?: string | null;
      plannedQuantity: number;
    }>;
  };
  deliveredMaterials: FactoryPortalDeliveredMaterial[];
  agreement: {
    ratePerPiece: number;
    partnerAgreedCost: number;
    currency: string;
  };
  attachments: Array<{
    id: string;
    url: string;
    kind: AttachmentKind;
    caption?: string | null;
    reviewStatus: AttachmentReviewStatus;
    rejectReason?: string | null;
    createdAt: string;
  }>;
  techPack?: TechPack | null;
  sizeChart?: SizeChart | null;
}

export interface PartnerFactoryPerformance {
  id: string;
  name: string;
  code?: string | null;
  specialty?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  isActive: boolean;
  assignedStagesCount: number;
  assignedOrdersCount: number;
  completedStagesCount: number;
  inProgressStagesCount: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  avgExecutionDays: number;
  totalLaborCost: number;
  attachmentsCount: number;
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
  // Contract Manufacturing (Wave 1) Fields
  customerOrderId?: string | null;
  customerOrder?: {
    id: string;
    orderNumber: string;
    status: CustomerOrderStatus;
    brandName?: string | null;
    totalAmount?: number;
    paidAmount?: number;
    remainingAmount?: number;
  } | null;
  orderType?: ProductionOrderType;
  customerId?: string | null;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  brandName?: string | null;
  customerCountry?: string | null;
  salePricePerUnit?: number | null;
  totalContractValue?: number | null;
  deliveryAddress?: string | null;
  deliveryMethod?: string | null;
  responsibleUserId?: string | null;
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


// ============================================================================
// Wave 5: Standalone Sample Orders (أوامر تصنيع العينات المستقلة والتحويل)
// ============================================================================

export type SampleOrderStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED';

export type SampleMaterialSource = 'CUSTOMER' | 'COMPANY';

export type SampleFileKind = 'IMAGE' | 'PDF' | 'OTHER';

export interface SampleOrderStage {
  id: string;
  sampleOrderId: string;
  name: string;
  stageType: ProductionStageType;
  sequence: number;
  status: string; // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  notes?: string | null;
  templateSetId?: string | null;
  templateId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SampleOrderAttachment {
  id: string;
  sampleOrderId: string;
  fileName: string;
  url: string;
  kind: SampleFileKind;
  uploadedBy?: string | null;
  uploadedAt: string;
}

export interface CreateSampleOrderInput extends Omit<Partial<SampleOrder>, 'stages'> {
  stages?: Array<{
    name: string;
    sequence?: number;
    stageType?: ProductionStageType;
    status?: string;
    notes?: string;
    templateSetId?: string | null;
    templateId?: string | null;
  }>;
}

export interface SampleOrder {
  id: string;
  companyId: string;
  sampleNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customer?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } | null;
  brandName?: string | null;
  productName: string;
  productId?: string | null;
  product?: any | null;
  bomId?: string | null;
  bom?: any | null;
  techPackId?: string | null;
  plannedQuantity: number;
  size?: string | null;
  color?: string | null;
  materialSource: SampleMaterialSource;
  fee?: number | null;
  status: SampleOrderStatus;
  dueDate?: string | null;
  designNotes?: string | null;
  resultNotes?: string | null;
  convertedOrderId?: string | null;
  convertedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    plannedQuantity: number;
    orderType?: string;
  } | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: SampleOrderStage[];
  attachments?: SampleOrderAttachment[];
}


// ============================================================================
// Wave 6: Standard Production Stage Templates Library & Sets
// ============================================================================

export interface ProductionStageTemplate {
  id: string;
  companyId: string;
  code: string;
  name: string;
  stageType: ProductionStageType;
  sequence: number;
  standardMinutes: number;
  ratePerPiece: number;
  executionEntity: StageExecutionEntity;
  defaultPartnerFactoryId?: string | null;
  defaultPartnerFactory?: { id: string; name: string; code?: string | null } | null;
  instructions?: string | null;
  isActive: boolean;
  usageCount: number;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionStageTemplateSetItem {
  id: string;
  setId: string;
  templateId: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  template?: ProductionStageTemplate;
}

export interface ProductionStageTemplateSet {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ProductionStageTemplateSetItem[];
}

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
    orderType?: ProductionOrderType;
    customerId?: string | null;
    customerOrderId?: string | null;
    brandName?: string | null;
    customerCountry?: string | null;
    salePricePerUnit?: number | null;
    deliveryAddress?: string | null;
    deliveryMethod?: string | null;
    responsibleUserId?: string | null;
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
      const res = await apiClient.get('/accounting/accounts');
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

  // --------------------------------------------------------------------------
  // Contract Manufacturing (Wave 1) API
  // --------------------------------------------------------------------------
  listCustomerOrders: async (params?: any): Promise<{ items: CustomerOrder[]; totals: any }> => {
    const res = await apiClient.get('/manufacturing/customer-orders', { params });
    return res.data?.data || { items: [], totals: {} };
  },

  getCustomerOrder: async (id: string): Promise<CustomerOrder> => {
    const res = await apiClient.get(`/manufacturing/customer-orders/${id}`);
    return res.data?.data;
  },

  createCustomerOrder: async (data: any): Promise<CustomerOrder> => {
    const res = await apiClient.post('/manufacturing/customer-orders', data);
    return res.data?.data;
  },

  updateCustomerOrder: async (id: string, data: any): Promise<CustomerOrder> => {
    const res = await apiClient.patch(`/manufacturing/customer-orders/${id}`, data);
    return res.data?.data;
  },

  linkOrCreateChildOrder: async (customerOrderId: string, data: any): Promise<any> => {
    const res = await apiClient.post(`/manufacturing/customer-orders/${customerOrderId}/children`, data);
    return res.data?.data;
  },

  listCustomerOrderPayments: async (customerOrderId: string): Promise<CustomerOrderPayment[]> => {
    const res = await apiClient.get(`/manufacturing/customer-orders/${customerOrderId}/payments`);
    return res.data?.data || [];
  },

  generateDefaultPayments: async (customerOrderId: string): Promise<CustomerOrderPayment[]> => {
    const res = await apiClient.post(`/manufacturing/customer-orders/${customerOrderId}/payments/generate`);
    return res.data?.data || [];
  },

  createCustomerOrderPayment: async (customerOrderId: string, data: any): Promise<CustomerOrderPayment> => {
    const res = await apiClient.post(`/manufacturing/customer-orders/${customerOrderId}/payments`, data);
    return res.data?.data;
  },

  updateCustomerOrderPayment: async (
    customerOrderId: string,
    paymentId: string,
    data: any
  ): Promise<{ payment: CustomerOrderPayment; customerOrder: CustomerOrder }> => {
    const res = await apiClient.patch(
      `/manufacturing/customer-orders/${customerOrderId}/payments/${paymentId}`,
      data
    );
    return res.data?.data;
  },

  getCustomersList: async (search?: string): Promise<Array<{ id: string; name: string; phone?: string; email?: string }>> => {
    try {
      const res = await apiClient.get('/customers', { params: { search, limit: 30 } });
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.customers)
        ? res.data.customers
        : [];
      return raw.map((c: any) => ({
        id: String(c.id),
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || 'عميل بدون اسم',
        phone: c.phone || '',
        email: c.email || '',
      }));
    } catch {
      return [];
    }
  },

  // ==========================================================================
  // Partner Factories & Subcontracting (Wave 2)
  // ==========================================================================

  listPartnerFactories: async (filters?: {
    search?: string;
    isActive?: boolean | string;
    specialty?: string;
  }): Promise<PartnerFactory[]> => {
    const res = await apiClient.get('/manufacturing/partner-factories', { params: filters });
    return res.data?.data || [];
  },

  getPartnerFactoryById: async (id: string): Promise<PartnerFactory> => {
    const res = await apiClient.get(`/manufacturing/partner-factories/${id}`);
    return res.data?.data;
  },

  createPartnerFactory: async (data: Partial<PartnerFactory>): Promise<PartnerFactory> => {
    const res = await apiClient.post('/manufacturing/partner-factories', data);
    return res.data?.data;
  },

  updatePartnerFactory: async (id: string, data: Partial<PartnerFactory>): Promise<PartnerFactory> => {
    const res = await apiClient.patch(`/manufacturing/partner-factories/${id}`, data);
    return res.data?.data;
  },

  deletePartnerFactory: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/manufacturing/partner-factories/${id}`);
    return res.data;
  },

  assignStageExecution: async (
    orderId: string,
    stageId: string,
    data: { executionEntity: 'INTERNAL' | 'EXTERNAL'; partnerFactoryId?: string | null }
  ): Promise<ProductionStage> => {
    const res = await apiClient.patch(
      `/manufacturing/orders/${orderId}/stages/${stageId}/assignment`,
      data
    );
    return res.data?.data;
  },

  recordStageFactoryEvent: async (
    orderId: string,
    stageId: string,
    data: { event: 'SENT' | 'ACK_RECEIPT' | 'COMPLETED'; at?: string; notes?: string }
  ): Promise<ProductionStage> => {
    const res = await apiClient.post(
      `/manufacturing/orders/${orderId}/stages/${stageId}/factory-events`,
      data
    );
    return res.data?.data;
  },

  listOrderAttachments: async (
    orderId: string,
    filters?: { stageId?: string; kind?: string }
  ): Promise<ManufacturingAttachment[]> => {
    const res = await apiClient.get(`/manufacturing/orders/${orderId}/attachments`, { params: filters });
    return res.data?.data || [];
  },

  createAttachment: async (data: {
    url: string;
    kind?: 'IMAGE' | 'VIDEO' | 'DOC';
    orderId?: string;
    stageId?: string;
    caption?: string;
  }): Promise<ManufacturingAttachment> => {
    const res = await apiClient.post('/manufacturing/attachments', data);
    return res.data?.data;
  },

  deleteAttachment: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/manufacturing/attachments/${id}`);
    return res.data;
  },

  getPartnerFactoriesPerformance: async (filters?: {
    from?: string;
    to?: string;
  }): Promise<PartnerFactoryPerformance[]> => {
    const res = await apiClient.get('/manufacturing/partner-factories/performance', { params: filters });
    return res.data?.data || [];
  },

  // --------------------------------------------------------------------------
  // Fabric Calculator (Wave 2.5) API
  // --------------------------------------------------------------------------
  convertFabric: async (data: {
    mode?: 'both' | 'kg' | 'm';
    widthM: number;
    gsm: number;
    lengthM?: number | null;
    weightKg?: number | null;
  }): Promise<{
    mode: string;
    widthM: number;
    gsm: number;
    weightPerMeter: number;
    computedWeight?: number | null;
    computedLength?: number | null;
    weightDiff?: number | null;
    display: {
      weightPerMeter: number;
      computedWeight?: number | null;
      computedLength?: number | null;
      weightDiff?: number | null;
    };
  }> => {
    const res = await apiClient.post('/manufacturing/fabric/convert', data);
    return res.data?.data;
  },

  calculateActualGsm: async (data: {
    weightKg: number;
    lengthM: number;
    widthM: number;
  }): Promise<{
    weightKg: number;
    lengthM: number;
    widthM: number;
    actualGsm: number;
    actualGsmRaw: number;
    note?: string;
  }> => {
    const res = await apiClient.post('/manufacturing/fabric/actual-gsm', data);
    return res.data?.data;
  },

  calculateFabricRequirements: async (data: {
    pieces?: number | null;
    metersPerPiece?: number | null;
    totalBaseMeters?: number | null;
    wastePercent: number;
    widthM: number;
    gsm: number;
    pricePerKg?: number | null;
    pricePerM?: number | null;
  }): Promise<{
    pieces?: number | null;
    metersPerPiece?: number | null;
    baseMeters: number;
    wastePercent: number;
    widthM: number;
    gsm: number;
    metersWithWaste: number;
    expectedWeightKg: number;
    pricePerKg?: number | null;
    pricePerM?: number | null;
    costByKg?: number | null;
    costByM?: number | null;
    totalCost?: number | null;
    costPerPiece?: number | null;
    formulas: Record<string, string>;
  }> => {
    const res = await apiClient.post('/manufacturing/fabric/requirements', data);
    return res.data?.data;
  },

  calculateActualWaste: async (data: {
    issuedTotal: number;
    consumedInAccepted: number;
    returnedGood?: number;
  }): Promise<{
    issuedTotal: number;
    consumedInAccepted: number;
    returnedGood: number;
    actualWaste: number;
    actualWasteRaw: number;
    wastePercentFromIssued: number;
    note: string;
  }> => {
    const res = await apiClient.post('/manufacturing/fabric/actual-waste', data);
    return res.data?.data;
  },

  // --------------------------------------------------------------------------
  // Partner Factories Portal Links (Wave 3)
  // --------------------------------------------------------------------------
  generatePortalLink: async (
    factoryId: string
  ): Promise<{ accessToken: string; portalEnabled: boolean; portalUrl: string; message: string }> => {
    const res = await apiClient.post(`/manufacturing/partner-factories/${factoryId}/portal-link/generate`);
    return res.data;
  },

  togglePortalLink: async (
    factoryId: string,
    portalEnabled: boolean
  ): Promise<{ portalEnabled: boolean; accessToken?: string | null; portalUrl?: string | null; message: string }> => {
    const res = await apiClient.post(`/manufacturing/partner-factories/${factoryId}/portal-link/toggle`, {
      portalEnabled,
    });
    return res.data;
  },

  revokePortalLink: async (
    factoryId: string
  ): Promise<{ portalEnabled: boolean; message: string }> => {
    const res = await apiClient.post(`/manufacturing/partner-factories/${factoryId}/portal-link/revoke`);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // Media Review & Approval System (Wave 3)
  // --------------------------------------------------------------------------
  listReviews: async (params?: {
    reviewStatus?: string;
    partnerFactoryId?: string;
    orderId?: string;
  }): Promise<FactoryMediaReviewListResponse> => {
    const res = await apiClient.get('/manufacturing/reviews', { params });
    return res.data?.data || { attachments: [], underReviewCount: 0, totalCount: 0 };
  },

  approveReview: async (id: string): Promise<{ success: boolean; message: string; attachment: ManufacturingAttachment }> => {
    const res = await apiClient.patch(`/manufacturing/reviews/${id}/approve`);
    return res.data;
  },

  rejectReview: async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; message: string; attachment: ManufacturingAttachment }> => {
    const res = await apiClient.patch(`/manufacturing/reviews/${id}/reject`, { reason });
    return res.data;
  },

  publishReview: async (id: string): Promise<{ success: boolean; message: string; attachment: ManufacturingAttachment }> => {
    const res = await apiClient.patch(`/manufacturing/reviews/${id}/publish`);
    return res.data;
  },

  hideReview: async (id: string): Promise<{ success: boolean; message: string; attachment: ManufacturingAttachment }> => {
    const res = await apiClient.patch(`/manufacturing/reviews/${id}/hide`);
    return res.data;
  },

  // Tech Packs (Wave 4)
  listTechPacks: async (params?: { status?: string; productId?: string; bomId?: string; search?: string }): Promise<TechPack[]> => {
    const res = await apiClient.get('/manufacturing/tech-packs', { params });
    return res.data?.data || [];
  },

  getTechPack: async (id: string): Promise<TechPack> => {
    const res = await apiClient.get(`/manufacturing/tech-packs/${id}`);
    return res.data?.data;
  },

  createTechPack: async (payload: Partial<TechPack> & { files?: Array<{ fileName: string; url: string; kind?: TechPackFileKind }> }): Promise<TechPack> => {
    const res = await apiClient.post('/manufacturing/tech-packs', payload);
    return res.data?.data;
  },

  updateTechPack: async (id: string, payload: Partial<TechPack>): Promise<{ isNewVersion: boolean; message: string; techPack: TechPack }> => {
    const res = await apiClient.patch(`/manufacturing/tech-packs/${id}`, payload);
    return res.data;
  },

  cloneTechPackVersion: async (id: string, payload?: { name?: string; notes?: string }): Promise<TechPack> => {
    const res = await apiClient.post(`/manufacturing/tech-packs/${id}/clone-version`, payload || {});
    return res.data?.data;
  },

  approveTechPack: async (id: string): Promise<TechPack> => {
    const res = await apiClient.post(`/manufacturing/tech-packs/${id}/approve`);
    return res.data?.data;
  },

  archiveTechPack: async (id: string): Promise<TechPack> => {
    const res = await apiClient.post(`/manufacturing/tech-packs/${id}/archive`);
    return res.data?.data;
  },

  getTechPackVersions: async (id: string): Promise<TechPack[]> => {
    const res = await apiClient.get(`/manufacturing/tech-packs/${id}/versions`);
    return res.data?.data || [];
  },

  uploadTechPackFile: async (id: string, payload: FormData | { url: string; fileName?: string; kind?: string }): Promise<{ file: TechPackFile; isCloned?: boolean; message: string }> => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await apiClient.post(`/manufacturing/tech-packs/${id}/files`, payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  },

  deleteTechPackFile: async (id: string, fileId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/manufacturing/tech-packs/${id}/files/${fileId}`);
    return res.data;
  },

  // Size Charts (Wave 4)
  listSizeCharts: async (params?: { status?: string; productId?: string; techPackId?: string; search?: string }): Promise<SizeChart[]> => {
    const res = await apiClient.get('/manufacturing/size-charts', { params });
    return res.data?.data || [];
  },

  getSizeChart: async (id: string): Promise<SizeChart> => {
    const res = await apiClient.get(`/manufacturing/size-charts/${id}`);
    return res.data?.data;
  },

  createSizeChart: async (payload: Partial<SizeChart> & { rows?: SizeChartRow[] }): Promise<SizeChart> => {
    const res = await apiClient.post('/manufacturing/size-charts', payload);
    return res.data?.data;
  },

  updateSizeChart: async (id: string, payload: Partial<SizeChart> & { rows?: SizeChartRow[] }): Promise<{ isNewVersion: boolean; message: string; sizeChart: SizeChart }> => {
    const res = await apiClient.patch(`/manufacturing/size-charts/${id}`, payload);
    return res.data;
  },

  cloneSizeChartVersion: async (id: string, payload?: { name?: string; notes?: string }): Promise<SizeChart> => {
    const res = await apiClient.post(`/manufacturing/size-charts/${id}/clone-version`, payload || {});
    return res.data?.data;
  },

  approveSizeChart: async (id: string): Promise<SizeChart> => {
    const res = await apiClient.post(`/manufacturing/size-charts/${id}/approve`);
    return res.data?.data;
  },

  archiveSizeChart: async (id: string): Promise<SizeChart> => {
    const res = await apiClient.post(`/manufacturing/size-charts/${id}/archive`);
    return res.data?.data;
  },

  getSizeChartVersions: async (id: string): Promise<SizeChart[]> => {
    const res = await apiClient.get(`/manufacturing/size-charts/${id}/versions`);
    return res.data?.data || [];
  },

  getSizeChartMatrix: async (id: string): Promise<SizeChartMatrixResponse> => {
    const res = await apiClient.get(`/manufacturing/size-charts/${id}/matrix`);
    return res.data?.data;
  },

  // ==========================================================================
  // Sample Orders (Wave 5)
  // ==========================================================================

  listSampleOrders: async (params?: {
    status?: string;
    materialSource?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SampleOrder[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await apiClient.get('/manufacturing/sample-orders', { params });
    return res.data;
  },

  getSampleOrderById: async (id: string): Promise<SampleOrder> => {
    const res = await apiClient.get(`/manufacturing/sample-orders/${id}`);
    return res.data?.data;
  },

  createSampleOrder: async (data: Partial<SampleOrder> & { stages?: Partial<SampleOrderStage>[] }): Promise<SampleOrder> => {
    const res = await apiClient.post('/manufacturing/sample-orders', data);
    return res.data?.data;
  },

  updateSampleOrder: async (id: string, data: Partial<SampleOrder>): Promise<SampleOrder> => {
    const res = await apiClient.patch(`/manufacturing/sample-orders/${id}`, data);
    return res.data?.data;
  },

  deleteSampleOrder: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/manufacturing/sample-orders/${id}`);
    return res.data;
  },

  addSampleStage: async (id: string, stage: Partial<SampleOrderStage>): Promise<SampleOrderStage> => {
    const res = await apiClient.post(`/manufacturing/sample-orders/${id}/stages`, stage);
    return res.data?.data;
  },

  updateSampleStage: async (
    id: string,
    stageId: string,
    data: { status?: string; notes?: string; startedAt?: string; completedAt?: string; name?: string }
  ): Promise<SampleOrderStage> => {
    const res = await apiClient.patch(`/manufacturing/sample-orders/${id}/stages/${stageId}`, data);
    return res.data?.data;
  },

  uploadSampleFile: async (
    id: string,
    payload: FormData | { url: string; fileName: string; kind?: string }
  ): Promise<SampleOrderAttachment> => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await apiClient.post(`/manufacturing/sample-orders/${id}/files`, payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data?.data;
  },

  approveSampleOrder: async (id: string, data?: { resultNotes?: string }): Promise<SampleOrder> => {
    const res = await apiClient.post(`/manufacturing/sample-orders/${id}/approve`, data);
    return res.data?.data;
  },

  rejectSampleOrder: async (id: string, data: { resultNotes: string }): Promise<SampleOrder> => {
    const res = await apiClient.post(`/manufacturing/sample-orders/${id}/reject`, data);
    return res.data?.data;
  },

  convertSampleToOrder: async (
    id: string,
    data: {
      plannedQuantity?: number;
      orderType?: string;
      bomId?: string;
      customerId?: string;
      customerOrderId?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; order: ProductionOrder; sampleOrder: SampleOrder }> => {
    const res = await apiClient.post(`/manufacturing/sample-orders/${id}/convert-to-order`, data);
    return res.data;
  },


  // ==========================================================================
  // Wave 6: Stage Templates & Sets Library
  // ==========================================================================

  listStageTemplates: async (params?: { search?: string; isActive?: boolean | string; stageType?: string; executionEntity?: string }): Promise<ProductionStageTemplate[]> => {
    const res = await apiClient.get('/manufacturing/stage-templates', { params });
    return res.data?.data || [];
  },

  getStageTemplateById: async (id: string): Promise<ProductionStageTemplate> => {
    const res = await apiClient.get(`/manufacturing/stage-templates/${id}`);
    return res.data?.data;
  },

  createStageTemplate: async (data: Partial<ProductionStageTemplate>): Promise<ProductionStageTemplate> => {
    const res = await apiClient.post('/manufacturing/stage-templates', data);
    return res.data?.data;
  },

  updateStageTemplate: async (id: string, data: Partial<ProductionStageTemplate>): Promise<ProductionStageTemplate> => {
    const res = await apiClient.patch(`/manufacturing/stage-templates/${id}`, data);
    return res.data?.data;
  },

  archiveStageTemplate: async (id: string): Promise<ProductionStageTemplate> => {
    const res = await apiClient.delete(`/manufacturing/stage-templates/${id}`);
    return res.data?.data;
  },

  listStageTemplateSets: async (params?: { search?: string; isActive?: boolean | string }): Promise<ProductionStageTemplateSet[]> => {
    const res = await apiClient.get('/manufacturing/stage-template-sets', { params });
    return res.data?.data || [];
  },

  getStageTemplateSetById: async (id: string): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.get(`/manufacturing/stage-template-sets/${id}`);
    return res.data?.data;
  },

  createStageTemplateSet: async (data: Partial<ProductionStageTemplateSet> & { itemTemplateIds?: string[] }): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.post('/manufacturing/stage-template-sets', data);
    return res.data?.data;
  },

  updateStageTemplateSet: async (id: string, data: Partial<ProductionStageTemplateSet>): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.patch(`/manufacturing/stage-template-sets/${id}`, data);
    return res.data?.data;
  },

  archiveStageTemplateSet: async (id: string): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.delete(`/manufacturing/stage-template-sets/${id}`);
    return res.data?.data;
  },

  addStageTemplateSetItem: async (setId: string, data: { templateId: string; sequence?: number }): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.post(`/manufacturing/stage-template-sets/${setId}/items`, data);
    return res.data?.data;
  },

  removeStageTemplateSetItem: async (setId: string, itemId: string): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.delete(`/manufacturing/stage-template-sets/${setId}/items/${itemId}`);
    return res.data?.data;
  },

  reorderStageTemplateSetItems: async (setId: string, itemIds: string[]): Promise<ProductionStageTemplateSet> => {
    const res = await apiClient.put(`/manufacturing/stage-template-sets/${setId}/reorder`, { itemIds });
    return res.data?.data;
  },

  applyStageSetToOrder: async (orderId: string, payload: { setId: string; mode?: 'APPEND' | 'REPLACE_IF_EMPTY' }): Promise<{ success: boolean; count: number; stages: ProductionStage[]; message?: string }> => {
    const res = await apiClient.post(`/manufacturing/orders/${orderId}/apply-stage-set`, payload);
    return res.data;
  },

  applyStageSetToBom: async (bomId: string, payload: { setId: string; mode?: 'APPEND' | 'REPLACE_ALL' }): Promise<{ success: boolean; count: number; stages: BomStandardStage[]; message?: string }> => {
    const res = await apiClient.post(`/manufacturing/boms/${bomId}/apply-stage-set`, payload);
    return res.data;
  },


};

// ============================================================================
// Factory Portal Standalone API (Unauthenticated, Token-based)
// ============================================================================
export const factoryPortalApi = {
  getContext: async (token: string): Promise<FactoryPortalContext> => {
    const res = await apiClient.get('/factory-portal/context', {
      headers: { 'x-factory-token': token },
    });
    return res.data?.data;
  },

  getAssignments: async (token: string): Promise<FactoryPortalAssignment[]> => {
    const res = await apiClient.get('/factory-portal/assignments', {
      headers: { 'x-factory-token': token },
    });
    return res.data?.data || [];
  },

  confirmReceipt: async (
    token: string,
    stageId: string,
    data?: { at?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; stageId: string; factoryAckReceiptAt: string; status: string }> => {
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/confirm-receipt`, data, {
      headers: { 'x-factory-token': token },
    });
    return res.data;
  },

  startStage: async (
    token: string,
    stageId: string,
    data?: { at?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; stageId: string; startedAt: string; status: string }> => {
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/start`, data, {
      headers: { 'x-factory-token': token },
    });
    return res.data;
  },

  updateStage: async (
    token: string,
    stageId: string,
    data: {
      completedQuantity?: number;
      scrapQuantity?: number;
      reworkQuantity?: number;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; stageId: string; completedQuantity: number; stageLaborCost: number }> => {
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/update`, data, {
      headers: { 'x-factory-token': token },
    });
    return res.data;
  },

  uploadMedia: async (
    token: string,
    stageId: string,
    payload: FormData | { url: string; caption?: string; kind?: string }
  ): Promise<{ success: boolean; message: string; attachment: any }> => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/media`, payload, {
      headers: {
        'x-factory-token': token,
        ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {}),
      },
    });
    return res.data;
  },

  requestApproval: async (
    token: string,
    stageId: string,
    data?: { notes?: string }
  ): Promise<{ success: boolean; message: string; stageId: string }> => {
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/request-approval`, data, {
      headers: { 'x-factory-token': token },
    });
    return res.data;
  },

  reportIssue: async (
    token: string,
    stageId: string,
    data: { issue: string }
  ): Promise<{ success: boolean; message: string; stageId: string }> => {
    const res = await apiClient.post(`/factory-portal/assignments/${stageId}/issues`, data, {
      headers: { 'x-factory-token': token },
    });
    return res.data;
  },

};
