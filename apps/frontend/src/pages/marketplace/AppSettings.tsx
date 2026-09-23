import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BadgePercent,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MessageSquare,
  Package,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Landmark,
  FileText,
} from "lucide-react";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";
import courierService from "../../services/courierService";
import {
  applyMarketplaceAppPreset,
  getDefaultMarketplaceAppSettings,
  normalizeMarketplaceAppSettings,
} from "../../config/marketplaceAppSettings";
import UpsellManualManager from "./UpsellManualManager";

type JsonRecord = Record<string, unknown>;

type ApiDataEnvelope<T> = {
  data?: T;
};

interface InstalledCompanyApp {
  id: string;
  status: string;
  settings?: JsonRecord | null;
  monthlyUsage?: {
    totalCost?: number;
    totalQuantity?: number;
  };
  app: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    pricingModel?: string;
  };
}

interface AppUsageLogEntry {
  id: string;
  feature?: string | null;
  quantity?: number | null;
  totalCost?: number | string | null;
  metadata?: JsonRecord | null;
  createdAt: string;
}

interface AppUsageByFeatureEntry {
  feature?: string | null;
  _sum?: {
    totalCost?: number | string | null;
    quantity?: number | null;
  };
  _count?: {
    id?: number | null;
  };
}

interface AppUsageResponseData {
  logs: AppUsageLogEntry[];
  summary: {
    totalCost: number;
    totalQuantity: number;
    totalActions: number;
  };
  byFeature: AppUsageByFeatureEntry[];
}

interface ReviewModerationItem {
  id: string;
  customerName: string;
  rating: number;
  title?: string | null;
  createdAt: string;
  products?: {
    id?: string;
    name?: string;
  } | null;
  product?: {
    id?: string;
    name?: string;
  } | null;
}

interface ReviewModerationInsights {
  total: number;
  pending: number;
  approved: number;
  latestPending: ReviewModerationItem[];
}

interface UsageFeatureTotals {
  actions: number;
  quantity: number;
  totalCost: number;
}

type UpsellCenterSectionId =
  | "overview"
  | "manual-links"
  | "product-page"
  | "cart-drawer"
  | "post-purchase"
  | "general";

const APP_TITLES: Record<string, string> = {
  "conversion-suite": "Conversion Suite",
  "ugc-reviews-pro": "UGC Reviews Pro",
  "commerce-advanced": "Commerce Advanced",
  "internal-courier-fleet": "أسطول المناديب والتوصيل الداخلي",
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const setDeepValue = (source: JsonRecord, path: string[], value: unknown): JsonRecord => {
  if (path.length === 0) return source;

  const [head, ...rest] = path;
  if (!head) {
    return source;
  }

  const current = isRecord(source[head]) ? source[head] : {};

  return {
    ...source,
    [head]:
      rest.length === 0 ? value : setDeepValue(current, rest, value),
  };
};

const ToggleField = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900/30">
    <div className="space-y-1">
      <div className="font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
    </div>
    <input
      type="checkbox"
      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-900/40"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "datetime-local";
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-900/40"
    />
  </label>
);

const InsightCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</div>
      <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{hint}</p>
  </div>
);

const QuickLinkCard = ({
  title,
  description,
  ctaLabel,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  icon: ReactNode;
  onClick: () => void;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:text-white dark:hover:border-blue-900/50 dark:hover:text-blue-300 dark:focus-visible:ring-blue-900/40"
    >
      {ctaLabel}
      <ExternalLink size={16} />
    </button>
  </div>
);

const StatusPill = ({
  active,
  activeLabel = "مفعّل",
  inactiveLabel = "متوقف",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    }`}
  >
    {active ? activeLabel : inactiveLabel}
  </span>
);

const PlacementMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</div>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{hint}</p>
  </div>
);

const PlacementCard = ({
  icon,
  eyebrow,
  title,
  description,
  status,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  status: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {icon}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {eyebrow}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{status}</div>
    </div>

    {children}
  </section>
);

const PreviewPill = ({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "blue" | "green" | "amber" | "neutral";
}) => {
  const toneClassMap = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    neutral: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
        toneClassMap[tone]
      }`}
    >
      {label}
    </span>
  );
};

