import type { MetaGeoLocation } from "../../services/facebookAdsService";

export interface AttributionWindowOption {
  value: string;
  label: string;
  description: string;
}

export interface TargetingOptionSelection {
  id: string;
  name?: string;
}

export interface WizardTargetingFormData {
  ageMin: number;
  ageMax: number;
  genders: string[];
  locations: string[];
  regions: MetaGeoLocation[];
  cities: MetaGeoLocation[];
  locationTypes: Array<"home" | "recent">;
  advantageAudience: boolean;
  customerLifecycleStrategy?: "ALL_AUDIENCES" | "NEW_CUSTOMERS";
}

export interface WizardTargetingSelections {
  selectedInterests: TargetingOptionSelection[];
  selectedCustomAudiences: string[];
  selectedLookalikeAudiences: string[];
  excludedAudiences: string[];
  excludedInterests?: TargetingOptionSelection[];
  narrowInterests?: TargetingOptionSelection[];
  selectedLanguages: number[];
  selectedDevices: string[];
  relationshipStatuses: number[];
  selectedEducation: number[];
}

export const normalizeWizardBidStrategy = (strategy?: string) => {
  const normalized = String(strategy || "LOWEST_COST").trim().toUpperCase();

  if (
    normalized === "LOWEST_COST" ||
    normalized === "LOWEST_COST_WITHOUT_CAP"
  ) {
    return "LOWEST_COST";
  }

  if (normalized === "BID_CAP" || normalized === "LOWEST_COST_WITH_BID_CAP") {
    return "BID_CAP";
  }

  if (normalized === "TARGET_COST") {
    return "COST_CAP";
  }

  return normalized;
};

export const isCappedBidStrategy = (strategy?: string) =>
  normalizeWizardBidStrategy(strategy) !== "LOWEST_COST";

export const normalizeCurrencyCode = (currency?: string | null): string => {
  if (!currency) return "EGP";
  const trimmed = String(currency).trim().toUpperCase();
  if (
    trimmed === "LE" ||
    trimmed === "L.E" ||
    trimmed === "ج.م" ||
    trimmed === "جنيه" ||
    trimmed === "EGP"
  ) {
    return "EGP";
  }
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  return "EGP";
};

