type JsonRecord = Record<string, unknown>;

export type FeatureAccessKind = "FREE" | "PAID" | "PAY_PER_USE";
export type PositioningFieldKey = "audience" | "surface" | "outcome";

export interface FeatureDisplayItem {
  key: string;
  name: string;
  description: string;
  access: FeatureAccessKind;
}

export interface PositioningDisplayItem {
  audience: string;
  surface: string;
  outcome: string;
}

interface FeatureCatalogEntry {
  name: string;
  description: string;
}

interface RawFeatureItem {
  key: string;
  name?: string;
  description?: string;
  access?: FeatureAccessKind | string;
}

interface MarketplaceFeatureCarrier {
  slug?: string;
  pricingModel?: string;
  features?: unknown;
}

interface MarketplacePositioningCarrier {
  slug?: string;
  positioning?: unknown;
}

const FEATURE_COPY: Record<string, FeatureCatalogEntry> = {
  adAccounts: {
    name: "ربط الحسابات الإعلانية",
    description: "إدارة أكثر من حساب إعلاني من نفس لوحة التحكم.",
  },
  automations: {
    name: "أتمتة الحملات",
    description: "قواعد تلقائية لتحسين الأداء والميزانيات والنتائج.",
  },
  dashboards: {
    name: "لوحات تحليل الأداء",
    description: "مؤشرات واضحة للمبيعات والزيارات والتحويلات.",
  },
  exports: {
    name: "تصدير التقارير",
    description: "استخراج التقارير ومشاركتها بسهولة مع الفريق.",
  },
  replySuggestions: {
    name: "اقتراحات الردود",
    description: "اقتراح ردود أسرع لدعم المبيعات وخدمة العملاء.",
  },
  intentRouting: {
    name: "توجيه النية",
    description: "فهم نية العميل وتحويله للمسار أو الرد المناسب.",
  },
  orders: {
    name: "إدارة الطلبات",
    description: "متابعة الطلب من الإنشاء حتى التأكيد والتنفيذ.",
  },
  products: {
    name: "إدارة المنتجات",
    description: "إنشاء وتنظيم المنتجات والتصنيفات من مكان واحد.",
  },
  storefront: {
    name: "واجهة المتجر",
    description: "تشغيل المتجر العام وصفحاته أمام العميل مباشرة.",
  },
  themes: {
    name: "الثيمات والقوالب",
    description: "اختيار مظهر المتجر وتخصيص التجربة البصرية.",
  },
  contacts: {
    name: "إدارة العملاء",
    description: "حفظ بيانات العملاء وربطها بالطلبات والتفاعل.",
  },
  segments: {
    name: "تقسيم الشرائح",
    description: "تصنيف العملاء إلى شرائح قابلة للاستهداف.",
  },
  themeComponents: {
    name: "عناصر جاهزة للمتجر",
    description: "مكونات تحويل تركب مباشرة على صفحات المتجر.",
  },
  templatePresets: {
    name: "Preset جاهز",
    description: "إعدادات جاهزة للتشغيل السريع بدل الضبط اليدوي.",
  },
  conversionOverlays: {
    name: "طبقات رفع التحويل",
    description: "تنبيهات وعناصر مساندة للشراء داخل التجربة.",
  },
  quantityTiers: {
    name: "عروض كميات",
    description: "تسعير مرن حسب عدد القطع أو الباقات.",
  },
  mixAndMatchVariants: {
    name: "مزج المتغيرات",
    description: "اختيار لون أو مقاس مختلف لكل قطعة داخل العرض.",
  },
  productLevelOffers: {
    name: "عروض على مستوى المنتج",
    description: "إدارة عروض خاصة من داخل صفحة المنتج نفسها.",
  },
  photoReviews: {
    name: "تقييمات بالصور",
    description: "إظهار صور حقيقية من العملاء لرفع الثقة.",
  },
  videoReviews: {
    name: "تقييمات بالفيديو",
    description: "محتوى مرئي من العملاء لدعم قرار الشراء.",
  },
  reviewBadges: {
    name: "شارات الثقة",
    description: "إبراز التقييمات والتحقق الاجتماعي قرب المنتج.",
  },
  preOrder: {
    name: "الطلب المسبق",
    description: "بيع المنتجات قبل التوفر الكامل بالمخزون.",
  },
  inventorySignals: {
    name: "إشارات المخزون",
    description: "تنبيهات أوضح حول الكمية والتوفر والطلب.",
  },
  specialFulfillment: {
    name: "مسارات بيع خاصة",
    description: "تجهيز تدفقات بيع أو تنفيذ غير تقليدية.",
  },
  onHoldQueue: {
    name: "طابور التجهيز المعلق",
    description: "عرض 96 طلب معلق في مرحلة التجهيز لمتابعتها بنقرة واحدة.",
  },
  fastResolution: {
    name: "معالجة النواقص والتوريد",
    description: "تحديث حالات التجهيز ومتابعة أسباب التعليق لتسريع الشحن.",
  },
  expensesTracking: {
    name: "تتبع النفقات والمصروفات",
    description: "تسجيل فوري للمصروفات مع التمييز بين التشغيلي (OPEX) والأصول (CAPEX).",
  },
  treasuryManagement: {
    name: "إدارة الخزائن والحسابات المتعددة",
    description: "تتبع رصيد الخزينة الكاش، الحسابات البنكية، والمحافظ مع التحويل البيني.",
  },
  capitalInjections: {
    name: "إيداع رأس المال وضخ السيولة",
    description: "إثبات رأس المال التأسيسي وزيادات التمويل وسلف الشركاء.",
  },
  auditLedger: {
    name: "كشف حساب الخزائن الموحد",
    description: "سجل تراكمي لحظي لكل حركة مالية مع الرصيد بعد الحركة (Running Balance).",
  },
  overdraftGuard: {
    name: "صمام منع السحب على المكشوف",
    description: "حظر الصرف في حال عدم كفاية رصيد الخزينة للحفاظ على التوازن المحاسبي.",
  },
};

