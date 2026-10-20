import { resolveStorefrontThemeId } from "../../../storefront/themes";
import { buildStorefrontPreviewPath } from "../../../storefront/utils/paths";
import { STOREFRONT_READY_MARKETPLACE_PREVIEWS } from "../types/storefrontThemesTypes";

export function buildStorefrontThemePreviewUrl({
  themeId,
  previewStoreTarget,
  origin,
}: {
  themeId: string;
  previewStoreTarget: {
    companyId: string | null;
    companySlug: string | null;
    customDomain: string | null;
  };
  origin: string;
}): string {
  const canonicalThemeId = resolveStorefrontThemeId(themeId) || themeId;

  if (
    canonicalThemeId.endsWith("-demo") &&
    !STOREFRONT_READY_MARKETPLACE_PREVIEWS.has(canonicalThemeId)
  ) {
    return `${origin}/theme-demo/${canonicalThemeId.replace("-demo", "")}`;
  }

  return buildStorefrontPreviewPath("/", {
    companyId: previewStoreTarget.companyId,
    companySlug: previewStoreTarget.companySlug,
    customDomain: previewStoreTarget.customDomain,
    previewTheme: canonicalThemeId,
    previewSource: "marketplace",
    previewAdminOrigin: origin,
  });
}
