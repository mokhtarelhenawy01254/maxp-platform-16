export const shouldStorefrontForceDocumentNavigation = (
  themeId: string | null | undefined,
  _isProductDetailPath: boolean,
): boolean => themeId === 'khemet-luxe-eg';

export const navigateStorefrontDocument = (href: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(href);
};
