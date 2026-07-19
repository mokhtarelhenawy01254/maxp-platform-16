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
}

export interface WizardTargetingSelections {
  selectedInterests: TargetingOptionSelection[];
  selectedCustomAudiences: string[];
  selectedLookalikeAudiences: string[];
  excludedAudiences: string[];
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

export const getFullAdMinimumBudgetAmount = (currency?: string) => {
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  return normalizedCurrency === "EGP" ? 200 : 1;
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
  };
};
