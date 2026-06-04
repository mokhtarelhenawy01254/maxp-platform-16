import type { ProductFormData, ProductVariant } from "../types";

export const FACEBOOK_ADS_DECISION_METADATA_KEY = "facebookAdsDecision";

const DECISION_SETTING_KEYS = [
  FACEBOOK_ADS_DECISION_METADATA_KEY,
  "facebookAdsProfitability",
  "metaAdsDecision",
  "metaAdsProfitability",
  "adDecision",
  "adsDecision",
  "profitability",
] as const;

export interface FacebookAdsDecisionSettings {
  expectedShipping?: number;
  paymentFee?: number;
  paymentFeeRate?: number;
  returnRate?: number;
  requiredNetProfit?: number;
  configuredMaxCpa?: number;
}

export interface InventoryCostSummary {
  unitCost: number | null;
  source: string;
  records?: number;
  stockedUnits?: number;
}

export interface AdProfitabilityPreview {
  price: number;
  unitCost: number | null;
  costSource: "PRODUCT" | "VARIANT_AVERAGE" | "INVENTORY" | "MISSING";
  expectedShipping: number;
  paymentFee: number;
  paymentFeeRate: number;
  returnRate: number;
  returnReserve: number;
  requiredNetProfit: number;
  grossProfitBeforeRisk: number;
  grossProfitPerPurchase: number;
  breakEvenCpa: number;
  targetCpa: number;
  breakEvenRoas: number;
  configuredMaxCpa: number | null;
  isReady: boolean;
}

const SETTING_ALIASES: Record<keyof FacebookAdsDecisionSettings, string[]> = {
  expectedShipping: [
    "expectedShipping",
    "shippingCost",
    "shipping",
    "avgShipping",
    "deliveryCost",
  ],
  paymentFee: [
    "paymentFee",
    "paymentFeeAmount",
    "collectionFee",
    "cashCollectionFee",
    "codFee",
  ],
  paymentFeeRate: [
    "paymentFeeRate",
    "paymentFeePercent",
    "collectionFeeRate",
    "collectionFeePercent",
    "paymentPercent",
  ],
  returnRate: [
    "returnRate",
    "expectedReturnRate",
    "returnsRate",
    "returnPercent",
    "returnReserveRate",
  ],
  requiredNetProfit: [
    "requiredNetProfit",
    "targetNetProfit",
    "minNetProfit",
    "profitTarget",
  ],
  configuredMaxCpa: ["configuredMaxCpa", "maxCpa", "maxCPA", "targetCpa", "targetCPA"],
};

const normalizeSettingKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toOptionalNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toMoney = (value: unknown): number | null => {
  const numericValue = toOptionalNumber(value);
  return numericValue === null ? null : Math.max(0, numericValue);
};

const normalizePercent = (value: unknown): number => {
  const numericValue = toOptionalNumber(value);
  if (numericValue === null) return 0;
  const ratio = numericValue > 1 ? numericValue / 100 : numericValue;
  return Math.max(0, Math.min(0.95, ratio));
};

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const getSettingValue = (
  settings: Record<string, unknown>,
  keys: string[],
): unknown => {
  for (const key of keys) {
    const directValue = settings[key];
    if (directValue !== undefined && directValue !== null && directValue !== "") {
      return directValue;
    }
  }

  const normalizedKeys = new Set(keys.map(normalizeSettingKey));
  const matchingEntry = Object.entries(settings).find(([key, value]) => {
    return (
      normalizedKeys.has(normalizeSettingKey(key)) &&
      value !== undefined &&
      value !== null &&
      value !== ""
    );
  });

  return matchingEntry?.[1];
};

export const getFacebookAdsDecisionSettings = (
  metadata: Record<string, unknown> | null | undefined,
): FacebookAdsDecisionSettings => {
  if (!isRecord(metadata)) return {};

  const nestedSettings = DECISION_SETTING_KEYS
    .map((key) => metadata[key])
    .find(isRecord);
  const settings = nestedSettings || metadata;

  return Object.entries(SETTING_ALIASES).reduce<FacebookAdsDecisionSettings>(
    (acc, [settingKey, aliases]) => {
      const numericValue = toMoney(getSettingValue(settings, aliases));
      if (numericValue !== null) {
        acc[settingKey as keyof FacebookAdsDecisionSettings] = numericValue;
      }
      return acc;
    },
    {},
  );
};

