import type { StorefrontSectionId } from "../sections/manifest";
import type { StudioGlobalComponent } from "../studio/StudioTypes";

export interface StorefrontThemeTypography {
  headingFont: string;
  bodyFont: string;
  baseSize: string;
  direction?: 'ltr' | 'rtl';
  fontFamily?: string;
  baseFontSize?: number | string;
  lineHeight?: number | string;
  headingWeight?: number | string;
  bodyWeight?: number | string;
  letterSpacing?: number | string;
}

export interface StorefrontSEOConfig {
  titleTemplate?: string; // e.g. "{{page}} | {{store}}"
  description?: string;
  defaultOgImage?: string;
  faviconUrl?: string;
}

export interface StorefrontThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
  cardForeground: string;
  ring: string;
}

export interface StorefrontThemeShape {
  borderRadius: string;
  buttonRadius: string;
}

export interface StorefrontThemeProductCardTokens {
  borderRadius?: string;
  boxShadow?: string;
  hoverShadow?: string;
  badgeRadius?: string;
  buttonRadius?: string;
  surfaceOpacity?: string;
}

export type StorefrontContentAlign = 'start' | 'center';

export interface StorefrontThemeLayoutTokens {
  contentAlign?: StorefrontContentAlign;
}

export type StorefrontPageLayout =
  | 'stack'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'product-detail'
  | 'commerce-3col';

export type StorefrontSectionType = StorefrontSectionId | (string & {});

export interface StorefrontSectionConfig {
  id?: string;
  type: StorefrontSectionType;
  variant?: string;
  settings?: Record<string, unknown>;

  [key: string]: unknown;
}

export type StorefrontPageGoal = 'conversion' | 'discovery' | 'trust';

export interface StorefrontPageCompositionPolicy {
  pageGoal?: StorefrontPageGoal;
  preserveManualOrder?: boolean;
  enforceTrustSignals?: boolean;
}

export interface StorefrontPageSEOConfig {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

export type StorefrontPageStatus = 'published' | 'draft';

export interface StorefrontPageConfig {
  sections: Array<string | StorefrontSectionConfig>;
  layoutHint?: StorefrontPageLayout;
  seo?: StorefrontPageSEOConfig;
  status?: StorefrontPageStatus;
  title?: string;
  label?: string;
  slug?: string;
  pageGoal?: StorefrontPageGoal;
  compositionPolicy?: StorefrontPageCompositionPolicy;
  settings?: Record<string, unknown>;
  isSystemFallback?: boolean;
}

export interface StorefrontThemeTokens {
  colors: StorefrontThemeColors;
  typography: StorefrontThemeTypography;
  shape: StorefrontThemeShape;
  productCard?: StorefrontThemeProductCardTokens;
  layout?: StorefrontThemeLayoutTokens;
  seo?: StorefrontSEOConfig;
  globalComponents?: StudioGlobalComponent[];
}

export interface StorefrontHeaderConfig {
  /** Per-locale label overrides, resolved by localizeThemeShell(). */
  i18n?: Partial<Record<'ar' | 'en', Record<string, unknown>>>;
  variant?:
    | 'default'
    | 'floating-dark'
    | 'editorial-soft'
    | 'utility-frame'
    | 'retail-direct'
    | 'fashion-retail'
    | 'digital-command'
    | 'butcher-atelier'
    | 'legacy-default-old'
    | 'marketplace-bazaar'
    | 'vela-fashion';
  transparentOnHome?: boolean;
  logoUrl?: string;
  brandName?: string;
  tagline?: string;
  railLabel?: string;
  railItems?: string[];
  showSearch?: boolean;
  showCart?: boolean;
  announcementText?: string;
  announcementLinkText?: string;
  announcementLinkTo?: string;
  actions?: Array<{
    label: string;
    to: string;
    style?: 'link' | 'outline' | 'primary';
  }>;
  navigation: Array<{ label: string; to: string }>;
  megaMenu?: {
    triggerLabel?: string;
    ctaText?: string;
    ctaLink?: string;
    tabs?: Array<{
      label?: string;
      title?: string;
      link?: string;
      image?: string;
      products?: Array<{
        title?: string;
        price?: string;
        comparePrice?: string;
        image?: string;
        link?: string;
        badge?: string;
        discount?: string;
      }>;
    }>;
  };
  dropdowns?: Array<{
    label?: string;
    /** department landing page; the category bar falls back to the first item's link */
    to?: string;
    items?: Array<{ label?: string; to?: string }>;
  }>;
}

export interface StorefrontFooterConfig {
  /** Per-locale label overrides, resolved by localizeThemeShell(). */
  i18n?: Partial<Record<'ar' | 'en', Record<string, unknown>>>;
  variant?:
    | 'default'
    | 'editorial-soft'
    | 'utility-frame'
    | 'signature-panel'
    | 'retail-direct'
    | 'fashion-retail'
    | 'digital-command'
    | 'butcher-atelier'
    | 'legacy-default-old'
    | 'vela-fashion'
    | 'automotive-chassis';
  description?: string;
  copyrightText?: string;
  addressText?: string;
  phoneText?: string;
  emailText?: string;
  contactRows?: Array<{
    label: string;
    value: string;
    href?: string;
  }>;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    snapchat?: string;
    whatsapp?: string;
  };
  navigation: Array<{
    title: string;
    links: Array<{ label: string; to: string }>;
  }>;
  legalLinks?: Array<{ label: string; to: string }>;
}

export interface StorefrontThemePages {
  home: StorefrontPageConfig;
  shop: StorefrontPageConfig;
  pdp: StorefrontPageConfig;
  cart: StorefrontPageConfig;
  checkout: StorefrontPageConfig;
  sale?: StorefrontPageConfig;
  collections?: StorefrontPageConfig;
  lookbook?: StorefrontPageConfig;
  'size-guide'?: StorefrontPageConfig;
  'thank-you'?: StorefrontPageConfig;
  [key: string]: StorefrontPageConfig | undefined;
}

export interface StorefrontTheme {
  id: string;
  name: string;
  direction: 'ltr' | 'rtl';
  /** Locale served when neither ?lang nor the visitor's saved choice decides. */
  defaultLocale?: 'ar' | 'en';
  supportedLocales?: Array<'ar' | 'en'>;
  tokens: StorefrontThemeTokens;
  header?: StorefrontHeaderConfig;
  footer?: StorefrontFooterConfig;
  pages: StorefrontThemePages;
  seo?: StorefrontSEOConfig;
  globalComponents?: StudioGlobalComponent[];
  preview?: {
    imageUrl?: string;
    colors?: string[];
  };
}
