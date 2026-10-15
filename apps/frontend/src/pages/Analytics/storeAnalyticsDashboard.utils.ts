export interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  activeVisitors?: number;
  totalProductViews: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  naturalPurchases?: number;
  recoveredPurchases?: number;
  recoveredRevenue?: number;
  incompleteCarts?: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  deliveryRate?: number;
  totalRevenue: number;
  conversionRate: number;
  organicConversionRate?: number;
  realizedConversionRate?: number;
  potentialConversionRate?: number;
  conversionLift?: number;
  recoveryRate?: number;
  productConversionRate?: number;
  avgOrderValue: number;
  addToCartRate: number;
  checkoutRate: number;
  purchaseRate: number;
  totalOrders?: number;
  prevPeriod?: {
    totalOrders?: number;
    codOrders?: number;
    prepaidOrders?: number;
    cancelledOrders?: number;
    visits?: number;
    revenue?: number;
    purchases?: number;
    conversionRate?: number;
  } | null;
}

export interface ProfitStats {
  summary?: {
    totalRevenue: number;
    totalCOGS: number;
    totalShipping: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    totalOrders: number;
    avgOrderProfit: number;
  };
}

export interface TrendMetric {
  value: number;
  direction: "up" | "down" | "neutral";
  formatted: string;
  label: string;
}

export function calculateTrend(current: number, previous?: number | null): TrendMetric | null {
  if (previous == null || previous <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);
  if (absChange < 0.1) {
    return {
      value: 0,
      direction: "neutral",
      formatted: "0.0%",
      label: "مستقر مقارنة بآخر فترة",
    };
  }
  return {
    value: parseFloat(absChange.toFixed(1)),
    direction: change > 0 ? "up" : "down",
    formatted: `${change > 0 ? "+" : "-"}${absChange.toFixed(1)}%`,
    label: change > 0 ? "زيادة عن آخر فترة" : "نقص عن آخر فترة",
  };
}

export interface TopProduct {
  id: string;
  name: string;
  price: number | string;
  images?: string | string[] | null;
  image?: string | null;
  views: number | string;
  addToCarts: number | string;
  purchases?: number | string;
  sales?: number | string;
  conversionRate: number | string;
}

export interface DailyAnalyticsPoint {
  date: string;
  totalVisits: number | string;
  uniqueVisitors: number | string;
  totalProductViews: number | string;
  totalAddToCarts: number | string;
  totalCheckouts: number | string;
  totalPurchases: number | string;
  totalRevenue: number | string;
}

export interface FunnelMetric {
  key: string;
  label: string;
  value: number;
  visualShare: number;
  baselineRate: number;
  stepRate: number | null;
  exceedsVisits: boolean;
}

export interface AnalyticsNote {
  tone: "positive" | "neutral" | "attention";
  title: string;
  description: string;
}

export interface DataHealthStatus {
  tone: "healthy" | "partial" | "critical";
  label: string;
  title: string;
  description: string;
  issues: string[];
}

export const coerceNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const clampVisualPercent = (value: unknown): number => {
  const safeValue = coerceNumber(value);
  return Math.max(0, Math.min(100, safeValue));
};

export const parseProductImages = (
  images: TopProduct["images"],
): string[] => {
  if (Array.isArray(images)) {
    return images.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
    );
  }

  if (typeof images !== "string" || !images.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(images);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
};

export const getTopProductImage = (product: TopProduct): string | null => {
  if (typeof product.image === "string" && product.image.trim()) {
    return product.image;
  }

  return parseProductImages(product.images)[0] ?? null;
};

export const getTopProductPurchases = (product: TopProduct): number =>
  coerceNumber(product.purchases ?? product.sales);

export const getConversionTone = (
  rate: number | string,
): "excellent" | "good" | "emerging" | "cold" => {
  const safeRate = coerceNumber(rate);

  if (safeRate >= 10) {
    return "excellent";
  }

  if (safeRate >= 4) {
    return "good";
  }

  if (safeRate > 0) {
    return "emerging";
  }

  return "cold";
};