export const normalizeFacebookAdsDecisionSettings = (
  settings: FacebookAdsDecisionSettings,
): FacebookAdsDecisionSettings => {
  return Object.entries(settings).reduce<FacebookAdsDecisionSettings>(
    (acc, [key, value]) => {
      const numericValue = toMoney(value);
      if (numericValue !== null) {
        acc[key as keyof FacebookAdsDecisionSettings] = numericValue;
      }
      return acc;
    },
    {},
  );
};

export const formatPercentInputValue = (value: unknown): string => {
  const numericValue = toOptionalNumber(value);
  if (numericValue === null) return "";
  return String(numericValue > 0 && numericValue <= 1 ? round(numericValue * 100, 2) : numericValue);
};

const getVariantAverageCost = (variants: ProductVariant[]) => {
  const costs = variants
    .map((variant) => toMoney(variant.cost))
    .filter((cost): cost is number => cost !== null);

  if (costs.length === 0) return null;
  return costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
};

export const buildAdProfitabilityPreview = ({
  formData,
  variants,
  inventoryCostSummary,
  settings,
}: {
  formData: ProductFormData;
  variants: ProductVariant[];
  inventoryCostSummary?: InventoryCostSummary | null;
  settings: FacebookAdsDecisionSettings;
}): AdProfitabilityPreview => {
  const productCost = toMoney(formData.cost);
  const variantAverageCost = getVariantAverageCost(variants);
  const inventoryCost = toMoney(inventoryCostSummary?.unitCost);
  const price = toMoney(formData.price) ?? 0;
  const unitCost = productCost ?? variantAverageCost ?? inventoryCost;
  const costSource = productCost !== null
    ? "PRODUCT"
    : variantAverageCost !== null
      ? "VARIANT_AVERAGE"
      : inventoryCost !== null
        ? "INVENTORY"
        : "MISSING";
  const expectedShipping = toMoney(settings.expectedShipping) ?? 0;
  const paymentFeeFixed = toMoney(settings.paymentFee) ?? 0;
  const paymentFeeRate = normalizePercent(settings.paymentFeeRate);
  const paymentFee = paymentFeeFixed + price * paymentFeeRate;
  const returnRate = normalizePercent(settings.returnRate);
  const requiredNetProfit = toMoney(settings.requiredNetProfit) ?? 0;
  const configuredMaxCpa = toMoney(settings.configuredMaxCpa);
  const returnReserveBase = (unitCost ?? 0) + expectedShipping + paymentFee;
  const returnReserve = returnReserveBase * returnRate;
  const grossProfitBeforeRisk =
    unitCost === null ? 0 : Math.max(0, price - unitCost - expectedShipping - paymentFee);
  const grossProfitPerPurchase = Math.max(0, grossProfitBeforeRisk - returnReserve);
  const defaultTargetCpa = grossProfitPerPurchase > 0 ? grossProfitPerPurchase * 0.8 : 0;
  const profitProtectedTargetCpa =
    requiredNetProfit > 0
      ? Math.max(0, grossProfitPerPurchase - requiredNetProfit)
      : defaultTargetCpa;
  const cappedTargetCpa =
    configuredMaxCpa !== null && configuredMaxCpa > 0
      ? Math.min(defaultTargetCpa, profitProtectedTargetCpa, configuredMaxCpa)
      : Math.min(defaultTargetCpa, profitProtectedTargetCpa);
  const targetCpa = Math.min(grossProfitPerPurchase, Math.max(0, cappedTargetCpa));
  const breakEvenRoas =
    grossProfitPerPurchase > 0 && price > 0 ? price / grossProfitPerPurchase : 0;

  return {
    price: round(price),
    unitCost: unitCost === null ? null : round(unitCost),
    costSource,
    expectedShipping: round(expectedShipping),
    paymentFee: round(paymentFee),
    paymentFeeRate: round(paymentFeeRate, 4),
    returnRate: round(returnRate, 4),
    returnReserve: round(returnReserve),
    requiredNetProfit: round(requiredNetProfit),
    configuredMaxCpa: configuredMaxCpa === null ? null : round(configuredMaxCpa),
    grossProfitBeforeRisk: round(grossProfitBeforeRisk),
    grossProfitPerPurchase: round(grossProfitPerPurchase),
    breakEvenCpa: round(grossProfitPerPurchase),
    targetCpa: round(targetCpa),
    breakEvenRoas: round(breakEvenRoas, 3),
    isReady: unitCost !== null && price > 0,
  };
};
