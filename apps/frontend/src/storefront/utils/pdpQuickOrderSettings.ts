export type PdpQuickOrderPlacement = "before-description" | "after-description";
export type PdpQuickOrderSurfaceMode = "standalone" | "merged-buybox";

export type PdpQuickOrderFieldKey =
  | "fullName"
  | "phone"
  | "governorate"
  | "address"
  | "alternatePhone";

export interface PdpQuickOrderFieldSettings {
  enabled: boolean;
  required: boolean;
}

export interface PdpQuickOrderSettings {
  placement: PdpQuickOrderPlacement;
  surfaceMode: PdpQuickOrderSurfaceMode;
  showQuantity: boolean;
  showOrderSummary: boolean;
  autoSelectVariants: boolean;
  fields: Record<PdpQuickOrderFieldKey, PdpQuickOrderFieldSettings>;
}

export const DEFAULT_PDP_QUICK_ORDER_SETTINGS: PdpQuickOrderSettings = {
  placement: "after-description",
  surfaceMode: "standalone",
  showQuantity: true,
  showOrderSummary: true,
  autoSelectVariants: true,
  fields: {
    fullName: { enabled: true, required: true },
    phone: { enabled: true, required: true },
    governorate: { enabled: true, required: true },
    address: { enabled: true, required: true },
    alternatePhone: { enabled: true, required: false },
  },
};

export const PDP_QUICK_ORDER_PLACEMENT_OPTIONS = [
  { value: "after-description", label: "بعد الوصف" },
  { value: "before-description", label: "قبل الوصف" },
] as const;

export const PDP_QUICK_ORDER_SURFACE_MODE_OPTIONS = [
  { value: "standalone", label: "كتلة مستقلة" },
  { value: "merged-buybox", label: "كتلة واحدة مع المتغيرات والشراء" },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeFieldSettings = (
  value: unknown,
  fallback: PdpQuickOrderFieldSettings,
): PdpQuickOrderFieldSettings => {
  const candidate = isRecord(value) ? value : {};
  const enabled =
    typeof candidate["enabled"] === "boolean"
      ? candidate["enabled"]
      : fallback.enabled;
  const required =
    enabled && typeof candidate["required"] === "boolean"
      ? candidate["required"]
      : enabled && fallback.required;

  return {
    enabled,
    required,
  };
};

export const normalizePdpQuickOrderSettings = (
  value: unknown,
): PdpQuickOrderSettings => {
  const candidate = isRecord(value) ? value : {};
  const rawFields = isRecord(candidate["fields"]) ? candidate["fields"] : {};

  return {
    placement:
      candidate["placement"] === "before-description"
        ? "before-description"
        : DEFAULT_PDP_QUICK_ORDER_SETTINGS.placement,
    surfaceMode:
      candidate["surfaceMode"] === "merged-buybox"
        ? "merged-buybox"
        : DEFAULT_PDP_QUICK_ORDER_SETTINGS.surfaceMode,
    showQuantity:
      typeof candidate["showQuantity"] === "boolean"
        ? candidate["showQuantity"]
        : DEFAULT_PDP_QUICK_ORDER_SETTINGS.showQuantity,
    showOrderSummary:
      typeof candidate["showOrderSummary"] === "boolean"
        ? candidate["showOrderSummary"]
        : DEFAULT_PDP_QUICK_ORDER_SETTINGS.showOrderSummary,
    autoSelectVariants:
      typeof candidate["autoSelectVariants"] === "boolean"
        ? candidate["autoSelectVariants"]
        : DEFAULT_PDP_QUICK_ORDER_SETTINGS.autoSelectVariants,
    fields: {
      fullName: normalizeFieldSettings(
        rawFields["fullName"],
        DEFAULT_PDP_QUICK_ORDER_SETTINGS.fields.fullName,
      ),
      phone: normalizeFieldSettings(
        rawFields["phone"],
        DEFAULT_PDP_QUICK_ORDER_SETTINGS.fields.phone,
      ),
      governorate: normalizeFieldSettings(
        rawFields["governorate"],
        DEFAULT_PDP_QUICK_ORDER_SETTINGS.fields.governorate,
      ),
      address: normalizeFieldSettings(
        rawFields["address"],
        DEFAULT_PDP_QUICK_ORDER_SETTINGS.fields.address,
      ),
      alternatePhone: normalizeFieldSettings(
        rawFields["alternatePhone"],
        DEFAULT_PDP_QUICK_ORDER_SETTINGS.fields.alternatePhone,
      ),
    },
  };
};

export const getPdpQuickOrderSettingsFromDesignTokens = (
  designTokens: unknown,
): PdpQuickOrderSettings => {
  if (!isRecord(designTokens)) {
    return DEFAULT_PDP_QUICK_ORDER_SETTINGS;
  }

  return normalizePdpQuickOrderSettings(designTokens["pdpQuickOrder"]);
};

export const upsertPdpQuickOrderSettingsInDesignTokens = (
  designTokens: unknown,
  settings: unknown,
): Record<string, unknown> => {
  const nextDesignTokens = isRecord(designTokens) ? { ...designTokens } : {};

  return {
    ...nextDesignTokens,
    pdpQuickOrder: normalizePdpQuickOrderSettings(settings),
  };
};
