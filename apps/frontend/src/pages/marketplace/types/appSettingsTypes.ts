export type JsonRecord = Record<string, unknown>;

export type ApiDataEnvelope<T> = {
  data?: T;
};

export interface InstalledCompanyApp {
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

export interface AppUsageLogEntry {
  id: string;
  feature?: string | null;
  quantity?: number | null;
  totalCost?: number | string | null;
  metadata?: JsonRecord | null;
  createdAt: string;
}

export interface AppUsageByFeatureEntry {
  feature?: string | null;
  _sum?: {
    totalCost?: number | string | null;
    quantity?: number | null;
  };
  _count?: {
    id?: number | null;
  };
}

export interface AppUsageResponseData {
  logs: AppUsageLogEntry[];
  summary: {
    totalCost: number;
    totalQuantity: number;
    totalActions: number;
  };
  byFeature: AppUsageByFeatureEntry[];
}

export interface ReviewModerationItem {
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

export interface ReviewModerationInsights {
  total: number;
  pending: number;
  approved: number;
  latestPending: ReviewModerationItem[];
}

export interface UsageFeatureTotals {
  actions: number;
  quantity: number;
  totalCost: number;
}

export type UpsellCenterSectionId =
  | "overview"
  | "manual-links"
  | "product-page"
  | "cart-drawer"
  | "post-purchase"
  | "general";

export const APP_TITLES: Record<string, string> = {
  "conversion-suite": "Conversion Suite",
  "ugc-reviews-pro": "UGC Reviews Pro",
  "commerce-advanced": "Commerce Advanced",
  "internal-courier-fleet": "أسطول المناديب والتوصيل الداخلي",
};

export const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const setDeepValue = (source: JsonRecord, path: string[], value: unknown): JsonRecord => {
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

export const formatMoney = (value: number | string | null | undefined) => {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
};

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const toSafeNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildUsageFeatureMap = (
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

export interface ReviewListResponseData {
  pagination?: {
    total?: number | string | null;
  };
  reviews?: ReviewModerationItem[];
}

export const getFeatureActionCount = (
  featureMap: Record<string, UsageFeatureTotals>,
  featureNames: string[],
) =>
  featureNames.reduce(
    (total, featureName) => total + Number(featureMap[featureName]?.actions || 0),
    0,
  );

export const formatRate = (numerator: number, denominator: number) => {
  if (!denominator) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
};