export const formatAdAccountCurrency = (
  value: number | string | undefined | null,
  currency: string | undefined | null,
  isEn = false,
): string => {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat(isEn ? "en-US" : "ar-EG", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(isEn ? "en-US" : "ar-EG")} ${normalizedCurrency}`;
  }
};

export const getFullAdMinimumBudgetAmount = (currency?: string) => {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  return normalizedCurrency === "EGP" ? 200 : 1;
};

export const buildWizardGeoSummary = (
  formData: {
    regions?: Array<{ name?: string } | string | null | undefined> | null;
    cities?: Array<{ name?: string } | string | null | undefined> | null;
    locations?: string[] | null;
  },
  isEn: boolean,
  countries: Array<{ code: string; name: string }>,
): string => {
  const regions = Array.isArray(formData.regions) ? formData.regions : [];
  const cities = Array.isArray(formData.cities) ? formData.cities : [];
  const locations = Array.isArray(formData.locations) ? formData.locations : [];

  if (regions.length > 0 || cities.length > 0) {
    const regionNames = regions
      .map((r) => {
        if (!r) return "";
        const name = typeof r === "string" ? r : r.name;
        return name ? (isEn ? `${name} Governorate` : `محافظة ${name}`) : "";
      })
      .filter(Boolean);

    const cityNames = cities
      .map((c) => {
        if (!c) return "";
        const name = typeof c === "string" ? c : c.name;
        return name ? (isEn ? `${name} City` : `مدينة ${name}`) : "";
      })
      .filter(Boolean);

    return [...regionNames, ...cityNames].join(", ");
  }

  return locations
    .map((loc) => countries.find((c) => c.code === loc)?.name || loc)
    .filter(Boolean)
    .join(", ");
};

export const buildWizardCreativeSummary = (
  formData: {
    creativeType?: string | null;
    carouselCards?: any[] | null;
    flexibleAssets?: any[] | null;
  },
  isEn: boolean,
): string => {
  const creativeType = formData.creativeType || "SINGLE_IMAGE";
  if (creativeType === "CAROUSEL") {
    const count = formData.carouselCards?.length || 0;
    return isEn ? `Carousel - ${count} cards` : `دوّار - ${count} كارت`;
  }
  if (creativeType === "SINGLE_IMAGE") {
    return isEn ? "Single Image" : "صورة واحدة";
  }
  if (creativeType === "SINGLE_VIDEO") {
    return isEn ? "Single Video" : "فيديو واحد";
  }
  if (creativeType === "EXISTING_POST") {
    return isEn ? "Existing Page Post" : "منشور من الصفحة";
  }
  if (creativeType === "FLEXIBLE") {
    const count = formData.flexibleAssets?.length || 0;
    return isEn ? `Flexible - ${count} files` : `مرن - ${count} ملف`;
  }
  return isEn ? "Single Image" : "صورة واحدة";
};

export const normalizeAttributionWindowForObjective = (
  objective?: string,
  attributionWindow?: string,
) => {
  const normalizedObjective = String(objective || "").trim().toUpperCase();

  if (normalizedObjective === "OUTCOME_TRAFFIC") {
    return "1d_click";
  }

  return attributionWindow || "7d_click_1d_view";
};

export const getCompatibleAttributionWindows = (
  objective: string | undefined,
  windows: AttributionWindowOption[],
) => {
  const normalizedObjective = String(objective || "").trim().toUpperCase();

  if (normalizedObjective === "OUTCOME_TRAFFIC") {
    return windows.filter((window) => window.value === "1d_click");
  }

  if (
    normalizedObjective === "OUTCOME_SALES" ||
    normalizedObjective === "OUTCOME_LEADS"
  ) {
    return windows;
  }

  return [];
};

export const buildCreateAdWizardTargetingPayload = (
  formData: WizardTargetingFormData,
  selections: WizardTargetingSelections,
) => {
  const usesLocalGeo = formData.regions.length > 0 || formData.cities.length > 0;

  return {
    ageMin: formData.ageMin,
    ageMax: formData.ageMax,
    ...(formData.genders.length > 0 && { genders: formData.genders }),
    ...(usesLocalGeo ? {} : { locations: formData.locations }),
    ...(formData.regions.length > 0 && { regions: formData.regions }),
    ...(formData.cities.length > 0 && { cities: formData.cities }),
    locationTypes: formData.locationTypes,
    ...(selections.selectedInterests.length > 0 && {
      interests: selections.selectedInterests.map((interest) => ({
        id: interest.id,
        name: interest.name || interest.id,
      })),
    }),
    ...(selections.selectedCustomAudiences.length > 0 && {
      customAudiences: selections.selectedCustomAudiences,
    }),
    ...(selections.selectedLookalikeAudiences.length > 0 && {
      lookalikeAudiences: selections.selectedLookalikeAudiences,
    }),
    ...(selections.excludedAudiences.length > 0 && {
      excludedAudiences: selections.excludedAudiences,
    }),
    ...(selections.excludedInterests && selections.excludedInterests.length > 0 && {
      excludedInterests: selections.excludedInterests.map((interest) => ({
        id: interest.id,
        name: interest.name || interest.id,
      })),
    }),
    ...(selections.narrowInterests && selections.narrowInterests.length > 0 && {
      narrowInterests: selections.narrowInterests.map((interest) => ({
        id: interest.id,
        name: interest.name || interest.id,
      })),
    }),
    ...(selections.selectedLanguages.length > 0 && {
      locales: selections.selectedLanguages,
    }),
    ...(selections.selectedDevices.length > 0 && {
      devices: { platforms: selections.selectedDevices },
    }),
    ...(selections.relationshipStatuses.length > 0 && {
      relationshipStatuses: selections.relationshipStatuses,
    }),
    ...(selections.selectedEducation.length > 0 && {
      education: { statuses: selections.selectedEducation },
    }),
    advantageAudience: formData.advantageAudience,
    customerLifecycleStrategy: formData.customerLifecycleStrategy || "ALL_AUDIENCES",
  };
};

export const isValidWebUrl = (value?: string | null): boolean => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const isValidMediaUrl = (value?: string | null): boolean => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && trimmed.includes("/uploads/")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};
