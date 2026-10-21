export interface LeadCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  autoFollowUp: boolean;
  autoPromoteCategoryId: string | null;
  triggerFlowId: string | null;
  triggerFlow: { id: string; name: string; isEnabled: boolean } | null;
  contactCount: number;
  activeJourneyCount: number;
}

export interface Flow {
  id: string;
  name: string;
  isEnabled: boolean;
}

export interface TagItem {
  name: string;
  count: number;
}

export interface QualityCustomer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  totalSpent: number;
  score: number;
  tier: string;
}

export interface QualityAnalytics {
  customers: QualityCustomer[];
  totalCustomers: number;
  tierCounts: Record<string, number>;
  avgCustomerScore: string;
}

export interface LoyaltyRecord {
  id: string;
  customer: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  program: { id: string; name: string; nameAr?: string };
  tier: { id: string; name: string; nameAr?: string } | null;
  currentPoints: number | string;
  totalEarned: number | string;
  totalRedeemed: number | string;
  lastActivity: string;
  status: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  minPoints: number;
  maxPoints?: number | null;
  benefits: string[];
  color: string;
  icon: string;
  customersCount: number;
  programId: string;
}

export interface CustomerBasic {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags: string[] | string;
  status: string;
  customerRating?: string;
  successScore?: number;
}

export interface UnifiedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualityTier: string;
  qualityScore: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  rating: string;
  tags: string[];
  status: string;
  totalSpent: number;
  totalOrders: number;
}

export interface CustomerSegmentsStats {
  total: number;
  vipCount: number;
  highCount: number;
  medCount: number;
  lowCount: number;
  loyaltyMembers: number;
  excellentCount: number;
  atRiskCount: number;
  totalPoints: number;
}

export const TIER_COLORS: Record<string, string> = {
  VIP: "#8B5CF6",
  عالي: "#3B82F6",
  متوسط: "#F59E0B",
  منخفض: "#EF4444",
};

export const QUALITY_TIER_ORDER = ["VIP", "عالي", "متوسط", "منخفض"] as const;

export const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280",
];

export const parseTags = (tags: string[] | string | null | undefined): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
};

export const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
