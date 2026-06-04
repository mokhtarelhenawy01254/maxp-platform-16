import type { CompanyOnboardingState } from "../../utils/companyOnboarding";

export type DashboardCompany = {
  id: string;
  name: string;
  plan?: string | null;
  currency?: string | null;
  isActive?: boolean;
  slug?: string | null;
  phone?: string | null;
  onboarding?: CompanyOnboardingState | null;
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
};

export type DashboardResponse = {
  success?: boolean;
  message?: string;
  data?: DashboardData;
};

export type QuickChecklistStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  icon: string;
  action: () => void;
};

export type FetchDashboardOptions = {
  force?: boolean;
  signal?: AbortSignal;
};

export type QuickStartChecklistProps = {
  activation: import("../../utils/companyActivation").CompanyActivationState;
  company: DashboardCompany | null;
  counts: DashboardCounts;
  isRtl: boolean;
  onNavigate: (path: string) => void;
};

export type OnboardingResumeCardProps = {
  company: DashboardCompany | null;
  isRtl: boolean;
  onNavigate: (path: string) => void;
};

export type ActivationLaunchCardProps = {
  activation: import("../../utils/companyActivation").CompanyActivationState;
  company: DashboardCompany | null;
  isRtl: boolean;
  onNavigate: (path: string) => void;
};

export type DateRangeToolbarProps = {
  start: string;
  end: string;
  presets: { id: string; label: string }[];
  selectedFilterId: string;
  currentRangeLabel: string;
  currentRangeMeta: string;
  customPresetLabel: string;
  showCustomRangeInputs: boolean;
  isRefreshing: boolean;
  fromLabel: string;
  toLabel: string;
  rangeLabel: string;
  refreshLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onSelectFilter: (value: string) => void;
  onRefresh: () => void;
};

export type DashboardOperationsPanelProps = {
  cancelledLabel: string;
  conversationsLabel: string;
  customersLabel: string;
  formatCount: (value: number | null | undefined) => string;
  isRtl: boolean;
  onNavigate: (path: string) => void;
  orderHealth: DashboardOrderHealth;
  recentActivity: DashboardRecentActivity;
  returnedLabel: string;
};

export type TopProductsPanelProps = {
  items: DashboardTopProduct[];
  title: string;
  emptyLabel: string;
  itemsUnitLabel: string;
  formatCount: (value: number | null | undefined) => string;
};

export type DashboardMetricRailItem = {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  tone: import("../../components/business/BusinessMetrics").BusinessMetricTone;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
};

export type DashboardIntroBandProps = {
  activation: import("../../utils/companyActivation").CompanyActivationState;
  company: DashboardCompany;
  currentRangeLabel: string;
  currentRangeMeta: string;
  productCountLabel: string;
  isRtl: boolean;
  onNavigate: (path: string) => void;
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
