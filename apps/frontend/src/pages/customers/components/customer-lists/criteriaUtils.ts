import { CriteriaType, SMART_PRESETS, STATUS_LABELS } from "./types";

export function buildEmptyCriteria(type: CriteriaType): Record<string, any> {
  switch (type) {
    case "active": return { type, hours: 24 };
    case "inactive": return { type, days: 7 };
    case "orderStatus": return { type, status: "DELIVERED", days: 30 };
    case "returnRequest": return { type, status: "APPROVED", days: 30 };
    case "paymentStatus": return { type, status: "COMPLETED", days: 30 };
    case "city": return { type, city: "" };
    case "customerRating": return { type, rating: "EXCELLENT" };
    case "latest": return { type, limit: 100 };
    case "oldest": return { type, limit: 100 };
    case "minTotalSpent": return { type, amount: 1000 };
    case "minOrdersCount": return { type, count: 2 };
    case "tag": return { type, tag: "" };
    default: return { type };
  }
}

export function buildPresetCriteria(preset: string): Record<string, any> {
  return { type: "preset", preset };
}

export function criteriaSummary(criteria: any): string {
  if (!criteria) return "جميع العملاء النشطين";
  const c = typeof criteria === "string" ? (() => { try { return JSON.parse(criteria); } catch { return {}; } })() : criteria;
  const type = c.type || "all";
  switch (type) {
    case "active": return `نشط خلال آخر ${c.hours ?? 24} ساعة`;
    case "inactive": return `غير نشط منذ ${c.days ?? 7} يوم`;
    case "tag": return `يحمل وسم: ${c.tag}`;
    case "orderStatus": return c.days ? `طلبات "${STATUS_LABELS[c.status] || c.status}" خلال ${c.days} يوم` : `طلبات بحالة "${STATUS_LABELS[c.status] || c.status}"`;
    case "returnRequest": return c.days ? `مرتجعات "${STATUS_LABELS[c.status] || c.status || "الكل"}" خلال ${c.days} يوم` : `مرتجعات بحالة "${STATUS_LABELS[c.status] || c.status || "الكل"}"`;
    case "paymentStatus": return c.days ? `دفع "${STATUS_LABELS[c.status] || c.status}" خلال ${c.days} يوم` : `دفع بحالة "${STATUS_LABELS[c.status] || c.status}"`;
    case "city": return `من مدينة: ${c.city}`;
    case "customerRating": return `التقييم: ${STATUS_LABELS[c.rating] || c.rating}`;
    case "latest": return `أحدث ${c.limit ?? 100} عميل`;
    case "oldest": return `أقدم ${c.limit ?? 100} عميل`;
    case "minTotalSpent": return `إجمالي إنفاق ≥ ${c.amount}`;
    case "minOrdersCount": return `عدد طلبات ≥ ${c.count}`;
    case "preset": {
      const preset = SMART_PRESETS.find((p) => p.value === c.preset);
      return preset ? preset.label : "قائمة جاهزة";
    }
    default: return "جميع العملاء النشطين";
  }
}

export function formatDate(date: string | undefined): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString("ar-EG");
  } catch {
    return "—";
  }
}
