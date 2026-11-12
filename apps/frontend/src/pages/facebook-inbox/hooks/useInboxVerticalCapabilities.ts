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
    primaryAction: { id: "appointment", label: "حجز جلسة / اشتراك" },
    recordsTabLabel: "الاشتراكات",
    kpiLabels: { countLabel: "الاشتراكات", valueLabel: "المدفوعات" },
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

function resolveVertical(specialtySlug: string | undefined, apps: Set<string>): InboxVertical {
  const s = (specialtySlug || "").toLowerCase().trim();
  const hasAny = (keys: string[]) => keys.some((k) => s.includes(k));

  if (
    s.includes("dental") ||
    apps.has("dental-lab-app") ||
    apps.has("dental-materials-pro") ||
    apps.has("dental-lab")
  ) {
    return "dental";
  }
  if (
    hasAny(["medical", "clinic", "health", "doctor", "radiology", "pharmacy", "hospital", "therapy"]) ||
    apps.has("booking-app") ||
    apps.has("medical-system") ||
    apps.has("lab-app") ||
    apps.has("radiology-app")
  ) {
    return "medical";
  }
  if (
    hasAny(["educat", "academy", "school", "training", "course", "learning", "quran"]) ||
    apps.has("education-app") ||
    apps.has("academy-app")
  ) {
    return "education";
  }
  if (
    hasAny(["service", "maintenance", "contracting", "factory"]) ||
    apps.has("service-orders") ||
    apps.has("services-app") ||
    apps.has("services-pro") ||
    apps.has("service-request-app")
  ) {
    return "services";
  }
  if (hasAny(["agency", "marketing", "call_center", "support"]) || apps.has("marketing-agency-pro")) {
    return "agency";
  }
  if (hasAny(["cafe", "restaurant", "coffee", "food", "bakery"]) || apps.has("cafe-restaurant-pro")) {
    return "cafe";
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
  const activeAppsList = company?.activeApps || [];

  return useMemo(() => {
    const activeApps = new Set(activeAppsList.map((a) => a.toLowerCase().trim()));
    const vertical = resolveVertical(specialtySlug, activeApps);
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
    if (showProductPicker) {
      addAction({ id: "order", label: "إنشاء طلب سريع" });
    }
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
