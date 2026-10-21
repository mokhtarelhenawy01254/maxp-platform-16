import React from "react";
import {
  Users, Clock, Tag, ShoppingBag, FileText, Wallet, Landmark, Star,
  ArrowDownUp, Heart, Crown, Sparkles, AlertTriangle,
} from "lucide-react";

export interface CustomerList {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: any;
  isDefault?: boolean;
  isStale?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastActivity: string;
  createdAt: string;
  status: string;
  rating: string;
  tags: string;
  totalSpent?: number;
  ordersCount?: number;
  rfmScore?: number;
  rfmTier?: "gold" | "silver" | "bronze" | "lead";
}

export const RFM_TIER_META: Record<string, { label: string; cls: string }> = {
  gold: { label: "ذهبي", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  silver: { label: "فضي", cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  bronze: { label: "برونزي", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  lead: { label: "عادي", cls: "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]" },
};

export function rfmTierMeta(tier?: string): { label: string; cls: string } {
  return RFM_TIER_META[tier || "lead"] ?? RFM_TIER_META["lead"] ?? { label: "عادي", cls: "" };
}

export const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "SCHEDULED", "PROCESSING", "SHIPPED", "DELIVERED",
  "CANCELLED", "REFUNDED", "RETURNED", "PARTIALLY_RETURNED", "EXCHANGED",
  "PARTIALLY_REFUNDED", "READY_TO_SHIP", "ON_HOLD", "OUT_FOR_DELIVERY",
  "LOST", "PREPARING", "QUALITY_CHECK", "PACKAGED", "PARTIALLY_DELIVERED",
  "STOCK_SHORTAGE", "PENDING_CANCELLATION",
];

export const RETURN_STATUSES = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"];
export const PAYMENT_STATUSES = ["PENDING", "COMPLETED", "PARTIALLY_PAID", "FAILED", "REFUNDED"];
export const RATINGS = ["EXCELLENT", "GOOD", "AVERAGE", "POOR", "UNKNOWN"];

export const STATUS_LABELS: Record<string, string> = {
  DELIVERED: "تم التسليم",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  SCHEDULED: "مجدول",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  CANCELLED: "ملغي",
  REFUNDED: "مسترجع",
  RETURNED: "مرتجع",
  PARTIALLY_RETURNED: "مرتجع جزئياً",
  EXCHANGED: "مستبدل",
  PARTIALLY_REFUNDED: "مسترجع جزئياً",
  READY_TO_SHIP: "جاهز للشحن",
  ON_HOLD: "قيد الانتظار",
  OUT_FOR_DELIVERY: "خارج للتوصيل",
  LOST: "ضائع",
  PREPARING: "يتم تجهيزه",
  QUALITY_CHECK: "فحص الجودة",
  PACKAGED: "تم التغليف",
  PARTIALLY_DELIVERED: "تم التسليم جزئياً",
  STOCK_SHORTAGE: "نقص في المخزون",
  PENDING_CANCELLATION: "إلغاء معلق",
  APPROVED: "موافقة",
  REJECTED: "مرفوض",
  COMPLETED: "مكتمل",
  PARTIALLY_PAID: "مدفوع جزئياً",
  FAILED: "فشل",
  EXCELLENT: "ممتاز",
  GOOD: "جيد",
  AVERAGE: "متوسط",
  POOR: "ضعيف",
  UNKNOWN: "غير معروف",
};

export const CRITERIA_TYPES = [
  { value: "all", label: "جميع العملاء النشطين", icon: Users, hint: "كل العملاء النشطين" },
  { value: "active", label: "نشط خلال فترة", icon: Clock, hint: "عملاء تواصلوا خلال آخر X ساعة" },
  { value: "inactive", label: "غير نشط منذ فترة", icon: Clock, hint: "عملاء لم يتواصلوا منذ X يوم" },
  { value: "tag", label: "يحمل وسم (Tag)", icon: Tag, hint: "عملاء لديهم وسم محدد" },
  { value: "orderStatus", label: "حالة طلب خلال فترة", icon: ShoppingBag, hint: "عملاء عندهم طلب بحالة معينة" },
  { value: "returnRequest", label: "طلبات مرتجع", icon: FileText, hint: "عملاء قاموا بطلب مرتجع" },
  { value: "paymentStatus", label: "حالة الدفع", icon: Wallet, hint: "عملاء بحالة دفع لطلباتهم" },
  { value: "city", label: "المدينة", icon: Landmark, hint: "عملاء من مدينة معينة" },
  { value: "customerRating", label: "التقييم", icon: Star, hint: "عملاء بتقييم محدد" },
  { value: "latest", label: "الأحدث", icon: ArrowDownUp, hint: "أحدث N عملاء" },
  { value: "oldest", label: "الأقدم", icon: ArrowDownUp, hint: "أقدم N عملاء" },
  { value: "minTotalSpent", label: "إجمالي الإنفاق", icon: Wallet, hint: "عملاء أنفقوا أكثر من مبلغ" },
  { value: "minOrdersCount", label: "عدد الطلبات", icon: ShoppingBag, hint: "عملاء لديهم N طلب أو أكثر" },
  { value: "nps", label: "NPS (مروّج/محايد/منتقد)", icon: Star, hint: "فلترة حسب وسم NPS 9-10 / 7-8 / 0-6" },
  { value: "waitlist", label: "قائمة انتظار مقاس", icon: Heart, hint: "عملاء في Wishlist بمقاس محدد" },
] as const;

export type CriteriaType = (typeof CRITERIA_TYPES)[number]["value"];

export const SMART_PRESETS = [
  {
    value: "champions",
    label: "أفضل العملاء",
    icon: Crown,
    hint: "نشطون + كثيرو الطلبات + إنفاق مرتفع — عرض ولاء",
  },
  {
    value: "loyal",
    label: "العملاء الأوفياء",
    icon: Heart,
    hint: "5 طلبات أو أكثر — رشّحهم لبرنامج الولاء",
  },
  {
    value: "atRisk",
    label: "معرضون للفقدان",
    icon: AlertTriangle,
    hint: "كانوا مشترين لكن غير نشطين 30 يوم — أعد التنشيط",
  },
  {
    value: "new",
    label: "عملاء جدد",
    icon: Sparkles,
    hint: "أحدث 100 عميل — رحّب بهم",
  },
] as const;

export interface CustomerListsStats {
  totalLists: number;
  totalMembers: number;
  active24h: number;
  newThisMonth: number;
}
