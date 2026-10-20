import type { MarketplaceApp as MPA } from "@/types/marketplace";

export type PlanOption = "PAY_PER_USE" | "MONTHLY" | "YEARLY";

const numberFormatter = new Intl.NumberFormat("ar-EG");

export function formatNumber(value?: number | null): string {
  return numberFormatter.format(value ?? 0);
}

export function formatMoney(value?: number | null): string {
  return `${formatNumber(value)} ج.م`;
}

export function safeParseJson(value: unknown) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function isLikelyImageUrl(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v)) return true;
  return v.startsWith("/uploads/") || v.startsWith("data:image/");
}

export function getPricingSummary(app: MPA) {
  if (app.pricingModel === "FREE") {
    return { title: "مجاني", price: "بدون تكلفة", helper: "يمكن تفعيلها مباشرة من غير اشتراك." };
  }
  if (app.pricingModel === "PAY_PER_USE") {
    return {
      title: "حسب الاستخدام",
      price: `${formatMoney(app.unitPrice)} / ${app.unitName || "وحدة"}`,
      helper: "ادفع فقط مقابل الاستهلاك الفعلي.",
    };
  }
  return {
    title: "اشتراك شهري",
    price: `${formatMoney(app.monthlyPrice)} / شهر`,
    helper: "وصول كامل لجميع مميزات الأداة.",
  };
}

export const planTitles: Record<PlanOption, string> = {
  PAY_PER_USE: "حسب الاستخدام",
  MONTHLY: "اشتراك شهري",
  YEARLY: "اشتراك سنوي",
};

export function getPlanPrices(app: MPA): Record<PlanOption, string> {
  return {
    PAY_PER_USE: `${formatMoney(app.unitPrice || 1)} / ${app.unitName || "طلب"}`,
    MONTHLY: `${formatMoney(app.monthlyPrice)} / شهر`,
    YEARLY: `${formatMoney(app.yearlyPrice)} / سنة`,
  };
}
