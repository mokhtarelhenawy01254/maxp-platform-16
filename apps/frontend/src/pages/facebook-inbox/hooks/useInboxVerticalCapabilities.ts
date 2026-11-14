import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuthSimple";

export type InboxVertical =
  | "dental"
  | "medical"
  | "services"
  | "education"
  | "agency"
  | "cafe"
  | "commerce";

export type InboxVerticalActionId =
  | "dental_case"
  | "appointment"
  | "service_order"
  | "task"
  | "order";

export interface InboxVerticalAction {
  id: InboxVerticalActionId;
  label: string;
}

export interface InboxVerticalCapabilities {
  vertical: InboxVertical;
  specialtyLabel: string;
  badgeClassName: string;
  primaryAction: InboxVerticalAction;
  availableActions: InboxVerticalAction[];
  recordsTabLabel: string;
  kpiLabels: { countLabel: string; valueLabel: string };
  showProductPicker: boolean;
}

const STORE_APPS = new Set([
  "store",
  "store-basic",
  "store-pro",
  "ecommerce-basic",
  "ecommerce-pro",
  "order-core",
  "pos-pro",
]);

const SPECIALTY_META: Record<
  InboxVertical,
  {
    label: string;
    badgeClassName: string;
    primaryAction: InboxVerticalAction;
    recordsTabLabel: string;
    kpiLabels: { countLabel: string; valueLabel: string };
  }
> = {
  dental: {
    label: "معمل أسنان",
    badgeClassName: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/50",
    primaryAction: { id: "dental_case", label: "إنشاء حالة معمل" },
    recordsTabLabel: "حالات المعمل",
    kpiLabels: { countLabel: "الحالات", valueLabel: "إجمالي الفواتير" },
  },
  medical: {
    label: "عيادة طبية",
    badgeClassName: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/50",
    primaryAction: { id: "appointment", label: "حجز موعد" },
    recordsTabLabel: "المواعيد",
    kpiLabels: { countLabel: "المواعيد", valueLabel: "إجمالي الكشوفات" },
  },
  services: {
    label: "خدمات وصيانة",
    badgeClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/50",
    primaryAction: { id: "service_order", label: "طلب صيانة / خدمة" },
    recordsTabLabel: "طلبات الخدمة",
    kpiLabels: { countLabel: "طلبات الخدمة", valueLabel: "قيمة الخدمات" },
  },
  education: {
    label: "أكاديمية وتعليم",
    badgeClassName: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50",
    primaryAction: { id: "appointment", label: "حجز ديمو داي / تسجيل Lead" },
    recordsTabLabel: "المواعيد",
    kpiLabels: { countLabel: "المواعيد", valueLabel: "المدفوعات" },
  },
  agency: {
    label: "وكالة تسويق",
    badgeClassName: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/50",
    primaryAction: { id: "task", label: "إنشاء مهمة" },
    recordsTabLabel: "المهام",
    kpiLabels: { countLabel: "المهام", valueLabel: "قيمة التعاقدات" },
  },
  cafe: {
    label: "كافيه ومطعم",
    badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50",
    primaryAction: { id: "order", label: "إنشاء طلب سريع" },
    recordsTabLabel: "الطلبات",
    kpiLabels: { countLabel: "الطلبات", valueLabel: "إجمالي القيمة" },
  },
  commerce: {
    label: "متجر إلكتروني",
    badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50",
    primaryAction: { id: "order", label: "إنشاء طلب سريع" },
    recordsTabLabel: "الطلبات",
    kpiLabels: { countLabel: "الطلبات", valueLabel: "إجمالي القيمة" },
  },
};

const VALID_VERTICALS = new Set<InboxVertical>([
  "education",
  "dental",
  "medical",
  "services",
  "agency",
  "cafe",
  "commerce",
]);

