export interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  pointsPerPurchase?: number | string;
  pointsPerAmount?: number | string;
  pointsPerReferral?: number | string;
  minimumPoints?: number | string;
  expiryMonths?: number;
  status?: string;
}

export interface CustomerLoyaltyTier {
  id: string;
  programId: string;
  name: string;
  nameAr?: string;
  minPoints: number | string;
  maxPoints?: number | string | null;
  priority?: number;
  color?: string;
}

export interface CustomerLoyaltyRecord {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  program: CustomerLoyaltyProgram;
  tier?: {
    id: string;
    name: string;
    nameAr?: string;
  } | null;
  currentPoints: number | string;
  totalEarned: number | string;
  totalRedeemed: number | string;
  lastActivity: string;
  metadata?: any;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export type PointsActionType = "ADD" | "REDEEM" | "ADJUST";
export type FilterMode = "ALL" | "VIP" | "AT_RISK";

export interface CustomerPointsStats {
  activeMembers: number;
  totalPointsBalance: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  redemptionRate: number;
  atRiskCount: number;
}

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPoints = (value: number): string =>
  Math.round(value).toLocaleString("ar-EG");

export const getMonthsSince = (dateString: string): number => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;

  const now = new Date();
  let months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());

  if (now.getDate() < date.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

export const getEarningRuleText = (program: CustomerLoyaltyProgram | null): string => {
  if (!program) return "حدد برنامج نقاط واضح وسهل الفهم للعملاء.";

  const pointsPerAmount = toNumber(program.pointsPerAmount);
  const pointsPerPurchase = toNumber(program.pointsPerPurchase);
  const pointsPerReferral = toNumber(program.pointsPerReferral);

  if (pointsPerAmount > 0) {
    return `اكسب ${pointsPerAmount} نقطة لكل 1 وحدة عملة من قيمة الطلب.`;
  }

  if (pointsPerPurchase > 0) {
    return `اكسب ${pointsPerPurchase} نقطة لكل عملية شراء مكتملة.`;
  }

  if (pointsPerReferral > 0) {
    return `برنامج الإحالة يضيف ${pointsPerReferral} نقطة لكل إحالة ناجحة.`;
  }

  return "فعّل معدل كسب واضح (لكل طلب أو لكل قيمة شراء) لرفع وضوح البرنامج.";
};
