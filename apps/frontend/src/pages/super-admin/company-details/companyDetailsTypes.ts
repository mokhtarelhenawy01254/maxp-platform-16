export interface CompanyData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  currency: string;
  isActive: boolean;
  slug?: string;
  customDomain?: string;
  createdAt?: string;
  businessSpecialtyId?: string | null;
  businessSpecialty?: {
    id: string;
    nameAr: string;
    nameEn: string;
    slug: string;
    icon?: string | null;
    descriptionAr?: string | null;
  } | null;
  trialModeEnabled?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  _count?: { users?: number; customers?: number; facebookPages?: number };
}

export interface CompanyUser {
  id: string; firstName: string; lastName: string; email: string;
  phone?: string; role: string; isActive: boolean;
  createdAt: string; lastLoginAt: string;
  employee?: { employeeNumber: string };
}

export interface FacebookPage {
  id: string; pageName?: string; pageId: string;
  status: string; connectedAt?: string; createdAt?: string;
}

export interface TicketListItem {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface ActivityEntry {
  id: string;
  userId?: string;
  category: string;
  action: string;
  description: string;
  severity: string;
  createdAt: string;
}

export interface CompanyReview {
  wallet?: {
    balance: number; totalDeposited: number; totalSpent: number;
    currency: string; updatedAt: string;
    recentTransactions?: Array<{ id: string; type: string; amount: number; createdAt: string; description?: string; status?: string }>;
  };
  subscription?: {
    id: string; monthlyFee: number; status: string;
    nextBillingDate?: string; failedAttempts: number;
    lastBillingDate?: string; billingDay?: number;
  };
  billing?: {
    stats?: { unpaidInvoices: number; overdueInvoices: number; pendingReceipts: number; failedPayments: number; pendingPayments?: number; paidInvoices?: number; totalInvoices?: number };
    invoices?: any[];
    payments?: any[];
    receipts?: any[];
    recentInvoices?: any[];
    recentPayments?: any[];
    recentReceipts?: any[];
    recentHistory?: any[];
  };
  usage?: {
    costs?: { total: number; subscriptions: number; usage: number };
    totalActions: number; totalQuantity: number; activeApps: number;
    installedApps?: any[];
    usageBreakdown?: Array<{ feature: string; totalActions: number; totalQuantity: number; totalCost: number }>;
  };
  limits?: {
    entries?: Array<{ key: string; label: string; current: number; limit: number; percentage: number; remaining: number; isUnlimited: boolean; bonus?: number }>;
    features?: { advancedReports?: boolean; apiAccess?: boolean };
    coupon?: { name?: string; appliedCode: string; benefitSummary: string[] };
  };
}