export const buildFunnelMetrics = (
  analytics: AnalyticsData | null,
): FunnelMetric[] => {
  if (!analytics) {
    return [];
  }

  const startedOrders = coerceNumber(analytics.checkouts);
  const steps = [
    {
      key: "visits",
      label: "زيارات المتجر",
      value: coerceNumber(analytics.totalVisits),
      canExceedVisits: false,
    },
    {
      key: "views",
      label: "مشاهدات المنتجات",
      value: coerceNumber(analytics.totalProductViews),
      canExceedVisits: true,
    },
    {
      key: "started-orders",
      label: "بدء الطلب",
      value: startedOrders,
      canExceedVisits: false,
    },
    {
      key: "purchases",
      label: "إتمام الشراء",
      value: coerceNumber(analytics.purchases),
      canExceedVisits: false,
    },
  ];

  const maxValue = Math.max(1, ...steps.map((step) => step.value));
  const baseline = steps[0]?.value || 0;

  return steps.map((step, index) => {
    const previousValue = index > 0 ? steps[index - 1].value : null;
    const baselineRate = baseline > 0 ? (step.value / baseline) * 100 : 0;
    const stepRate =
      previousValue && previousValue > 0 ? (step.value / previousValue) * 100 : null;

    return {
      ...step,
      visualShare: clampVisualPercent((step.value / maxValue) * 100),
      baselineRate,
      stepRate,
      exceedsVisits:
        index > 0 &&
        baseline > 0 &&
        step.value > baseline &&
        !step.canExceedVisits,
    };
  });
};

export const buildDataHealthStatus = (
  analytics: AnalyticsData | null,
  dailyData: DailyAnalyticsPoint[],
): DataHealthStatus => {
  if (!analytics) {
    return {
      tone: "critical",
      label: "غير متاحة",
      title: "تعذر قراءة البيانات",
      description: "ملخص الأداء الرئيسي غير متاح حاليًا، لذلك لا يمكن الاعتماد على هذه اللوحة بعد.",
      issues: ["ملخص الأداء الرئيسي لم يصل بعد."],
    };
  }

  const visits = coerceNumber(analytics.totalVisits);
  const uniqueVisitors = coerceNumber(analytics.uniqueVisitors);
  const productViews = coerceNumber(analytics.totalProductViews);
  const purchases = coerceNumber(analytics.purchases);
  const revenue = coerceNumber(analytics.totalRevenue);
  const hasDailyRevenueWithoutVisits =
    dailyData.some((point) => coerceNumber(point.totalRevenue) > 0) &&
    dailyData.every((point) => coerceNumber(point.totalVisits) === 0);

  const issues: string[] = [];

  if (visits === 0 && (productViews > 0 || purchases > 0 || revenue > 0)) {
    issues.push("هناك نشاط لاحق داخل المتجر، لكن زيارات المتجر نفسها غير مسجلة.");
  }

  if (uniqueVisitors === 0 && (productViews > 0 || purchases > 0)) {
    issues.push("الزوار الفريدون يساوون صفرًا رغم وجود تصفح أو شراء.");
  }

  if (revenue > 0 && purchases === 0) {
    issues.push("الإيراد مسجل من دون عدد مشتريات واضح.");
  }

  if (hasDailyRevenueWithoutVisits) {
    issues.push("الاتجاه اليومي يحمل إيرادًا من دون زيارات يومية مسجلة.");
  }

  if (issues.length >= 2) {
    return {
      tone: "critical",
      label: "تحتاج مراجعة",
      title: "جودة البيانات تحتاج مراجعة",
      description:
        "يوجد شراء أو تصفح لاحق، لكن بداية الرحلة غير مكتملة. راجع تتبع الزيارات قبل الاعتماد على معدل التحويل.",
      issues,
    };
  }

  if (issues.length === 1) {
    return {
      tone: "partial",
      label: "ناقصة جزئيًا",
      title: "البيانات جزئية",
      description:
        "يمكن قراءة الاتجاه العام، لكن توجد فجوة واحدة على الأقل في مسار التتبع يجب الانتباه لها.",
      issues,
    };
  }

  if (dailyData.length === 0) {
    return {
      tone: "partial",
      label: "بدون اتجاه يومي",
      title: "الاتجاه اليومي غير متاح",
      description:
        "الملخص العام موجود، لكننا لا نملك سلسلة يومية كافية لقراءة الإيقاع عبر الوقت.",
      issues: [],
    };
  }

  return {
    tone: "healthy",
    label: "مستقرة",
    title: "البيانات تبدو متماسكة",
    description: "يمكن الاعتماد على هذه اللوحة كقراءة يومية سريعة للحركة والتحويل.",
    issues: [],
  };
};

