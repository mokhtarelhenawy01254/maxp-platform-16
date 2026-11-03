export const APP_SETTINGS_SLUGS = [
  "internal-courier-fleet",
  "conversion-suite",
  "ugc-reviews-pro",
  "commerce-advanced",
  "upsell-center",
] as const;

export type AppSettingsSlug = (typeof APP_SETTINGS_SLUGS)[number];

export function supportsAppSettings(slug?: string | null): boolean {
  if (!slug) return false;
  return (APP_SETTINGS_SLUGS as readonly string[]).includes(slug);
}
