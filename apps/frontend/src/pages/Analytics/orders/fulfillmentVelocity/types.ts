export interface VintageBucket {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  count: number;
  revenue: number;
  percent: number;
}

export interface CreationCohort {
  creationDate: string;
  diffDays: number;
  ordersCount: number;
  totalRevenue: number;
  percentOfBatch: number;
  avgLeadTimeHours: number;
}

export interface TeamMemberVelocity {
  name: string;
  totalShipped: number;
  freshOrders: number;
  agedOrders: number;
}

export interface VelocityKpis {
  totalShippedCount: number;
  totalShippedRevenue: number;
  avgLeadTimeHours: number;
  sameDayCount: number;
  sameDayRate: number;
  agedBacklogCount: number;
  agedBacklogRate: number;
  inflowCount: number;
  outflowCount: number;
  netBacklogDelta: number;
}

export interface FulfillmentVelocitySummaryData {
  dateRange: {
    startDate: string;
    endDate: string;
    isSingleDay: boolean;
  };
  kpis: VelocityKpis;
  vintageBuckets: VintageBucket[];
  cohorts: CreationCohort[];
  teamBreakdown: TeamMemberVelocity[];
}

export interface ShippedOrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  total: number;
  status: string;
  createdAt: string;
  shippedAt: string;
  shippedBy: string;
  createDayStr: string;
  shipDayStr: string;
  diffDays: number;
  vintageBucket: string;
  leadTimeHours: number;
  isGuest: boolean;
}

export interface DrillDownPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