const PlacementPreview = ({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 p-5 shadow-sm dark:border-gray-700 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
          Preview Snapshot
        </div>
        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>

    {children}
  </div>
);

const formatMoney = (value: number | string | null | undefined) => {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toSafeNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildUsageFeatureMap = (
  entries: AppUsageByFeatureEntry[] | undefined,
): Record<string, UsageFeatureTotals> => {
  const featureMap: Record<string, UsageFeatureTotals> = {};

  for (const entry of entries || []) {
    const featureKey = String(entry?.feature || "").trim();
    if (!featureKey) {
      continue;
    }

    featureMap[featureKey] = {
      actions: Number(entry?._count?.id || 0),
      quantity: Number(entry?._sum?.quantity || 0),
      totalCost: toSafeNumber(entry?._sum?.totalCost),
  };
}

  return featureMap;
};

interface ReviewListResponseData {
  pagination?: {
    total?: number | string | null;
  };
  reviews?: ReviewModerationItem[];
}

const getFeatureActionCount = (
  featureMap: Record<string, UsageFeatureTotals>,
  featureNames: string[],
) =>
  featureNames.reduce(
    (total, featureName) => total + Number(featureMap[featureName]?.actions || 0),
    0,
  );

const formatRate = (numerator: number, denominator: number) => {
  if (!denominator) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
};

export default function AppSettings() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companyApp, setCompanyApp] = useState<InstalledCompanyApp | null>(null);
  const [draftSettings, setDraftSettings] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usageInsights, setUsageInsights] = useState<AppUsageResponseData | null>(null);
  const [reviewInsights, setReviewInsights] = useState<ReviewModerationInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [billingSummary, setBillingSummary] = useState<{
    costs?: { subscriptions: number; usage: number; total: number };
    wallet?: { balance: number; currency: string };
    heldOrders?: { count: number; amount: number };
  } | null>(null);
  const [billingSummaryLoading, setBillingSummaryLoading] = useState(false);

  const normalizedSettings = useMemo(
    () => normalizeMarketplaceAppSettings(slug, draftSettings),
    [slug, draftSettings],
  );
  const generalSettings =
    (normalizedSettings["general"] as JsonRecord | undefined) || {};
  const modulesSettings =
    (normalizedSettings["modules"] as JsonRecord | undefined) || {};
  const uiSettings = (normalizedSettings["ui"] as JsonRecord | undefined) || {};
  const thresholdsSettings =
    (normalizedSettings["thresholds"] as JsonRecord | undefined) || {};
  const countdownSettings =
    (normalizedSettings["countdown"] as JsonRecord | undefined) || {};
  const copySettings = (normalizedSettings["copy"] as JsonRecord | undefined) || {};
  const focusMode = String(searchParams.get("focus") || "").trim().toLowerCase();
  const isUpsellCenter = slug === "conversion-suite" && focusMode === "upsell";
  const upsellSectionParam = String(searchParams.get("section") || "")
    .trim()
    .toLowerCase();
  const activeUpsellSection: UpsellCenterSectionId = (
    [
      "overview",
      "manual-links",
      "product-page",
      "cart-drawer",
      "post-purchase",
      "general",
    ] as string[]
  ).includes(upsellSectionParam)
    ? (upsellSectionParam as UpsellCenterSectionId)
    : "manual-links";

  const supported = Boolean(APP_TITLES[slug]);
  const pageTitle = isUpsellCenter
    ? "Upsell Center"
    : APP_TITLES[slug] || companyApp?.app?.name || "";
  const pageDescription = isUpsellCenter
    ? "مركز موحّد لإدارة الـ cross-sell و bought together و post-purchase upsell من نفس إعدادات الـ conversion suite."
    : companyApp?.app?.description ||
      "هذه الشاشة تتحكم في الإعدادات التي ستنعكس على الـ marketplace والـ storefront والقوالب.";
  const backDestination = isUpsellCenter
    ? "/settings/storefront/editor"
    : "/my-apps";
  const backLabel = isUpsellCenter
    ? "العودة إلى المحرر البصري"
    : "العودة إلى أدواتي";
  const topFeature = useMemo(() => {
    const byFeatureEntries = usageInsights?.byFeature || [];
    const features = [...byFeatureEntries];

    features.sort(
      (left, right) =>
        Number(right?._count?.id || 0) - Number(left?._count?.id || 0),
    );

    return features[0] || null;
  }, [usageInsights]);
  const usageFeatureMap = useMemo(
    () => buildUsageFeatureMap(usageInsights?.byFeature),
    [usageInsights],
  );
  const conversionJourney = useMemo(() => {
    const checkoutViews = getFeatureActionCount(usageFeatureMap, [
      "checkout_payment_view",
    ]);
    const checkoutClicks = getFeatureActionCount(usageFeatureMap, [
      "checkout_cta_click",
    ]);
    const orderAttempts = getFeatureActionCount(usageFeatureMap, [
      "order_submit_attempt",
    ]);
    const ordersCreated = getFeatureActionCount(usageFeatureMap, [
      "order_created",
      "duplicate_order_created",
    ]);
    const thankYouViews = getFeatureActionCount(usageFeatureMap, [
      "thank_you_view",
    ]);
    const couponAttempts = getFeatureActionCount(usageFeatureMap, [
      "coupon_validation_attempt",
    ]);
    const couponSuccesses = getFeatureActionCount(usageFeatureMap, [
      "coupon_validation_success",
    ]);
    const couponOrders = getFeatureActionCount(usageFeatureMap, [
      "coupon_applied_to_order",
    ]);
    const upsellViews = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_view",
      "post_purchase_recommendations_view",
    ]);
    const upsellClicks = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_click",
    ]);
    const upsellAdds = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_add_to_cart",
    ]);
    const continueShopping = getFeatureActionCount(usageFeatureMap, [
      "thank_you_continue_shopping",
    ]);
    const whatsappSupport = getFeatureActionCount(usageFeatureMap, [
      "thank_you_whatsapp_click",
    ]);
    const emailSupport = getFeatureActionCount(usageFeatureMap, [
      "thank_you_support_email_click",
    ]);
    const trackOrderClicks = getFeatureActionCount(usageFeatureMap, [
      "thank_you_track_order_click",
    ]);
    const trackOrderSuccesses = getFeatureActionCount(usageFeatureMap, [
      "thank_you_track_order_success",
    ]);
    const reorderClicks = getFeatureActionCount(usageFeatureMap, [
      "thank_you_reorder_click",
    ]);
    const reorderCompleted = getFeatureActionCount(usageFeatureMap, [
      "thank_you_reorder_completed",
    ]);

    return {
      checkoutViews,
      checkoutClicks,
      orderAttempts,
      ordersCreated,
      thankYouViews,
      couponAttempts,
      couponSuccesses,
      couponOrders,
      upsellViews,
      upsellClicks,
      upsellAdds,
      continueShopping,
      whatsappSupport,
      emailSupport,
      trackOrderClicks,
      trackOrderSuccesses,
      reorderClicks,
      reorderCompleted,
      postPurchaseActions:
        continueShopping +
        whatsappSupport +
        emailSupport +
        trackOrderClicks +
        reorderClicks,
    };
  }, [usageFeatureMap]);
  const upsellCenterMetrics = useMemo(
    () => ({
      crossSellViews: getFeatureActionCount(usageFeatureMap, ["cross_sell_section_view"]),
      boughtTogetherViews: getFeatureActionCount(usageFeatureMap, ["bought_together_view"]),
      boughtTogetherQuickAdds: getFeatureActionCount(usageFeatureMap, [
        "bought_together_quick_add",
      ]),
      boughtTogetherBundleAdds: getFeatureActionCount(usageFeatureMap, [
        "bought_together_bundle_add",
      ]),
      cartUpsellViews: getFeatureActionCount(usageFeatureMap, ["cart_upsell_view"]),
      cartUpsellQuickAdds: getFeatureActionCount(usageFeatureMap, [
        "cart_upsell_quick_add",
      ]),
      postPurchaseViews: conversionJourney.upsellViews,
      postPurchaseClicks: conversionJourney.upsellClicks,
      postPurchaseAdds: conversionJourney.upsellAdds,
    }),
    [conversionJourney, usageFeatureMap],
  );
  const activeUpsellPlacements = [
    Boolean(modulesSettings["crossSell"]),
    Boolean(modulesSettings["boughtTogether"]),
    Boolean(modulesSettings["postPurchaseUpsell"]),
  ].filter(Boolean).length;
  const cartPlacementEnabled = Boolean(
    modulesSettings["crossSell"] || modulesSettings["boughtTogether"],
  );
  const upsellFallbackSummary = (() => {
    const priceRange = Number(thresholdsSettings["upsellPriceRangePercent"] || 20);
    return priceRange > 0 ? `+${priceRange}%` : "بدون تفضيل سعري";
  })();
  const setUpsellSection = (section: UpsellCenterSectionId) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("focus", "upsell");
    nextSearchParams.set("section", section);
    setSearchParams(nextSearchParams, { replace: true });

    if (typeof document !== "undefined") {
      const anchorMap: Record<UpsellCenterSectionId, string> = {
        overview: "upsell-overview",
        "manual-links": "upsell-manual-links",
        "product-page": "upsell-product-page",
        "cart-drawer": "upsell-cart-drawer",
        "post-purchase": "upsell-post-purchase",
        general: "upsell-general-settings",
      };

      window.requestAnimationFrame(() => {
        document
          .getElementById(anchorMap[section])
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const fetchInstalledApp = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiDataEnvelope<InstalledCompanyApp[]>>(
        "/my-apps",
      );
      const installedApps = Array.isArray(response?.data?.data) ? response.data.data : [];
      const matchedApp = installedApps.find(
        (entry: InstalledCompanyApp) => entry?.app?.slug === slug,
      );

      if (!matchedApp) {
        setCompanyApp(null);
        setDraftSettings(getDefaultMarketplaceAppSettings(slug));
        return;
      }

      setCompanyApp(matchedApp);
      setDraftSettings(
        normalizeMarketplaceAppSettings(slug, matchedApp.settings || {}),
      );
    } catch (error: unknown) {
      console.error("Error loading app settings:", error);
      tToast.error("AppSettings.unable_load_9624");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchInsights = useCallback(async (installedApp: InstalledCompanyApp) => {
    try {
      setInsightsLoading(true);
      setBillingSummaryLoading(true);

      const requests: Promise<unknown>[] = [
        apiClient.get(`/my-apps/${installedApp.id}/usage`),
      ];

      const isPayPerUse = installedApp?.app?.pricingModel === "PAY_PER_USE";
      if (isPayPerUse) {
        requests.push(apiClient.get("/wallet/billing/summary"));
      }

      if (slug === "ugc-reviews-pro") {
        requests.push(
          apiClient.get("/reviews", { params: { page: 1, limit: 5 } }),
          apiClient.get("/reviews", { params: { page: 1, limit: 5, isApproved: false } }),
        );
      }

      const [usageResponse, billingResponse, allReviewsResponse, pendingReviewsResponse] =
        (await Promise.all(requests)) as [
          { data?: ApiDataEnvelope<AppUsageResponseData> },
          { data?: ApiDataEnvelope<{ costs?: object; wallet?: object; heldOrders?: object }> }?,
          { data?: ApiDataEnvelope<ReviewListResponseData> }?,
          { data?: ApiDataEnvelope<ReviewListResponseData> }?,
        ];

      setUsageInsights(
        (usageResponse?.data?.data as AppUsageResponseData | undefined) || {
          logs: [],
          byFeature: [],
          summary: {
            totalActions: 0,
            totalCost: 0,
            totalQuantity: 0,
          },
        },
      );

      if (isPayPerUse && billingResponse?.data?.data) {
        const billingData = billingResponse.data.data as {
          costs?: { subscriptions: number; usage: number; total: number };
          wallet?: { balance: number; currency: string };
          heldOrders?: { count: number; amount: number };
        };
        setBillingSummary({
          costs: billingData.costs,
          wallet: billingData.wallet,
          heldOrders: billingData.heldOrders,
        });
      } else {
        setBillingSummary(null);
      }

      if (slug === "ugc-reviews-pro") {
        const total =
          Number(allReviewsResponse?.data?.data?.pagination?.total) || 0;
        const pending =
          Number(pendingReviewsResponse?.data?.data?.pagination?.total) || 0;
        const latestPending = Array.isArray(pendingReviewsResponse?.data?.data?.reviews)
          ? (pendingReviewsResponse?.data?.data?.reviews as ReviewModerationItem[])
          : [];

        setReviewInsights({
          total,
          pending,
          approved: Math.max(total - pending, 0),
          latestPending,
        });
      } else {
        setReviewInsights(null);
      }
    } catch (error) {
      console.error("Error loading app insights:", error);
      setUsageInsights(null);
      setBillingSummary(null);
      if (slug === "ugc-reviews-pro") {
        setReviewInsights(null);
      }
    } finally {
      setInsightsLoading(false);
      setBillingSummaryLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    void fetchInstalledApp();
  }, [fetchInstalledApp, slug]);

  useEffect(() => {
    if (!companyApp?.id) {
      setUsageInsights(null);
      setReviewInsights(null);
      return;
    }

    void fetchInsights(companyApp);
  }, [companyApp, fetchInsights]);

  const updateAtPath = (path: string, value: unknown) => {
    setDraftSettings((current) =>
      setDeepValue(current || getDefaultMarketplaceAppSettings(slug), path.split("."), value),
    );
  };

  const applyPreset = (preset: string) => {
    setDraftSettings((current) => applyMarketplaceAppPreset(slug, current, preset));
  };

  const handleSave = async () => {
    if (!companyApp) {
      tToast.error("AppSettings.msg_565c");
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/my-apps/${companyApp.id}/settings`, {
        settings: normalizedSettings,
      });
      tToast.success("AppSettings.success_save_0151");
      setCompanyApp((current) =>
        current ? { ...current, settings: normalizedSettings } : current,
      );
    } catch (error) {
      console.error("Error saving app settings:", error);
      tToast.error("AppSettings.error_error_8032");
    } finally {
      setSaving(false);
    }
  };

  const renderConversionSuite = () => (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">الإعدادات العامة</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="تفعيل على المتجر"
            description="يشغّل أدوات التحويل داخل الـ storefront والثيم."
            checked={Boolean(generalSettings["enabled"])}
            onChange={(value) => updateAtPath("general.enabled", value)}
          />
          <ToggleField
            label="إدخال داخل القوالب"
            description="يسمح بإدراج Conversion Stack داخل القوالب الجديدة والجارية."
            checked={Boolean(generalSettings["renderInTemplates"])}
            onChange={(value) => updateAtPath("general.renderInTemplates", value)}
          />
          <ToggleField
            label="الربط مع Shell"
            description="يشغّل الـ global bars والـ overlays على مستوى المتجر بالكامل."
            checked={Boolean(generalSettings["attachToThemeShell"])}
            onChange={(value) => updateAtPath("general.attachToThemeShell", value)}
          />
          <SelectField
            label="Preset"
            value={String(generalSettings["preset"] || "balanced")}
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "balanced", label: "Balanced" },
              { value: "aggressive", label: "Aggressive" },
            ]}
            onChange={applyPreset}
          />
        </div>
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          Selecting a preset now applies the recommended activation mix and visual styles
          automatically. You can still fine-tune any module below before saving.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">أدوات صفحة المنتج</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="Sale Countdown"
            description="عرض مؤقت العرض داخل PDP Conversion Stack."
            checked={Boolean(modulesSettings["saleCountdown"])}
            onChange={(value) => updateAtPath("modules.saleCountdown", value)}
          />
          <ToggleField
            label="Low Stock Notice"
            description="تنبيه انخفاض المخزون عندما يقترب المنتج من النفاد."
            checked={Boolean(modulesSettings["lowStockNotice"])}
            onChange={(value) => updateAtPath("modules.lowStockNotice", value)}
          />
          <ToggleField
            label="Bulk Savings"
            description="إظهار خصومات الكمية المتاحة على المنتج."
            checked={Boolean(modulesSettings["bulkSavings"])}
            onChange={(value) => updateAtPath("modules.bulkSavings", value)}
          />
          <ToggleField
            label="Trusted Badges"
            description="Visual reassurance badges for payment, delivery, and returns inside Conversion Stack."
            checked={Boolean(modulesSettings["trustedBadges"])}
            onChange={(value) => updateAtPath("modules.trustedBadges", value)}
          />
          <ToggleField
            label="Estimated Delivery"
            description="عرض مدة التوصيل المتوقعة بجانب معلومات التحويل."
            checked={Boolean(modulesSettings["estimatedDelivery"])}
            onChange={(value) => updateAtPath("modules.estimatedDelivery", value)}
          />
          <ToggleField
            label="Cross Sell"
            description="تجهيز hooks للبيع الإضافي بعد الإضافة للسلة."
            checked={Boolean(modulesSettings["crossSell"])}
            onChange={(value) => updateAtPath("modules.crossSell", value)}
          />
          <ToggleField
            label="Bought Together"
            description="تجهيز مساحة مخصصة لاقتراح المنتجات التي تشترى معًا."
            checked={Boolean(modulesSettings["boughtTogether"])}
            onChange={(value) => updateAtPath("modules.boughtTogether", value)}
          />
          <ToggleField
            label="Post-purchase Upsell"
            description="تشغيل اقتراحات الإضافة بعد إتمام الطلب داخل صفحة النجاح."
            checked={Boolean(modulesSettings["postPurchaseUpsell"])}
            onChange={(value) => updateAtPath("modules.postPurchaseUpsell", value)}
          />
          <ToggleField
            label="Back In Stock"
            description="تفعيل نموذج waitlist عند نفاد المنتج من Conversion Stack."
            checked={Boolean(modulesSettings["backInStock"])}
            onChange={(value) => updateAtPath("modules.backInStock", value)}
          />
          <ToggleField
            label="Sold Counter"
            description="Display lifetime purchase count using real order activity for this product."
            checked={Boolean(modulesSettings["soldCounter"])}
            onChange={(value) => updateAtPath("modules.soldCounter", value)}
          />
          <ToggleField
            label="Purchase FOMO"
            description="Show demand from active carts first, then recent orders, then waitlist fallback when needed."
            checked={Boolean(modulesSettings["purchaseFomo"])}
            onChange={(value) => updateAtPath("modules.purchaseFomo", value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">أدوات عامة على مستوى المتجر</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="Free Shipping Bar"
            description="شريط ثابت يحفّز العميل للوصول إلى حد الشحن المجاني."
            checked={Boolean(modulesSettings["freeShippingBar"])}
            onChange={(value) => updateAtPath("modules.freeShippingBar", value)}
          />
          <ToggleField
            label="Sticky Add To Cart"
            description="تمكين الـ sticky host الخاص بزر الإضافة للسلة."
            checked={Boolean(modulesSettings["stickyAddToCart"])}
            onChange={(value) => updateAtPath("modules.stickyAddToCart", value)}
          />
          <ToggleField
            label="Exit Intent Popup"
            description="تجهيز popup عند نية الخروج للزائر."
            checked={Boolean(modulesSettings["exitIntentPopup"])}
            onChange={(value) => updateAtPath("modules.exitIntentPopup", value)}
          />
          <ToggleField
            label="Inactive Tab"
            description="تغيير عنوان التبويب عند مغادرة المستخدم للصفحة."
            checked={Boolean(modulesSettings["inactiveTab"])}
            onChange={(value) => updateAtPath("modules.inactiveTab", value)}
          />
          <ToggleField
            label="Fake Visitor Counter"
            description="إتاحة عداد الزوار المحاكى كجزء من social proof."
            checked={Boolean(modulesSettings["fakeVisitorCounter"])}
            onChange={(value) => updateAtPath("modules.fakeVisitorCounter", value)}
          />
          <ToggleField
            label="Fake Sale Popup"
            description="إتاحة popup مبيعات محاكى على مستوى المتجر."
            checked={Boolean(modulesSettings["fakeSalePopup"])}
            onChange={(value) => updateAtPath("modules.fakeSalePopup", value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="PDP Variant"
          value={String(uiSettings["pdpVariant"] || "balanced")}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "balanced", label: "Balanced" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.pdpVariant", value)}
        />
        <SelectField
          label="Popup Style"
          value={String(uiSettings["popupStyle"] || "minimal")}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "promo", label: "Promo" },
            { value: "coupon", label: "Coupon" },
          ]}
          onChange={(value) => updateAtPath("ui.popupStyle", value)}
        />
        <SelectField
          label="Countdown Style"
          value={String(uiSettings["countdownStyle"] || "timer")}
          options={[
            { value: "timer", label: "Timer" },
            { value: "split", label: "Split" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.countdownStyle", value)}
        />
        <SelectField
          label="Trusted Badge Style"
          value={String(uiSettings["trustedBadgeStyle"] || "strip")}
          options={[
            { value: "strip", label: "Strip" },
            { value: "grid", label: "Grid" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.trustedBadgeStyle", value)}
        />
        <SelectField
          label="Bought Together Style"
          value={String(uiSettings["boughtTogetherStyle"] || "stacked")}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "compact", label: "Compact" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.boughtTogetherStyle", value)}
        />
        <SelectField
          label="Cart Upsell Style"
          value={String(uiSettings["cartUpsellStyle"] || "stacked")}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "compact", label: "Compact" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.cartUpsellStyle", value)}
        />
        <SelectField
          label="Bar Position"
          value={String(uiSettings["barPosition"] || "top")}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(value) => updateAtPath("ui.barPosition", value)}
        />
        <SelectField
          label="Sticky Add To Cart Style"
          value={String(uiSettings["stickyStyle"] || "compact")}
          options={[
            { value: "compact", label: "Compact" },
            { value: "balanced", label: "Balanced" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.stickyStyle", value)}
        />
        <SelectField
          label="Low Stock Style"
          value={String(uiSettings["lowStockStyle"] || "alert")}
          options={[
            { value: "alert", label: "Alert" },
            { value: "meter", label: "Meter" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.lowStockStyle", value)}
        />
        <SelectField
          label="Estimated Delivery Style"
          value={String(uiSettings["estimatedDeliveryStyle"] || "card")}
          options={[
            { value: "card", label: "Card" },
            { value: "timeline", label: "Timeline" },
            { value: "pill", label: "Pill" },
          ]}
          onChange={(value) => updateAtPath("ui.estimatedDeliveryStyle", value)}
        />
        <SelectField
          label="Fake Visitor Style"
          value={String(uiSettings["fakeVisitorStyle"] || "pulse")}
          options={[
            { value: "pulse", label: "Pulse" },
            { value: "ticker", label: "Ticker" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.fakeVisitorStyle", value)}
        />
        <SelectField
          label="Sold Counter Style"
          value={String(uiSettings["soldCounterStyle"] || "spotlight")}
          options={[
            { value: "spotlight", label: "Spotlight" },
            { value: "badge", label: "Badge" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.soldCounterStyle", value)}
        />
        <SelectField
          label="Purchase FOMO Style"
          value={String(uiSettings["purchaseFomoStyle"] || "alert")}
          options={[
            { value: "alert", label: "Alert" },
            { value: "timeline", label: "Timeline" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.purchaseFomoStyle", value)}
        />
        <SelectField
          label="Back In Stock Style"
          value={String(uiSettings["backInStockStyle"] || "panel")}
          options={[
            { value: "panel", label: "Panel" },
            { value: "inline", label: "Inline" },
            { value: "accent", label: "Accent" },
          ]}
          onChange={(value) => updateAtPath("ui.backInStockStyle", value)}
        />
        <TextField
          label="حد المخزون المنخفض"
          type="number"
          value={Number(thresholdsSettings["lowStockLimit"] || 5)}
          onChange={(value) => updateAtPath("thresholds.lowStockLimit", Number(value) || 0)}
        />
        <TextField
          label="حد الشحن المجاني"
          type="number"
          value={Number(thresholdsSettings["freeShippingAmount"] || 0)}
          onChange={(value) =>
            updateAtPath("thresholds.freeShippingAmount", Number(value) || 0)
          }
        />
        <TextField
          label="Upsell price range (%)"
          type="number"
          value={Number(thresholdsSettings["upsellPriceRangePercent"] || 20)}
          onChange={(value) =>
            updateAtPath("thresholds.upsellPriceRangePercent", Number(value) || 0)
          }
        />
        <TextField
          label="نافذة السلات النشطة (بالساعات)"
          type="number"
          value={Number(thresholdsSettings["purchaseFomoCartWindowHours"] || 24)}
          onChange={(value) =>
            updateAtPath("thresholds.purchaseFomoCartWindowHours", Number(value) || 0)
          }
        />
        <TextField
          label="نافذة الطلبات الحديثة (بالساعات)"
          type="number"
          value={Number(thresholdsSettings["purchaseFomoRecentPurchaseWindowHours"] || 48)}
          onChange={(value) =>
            updateAtPath(
              "thresholds.purchaseFomoRecentPurchaseWindowHours",
              Number(value) || 0,
            )
          }
        />
        <TextField
          label="حد انتظار الطلب عند fallback"
          type="number"
          value={Number(thresholdsSettings["purchaseFomoWaitlistFallbackLimit"] || 18)}
          onChange={(value) =>
            updateAtPath(
              "thresholds.purchaseFomoWaitlistFallbackLimit",
              Number(value) || 0,
            )
          }
        />
        <TextField
          label="حد الزوار الوهمي الأدنى"
          type="number"
          value={Number(thresholdsSettings["fakeVisitorMin"] || 6)}
          onChange={(value) =>
            updateAtPath("thresholds.fakeVisitorMin", Number(value) || 0)
          }
        />
        <TextField
          label="حد الزوار الوهمي الأقصى"
          type="number"
          value={Number(thresholdsSettings["fakeVisitorMax"] || 22)}
          onChange={(value) =>
            updateAtPath("thresholds.fakeVisitorMax", Number(value) || 0)
          }
        />
        <TextField
          label="نهاية العد التنازلي"
          type="datetime-local"
          value={String(countdownSettings["endsAt"] || "")}
          onChange={(value) => updateAtPath("countdown.endsAt", value)}
        />
        <TextField
          label="رسالة التبويب غير النشط"
          value={String(copySettings["inactiveTabTitle"] || "")}
          onChange={(value) => updateAtPath("copy.inactiveTabTitle", value)}
        />
        <TextField
          label="رسالة الشحن المجاني"
          value={String(copySettings["freeShippingMessage"] || "")}
          onChange={(value) => updateAtPath("copy.freeShippingMessage", value)}
        />
        <TextField
          label="رسالة FOMO للسلات"
          value={String(copySettings["purchaseFomoCartMessage"] || "")}
          onChange={(value) => updateAtPath("copy.purchaseFomoCartMessage", value)}
          placeholder="{{count}} shoppers currently have this in their cart"
        />
        <TextField
          label="رسالة FOMO للطلبات الحديثة"
          value={String(copySettings["purchaseFomoRecentMessage"] || "")}
          onChange={(value) => updateAtPath("copy.purchaseFomoRecentMessage", value)}
          placeholder="{{count}} orders included this product in the last {{hours}} hours"
        />
        <TextField
          label="رسالة FOMO للانتظار"
          value={String(copySettings["purchaseFomoWaitlistMessage"] || "")}
          onChange={(value) => updateAtPath("copy.purchaseFomoWaitlistMessage", value)}
          placeholder="{{count}} shoppers asked to be notified when this product returns"
        />
        <TextField
          label="Back In Stock Title"
          value={String(copySettings["backInStockTitle"] || "")}
          onChange={(value) => updateAtPath("copy.backInStockTitle", value)}
        />
        <TextField
          label="Back In Stock Description"
          value={String(copySettings["backInStockDescription"] || "")}
          onChange={(value) => updateAtPath("copy.backInStockDescription", value)}
        />
        <TextField
          label="Back In Stock Success"
          value={String(copySettings["backInStockSuccessMessage"] || "")}
          onChange={(value) => updateAtPath("copy.backInStockSuccessMessage", value)}
        />
        <TextField
          label="Trusted Badge Title"
          value={String(copySettings["trustedBadgeTitle"] || "")}
          onChange={(value) => updateAtPath("copy.trustedBadgeTitle", value)}
        />
        <TextField
          label="Trusted Badge Subtitle"
          value={String(copySettings["trustedBadgeSubtitle"] || "")}
          onChange={(value) => updateAtPath("copy.trustedBadgeSubtitle", value)}
        />
        <TextField
          label="Trusted Badge Items"
          value={String(copySettings["trustedBadgeItems"] || "")}
          onChange={(value) => updateAtPath("copy.trustedBadgeItems", value)}
          placeholder="Secure checkout, Visa & Mastercard, Cash on delivery"
        />
        <TextField
          label="Cart Upsell Badge"
          value={String(copySettings["cartUpsellBadge"] || "")}
          onChange={(value) => updateAtPath("copy.cartUpsellBadge", value)}
        />
        <TextField
          label="Cart Upsell Title"
          value={String(copySettings["cartUpsellTitle"] || "")}
          onChange={(value) => updateAtPath("copy.cartUpsellTitle", value)}
        />
        <TextField
          label="Cart Upsell Description"
          value={String(copySettings["cartUpsellDescription"] || "")}
          onChange={(value) => updateAtPath("copy.cartUpsellDescription", value)}
        />
        <TextField
          label="Post-purchase Upsell Badge"
          value={String(copySettings["postPurchaseUpsellBadge"] || "")}
          onChange={(value) => updateAtPath("copy.postPurchaseUpsellBadge", value)}
        />
        <TextField
          label="Post-purchase Upsell Title"
          value={String(copySettings["postPurchaseUpsellTitle"] || "")}
          onChange={(value) => updateAtPath("copy.postPurchaseUpsellTitle", value)}
        />
        <TextField
          label="Post-purchase Upsell Description"
          value={String(copySettings["postPurchaseUpsellDescription"] || "")}
          onChange={(value) => updateAtPath("copy.postPurchaseUpsellDescription", value)}
        />
        <TextField
          label="Cross Sell Title"
          value={String(copySettings["crossSellTitle"] || "")}
          onChange={(value) => updateAtPath("copy.crossSellTitle", value)}
        />
        <TextField
          label="Cross Sell Description"
          value={String(copySettings["crossSellDescription"] || "")}
          onChange={(value) => updateAtPath("copy.crossSellDescription", value)}
        />
        <TextField
          label="Bought Together Title"
          value={String(copySettings["boughtTogetherTitle"] || "")}
          onChange={(value) => updateAtPath("copy.boughtTogetherTitle", value)}
        />
        <TextField
          label="Bought Together Description"
          value={String(copySettings["boughtTogetherDescription"] || "")}
          onChange={(value) => updateAtPath("copy.boughtTogetherDescription", value)}
        />
        <TextField
          label="Bundle Add Label"
          value={String(copySettings["bundleAddLabel"] || "")}
          onChange={(value) => updateAtPath("copy.bundleAddLabel", value)}
        />
        <TextField
          label="Bundle Total Label"
          value={String(copySettings["bundleTotalLabel"] || "")}
          onChange={(value) => updateAtPath("copy.bundleTotalLabel", value)}
        />
        <TextField
          label="Current Product Label"
          value={String(copySettings["bundleCurrentLabel"] || "")}
          onChange={(value) => updateAtPath("copy.bundleCurrentLabel", value)}
        />
        <TextField
          label="Recommendation Label"
          value={String(copySettings["bundleRecommendationLabel"] || "")}
          onChange={(value) => updateAtPath("copy.bundleRecommendationLabel", value)}
        />
        <TextField
          label="Bundle Variant Hint"
          value={String(copySettings["bundleVariantHint"] || "")}
          onChange={(value) => updateAtPath("copy.bundleVariantHint", value)}
        />
        <TextField
          label="Quick Add Label"
          value={String(copySettings["quickAddLabel"] || "")}
          onChange={(value) => updateAtPath("copy.quickAddLabel", value)}
        />
        <TextField
          label="Choose Options Label"
          value={String(copySettings["chooseOptionsLabel"] || "")}
          onChange={(value) => updateAtPath("copy.chooseOptionsLabel", value)}
        />
        <TextField
          label="Exit Intent Title"
          value={String(copySettings["exitIntentTitle"] || "")}
          onChange={(value) => updateAtPath("copy.exitIntentTitle", value)}
        />
        <TextField
          label="Exit Intent Description"
          value={String(copySettings["exitIntentDescription"] || "")}
          onChange={(value) => updateAtPath("copy.exitIntentDescription", value)}
        />
        <TextField
          label="Exit Intent Coupon"
          value={String(copySettings["exitIntentCouponCode"] || "")}
          onChange={(value) => updateAtPath("copy.exitIntentCouponCode", value)}
        />
        <TextField
          label="Exit Intent CTA"
          value={String(copySettings["exitIntentPrimaryLabel"] || "")}
          onChange={(value) => updateAtPath("copy.exitIntentPrimaryLabel", value)}
        />
        <TextField
          label="Exit Intent Secondary"
          value={String(copySettings["exitIntentSecondaryLabel"] || "")}
          onChange={(value) => updateAtPath("copy.exitIntentSecondaryLabel", value)}
        />
      </section>
    </div>
  );

  const renderUpsellCenter = () => {
    const sections: Array<{
      id: UpsellCenterSectionId;
      title: string;
      description: string;
      icon: ReactNode;
      badge: string;
    }> = [
      {
        id: "overview",
        title: "نظرة عامة",
        description: "ملخص سريع، خطوات العمل، والروابط الأساسية.",
        icon: <Sparkles size={18} />,
        badge: `${activeUpsellPlacements}/3`,
      },
      {
        id: "manual-links",
        title: "ربط المنتجات",
        description: "اختيار المنتج وإدارة Related وCross-sell وUpsell.",
        icon: <BadgePercent size={18} />,
        badge: "Manual",
      },
      {
        id: "product-page",
        title: "صفحة المنتج",
        description: "Related و Cross-sell و Bought Together.",
        icon: <Package size={18} />,
        badge: `${[
          Boolean(modulesSettings["crossSell"]),
          Boolean(modulesSettings["boughtTogether"]),
        ].filter(Boolean).length}/2`,
      },
      {
        id: "cart-drawer",
        title: "السلة",
        description: "اقتراحات الـ cart drawer والـ quick add.",
        icon: <ShoppingCart size={18} />,
        badge: cartPlacementEnabled ? "Live" : "Off",
      },
      {
        id: "post-purchase",
        title: "ما بعد الشراء",
        description: "Upsell صفحة الشكر وتفضيل السعر.",
        icon: <Mail size={18} />,
        badge: modulesSettings["postPurchaseUpsell"] ? "Live" : "Off",
      },
      {
        id: "general",
        title: "إعدادات عامة",
        description: "المحرك العام، الـ preset، والنصوص المشتركة.",
        icon: <Settings2 size={18} />,
        badge: String(generalSettings["preset"] || "balanced"),
      },
    ];

    return (
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start xl:sticky xl:top-24">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="px-2">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                Upsell Center
              </div>
              <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                أقسام الصفحة
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
                افتح القسم المطلوب مباشرة بدل التنقل داخل صفحة طويلة.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {sections.map((section) => {
                const isActive = section.id === activeUpsellSection;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setUpsellSection(section.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100"
                        : "border-transparent bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white dark:bg-gray-900/60 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isActive
                          ? "bg-white text-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                          : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {section.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{section.title}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                            isActive
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                              : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {section.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
                        {section.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <div className={activeUpsellSection === "overview" ? "space-y-8" : "hidden"}>
      <section
        id="upsell-overview"
        className="scroll-mt-24 overflow-hidden rounded-[32px] border border-blue-200 bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 p-6 text-white shadow-xl dark:border-blue-900/50"
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
              <Sparkles size={14} />
              Upsell Operator View
            </div>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white">
                شاشة تشغيل يومية لإدارة أماكن الـ upsell بدل قائمة إعدادات طويلة
              </h2>
              <p className="max-w-3xl text-sm leading-8 text-blue-50/90">
                ابدأ من المكان الذي تريد تحسينه: صفحة المنتج، السلة، أو صفحة الشكر. فعّل
                المكان، اضبط النصوص الأساسية، ثم راقب المشاهدات والتحويل من نفس الصفحة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                active={Boolean(generalSettings["enabled"])}
                activeLabel="المحرك العام شغال"
                inactiveLabel="المحرك العام متوقف"
              />
              <StatusPill
                active={Boolean(generalSettings["renderInTemplates"])}
                activeLabel="Hooks القوالب جاهزة"
                inactiveLabel="Hooks القوالب غير جاهزة"
              />
              <StatusPill
                active
                activeLabel="Manual links أولًا ثم fallback"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "1. فعّل مكان الظهور الذي تريد العمل عليه.",
                "2. افتح تبويب ربط المنتجات واختر الـ Related أو Cross-sell أو Upsell لكل منتج.",
                "3. احفظ ثم راجع الأداء من usage أو من المتجر نفسه.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-7 text-blue-50/90 backdrop-blur"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlacementMetric
              label="Placements Live"
              value={`${activeUpsellPlacements}/3`}
              hint="عدد أماكن الـ upsell المفعلة الآن بين المنتج، السلة، وصفحة الشكر."
            />
            <PlacementMetric
              label="Cart Quick Adds"
              value={`${upsellCenterMetrics.cartUpsellQuickAdds}`}
              hint={`${formatRate(
                upsellCenterMetrics.cartUpsellQuickAdds,
                upsellCenterMetrics.cartUpsellViews,
              )} من مشاهدات السلة تحولت إلى إضافة سريعة.`}
            />
            <PlacementMetric
              label="Post-Purchase Adds"
              value={`${upsellCenterMetrics.postPurchaseAdds}`}
              hint={`${formatRate(
                upsellCenterMetrics.postPurchaseAdds,
                upsellCenterMetrics.postPurchaseViews,
              )} من زوار صفحة الشكر أضافوا منتجًا إضافيًا.`}
            />
            <PlacementMetric
              label="Fallback Range"
              value={upsellFallbackSummary}
              hint="النطاق السعري الذي يفضّل منتجات أعلى سعرًا عند غياب الربط اليدوي."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QuickLinkCard
          title="ربط المنتجات يدويًا"
          description="افتح مدير الربط لاختيار المنتج الأساسي ثم إدارة العلاقات من نفس الشاشة."
          ctaLabel="فتح المدير"
          icon={<Package size={18} />}
          onClick={() => setUpsellSection("manual-links")}
        />
        <QuickLinkCard
          title="ترتيب أماكن الظهور"
          description="حرّك بلوكات صفحة المنتج والسلة وصفحة الشكر من محرر الـ storefront."
          ctaLabel="فتح المحرر"
          icon={<ShoppingCart size={18} />}
          onClick={() => navigate("/settings/storefront/editor")}
        />
        <QuickLinkCard
          title="مراجعة الأداء"
          description="افتح usage لتراجع views وCTR والإضافات للسلة قبل تعديل النسخ أو الـ styles."
          ctaLabel="فتح usage"
          icon={<BarChart3 size={18} />}
          onClick={() => navigate("/my-apps/conversion-suite/usage")}
        />
      </section>
          </div>

      <div
        id="upsell-manual-links"
        className={activeUpsellSection === "manual-links" ? "scroll-mt-24" : "hidden"}
      >
        <UpsellManualManager active={activeUpsellSection === "manual-links"} />
      </div>

      <div
        id="upsell-product-page"
        className={activeUpsellSection === "product-page" ? "scroll-mt-24" : "hidden"}
      >
        <PlacementCard
          icon={<Package size={20} />}
          eyebrow="Product Page"
          title="صفحة المنتج"
          description="من هنا تدير ما يظهر أسفل المنتج مباشرة: related / cross-sell و bought together. هذا هو المكان الأساسي لرفع قيمة السلة قبل الوصول للدفع."
          status={
            <>
              <StatusPill
                active={Boolean(modulesSettings["crossSell"])}
                activeLabel="Cross-sell شغال"
                inactiveLabel="Cross-sell متوقف"
              />
              <StatusPill
                active={Boolean(modulesSettings["boughtTogether"])}
                activeLabel="Bundle شغال"
                inactiveLabel="Bundle متوقف"
              />
            </>
          }
        >
        <div className="grid gap-4 md:grid-cols-3">
          <PlacementMetric
            label="Cross-sell Views"
            value={`${upsellCenterMetrics.crossSellViews}`}
            hint="مرات ظهور بلوك related/cross-sell على صفحة المنتج."
          />
          <PlacementMetric
            label="Bundle Views"
            value={`${upsellCenterMetrics.boughtTogetherViews}`}
            hint="مرات ظهور بلوك bought together على صفحة المنتج."
          />
          <PlacementMetric
            label="Bundle Add Rate"
            value={formatRate(
              upsellCenterMetrics.boughtTogetherQuickAdds +
                upsellCenterMetrics.boughtTogetherBundleAdds,
              upsellCenterMetrics.boughtTogetherViews,
            )}
            hint="تحويلات سريعة من الباندل سواء Quick Add أو Add Bundle."
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="كيف سيظهر أسفل المنتج"
            description="المعاينة هنا تختصر للمستخدم شكل البلوكين الأساسيين في صفحة المنتج: منتجات مكملة، ثم باقة bought together."
            badge={<PreviewPill label="PDP" tone="blue" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/60">
                <div className="grid grid-cols-[84px_1fr] gap-4">
                  <div className="h-24 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900" />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded-full bg-blue-100 dark:bg-blue-900/40" />
                      <div className="h-4 w-3/4 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="h-3 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <PreviewPill label="المنتج الحالي" tone="neutral" />
                      <PreviewPill label="قبل المراجعات" tone="amber" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {String(copySettings["crossSellTitle"] || "You may also like")}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {String(
                        copySettings["crossSellDescription"] ||
                          "اقتراحات مكملة تظهر مباشرة بعد وصف المنتج.",
                      )}
                    </p>
                  </div>
                  <PreviewPill
                    label={modulesSettings["crossSell"] ? "cross-sell" : "related"}
                    tone="green"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div
                      key={`product-preview-card-${item}`}
                      className="rounded-2xl border border-white/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="h-20 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                      <div className="mt-3 h-3 w-3/4 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-3 w-12 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                          {String(copySettings["quickAddLabel"] || "Quick add")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {String(copySettings["boughtTogetherTitle"] || "Frequently bought together")}
                  </div>
                  <PreviewPill
                    label={String(uiSettings["boughtTogetherStyle"] || "stacked")}
                    tone="amber"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    المنتج الحالي
                  </span>
                  <span>+</span>
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    إضافة مقترحة
                  </span>
                  <span>+</span>
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    منتج ثالث
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
                  {String(copySettings["bundleAddLabel"] || "Add selected bundle")}
                </div>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              User Flow
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              ما الذي يفهمه العميل هنا؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "يشاهد المنتج الأساسي أولًا ثم يرى اقتراحات مرتبطة بدون أن يترك الصفحة.",
                "يستوعب الفرق بين اقتراح مكمل سريع وبين باقة كاملة ترفع قيمة السلة.",
                "يعرف الإجراء المطلوب فورًا لأن الـ CTA ظاهر داخل كل بطاقة أو داخل الباندل.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <ToggleField
              label="Cross-sell / Related"
              description="يشغّل بلوك المنتجات المكملة داخل صفحة المنتج، ويغذي أيضًا جزءًا من اقتراحات السلة."
              checked={Boolean(modulesSettings["crossSell"])}
              onChange={(value) => updateAtPath("modules.crossSell", value)}
            />
            <ToggleField
              label="Bought Together"
              description="يشغّل باقة المنتجات التي تشتري مع المنتج الحالي داخل صفحة المنتج."
              checked={Boolean(modulesSettings["boughtTogether"])}
              onChange={(value) => updateAtPath("modules.boughtTogether", value)}
            />
            <SelectField
              label="Bought Together Style"
              value={String(uiSettings["boughtTogetherStyle"] || "stacked")}
              options={[
                { value: "stacked", label: "Stacked" },
                { value: "compact", label: "Compact" },
                { value: "editorial", label: "Editorial" },
              ]}
              onChange={(value) => updateAtPath("ui.boughtTogetherStyle", value)}
            />
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              الربط اليدوي للمنتجات لا يتم من هذا الجزء. افتح تبويب
              <span className="font-semibold text-gray-900 dark:text-white">
                {" "}
                ربط المنتجات
              </span>{" "}
              لإدارة Related / Cross-sell / Upsell، أو افتح صفحة المنتج لو أردت تعديل
              باقي إعداداته.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Cross Sell Title"
              value={String(copySettings["crossSellTitle"] || "")}
              onChange={(value) => updateAtPath("copy.crossSellTitle", value)}
            />
            <TextField
              label="Cross Sell Description"
              value={String(copySettings["crossSellDescription"] || "")}
              onChange={(value) => updateAtPath("copy.crossSellDescription", value)}
            />
            <TextField
              label="Bought Together Title"
              value={String(copySettings["boughtTogetherTitle"] || "")}
              onChange={(value) => updateAtPath("copy.boughtTogetherTitle", value)}
            />
            <TextField
              label="Bought Together Description"
              value={String(copySettings["boughtTogetherDescription"] || "")}
              onChange={(value) => updateAtPath("copy.boughtTogetherDescription", value)}
            />
          </div>
        </div>
        </PlacementCard>
      </div>

      <div
        id="upsell-cart-drawer"
        className={activeUpsellSection === "cart-drawer" ? "scroll-mt-24" : "hidden"}
      >
        <PlacementCard
          icon={<ShoppingCart size={20} />}
          eyebrow="Cart Drawer"
          title="السلة"
          description="هذا الجزء يركّز على رفع قيمة السلة بسرعة من الـ cart drawer. يعتمد على نفس محرك cross-sell و bought together، لكنه يملك copy وstyle خاصين به."
          status={
            <>
              <StatusPill
                active={cartPlacementEnabled}
                activeLabel="السلة جاهزة"
                inactiveLabel="السلة غير نشطة"
              />
              <StatusPill
                active={Boolean(modulesSettings["crossSell"])}
                activeLabel="Related داخل السلة"
                inactiveLabel="Related متوقف"
              />
            </>
          }
        >
        <div className="grid gap-4 md:grid-cols-3">
          <PlacementMetric
            label="Cart Views"
            value={`${upsellCenterMetrics.cartUpsellViews}`}
            hint="مرات ظهور اقتراحات الـ upsell داخل الـ cart drawer."
          />
          <PlacementMetric
            label="Quick Adds"
            value={`${upsellCenterMetrics.cartUpsellQuickAdds}`}
            hint="عدد الإضافات السريعة من داخل السلة."
          />
          <PlacementMetric
            label="Quick Add Rate"
            value={formatRate(
              upsellCenterMetrics.cartUpsellQuickAdds,
              upsellCenterMetrics.cartUpsellViews,
            )}
            hint="نسبة تحويل مشاهدات السلة إلى Quick Add."
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="كيف ستظهر داخل الـ cart drawer"
            description="المستخدم يفتح السلة ليراجع الطلب، ثم يشاهد اقتراحًا واحدًا أو أكثر بخطوة شراء أسرع من صفحة المنتج."
            badge={<PreviewPill label="Cart Drawer" tone="blue" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    Your cart
                  </div>
                  <PreviewPill label="Drawer" tone="neutral" />
                </div>
                <div className="mt-3 space-y-3">
                  {[1, 2].map((item) => (
                    <div
                      key={`cart-line-${item}`}
                      className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900"
                    >
                      <div className="h-12 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                      <div>
                        <div className="h-3 w-2/3 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <div className="mt-2 h-3 w-1/3 rounded-full bg-gray-200 dark:bg-gray-800" />
                      </div>
                      <div className="h-3 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PreviewPill
                        label={String(copySettings["cartUpsellBadge"] || "Complete the order")}
                        tone="green"
                      />
                    </div>
                    <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                      {String(copySettings["cartUpsellTitle"] || "Add one more item before checkout")}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {String(
                        copySettings["cartUpsellDescription"] ||
                          "اقتراحات سريعة بدون مغادرة السلة.",
                      )}
                    </p>
                  </div>
                  <PreviewPill
                    label={String(uiSettings["cartUpsellStyle"] || "stacked")}
                    tone="blue"
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-white/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
                    <div className="h-14 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                    <div>
                      <div className="h-3 w-3/4 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="mt-2 h-3 w-1/3 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white">
                      {String(copySettings["quickAddLabel"] || "Quick add")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              User Intent
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              لماذا هذا الشكل مهم؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "العميل داخل السلة أصلًا، لذلك يجب أن يكون الاقتراح أسرع وأخف من صفحة المنتج.",
                "أفضل CTA هنا هو quick add أو choose options بدون تشتيت أو شبكة منتجات كبيرة.",
                "النسخة يجب أن تكون قصيرة جدًا لأنها تظهر بجوار subtotal وقرار الدفع.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <SelectField
              label="Cart Upsell Style"
              value={String(uiSettings["cartUpsellStyle"] || "stacked")}
              options={[
                { value: "stacked", label: "Stacked" },
                { value: "compact", label: "Compact" },
                { value: "editorial", label: "Editorial" },
              ]}
              onChange={(value) => updateAtPath("ui.cartUpsellStyle", value)}
            />
            <TextField
              label="Quick Add Label"
              value={String(copySettings["quickAddLabel"] || "")}
              onChange={(value) => updateAtPath("copy.quickAddLabel", value)}
            />
            <TextField
              label="Choose Options Label"
              value={String(copySettings["chooseOptionsLabel"] || "")}
              onChange={(value) => updateAtPath("copy.chooseOptionsLabel", value)}
            />
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              السلة تستخدم أول منتج موجود حاليًا كمصدر للاقتراحات، ثم تجلب
              related و bundle بحسب التفعيل أعلى الصفحة.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Cart Upsell Badge"
              value={String(copySettings["cartUpsellBadge"] || "")}
              onChange={(value) => updateAtPath("copy.cartUpsellBadge", value)}
            />
            <TextField
              label="Cart Upsell Title"
              value={String(copySettings["cartUpsellTitle"] || "")}
              onChange={(value) => updateAtPath("copy.cartUpsellTitle", value)}
            />
            <TextField
              label="Cart Upsell Description"
              value={String(copySettings["cartUpsellDescription"] || "")}
              onChange={(value) => updateAtPath("copy.cartUpsellDescription", value)}
            />
            <TextField
              label="Bundle Variant Hint"
              value={String(copySettings["bundleVariantHint"] || "")}
              onChange={(value) => updateAtPath("copy.bundleVariantHint", value)}
            />
          </div>
        </div>
        </PlacementCard>
      </div>

      <div
        id="upsell-post-purchase"
        className={activeUpsellSection === "post-purchase" ? "scroll-mt-24" : "hidden"}
      >
        <PlacementCard
          icon={<Mail size={20} />}
          eyebrow="Thank You Page"
          title="ما بعد الشراء"
          description="هنا تدير العرض الذي يظهر بعد نجاح الطلب. هذا هو أقرب مكان لتحويل إضافي سريع دون تشتيت العميل أثناء الدفع."
          status={
            <>
              <StatusPill
                active={Boolean(modulesSettings["postPurchaseUpsell"])}
                activeLabel="Post-purchase شغال"
                inactiveLabel="Post-purchase متوقف"
              />
            </>
          }
        >
        <div className="grid gap-4 md:grid-cols-3">
          <PlacementMetric
            label="Thank You Views"
            value={`${upsellCenterMetrics.postPurchaseViews}`}
            hint="مرات ظهور بلوك الـ upsell بعد نجاح الطلب."
          />
          <PlacementMetric
            label="Upsell CTR"
            value={formatRate(
              upsellCenterMetrics.postPurchaseClicks,
              upsellCenterMetrics.postPurchaseViews,
            )}
            hint="نسبة النقر على منتجات الـ upsell من صفحة الشكر."
          />
          <PlacementMetric
            label="Add-To-Cart Rate"
            value={formatRate(
              upsellCenterMetrics.postPurchaseAdds,
              upsellCenterMetrics.postPurchaseViews,
            )}
            hint="كم مشاهدة انتهت بإضافة منتج إضافي للسلة."
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="كيف ستظهر بعد نجاح الطلب"
            description="المستخدم هنا أنهى الشراء بالفعل، لذلك العرض يجب أن يبدو كإضافة لطيفة بعد النجاح لا كتعطيل لرحلة الدفع."
            badge={<PreviewPill label="Thank You" tone="green" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-emerald-600 p-2 text-white">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      تم تأكيد الطلب بنجاح
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      Order #10482 has been placed and the customer is now on the thank-you page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PreviewPill
                        label={String(copySettings["postPurchaseUpsellBadge"] || "Recommended next")}
                        tone="blue"
                      />
                      <PreviewPill label={upsellFallbackSummary} tone="amber" />
                    </div>
                    <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                      {String(
                        copySettings["postPurchaseUpsellTitle"] || "You may also like after this order",
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {String(
                        copySettings["postPurchaseUpsellDescription"] ||
                          "عرض إضافي بعد الشراء يعتمد على الربط اليدوي أولًا ثم fallback.",
                      )}
                    </p>
                  </div>
                  <PreviewPill
                    label={modulesSettings["postPurchaseUpsell"] ? "Active" : "Off"}
                    tone={modulesSettings["postPurchaseUpsell"] ? "green" : "neutral"}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-white/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                    <div className="h-16 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                    <div>
                      <div className="h-3 w-2/3 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="mt-2 h-3 w-1/4 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">
                      Add to cart
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              UX Notes
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              كيف يشعر العميل هنا؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "يرى أولًا رسالة النجاح ثم العرض الإضافي، لذلك لا يحدث تضارب بين التأكيد والبيع.",
                "وجود badge واضح وعرض واحد قوي أفضل من شبكة مزدحمة بعد إتمام الطلب.",
                "كلما كانت العلاقات اليدوية بين المنتجات أدق، زادت فرصة أن يبدو العرض منطقيًا لا عشوائيًا.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <ToggleField
              label="Post-purchase Upsell"
              description="يشغّل بلوك المنتجات المقترحة بعد نجاح الطلب داخل صفحة الشكر."
              checked={Boolean(modulesSettings["postPurchaseUpsell"])}
              onChange={(value) => updateAtPath("modules.postPurchaseUpsell", value)}
            />
            <TextField
              label="Upsell Price Range (%)"
              type="number"
              value={Number(thresholdsSettings["upsellPriceRangePercent"] || 20)}
              onChange={(value) =>
                updateAtPath("thresholds.upsellPriceRangePercent", Number(value) || 0)
              }
            />
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              إذا لم تربط منتجات upsell يدويًا، سيحاول النظام اقتراح منتجات من نفس الفئة
              مع تفضيل سعري يصل إلى <span className="font-semibold">{upsellFallbackSummary}</span>.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Post-purchase Upsell Badge"
              value={String(copySettings["postPurchaseUpsellBadge"] || "")}
              onChange={(value) => updateAtPath("copy.postPurchaseUpsellBadge", value)}
            />
            <TextField
              label="Post-purchase Upsell Title"
              value={String(copySettings["postPurchaseUpsellTitle"] || "")}
              onChange={(value) => updateAtPath("copy.postPurchaseUpsellTitle", value)}
            />
            <TextField
              label="Post-purchase Upsell Description"
              value={String(copySettings["postPurchaseUpsellDescription"] || "")}
              onChange={(value) => updateAtPath("copy.postPurchaseUpsellDescription", value)}
            />
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
              أفضل نتيجة هنا تأتي من منتجات مرتبطة يدويًا لكل منتج، وليس من الـ fallback فقط.
            </div>
          </div>
        </div>
        </PlacementCard>
      </div>

      <section
        id="upsell-general-settings"
        className={`scroll-mt-24 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
          activeUpsellSection === "general" ? "" : "hidden"
        }`}
      >
        <div className="mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
          <Settings2 size={20} />
          <div>
            <h2 className="text-2xl font-black">الإعدادات العامة والنصوص الثانوية</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              هذه الإعدادات أقل استخدامًا يوميًا، لكنها تؤثر على طريقة العرض الافتراضية
              والنسخ المساندة داخل الباندل والسلة.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="خريطة التحكم العامة"
            description="هذا القسم لا يخص مكان ظهور واحد، بل يحدد إذا كان المحرك كله يعمل وكيف يوزع النسخ والقوالب المشتركة عبر كل الـ placements."
            badge={<PreviewPill label="Engine" tone="blue" />}
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Product Page",
                    status: modulesSettings["crossSell"] || modulesSettings["boughtTogether"],
                    note: "Related + Bundle",
                  },
                  {
                    title: "Cart Drawer",
                    status: cartPlacementEnabled,
                    note: "Quick add",
                  },
                  {
                    title: "Thank You",
                    status: modulesSettings["postPurchaseUpsell"],
                    note: "Post-purchase",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </div>
                      <PreviewPill
                        label={item.status ? "Live" : "Off"}
                        tone={item.status ? "green" : "neutral"}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <PreviewPill
                    label={generalSettings["enabled"] ? "Engine on" : "Engine off"}
                    tone={generalSettings["enabled"] ? "green" : "neutral"}
                  />
                  <PreviewPill
                    label={
                      generalSettings["renderInTemplates"]
                        ? "Templates ready"
                        : "Templates off"
                    }
                    tone={generalSettings["renderInTemplates"] ? "blue" : "neutral"}
                  />
                  <PreviewPill
                    label={String(generalSettings["preset"] || "balanced")}
                    tone="amber"
                  />
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
                  أي تغيير هنا ينعكس على أكثر من placement، لذلك هذه الشاشة مناسبة لصاحب
                  المتجر أو المسؤول عن conversion logic بالكامل.
                </p>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              Admin Guidance
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              متى أستخدم هذا القسم؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "عندما تريد تشغيل أو إيقاف المنطق كله بدل تعديل placement واحد فقط.",
                "عندما تريد تغيير الـ preset أو النصوص المشتركة المستخدمة في أكثر من مكان.",
                "عندما تحتاج التأكد أن الـ hooks جاهزة داخل القوالب قبل اختبار الظهور على المتجر.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleField
              label="تفعيل الـ Conversion Suite"
              description="إذا أغلقت هذا الزر سيتوقف منطق الـ upsell بالكامل على المتجر."
              checked={Boolean(generalSettings["enabled"])}
              onChange={(value) => updateAtPath("general.enabled", value)}
            />
            <ToggleField
              label="إدخال داخل القوالب"
              description="يبقي الـ hooks الخاصة بالتوصيات جاهزة داخل القوالب والثيم الحالي."
              checked={Boolean(generalSettings["renderInTemplates"])}
              onChange={(value) => updateAtPath("general.renderInTemplates", value)}
            />
            <ToggleField
              label="الربط مع Shell"
              description="يشغّل المكونات المرتبطة بالـ storefront shell على مستوى المتجر."
              checked={Boolean(generalSettings["attachToThemeShell"])}
              onChange={(value) => updateAtPath("general.attachToThemeShell", value)}
            />
            <SelectField
              label="Preset"
              value={String(generalSettings["preset"] || "balanced")}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "balanced", label: "Balanced" },
                { value: "aggressive", label: "Aggressive" },
              ]}
              onChange={applyPreset}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Bundle Add Label"
              value={String(copySettings["bundleAddLabel"] || "")}
              onChange={(value) => updateAtPath("copy.bundleAddLabel", value)}
            />
            <TextField
              label="Bundle Total Label"
              value={String(copySettings["bundleTotalLabel"] || "")}
              onChange={(value) => updateAtPath("copy.bundleTotalLabel", value)}
            />
            <TextField
              label="Current Product Label"
              value={String(copySettings["bundleCurrentLabel"] || "")}
              onChange={(value) => updateAtPath("copy.bundleCurrentLabel", value)}
            />
            <TextField
              label="Recommendation Label"
              value={String(copySettings["bundleRecommendationLabel"] || "")}
              onChange={(value) => updateAtPath("copy.bundleRecommendationLabel", value)}
            />
          </div>
        </div>
      </section>
        </div>
      </div>
    );
  };

  const renderUgcReviews = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField
          label="تفعيل على المتجر"
          description="تشغيل مراجعات الصور والفيديو داخل واجهة المتجر."
          checked={Boolean(generalSettings["enabled"])}
          onChange={(value) => updateAtPath("general.enabled", value)}
        />
        <ToggleField
          label="Photo Reviews"
          description="السماح بالمراجعات المصورة."
          checked={Boolean(modulesSettings["photoReviews"])}
          onChange={(value) => updateAtPath("modules.photoReviews", value)}
        />
        <ToggleField
          label="Video Reviews"
          description="السماح بمراجعات الفيديو."
          checked={Boolean(modulesSettings["videoReviews"])}
          onChange={(value) => updateAtPath("modules.videoReviews", value)}
        />
        <ToggleField
          label="Verified Badge"
          description="إبراز المشتري الموثق داخل البطاقات."
          checked={Boolean(modulesSettings["verifiedBadge"])}
          onChange={(value) => updateAtPath("modules.verifiedBadge", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Gallery Style"
          value={String(uiSettings["galleryStyle"] || "mosaic")}
          options={[
            { value: "mosaic", label: "Mosaic" },
            { value: "carousel", label: "Carousel" },
            { value: "stack", label: "Stack" },
          ]}
          onChange={(value) => updateAtPath("ui.galleryStyle", value)}
        />
        <SelectField
          label="Card Style"
          value={String(uiSettings["cardStyle"] || "elevated")}
          options={[
            { value: "elevated", label: "Elevated" },
            { value: "minimal", label: "Minimal" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.cardStyle", value)}
        />
      </div>
    </div>
  );

  const renderCommerceAdvanced = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField
          label="Pre Order"
          description="إظهار حالة الطلب المسبق على صفحة المنتج."
          checked={Boolean(modulesSettings["preOrder"])}
          onChange={(value) => updateAtPath("modules.preOrder", value)}
        />
        <ToggleField
          label="External / Affiliate"
          description="إظهار زر شراء خارجي أو رابط Affiliate عند توفره."
          checked={Boolean(modulesSettings["externalAffiliate"])}
          onChange={(value) => updateAtPath("modules.externalAffiliate", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Pre Order Style"
          value={String(uiSettings["preOrderStyle"] || "banner")}
          options={[
            { value: "banner", label: "Banner" },
            { value: "chip", label: "Chip" },
            { value: "card", label: "Card" },
          ]}
          onChange={(value) => updateAtPath("ui.preOrderStyle", value)}
        />
        <SelectField
          label="External Link Style"
          value={String(uiSettings["externalLinkStyle"] || "button")}
          options={[
            { value: "button", label: "Button" },
            { value: "inline", label: "Inline" },
            { value: "card", label: "Card" },
          ]}
          onChange={(value) => updateAtPath("ui.externalLinkStyle", value)}
        />
        <TextField
          label="نص الطلب المسبق"
          value={String(copySettings["preOrderLabel"] || "")}
          onChange={(value) => updateAtPath("copy.preOrderLabel", value)}
        />
        <TextField
          label="نص الزر الخارجي"
          value={String(copySettings["affiliateLabel"] || "")}
          onChange={(value) => updateAtPath("copy.affiliateLabel", value)}
        />
      </div>
    </div>
  );

  const renderInsights = () => {
    if (isUpsellCenter) {
      return null;
    }

    const summary = usageInsights?.summary || {
      totalActions: 0,
      totalCost: Number(companyApp?.monthlyUsage?.totalCost || 0),
      totalQuantity: Number(companyApp?.monthlyUsage?.totalQuantity || 0),
    };
    const recentLogs = Array.isArray(usageInsights?.logs)
      ? usageInsights!.logs.slice(0, 5)
      : [];

    return (
      <div className="mb-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Insights & Maintenance
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              متابعة سريعة لاستخدام التطبيق وروابط الإدارة المرتبطة به من نفس الشاشة.
            </p>
          </div>
          {slug === "ugc-reviews-pro" ? (
            <button
              onClick={() => navigate("/products/reviews")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <ExternalLink size={16} />
              فتح إدارة التقييمات
            </button>
          ) : null}
        </div>

        {insightsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`insight-skeleton-${index}`}
                className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-5 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4 h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard
              label="إجمالي الاستخدام"
              value={`${summary.totalActions || 0}`}
              hint="عدد العمليات المسجلة داخل هذا التطبيق خلال الفترة الحالية."
              icon={<BarChart3 size={18} />}
            />
            <InsightCard
              label="الكمية المحسوبة"
              value={`${summary.totalQuantity || 0}`}
              hint="إجمالي الكميات أو الأحداث التي تم احتسابها من features التطبيق."
              icon={<Clock3 size={18} />}
            />
            <InsightCard
              label="التكلفة الشهرية"
              value={formatMoney(summary.totalCost)}
              hint="إجمالي التكلفة المسجلة في usage logs لهذا التطبيق."
              icon={<Package size={18} />}
            />
            <InsightCard
              label="أكثر Feature نشاطًا"
              value={String(topFeature?.feature || "No activity")}
              hint={
                topFeature
                  ? `${Number(topFeature?._count?.id || 0)} actions tracked for this feature.`
                  : "لا توجد usage logs مسجلة حتى الآن."
              }
              icon={<Sparkles size={18} />}
            />
          </div>
        )}

        {companyApp?.app?.pricingModel === "PAY_PER_USE" && !billingSummaryLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Package size={18} />
              <span className="font-semibold">المحاسبة المالية — دفع حسب الاستخدام</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <div className="text-sm text-gray-500 dark:text-gray-400">رصيد المحفظة</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(billingSummary?.wallet?.balance ?? 0)}
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    {billingSummary?.wallet?.currency || "EGP"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <div className="text-sm text-gray-500 dark:text-gray-400">استخدام الشهر الحالي</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(billingSummary?.costs?.usage ?? 0)}
                </div>
              </div>
              <div
                className={`rounded-xl p-4 ${
                  Number(billingSummary?.heldOrders?.count || 0) > 0
                    ? "bg-amber-50 dark:bg-amber-900/20"
                    : "bg-gray-50 dark:bg-gray-900/50"
                }`}
              >
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  {Number(billingSummary?.heldOrders?.count || 0) > 0 && (
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                  )}
                  الطلبات المعلّقة بانتظار الشحن
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {billingSummary?.heldOrders?.count ?? 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Number(billingSummary?.heldOrders?.amount || 0) > 0
                    ? `مستحق: ${formatMoney(billingSummary?.heldOrders?.amount ?? 0)}`
                    : "لا توجد طلبات معلّقة"}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <button
                  onClick={() => navigate("/payments")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  شحن الرصيد
                  <ExternalLink size={16} />
                </button>
                {Number(billingSummary?.heldOrders?.count || 0) > 0 ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    عند شحن الرصيد يُخصم المبلغ المستحق وتظهر الطلبات تلقائياً.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {slug === "conversion-suite" && !insightsLoading ? (
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <ShoppingCart size={18} />
                <span className="font-semibold">Journey Snapshot</span>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Checkout payment views",
                    value: conversionJourney.checkoutViews,
                    hint: "عدد مرات الوصول إلى خطوة الدفع النهائية داخل الـ storefront.",
                  },
                  {
                    label: "Checkout CTA clicks",
                    value: conversionJourney.checkoutClicks,
                    hint: "ضغطات زر الانتقال من السلة إلى صفحة الـ checkout.",
                  },
                  {
                    label: "Order submit attempts",
                    value: conversionJourney.orderAttempts,
                    hint: "محاولات تأكيد الطلب بعد اختيار الدفع والشحن.",
                  },
                  {
                    label: "Orders created",
                    value: conversionJourney.ordersCreated,
                    hint: "طلبات تم إنشاؤها فعليًا من الـ storefront.",
                  },
                  {
                    label: "Thank-you views",
                    value: conversionJourney.thankYouViews,
                    hint: "عملاء وصلوا فعلًا إلى صفحة نجاح الطلب.",
                  },
                  {
                    label: "Upsell block views",
                    value: conversionJourney.upsellViews,
                    hint: "عدد مرات ظهور بلوك ما بعد الشراء داخل صفحة النجاح.",
                  },
                  {
                    label: "Upsell clicks",
                    value: conversionJourney.upsellClicks,
                    hint: "النقرات على منتجات الـ upsell بعد إتمام الطلب.",
                  },
                  {
                    label: "Track-order checks",
                    value: conversionJourney.trackOrderClicks,
                    hint: "How many times customers opened order tracking from thank-you.",
                  },
                  {
                    label: "Reorders completed",
                    value: conversionJourney.reorderCompleted,
                    hint: "Completed reorder actions that pushed the original items back to cart.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {item.hint}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InsightCard
                  label="Coupon Success"
                  value={`${conversionJourney.couponSuccesses}`}
                  hint={`${formatRate(
                    conversionJourney.couponSuccesses,
                    conversionJourney.couponAttempts,
                  )} success rate from coupon validations.`}
                  icon={<BadgePercent size={18} />}

                />
                <InsightCard
                  label="Coupon Orders"
                  value={`${conversionJourney.couponOrders}`}
                  hint="عدد الطلبات التي تم فيها تطبيق كوبون بنجاح عند الإرسال."
                  icon={<Sparkles size={18} />}
                />
                <InsightCard
                  label="Order Completion"
                  value={formatRate(
                    conversionJourney.ordersCreated,
                    conversionJourney.orderAttempts,
                  )}
                  hint={`${conversionJourney.ordersCreated} orders from ${conversionJourney.orderAttempts} submit attempts.`}
                  icon={<CheckCircle2 size={18} />}
                />
                <InsightCard
                  label="Post-Purchase Actions"
                  value={`${conversionJourney.postPurchaseActions}`}
                  hint="إجمالي الرجوع للمتجر أو طلب الدعم بعد صفحة النجاح."
                  icon={<Mail size={18} />}
                />
                <InsightCard
                  label="Upsell Adds"
                  value={`${conversionJourney.upsellAdds}`}
                  hint="عدد الإضافات للسلة من بلوك ما بعد الشراء."
                  icon={<ShoppingCart size={18} />}
                />
                <InsightCard
                  label="Track Order Success"
                  value={`${conversionJourney.trackOrderSuccesses}`}
                  hint="Successful order lookups from the thank-you page."
                  icon={<Package size={18} />}
                />
                <InsightCard
                  label="Reorders"
                  value={`${conversionJourney.reorderCompleted}`}
                  hint="Completed reorder actions that sent the same items back to cart."
                  icon={<ShoppingCart size={18} />}
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                  <BarChart3 size={18} />
                  <span className="font-semibold">Key Rates</span>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: "Coupon validation success rate",
                      value: formatRate(
                        conversionJourney.couponSuccesses,
                        conversionJourney.couponAttempts,
                      ),
                      hint: `${conversionJourney.couponAttempts} coupon checks recorded.`,
                    },
                    {
                      label: "Order creation rate",
                      value: formatRate(
                        conversionJourney.ordersCreated,
                        conversionJourney.orderAttempts,
                      ),
                      hint: "مقارنة بين محاولات الإرسال والطلبات التي تم إنشاؤها.",
                    },
                    {
                      label: "Thank-you capture rate",
                      value: formatRate(
                        conversionJourney.thankYouViews,
                        conversionJourney.ordersCreated,
                      ),
                      hint: "هل العميل وصل فعلًا لصفحة النجاح بعد إنشاء الطلب؟",
                    },
                    {
                      label: "Post-purchase engagement rate",
                      value: formatRate(
                        conversionJourney.postPurchaseActions,
                        conversionJourney.thankYouViews,
                      ),
                      hint: "تفاعل العملاء بعد الشراء عبر الرجوع للمتجر أو الدعم.",
                    },
                    {
                      label: "Upsell CTR",
                      value: formatRate(
                        conversionJourney.upsellClicks,
                        conversionJourney.upsellViews,
                      ),
                      hint: "نسبة النقر على بلوك الـ upsell بعد الشراء.",
                    },
                    {
                      label: "Upsell add-to-cart rate",
                      value: formatRate(
                        conversionJourney.upsellAdds,
                        conversionJourney.upsellViews,
                      ),
                      hint: "كم مرة تحولت مشاهدات بلوك الـ upsell إلى إضافة للسلة.",
                    },
                    {
                      label: "Track-order success rate",
                      value: formatRate(
                        conversionJourney.trackOrderSuccesses,
                        conversionJourney.trackOrderClicks,
                      ),
                      hint: "How many thank-you order checks returned a valid order status.",
                    },
                    {
                      label: "Reorder completion rate",
                      value: formatRate(
                        conversionJourney.reorderCompleted,
                        conversionJourney.reorderClicks,
                      ),
                      hint: "How often reorder clicks ended with items added back to cart.",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-300">
                          {item.value}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {item.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {slug === "ugc-reviews-pro" ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <ShieldCheck size={18} />
                <span className="font-semibold">حالة الـ Moderation</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <InsightCard
                  label="إجمالي التقييمات"
                  value={`${reviewInsights?.total || 0}`}
                  hint="كل التقييمات التي وصلت إلى النظام."
                  icon={<MessageSquare size={18} />}
                />
                <InsightCard
                  label="بانتظار المراجعة"
                  value={`${reviewInsights?.pending || 0}`}
                  hint="تقييمات تحتاج موافقة أو رفض من لوحة الإدارة."
                  icon={<Clock3 size={18} />}
                />
                <InsightCard
                  label="تمت الموافقة"
                  value={`${reviewInsights?.approved || 0}`}
                  hint="تقييمات أصبحت ظاهرة فعليًا على المتجر."
                  icon={<ShieldCheck size={18} />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <MessageSquare size={18} />
                <span className="font-semibold">أحدث التقييمات المعلقة</span>
              </div>
              {reviewInsights?.latestPending?.length ? (
                <div className="space-y-3">
                  {reviewInsights.latestPending.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {review.customerName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {review.products?.name || review.product?.name || "Product review"}
                          </div>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          {review.rating}/5
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {review.title || "بدون عنوان"} • {formatDateTime(review.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  لا توجد تقييمات معلقة حاليًا.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Clock3 size={18} />
            <span className="font-semibold">آخر النشاطات المسجلة</span>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {log.feature || "General activity"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      quantity: {Number(log.quantity || 0)} • cost: {formatMoney(log.totalCost)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
              لا توجد usage logs بعد. بمجرد تسجيل أحداث فعلية للتطبيق ستظهر هنا آخر الأنشطة.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderForm = () => {
    switch (slug) {
      case "conversion-suite":
        return isUpsellCenter ? renderUpsellCenter() : renderConversionSuite();
      case "ugc-reviews-pro":
        return renderUgcReviews();
      case "commerce-advanced":
        return renderCommerceAdvanced();
      default:
        return (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-600 dark:text-gray-400">
            لا توجد شاشة إعدادات مخصصة لهذا التطبيق حتى الآن.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!companyApp) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={40} />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            التطبيق غير مفعّل
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            فعّل التطبيق أولًا من Marketplace حتى تبدأ ربطه مع القوالب والثيم.
          </p>
          <button
            onClick={() => navigate(`/marketplace/${slug}`)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            فتح صفحة التطبيق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-4 px-3 py-4 sm:px-6 sm:py-6">
          <div className="space-y-3">
            <button
              onClick={() => navigate(backDestination)}
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft size={18} />
              {backLabel}
            </button>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl sm:text-3xl dark:bg-blue-900/30">
                {companyApp.app.icon || "📦"}
              </div>
              <div>
                <div className="mb-1 sm:mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {pageTitle}
                  </h1>
                  {supported && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <Sparkles size={14} />
                      {isUpsellCenter ? "Unified" : "Template Ready"}
                    </span>
                  )}
                </div>
                <p className="max-w-3xl text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {pageDescription}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-0 py-4 sm:px-6 sm:py-8">
        {!isUpsellCenter ? (
          <div className="mb-4 sm:mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Settings2 size={18} />
              <span className="font-semibold">منطق التنفيذ الحالي</span>
            </div>
            <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-blue-800 dark:text-blue-200">
              الإعدادات هنا مصممة لتخدم 3 طبقات معًا: الظهور في Marketplace، والربط مع الـ
              storefront العام، والإدراج داخل القوالب والثيمات كـ components وvariants.
            </p>
          </div>
        ) : null}

        {renderInsights()}

        {renderForm()}

        {!isUpsellCenter ? (
          <div className="mt-6 sm:mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
              <Package size={18} />
              <span className="font-semibold">معاينة بنية الإعدادات</span>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-gray-950 p-3 sm:p-4 text-xs leading-6 text-green-200">
              {JSON.stringify(normalizedSettings, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