export const buildAnalyticsNotes = (
  analytics: AnalyticsData | null,
  dailyData: DailyAnalyticsPoint[],
): AnalyticsNote[] => {
  if (!analytics) {
    return [];
  }

  const notes: AnalyticsNote[] = [];
  const visits = coerceNumber(analytics.totalVisits);
  const uniqueVisitors = coerceNumber(analytics.uniqueVisitors);
  const productViews = coerceNumber(analytics.totalProductViews);
  const addToCarts = coerceNumber(analytics.addToCarts);
  const startedOrders = coerceNumber(analytics.checkouts);
  const purchases = coerceNumber(analytics.purchases);
  const dataHealth = buildDataHealthStatus(analytics, dailyData);

  if (dataHealth.issues.length > 0) {
    notes.push({
      tone: "attention",
      title: dataHealth.title,
      description: dataHealth.description,
    });
  }

  if (visits > 0 && purchases > visits) {
    notes.push({
      tone: "attention",
      title: "الفنل ليس خطيًا بالكامل",
      description:
        "عدد المشتريات أعلى من الزيارات المسجلة في نفس الفترة، لذلك الأفضل قراءة الإيراد والتحويل كإشارات أداء لا كممر خطي صارم.",
    });
  }

  if (startedOrders > addToCarts && startedOrders > 0) {
    notes.push({
      tone: "neutral",
      title: "السلة ليست المسار الوحيد",
      description:
        "عدد بدايات الطلب أعلى من إضافات السلة، ما يعني أن جزءًا من العملاء يطلبون مباشرة عبر الطلب السريع أو صفحة الدفع دون المرور بالسلة.",
    });
  }

  if (visits > 0 && productViews > visits * 2) {
    notes.push({
      tone: "neutral",
      title: "الاهتمام أعمق من الزيارة",
      description:
        "مشاهدات المنتجات تتكرر أكثر من مرة لكل زيارة، وهذا طبيعي غالبًا في المتاجر التي يقارن فيها العميل بين عدة منتجات قبل الشراء.",
    });
  }

  if (visits > 0 && uniqueVisitors > 0 && uniqueVisitors / visits >= 0.8) {
    notes.push({
      tone: "positive",
      title: "الزيارات ذات جودة جيدة",
      description:
        "معظم الزيارات تبدو قادمة من مستخدمين فريدين، ما يعني أن الحركة الحالية ليست مجرد تكرار جلسات قليلة.",
    });
  }

  if (dailyData.length === 0 && dataHealth.issues.length === 0) {
    notes.push({
      tone: "neutral",
      title: "لا توجد سلسلة يومية كافية",
      description:
        "ملخص الفترة متاح، لكن لا توجد بيانات يومية كافية لبناء قراءة اتجاهية أكثر دقة.",
    });
  }

  return notes.slice(0, 3);
};

export interface ExecutiveBriefing {
  headline: string;
  summary: string;
  tone: "positive" | "steady" | "attention";
  metricsSnapshot: string;
  actionSuggestion: {
    label: string;
    description: string;
    path: string;
  } | null;
}

