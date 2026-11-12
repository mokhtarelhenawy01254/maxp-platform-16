/**
 * منطق ملخّص سعر «تفعيل الكل» — مستخرج من CompanyActivationCenter
 * عشان يتغطى باختبار تنفيذي بدل الوصف.
 */
export type PriceSummaryKind = "FREE" | "MONTHLY_WITH_UNKNOWN" | "MONTHLY" | "UNKNOWN";

export interface PriceSummaryInput {
  freeAppsCount: number;
  uninstalledCount: number;
  totalMonthlyCost: number;
  unknownPricePaidAppsCount: number;
}

export function resolvePriceSummaryKind({
  freeAppsCount,
  uninstalledCount,
  totalMonthlyCost,
  unknownPricePaidAppsCount,
}: PriceSummaryInput): PriceSummaryKind {
  if (freeAppsCount === uninstalledCount) return "FREE";
  if (totalMonthlyCost > 0) {
    return unknownPricePaidAppsCount > 0 ? "MONTHLY_WITH_UNKNOWN" : "MONTHLY";
  }
  return "UNKNOWN";
}