const POSITIONING_COPY: Record<string, PositioningDisplayItem> = {
  "facebook-ads-pro": {
    audience: "فرق التسويق والمتاجر التي تدير حملات مدفوعة باستمرار.",
    surface: "داخل لوحة الإعلانات والحملات ومتابعة الحسابات.",
    outcome: "تحكم أسرع في الأداء وتقليل الهدر اليدوي في إدارة الحملات.",
  },
  "analytics-basic": {
    audience: "أصحاب المتاجر والفرق التي تحتاج قراءة واضحة للأرقام.",
    surface: "داخل لوحات التحليل والتقارير اليومية.",
    outcome: "فهم أسرع للإيراد والطلبات والاتجاهات لاتخاذ قرار أفضل.",
  },
  "store-basic": {
    audience: "أي متجر عايز يدير منتجاته وطلباته وواجهة بيعه من مكان واحد.",
    surface: "داخل إدارة الطلبات والمنتجات والمتجر الإلكتروني.",
    outcome: "تشغيل كامل للمتجر — منتجات وطلبات وواجهة بيع — بدون تعقيد.",
  },
  "store-pro": {
    audience: "الشركات المتوسطة والكبيرة التي تحتاج مخازن متعددة وتقارير متقدمة.",
    surface: "داخل إدارة المخزون والتقارير وتكاملات المتجر.",
    outcome: "إدارة أوسع للمخزون والتقارير مع ميزات احترافية.",
  },
  "crm-lite": {
    audience: "الفرق الصغيرة التي تريد بداية منظمة لإدارة العملاء.",
    surface: "داخل ملفات العملاء والشرائح الأساسية.",
    outcome: "رؤية أوضح للعملاء بدون تكلفة إضافية.",
  },
  "conversion-suite": {
    audience: "المتاجر التي عندها زيارات وتريد رفع التحويل.",
    surface: "في صفحة المنتج والسلة ونقاط التحفيز داخل المتجر.",
    outcome: "رفع فرص الشراء وزيادة متوسط قيمة الطلب.",
  },
  "quantity-offers-pro": {
    audience: "المتاجر التي تبيع باقات أو ترغب في تكبير السلة.",
    surface: "داخل صفحة المنتج وخيارات العرض المتعدد.",
    outcome: "زيادة عدد القطع المباعة عبر عروض كميات واضحة.",
  },
  "ugc-reviews-pro": {
    audience: "المتاجر التي تحتاج ثقة اجتماعية أقوى قبل الشراء.",
    surface: "داخل صفحات المنتج وشارات الثقة.",
    outcome: "رفع المصداقية وتقليل تردد العميل قبل الدفع.",
  },
  "commerce-advanced": {
    audience: "المتاجر التي تحتاج سيناريوهات بيع أكثر مرونة.",
    surface: "داخل المنتج والمخزون والتنفيذ للحالات الخاصة.",
    outcome: "مرونة أعلى في البيع للحالات غير التقليدية.",
  },
  "order-preparation-hold": {
    audience: "فرق التجهيز والمستودعات والعمليات المسؤولة عن معالجة الطلبات المعلقة.",
    surface: "داخل صفحة تجهيز الطلبات المعلقة مباشرة.",
    outcome: "حل مشاكل التجهيز المعلق وسرعة شحن الطلبات المتوقفة.",
  },
  "treasury-expenses-pro": {
    audience: "أصحاب الشركات والمدراء الماليين الذين يرغبون في ضبط نفقات الشركة والخزائن ورأس المال بدقة متناهية.",
    surface: "داخل قسم الخزينة والنفقات — نظام FinOps متكامل بربط ذري لحظي.",
    outcome: "السيطرة التامة على سيولة الشركة ومعدل الحرق وصافي الأرباح دون فقدان أي قرش.",
  },
};

