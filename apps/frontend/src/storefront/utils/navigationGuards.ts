export const KHEMET_LUXE_THEME_IDS = new Set(['khemet-luxe-eg', 'khemet-luxe-v2']);

export const isKhemetLuxeTheme = (themeId: string | null | undefined): boolean =>
  Boolean(themeId && KHEMET_LUXE_THEME_IDS.has(themeId));

export const shouldStorefrontForceDocumentNavigation = (
  themeId: string | null | undefined,
  _isProductDetailPath: boolean,
): boolean => isKhemetLuxeTheme(themeId);

export const navigateStorefrontDocument = (href: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(href);
};