export const generateExecutiveBriefing = (
  analytics: AnalyticsData | null,
  topProducts: TopProduct[],
  dataHealth: DataHealthStatus,
): ExecutiveBriefing => {
  if (!analytics) {
    return {
      headline: "جاري قراءة نبض المتجر...",
      summary: "بانتظار اكتمال جلب بيانات الزيارات والطلبات لتقديم القراءة التنفيذية الذكية.",
      tone: "steady",
      metricsSnapshot: "--",
      actionSuggestion: null,
    };
  }

  const visits = coerceNumber(analytics.totalVisits);
  const purchases = coerceNumber(analytics.purchases);
  const rate = coerceNumber(analytics.conversionRate);
  const revenue = coerceNumber(analytics.totalRevenue);

  if (dataHealth.tone === "critical") {
    return {
      headline: "تنبيه في مزامنة بيانات التتبع",
      summary: "تم رصد عمليات شراء أو تصفح منتجات مع وجود نقص في تسجيل الزيارات المرجعية. يُنصح بمراجعة إعدادات بكسل التتبع والسكربت لضمان دقة نسب التحويل.",
      tone: "attention",
      metricsSnapshot: `${purchases} طلب / بيانات زيارات غير مكتملة`,
      actionSuggestion: {
        label: "فحص إعدادات التتبع والـ Clarity",
        description: "تأكد من تفعيل سكربت التتبع وتوافقه مع كافة المتصفحات.",
        path: "/settings/clarity",
      },
    };
  }

  const starProduct = topProducts[0] ?? null;
  const starName = starProduct?.name || "المنتجات المميزة";
  const recoveredPurchases = coerceNumber(analytics.recoveredPurchases);
  const recoveredRevenue = coerceNumber(analytics.recoveredRevenue);
  const conversionLift = coerceNumber(analytics.conversionLift);
  const recoverySentence = recoveredPurchases > 0
    ? ` كما ساهم فريق المبيعات في استرداد ${recoveredPurchases} طلب من السلات غير المكتملة بقيمة ${recoveredRevenue.toLocaleString()} ج.م (+${conversionLift.toFixed(1)}% رفع في التحويل).`
    : "";

  if (rate >= 3.0 && purchases > 0) {
    return {
      headline: "أداء تحويلي ممتاز يفوق المعدل المعتاد",
      summary: `حقق المتجر معدل تحويل قوي (${rate.toFixed(1)}%) بإجمالي ${purchases} طلب وإيراد ${revenue.toLocaleString()} ج.م. يعتبر منتج "${starName}" هو القوة الدافعة الكبرى للطلبات.${recoverySentence}`,
      tone: "positive",
      metricsSnapshot: `${rate.toFixed(1)}% تحويل • ${purchases} طلب • ${visits.toLocaleString()} زيارة`,
      actionSuggestion: {
        label: "تعزيز الحملات الإعلانية على المنتج البطل",
        description: "زيادة الميزانية على المنتجات الأعلى تحويلاً يحقق أعلى عائد على الإنفاق.",
        path: "/analytics/orders/campaign-attribution",
      },
    };
  }

  if (rate >= 1.2 && purchases > 0) {
    return {
      headline: "أداء متزن مع فرص واعدة لمضاعفة الإيرادات",
      summary: `المتجر يسجل نشاطاً جيداً بمعدل تحويل (${rate.toFixed(1)}%). هناك زوار يترددون عند مرحلة السلة أو الطلب، ويمكنك استرجاع طلبات مؤكدة بتفعيل أدوات التسريع أو متابعة السلات.${recoverySentence}`,
      tone: "steady",
      metricsSnapshot: `${rate.toFixed(1)}% تحويل • ${purchases} طلب • ${visits.toLocaleString()} زيارة`,
      actionSuggestion: {
        label: "متابعة وتنشيط السلات المتروكة",
        description: "استرجع العملاء الذين أضافوا للسلة ولم يكملوا الطلب.",
        path: "/analytics/orders/abandoned-cart",
      },
    };
  }

  if (visits > 20 && purchases === 0) {
    return {
      headline: "حركة زيارات جيدة لكن التحويل يحتاج إلى دفعة فورية",
      summary: `سجل المتجر ${visits.toLocaleString()} زيارة دون إتمام طلبات بعد. قد يكون السبب في تكلفة الشحن، أو عدم وضوح زر الشراء، أو الحاجة لزر "شراء الآن بضغطة واحدة".`,
      tone: "attention",
      metricsSnapshot: `${visits.toLocaleString()} زيارة • 0 طلب`,
      actionSuggestion: {
        label: "تفعيل أدوات زيادة التحويل (شراء سريع / عداد الخصم)",
        description: "فعّل زر الشراء الفوري وشارات الثقة لتقليل تردد المشترين.",
        path: "/settings/store/tools",
      },
    };
  }

  return {
    headline: "نشاط المتجر في بداية الفترة",
    summary: `تم تسجيل ${visits} زيارة و ${purchases} طلب حتى الآن. يستمر المحرك في تجميع الحركة لتقديم رؤى أعمق مع استمرار الزيارات.`,
    tone: "steady",
    metricsSnapshot: `${visits} زيارة • ${purchases} طلب`,
    actionSuggestion: {
      label: "استكشاف مصادر وحملات الزيارات",
      description: "راقب مصادر الزيارات القادمة من فيسبوك وتيك توك لمعرفة الأفضل.",
      path: "/analytics/orders/campaign-attribution",
    },
  };
};