const PRICING_MODEL_ACCESS: Record<string, FeatureAccessKind> = {
  FREE: "FREE",
  PAY_PER_USE: "PAY_PER_USE",
  SUBSCRIPTION: "PAID",
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const humanizeKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeFeatureAccess = (
  value: unknown,
  fallback: FeatureAccessKind,
): FeatureAccessKind => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "FREE" || normalized === "PAY_PER_USE" || normalized === "PAID") {
    return normalized;
  }
  return fallback;
};

const normalizeRawFeatureItems = (features: unknown): RawFeatureItem[] => {
  if (!features) {
    return [];
  }

  if (typeof features === "string") {
    try {
      return normalizeRawFeatureItems(JSON.parse(features));
    } catch {
      return features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ key: item }));
    }
  }

  if (Array.isArray(features)) {
    return features.flatMap((item) => {
      if (typeof item === "string") {
        return [{ key: item }];
      }

      if (isRecord(item)) {
        const enabled = item.enabled;
        if (enabled === false) {
          return [];
        }

        const key =
          String(item.key || item.slug || item.name || item.id || "").trim() || "feature";

        return [
          {
            key,
            name: typeof item.name === "string" ? item.name : undefined,
            description:
              typeof item.description === "string" ? item.description : undefined,
            access: typeof item.access === "string" ? item.access : undefined,
          },
        ];
      }

      return [];
    });
  }

  if (isRecord(features)) {
    return Object.entries(features).flatMap(([key, value]) => {
      if (value === false || value === null || value === undefined) {
        return [];
      }

      if (value === true) {
        return [{ key }];
      }

      if (isRecord(value)) {
        if (value.enabled === false) {
          return [];
        }

        return [
          {
            key,
            name: typeof value.name === "string" ? value.name : undefined,
            description:
              typeof value.description === "string" ? value.description : undefined,
            access: typeof value.access === "string" ? value.access : undefined,
          },
        ];
      }

      return [{ key, description: String(value) }];
    });
  }

  return [];
};

export const getFeatureAccessKind = (pricingModel?: string): FeatureAccessKind =>
  PRICING_MODEL_ACCESS[String(pricingModel || "").trim().toUpperCase()] || "PAID";

export const getFeatureAccessLabel = (access: FeatureAccessKind) => {
  if (access === "FREE") {
    return "مجاني";
  }

  if (access === "PAY_PER_USE") {
    return "حسب الاستخدام";
  }

  return "مدفوع";
};

export const getFeatureAccessBadgeClasses = (access: FeatureAccessKind) => {
  if (access === "FREE") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
  }

  if (access === "PAY_PER_USE") {
    return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
};

export const getMarketplaceFeatureItems = (
  app: MarketplaceFeatureCarrier,
): FeatureDisplayItem[] => {
  const fallbackAccess = getFeatureAccessKind(app.pricingModel);

  return normalizeRawFeatureItems(app.features).map((feature) => {
    const catalogEntry = FEATURE_COPY[feature.key];

    return {
      key: feature.key,
      name: feature.name || catalogEntry?.name || humanizeKey(feature.key),
      description:
        feature.description ||
        catalogEntry?.description ||
        "ميزة إضافية ضمن هذه الأداة.",
      access: normalizeFeatureAccess(feature.access, fallbackAccess),
    };
  });
};

export const MARKETPLACE_POSITIONING_LABELS: Record<PositioningFieldKey, string> = {
  audience: "مناسبة لـ",
  surface: "تظهر في",
  outcome: "النتيجة",
};

export const getMarketplacePositioning = (
  app: MarketplacePositioningCarrier,
): PositioningDisplayItem | null => {
  const fallbackPositioning = POSITIONING_COPY[String(app.slug || "").trim()];
  const rawPositioning = app.positioning;

  if (!rawPositioning) {
    return fallbackPositioning || null;
  }

  if (typeof rawPositioning === "string") {
    try {
      return getMarketplacePositioning({
        ...app,
        positioning: JSON.parse(rawPositioning),
      });
    } catch {
      return fallbackPositioning || null;
    }
  }

  if (!isRecord(rawPositioning)) {
    return fallbackPositioning || null;
  }

  const normalizedPositioning: PositioningDisplayItem = {
    audience:
      (isNonEmptyString(rawPositioning.audience)
        ? rawPositioning.audience
        : fallbackPositioning?.audience) || "مناسبة لفرق تبحث عن قيمة تشغيلية أو نمو مباشر.",
    surface:
      (isNonEmptyString(rawPositioning.surface)
        ? rawPositioning.surface
        : fallbackPositioning?.surface) || "داخل مسار العمل المرتبط بهذه الأداة.",
    outcome:
      (isNonEmptyString(rawPositioning.outcome)
        ? rawPositioning.outcome
        : fallbackPositioning?.outcome) || "نتيجة أوضح وأسرع من تشغيل هذه الأداة.",
  };

  return normalizedPositioning;
};
