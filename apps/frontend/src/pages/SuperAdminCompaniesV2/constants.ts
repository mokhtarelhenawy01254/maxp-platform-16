export const STATUS_FILTERS = [
  { value: "ALL", label: "الكل" },
  { value: "ACTIVE", label: "نشطة" },
  { value: "INACTIVE", label: "متوقفة" },
] as const;

export const FOLLOW_UP_SAVED_VIEWS = [
  { value: "ALL", label: "كل الشركات" },
  { value: "FOLLOW_UP_NOW", label: "تحتاج متابعة الآن" },
  { value: "MY_TODAY", label: "متابعتي اليوم" },
  { value: "ESCALATION_DUE", label: "تصعيد مطلوب" },
  { value: "STALE_72H", label: "متوقف 72 ساعة+" },
] as const;

export const LIFECYCLE_SAVED_VIEWS = [
  { value: "ALL", label: "كل الشركات" },
  { value: "TRIAL", label: "فترة تجريبية" },
  { value: "ACTIVE_STORES", label: "متاجر نشطة" },
  { value: "ONBOARDING_STUCK", label: "تحتاج إعداد (بدون منتجات)" },
  { value: "FOLLOW_UP_NOW", label: "تحتاج متابعة" },
  { value: "STALE_72H", label: "متوقفة 72س+" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "EGP", label: "جنيه مصري" },
  { value: "USD", label: "دولار أمريكي" },
  { value: "EUR", label: "يورو" },
] as const;

export const EMPLOYEE_ROLE_OPTIONS = [
  { value: "COMPANY_ADMIN", label: "مدير شركة" },
  { value: "MANAGER", label: "مدير" },
  { value: "AGENT", label: "موظف" },
] as const;

export const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "الأحدث أولًا" },
  { value: "createdAt:asc", label: "الأقدم أولًا" },
  { value: "name:asc", label: "الاسم من أ إلى ي" },
  { value: "name:desc", label: "الاسم من ي إلى أ" },
  { value: "users:desc", label: "الأكثر مستخدمين" },
  { value: "facebookPages:desc", label: "الأكثر صفحات فيسبوك" },
] as const;

export const PAGE_SIZE_OPTIONS = ["10", "20", "40"] as const;

export const DEFAULT_SORT = "createdAt:desc";

export const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "pending", label: "معلق" },
  { value: "in_progress", label: "قيد المتابعة" },
  { value: "waiting", label: "بانتظار الرد" },
  { value: "resolved", label: "تم الحل" },
  { value: "escalated", label: "مصعد" },
] as const;

export const CALL_STATUS_OPTIONS = [
  { value: "not_called", label: "لم يتم الاتصال" },
  { value: "answered", label: "تم الرد" },
  { value: "no_answer", label: "لم يرد" },
  { value: "call_back_later", label: "معاودة الاتصال" },
] as const;
