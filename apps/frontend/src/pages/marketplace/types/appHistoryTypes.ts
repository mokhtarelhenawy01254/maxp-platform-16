export interface AppActivityLog {
  id: string;
  action: "INSTALL_APP" | "UNINSTALL_APP" | string;
  description: string;
  targetName: string;
  targetId: string | null;
  createdAt: string;
  user: {
    id: string | null;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
  };
  metadata?: {
    appSlug?: string;
    appName?: string;
    pricingModel?: string;
    billingCycle?: string;
    cost?: number;
    trial?: boolean;
    synthetic?: boolean;
  } | null;
}

export interface AppHistoryStats {
  totalInstalls: number;
  totalUninstalls: number;
  totalActions: number;
}

export type AppHistoryFilterType = "ALL" | "INSTALL_APP" | "UNINSTALL_APP";

export interface LogApiResponse {
  success: boolean;
  data: {
    logs: AppActivityLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    stats: AppHistoryStats;
  };
}