export function resolveVertical(
  specialtySlug: string | undefined | null,
  apps: Set<string>,
  companyName?: string | null,
  companySlug?: string | null,
  specialtyName?: string | null,
  inboxOverride?: InboxVertical | null,
): InboxVertical {
  // Tier 1: Merchant explicit override from settings (Highest Priority)
  if (inboxOverride && VALID_VERTICALS.has(inboxOverride)) {
    return inboxOverride;
  }

  const textCues = [specialtySlug, companyName, companySlug, specialtyName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasStoreApp = Array.from(STORE_APPS).some((slug) => apps.has(slug));
  const isCommerceStore =
    hasStoreApp ||
    apps.has("women-fashion-eg") ||
    apps.has("woocommerce-pro") ||
    /store|shop|market|boutique|fashion|clothing|retail|متجر|سوق|أزياء|ملابس|تجارة|براند/.test(textCues);

  // Tier 2: Database Official Business Specialty & Domain Keywords
  const isEducation =
    /education|academy|school|course|learning|training|quran|student|tutor|أكاديمية|تعليم|تدريب|مدرسة|كورس|سنتر|حضونة|طلاب|تلميذ|قرآن/.test(
      textCues,
    ) ||
    apps.has("education-app") ||
    apps.has("academy-app") ||
    apps.has("quran-app");

  if (isEducation && !isCommerceStore) return "education";
  if (isEducation && /education|academy|أكاديمية|تعليم|تدريب|مدرسة|كورس/.test(specialtySlug || "")) return "education";

  // Tier 2b: Dental (CRITICAL: Only if specialty/name is dental, or if dental apps exist WITHOUT commerce store apps)
  const hasDentalCues = /dental|أسنان/.test(textCues);
  if (
    hasDentalCues ||
    ((apps.has("dental-lab-app") ||
      apps.has("dental-materials-pro") ||
      apps.has("dental-lab")) &&
      !isCommerceStore)
  ) {
    return "dental";
  }

  // Tier 2c: Medical (CRITICAL: booking-app alone is NOT medical!)
  const isMedical =
    /medical|clinic|health|doctor|radiology|pharmacy|hospital|therapy|عيادة|طبي|مستشفى|دكتور|علاج|مختبر|أشعة|صيدلية/.test(
      textCues,
    ) ||
    apps.has("medical-system") ||
    apps.has("lab-app") ||
    apps.has("radiology-app") ||
    apps.has("clinic-app");

  if (isMedical) return "medical";

  // Tier 2d: Services & Maintenance
  const isServices =
    /service|maintenance|contracting|factory|صيانة|خدمات|مقاولات|مصنع/.test(textCues) ||
    apps.has("service-orders") ||
    apps.has("services-app") ||
    apps.has("services-pro") ||
    apps.has("service-request-app");

  if (isServices) return "services";

  // Tier 2e: Agency
  if (
    /agency|marketing|call_center|support|تسويق|دعاية|وكالة/.test(textCues) ||
    apps.has("marketing-agency-pro")
  ) {
    return "agency";
  }

  // Tier 2f: Cafe & Restaurant
  if (
    /cafe|restaurant|coffee|food|bakery|مطعم|كافيه|قهوة|مقهى/.test(textCues) ||
    apps.has("cafe-restaurant-pro")
  ) {
    return "cafe";
  }

  // Tier 3: Utility Apps Fallback (booking-app without domain driver maps to neutral services)
  if (apps.has("booking-app")) {
    return "services";
  }

  return "commerce";
}

export function useInboxVerticalCapabilities(): InboxVerticalCapabilities {
  const { user } = useAuth();
  const company = useMemo(
    () => user?.company || user?.companies?.find((c) => c.isCurrent || c.id === user?.companyId) || null,
    [user?.company, user?.companies, user?.companyId],
  );
  const specialtySlug = company?.businessSpecialty?.slug;
  const specialtyName = company?.businessSpecialty?.nameAr || company?.businessSpecialty?.nameEn;
  const companyName = company?.name;
  const companySlug = company?.slug;
  const activeAppsList = company?.activeApps || [];

  const inboxOverride = useMemo(() => {
    const raw = company?.settings;
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const val = String(parsed?.inboxVerticalProfile || "").toLowerCase().trim();
      return val && VALID_VERTICALS.has(val as InboxVertical) ? (val as InboxVertical) : null;
    } catch {
      return null;
    }
  }, [company?.settings]);

  return useMemo(() => {
    const activeApps = new Set(activeAppsList.map((a) => a.toLowerCase().trim()));
    const vertical = resolveVertical(
      specialtySlug,
      activeApps,
      companyName,
      companySlug,
      specialtyName,
      inboxOverride,
    );
    const meta = SPECIALTY_META[vertical];

    const hasStoreApp = Array.from(STORE_APPS).some((slug) => activeApps.has(slug));
    const hasCafeApp = activeApps.has("cafe-restaurant-pro");
    const showProductPicker = vertical === "commerce" || vertical === "cafe" || hasStoreApp || hasCafeApp;

    const actions: InboxVerticalAction[] = [meta.primaryAction];
    const addAction = (action: InboxVerticalAction) => {
      if (!actions.some((existing) => existing.id === action.id)) actions.push(action);
    };

    if (
      vertical === "dental" ||
      activeApps.has("dental-lab-app") ||
      activeApps.has("dental-materials-pro") ||
      activeApps.has("dental-lab")
    ) {
      addAction({ id: "dental_case", label: "إنشاء حالة معمل" });
    }
    if (
      vertical === "medical" ||
      vertical === "education" ||
      activeApps.has("booking-app") ||
      activeApps.has("medical-system") ||
      activeApps.has("education-app") ||
      activeApps.has("academy-app")
    ) {
      addAction({ id: "appointment", label: "حجز موعد" });
    }
    if (
      vertical === "services" ||
      vertical === "agency" ||
      activeApps.has("service-orders") ||
      activeApps.has("services-app") ||
      activeApps.has("services-pro") ||
      activeApps.has("service-request-app")
    ) {
      addAction({ id: "service_order", label: "طلب صيانة / خدمة" });
    }
    // Always provide quick order capability across all verticals (taking orders/invoices is core platform functionality)
    addAction({ id: "order", label: "إنشاء طلب سريع" });
    addAction({ id: "task", label: "إنشاء مهمة" });

    return {
      vertical,
      specialtyLabel: meta.label,
      badgeClassName: meta.badgeClassName,
      primaryAction: meta.primaryAction,
      availableActions: actions,
      recordsTabLabel: meta.recordsTabLabel,
      kpiLabels: meta.kpiLabels,
      showProductPicker,
    };
  }, [specialtySlug, activeAppsList]);
}

export default useInboxVerticalCapabilities;
