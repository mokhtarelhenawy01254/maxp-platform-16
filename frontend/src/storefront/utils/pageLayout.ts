import type {
  StorefrontPageConfig,
  StorefrontPageLayout,
} from '../types/theme.types';

export const resolveStorefrontPageLayout = (
  pageConfig: StorefrontPageConfig | undefined,
  fallback: StorefrontPageLayout = 'stack',
): StorefrontPageLayout => pageConfig?.layoutHint || fallback;
