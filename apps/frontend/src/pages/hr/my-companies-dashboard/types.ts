export type DashboardTab = "overview" | "reports" | "attendance" | "orders";

export interface CompanyOrderPermissions {
  canView: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  canCancel: boolean;
}

export interface MyCompaniesOrder {
  id: string;
  companyId: string;
  companyName: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  customerName: string;
  customerPhone: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  permissions: CompanyOrderPermissions;
  isGuest?: boolean;
}

export interface TotalsByCompany {
  companyId: string;
  companyName: string;
  count: number;
}

export interface MyCompaniesOrdersData {
  totalsByCompany: TotalsByCompany[];
  totalOrders: number;
  orders: MyCompaniesOrder[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface MyCompaniesOrdersResponse {
  success: boolean;
  data: MyCompaniesOrdersData;
}

export interface CompanyStats {
  company: {
    id: string;
    name: string;
    logo: string | null;
    isDefault?: boolean;
  };
  stats: {
    totalUsers: number;
    todayOrders: number;
    todayRevenue: number;
    unreadConversations: number;
    lowStockProducts: number;
    attendance: {
      present: number;
      late: number;
      absent: number;
    };
  };
}

export interface DashboardOverview {
  totalCompanies: number;
  totalUsers: number;
  totalTodayOrders: number;
  totalTodayRevenue: number;
  totalUnreadConversations: number;
  totalLowStockProducts: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    overview: DashboardOverview;
    byCompany: CompanyStats[];
  };
}
