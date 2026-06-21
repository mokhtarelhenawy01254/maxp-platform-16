export const STATUS_FILTERS = [
  { value: "ALL", label: "الكل" },
  { value: "ACTIVE", label: "نشطة" },
  { value: "INACTIVE", label: "متوقفة" },
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
  { value: "attention:desc", label: "الأكثر احتياجًا للمتابعة" },
  { value: "lastActivity:asc", label: "الأقدم نشاطًا أولًا" },
  { value: "lastActivity:desc", label: "الأحدث نشاطًا أولًا" },
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
