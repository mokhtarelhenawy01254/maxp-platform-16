import { marketingSections } from "./marketingLandingData";

export const primaryMarketingSection =
  marketingSections.find((section) => section.slug === "premium-all-in-one") ||
  marketingSections[0];
