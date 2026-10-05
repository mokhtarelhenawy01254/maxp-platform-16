const getPreviewSearchParams = (search?: string): URLSearchParams => {
  if (typeof window === 'undefined' && !search) {
    return new URLSearchParams();
  }

  return new URLSearchParams(search ?? window.location.search);
};

const SAFE_PREVIEW_THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/i;

const THEME_ID_ALIASES: Record<string, string> = {
  allura: 'allure',
};

export const resolvePreviewThemeId = (search?: string): string => {
  const params = getPreviewSearchParams(search);
  const candidate = params.get('previewTheme')?.trim().toLowerCase() || '';
  if (!SAFE_PREVIEW_THEME_ID_PATTERN.test(candidate)) {
    return '';
  }
  return THEME_ID_ALIASES[candidate] || candidate;
};

export const resolvePreviewSource = (search?: string): string => {
  const params = getPreviewSearchParams(search);
  return params.get('previewSource')?.trim().toLowerCase() || '';
};

export const isMarketplaceThemePreview = (search?: string): boolean =>
  resolvePreviewSource(search) === 'marketplace' && Boolean(resolvePreviewThemeId(search));