const shortDateFormatter = new Intl.DateTimeFormat("ar-EG", {
  month: "short",
  day: "numeric",
});

export const formatDateLabel = (value: string | number | Date | null | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return shortDateFormatter.format(date);
};

export const PERIOD_OPTIONS = [
  { value: "1", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "2", label: "اليوم وأمس" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
  { value: "180", label: "آخر 6 شهور" },
  { value: "365", label: "آخر سنة" },
  { value: "custom", label: "فترة مخصصة" },
];

export function buildDropOffAnalysis(
  totalVisits: number,
  totalViews: number,
  totalCarts: number,
  totalPurchases: number
) {
  if (totalVisits === 0) return null;
  const viewDrop = totalVisits > 0 ? ((totalVisits - totalViews) / totalVisits) * 100 : 0;
  const cartDrop = totalViews > 0 ? ((totalViews - totalCarts) / totalViews) * 100 : 0;
  const checkoutDrop = totalCarts > 0 ? ((totalCarts - totalPurchases) / totalCarts) * 100 : 0;

  if (totalCarts === 0 && totalPurchases > 0) {
    return {
      stage: "طلب سريع ومباشر",
      description: "المتجر يعتمد نموذج الطلب الفوري من صفحة المنتج متجاوزاً السلة.",
      recommendation: "أداء ممتاز! عزز سرعة نموذج الشراء الفوري وشارات الثقة.",
    };
  }
  if (viewDrop > 60 && totalVisits > 20) {
    return {
      stage: "بين الزيارة وتصفح المنتجات",
      description: `أكثر من ${viewDrop.toFixed(0)}% من الزوار يغادرون الصفحة الرئيسية دون تصفح صفحة منتج.`,
      recommendation: "قم بتحسين سرعة المتجر ووضع أفضل المنتجات مبيعاً في واجهة المتجر الرئيسية.",
    };
  }
  if (cartDrop > 70 && totalViews > 20) {
    return {
      stage: "بين مشاهدة المنتج والإضافة للسلة",
      description: `أكثر من ${cartDrop.toFixed(0)}% من مشاهدي المنتجات لا يضيفونها للسلة.`,
      recommendation: "راجع وضوح زر الشراء، صور المنتج، السعر، وتفعيل زر الشراء الفوري.",
    };
  }
  if (checkoutDrop > 50 && totalCarts > 5) {
    return {
      stage: "بين السلة وإتمام الطلب",
      description: `تسرب ملحوظ بنسبة ${checkoutDrop.toFixed(0)}% للعملاء بعد إضافة المنتج للسلة.`,
      recommendation: "فعّل رسائل استرجاع السلات المتروكة وبسط خطوات الدفع.",
    };
  }
  return {
    stage: "مسار التحويل متزن",
    description: "المسار بين الزيارات والطلبات يسير بنسب مقبولة دون انقطاع حاد.",
    recommendation: "استمر في زيادة حركة الزيارات المستهدفة من الحملات الإعلانية المربحة.",
  };
}
