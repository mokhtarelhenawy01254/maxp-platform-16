export type FulfillmentMilestone = 'READY_TO_SHIP' | 'SHIPPED';

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
  milestone?: FulfillmentMilestone;
  milestoneLabel?: string;
  actionVerb?: string;
  totalShippedCount: number;
  totalCount?: number;
  totalShippedRevenue: number;
  totalRevenue?: number;
  avgLeadTimeHours: number;
  sameDayCount: number;
  sameDayRate: number;
  agedBacklogCount: number;
  agedBacklogRate: number;
  inflowCount: number;
  outflowCount: number;
  netBacklogDelta: number;
  waitingCarrierCount?: number;
  waitingCarrierRevenue?: number;
  handoffDoneCount?: number;
  handoffPendingCount?: number;
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
  milestone?: FulfillmentMilestone;
  handoffStatus?: 'SHIPPED' | 'WAITING_PICKUP';
}

export interface DrillDownPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

