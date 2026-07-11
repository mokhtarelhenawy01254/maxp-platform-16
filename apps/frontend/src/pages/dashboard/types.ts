export type DashboardCompany = {
  id: string;
  name: string;
  plan?: string | null;
  currency?: string | null;
  isActive?: boolean;
  slug?: string | null;
  phone?: string | null;
};

export type DashboardUsageItem = {
  current?: number | null;
  limit?: number | null;
  percentage?: number | null;
};

export type DashboardUsage = {
  users?: DashboardUsageItem;
  customers?: DashboardUsageItem;
  conversations?: DashboardUsageItem;
};

export type DashboardCounts = {
  users?: number | null;
  customers?: number | null;
  products?: number | null;
  orders?: number | null;
  conversations?: number | null;
};

export type DashboardRecentActivity = {
  newUsers?: number | null;
  newCustomers?: number | null;
  newConversations?: number | null;
};

export type DashboardMetrics = {
  orders?: number | null;
  items?: number | null;
  visits?: number | null;
  conversionRate?: number | null;
  confirmedOrders?: number | null;
  confirmedRate?: number | null;
  cancelledOrders?: number | null;
  cancellationRate?: number | null;
  returnedOrders?: number | null;
  returnRate?: number | null;
  piecesPerOrder?: number | null;
};

export type DashboardOrderHealth = {
  trackedOrders?: number | null;
  excludedOrders?: number | null;
  confirmedOrders?: number | null;
  confirmedRate?: number | null;
  cancelledOrders?: number | null;
  cancellationRate?: number | null;
  returnedOrders?: number | null;
  returnRate?: number | null;
  deliveredOrders?: number | null;
  openOrders?: number | null;
  newOrders?: number | null;
  viewedOrders?: number | null;
  totalItems?: number | null;
  piecesPerOrder?: number | null;
};

export type DashboardTopProduct = {
  name: string;
  quantity?: number | null;
};

export type RevenueHistoryPoint = {
  date: string;
  revenue: number;
  orders?: number;
};

export type PreviousPeriod = {
  trackedOrders: number;
  revenue: number;
  items: number;
  visits: number;
  newCustomers: number;
  conversionRate: number;
  aov: number;
};

export type DashboardData = {
  company: DashboardCompany;
  dateRange?: { start?: string; end?: string };
  counts?: DashboardCounts;
  usage?: DashboardUsage;
  financials?: { totalRevenue: number; grossProfit: number; aov: number };
  recentActivity?: DashboardRecentActivity;
  metrics?: DashboardMetrics;
  orderHealth?: DashboardOrderHealth;
  inventory?: { lowStockCount: number; outOfStockCount: number };
  topProducts?: DashboardTopProduct[];
  revenueHistory?: RevenueHistoryPoint[];
  previousPeriod?: PreviousPeriod;
};

export type DashboardResponse = {
  success?: boolean;
  message?: string;
  data?: DashboardData;
};

export type FetchDashboardOptions = {
  force?: boolean;
  signal?: AbortSignal;
};

export type DashboardMetricRailItem = {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  tone: import("../../components/business/BusinessMetrics").BusinessMetricTone;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
};

export type DashboardStatusStripTone = "primary" | "success" | "warning";

export type DashboardStatusStripProps = {
  badge: string;
  countLabel?: string;
  description: string;
  details?: React.ReactNode;
  progressPct?: number;
  actions?: React.ReactNode;
  title: string;
  tone: DashboardStatusStripTone;
};

export type DashboardMetricRailProps = {
  description: string;
  items: DashboardMetricRailItem[];
  title: string;
};
