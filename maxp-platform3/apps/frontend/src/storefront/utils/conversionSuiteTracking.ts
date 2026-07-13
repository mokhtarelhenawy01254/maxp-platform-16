import type { StorefrontSettings } from "../hooks/useStorefrontSettings";
import {
  trackStorefrontAppUsage,
  type TrackStorefrontAppUsageInput,
} from "./appUsageTracking";
import { isStorefrontMarketplaceAppEnabled } from "./marketplaceApps";

type TrackConversionSuiteUsageInput = Omit<TrackStorefrontAppUsageInput, "slug">;

export const isConversionSuiteEnabled = (
  storefrontSettings: StorefrontSettings | null | undefined,
): boolean => isStorefrontMarketplaceAppEnabled(storefrontSettings, "conversion-suite");

export const trackConversionSuiteUsage = (
  storefrontSettings: StorefrontSettings | null | undefined,
  input: TrackConversionSuiteUsageInput,
): Promise<boolean> => {
  if (!isConversionSuiteEnabled(storefrontSettings)) {
    return Promise.resolve(false);
  }

  return trackStorefrontAppUsage({
    ...input,
    slug: "conversion-suite",
  });
};
