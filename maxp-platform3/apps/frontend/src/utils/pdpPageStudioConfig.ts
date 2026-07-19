export type PdpPageSourceType =
  | "template-page"
  | "independent-page"
  | "native";

export type PdpIndependentIntegrationMode =
  | "standalone"
  | "prepend"
  | "append";

export interface PdpPageSourceConfig {
  sourceType: PdpPageSourceType;
  templatePageSlug: string;
  independentPageId: string;
  independentPageSlug: string;
  integrationMode: PdpIndependentIntegrationMode;
}

const DEFAULT_PAGE_SOURCE_CONFIG: PdpPageSourceConfig = {
  sourceType: "native",
  templatePageSlug: "product-details",
  independentPageId: "",
  independentPageSlug: "",
  integrationMode: "standalone",
};

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSlug = (raw: unknown): string =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const normalizeSourceType = (raw: unknown): PdpPageSourceType => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "independent-page" || value === "independent") {
    return "independent-page";
  }
  if (value === "native" || value === "fallback") {
    return "native";
  }
  return "template-page";
};

const normalizeIntegrationMode = (
  raw: unknown,
): PdpIndependentIntegrationMode => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "prepend") return "prepend";
  if (value === "append") return "append";
  return "standalone";
};

export const normalizePdpPageSourceConfig = (
  rawConfig?: Partial<PdpPageSourceConfig> | null,
): PdpPageSourceConfig => {
  const base = isObjectRecord(rawConfig) ? rawConfig : {};
  return {
    sourceType: normalizeSourceType(base.sourceType),
    templatePageSlug: normalizeSlug(base.templatePageSlug) || "product-details",
    independentPageId: String(base.independentPageId || "").trim(),
    independentPageSlug: normalizeSlug(base.independentPageSlug),
    integrationMode: normalizeIntegrationMode(base.integrationMode),
  };
};

export const extractPdpPageSourceConfig = (
  settings?: { designTokens?: unknown } | null,
): PdpPageSourceConfig => {
  const designTokens = isObjectRecord(settings?.designTokens)
    ? settings!.designTokens
    : {};
  const pdpStudio = isObjectRecord(designTokens.pdpStudio)
    ? designTokens.pdpStudio
    : {};
  const rawSourceConfig = isObjectRecord(pdpStudio.pageSource)
    ? pdpStudio.pageSource
    : null;

  return normalizePdpPageSourceConfig(
    rawSourceConfig || DEFAULT_PAGE_SOURCE_CONFIG,
  );
};

export const mergePdpPageSourceIntoDesignTokens = (
  currentDesignTokens: unknown,
  nextConfig: Partial<PdpPageSourceConfig>,
) => {
  const safeDesignTokens = isObjectRecord(currentDesignTokens)
    ? currentDesignTokens
    : {};
  const safePdpStudio = isObjectRecord(safeDesignTokens.pdpStudio)
    ? safeDesignTokens.pdpStudio
    : {};
  const currentConfig = isObjectRecord(safePdpStudio.pageSource)
    ? safePdpStudio.pageSource
    : DEFAULT_PAGE_SOURCE_CONFIG;

  const mergedConfig = normalizePdpPageSourceConfig({
    ...currentConfig,
    ...(isObjectRecord(nextConfig) ? nextConfig : {}),
  });

  return {
    ...safeDesignTokens,
    pdpStudio: {
      ...safePdpStudio,
      pageSource: mergedConfig,
    },
  };
};

export const getDefaultPdpPageSourceConfig = (): PdpPageSourceConfig => ({
  ...DEFAULT_PAGE_SOURCE_CONFIG,
});

