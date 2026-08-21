import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useParams, Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/apiClient';
import VariantSelector from '../components/VariantSelector';
import QuantitySelector from '../components/QuantitySelector';
import Button from '../components/Button';
import { useCartStore } from '../store/useCartStore';
import { useProduct } from '../hooks/useProduct';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { formatStorefrontCurrency } from '../utils/currency';
import { sanitizeStorefrontHtml } from '../utils/html';
import { buildStorefrontPath } from '../utils/paths';
import { isKhemetLuxeTheme as isKhemetLuxeThemeId } from '../utils/navigationGuards';
import {
  parseSizeGuideOverrides,
  parseSizeGuideRows,
  resolveSizeGuideOverrideForProduct,
  resolveSizeGuideRowsForProduct,
} from '../utils/dynamicSectionContent';
import { getVariantAttributes } from '../utils/variants';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import {
  buildStorefrontImageCandidates,
  getPrimaryProductImage,
} from '../utils/productImages';
import { getStorefrontSectionComponentKey } from '../sections/manifest';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import TrustedBadgePanel from '../components/TrustedBadgePanel';
import {
  AlarmClock,
  BadgeCheck,
  CheckCircle2,
  Eye,
  Facebook,
  Heart,
  Twitter,
  ExternalLink,
  MessageCircle,
  Ruler,
  Share2,
  ShieldCheck,
  Sparkles,
  Truck,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  calculateVolumeDiscountPricing,
  getProductVolumeDiscounts,
} from '../utils/volumeDiscounts';
import { usePdpSelectionStore } from '../store/usePdpSelectionStore';
import PdpQuickOrderPanel from './PdpQuickOrderPanel';
import {
  PDP_CHECKOUT_SECTION_ID,
  STOREFRONT_BUYBOX_ID,
  STOREFRONT_PRODUCT_DESCRIPTION_ID,
  STOREFRONT_PDP_CHECKOUT_OPEN_EVENT,
  STOREFRONT_REVIEWS_SECTION_ID,
} from '../utils/pdpCheckout';
import { getPdpQuickOrderSettingsFromDesignTokens } from '../utils/pdpQuickOrderSettings';
import QuantityOffersSection from './QuantityOffersSection';
import MobileVariantSheet from '../components/MobileVariantSheet';
import {
  formatSaleCountdownValue,
  getSaleCountdownParts,
  resolveSaleCountdownTimestamp,
} from '../utils/saleCountdown';

interface ProductInfoProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    addToCartText?: string;
    buyNowText?: string;
    descriptionTitle?: string;
    shippingTitle?: string;
    shippingText?: string;
    shippingInteraction?: string;
    shippingTriggerText?: string;
    shippingModalTitle?: string;
    sizeGuideInteraction?: string;
    sizeGuideModalTitle?: string;
    showGuarantees?: boolean | string;
    guaranteesTitle?: string;
    guaranteesSubtitle?: string;
    guaranteeItems?: string;
    guaranteeStyle?: string;
    sizeGuideText?: string;
    sizeGuideLink?: string;
    fitNote?: string;
    sizeGuideLayout?: string;
    isFakhama?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseSectionItems = (value: unknown, defaults: any[] = []): any[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
};

const parseMetadataArray = <T extends Record<string, any>>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const parseMetadataStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }
  } catch {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseBooleanSetting = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return fallback;
};

type StaticMotionProps<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithoutRef<T> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    whileTap?: unknown;
  };

const resolveStaticMotionStyle = (
  animate: unknown,
  style: React.CSSProperties | undefined,
): React.CSSProperties | undefined => {
  if (!animate || typeof animate !== 'object' || Array.isArray(animate)) {
    return style;
  }

  const animatedStyle: React.CSSProperties = {};
  const values = animate as Record<string, unknown>;

  if (typeof values.width === 'string' || typeof values.width === 'number') {
    animatedStyle.width = values.width;
  }

  if (typeof values.opacity === 'string' || typeof values.opacity === 'number') {
    animatedStyle.opacity = values.opacity;
  }

  return Object.keys(animatedStyle).length > 0
    ? { ...animatedStyle, ...style }
    : style;
};

const StaticMotionDiv = ({
  initial: _initial,
  animate,
  transition: _transition,
  style,
  ...props
}: StaticMotionProps<'div'>) => (
  <div {...props} style={resolveStaticMotionStyle(animate, style)} />
);

StaticMotionDiv.displayName = 'StaticMotionDiv';

const StaticMotionSpan = ({
  initial: _initial,
  animate,
  transition: _transition,
  style,
  ...props
}: StaticMotionProps<'span'>) => (
  <span {...props} style={resolveStaticMotionStyle(animate, style)} />
);

StaticMotionSpan.displayName = 'StaticMotionSpan';

const StaticMotionButton = ({
  initial: _initial,
  animate: _animate,
  transition: _transition,
  whileTap: _whileTap,
  ...props
}: StaticMotionProps<'button'>) => <button {...props} />;

StaticMotionButton.displayName = 'StaticMotionButton';

const parseMaybeNumber = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ELESSI_SOCIAL_PROOF_ROTATION_MS = 3200;
const ELESSI_COUNTDOWN_TICK_MS = 1000;

const hashProductSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const getOscillatingCounterValue = ({
  base,
  step,
  seed,
  floor = 1,
  maxSwing = 3,
  allowDip = true,
}: {
  base: number;
  step: number;
  seed: number;
  floor?: number;
  maxSwing?: number;
  allowDip?: boolean;
}) => {
  const normalizedBase = Math.max(floor, Math.round(base));

  if (step === 0) {
    return normalizedBase;
  }

  const swing = Math.max(1, Math.min(maxSwing, Math.ceil(normalizedBase * 0.2)));
  const wave = Math.sin((seed + 1) * 0.53 + step * 1.27);
  const drift = Math.cos((seed + 7) * 0.31 + step * 0.82);
  const normalized = (wave + drift + 2) / 4;
  const min = allowDip ? Math.max(floor, normalizedBase - swing) : normalizedBase;
  const max = normalizedBase + swing;

  return clampNumber(Math.round(min + normalized * (max - min)), min, max);
};

export const isProductInfoConversionModuleEnabled = (
  conversionSuiteEnabled: boolean,
  modules: Record<string, unknown> | null | undefined,
  moduleKey: 'soldCounter' | 'purchaseFomo' | 'lowStockNotice',
) => conversionSuiteEnabled && Boolean(modules?.[moduleKey]);

export const shouldProductInfoAddToCartOpenCart = (
  themeId: string | null | undefined,
  hasEmbeddedPdpCheckout: boolean,
) => !hasEmbeddedPdpCheckout || isKhemetLuxeThemeId(themeId);

export const shouldProductInfoAddToCartOpenEmbeddedCheckout = (
  themeId: string | null | undefined,
  hasEmbeddedPdpCheckout: boolean,
) => hasEmbeddedPdpCheckout && themeId !== 'khemet-luxe-eg';

export const shouldProductInfoMobileStickyOpenVariantSheet = (
  canOpenMobileVariantSheet: boolean,
  isSelectionReady: boolean,
) => canOpenMobileVariantSheet && !isSelectionReady;

const interpolateTemplate = (
  template: unknown,
  tokens: Record<string, string | number>,
  fallback: string,
) => {
  const source =
    typeof template === 'string' && template.trim().length > 0 ? template : fallback;

  return Object.entries(tokens).reduce((output, [key, value]) => {
    return output.replace(
      new RegExp(`\\{+\\s*${key}\\s*\\}+`, 'gi'),
      String(value),
    );
  }, source);
};

const interpolateCount = (template: unknown, count: number, fallback: string) =>
  interpolateTemplate(template, { count }, fallback);

const resolveDirectionalCopy = ({
  value,
  englishFallback,
  arabicFallback,
  prefersArabicCopy,
}: {
  value: unknown;
  englishFallback: string;
  arabicFallback: string;
  prefersArabicCopy: boolean;
}) => {
  if (typeof value === 'string' && value.trim()) {
    const trimmedValue = value.trim();
    if (prefersArabicCopy && trimmedValue === englishFallback) {
      return arabicFallback;
    }

    return trimmedValue;
  }

  return prefersArabicCopy ? arabicFallback : englishFallback;
};

const resolveDateLocale = (currency: string): string => {
  const map: Record<string, string> = {
    EGP: 'ar-EG',
    SAR: 'ar-SA',
    AED: 'ar-AE',
    KWD: 'ar-KW',
    QAR: 'ar-QA',
    BHD: 'ar-BH',
    OMR: 'ar-OM',
    JOD: 'ar-JO',
    IQD: 'ar-IQ',
    LBP: 'ar-LB',
    USD: 'en-US',
    GBP: 'en-GB',
    EUR: 'en-IE',
    CAD: 'en-CA',
    AUD: 'en-AU',
    TRY: 'tr-TR',
  };

  return map[currency?.toUpperCase()] || 'ar-EG';
};

const formatDateRange = (minDays: number, maxDays: number, locale: string): string => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + minDays);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + maxDays);

  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

const parseDetailRows = (
  value: unknown,
): Array<{ label: string; value: string }> => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [labelPart, ...valueParts] = row.split('|');
      return {
        label: String(labelPart || '').trim(),
        value: valueParts.join('|').trim(),
      };
    })
    .filter((row) => row.label && row.value);
};

const parseProductMetadata = (value: unknown): Record<string, any> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseVariantSettings = (value: unknown) => {
  const parsedValue = parseProductMetadata(value);
  const styles = isRecord(parsedValue) && isRecord(parsedValue['styles']) ? parsedValue['styles'] : {};
  const attributeImages = isRecord(parsedValue) && isRecord(parsedValue['attributeImages'])
    ? parsedValue['attributeImages']
    : {};
  const attributeColors = isRecord(parsedValue) && isRecord(parsedValue['attributeColors'])
    ? parsedValue['attributeColors']
    : {};

  return {
    styles,
    attributeImages,
    attributeColors,
  };
};

const normalizeExternalPurchaseUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (isExternalHref(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return '';
};

const translateZenCategoryLabel = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();

  switch (normalizedValue) {
    case 'plants':
    case 'plant':
      return 'نباتات';
    case 'pots':
    case 'pot':
    case 'planters':
      return 'أواني';
    case 'seeds':
    case 'seed':
      return 'بذور';
    case 'care':
    case 'plant care':
      return 'عناية بالنبات';
    case 'decor':
    case 'home decor':
      return 'ديكور طبيعي';
    case 'gifts':
    case 'gift':
      return 'هدايا طبيعية';
    case 'skincare':
      return 'عناية طبيعية';
    default:
      return value;
  }
};

const resolveExternalProductConfig = (product: Record<string, any> | null | undefined) => {
  const metadata = parseProductMetadata(product?.['metadata']);
  const url = normalizeExternalPurchaseUrl(
    metadata['externalUrl'] ??
      metadata['affiliateUrl'] ??
      metadata['partnerUrl'] ??
      metadata['buyUrl'] ??
      metadata['productUrl'] ??
      product?.['externalUrl'] ??
      product?.['affiliateUrl'] ??
      product?.['partnerUrl'] ??
      product?.['buyUrl'] ??
      product?.['productUrl'],
  );

  return {
    url,
    label:
      typeof metadata['externalButtonLabel'] === 'string'
        ? metadata['externalButtonLabel'].trim()
        : typeof metadata['affiliateButtonLabel'] === 'string'
          ? metadata['affiliateButtonLabel'].trim()
          : typeof metadata['externalLabel'] === 'string'
            ? metadata['externalLabel'].trim()
            : typeof metadata['affiliateLabel'] === 'string'
              ? metadata['affiliateLabel'].trim()
              : '',
    vendor:
      typeof metadata['externalVendor'] === 'string'
        ? metadata['externalVendor'].trim()
        : typeof metadata['partnerName'] === 'string'
          ? metadata['partnerName'].trim()
          : typeof metadata['vendorName'] === 'string'
            ? metadata['vendorName'].trim()
            : '',
    description:
      typeof metadata['externalDescription'] === 'string'
        ? metadata['externalDescription'].trim()
        : typeof metadata['affiliateDescription'] === 'string'
          ? metadata['affiliateDescription'].trim()
          : '',
    externalOnly: Boolean(
      metadata['externalOnly'] ||
        metadata['externalAffiliateOnly'] ||
        metadata['isExternalProduct'] ||
        product?.['source'] === 'EXTERNAL' ||
        product?.['source'] === 'AFFILIATE',
    ),
  };
};
const Accordion = ({
  title,
  children,
  defaultOpen = false,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'cutline';
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const wrapperClassName =
    tone === 'cutline' ? 'border-b border-[#2d3329] py-4' : 'border-b border-border py-4';
  const triggerClassName =
    tone === 'cutline'
      ? 'flex w-full items-center justify-between text-start font-black text-[#111510] transition-colors hover:text-[#7f8f1d]'
      : 'w-full flex items-center justify-between font-bold text-foreground hover:text-primary transition-colors text-start';
  const titleClassName =
    tone === 'cutline'
      ? 'text-[1rem] uppercase tracking-[0.12em]'
      : 'text-lg';
  return (
    <div className={wrapperClassName}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className={titleClassName}>{title}</span>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

Accordion.displayName = 'Accordion';

const ProductDescription = ({
  safeDescription,
  emptyText = 'لا يوجد وصف متاح لهذا المنتج حتى الآن.',
}: {
  safeDescription: string;
  emptyText?: string;
}) => (
  safeDescription ? (
    <div
      className="text-base leading-relaxed text-muted-foreground/90 max-w-lg prose prose-sm dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: safeDescription }}
    />
  ) : (
    <p className="text-base leading-relaxed text-muted-foreground/90 max-w-lg">
      {emptyText}
    </p>
  )
);

ProductDescription.displayName = 'ProductDescription';

const ConfigurableTrustBadges = ({
  title,
  subtitle,
  items,
  variant = 'strip',
}: {
  title?: string;
  subtitle?: string;
  items?: string[];
  variant?: 'strip' | 'grid' | 'minimal';
}) => (
  <TrustedBadgePanel
    title={title}
    subtitle={subtitle}
    items={items}
    variant={variant}
  />
);

ConfigurableTrustBadges.displayName = 'ConfigurableTrustBadges';

/**
 * Premium Tech variants for Nova Mobile
 */
const SpecsGrid = ({
  specs,
  header,
  price,
  actions,
  variantSelector,
  emptyStateText = 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.',
}: {
  specs: Array<{ label: string; value: string }>;
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variantSelector?: React.ReactNode;
  emptyStateText?: string;
}) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        {header}
        {price}
      </div>

      {variantSelector}

      <div className="grid grid-cols-2 gap-4 py-8 border-y border-border/50">
        {specs.length > 0 ? specs.map((spec, i) => (
          <StaticMotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="flex flex-col gap-1 p-4 rounded-2xl bg-secondary/30 border border-border/5"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
              {spec.label}
            </span>
            <span className="text-sm font-black text-foreground">
              {spec.value}
            </span>
          </StaticMotionDiv>
        )) : (
          <div className="col-span-2 py-4 text-center text-muted-foreground text-sm italic">
            {emptyStateText}
          </div>
        )}
      </div>

      {actions}
    </div>
  );
};

SpecsGrid.displayName = 'SpecsGrid';

const BentoSpecs = ({
  specs,
  header,
  price,
  actions,
  variantSelector,
  emptyStateText = 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.',
}: {
  specs: Array<{ label: string; value: string }>;
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variantSelector?: React.ReactNode;
  emptyStateText?: string;
}) => {
  const mainSpec = specs[0];
  const otherSpecs = specs.slice(1, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        {header}
        {price}
      </div>

      {variantSelector}

      <div className="grid grid-cols-4 gap-3">
        {specs.length > 0 ? (
          <>
            {/* Hero Spec */}
            {mainSpec && (
              <StaticMotionDiv
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="col-span-4 p-6 rounded-3xl bg-primary text-primary-foreground flex flex-col justify-between min-h-[160px] relative overflow-hidden group"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                  <span className="text-xs font-black uppercase tracking-widest opacity-70">{mainSpec.label}</span>
                  <p className="text-3xl font-black mt-2 leading-none">{mainSpec.value}</p>
                </div>
                <div className="relative z-10 mt-4">
                  <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <StaticMotionDiv
                      initial={{ width: 0 }}
                      animate={{ width: '66%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-white"
                    />
                  </div>
                </div>
              </StaticMotionDiv>
            )}

            {/* Secondary Specs */}
            {otherSpecs.map((spec, i) => (
              <StaticMotionDiv
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                key={i}
                className="p-4 rounded-3xl border border-border/50 flex flex-col justify-center gap-1 col-span-2 bg-secondary/40 backdrop-blur-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                  {spec.label}
                </span>
                <span className="text-base font-black text-foreground">
                  {spec.value}
                </span>
              </StaticMotionDiv>
            ))}
          </>
        ) : (
          <div className="col-span-4 p-8 rounded-3xl border border-dashed border-border/50 text-center text-muted-foreground text-sm italic">
            {emptyStateText}
          </div>
        )}
      </div>

      {actions}
    </div>
  );
};

BentoSpecs.displayName = 'BentoSpecs';

const StickyMobileCTA = ({
  activePrice,
  currency,
  onAddToCart,
  isVisible,
  label = 'اشتر الآن',
}: {
  activePrice: number;
  currency: string;
  onAddToCart: () => void;
  isVisible: boolean;
  label?: string;
}) => {
  const displayPrice = formatStorefrontCurrency(activePrice, currency);

  return (
    <StaticMotionDiv
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 sm:hidden pointer-events-none"
    >
      <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-3 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 pointer-events-auto max-w-md mx-auto">
        <div className="flex flex-col pl-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</span>
          <span className="text-lg font-black text-foreground">{displayPrice}</span>
        </div>

        <StaticMotionButton
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 0 0 0px hsl(var(--primary)/0.4)",
              "0 0 0 10px hsl(var(--primary)/0)",
              "0 0 0 0px hsl(var(--primary)/0)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          onClick={onAddToCart}
          className="flex-1 h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
        >
          أضف للسلة
        </StaticMotionButton>
      </div>
    </StaticMotionDiv>
  );
};

StickyMobileCTA.displayName = 'StickyMobileCTA';

const PlayfulStory = ({
  header,
  price,
  actions,
  variants,
  description,
}: {
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variants: React.ReactNode;
  description: React.ReactNode;
}) => (
  <div className="relative flex flex-col gap-6">
    <StaticMotionDiv
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      className="rounded-[3rem] border-8 border-white bg-white/60 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className="flex flex-col gap-4">
        {header}
        {price}
      </div>

      <div className="my-8 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="space-y-6">
        {variants && <div className="space-y-2">{variants}</div>}
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-secondary/80 px-4 py-1 text-xs font-black uppercase tracking-widest text-secondary-foreground">
            The Story
          </div>
          <div className="text-base leading-relaxed text-foreground/80">
            {description}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {actions}
      </div>
    </StaticMotionDiv>

    {/* Decorative floating elements for the story */}
    <StaticMotionDiv
      animate={{
        y: [0, -10, 0],
        rotate: [0, 5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute -right-8 -top-8 h-20 w-20 opacity-20 drop-shadow-xl"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full fill-primary">
        <path d="M50 0 L100 50 L50 100 L0 50 Z" />
      </svg>
    </StaticMotionDiv>
  </div>
);

PlayfulStory.displayName = 'PlayfulStory';

const ProductInfo: React.FC<ProductInfoProps> = ({ section, settings: sectionSettings }) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const variant = section?.variant || 'standard';
  const location = useLocation();
  const { product, isLoading, error, refetch } = useProduct(id);
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { trackAddToCartEvent, trackViewContentEvent } = useStorefrontFacebookTracking();
  const { theme } = useStorefrontTheme();
  const isAirlume = theme.id === 'airlume-ai';
  const isNovaMobile = theme.id === 'nova-mobile';
  const isCairoStride = theme.id === 'cairo-stride';
  const isFakhama = theme.id === 'fakhama-elite';
  const isZenOrganic = theme.id === 'zen-organic';
  const isIntruderNft = theme.id === 'intruder-nft';
  const isMenShoesEg = theme.id === 'men-shoes-eg';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isCutlineClub = theme.id === 'cutline-club';
  const isLegacyDefaultOld = theme.id === 'legacy-default-old';
  const isElessiPackTheme = theme.id?.startsWith('elessi-') === true;
  const isPcHubCommandSpecs = theme.id === 'pc-hub-eg' && variant === 'command-specs';
  const isWomenStyleLedger =
    theme.id === 'women-fashion-eg' && variant === 'style-ledger';
  const isWomenUtilityRail =
    theme.id === 'women-fashion-eg' && variant === 'utility-rail';
  const isStyleStoreUtilityRail =
    theme.id === 'style-store-eg' && variant === 'utility-rail';
  const isVelaFashionDirectBuybox =
    theme.id === 'vela-fashion-eg' && variant === 'fashion-direct-buybox';
  const isAtelierBuybox =
    (theme.id === 'rose-boutique-eg' || theme.id === 'baladi-market-eg') && variant === 'atelier-buybox';
  const isButcherAtelier = theme.id === 'butcher-counter-eg';
  const isWomenProductInfoVariant = isWomenStyleLedger || isWomenUtilityRail;
  const isPerfumeScentBrief =
    theme.id === 'perfume-eg' && variant === 'scent-brief';
  const isElessiBagBuybox = variant === 'elessi-bag-buybox';
  const isElessiBuybox = variant === 'elessi-buybox';
  const isElessiSpecBuybox = variant === 'elessi-spec-buybox';
  const isElessiGarageBuybox = variant === 'elessi-garage-buybox';
  const isElessiGiftBuybox = variant === 'elessi-gift-buybox';
  const isElessiPetBuybox = variant === 'elessi-pet-buybox';
  const isElessiWatchBuybox = variant === 'elessi-watch-buybox';
  const isElessiCareBuybox = variant === 'elessi-care-buybox';
  const isElessiOrganicBuybox = variant === 'elessi-organic-buybox';
  const isElessiPlantBuybox = variant === 'elessi-plant-buybox';
  const isElessiBikeBuybox = variant === 'elessi-bike-buybox';
  const isElessiDigitalBuybox = variant === 'elessi-digital-buybox';
  const isAnyElessiBuybox =
    isElessiBuybox ||
    isElessiSpecBuybox ||
    isElessiGarageBuybox ||
    isElessiGiftBuybox ||
    isElessiCareBuybox;
  const prefersArabicCopy =
    theme.direction === 'rtl' ||
    isZenOrganic ||
    isAirlume ||
    isCairoStride ||
    isFakhama;
  const usesCommerceHeaderLabel =
    isAnyElessiBuybox || isElessiOrganicBuybox || isElessiBagBuybox || isElessiPlantBuybox || isElessiBikeBuybox || isElessiDigitalBuybox;

  const commerceAdvancedEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'commerce-advanced',
  );
  const conversionSuiteEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'conversion-suite',
  );
  const commerceAdvancedSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'commerce-advanced',
  );

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const quantity = usePdpSelectionStore((state) => state.quantity);
  const setQuantity = usePdpSelectionStore((state) => state.setQuantity);
  const syncPdpSelection = usePdpSelectionStore((state) => state.syncSelection);
  const resetPdpSelection = usePdpSelectionStore((state) => state.resetSelection);
  const { addItem, isOpen: isCartOpen } = useCartStore();
  const lastTrackedProductIdRef = useRef('');
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [isGalleryZoomOpen, setIsGalleryZoomOpen] = useState(false);
  const [isMobileDescriptionExpanded, setIsMobileDescriptionExpanded] = useState(false);
  const [isMobileVariantSheetOpen, setIsMobileVariantSheetOpen] = useState(false);
  const [mobileVariantSheetMode, setMobileVariantSheetMode] = useState<'cart' | 'checkout'>('cart');
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
  const [isSizeGuideDialogOpen, setIsSizeGuideDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [elessiLowerSection, setElessiLowerSection] = useState<'details' | 'support'>('details');
  const [elessiSocialProofStep, setElessiSocialProofStep] = useState(0);
  const [elessiCountdownNow, setElessiCountdownNow] = useState(() => Date.now());
  const [isInlineQuickOrderVisible, setIsInlineQuickOrderVisible] = useState(false);
  const [personalizationText, setPersonalizationText] = useState('');
  const [selectedPersonalizationOptions, setSelectedPersonalizationOptions] = useState<
    Record<string, string>
  >({});
  const [butcherWeight, setButcherWeight] = useState(1);
  const [butcherPrep, setButcherPrep] = useState<Record<string, string>>({
    cut: prefersArabicCopy ? 'مكعبات' : 'Cubes',
    trim: prefersArabicCopy ? 'وسط' : 'Regular',
    cleaning: prefersArabicCopy ? 'عادي' : 'Standard',
  });
  const [questionForm, setQuestionForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const buyActionsRef = useRef<HTMLDivElement>(null);

  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'USD';
  const commerceModules =
    (commerceAdvancedSettings['modules'] as Record<string, any> | undefined) || {};
  const commerceUi =
    (commerceAdvancedSettings['ui'] as Record<string, any> | undefined) || {};
  const commerceCopy =
    (commerceAdvancedSettings['copy'] as Record<string, any> | undefined) || {};
  const conversionSuiteSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionModules =
    (conversionSuiteSettings['modules'] as Record<string, any> | undefined) || {};
  const conversionUi =
    (conversionSuiteSettings['ui'] as Record<string, any> | undefined) || {};
  const conversionCopy =
    (conversionSuiteSettings['copy'] as Record<string, any> | undefined) || {};
  const conversionThresholds =
    (conversionSuiteSettings['thresholds'] as Record<string, any> | undefined) || {};
  const conversionEstimatedDelivery =
    (conversionSuiteSettings['estimatedDelivery'] as Record<string, any> | undefined) || {};
  const productPageCheckoutEnabled =
    storefrontSettings?.storefrontSettings?.productPageShowCheckoutForm !== false;
  const pdpSections = theme.pages.pdp?.sections || [];
  const embeddedPdpCheckoutSection = pdpSections.find((sectionEntry) => {
    const sectionType =
      typeof sectionEntry === 'string' ? sectionEntry : sectionEntry.type;
    const componentKey = getStorefrontSectionComponentKey(sectionType);
    return (
      sectionType === PDP_CHECKOUT_SECTION_ID ||
      componentKey === PDP_CHECKOUT_SECTION_ID
    );
  });
  const isKhemetLuxeTheme = isKhemetLuxeThemeId(theme.id);
  const isKhemetLuxeV2Theme = theme.id === 'khemet-luxe-v2';
  const isKhemetInlineQuickOrderBuybox =
    isKhemetLuxeTheme && variant === 'elessi-care-buybox' && !isKhemetLuxeV2Theme;
  const khemetInlineQuickOrderFallbackSettings =
    isKhemetInlineQuickOrderBuybox
      ? {
          title: 'كمّلي بيانات الطلب',
          subtitle:
            'اختاري اللون والمقاس الأول، وبعدها سيبي بياناتك وسنأكد معاكي الطلب.',
          emptyStateText: 'اختاري اللون والمقاس الأول.',
          scrollToBuyBoxText: 'اختيار اللون والمقاس',
          addToCartButtonText: 'إضافة للسلة',
          submitButtonText: 'تأكيد الطلب',
          formVariant: 'khemet-luxe-eg',
          placement: 'before-description',
          surfaceMode: 'merged-buybox',
          showQuantity: true,
          showAddToCartButton: true,
          showOrderSummary: true,
          fields: {
            alternatePhone: {
              enabled: false,
              required: false,
            },
          },
        }
      : undefined;
  const embeddedPdpCheckoutSettings =
    embeddedPdpCheckoutSection &&
    typeof embeddedPdpCheckoutSection !== 'string' &&
    embeddedPdpCheckoutSection.settings &&
    typeof embeddedPdpCheckoutSection.settings === 'object'
      ? (embeddedPdpCheckoutSection.settings as Record<string, unknown>)
      : khemetInlineQuickOrderFallbackSettings;
  const embeddedQuantityOffersSection = pdpSections.find((sectionEntry) => {
    const sectionType =
      typeof sectionEntry === 'string' ? sectionEntry : sectionEntry.type;
    const componentKey = getStorefrontSectionComponentKey(sectionType);
    return sectionType === 'quantity-offers' || componentKey === 'quantity-offers';
  });
  const embeddedQuantityOffersSectionConfig =
    embeddedQuantityOffersSection && typeof embeddedQuantityOffersSection !== 'string'
      ? embeddedQuantityOffersSection
      : undefined;
  const embeddedQuantityOffersSettings =
    embeddedQuantityOffersSectionConfig &&
    embeddedQuantityOffersSectionConfig.settings &&
    typeof embeddedQuantityOffersSectionConfig.settings === 'object'
      ? (embeddedQuantityOffersSectionConfig.settings as Record<string, unknown>)
      : undefined;
  const embeddedTrustedBadgesSection = pdpSections.find((sectionEntry) => {
    const sectionType =
      typeof sectionEntry === 'string' ? sectionEntry : sectionEntry.type;
    const componentKey = getStorefrontSectionComponentKey(sectionType);
    return sectionType === 'trusted-badges' || componentKey === 'trusted-badges';
  });
  const embeddedTrustedBadgesSectionConfig =
    embeddedTrustedBadgesSection && typeof embeddedTrustedBadgesSection !== 'string'
      ? embeddedTrustedBadgesSection
      : undefined;
  const embeddedTrustedBadgesSettings =
    embeddedTrustedBadgesSectionConfig &&
    embeddedTrustedBadgesSectionConfig.settings &&
    typeof embeddedTrustedBadgesSectionConfig.settings === 'object'
      ? (embeddedTrustedBadgesSectionConfig.settings as Record<string, unknown>)
      : undefined;
  const hasEmbeddedPdpCheckout =
    productPageCheckoutEnabled &&
    Boolean(embeddedPdpCheckoutSection || khemetInlineQuickOrderFallbackSettings);
  const shouldOpenCartAfterAddToCart = shouldProductInfoAddToCartOpenCart(
    theme.id,
    hasEmbeddedPdpCheckout,
  );
  const shouldOpenEmbeddedCheckoutAfterAddToCart =
    shouldProductInfoAddToCartOpenEmbeddedCheckout(
      theme.id,
      hasEmbeddedPdpCheckout,
    );
  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings?.storefrontSettings?.designTokens,
  );
  const hasStoredPdpQuickOrderSettings = isRecord(
    isRecord(storefrontSettings?.storefrontSettings?.designTokens)
      ? storefrontSettings?.storefrontSettings?.designTokens['pdpQuickOrder']
      : undefined,
  );
  const pdpQuickOrderPlacement =
    hasStoredPdpQuickOrderSettings
      ? pdpQuickOrderSettings.placement
      : embeddedPdpCheckoutSettings?.placement === 'before-description'
      ? 'before-description'
      : embeddedPdpCheckoutSettings?.placement === 'after-description'
        ? 'after-description'
        : pdpQuickOrderSettings.placement;
  const pdpQuickOrderSurfaceMode =
    hasStoredPdpQuickOrderSettings
      ? pdpQuickOrderSettings.surfaceMode
      : embeddedPdpCheckoutSettings?.surfaceMode === 'merged-buybox'
      ? 'merged-buybox'
      : 'standalone';
  const supportsInlineQuickOrderPlacement =
    !isIntruderNft &&
    (theme.id === 'zen-organic' ||
      variant === 'standard' ||
        variant === 'accordion' ||
        variant === 'atelier-buybox' ||
        variant === 'boutique-ledger' ||
        variant === 'elessi-care-buybox' ||
        variant === 'scent-brief' ||
        variant === 'fashion-direct-buybox' ||
        variant === 'style-ledger' ||
        variant === 'utility-rail' ||
        variant === 'gear-loadout' ||
        variant === 'playful-story');
  const forceInlineKhemetQuickOrder =
    isKhemetInlineQuickOrderBuybox && productPageCheckoutEnabled;
    const shouldCollapseDescriptionByDefault =
      isWomenUtilityRail || isVelaFashionDirectBuybox;
  const shouldRenderInlinePdpQuickOrder =
    forceInlineKhemetQuickOrder ||
    (hasEmbeddedPdpCheckout && supportsInlineQuickOrderPlacement);
  const shouldRenderInlineQuantityOffers =
    Boolean(embeddedQuantityOffersSection) &&
    embeddedQuantityOffersSettings?.placement === 'inline-buybox';
  const isPrimaryQuantityOffersDecision =
    shouldRenderInlineQuantityOffers &&
    embeddedQuantityOffersSettings?.decisionMode === 'primary';

  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const checkoutPath = buildStorefrontPath(location.pathname, '/checkout', location.search);

  const selectedVariant = useMemo(() => {
    const variants = product?.productVariants || [];

    if (!variants.length || Object.keys(selectedAttributes).length === 0) {
      return null;
    }

    return (
      variants.find((variant) => {
        const variantAttributes = getVariantAttributes(variant);
        const variantEntries = Object.entries(variantAttributes);

        return (
          variantEntries.length === Object.keys(selectedAttributes).length &&
          variantEntries.every(([key, value]) => selectedAttributes[key] === value)
        );
      }) || null
    );
  }, [product?.productVariants, selectedAttributes]);
  const selectedVariantGalleryImages = selectedVariant
    ? buildStorefrontImageCandidates(
        (selectedVariant as { images?: unknown }).images,
        (selectedVariant as { galleryImages?: unknown }).galleryImages,
        selectedVariant.imageUrl,
        selectedVariant.image,
        product?.images,
      )
    : [];
  const selectedPrimaryImage =
    selectedVariantGalleryImages[0] ||
    getPrimaryProductImage(selectedVariant as any) ||
    getPrimaryProductImage(product) ||
    '';

  useEffect(() => {
    if (product?.productVariants?.length && Object.keys(selectedAttributes).length === 0) {
      const firstVariantAttributes = getVariantAttributes(product.productVariants[0]);
      if (Object.keys(firstVariantAttributes).length > 0) {
        setSelectedAttributes(firstVariantAttributes);
      }
    }
  }, [product?.productVariants, selectedAttributes]);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id, setQuantity]);

  useEffect(() => {
    return () => {
      resetPdpSelection();
    };
  }, [resetPdpSelection]);

  useEffect(() => {
    if (!product || lastTrackedProductIdRef.current === product.id) {
      return;
    }

    const eventId = trackViewContentEvent({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      category: product.category?.name,
    });
    if (eventId !== undefined) {
      lastTrackedProductIdRef.current = product.id;
    }
  }, [product, trackViewContentEvent]);

  const dispatchEmbeddedCheckoutOpen = () => {
    if (!product || !hasEmbeddedPdpCheckout) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(STOREFRONT_PDP_CHECKOUT_OPEN_EVENT, {
        detail: {
          productId: product.id,
          productKey: product.slug || id,
        },
      }),
    );
  };

  const addCurrentSelectionToCart = ({ openCart }: { openCart: boolean }) => {
    if (!product) {
      return false;
    }

    if (product.productVariants?.length && !selectedVariant) {
      toast.error(
        prefersArabicCopy
          ? '\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u062A\u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0627\u062D \u0623\u0648\u0644\u064B\u0627.'
          : 'Please select an available variant first.',
      );
      return false;
    }

    const attributeHash = JSON.stringify(cartSelectionAttributes);
    const cartItemId = selectedVariant?.id
      ? `${product.id}-${selectedVariant.id}`
      : `${product.id}-${attributeHash}`;
    const unitPrice =
      typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
        ? selectedVariant.price
        : product.price;
    const selectedVolumeDiscounts =
      selectedVariant ? getProductVolumeDiscounts(selectedVariant) : [];

    const finalAttributes = {
      ...cartSelectionAttributes,
      ...(isButcherAtelier ? {
        [prefersArabicCopy ? 'الوزن' : 'Weight']: `${butcherWeight} ${prefersArabicCopy ? 'كجم' : 'KG'}`,
        [prefersArabicCopy ? 'التقطيع' : 'Cut']: butcherPrep.cut,
        [prefersArabicCopy ? 'التجهيز' : 'Prep']: butcherPrep.trim,
      } : {}),
    };

    addItem(
      {
        id: cartItemId,
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        name: product.name,
        price: isButcherAtelier ? unitPrice * butcherWeight : unitPrice,
        basePrice: unitPrice,
        comparePrice: typeof activeComparePrice === 'number' ? activeComparePrice : undefined,
        quantity: isButcherAtelier ? 1 : quantity,
        imageUrl: selectedPrimaryImage,
        attributes: finalAttributes,
        volumeDiscounts:
          selectedVolumeDiscounts.length > 0
            ? selectedVolumeDiscounts
            : getProductVolumeDiscounts(product),
      },
      {
        openCart,
      },
    );

    trackAddToCartEvent({
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity,
      category: product.category?.name,
    });

    return true;
  };

  const handleAddToCart = () => {
    const didAddToCart = addCurrentSelectionToCart({
      openCart: shouldOpenCartAfterAddToCart,
    });

    if (!didAddToCart) {
      return;
    }

    if (shouldOpenEmbeddedCheckoutAfterAddToCart) {
      dispatchEmbeddedCheckoutOpen();
    }
  };

  const handleBuyNow = () => {
    if (hasEmbeddedPdpCheckout) {
      if (product?.productVariants?.length && !selectedVariant) {
        toast.error(
          prefersArabicCopy
            ? '\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u062A\u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0627\u062D \u0623\u0648\u0644\u064B\u0627.'
            : 'Please select an available variant first.',
        );
        return;
      }

      dispatchEmbeddedCheckoutOpen();
      return;
    }

    const didAddToCart = addCurrentSelectionToCart({ openCart: false });

    if (!didAddToCart) {
      return;
    }

    window.location.assign(checkoutPath);
  };

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    const handleStickyAdd = (event: Event) => {
      const customEvent = event as CustomEvent<{ productId?: string }>;
      const requestedProductId = customEvent.detail?.productId;

      if (
        requestedProductId &&
        requestedProductId !== product.id &&
        requestedProductId !== product.slug &&
        requestedProductId !== id
      ) {
        return;
      }

      handleAddToCart();
    };

    window.addEventListener('storefront:sticky-add-to-cart', handleStickyAdd as EventListener);
    return () => {
      window.removeEventListener('storefront:sticky-add-to-cart', handleStickyAdd as EventListener);
    };
  }, [handleAddToCart, id, product]);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    const handleStickyBuyNow = (event: Event) => {
      const customEvent = event as CustomEvent<{ productId?: string }>;
      const requestedProductId = customEvent.detail?.productId;

      if (
        requestedProductId &&
        requestedProductId !== product.id &&
        requestedProductId !== product.slug &&
        requestedProductId !== id
      ) {
        return;
      }

      handleBuyNow();
    };

    window.addEventListener('storefront:sticky-buy-now', handleStickyBuyNow as EventListener);
    return () => {
      window.removeEventListener('storefront:sticky-buy-now', handleStickyBuyNow as EventListener);
    };
  }, [checkoutPath, handleBuyNow, id, product]);

  const shouldTrackStickyBuybox = variant === 'atelier-buybox' || variant === 'elessi-care-buybox' || !productPageCheckoutEnabled;

  useEffect(() => {
    if (!shouldTrackStickyBuybox) {
      setShowStickyCta(false);
      return undefined;
    }

    const handleScroll = () => {
      if (isCartOpen) {
        setShowStickyCta(false);
        return;
      }

      if (!buyActionsRef.current) return;
      const rect = buyActionsRef.current.getBoundingClientRect();
      // Show sticky CTA only when the original buy button is scrolled past
      setShowStickyCta(rect.top < 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCartOpen, shouldTrackStickyBuybox]);

  useEffect(() => {
    if (isCartOpen) {
      setIsMobileVariantSheetOpen(false);
    }
  }, [isCartOpen]);

  useEffect(() => {
    if (!isKhemetInlineQuickOrderBuybox || typeof window === 'undefined') {
      setIsInlineQuickOrderVisible(false);
      return undefined;
    }

    const target = document.getElementById(PDP_CHECKOUT_SECTION_ID);
    if (!target || typeof IntersectionObserver === 'undefined') {
      setIsInlineQuickOrderVisible(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInlineQuickOrderVisible(Boolean(entry?.isIntersecting));
      },
      {
        rootMargin: '0px 0px -112px 0px',
        threshold: 0.12,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isKhemetInlineQuickOrderBuybox, product?.id]);

  const initialProductMetadata = product ? parseProductMetadata(product['metadata']) : {};
  const initialPersonalizationConfig = parseProductMetadata(
    product ? initialProductMetadata['personalization'] || product['personalization'] : undefined,
  );
  const initialPersonalizationFields = parseMetadataArray<{
    key?: string;
    label?: string;
    options?: string[];
  }>(initialPersonalizationConfig['fields'])
    .map((field) => ({
      key: String(field?.key || '').trim(),
      label: String(field?.label || '').trim(),
      options: Array.isArray(field?.options)
        ? field.options.map((option) => String(option || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((field) => field.key && field.label && field.options.length > 0);
  const initialPersonalizationTextLabel =
    typeof initialPersonalizationConfig['textLabel'] === 'string' &&
    initialPersonalizationConfig['textLabel'].trim()
      ? initialPersonalizationConfig['textLabel'].trim()
      : prefersArabicCopy
        ? 'أضيفي النص'
        : 'Personalization text';
  const initialPersonalizationEnabled = parseBooleanSetting(
    product?.['personalizationEnabled'] ?? initialProductMetadata['personalizationEnabled'],
    initialPersonalizationFields.length > 0,
  );
  const initialPersonalizationAttributeSelections = useMemo(() => {
    if (!initialPersonalizationEnabled) {
      return {};
    }

    const fieldSelections = initialPersonalizationFields.reduce<Record<string, string>>(
      (accumulator, field) => {
        const selectedValue = String(selectedPersonalizationOptions[field.key] || '').trim();
        if (selectedValue) {
          accumulator[field.label] = selectedValue;
        }
        return accumulator;
      },
      {},
    );

    const trimmedPersonalizationText = personalizationText.trim();
    if (trimmedPersonalizationText) {
      fieldSelections[initialPersonalizationTextLabel] = trimmedPersonalizationText;
    }

    return fieldSelections;
  }, [
    initialPersonalizationEnabled,
    initialPersonalizationFields,
    initialPersonalizationTextLabel,
    personalizationText,
    selectedPersonalizationOptions,
  ]);
  const initialCartSelectionAttributes = useMemo(
    () => ({
      ...selectedAttributes,
      ...initialPersonalizationAttributeSelections,
    }),
    [initialPersonalizationAttributeSelections, selectedAttributes],
  );
  const initialSaleEndDate =
    typeof initialProductMetadata['saleEndDate'] === 'string' &&
    initialProductMetadata['saleEndDate'].trim()
      ? String(initialProductMetadata['saleEndDate']).trim()
      : typeof product?.['saleEndDate'] === 'string' && product['saleEndDate'].trim()
        ? product['saleEndDate'].trim()
        : '';
  const initialSoldCount = parseMaybeNumber(product?.['soldCount']) ?? 0;
  const initialSoldCounterEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'soldCounter',
  );
  const initialPurchaseFomoEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'purchaseFomo',
  );
  const initialActiveCartPressure =
    parseMaybeNumber(product?.['activeCartCount']) ??
    parseMaybeNumber(product?.socialProof?.activeCartCount) ??
    0;
  const initialRecentOrderCount =
    parseMaybeNumber(product?.['recentOrderCount']) ??
    parseMaybeNumber(product?.socialProof?.recentOrderCount) ??
    initialSoldCount;
  const initialElessiSocialProofSeed = product?.id ? hashProductSeed(product.id) % 23 : 0;
  const initialAnimatedRecentOrderCount =
    initialSoldCounterEnabled && initialRecentOrderCount > 0
      ? getOscillatingCounterValue({
          base: initialRecentOrderCount,
          step: elessiSocialProofStep,
          seed: initialElessiSocialProofSeed,
          floor: 1,
          maxSwing: 2,
        })
      : 0;
  const initialAnimatedActiveCartPressure =
    initialPurchaseFomoEnabled && initialActiveCartPressure > 0
      ? getOscillatingCounterValue({
          base: initialActiveCartPressure,
          step: elessiSocialProofStep + 1,
          seed: initialElessiSocialProofSeed + 5,
          floor: 2,
          maxSwing: 3,
        })
      : 0;
  const initialElessiSocialProofItems = [
    initialAnimatedRecentOrderCount > 0
      ? {
          accentClassName: 'text-[#e2753f]',
          emoji: '🔥',
          key: 'sold' as const,
          label: prefersArabicCopy
            ? `${initialAnimatedRecentOrderCount} اتباعت في آخر ٧ ساعات`
            : `${initialAnimatedRecentOrderCount} sold in the last 7 hours`,
        }
      : null,
    initialAnimatedActiveCartPressure > 0
      ? {
          accentClassName: 'text-[#caa487]',
          emoji: '✨',
          key: 'cart' as const,
          label: prefersArabicCopy
            ? `أكثر من ${initialAnimatedActiveCartPressure} عميلة ضافتهم لسلاتهم دلوقتي`
            : `Hurry! Over ${initialAnimatedActiveCartPressure} shoppers have this in their carts`,
        }
      : null,
  ].filter(Boolean) as Array<{
    accentClassName: string;
    emoji: string;
    key: 'sold' | 'cart';
    label: string;
  }>;
  const initialElessiCountdownLabel = prefersArabicCopy
    ? 'أسرعي! العرض بيخلص خلال:'
    : 'Hurry up! Sale end in:';
  const initialElessiSaleCountdownTarget = resolveSaleCountdownTimestamp(initialSaleEndDate);
  const initialElessiSaleCountdown = (() => {
    if (!initialElessiSaleCountdownTarget) {
      return null;
    }

    const locale = 'en-US';
    const srLocale = resolveDateLocale(currency);
    const countdownParts = getSaleCountdownParts(
      initialElessiSaleCountdownTarget,
      elessiCountdownNow,
    );
    if (!countdownParts) {
      return null;
    }

    return {
      label: initialElessiCountdownLabel,
      units: [
        {
          key: 'days' as const,
          label: prefersArabicCopy ? 'يوم' : 'DAYS',
          value: formatSaleCountdownValue(countdownParts.days, locale),
        },
        {
          key: 'hours' as const,
          label: prefersArabicCopy ? 'ساعة' : 'HOURS',
          value: formatSaleCountdownValue(countdownParts.hours, locale, 2),
        },
        {
          key: 'minutes' as const,
          label: prefersArabicCopy ? 'دقيقة' : 'MINS',
          value: formatSaleCountdownValue(countdownParts.minutes, locale, 2),
        },
        {
          key: 'seconds' as const,
          label: prefersArabicCopy ? 'ثانية' : 'SECS',
          value: formatSaleCountdownValue(countdownParts.seconds, locale, 2),
        },
      ],
      srDateLabel: new Intl.DateTimeFormat(srLocale, {
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(initialElessiSaleCountdownTarget)),
    };
  })();

  useEffect(() => {
    if (!initialPersonalizationEnabled) {
      setPersonalizationText((currentValue) => (currentValue ? '' : currentValue));
      setSelectedPersonalizationOptions((currentOptions) =>
        Object.keys(currentOptions).length > 0 ? {} : currentOptions,
      );
      return;
    }

    const defaultSelections = initialPersonalizationFields.reduce<Record<string, string>>(
      (accumulator, field) => {
        accumulator[field.key] = field.options[0] || '';
        return accumulator;
      },
      {},
    );

    setPersonalizationText((currentValue) => (currentValue ? '' : currentValue));
    setSelectedPersonalizationOptions((currentOptions) => {
      const currentKeys = Object.keys(currentOptions);
      const nextKeys = Object.keys(defaultSelections);
      const hasSameSelections =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => currentOptions[key] === defaultSelections[key]);

      return hasSameSelections ? currentOptions : defaultSelections;
    });
  }, [initialPersonalizationEnabled, initialPersonalizationFields, product?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleZoomState = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setIsGalleryZoomOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener(
      'storefront:pdp-gallery-zoom-open',
      handleZoomState as EventListener,
    );

    return () => {
      window.removeEventListener(
        'storefront:pdp-gallery-zoom-open',
        handleZoomState as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    setQuestionForm({
      name: '',
      email: '',
      phone: '',
      message: '',
    });
    setIsQuestionDialogOpen(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) {
      syncPdpSelection(null);
      return;
    }

    const unitPrice =
      typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
        ? selectedVariant.price
        : product.price;
    const selectedVolumeDiscounts =
      selectedVariant ? getProductVolumeDiscounts(selectedVariant) : [];

    syncPdpSelection({
      productId: product.id,
      productSlug: product.slug || id,
      productName: product.name,
      variantId: selectedVariant?.id ?? null,
      imageUrl: selectedPrimaryImage,
      unitPrice,
      basePrice: unitPrice,
      attributes: initialCartSelectionAttributes,
      volumeDiscounts:
        selectedVolumeDiscounts.length > 0
          ? selectedVolumeDiscounts
          : getProductVolumeDiscounts(product),
      requiresVariantSelection: Boolean(product.productVariants?.length),
      isSelectionReady:
        !product.productVariants?.length || Boolean(selectedVariant),
    });
  }, [
    id,
    initialCartSelectionAttributes,
    product,
    selectedPrimaryImage,
    selectedVariant,
    syncPdpSelection,
  ]);

  useEffect(() => {
    setElessiSocialProofStep(0);
  }, [product?.id]);

  useEffect(() => {
    if (!isAnyElessiBuybox || !initialElessiSaleCountdownTarget) {
      return undefined;
    }

    setElessiCountdownNow(Date.now());
    const intervalId = window.setInterval(() => {
      setElessiCountdownNow(Date.now());
    }, ELESSI_COUNTDOWN_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [initialElessiSaleCountdownTarget, isAnyElessiBuybox]);

  useEffect(() => {
    if (!isElessiCareBuybox || initialElessiSocialProofItems.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElessiSocialProofStep((currentStep) => currentStep + 1);
    }, ELESSI_SOCIAL_PROOF_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [initialElessiSocialProofItems.length, isElessiCareBuybox]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex gap-2">
          <div className="h-4 bg-muted w-12 rounded" />
          <div className="h-4 bg-muted w-4 rounded" />
          <div className="h-4 bg-muted w-24 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-10 bg-muted w-3/4 rounded" />
          <div className="h-8 bg-muted w-1/4 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted w-full rounded" />
          <div className="h-4 bg-muted w-full rounded" />
          <div className="h-4 bg-muted w-2/3 rounded" />
        </div>
        <div className="h-12 bg-muted w-1/3 rounded" />
        <div className="flex gap-4">
          <div className="h-12 bg-muted w-24 rounded" />
          <div className="h-12 bg-muted flex-1 rounded" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    const errorTitle = prefersArabicCopy ? 'المنتج غير متاح' : 'Product Not Available';
    const errorMessage =
      error?.message ||
      (prefersArabicCopy
        ? 'لم نتمكن من العثور على المنتج الذي تبحث عنه.'
        : "We couldn't find the product you're looking for.");

    return (
      <div className="p-12 border-2 border-dashed border-border rounded-[var(--radius)] text-center bg-muted/10">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-foreground mb-2">{errorTitle}</h3>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => refetch()} variant="outline">
            {prefersArabicCopy ? 'حاول مرة أخرى' : 'Try Again'}
          </Button>
          <Link to={shopPath}>
            <Button>{prefersArabicCopy ? 'العودة إلى المتجر' : 'Back to Shop'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activePrice =
    typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
      ? selectedVariant.price
      : product.price;
  const activeComparePrice =
    typeof selectedVariant?.comparePrice === 'number' && Number.isFinite(selectedVariant.comparePrice)
      ? selectedVariant.comparePrice
      : product.comparePrice;
  const displayPrice = formatStorefrontCurrency(activePrice, currency);
  const originalPrice = activeComparePrice
    ? formatStorefrontCurrency(activeComparePrice, currency)
    : null;
  const discount = activeComparePrice && activeComparePrice > activePrice
    ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
    : null;

  const [cashbackPreview, setCashbackPreview] = useState<{
    cashback: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCashbackPreview(null);

    if (!product) {
      return undefined;
    }

    const companyId = storefrontSettings?.company?.id;
    const categoryId = (product as { category?: { id?: string | number } })?.category?.id;
    const amount = Number(activePrice) * Number(quantity || 1);

    if (!companyId || !Number.isFinite(amount) || amount <= 0) {
      return undefined;
    }

    const params = new URLSearchParams({
      companyId: String(companyId),
      productId: String(product.id),
      categoryId: categoryId ? String(categoryId) : '',
      amount: String(amount),
    });

    apiClient
      .get(`/loyalty/cashback-preview?${params.toString()}`)
      .then((response: any) => {
        if (cancelled) {
          return;
        }
        const payload = response?.data?.data ?? response?.data ?? {};
        if (!payload || payload.isDynamic === false) {
          return;
        }
        const cashback = Number(payload.cashback);
        if (!Number.isFinite(cashback) || cashback <= 0) {
          return;
        }
        setCashbackPreview({
          cashback,
          currency: payload.currency || currency,
        });
      })
      .catch(() => {
        // Fail silently: the badge is hidden when the endpoint is unavailable
        // or dynamic cashback is disabled.
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id, activePrice, quantity, storefrontSettings?.company?.id, currency]);

  const activeStock =
    typeof selectedVariant?.stock === 'number' && Number.isFinite(selectedVariant.stock)
      ? selectedVariant.stock
      : typeof product.stock === 'number' && Number.isFinite(product.stock)
        ? product.stock
        : null;
  const stockStatusLabel =
    typeof activeStock === 'number'
      ? activeStock <= 10
        ? prefersArabicCopy
          ? `متبقي ${activeStock}`
          : `${activeStock} left`
        : prefersArabicCopy
          ? 'متاح الآن'
          : 'Available now'
      : prefersArabicCopy
        ? 'متاح للطلب'
        : 'Available to order';
  const selectedOptionSummary = Object.values(selectedAttributes)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' • ');
  const safeDescription = sanitizeStorefrontHtml(product.description);
  // Consolidated Metadata Parsing
  const metadata = parseProductMetadata(product['metadata']);
  const variantSettings = parseVariantSettings(metadata['variantSettings']);
  const specsRaw = metadata['specs'] || product['specs'];
  const commandFactsRaw = metadata['commandFacts'] || product['commandFacts'];
  const decisionProofsRaw = metadata['decisionProofs'] || product['decisionProofs'];
  let specs: Array<{ label: string; value: string }> = [];
  let commandFacts: Array<{ label: string; value: string }> = [];
  let decisionProofs: Array<{ label: string; title: string; description: string }> = [];

  if (Array.isArray(specsRaw)) {
    specs = specsRaw;
  } else if (typeof specsRaw === 'string') {
    try {
      const parsed = JSON.parse(specsRaw);
      if (Array.isArray(parsed)) {
        specs = parsed;
      }
    } catch {
      specs = specsRaw.split('\n')
        .filter(line => line.includes(':'))
        .map(line => {
          const [labelPart, ...valParts] = line.split(':');
          const label = labelPart?.trim() || 'Spec';
          return { label, value: valParts.join(':').trim() };
        });
    }
  }

  if (Array.isArray(commandFactsRaw)) {
    commandFacts = commandFactsRaw
      .map((fact) => ({
        label: String(fact?.label || '').trim(),
        value: String(fact?.value || '').trim(),
      }))
      .filter((fact) => fact.label && fact.value);
  } else if (typeof commandFactsRaw === 'string') {
    try {
      const parsed = JSON.parse(commandFactsRaw);
      if (Array.isArray(parsed)) {
        commandFacts = parsed
          .map((fact) => ({
            label: String(fact?.label || '').trim(),
            value: String(fact?.value || '').trim(),
          }))
          .filter((fact) => fact.label && fact.value);
      }
    } catch {
      commandFacts = commandFactsRaw
        .split('\n')
        .filter((line) => line.includes(':'))
        .map((line) => {
          const [labelPart, ...valParts] = line.split(':');
          return {
            label: String(labelPart || '').trim(),
            value: valParts.join(':').trim(),
          };
        })
        .filter((fact) => fact.label && fact.value);
    }
  }

  if (Array.isArray(decisionProofsRaw)) {
    decisionProofs = decisionProofsRaw
      .map((proof) => ({
        label: String(proof?.label || '').trim(),
        title: String(proof?.title || '').trim(),
        description: String(proof?.description || '').trim(),
      }))
      .filter((proof) => proof.label && proof.title && proof.description);
  } else if (typeof decisionProofsRaw === 'string') {
    try {
      const parsed = JSON.parse(decisionProofsRaw);
      if (Array.isArray(parsed)) {
        decisionProofs = parsed
          .map((proof) => ({
            label: String(proof?.label || '').trim(),
            title: String(proof?.title || '').trim(),
            description: String(proof?.description || '').trim(),
          }))
          .filter((proof) => proof.label && proof.title && proof.description);
      }
    } catch {
      decisionProofs = [];
    }
  }

  const plainDescription = (product.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const shortDescription =
    plainDescription.length > 220
      ? `${plainDescription.slice(0, 217).trimEnd()}...`
      : plainDescription;
  const isStyleStoreDescriptionDuplicate =
    isStyleStoreUtilityRail &&
    Boolean(shortDescription) &&
    plainDescription === shortDescription;
  const isVelaFashionDescriptionDuplicate =
    isVelaFashionDirectBuybox &&
    Boolean(shortDescription) &&
    plainDescription === shortDescription;
  const shouldHideDuplicateDescriptionSection =
    isStyleStoreDescriptionDuplicate || isVelaFashionDescriptionDuplicate;
  const rawProductTags = product['tags'];
  const productTagValues = (
    Array.isArray(rawProductTags)
      ? rawProductTags
      : typeof rawProductTags === 'string'
        ? rawProductTags.split(',')
        : []
  )
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const productSku =
    typeof metadata['sku'] === 'string' && metadata['sku'].trim()
      ? metadata['sku'].trim()
      : typeof product['sku'] === 'string' && product['sku'].trim()
        ? product['sku'].trim()
        : '';
  const brandName =
    typeof metadata['brandName'] === 'string' && metadata['brandName'].trim()
      ? metadata['brandName'].trim()
      : typeof product['brandName'] === 'string' && product['brandName'].trim()
        ? product['brandName'].trim()
        : '';
  const brandSubtitle =
    typeof metadata['brandSubtitle'] === 'string' && metadata['brandSubtitle'].trim()
      ? metadata['brandSubtitle'].trim()
      : typeof product['brandSubtitle'] === 'string' && product['brandSubtitle'].trim()
        ? product['brandSubtitle'].trim()
        : '';
  const rawBrandUrl =
    typeof metadata['brandUrl'] === 'string' && metadata['brandUrl'].trim()
      ? metadata['brandUrl'].trim()
      : typeof product['brandUrl'] === 'string' && product['brandUrl'].trim()
        ? product['brandUrl'].trim()
        : '';
  const brandUrl = rawBrandUrl
    ? isExternalHref(rawBrandUrl)
      ? rawBrandUrl
      : buildStorefrontPath(
          location.pathname,
          rawBrandUrl.startsWith('/') ? rawBrandUrl : `/${rawBrandUrl}`,
          location.search,
        )
    : '';
  const brandSpotlight = (() => {
    const source = parseProductMetadata(
      metadata['brandSpotlight'] || product['brandSpotlight'],
    );
    const title =
      typeof source['title'] === 'string' && source['title'].trim()
        ? source['title'].trim()
        : '';
    const rawHref =
      typeof source['href'] === 'string' && source['href'].trim()
        ? source['href'].trim()
        : '';
    const normalizedInternalHref = rawHref.startsWith('/store/')
      ? rawHref.slice('/store'.length)
      : rawHref;
    const href = rawHref
      ? isExternalHref(rawHref)
        ? rawHref
        : buildStorefrontPath(
            location.pathname,
            normalizedInternalHref.startsWith('/')
              ? normalizedInternalHref
              : `/${normalizedInternalHref}`,
            location.search,
          )
      : '';
    const image =
      typeof source['image'] === 'string' && source['image'].trim()
        ? source['image'].trim()
        : '';
    const priceValue = parseMaybeNumber(source['price']);
    const price =
      typeof source['price'] === 'string' && source['price'].trim()
        ? source['price'].trim()
        : typeof priceValue === 'number'
          ? formatStorefrontCurrency(priceValue, currency)
          : '';

    if (!title) {
      return null;
    }

    return {
      title,
      href,
      image,
      price,
    };
  })();
  const saleEndDate =
    typeof metadata['saleEndDate'] === 'string' && metadata['saleEndDate'].trim()
      ? metadata['saleEndDate'].trim()
      : typeof product['saleEndDate'] === 'string' && product['saleEndDate'].trim()
        ? product['saleEndDate'].trim()
        : '';
  const supportSections = parseMetadataArray<{
    label?: string;
    title?: string;
    description?: string;
  }>(metadata['supportSections'] || product['supportSections'])
    .map((item) => ({
      label: String(item?.label || '').trim(),
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
    }))
    .filter((item) => item.title && item.description);
  const featureHighlights = parseMetadataArray<{
    title?: string;
    description?: string;
  }>(metadata['featureHighlights'] || product['featureHighlights'])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
    }))
    .filter((item) => item.title && item.description);
  const safeCheckoutItems = parseMetadataStringList(
    metadata['safeCheckoutItems'] || product['safeCheckoutItems'],
  );
  const personalizationConfig = parseProductMetadata(
    metadata['personalization'] || product['personalization'],
  );
  const personalizationFields = parseMetadataArray<{
    key?: string;
    label?: string;
    options?: string[];
  }>(personalizationConfig['fields'])
    .map((field) => ({
      key: String(field?.key || '').trim(),
      label: String(field?.label || '').trim(),
      options: Array.isArray(field?.options)
        ? field.options
            .map((option) => String(option || '').trim())
            .filter(Boolean)
        : [],
    }))
    .filter((field) => field.key && field.label && field.options.length > 0);
  const personalizationTitle =
    typeof personalizationConfig['title'] === 'string' &&
    personalizationConfig['title'].trim()
      ? personalizationConfig['title'].trim()
      : prefersArabicCopy
        ? 'تخصيص بسيط على القطعة؟'
        : 'Customize this piece?';
  const personalizationSubtitle =
    typeof personalizationConfig['subtitle'] === 'string' &&
    personalizationConfig['subtitle'].trim()
      ? personalizationConfig['subtitle'].trim()
      : '';
  const personalizationTextLabel =
    typeof personalizationConfig['textLabel'] === 'string' &&
    personalizationConfig['textLabel'].trim()
      ? personalizationConfig['textLabel'].trim()
      : prefersArabicCopy
        ? 'أضيفي النص'
        : 'Personalization text';
  const personalizationTextPlaceholder =
    typeof personalizationConfig['textPlaceholder'] === 'string' &&
    personalizationConfig['textPlaceholder'].trim()
      ? personalizationConfig['textPlaceholder'].trim()
      : prefersArabicCopy
        ? 'مثال: NOUR'
        : 'Example: NOUR';
  const personalizationMaxLength = clampNumber(
    parseMaybeNumber(personalizationConfig['maxLength']) ?? 18,
    3,
    36,
  );
  const personalizationEnabled = parseBooleanSetting(
    product['personalizationEnabled'] ?? metadata['personalizationEnabled'],
    personalizationFields.length > 0,
  );
  const personalizationAttributeSelections = initialPersonalizationAttributeSelections;

  const cartSelectionAttributes = initialCartSelectionAttributes;
  const pcHubFallbackUseCases = (() => {
    switch (String(product.categoryId || '').trim()) {
      case 'laptops':
        return prefersArabicCopy
          ? ['شغل يومي', 'دراسة ومحاضرات', 'تنقل خفيف']
          : ['Daily work', 'Study', 'Portable use'];
      case 'desktop-pcs':
        return prefersArabicCopy
          ? ['ألعاب', 'شغل ثقيل', 'ترقيات لاحقة']
          : ['Gaming', 'Heavy workflows', 'Upgrade-ready'];
      case 'monitors':
        return prefersArabicCopy
          ? ['شغل مكتبي', 'تصميم', 'تعدد نوافذ']
          : ['Office work', 'Design', 'Multitasking'];
      case 'accessories':
        return prefersArabicCopy
          ? ['يكمل المكتب', 'استخدام يومي', 'راحة أفضل']
          : ['Desk setup', 'Daily use', 'Better comfort'];
      default:
        return prefersArabicCopy
          ? ['قرار أوضح', 'شراء أسهل', 'مقارنة أسرع']
          : ['Clearer decision', 'Faster checkout', 'Easier comparison'];
    }
  })();
  const pcHubUseCases =
    productTagValues.length > 0 ? productTagValues : pcHubFallbackUseCases;
  const pcHubModelLabel =
    typeof product['modelLabel'] === 'string' && product['modelLabel'].trim()
      ? product['modelLabel'].trim()
      : prefersArabicCopy
        ? 'موديل 2024'
        : '2024 model';
  const pcHubDecisionBadge =
    typeof product['decisionBadge'] === 'string' && product['decisionBadge'].trim()
      ? product['decisionBadge'].trim()
      : prefersArabicCopy
        ? 'المواصفات أولًا'
        : 'Spec-first retail';
  const pcHubDecisionTitle =
    typeof product['decisionTitle'] === 'string' && product['decisionTitle'].trim()
      ? product['decisionTitle'].trim()
      : prefersArabicCopy
        ? 'قرار أوضح قبل الحسم'
        : 'A clearer decision before checkout';
  const commandSpecsDescriptionFallback = prefersArabicCopy
    ? 'المواصفات الأساسية، السعر، والخطوة التالية تظهر معًا داخل لوحة أنظف وأقرب لقرار الشراء.'
    : 'Core specifications, price, and the next action stay together in a cleaner, more decision-friendly layout.';
  const pcHubDecisionDescription =
    typeof product['decisionDescription'] === 'string' && product['decisionDescription'].trim()
      ? product['decisionDescription'].trim()
      : shortDescription || commandSpecsDescriptionFallback;
  const pcHubDecisionProofs = decisionProofs.slice(0, 3);
  const discountAmount =
    activeComparePrice && activeComparePrice > activePrice
      ? activeComparePrice - activePrice
      : 0;
  const monthlyInstallmentLabel = formatStorefrontCurrency(
    Math.max(Math.round(activePrice / 12), 1),
    currency,
  );
  const zenCategoryLabel = (() => {
    const rawValue =
      typeof product.category?.name === 'string' && product.category.name.trim()
        ? product.category.name.trim()
        : typeof product.categoryId === 'string' && product.categoryId.trim()
          ? product.categoryId.trim()
          : 'اختيار طبيعي';

    return translateZenCategoryLabel(rawValue);
  })();
  const zenQuickFacts = [
    {
      label: 'الفئة',
      value: zenCategoryLabel,
    },
    {
      label: 'الاختيار',
      value:
        product.productVariants && product.productVariants.length > 0
          ? 'متوفر بأكثر من خيار'
          : 'جاهز للإضافة مباشرة',
    },
    {
      label: 'الشحن',
      value: 'يتم حسابه حسب المحافظة أثناء الدفع',
    },
  ];

  const addToCartText =
    sectionSettings?.addToCartText ||
    (prefersArabicCopy ? 'أضف إلى السلة' : 'Add to Cart');
  const descriptionTitle =
    sectionSettings?.descriptionTitle || (prefersArabicCopy ? 'وصف المنتج' : 'Description');
  const shippingTitle =
    sectionSettings?.shippingTitle || (prefersArabicCopy ? 'الشحن والاسترجاع' : 'Shipping & Returns');
  const shippingText =
    sectionSettings?.shippingText ||
    (prefersArabicCopy
      ? 'يتم احتساب الشحن حسب المحافظة داخل صفحة الدفع، ويمكنك طلب الاستبدال أو الاسترجاع وفق سياسة المتجر بعد مراجعة الطلب.'
      : 'Free standard shipping on all orders over $50. Returns accepted within 30 days of delivery for a full refund. Items must be in their original condition.');
  const shippingInteraction =
    typeof sectionSettings?.shippingInteraction === 'string' &&
    sectionSettings.shippingInteraction.trim().toLowerCase() === 'modal'
      ? 'modal'
      : 'accordion';
  const shippingTriggerText =
    typeof sectionSettings?.shippingTriggerText === 'string' && sectionSettings.shippingTriggerText.trim()
      ? sectionSettings.shippingTriggerText.trim()
      : prefersArabicCopy
        ? 'اعرف السياسة قبل الدفع وخيارات الاستبدال بعد الاستلام.'
        : 'Open the shipping and return policy before checkout.';
  const shippingModalTitle =
    typeof sectionSettings?.shippingModalTitle === 'string' && sectionSettings.shippingModalTitle.trim()
      ? sectionSettings.shippingModalTitle.trim()
      : shippingTitle;
  const hasCustomShippingTitle =
    typeof sectionSettings?.shippingTitle === 'string' &&
    Boolean(sectionSettings.shippingTitle.trim());
  const hasCustomShippingText =
    typeof sectionSettings?.shippingText === 'string' &&
    Boolean(sectionSettings.shippingText.trim());

  const resolvePageSectionSettings = (
    pageKeys: string | string[],
    sectionType: string,
  ) => {
    const candidatePageKeys = Array.isArray(pageKeys) ? pageKeys : [pageKeys];

    for (const pageKey of candidatePageKeys) {
      const sections = Array.isArray(theme.pages?.[pageKey]?.sections)
        ? theme.pages?.[pageKey]?.sections
        : [];
      const infoSection = sections.find(
        (entry): entry is { type?: string; settings?: Record<string, unknown> } =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          entry.type === sectionType,
      );

      if (isRecord(infoSection?.settings)) {
        return infoSection.settings;
      }
    }

    return {};
  };

  const shippingPageSettings = resolvePageSectionSettings(
    ['shipping', 'shipping-policy'],
    'info-content',
  );
  const returnsPageSettings = resolvePageSectionSettings(
    ['returns', 'refund-policy', 'return-policy'],
    'info-content',
  );
  const sizeGuidePageSettings = resolvePageSectionSettings('size-guide', 'size-guide');
  const shippingPolicyTitle =
    hasCustomShippingTitle
      ? shippingTitle
      : (typeof shippingPageSettings['title'] === 'string' &&
          shippingPageSettings['title'].trim()) ||
        shippingTitle;
  const shippingPolicyBody =
    hasCustomShippingText
      ? shippingText
      : (typeof shippingPageSettings['body'] === 'string' &&
          shippingPageSettings['body'].trim()) ||
        shippingText;
  const shippingPolicyDetails = parseDetailRows(shippingPageSettings['details']);
  const returnsPolicyTitle =
    (typeof returnsPageSettings['title'] === 'string' && returnsPageSettings['title'].trim()) ||
    (prefersArabicCopy ? 'سياسة الاستبدال والاسترجاع' : 'Return policy');
  const returnsPolicyBody =
    (typeof returnsPageSettings['body'] === 'string' && returnsPageSettings['body'].trim()) ||
    (prefersArabicCopy
      ? 'إذا لم يناسبك المقاس يمكنك طلب الاستبدال أو الاسترجاع وفق سياسة المتجر الحالية وبعد مراجعة حالة المنتج.'
      : 'You can request an exchange or return according to the current store policy after the product condition is reviewed.');
  const returnsPolicyDetails = parseDetailRows(returnsPageSettings['details']);
  const showReturnsAccordion =
    parseBooleanSetting(sectionSettings?.showReturnsAccordion, isLegacyDefaultOld) &&
    (Boolean(returnsPolicyBody) || returnsPolicyDetails.length > 0);

  const guaranteesTitle =
    sectionSettings?.guaranteesTitle || (prefersArabicCopy ? 'ضمانات المتجر' : 'Our Guarantees');
  const guaranteesSubtitle =
    sectionSettings?.guaranteesSubtitle ||
    (prefersArabicCopy ? 'تسوّق بثقة مع معايير الجودة والخدمة' : 'Shop with confidence');
  const guaranteeItems = parseSectionItems(sectionSettings?.guaranteeItems, [
    {
      title: prefersArabicCopy ? 'جودة موثوقة' : 'Premium Quality',
      description: prefersArabicCopy ? 'منتجات مختارة بعناية قبل الشحن' : 'Curated premium materials',
      icon: 'ShieldCheck',
    },
    {
      title: prefersArabicCopy ? 'توصيل سريع' : 'Fast Delivery',
      description: prefersArabicCopy ? 'شحن آمن لكل المحافظات' : 'Secure shipping nationwide',
      icon: 'Truck',
    },
  ]);
  const guaranteeStyle = (sectionSettings?.guaranteeStyle as "strip" | "grid" | "minimal" | undefined) || 'grid';
  const showGuarantees = parseBooleanSetting(
    sectionSettings?.showGuarantees,
    isStyleStoreUtilityRail ? false : true,
  );

  const sizeGuideText =
    typeof sectionSettings?.sizeGuideText === 'string' && sectionSettings.sizeGuideText.trim()
      ? sectionSettings.sizeGuideText.trim()
      : isAirlume || isCairoStride ? 'دليل المقاسات' : '';
  const sizeGuideLayout =
    typeof sectionSettings?.sizeGuideLayout === 'string' &&
    sectionSettings.sizeGuideLayout.trim().toLowerCase() === 'compact'
      ? 'compact'
      : 'panel';
  const isCompactSizeGuideLayout = sizeGuideLayout === 'compact';
  const sizeGuideLink =
    typeof sectionSettings?.sizeGuideLink === 'string' && sectionSettings.sizeGuideLink.trim()
      ? sectionSettings.sizeGuideLink.trim()
      : '';
  const rawFitNote =
    typeof sectionSettings?.fitNote === 'string' && sectionSettings.fitNote.trim()
      ? sectionSettings.fitNote.trim()
      : '';
  const sizeGuideVisibility =
    typeof sectionSettings?.showSizeGuide === 'string'
      ? sectionSettings.showSizeGuide.trim().toLowerCase()
      : sectionSettings?.showSizeGuide === false
        ? 'hidden'
        : 'auto';
  const sizeGuideInteraction =
    typeof sectionSettings?.sizeGuideInteraction === 'string' &&
    sectionSettings.sizeGuideInteraction.trim().toLowerCase() === 'modal'
      ? 'modal'
      : 'inline';
  const sizeGuideModalTitle =
    typeof sectionSettings?.sizeGuideModalTitle === 'string' &&
    sectionSettings.sizeGuideModalTitle.trim()
      ? sectionSettings.sizeGuideModalTitle.trim()
      : prefersArabicCopy
        ? 'اختيار المقاس'
        : 'Choose your size';
  const rawSizeGuideHref = sizeGuideLink
    ? isExternalHref(sizeGuideLink)
      ? sizeGuideLink
      : buildStorefrontPath(
          location.pathname,
          sizeGuideLink.startsWith('/') ? sizeGuideLink : `/${sizeGuideLink}`,
          location.search,
        )
    : '';
  const configuredSizeGuideRows = parseSizeGuideRows(sizeGuidePageSettings['guideRows']);
  const resolvedSizeGuideRows = resolveSizeGuideRowsForProduct(
    configuredSizeGuideRows,
    product,
  );
  const configuredSizeGuideOverrides = parseSizeGuideOverrides(
    sizeGuidePageSettings['guideOverrides'],
  );
  const matchedSizeGuideOverride = resolveSizeGuideOverrideForProduct(
    configuredSizeGuideOverrides,
    product,
  );
  const rawSizeGuideQuickRows = (resolvedSizeGuideRows.length > 0
    ? resolvedSizeGuideRows
    : parseSizeGuideRows(sectionSettings?.guideRows)).slice(0, 5);
  const rawSizeGuideQuickNote =
    matchedSizeGuideOverride?.note ||
    (typeof sizeGuidePageSettings['note'] === 'string' && sizeGuidePageSettings['note'].trim()) ||
    rawFitNote ||
    (prefersArabicCopy ? 'لو بين مقاسين اختار الأكبر غالبًا.' : 'If you are between sizes, choose the larger one.');
  const sizeGuideCategoryValue = String(
    product.categoryId ||
      product.category?.id ||
      product.category?.slug ||
      product.category?.name ||
      '',
  )
    .trim()
    .toLowerCase();
  const variantSizeValues = Array.from(
    new Set(
      (product.productVariants || [])
        .map((variant) =>
          String(
            variant.attributes?.['المقاس'] ||
              variant.attributes?.size ||
              variant.attributes?.Size ||
              '',
          ).trim(),
        )
        .filter(Boolean),
    ),
  );
  const productLooksLikeShoes =
    [
      'shoe',
      'shoes',
      'sneaker',
      'sneakers',
      'flat',
      'flats',
      'heel',
      'heels',
      'loafer',
      'loafer',
      'boot',
      'boots',
      'أحذية',
      'حذاء',
      'سنيكر',
      'فلات',
      'كعب',
      'لوفر',
    ].some((token) => sizeGuideCategoryValue.includes(token.toLowerCase())) ||
    (variantSizeValues.length > 0 && variantSizeValues.every((value) => /^\d{1,2}$/.test(value)));
  const showSizeGuide =
    sizeGuideVisibility === 'hidden'
      ? false
      : sizeGuideVisibility === 'shoes-only'
        ? productLooksLikeShoes
        : true;
  const fitNote = showSizeGuide ? rawFitNote : '';
  const sizeGuideHref = showSizeGuide ? rawSizeGuideHref : '';
  const sizeGuideQuickRows = showSizeGuide ? rawSizeGuideQuickRows : [];
  const sizeGuideQuickNote = showSizeGuide ? rawSizeGuideQuickNote : '';
  const canOpenSizeGuide = Boolean(sizeGuideHref || sizeGuideQuickRows.length > 0 || fitNote);
  const breadcrumbHomeLabel = prefersArabicCopy ? 'الرئيسية' : 'Home';
  const breadcrumbShopLabel = prefersArabicCopy ? 'المتجر' : 'Shop';
  const breadcrumbClassName = isBiteRush
    ? 'w-fit rounded-full border border-[#f3b37e] bg-[#fff4ea] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#a14a14] shadow-[0_18px_40px_-32px_rgba(247,115,22,0.55)]'
    : isAirlume
      ? 'w-fit rounded-full border border-primary/10 bg-white/88 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm'
      : 'text-sm text-muted-foreground';
  const titleBlockClassName = isBiteRush
    ? 'space-y-4 rounded-[2rem] border border-[#f6b173] bg-[linear-gradient(135deg,#fff8f0_0%,#ffffff_48%,#ffe1c7_100%)] p-5 shadow-[0_34px_90px_-56px_rgba(247,115,22,0.5)] md:p-6'
  : isAirlume
      ? 'space-y-4 rounded-[1.8rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.82))] p-5 shadow-[0_28px_90px_-60px_hsl(var(--primary)/0.46)]'
      : isCutlineClub
        ? 'space-y-4 rounded-[1.8rem] border border-[#2d3329] bg-[linear-gradient(145deg,#fbf2df_0%,#f4e8d2_62%,#efe0c2_100%)] p-5 shadow-[0_34px_90px_-60px_rgba(17,21,16,0.34)] md:p-6'
      : isPerfumeScentBrief
        ? 'space-y-3 border-b border-[#e8dbd1] pb-4'
      : isStyleStoreUtilityRail
        ? 'space-y-3 border-b-2 border-[#111111]/10 pb-4'
      : isWomenProductInfoVariant
        ? 'space-y-3 pb-1'
      : 'space-y-2';
  const sizeGuideWrapperClassName = isBiteRush
    ? 'rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(135deg,#fff6ec_0%,#fffefc_100%)] p-5 shadow-[0_28px_70px_-56px_rgba(247,115,22,0.44)]'
    : isAirlume
      ? 'rounded-[1.6rem] border border-primary/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.84))] p-5 shadow-[0_24px_70px_-52px_hsl(var(--primary)/0.4)]'
      : isCutlineClub
      ? 'rounded-[1.55rem] border border-[#2d3329] bg-[linear-gradient(145deg,#fbf2df_0%,#f4e8d2_100%)] p-5 shadow-[0_28px_70px_-56px_rgba(17,21,16,0.28)]'
      : isPerfumeScentBrief
        ? 'rounded-[1.5rem] border border-[#eadfd7] bg-[#fffaf6] p-4 shadow-[0_18px_55px_-48px_rgba(61,41,44,0.18)]'
      : isStyleStoreUtilityRail
        ? 'rounded-[1rem] border-2 border-[#111111] bg-white px-4 py-4'
      : isWomenProductInfoVariant
        ? 'rounded-[1.6rem] border border-[#f0d7d2] bg-white/92 p-4 shadow-[0_22px_60px_-52px_rgba(107,33,49,0.14)]'
      : isCompactSizeGuideLayout
        ? 'rounded-full border border-border bg-secondary/45 px-4 py-3'
        : 'rounded-[var(--radius)] border border-border bg-secondary/60 p-4';
  const sizeGuideButtonClassName = isBiteRush
    ? 'inline-flex items-center justify-center rounded-full border border-[#f59e0b]/30 bg-[#111111] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_36px_-22px_rgba(17,17,17,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#f97316] hover:border-[#f97316]'
    : isAirlume
      ? 'inline-flex items-center justify-center rounded-full border border-primary/12 bg-background/92 px-5 py-2.5 text-sm font-black text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary'
      : isCutlineClub
      ? 'inline-flex items-center justify-center rounded-full border border-[#2d3329] bg-[#111510] px-5 py-2.5 text-sm font-black text-[#d9eb67] shadow-[0_18px_36px_-24px_rgba(17,21,16,0.56)] transition-all hover:-translate-y-0.5 hover:border-[#d9eb67] hover:text-[#f8f1e3]'
      : isPerfumeScentBrief
        ? 'inline-flex items-center justify-center rounded-full border border-[#e7d6cb] bg-white px-4 py-2 text-xs font-black text-[#5b3940] transition-all hover:-translate-y-0.5 hover:border-[#d2b4a3] hover:bg-[#fff7f2]'
      : isStyleStoreUtilityRail
        ? 'inline-flex items-center justify-center rounded-full border-2 border-[#111111] bg-white px-4 py-2 text-xs font-black text-[#111111] transition-all hover:-translate-y-0.5 hover:bg-[#fff4df]'
      : isWomenProductInfoVariant
        ? 'inline-flex items-center justify-center rounded-full border border-[#f0d7d2] bg-[#fff7f5] px-4 py-2 text-xs font-black text-[#8b3d33] transition-all hover:-translate-y-0.5 hover:border-[#dcaea5] hover:bg-white'
      : isCompactSizeGuideLayout
        ? 'inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-black text-foreground transition-colors hover:bg-muted'
        : 'inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted';
  const addToCartButtonClassName = `sm:flex-1 h-12 font-sans text-[0.98rem] font-black tracking-[0.01em] shadow-xl transition-all active:scale-[0.98] ${
    isBiteRush
      ? 'rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white shadow-[0_26px_80px_-34px_rgba(239,68,68,0.62)] hover:shadow-[0_34px_90px_-32px_rgba(249,115,22,0.7)]'
      : isAtelierBuybox
      ? theme.id === 'baladi-market-eg'
        ? 'rounded-full border border-primary bg-primary text-primary-foreground shadow-[0_28px_80px_-38px_hsl(var(--primary)/0.52)] hover:-translate-y-0.5 hover:brightness-110'
        : 'rounded-full border border-[#3f2f33] bg-[#3f2f33] text-white shadow-[0_28px_80px_-38px_rgba(63,47,51,0.52)] hover:-translate-y-0.5 hover:bg-[#4b393d] hover:shadow-[0_34px_88px_-36px_rgba(63,47,51,0.58)]'
      : isCutlineClub
      ? 'rounded-[1rem] border border-[#d9eb67] bg-[#d9eb67] text-[#111510] shadow-[0_28px_80px_-36px_rgba(217,235,103,0.72)] hover:brightness-105 hover:shadow-[0_34px_88px_-34px_rgba(217,235,103,0.78)]'
      : isAirlume
      ? 'rounded-[1.2rem] border-none bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_58%,#60a5fa_100%)] text-white shadow-[0_24px_80px_-36px_hsl(var(--primary)/0.68)] hover:shadow-[0_32px_90px_-34px_hsl(var(--primary)/0.76)]'
      : isPerfumeScentBrief
      ? 'rounded-[1.15rem] border-none bg-[linear-gradient(135deg,#3d292c_0%,#5b3940_100%)] text-white shadow-[0_26px_76px_-36px_rgba(61,41,44,0.56)] hover:shadow-[0_32px_86px_-36px_rgba(61,41,44,0.64)]'
      : isVelaFashionDirectBuybox
        ? 'rounded-[1.2rem] border-none bg-[linear-gradient(135deg,#7a5260_0%,#b07d8b_100%)] text-white shadow-[0_26px_76px_-36px_rgba(122,82,96,0.42)] hover:shadow-[0_32px_86px_-34px_rgba(176,125,139,0.5)]'
      : isWomenProductInfoVariant
        ? 'rounded-[1.1rem] border-none bg-[linear-gradient(135deg,#f08a76_0%,#d96c58_100%)] text-white shadow-[0_24px_80px_-34px_rgba(240,138,118,0.58)] hover:shadow-[0_30px_90px_-34px_rgba(240,138,118,0.66)]'
      : isFakhama
        ? 'bg-primary hover:bg-primary/95 shadow-primary/20 hover:shadow-primary/30 border-none'
        : 'shadow-primary/10 hover:shadow-primary/20'
  }`;
  const atelierSecondaryButtonTypographyClassName = prefersArabicCopy
    ? 'font-sans text-[0.95rem] font-black tracking-[0.01em]'
    : 'font-sans text-sm font-black uppercase tracking-[0.12em]';
    const buyNowButtonClassName = isBiteRush
    ? 'h-12 rounded-full border border-[#f8b278] bg-[#fff8f1] text-sm font-black uppercase tracking-[0.18em] text-[#111111] transition-all hover:border-[#f97316] hover:bg-[#111111] hover:text-white'
    : isAtelierBuybox
      ? theme.id === 'baladi-market-eg'
        ? `flex h-12 w-full items-center justify-center rounded-full border-2 border-primary bg-white px-4 text-primary shadow-[0_18px_48px_-38px_hsl(var(--primary)/0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white ${atelierSecondaryButtonTypographyClassName}`
        : `flex h-12 w-full items-center justify-center rounded-full border border-[#cda79e] bg-[#fbf2ee] px-4 text-[#3f2f33] shadow-[0_18px_48px_-38px_rgba(63,47,51,0.22)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:bg-[#fff8f5] hover:text-[#3f2f33] ${atelierSecondaryButtonTypographyClassName}`
    : isCutlineClub
      ? 'h-12 rounded-[1rem] border border-[#2d3329] bg-[#111510] text-sm font-black uppercase tracking-[0.18em] text-[#f8f1e3] transition-colors hover:border-[#d9eb67] hover:text-[#d9eb67]'
    : isPerfumeScentBrief
      ? 'h-12 rounded-[1.15rem] border border-[#e7d6cb] bg-white text-sm font-black uppercase tracking-[0.18em] text-[#4d3338] transition-all hover:border-[#d2b4a3] hover:bg-[#fff6f1]'
    : isVelaFashionDirectBuybox
      ? 'h-12 rounded-[1.1rem] border border-[#efd9df] bg-white text-sm font-black uppercase tracking-[0.18em] text-[#7a5260] transition-all hover:border-[#d7b4bf] hover:bg-[#fff7fa]'
    : isStyleStoreUtilityRail
      ? 'h-12 rounded-[1rem] border-2 border-[#111111] bg-white text-sm font-black uppercase tracking-[0.18em] text-[#111111] transition-all hover:bg-[#fff4df]'
    : isWomenProductInfoVariant
      ? 'h-12 rounded-[1.1rem] border border-[#ecd4cf] bg-white text-sm font-black uppercase tracking-[0.18em] text-[#4c2d39] transition-all hover:border-[#dcaea5] hover:bg-[#fff7f5]'
    : 'h-12 rounded-[var(--radius)] border border-primary/20 bg-background text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/35 hover:text-primary';
  const accordionWrapperClassName = isBiteRush
    ? 'mt-6 rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(180deg,#fffdfb_0%,#fff4e8_100%)] px-5 py-2 shadow-[0_24px_70px_-58px_rgba(247,115,22,0.34)]'
    : isAirlume
      ? 'mt-6 rounded-[1.6rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.96))] px-5 py-2 shadow-[0_24px_80px_-62px_rgba(15,23,42,0.32)]'
      : isCutlineClub
      ? 'mt-6 rounded-[1.6rem] border border-[#2d3329] bg-[linear-gradient(180deg,#fbf2df_0%,#f4e8d2_100%)] px-5 py-2 shadow-[0_24px_70px_-58px_rgba(17,21,16,0.24)]'
      : isStyleStoreUtilityRail
        ? 'mt-5 border-t-2 border-[#111111]/10 pt-5'
      : 'pt-6 mt-6 border-t border-border';
  const descriptionSectionClassName = isBiteRush
    ? 'mt-4 rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(180deg,#fffefc_0%,#fff5ea_100%)] p-5 shadow-[0_22px_55px_-48px_rgba(247,115,22,0.35)]'
      : isCutlineClub
        ? 'mt-4 rounded-[1.6rem] border border-[#2d3329] bg-[linear-gradient(180deg,#fbf2df_0%,#f4e8d2_100%)] p-5 shadow-[0_22px_55px_-48px_rgba(17,21,16,0.22)]'
      : isPerfumeScentBrief
        ? 'mt-5 border-t border-[#eadfd7] pt-5'
      : isStyleStoreUtilityRail
        ? 'mt-4 rounded-[1.1rem] border border-[#111111]/12 bg-[#fffaf2] px-4 py-4'
      : isWomenProductInfoVariant
        ? 'mt-6 rounded-[1.7rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f6_100%)] px-5 py-3 shadow-[0_24px_80px_-64px_rgba(107,33,49,0.15)]'
      : 'pt-6 mt-6 border-t border-border';
  const trustSectionClassName = isBiteRush
    ? 'pt-8 border-t border-[#f6c8a3] mt-6'
    : isCutlineClub
      ? 'mt-6 rounded-[1.6rem] border border-[#2d3329] bg-[linear-gradient(180deg,#fbf2df_0%,#f4e8d2_100%)] p-5 shadow-[0_22px_55px_-48px_rgba(17,21,16,0.2)]'
    : 'pt-8 border-t border-border mt-6';
  const cutlineAccordionDecisionPanelClassName =
    'rounded-[1.6rem] border border-[#2d3329] bg-[linear-gradient(145deg,#fbf2df_0%,#f4e8d2_100%)] p-4 shadow-[0_26px_70px_-56px_rgba(17,21,16,0.26)] sm:p-5';
  const menShoesDecisionSurfaceClassName =
    'mt-4 rounded-[1.7rem] border border-[#d8dfd2] bg-white/92 p-4 shadow-[0_24px_70px_-56px_rgba(17,24,39,0.24)] sm:p-5';
  const womenLedgerDecisionSurfaceClassName =
    'mt-4 rounded-[1.8rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f4_100%)] p-4 shadow-[0_26px_80px_-60px_rgba(107,33,49,0.18)] sm:p-5';
  const velaFashionDecisionSurfaceClassName =
    'mt-4 rounded-[1.2rem] border border-[#ead7dc] bg-white p-4 sm:p-5';
  const perfumeBriefDecisionSurfaceClassName =
    'mt-4 rounded-[1.65rem] border border-[#eadfd7] bg-[linear-gradient(180deg,#fffefc_0%,#faf3ee_100%)] p-4 shadow-[0_24px_72px_-58px_rgba(61,41,44,0.16)] sm:p-5';
  const menShoesDecisionMeta = isMenShoesEg ? (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {selectedOptionSummary && !isPrimaryQuantityOffersDecision ? (
        <span className="inline-flex rounded-full border border-[#d8dfd2] bg-[#f7f8f4] px-3 py-1 text-[11px] font-black text-[#1f2a30]">
          {prefersArabicCopy ? `المقاس: ${selectedOptionSummary}` : `Size: ${selectedOptionSummary}`}
        </span>
      ) : null}
      {typeof activeStock === 'number' ? (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
            activeStock <= 10
              ? 'border border-[#f2d6b1] bg-[#fff8ee] text-[#b25a14]'
              : 'border border-[#d8dfd2] bg-[#f7f8f4] text-[#365247]'
          }`}
        >
          {activeStock <= 10
            ? prefersArabicCopy
              ? `متبقي ${activeStock}`
              : `${activeStock} left`
            : prefersArabicCopy
              ? 'جاهز للشحن'
              : 'Ready to ship'}
        </span>
      ) : null}
      {discount && discount > 0 ? (
        <span className="inline-flex rounded-full bg-[#1f2a30] px-3 py-1 text-[11px] font-black text-white">
          {prefersArabicCopy ? `وفر ${discount}%` : `Save ${discount}%`}
        </span>
      ) : null}
    </div>
  ) : null;
  const womenLedgerDecisionMeta = isWomenProductInfoVariant ? (
    selectedOptionSummary && !isPrimaryQuantityOffersDecision ? (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-[#f0d7d2] bg-[#fff4f1] px-3 py-1 text-[11px] font-black text-[#8b3d33]">
          {prefersArabicCopy ? `الاختيار: ${selectedOptionSummary}` : `Selected: ${selectedOptionSummary}`}
        </span>
      </div>
    ) : null
  ) : null;
  const womenInlineTrustItems = isWomenProductInfoVariant
    ? String(embeddedTrustedBadgesSettings?.trustedBadgeItems || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const womenInlineReviewCount =
    typeof product?.reviewCount === 'number'
      ? product.reviewCount
      : typeof product?.reviewsCount === 'number'
        ? product.reviewsCount
        : typeof product?.ratingCount === 'number'
          ? product.ratingCount
          : typeof product?.reviewSummary?.totalReviews === 'number'
            ? product.reviewSummary.totalReviews
            : 0;
  const womenInlineRatingValue =
    typeof product?.rating === 'number'
      ? product.rating
      : typeof product?.reviewSummary?.averageRating === 'number'
        ? product.reviewSummary.averageRating
        : typeof product?.reviewAverage === 'number'
          ? product.reviewAverage
          : null;
  const womenLedgerTrustStrip =
    isWomenProductInfoVariant &&
    (womenInlineTrustItems.length > 0 || womenInlineReviewCount > 0) ? (
      <div className="mt-3 space-y-2.5 rounded-[1.2rem] border border-[#f0d7d2] bg-[#fff9f8] px-3.5 py-2.5">
        {womenInlineRatingValue !== null && womenInlineReviewCount > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead8cf] bg-white px-3 py-1 text-[10px] font-black text-[#8b3d33]">
            <span>★ {womenInlineRatingValue.toFixed(1)}</span>
            <span className="text-[#6f5a50]">
              {prefersArabicCopy
                ? `${womenInlineReviewCount} مراجعة`
                : `${womenInlineReviewCount} reviews`}
            </span>
          </div>
        ) : null}
        {womenInlineTrustItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {womenInlineTrustItems.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-[#ead8cf] bg-white px-3 py-1 text-[11px] font-bold text-[#6f5a50]"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ) : null;
  const velaFashionDecisionMeta = isVelaFashionDirectBuybox ? (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {selectedOptionSummary && !isPrimaryQuantityOffersDecision ? (
        <span className="inline-flex rounded-full border border-[#ead7dc] bg-[#fffafc] px-3 py-1 text-[11px] font-black text-[#7a5260]">
          {prefersArabicCopy ? `${selectedOptionSummary}` : `${selectedOptionSummary}`}
        </span>
      ) : null}
      {typeof activeStock === 'number' ? (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
            activeStock <= 10
              ? 'border border-[#efd7ba] bg-[#fff8ec] text-[#9a6422]'
              : 'border border-[#ead7dc] bg-white text-[#7a5260]'
          }`}
        >
          {prefersArabicCopy ? `متبقي ${activeStock}` : `${activeStock} left`}
        </span>
      ) : null}
    </div>
  ) : null;
  const perfumeScentBriefMeta = isPerfumeScentBrief ? (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {selectedOptionSummary && !isPrimaryQuantityOffersDecision ? (
        <span className="inline-flex rounded-full border border-[#e7d6cb] bg-white px-3 py-1 text-[11px] font-black text-[#5b3940]">
          {prefersArabicCopy ? `الحجم المختار: ${selectedOptionSummary}` : `Selected size: ${selectedOptionSummary}`}
        </span>
      ) : null}
      {typeof activeStock === 'number' ? (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
            activeStock <= 10
              ? 'border border-[#ecd8b1] bg-[#fff8ec] text-[#9e5e18]'
              : 'border border-[#e7d6cb] bg-[#fffaf6] text-[#6d4c4a]'
          }`}
        >
          {activeStock <= 10
            ? prefersArabicCopy
              ? `متبقي ${activeStock}`
              : `${activeStock} left`
            : prefersArabicCopy
              ? 'متاح الآن'
              : 'Available now'}
        </span>
      ) : null}
      </div>
    ) : null;
  const fakeVisitorMin = parseMaybeNumber(conversionThresholds['fakeVisitorMin']) ?? 8;
  const fakeVisitorMax = parseMaybeNumber(conversionThresholds['fakeVisitorMax']) ?? 24;
  const productSeed = product?.id ? hashProductSeed(product.id) : 0;
  const soldCount = parseMaybeNumber(product?.['soldCount']) ?? 0;
  const soldCounterEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'soldCounter',
  );
  const lowStockNoticeEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'lowStockNotice',
  );
  const purchaseFomoEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'purchaseFomo',
  );
  const lowStockStyle = String(conversionUi['lowStockStyle'] || 'alert')
    .trim()
    .toLowerCase();
  const lowStockLimit = Math.max(
    1,
    parseMaybeNumber(conversionThresholds['lowStockLimit']) ?? 5,
  );
  const resolvedLowStockCount =
    typeof activeStock === 'number' && Number.isFinite(activeStock)
      ? Math.max(0, Math.round(activeStock))
      : null;
  const lowStockIsUrgent =
    resolvedLowStockCount !== null && resolvedLowStockCount <= lowStockLimit;
  const showLowStockNotice =
    lowStockNoticeEnabled &&
    resolvedLowStockCount !== null &&
    resolvedLowStockCount > 0;
  const lowStockMessageTemplate = resolveDirectionalCopy({
    value:
      conversionCopy['lowStockMessage'] ??
      conversionCopy['lowStockNoticeMessage'],
    englishFallback: 'Only {{count}} item(s) left in stock.',
    arabicFallback: 'متبقي {{count}} قطعة فقط في المخزون.',
    prefersArabicCopy,
  });
  const lowStockMessage =
    resolvedLowStockCount !== null
      ? interpolateCount(
          lowStockMessageTemplate,
          resolvedLowStockCount,
          prefersArabicCopy
            ? `متبقي ${resolvedLowStockCount} قطعة فقط في المخزون.`
            : `Only ${resolvedLowStockCount} item(s) left in stock.`,
        )
      : '';
  const lowStockMeterValue =
    resolvedLowStockCount !== null
      ? clampNumber(
          Math.round(35 + Math.log10(resolvedLowStockCount + 1) * 25),
          lowStockIsUrgent ? 28 : 42,
          92,
        )
      : 0;
  const showUtilitySoldCounter = soldCounterEnabled && soldCount > 0;
  const viewerFloor =
    soldCount > 0
      ? clampNumber(
          Math.ceil(soldCount * 0.12),
          fakeVisitorMin,
          Math.max(fakeVisitorMin, fakeVisitorMax - 1),
        )
      : clampNumber(
          fakeVisitorMin + (productSeed % Math.max(2, fakeVisitorMax - fakeVisitorMin)),
          fakeVisitorMin,
          Math.max(fakeVisitorMin, fakeVisitorMax - 1),
        );
  const utilityViewerCount = conversionModules['fakeVisitorCounter'] ? viewerFloor : 0;
  const utilityViewerTemplate = resolveDirectionalCopy({
    value: conversionCopy['fakeVisitorMessage'],
    englishFallback: '{{count}} people are viewing this right now',
    arabicFallback: '{{count}} عميلة تشاهد هذا المنتج الآن',
    prefersArabicCopy,
  });
  const utilityViewerMessage =
    utilityViewerCount > 0
      ? interpolateCount(
          utilityViewerTemplate,
          utilityViewerCount,
          prefersArabicCopy
            ? `${utilityViewerCount} عميلة تشاهد هذا المنتج الآن`
            : `${utilityViewerCount} people are viewing this right now`,
        )
      : '';
  const estimatedDeliveryMinDays = parseMaybeNumber(conversionEstimatedDelivery['minDays']);
  const estimatedDeliveryMaxDays = parseMaybeNumber(conversionEstimatedDelivery['maxDays']);
  const utilityDeliveryLabel = resolveDirectionalCopy({
    value: conversionEstimatedDelivery['label'],
    englishFallback: 'Estimated Arrival',
    arabicFallback: 'موعد الوصول المتوقع',
    prefersArabicCopy,
  });
  const utilityDeliveryRange =
    conversionModules['estimatedDelivery'] &&
    estimatedDeliveryMinDays !== null &&
    estimatedDeliveryMaxDays !== null
      ? formatDateRange(
          estimatedDeliveryMinDays,
          estimatedDeliveryMaxDays,
          resolveDateLocale(currency),
        )
      : '';
  const explicitViewerCount =
    parseMaybeNumber(product?.['viewerCount']) ??
    parseMaybeNumber(product?.socialProof?.viewerCount) ??
    null;
  const socialProofActiveCartCount =
    parseMaybeNumber(product?.['activeCartCount']) ??
    parseMaybeNumber(product?.socialProof?.activeCartCount) ??
    0;
  const utilityViewerMessageResolved =
    explicitViewerCount !== null
      ? interpolateCount(
          utilityViewerTemplate,
          explicitViewerCount,
          prefersArabicCopy
            ? `${explicitViewerCount} عميلة تشاهد هذا المنتج الآن`
            : `${explicitViewerCount} people are viewing this right now`,
        )
      : utilityViewerMessage ||
        (socialProofActiveCartCount > 0
          ? prefersArabicCopy
            ? `${socialProofActiveCartCount} عميلة تشاهد هذا المنتج الآن`
            : `${socialProofActiveCartCount} people are viewing this right now`
          : '');
  const utilityDeliveryRangeResolved =
    utilityDeliveryRange || formatDateRange(3, 4, resolveDateLocale(currency));
  const elessiCountdownLabel = initialElessiCountdownLabel;
  const elessiSaleCountdownTarget = initialElessiSaleCountdownTarget;
  const elessiSaleCountdown = initialElessiSaleCountdown;
  const utilityRailActionButtonClassName =
    'inline-flex items-center gap-2 rounded-full border border-[#ead9d8] bg-white px-3.5 py-2 text-[12px] font-black text-[#4c2d39] transition-colors hover:border-[#d7b3aa] hover:bg-[#fff7f5]';
  const utilityRailInfoRowClassName =
    'flex items-center gap-2 text-[13px] font-semibold text-[#6d4c4a]';
  const perfumeUtilityRailActionButtonClassName =
    'inline-flex items-center gap-2 rounded-full border border-[#e7d6cb] bg-white px-3.5 py-2 text-[12px] font-black text-[#5b3940] transition-colors hover:border-[#d2b4a3] hover:bg-[#fff7f2]';
  const perfumeUtilityRailInfoRowClassName =
    'flex items-center gap-2 text-[13px] font-semibold text-[#6d4c4a]';
  const styleStoreUtilityRailActionButtonClassName =
      'inline-flex items-center gap-2 rounded-full border-2 border-[#111111] bg-white px-4 py-2 text-[12px] font-black text-[#111111] transition-colors hover:bg-[#fff4df]';
  const styleStoreUtilityRailInfoRowClassName =
      'flex items-center gap-2 text-[13px] font-black text-[#111111]';
  const velaUtilityRailActionButtonClassName =
      'inline-flex items-center gap-2 rounded-full border border-[#efd9df] bg-white px-4 py-2 text-[12px] font-black text-[#7a5260] transition-colors hover:border-[#d7b4bf] hover:bg-[#fff8fa]';
  const velaUtilityRailInfoRowClassName =
      'flex items-center gap-2 text-[13px] font-semibold text-[#8f6d77]';
  const womenUtilityRail = isWomenUtilityRail ? (
    <div className="mb-4 space-y-3 border-b border-[#ead9d8] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {canOpenSizeGuide ? (
          <button
            type="button"
            onClick={() => setIsSizeGuideDialogOpen(true)}
            className={utilityRailActionButtonClassName}
          >
            <Ruler className="h-4 w-4 text-[#8b3d33]" />
            <span>{sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setIsShippingDialogOpen(true)}
          className={utilityRailActionButtonClassName}
        >
          <Truck className="h-4 w-4 text-[#8b3d33]" />
          <span>{shippingTitle || (prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & return')}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsQuestionDialogOpen(true)}
          className={utilityRailActionButtonClassName}
        >
          <MessageCircle className="h-4 w-4 text-[#8b3d33]" />
          <span>{prefersArabicCopy ? 'اسألي عن المنتج' : 'Ask a question'}</span>
        </button>
      </div>

      {utilityDeliveryRange ? (
        <div className={utilityRailInfoRowClassName}>
          <Truck className="h-4 w-4 text-[#8b3d33]" />
          <span className="font-black text-[#4c2d39]">{utilityDeliveryLabel}</span>
          <span className="text-[#6d4c4a]">{utilityDeliveryRange}</span>
        </div>
      ) : null}

      {utilityViewerMessage ? (
        <div className={utilityRailInfoRowClassName}>
          <Eye className="h-4 w-4 text-[#8b3d33]" />
          <span>{utilityViewerMessage}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a27b75]">
          {prefersArabicCopy ? 'شاركي' : 'Share'}
        </span>
        <div className="flex items-center gap-2">
          {[
            {
              id: 'facebook' as const,
              label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
              icon: Facebook,
            },
            {
              id: 'twitter' as const,
              label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
              icon: Twitter,
            },
            {
              id: 'copy' as const,
              label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
              icon: Share2,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  void handleShareAction(item.id);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ead9d8] bg-white text-[#8b3d33] transition-colors hover:border-[#d7b3aa] hover:bg-[#fff7f5]"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;
  const styleStoreUtilityRail = isStyleStoreUtilityRail ? (
      <div className="space-y-3 border-y border-[#111111]/10 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {canOpenSizeGuide ? (
          <button
            type="button"
            onClick={() => setIsSizeGuideDialogOpen(true)}
            className={styleStoreUtilityRailActionButtonClassName}
          >
            <Ruler className="h-4 w-4" />
            <span>{sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setIsShippingDialogOpen(true)}
          className={styleStoreUtilityRailActionButtonClassName}
        >
          <Truck className="h-4 w-4" />
          <span>{shippingTitle || (prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & return')}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsQuestionDialogOpen(true)}
          className={styleStoreUtilityRailActionButtonClassName}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{prefersArabicCopy ? 'اسأل قبل الطلب' : 'Ask before ordering'}</span>
        </button>
      </div>

      <div className="grid gap-2">
        {utilityDeliveryRange ? (
          <div className={styleStoreUtilityRailInfoRowClassName}>
            <Truck className="h-4 w-4" />
            <span>{prefersArabicCopy ? `موعد الوصول المتوقع: ${utilityDeliveryRange}` : `${utilityDeliveryLabel}: ${utilityDeliveryRange}`}</span>
          </div>
        ) : null}
        {typeof activeStock === 'number' ? (
          <div className={styleStoreUtilityRailInfoRowClassName}>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#ff7a2c]" />
            <span>
              {activeStock <= 10
                ? prefersArabicCopy
                  ? `متبقي ${activeStock} فقط`
                  : `Only ${activeStock} item(s) left`
                : prefersArabicCopy
                  ? 'متاح الآن للطلب'
                  : 'Available now'}
            </span>
          </div>
        ) : null}
        {utilityViewerMessage ? (
          <div className={styleStoreUtilityRailInfoRowClassName}>
            <Eye className="h-4 w-4" />
            <span>{utilityViewerMessage}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6b6258]">
          {prefersArabicCopy ? 'شاركي' : 'Share'}
        </span>
        <div className="flex items-center gap-2">
          {[
            {
              id: 'facebook' as const,
              label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
              icon: Facebook,
            },
            {
              id: 'twitter' as const,
              label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
              icon: Twitter,
            },
            {
              id: 'copy' as const,
              label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
              icon: Share2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  void handleShareAction(item.id);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#111111]/14 bg-white text-[#111111] transition-colors hover:bg-[#fff4df]"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
      </div>
    ) : null;
  const velaUtilityRail = isVelaFashionDirectBuybox ? (
      <div className="space-y-3 border-y border-[#f0dce1] py-4">
        <div className="flex flex-wrap items-center gap-2">
          {canOpenSizeGuide ? (
            <button
              type="button"
              onClick={() => setIsSizeGuideDialogOpen(true)}
              className={velaUtilityRailActionButtonClassName}
            >
              <Ruler className="h-4 w-4 text-[#b07d8b]" />
              <span>{sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsShippingDialogOpen(true)}
            className={velaUtilityRailActionButtonClassName}
          >
            <Truck className="h-4 w-4 text-[#b07d8b]" />
            <span>{shippingTitle || (prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & return')}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsQuestionDialogOpen(true)}
            className={velaUtilityRailActionButtonClassName}
          >
            <MessageCircle className="h-4 w-4 text-[#b07d8b]" />
            <span>{prefersArabicCopy ? 'اسألي عن المنتج' : 'Ask a question'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {utilityDeliveryRange ? (
            <div className={velaUtilityRailInfoRowClassName}>
              <Truck className="h-4 w-4 text-[#c8926e]" />
              <span className="font-black text-[#6b4450]">{utilityDeliveryLabel}</span>
              <span>{utilityDeliveryRange}</span>
            </div>
          ) : null}
          {utilityViewerMessage ? (
            <div className={velaUtilityRailInfoRowClassName}>
              <Eye className="h-4 w-4 text-[#c8926e]" />
              <span>{utilityViewerMessage}</span>
            </div>
          ) : null}
        </div>
      </div>
    ) : null;
  const perfumeUtilityRail = isPerfumeScentBrief ? (
    <div className="space-y-3 border-y border-[#eadfd7] py-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsShippingDialogOpen(true)}
          className={perfumeUtilityRailActionButtonClassName}
        >
          <Truck className="h-4 w-4 text-[#7b5d41]" />
          <span>{prefersArabicCopy ? 'الأصالة والشحن' : 'Authenticity & delivery'}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsQuestionDialogOpen(true)}
          className={perfumeUtilityRailActionButtonClassName}
        >
          <MessageCircle className="h-4 w-4 text-[#7b5d41]" />
          <span>{prefersArabicCopy ? 'اسألي عن العطر' : 'Ask about this scent'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8f2] px-3 py-1.5 text-[12px] font-black text-[#5b3940]">
          <span className="h-2 w-2 rounded-full bg-[#c69b6d]" />
          {product.category?.name || (prefersArabicCopy ? 'عائلة عطرية' : 'Fragrance family')}
        </span>
        {utilityDeliveryRange ? (
          <div className={perfumeUtilityRailInfoRowClassName}>
            <Truck className="h-4 w-4 text-[#8a684a]" />
            <span className="font-black text-[#4d3338]">{utilityDeliveryLabel}</span>
            <span>{utilityDeliveryRange}</span>
          </div>
        ) : null}
        {utilityViewerMessage ? (
          <div className={perfumeUtilityRailInfoRowClassName}>
            <Eye className="h-4 w-4 text-[#8a684a]" />
            <span>{utilityViewerMessage}</span>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;
  const externalProductConfig = resolveExternalProductConfig(product);
  const showExternalAffiliateCta =
    commerceAdvancedEnabled &&
    commerceModules['externalAffiliate'] !== false &&
    Boolean(externalProductConfig.url);

  const externalOnlyProduct =
    showExternalAffiliateCta && externalProductConfig.externalOnly;
  // Embedded quick-order sections can still depend on the buybox surface as the
  // primary decision area, especially for merged-buybox PDP variants.
  const shouldRenderPrimaryBuyBox = !externalOnlyProduct;
  const showStickyMobileAddToCart =
    isElessiCareBuybox &&
    shouldRenderPrimaryBuyBox &&
    !externalOnlyProduct &&
    !isGalleryZoomOpen &&
    !isInlineQuickOrderVisible &&
    !isCartOpen;
  const shouldRenderStandaloneBuyBox =
    shouldRenderPrimaryBuyBox && !isPrimaryQuantityOffersDecision;
  const primaryActionTargetId = hasEmbeddedPdpCheckout
    ? PDP_CHECKOUT_SECTION_ID
    : STOREFRONT_BUYBOX_ID;
  const inlineQuickOrderProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug || id,
    description: product.description || '',
    price: product.price,
    imageUrl:
      selectedPrimaryImage ||
      undefined,
    images: selectedVariantGalleryImages.length > 0 ? selectedVariantGalleryImages : product.images,
    productVariants: product.productVariants,
    hasVariants: Boolean(product.productVariants?.length),
  };
  const resolvedEmbeddedPdpCheckoutSettings = {
    ...(embeddedPdpCheckoutSettings || {}),
    placement: pdpQuickOrderPlacement,
    surfaceMode: pdpQuickOrderSurfaceMode,
    decisionMode:
      typeof embeddedQuantityOffersSettings?.decisionMode === 'string'
        ? embeddedQuantityOffersSettings.decisionMode
        : undefined,
  };
  const inlinePdpQuickOrder = (
    <PdpQuickOrderPanel
      product={inlineQuickOrderProduct}
      sectionSettings={resolvedEmbeddedPdpCheckoutSettings}
      isOpen={shouldRenderInlinePdpQuickOrder}
    />
  );
  const shouldMergeInlinePdpQuickOrderIntoBuyBox =
    shouldRenderInlinePdpQuickOrder &&
    pdpQuickOrderSurfaceMode === 'merged-buybox';
  const mergedInlinePdpQuickOrder = shouldMergeInlinePdpQuickOrderIntoBuyBox
    ? inlinePdpQuickOrder
    : null;
  const inlinePdpQuickOrderBeforeDescription =
    shouldRenderInlinePdpQuickOrder &&
    !shouldMergeInlinePdpQuickOrderIntoBuyBox &&
    pdpQuickOrderPlacement === 'before-description'
      ? inlinePdpQuickOrder
      : null;
  const inlinePdpQuickOrderAfterDescription =
    shouldRenderInlinePdpQuickOrder &&
    !shouldMergeInlinePdpQuickOrderIntoBuyBox &&
    pdpQuickOrderPlacement === 'after-description'
      ? inlinePdpQuickOrder
      : null;
  const fallbackPdpQuickOrderInBuyFlow =
    shouldRenderInlinePdpQuickOrder &&
    !shouldMergeInlinePdpQuickOrderIntoBuyBox &&
    !inlinePdpQuickOrderBeforeDescription &&
    !inlinePdpQuickOrderAfterDescription
      ? inlinePdpQuickOrder
      : null;
  const inlineQuantityOffers = (
    <QuantityOffersSection
      section={embeddedQuantityOffersSectionConfig}
      settings={embeddedQuantityOffersSettings}
      isOpen={shouldRenderInlineQuantityOffers}
    />
  );
  const externalPurchaseLabel =
    externalProductConfig.label ||
    String(
      commerceCopy['affiliateLabel'] ||
        (isZenOrganic ? 'أكمل الشراء من المتجر الشريك' : 'Buy from partner'),
    );
  const externalPurchaseStyle = String(commerceUi['externalLinkStyle'] || 'button');
  const externalPurchaseHint = externalProductConfig.description
    ? externalProductConfig.description
    : externalProductConfig.vendor
      ? isZenOrganic
        ? `سيكتمل الشراء عبر ${externalProductConfig.vendor}.`
        : `Checkout continues on ${externalProductConfig.vendor}.`
      : isZenOrganic
        ? 'سيكتمل الشراء عبر متجر شريك.'
        : 'Checkout continues on a partner store.';

  const renderExternalPurchaseCta = (layout: 'inline' | 'block' | 'card' = 'block') => {
    if (!showExternalAffiliateCta || !externalProductConfig.url) return null;

    const useStyle = externalPurchaseStyle === 'inline' ? 'inline' : externalPurchaseStyle === 'card' ? 'card' : 'button';

    if (useStyle === 'inline' || layout === 'inline') {
      return (
        <a
          href={externalProductConfig.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <span>{externalPurchaseLabel}</span>
          <ExternalLink size={16} />
        </a>
      );
    }

    if (useStyle === 'card' || layout === 'card') {
      return (
        <a
          href={externalProductConfig.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex flex-col gap-3 rounded-[1.2rem] border border-border bg-secondary/35 p-4 text-foreground transition hover:border-primary/30 hover:bg-secondary/55"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            {isZenOrganic ? 'منتج شريك' : 'External Product'}
          </span>
          <div className="space-y-1">
            <p className="text-base font-black">{externalPurchaseLabel}</p>
            <p className="text-sm leading-6 text-muted-foreground">{externalPurchaseHint}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            {isZenOrganic ? 'افتح شراء الشريك' : 'Open partner checkout'}
            <ExternalLink size={16} />
          </span>
        </a>
      );
    }

    return (
      <a
        href={externalProductConfig.url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-primary/20 bg-secondary px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/35 hover:bg-secondary/80"
      >
        <span>{externalPurchaseLabel}</span>
        <ExternalLink size={16} />
      </a>
    );
  };

  const shippingTriggerButton = (
    <button
      type="button"
      onClick={() => setIsShippingDialogOpen(true)}
      className={
        isCutlineClub
          ? 'flex w-full items-center justify-between gap-4 rounded-[1.3rem] border border-[#2d3329] bg-[linear-gradient(145deg,#fbf2df_0%,#f4e8d2_100%)] px-4 py-4 text-start shadow-[0_18px_48px_-40px_rgba(17,21,16,0.34)] transition-colors hover:border-[#7f8f1d] hover:bg-[#f7ecd8]'
          : 'flex w-full items-center justify-between gap-4 rounded-[1.2rem] border border-border bg-background px-4 py-4 text-start transition-colors hover:border-primary/25 hover:bg-secondary/25'
      }
    >
      <div className="space-y-1">
        <p className="text-sm font-black text-foreground">{shippingTitle}</p>
        <p className="text-sm leading-6 text-muted-foreground">{shippingTriggerText}</p>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-bold text-foreground">
        {prefersArabicCopy ? 'افتح' : 'Open'}
      </span>
    </button>
  );

  const shippingPolicyDialog = (
    <DialogPrimitive.Root open={isShippingDialogOpen} onOpenChange={setIsShippingDialogOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={theme.direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[92vh] overflow-y-auto rounded-t-[1.6rem] border-t border-border bg-card p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground ${theme.direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-foreground sm:text-2xl">
                {shippingModalTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {prefersArabicCopy
                  ? 'هذه النافذة تشرح سياسة الشحن والاستبدال، بينما موعد الوصول المتوقع يظل ظاهرًا في الشريط المختصر أعلى مساحة الحسم.'
                  : 'This modal explains shipping and returns, while the estimated arrival stays visible in the utility strip above the decision area.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.25rem] border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-foreground">{shippingPolicyTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {prefersArabicCopy ? 'تفاصيل تجهيز الطلب والتوصيل' : 'Order prep and delivery details'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{shippingPolicyBody}</p>
                {shippingPolicyDetails.length ? (
                  <div className="mt-4 grid gap-2">
                    {shippingPolicyDetails.map((item) => (
                      <div
                        key={`shipping-${item.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      >
                        <span className="text-xs font-black text-foreground">{item.label}</span>
                        <span className="text-xs leading-6 text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.25rem] border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <RotateCcw className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-foreground">{returnsPolicyTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {prefersArabicCopy ? 'متى وكيف تطلب الاستبدال أو الاسترجاع' : 'When and how to request an exchange or return'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{returnsPolicyBody}</p>
                {returnsPolicyDetails.length ? (
                  <div className="mt-4 grid gap-2">
                    {returnsPolicyDetails.map((item) => (
                      <div
                        key={`returns-${item.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      >
                        <span className="text-xs font-black text-foreground">{item.label}</span>
                        <span className="text-xs leading-6 text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );

  const sizeGuideTriggerButton =
    canOpenSizeGuide ? (
      <button
        type="button"
        onClick={() => {
          if (sizeGuideInteraction === 'modal') {
            setIsSizeGuideDialogOpen(true);
            return;
          }
        }}
        className={sizeGuideWrapperClassName}
      >
        <div
          className={`text-start sm:flex-row sm:items-center sm:justify-between ${
            isCompactSizeGuideLayout ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-3'
          }`}
        >
          <div className={isCompactSizeGuideLayout ? 'min-w-0' : 'space-y-1'}>
            <p className={`font-black text-foreground ${isCompactSizeGuideLayout ? 'text-sm' : 'text-sm'}`}>
              {prefersArabicCopy ? 'اختيار المقاس' : 'Choose your size'}
            </p>
            {!isCompactSizeGuideLayout ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {sizeGuideQuickNote}
              </p>
            ) : null}
          </div>
          <span className={sizeGuideButtonClassName}>
            {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
          </span>
        </div>
      </button>
    ) : null;

  const sizeGuideDialog = (
    <DialogPrimitive.Root open={isSizeGuideDialogOpen} onOpenChange={setIsSizeGuideDialogOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={theme.direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[88vh] overflow-y-auto rounded-t-[1.6rem] border-t border-border bg-card p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground ${theme.direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-foreground sm:text-2xl">
                {sizeGuideModalTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {prefersArabicCopy
                  ? 'مرجع سريع فقط للمقاس الأنسب، من غير شرح طويل أو تكرار داخل الصفحة.'
                  : 'A short size reference without extra copy or repetition on the page.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 space-y-4">
              {sizeGuideQuickRows.length > 0 ? (
                <div className="overflow-hidden rounded-[1.1rem] border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-secondary text-secondary-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-start font-black">EU</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">UK</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">US</th>
                        <th scope="col" className="px-4 py-3 text-start font-black">CM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeGuideQuickRows.map((row) => (
                        <tr key={`${row.target}-${row.eu}`} className="border-t border-border bg-card">
                          <td className="px-4 py-3 font-bold text-foreground">{row.eu}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.uk}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.us}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.cm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="rounded-[1.1rem] border border-border bg-secondary/20 px-4 py-4">
                <p className="text-sm font-black text-foreground">
                  {prefersArabicCopy ? 'ملاحظة سريعة' : 'Quick note'}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{sizeGuideQuickNote}</p>
              </div>

              {sizeGuideHref ? (
                isExternalHref(sizeGuideHref) ? (
                  <a
                    href={sizeGuideHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? 'فتح الدليل الكامل' : 'Open full guide'}
                  </a>
                ) : (
                  <Link
                    to={sizeGuideHref}
                    className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? 'فتح الدليل الكامل' : 'Open full guide'}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );

  const questionDialog = (
    <DialogPrimitive.Root open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Popup
          dir={theme.direction}
          className="fixed inset-x-0 bottom-0 z-[95] w-full max-h-[92vh] overflow-y-auto rounded-t-[1.6rem] border-t border-[#ead8ca] bg-white p-0 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.4rem] md:border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative p-5 sm:p-6">
            <DialogPrimitive.Close className={`absolute top-4 rounded-full border border-[#ead8ca] bg-white p-2 text-[#8f5c44] transition-colors hover:text-[#2d211e] ${theme.direction === 'rtl' ? 'left-4' : 'right-4'}`}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="space-y-2 pe-12">
              <DialogPrimitive.Title className="text-lg font-black text-[#2d211e] sm:text-2xl">
                {prefersArabicCopy ? 'اسألي عن المنتج' : 'Ask a question'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-[#6f5a54]">
                {prefersArabicCopy
                  ? 'اكتبي سؤالك عن المقاس أو الخامة أو الاستبدال، وسيصل إلى فريق المتجر مع اسم المنتج المختار.'
                  : 'Ask about fit, material, or delivery and the request will be sent with the current product context.'}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
              <div className="flex items-center gap-3">
                {selectedPrimaryImage ? (
                  <img
                    src={selectedPrimaryImage}
                    alt={product.name}
                    className="h-16 w-16 rounded-[1rem] border border-[#ead8ca] object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#2d211e]">{product.name}</p>
                  <p className="mt-1 text-sm text-[#8f5c44]">{displayPrice}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleQuestionSubmit} className="mt-5 space-y-3">
              <div className="grid gap-3 border-b border-[#ead8ca] pb-5 sm:grid-cols-2">
                <input
                  value={questionForm.name}
                  onChange={(event) => handleQuestionFieldChange('name', event.target.value)}
                  placeholder={prefersArabicCopy ? 'الاسم' : 'Your name'}
                  className="h-12 rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
                />
                <input
                  type="email"
                  value={questionForm.email}
                  onChange={(event) => handleQuestionFieldChange('email', event.target.value)}
                  placeholder={prefersArabicCopy ? 'البريد الإلكتروني' : 'Your email'}
                  className="h-12 rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
                />
              </div>
              <input
                value={questionForm.phone}
                onChange={(event) => handleQuestionFieldChange('phone', event.target.value)}
                placeholder={prefersArabicCopy ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
                className="h-12 w-full rounded-[1rem] border border-[#ead8ca] bg-white px-4 text-sm text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
              />
              <textarea
                value={questionForm.message}
                onChange={(event) => handleQuestionFieldChange('message', event.target.value)}
                placeholder={prefersArabicCopy ? 'رسالتك أو سؤالك' : 'Your message'}
                rows={5}
                className="w-full rounded-[1rem] border border-[#ead8ca] bg-white px-4 py-3 text-sm leading-7 text-[#2d211e] outline-none transition-colors placeholder:text-[#9a857c] focus:border-[#c79f8b]"
              />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#163828] px-5 text-sm font-black text-white shadow-[0_22px_56px_-34px_rgba(22,56,40,0.55)] transition-colors hover:bg-[#204a36]"
              >
                {prefersArabicCopy ? 'إرسال السؤال' : 'Submit question'}
              </button>
            </form>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );

  // Common UI Sections for Premium Variants
  const commonRatingValue =
    typeof product.rating === 'number'
      ? product.rating
      : typeof product.reviewSummary?.averageRating === 'number'
        ? product.reviewSummary.averageRating
        : typeof product.reviewAverage === 'number'
          ? product.reviewAverage
          : null;
  const commonReviewCount =
    typeof product.reviewCount === 'number'
      ? product.reviewCount
      : typeof product.reviewsCount === 'number'
        ? product.reviewsCount
        : typeof product.ratingCount === 'number'
          ? product.ratingCount
          : typeof product.reviewSummary?.totalReviews === 'number'
            ? product.reviewSummary.totalReviews
            : 0;
  const commonHeader = isElessiPackTheme ? (
    <div className="space-y-3">
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground/80">
        <Link to={homePath} className="transition-colors hover:text-primary">{breadcrumbHomeLabel}</Link>
        <span className="opacity-35">/</span>
        <Link to={shopPath} className="transition-colors hover:text-primary">{breadcrumbShopLabel}</Link>
      </nav>
      <h1 className="text-[2rem] font-semibold leading-[1.04] tracking-tight text-foreground md:text-[2.85rem]">
        {product.name}
      </h1>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-black text-foreground">
          {product.category?.name || (prefersArabicCopy ? 'منتج' : 'Product')}
        </span>
        {commonRatingValue ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold text-foreground">
            <span className="text-[#f5a623]">★</span>
            <span>{commonRatingValue.toFixed(1)}</span>
            <span className="text-muted-foreground">
              {prefersArabicCopy ? `${commonReviewCount} مراجعة` : `${commonReviewCount} reviews`}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  ) : (
    <div className={`space-y-2 ${isNovaMobile ? 'bg-gradient-to-br from-primary/5 to-transparent p-4 rounded-2xl border border-primary/10' : ''}`}>
      <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-40">
        <Link to={homePath} className="hover:text-primary transition-colors">{breadcrumbHomeLabel}</Link>
        <span>/</span>
        <Link to={shopPath} className="hover:text-primary transition-colors">{breadcrumbShopLabel}</Link>
      </nav>
      <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter leading-[0.9] uppercase">
        {product.name}
      </h1>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-secondary text-secondary-foreground uppercase tracking-wider">
          {product.category?.name || (prefersArabicCopy ? 'منتج' : 'Technical')}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
          {usesCommerceHeaderLabel
            ? prefersArabicCopy
              ? 'جاهز للشحن'
              : 'Ready to ship'
            : prefersArabicCopy
              ? 'جاهز للطلب'
              : 'Model 2024.v1'}
        </span>
      </div>
    </div>
  );
  const commandSpecsHeader = isPcHubCommandSpecs ? (
    <div className="space-y-3">
      <nav className="flex items-center gap-2 text-[11px] font-bold text-[#7c818b]">
        <Link to={homePath} className="transition-colors hover:text-[#1f242c]">{breadcrumbHomeLabel}</Link>
        <span>/</span>
        <Link to={shopPath} className="transition-colors hover:text-[#1f242c]">{breadcrumbShopLabel}</Link>
      </nav>
      <h1 className="text-3xl font-black leading-[1.02] tracking-tight text-[#1f242c] md:text-[2.9rem]">
        {product.name}
      </h1>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5a6270]">
        <span className="rounded-full border border-[#1f242c]/10 bg-white/88 px-3 py-1.5 text-[#1f242c]">
          {product.category?.name || (prefersArabicCopy ? 'إلكترونيات' : 'Electronics')}
        </span>
        <span className="rounded-full border border-[#1f242c]/10 bg-white/72 px-3 py-1.5">
          {pcHubModelLabel}
        </span>
        {typeof product.rating === 'number' ? (
          <span className="rounded-full border border-[#1f242c]/10 bg-white/72 px-3 py-1.5">
            {prefersArabicCopy
              ? `تقييم ${product.rating.toFixed(1)} من ${product.reviewCount || 0} مراجعة`
              : `${product.rating.toFixed(1)} rating from ${product.reviewCount || 0} reviews`}
          </span>
        ) : null}
        {selectedOptionSummary ? (
          <span className="rounded-full border border-[#f2dca1] bg-[#fff8e6] px-3 py-1.5 text-[#8b5e00]">
            {prefersArabicCopy ? `النسخة المحددة: ${selectedOptionSummary}` : `Selected: ${selectedOptionSummary}`}
          </span>
        ) : null}
      </div>
    </div>
  ) : commonHeader;

  const cashbackPreviewBadge = cashbackPreview ? (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
      <Sparkles size={14} />
      {t('product.cashbackPreview', {
        amount: formatStorefrontCurrency(cashbackPreview.cashback, cashbackPreview.currency),
      })}
    </span>
  ) : null;

  const commonPrice = (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-black text-foreground">{displayPrice}</span>
        {originalPrice && (
          <span className="text-xl text-muted-foreground line-through decoration-primary/30 font-bold opacity-40">{originalPrice}</span>
        )}
      </div>
      {cashbackPreviewBadge}
    </div>
  );
  const commandSpecsPrice = isPcHubCommandSpecs ? (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-4xl font-black text-[#1f242c]">{displayPrice}</span>
        {originalPrice ? (
          <span className="text-lg font-bold text-[#7c818b] line-through decoration-[#d7b23d]/50">
            {originalPrice}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-bold text-[#5a6270]">
        <span className="rounded-full border border-[#f2dca1] bg-[#fff8e6] px-3 py-1.5 text-[#8b5e00]">
          {prefersArabicCopy
            ? `تقسيط تقريبي ${monthlyInstallmentLabel} / شهر`
            : `Approx. ${monthlyInstallmentLabel} / month`}
        </span>
        {discountAmount > 0 ? (
          <span className="rounded-full border border-[#cfe6d6] bg-[#edf8f0] px-3 py-1.5 text-[#1f6b3b]">
            {prefersArabicCopy
              ? `توفر ${formatStorefrontCurrency(discountAmount, currency)}`
              : `Save ${formatStorefrontCurrency(discountAmount, currency)}`}
          </span>
        ) : null}
      </div>
      {cashbackPreviewBadge}
    </div>
  ) : commonPrice;
  const buyNowText =
    typeof sectionSettings?.buyNowText === 'string' && sectionSettings.buyNowText.trim()
      ? sectionSettings.buyNowText.trim()
      : prefersArabicCopy
        ? '\u0627\u0634\u062A\u0631\u0650 \u0627\u0644\u0622\u0646'
        : 'Buy now';
  const readMoreText =
    prefersArabicCopy ? '\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0632\u064A\u062F' : 'Read more';
  const readLessText =
    prefersArabicCopy ? '\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644' : 'Show less';
  const reviewsTabLabel =
    prefersArabicCopy ? '\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A' : 'Reviews';
  const generalTabLabel = prefersArabicCopy ? '\u0639\u0627\u0645' : 'General';
  const descriptionPreviewText =
    shortDescription ||
    (prefersArabicCopy
      ? '\u0644\u0627 \u064A\u0648\u062C\u062F \u0648\u0635\u0641 \u0645\u062A\u0627\u062D \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u062D\u062A\u0649 \u0627\u0644\u0622\u0646.'
      : 'No description is available for this product yet.');
  function handleQuickScroll(
    targetId: string,
    block: ScrollLogicalPosition = 'start',
  ) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      if (window.location.hash !== `#${targetId}`) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${targetId}`);
      }
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const currentScrollTop = window.scrollY || window.pageYOffset || 0;
    const stickyOffset = 96;
    const nextScrollTop =
      block === 'center'
        ? currentScrollTop + targetRect.top - Math.max((window.innerHeight - targetRect.height) / 2, stickyOffset)
        : currentScrollTop + targetRect.top - stickyOffset;

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${targetId}`,
    );
    window.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    });
  }

  function queueQuickScroll(
    targetId: string,
    block: ScrollLogicalPosition = 'start',
  ) {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        handleQuickScroll(targetId, block);
      });
    });
  }
  async function handleShareAction(action: 'facebook' | 'twitter' | 'copy' | 'whatsapp') {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = window.location.href;
    const shareTitle = product?.name || (prefersArabicCopy ? 'هذا المنتج' : 'This product');

    if (action === 'copy') {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareTitle,
            url: currentUrl,
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(currentUrl);
          toast.success(prefersArabicCopy ? 'تم نسخ رابط المنتج' : 'Product link copied');
          return;
        } catch (error) {
          console.error('Failed to copy product link:', error);
        }
      }

      window.prompt(
        prefersArabicCopy ? 'انسخ رابط المنتج من هنا:' : 'Copy the product link:',
        currentUrl,
      );
      return;
    }

    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const shareTarget =
      action === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        : action === 'whatsapp'
          ? `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
          : `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

    window.open(shareTarget, '_blank', 'noopener,noreferrer');
  }

  function handleQuestionFieldChange(
    field: 'name' | 'email' | 'phone' | 'message',
    value: string,
  ) {
    setQuestionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleQuestionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!questionForm.name.trim() || !questionForm.email.trim() || !questionForm.message.trim()) {
      toast.error(
        prefersArabicCopy
          ? 'اكتبي الاسم والبريد ورسالة السؤال أولاً'
          : 'Please add your name, email, and question first',
      );
      return;
    }

    toast.success(
      prefersArabicCopy
        ? 'تم إرسال سؤالك وسيتم التواصل معك قريبًا'
        : 'Your question was submitted successfully',
    );
    setIsQuestionDialogOpen(false);
    setQuestionForm({
      name: '',
      email: '',
      phone: '',
      message: '',
    });
  }

  const commonActions = (
    <div className="flex flex-col gap-4">
      {!isElessiPackTheme ? (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
        {[
          {
            label: generalTabLabel,
            targetId: primaryActionTargetId,
            block: hasEmbeddedPdpCheckout
              ? ('start' as ScrollLogicalPosition)
              : ('center' as ScrollLogicalPosition),
          },
          {
            label: descriptionTitle,
            targetId: STOREFRONT_PRODUCT_DESCRIPTION_ID,
            block: 'start' as ScrollLogicalPosition,
          },
          {
            label: reviewsTabLabel,
            targetId: STOREFRONT_REVIEWS_SECTION_ID,
            block: 'start' as ScrollLogicalPosition,
          },
        ].map((item) => (
          <button
            key={item.targetId}
            type="button"
            onClick={() => handleQuickScroll(item.targetId, item.block)}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
          >
            {item.label}
          </button>
        ))}
        </div>
      ) : null}

      {externalOnlyProduct ? (
        <div className="flex flex-col gap-3">
          {renderExternalPurchaseCta('card')}
        </div>
      ) : shouldRenderPrimaryBuyBox ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <QuantitySelector value={quantity} onChange={setQuantity} />
            <button
              onClick={handleAddToCart}
              className="flex-1 h-14 bg-primary text-primary-foreground rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
            >
              {addToCartText}
            </button>
          </div>
          <button
            onClick={handleBuyNow}
            className="h-12 rounded-xl border border-primary/20 bg-background text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/35 hover:text-primary"
          >
            {buyNowText}
          </button>
        </div>
      ) : null}
      <div className="space-y-3 sm:hidden">
        {sizeGuideHref || fitNote ? (
          <div className="rounded-[1.2rem] border border-border bg-secondary/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground">
                  {sizeGuideText || (prefersArabicCopy ? '\u062F\u0644\u064A\u0644 \u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A' : 'Size guide')}
                </p>
                {fitNote ? (
                  <p className="text-sm leading-6 text-muted-foreground">{fitNote}</p>
                ) : null}
              </div>
              {sizeGuideHref ? (
                isExternalHref(sizeGuideHref) ? (
                  <a
                    href={sizeGuideHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? '\u0627\u0641\u062A\u062D' : 'Open'}
                  </a>
                ) : (
                  <Link
                    to={sizeGuideHref}
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {prefersArabicCopy ? '\u0627\u0641\u062A\u062D' : 'Open'}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        ) : null}

        <Accordion title={shippingTitle} defaultOpen={true}>
          <p className="text-sm leading-7 text-muted-foreground">{shippingText}</p>
        </Accordion>

        <div
          id={STOREFRONT_PRODUCT_DESCRIPTION_ID}
          className="rounded-[1.2rem] border border-border bg-background p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-foreground">{descriptionTitle}</p>
            <button
              type="button"
              onClick={() => setIsMobileDescriptionExpanded((current) => !current)}
              className="text-xs font-bold uppercase tracking-[0.14em] text-primary"
            >
              {isMobileDescriptionExpanded ? readLessText : readMoreText}
            </button>
          </div>
          <div className="mt-3">
            {isMobileDescriptionExpanded && safeDescription ? (
              <ProductDescription
                safeDescription={safeDescription}
                emptyText={descriptionPreviewText}
              />
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">{descriptionPreviewText}</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-border bg-background p-4">
          <ConfigurableTrustBadges
            title={guaranteesTitle}
            subtitle={guaranteesSubtitle}
            items={guaranteeItems.length ? guaranteeItems : undefined}
            variant={guaranteeStyle === 'grid' ? 'minimal' : guaranteeStyle}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 pt-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
          {prefersArabicCopy ? 'شاركي' : 'Share'}
        </span>
        <div className="flex gap-3 text-muted-foreground/60">
          {[
            {
              id: 'facebook' as const,
              label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
              icon: Facebook,
            },
            {
              id: 'twitter' as const,
              label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
              icon: Twitter,
            },
            {
              id: 'copy' as const,
              label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
              icon: Share2,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  void handleShareAction(item.id);
                }}
                aria-label={item.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/25 hover:text-primary"
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const commonActionsWithRef = (
    <div ref={buyActionsRef}>
      {commonActions}
    </div>
  );

  const compactMobileCommerceActions = externalOnlyProduct ? (
    <div ref={buyActionsRef} className="flex flex-col gap-3">
      {renderExternalPurchaseCta('card')}
    </div>
  ) : shouldRenderPrimaryBuyBox ? (
    <div ref={buyActionsRef} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <QuantitySelector value={quantity} onChange={setQuantity} />
        <button
          onClick={handleAddToCart}
          className="flex-1 h-14 bg-primary text-primary-foreground rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
        >
          {addToCartText}
        </button>
      </div>
      <button
        onClick={handleBuyNow}
        className="h-12 rounded-xl border border-primary/20 bg-background text-sm font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/35 hover:text-primary"
      >
        {buyNowText}
      </button>
    </div>
  ) : null;

  const commonVariantSelector = product.productVariants && product.productVariants.length > 0 && (
    <div
      id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
      className={isCutlineClub ? cutlineAccordionDecisionPanelClassName : 'py-2'}
    >
      <div className="mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
          {prefersArabicCopy ? 'الإعدادات' : 'Configuration'}
        </span>
      </div>
      <VariantSelector
        variants={product.productVariants}
        selectedAttributes={selectedAttributes}
        onChange={setSelectedAttributes}
        variantSettings={variantSettings}
      />
  </div>
  );
  const rawElessiVariantStyles = isRecord(variantSettings.styles)
    ? variantSettings.styles
    : {};
  const elessiVariantStyleOverrides = {
    ...rawElessiVariantStyles,
    ...(typeof rawElessiVariantStyles['اللون'] === 'string'
      ? { Color: rawElessiVariantStyles['اللون'] }
      : {}),
    ...(typeof rawElessiVariantStyles['Color'] === 'string'
      ? { اللون: rawElessiVariantStyles['Color'] }
      : {}),
    ...(typeof rawElessiVariantStyles['المقاس'] === 'string'
      ? { Size: rawElessiVariantStyles['المقاس'] }
      : {}),
    ...(typeof rawElessiVariantStyles['Size'] === 'string'
      ? { المقاس: rawElessiVariantStyles['Size'] }
      : {}),
  };
  const elessiVariantSettings = {
    styles: {
      Style: 'thumbnails',
      الطراز: 'thumbnails',
      Color: 'circles',
      اللون: 'circles',
      Size: 'radio',
      المقاس: 'radio',
      ...elessiVariantStyleOverrides,
    },
    attributeImages: variantSettings.attributeImages,
    attributeColors: variantSettings.attributeColors,
  };
  const elessiVariantSelector = (
    <div id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined} className="py-1">
      <VariantSelector
        variants={product.productVariants || []}
        selectedAttributes={selectedAttributes}
        onChange={setSelectedAttributes}
        density="compact"
        variantSettings={elessiVariantSettings}
        isOpen={product.productVariants && product.productVariants.length > 0}
      />
    </div>
  );
  const elessiSupportAnchorId = 'khemet-pdp-support';
  const productCategoryLabel =
    typeof product.category?.name === 'string' && product.category.name.trim()
      ? product.category.name.trim()
      : typeof product.categoryId === 'string' && product.categoryId.trim()
        ? product.categoryId.trim()
        : '';
  const updatePersonalizationOption = (key: string, value: string) => {
    setSelectedPersonalizationOptions((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const personalizationPanel =
    personalizationEnabled && personalizationFields.length > 0 ? (
      <div className="rounded-[1.25rem] border border-[#efe0d4] bg-white/92 p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4e8] text-[#8f5c44]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-black text-[#2d211e]">{personalizationTitle}</p>
            {personalizationSubtitle ? (
              <p className="text-sm leading-6 text-[#6f5a54]">{personalizationSubtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {personalizationFields.map((field) => (
            <label key={field.key} className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
                {field.label}
              </span>
              <select
                value={selectedPersonalizationOptions[field.key] || field.options[0] || ''}
                onChange={(event) => updatePersonalizationOption(field.key, event.target.value)}
                className="h-11 rounded-[1rem] border border-[#ead8ca] bg-[#fffaf6] px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors focus:border-[#8f5c44]"
              >
                {field.options.map((option) => (
                  <option key={`${field.key}-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
              {personalizationTextLabel}
            </span>
            <input
              type="text"
              value={personalizationText}
              onChange={(event) =>
                setPersonalizationText(event.target.value.slice(0, personalizationMaxLength))
              }
              placeholder={personalizationTextPlaceholder}
              className="h-11 rounded-[1rem] border border-[#ead8ca] bg-[#fffaf6] px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors placeholder:text-[#9e857a] focus:border-[#8f5c44]"
            />
          </label>
        </div>
      </div>
    ) : null;
  const elessiUtilityRail = (
    <div className="space-y-3 border-b border-[#ead8ca] pb-5">
      <div className="flex flex-wrap gap-2">
        {canOpenSizeGuide ? (
          <button
            type="button"
            onClick={() => setIsSizeGuideDialogOpen(true)}
            className="inline-flex items-center gap-2 px-0 py-1 text-sm font-black text-[#2d211e] transition-colors hover:text-[#8f5c44]"
          >
            <Ruler className="h-4 w-4 text-[#8f5c44]" />
            <span>{sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setIsShippingDialogOpen(true)}
          className="inline-flex items-center gap-2 px-0 py-1 text-sm font-black text-[#2d211e] transition-colors hover:text-[#8f5c44]"
        >
          <Truck className="h-4 w-4 text-[#8f5c44]" />
          <span>{shippingTitle || (prefersArabicCopy ? 'التوصيل والاستبدال' : 'Delivery & return')}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsQuestionDialogOpen(true)}
          className="inline-flex items-center gap-2 px-0 py-1 text-sm font-black text-[#2d211e] transition-colors hover:text-[#8f5c44]"
        >
          <MessageCircle className="h-4 w-4 text-[#8f5c44]" />
          <span>{prefersArabicCopy ? 'اسألي عن المنتج' : 'Ask a question'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#6f5a54]">
        {utilityDeliveryRangeResolved ? (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#8f5c44]" />
            <span>
              {prefersArabicCopy
                ? `موعد الوصول المتوقع: ${utilityDeliveryRangeResolved}`
                : `${utilityDeliveryLabel}: ${utilityDeliveryRangeResolved}`}
            </span>
          </div>
        ) : null}
        {utilityViewerMessageResolved ? (
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#8f5c44]" />
            <span>{utilityViewerMessageResolved}</span>
          </div>
        ) : null}
        {typeof activeStock === 'number' ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#d67d3d]" />
            <span>
              {activeStock <= 10
                ? prefersArabicCopy
                  ? `متبقي ${activeStock} فقط`
                  : `Only ${activeStock} left`
                : prefersArabicCopy
                  ? 'متاح الآن للطلب'
                  : 'Available now'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
          {prefersArabicCopy ? 'شاركي' : 'Share'}
        </span>
        <div className="flex items-center gap-2">
          {[
            {
              id: 'whatsapp' as const,
              label: prefersArabicCopy ? 'مشاركة على واتساب' : 'Share on WhatsApp',
              icon: MessageCircle,
            },
            {
              id: 'facebook' as const,
              label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
              icon: Facebook,
            },
            {
              id: 'twitter' as const,
              label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
              icon: Twitter,
            },
            {
              id: 'copy' as const,
              label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
              icon: Share2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  void handleShareAction(item.id);
                }}
                className="inline-flex h-7 w-7 items-center justify-center text-[#8f5c44] transition-colors hover:text-[#2d211e]"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
  const elessiLowStockNotice =
    showLowStockNotice && lowStockMessage ? (
      <div
        className={`${
          lowStockStyle === 'minimal' ? 'space-y-1.5' : 'space-y-2.5'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-[15px] font-semibold ${
            lowStockIsUrgent ? 'text-[#b4534b]' : 'text-[#7c5a4e]'
          }`}
        >
          <span>{lowStockMessage}</span>
        </div>
        {lowStockStyle !== 'minimal' ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ece6e1]">
            <StaticMotionDiv
              initial={{ width: 0 }}
              animate={{ width: `${lowStockMeterValue}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                lowStockIsUrgent
                  ? 'bg-[linear-gradient(90deg,#f36d63_0%,#f29a86_100%)]'
                  : 'bg-[linear-gradient(90deg,#ef8f84_0%,#f0b2a1_100%)]'
              }`}
            />
          </div>
        ) : null}
      </div>
    ) : null;
  const elessiMetadataRows = [
    productSku
      ? {
          label: 'SKU',
          value: productSku,
        }
      : null,
    productCategoryLabel
      ? {
          label: prefersArabicCopy ? 'الفئة' : 'Category',
          value: productCategoryLabel,
        }
      : null,
    productTagValues.length
      ? {
          label: prefersArabicCopy ? 'الوسوم' : 'Tags',
          value: productTagValues.join(' • '),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const elessiLowerPanelsAnchorId = 'khemet-pdp-lower-panels';

  if (variant === 'atelier-buybox') {
    const boutiqueRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const boutiqueReviewCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const boutiqueBadge =
      typeof product['editorialBadge'] === 'string' && product['editorialBadge'].trim()
        ? String(product['editorialBadge']).trim()
        : prefersArabicCopy
          ? 'تحرير روزا'
          : 'Roza editorial';
    const boutiqueCategoryLabel =
      typeof product.category?.name === 'string' && product.category.name.trim()
        ? product.category.name.trim()
        : typeof product.categoryId === 'string' && product.categoryId.trim()
          ? product.categoryId.trim()
          : prefersArabicCopy
            ? 'اختيار هادئ'
            : 'Editorial selection';
    const boutiqueNote =
      typeof product['editorialNote'] === 'string' && product['editorialNote'].trim()
        ? String(product['editorialNote']).trim()
        : shortDescription || descriptionPreviewText;
    const boutiqueFitNote =
      typeof product['fitNote'] === 'string' && product['fitNote'].trim()
        ? String(product['fitNote']).trim()
        : prefersArabicCopy
          ? 'قصة مريحة وواضحة في الصور واللبس.'
          : 'A calmer fit that stays clear in both imagery and wear.';
    const boutiqueStylingNote =
      typeof product['stylingNote'] === 'string' && product['stylingNote'].trim()
        ? String(product['stylingNote']).trim()
        : prefersArabicCopy
          ? 'اختاري معه قطعة أو اثنتين فقط حتى يبقى الجو العام نظيفًا وهادئًا.'
          : 'Keep styling to one or two soft add-ons so the overall look stays clean.';
    const boutiqueCareNote =
      typeof product['careNote'] === 'string' && product['careNote'].trim()
        ? String(product['careNote']).trim()
        : prefersArabicCopy
          ? 'راجعي العناية المناسبة قبل الاستخدام الأول للحفاظ على القماش واللون.'
          : 'Review the care note before first wear to keep fabric and color at their best.';
    const boutiqueStyleWith = (
      Array.isArray(product['styleWith']) && product['styleWith'].length
        ? product['styleWith']
        : productTagValues
    )
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const boutiqueFacts = (
      Array.isArray(product['boutiqueFacts']) && product['boutiqueFacts'].length
        ? product['boutiqueFacts']
        : [
            {
              label: prefersArabicCopy ? 'الفئة' : 'Category',
              value: boutiqueCategoryLabel,
            },
            {
              label: prefersArabicCopy ? 'الاختيار' : 'Selection',
              value:
                selectedOptionSummary ||
                (product.productVariants && product.productVariants.length > 0
                  ? prefersArabicCopy
                    ? 'ألوان ومقاسات متعددة'
                    : 'Multiple colors and sizes'
                  : prefersArabicCopy
                    ? 'جاهز للطلب مباشرة'
                    : 'Ready for direct checkout'),
            },
            {
              label: prefersArabicCopy ? 'الشحن' : 'Shipping',
              value: prefersArabicCopy ? 'تجهيز واضح داخل مصر' : 'Clear Egypt-wide shipping',
            },
            {
              label: prefersArabicCopy ? 'الدعم' : 'Support',
              value:
                guaranteeItems[0]?.title?.trim() ||
                (prefersArabicCopy ? 'خدمة واضحة بعد الشراء' : 'Clear post-purchase support'),
            },
          ]
    )
      .map((fact) => ({
        label: String(fact?.label || '').trim(),
        value: String(fact?.value || '').trim(),
      }))
      .filter((fact) => fact.label && fact.value)
      .slice(0, 4);
    const boutiqueGuaranteeCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'صور أقرب للواقع' : 'Closer imagery',
              description: prefersArabicCopy
                ? 'نحاول إبقاء الأقمشة والدرجات أوضح حتى يكون القرار أهدأ.'
                : 'Imagery stays closer to real fabric and tone so the decision feels calmer.',
            },
            {
              title: prefersArabicCopy ? 'استبدال أوضح' : 'Clear exchanges',
              description: prefersArabicCopy
                ? 'إذا احتجت تغيير المقاس، تبقى الخطوات أبسط قبل وما بعد الشراء.'
                : 'If you need a size change, the path stays clearer before and after checkout.',
            },
            {
              title: prefersArabicCopy ? 'توصيل داخل مصر' : 'Egypt-wide delivery',
              description: prefersArabicCopy
                ? 'رسالة الشحن وخطوات التوصيل تبقى ظاهرة خلال الرحلة كلها.'
                : 'Delivery expectations stay visible through the purchase flow.',
            },
          ]
    ).slice(0, 3);
    const boutiqueSpecs = specs
      .map((spec) => ({
        label: String(spec?.label || '').trim(),
        value: String(spec?.value || '').trim(),
      }))
      .filter((spec) => spec.label && spec.value)
      .slice(0, 4);
    const atelierUtilityActionClassName =
      'font-sans text-[0.8rem] font-black tracking-[0.04em] text-[#5c4747] transition-colors hover:text-[#3f2f33]';
    const atelierVariantSelector =
      product.productVariants &&
      product.productVariants.length > 0 &&
      !isPrimaryQuantityOffersDecision ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#9c6274]">
            {prefersArabicCopy ? 'الاختيار' : 'Selection'}
          </p>
          <VariantSelector
            variants={product.productVariants}
            selectedAttributes={selectedAttributes}
            onChange={setSelectedAttributes}
            density="compact"
            layout="inline-compact"
            variantSettings={variantSettings}
          />
        </div>
      ) : null;
    const renderAtelierSizeGuideLink = () => {
      if (sizeGuideInteraction === 'modal' && canOpenSizeGuide) {
        return (
          <button
            type="button"
            onClick={() => setIsSizeGuideDialogOpen(true)}
            className={atelierUtilityActionClassName}
          >
            {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
          </button>
        );
      }

      if (!sizeGuideHref) {
        return null;
      }

      if (isExternalHref(sizeGuideHref)) {
        return (
          <a
            href={sizeGuideHref}
            target="_blank"
            rel="noreferrer"
            className={atelierUtilityActionClassName}
          >
            {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
          </a>
        );
      }

      return (
        <Link
          to={sizeGuideHref}
          className={atelierUtilityActionClassName}
        >
          {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
        </Link>
      );
    };
    const atelierUtilityLinks = [renderAtelierSizeGuideLink()].filter(Boolean);
    const atelierShareActions = [
      {
        id: 'facebook' as const,
        label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
        icon: Facebook,
      },
      {
        id: 'twitter' as const,
        label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
        icon: Twitter,
      },
      {
        id: 'copy' as const,
        label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
        icon: Share2,
      },
    ];
    const atelierDecisionMeta =
      selectedOptionSummary || discount || stockStatusLabel ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eadfd9] pb-4">
          {selectedOptionSummary ? (
            <span className="inline-flex rounded-full border border-[#dfcfc7] bg-white/92 px-3 py-1 text-[11px] font-black text-[#3f2f33]">
              {prefersArabicCopy
                ? `الاختيار: ${selectedOptionSummary}`
                : `Selected: ${selectedOptionSummary}`}
            </span>
          ) : null}
          <span className="inline-flex rounded-full border border-[#dfcfc7] bg-white/92 px-3 py-1 text-[11px] font-black text-[#6e5757]">
            {stockStatusLabel}
          </span>
          {discount && discount > 0 ? (
            <span className="inline-flex rounded-full bg-[#3f2f33] px-3 py-1 text-[11px] font-black text-white">
              {prefersArabicCopy ? `وفر ${discount}%` : `Save ${discount}%`}
            </span>
          ) : null}
        </div>
      ) : null;
    const atelierFactsGrid =
      boutiqueFacts.length > 0 ? (
        <dl className="grid gap-x-8 gap-y-4 border-t border-[#eadfd9] pt-5 sm:grid-cols-2">
          {boutiqueFacts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="border-b border-[#f1e4df] pb-3">
              <dt className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm font-bold leading-6 text-[#4a383b]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null;
    const showStickyMobileAddToCart =
      shouldRenderStandaloneBuyBox && !externalOnlyProduct && !isCartOpen;

    return (
      <section className="w-full px-1 py-4">
        <div className="space-y-6">
          {canOpenSizeGuide && sizeGuideInteraction === 'modal' ? sizeGuideDialog : null}
          {shippingInteraction === 'modal' ? shippingPolicyDialog : null}

          <div className="hidden space-y-4 lg:block">
            <p className="text-[10px] font-black tracking-[0.28em] text-[#9c6274]">
              {boutiqueBadge}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-[#6e5757]">
              <span>{boutiqueCategoryLabel}</span>
              {boutiqueRating ? (
                <>
                  <span className="text-[#dfcfc7]">/</span>
                  <span>
                    {prefersArabicCopy
                      ? `★ ${boutiqueRating.toFixed(1)} من ${boutiqueReviewCount} تقييم`
                      : `★ ${boutiqueRating.toFixed(1)} from ${boutiqueReviewCount} reviews`}
                  </span>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-[2.3rem] font-black leading-[1.02] tracking-tight text-[#3f2f33] md:text-[3rem]">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-[2.35rem] font-black text-[#3f2f33] md:text-[2.95rem]">
                  {displayPrice}
                </span>
                {originalPrice ? (
                  <span className="text-base font-bold text-[#9d857f] line-through decoration-[#dfc4bd]">
                    {originalPrice}
                  </span>
                ) : null}
                {discount && discount > 0 ? (
                  <span className="text-[11px] font-black tracking-[0.2em] text-[#9c6274]">
                    {prefersArabicCopy ? `خصم ${discount}%` : `${discount}% off`}
                  </span>
                ) : null}
              </div>
              <p className="max-w-2xl text-[0.98rem] leading-8 text-[#6e5757]">
                {boutiqueNote}
              </p>
            </div>
          </div>

          <div className="space-y-5 border-y border-[#eadfd9] py-5">
            <div
              id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
              ref={buyActionsRef}
              className="space-y-5"
            >
              {atelierDecisionMeta}

              {atelierVariantSelector ? (
                <div className="border-b border-[#eadfd9] pb-4">{atelierVariantSelector}</div>
              ) : null}

              {inlineQuantityOffers ? (
                <div className="border-b border-[#eadfd9] pb-4">{inlineQuantityOffers}</div>
              ) : null}

              {externalOnlyProduct ? (
                renderExternalPurchaseCta('card')
              ) : shouldRenderStandaloneBuyBox ? (
                <div className="space-y-4 border-b border-[#eadfd9] pb-5">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className={`${buyNowButtonClassName} !bg-primary !text-white border-none`}
                    >
                      {buyNowText}
                    </button>
                    <div className="flex items-center gap-3">
                      <QuantitySelector value={quantity} onChange={setQuantity} />
                      <Button
                        size="lg"
                        fullWidth
                        variant="outline"
                        className={`${addToCartButtonClassName} !bg-white !text-primary !border-primary/30`}
                        onClick={handleAddToCart}
                      >
                        {addToCartText}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : showExternalAffiliateCta ? (
                renderExternalPurchaseCta('inline')
              ) : null}

              {mergedInlinePdpQuickOrder ? (
                <div className="border-b border-[#eadfd9] pb-5">
                  {mergedInlinePdpQuickOrder}
                </div>
              ) : null}

              <p className="max-w-2xl text-sm leading-7 text-[#6e5757]">
                {prefersArabicCopy
                  ? 'الشراء يظل قريبًا من المقاس واللون، حتى لا تتحول الصفحة إلى قراءة طويلة قبل الحسم.'
                  : 'Buying stays close to size and color so the page never turns into a long read before checkout.'}
              </p>

              {boutiqueStyleWith.length > 0 ? (
                <p className="max-w-2xl text-xs leading-6 text-[#6e5757]">
                  <span className="font-black text-[#3f2f33]">
                    {prefersArabicCopy ? 'تنسيق مقترح:' : 'Suggested pairing:'}
                  </span>{' '}
                  {boutiqueStyleWith.join(' • ')}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#eadfd9] pt-4">
                {atelierUtilityLinks.map((item, index) => (
                  <React.Fragment key={index}>{item}</React.Fragment>
                ))}
                {shippingInteraction === 'modal' ? (
                  <button
                    type="button"
                    onClick={() => setIsShippingDialogOpen(true)}
                    className={atelierUtilityActionClassName}
                  >
                    {shippingTitle}
                  </button>
                ) : null}
                <div className="flex items-center gap-4 sm:ms-auto">
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                    {prefersArabicCopy ? 'شاركي' : 'Share'}
                  </span>
                  <div className="flex gap-3 text-[#6e5757]">
                    {atelierShareActions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            void handleShareAction(item.id);
                          }}
                          aria-label={item.label}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbc5be] bg-white text-[#5c4747] shadow-[0_12px_28px_-24px_rgba(63,47,51,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:bg-[#fff8f5] hover:text-[#3f2f33]"
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#eadfd9] pt-4">
                <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                  {shippingTitle}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6e5757]">{shippingText}</p>
              </div>
            </div>

            {atelierFactsGrid}
          </div>

          <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,22rem)] xl:items-start xl:gap-10 xl:space-y-0">
            <div className="space-y-5">
              <div
                id={STOREFRONT_PRODUCT_DESCRIPTION_ID}
                className="space-y-3 border-b border-[#eadfd9] pb-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#9c6274]">
                    {descriptionTitle}
                  </p>
                  {safeDescription ? (
                    <button
                      type="button"
                      onClick={() => setIsMobileDescriptionExpanded((current) => !current)}
                      className={atelierUtilityActionClassName}
                    >
                      {isMobileDescriptionExpanded ? readLessText : readMoreText}
                    </button>
                  ) : null}
                </div>
                {safeDescription && isMobileDescriptionExpanded ? (
                  <ProductDescription
                    safeDescription={safeDescription}
                    emptyText={descriptionPreviewText}
                  />
                ) : (
                  <p className="text-sm leading-7 text-[#6e5757]">
                    {descriptionPreviewText}
                  </p>
                )}
              </div>

              {[
                {
                  label: prefersArabicCopy ? 'القصّة' : 'Fit',
                  value: boutiqueFitNote,
                },
                {
                  label: prefersArabicCopy ? 'التنسيق' : 'Styling',
                  value: boutiqueStylingNote,
                },
                {
                  label: prefersArabicCopy ? 'العناية' : 'Care',
                  value: boutiqueCareNote,
                },
              ].map((item) => (
                <div key={item.label} className="border-b border-[#f1e4df] pb-5">
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#6e5757]">{item.value}</p>
                </div>
              ))}
            </div>

            {showGuarantees ? (
              <div className="space-y-5 xl:border-s xl:border-[#f1e4df] xl:ps-8">
                <div className="border-b border-[#eadfd9] pb-4">
                  <p className="text-sm font-black text-[#433134]">{guaranteesTitle}</p>
                  <p className="mt-2 text-sm leading-7 text-[#766060]">
                    {guaranteesSubtitle}
                  </p>
                </div>

                {boutiqueGuaranteeCards.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="flex gap-4 border-b border-[#f1e4df] pb-5">
                    <span className="pt-0.5 text-[11px] font-black tracking-[0.22em] text-[#9c6274]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#433134]">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#6e5757]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}

                {boutiqueSpecs.length > 0 ? (
                  <div className="space-y-3 border-t border-[#eadfd9] pt-4">
                    <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                      {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                    </p>
                    <dl className="space-y-3">
                      {boutiqueSpecs.map((spec, index) => (
                        <div
                          key={`${spec.label}-${index}`}
                          className="flex items-start justify-between gap-4 border-b border-[#f1e4df] pb-3 text-sm"
                        >
                          <dt className="font-black text-[#433134]">{spec.label}</dt>
                          <dd className="text-left leading-6 text-[#6e5757]">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'boutique-ledger') {
    const boutiqueRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const boutiqueReviewCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const boutiqueBadge =
      typeof product['editorialBadge'] === 'string' && product['editorialBadge'].trim()
        ? String(product['editorialBadge']).trim()
        : prefersArabicCopy
          ? 'اختيار روزا'
          : 'Boutique select';
    const boutiqueNote =
      typeof product['editorialNote'] === 'string' && product['editorialNote'].trim()
        ? String(product['editorialNote']).trim()
        : shortDescription || descriptionPreviewText;
    const boutiqueFitNote =
      typeof product['fitNote'] === 'string' && product['fitNote'].trim()
        ? String(product['fitNote']).trim()
        : prefersArabicCopy
          ? 'قصة مريحة وواضحة في الصور واللبس.'
          : 'A calmer fit that stays clear in both imagery and wear.';
    const boutiqueStylingNote =
      typeof product['stylingNote'] === 'string' && product['stylingNote'].trim()
        ? String(product['stylingNote']).trim()
        : prefersArabicCopy
          ? 'اختاري معه قطعة أو اثنتين فقط حتى يبقى الجو العام نظيفًا وهادئًا.'
          : 'Keep styling to one or two soft add-ons so the overall look stays clean.';
    const boutiqueCareNote =
      typeof product['careNote'] === 'string' && product['careNote'].trim()
        ? String(product['careNote']).trim()
        : prefersArabicCopy
          ? 'راجعي العناية المناسبة قبل الاستخدام الأول للحفاظ على القماش واللون.'
          : 'Review the care note before first wear to keep fabric and color at their best.';
    const boutiqueStyleWith = (
      Array.isArray(product['styleWith']) && product['styleWith'].length
        ? product['styleWith']
        : productTagValues
    )
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const boutiqueFacts = (
      Array.isArray(product['boutiqueFacts']) && product['boutiqueFacts'].length
        ? product['boutiqueFacts']
        : [
            {
              label: prefersArabicCopy ? 'الفئة' : 'Category',
              value:
                typeof product.category?.name === 'string' && product.category.name.trim()
                  ? product.category.name.trim()
                  : typeof product.categoryId === 'string' && product.categoryId.trim()
                    ? product.categoryId.trim()
                    : prefersArabicCopy
                      ? 'مختارات البوتيك'
                      : 'Boutique edit',
            },
            {
              label: prefersArabicCopy ? 'التهيئة' : 'Setup',
              value:
                selectedOptionSummary ||
                (product.productVariants && product.productVariants.length > 0
                  ? prefersArabicCopy
                    ? 'ألوان ومقاسات متعددة'
                    : 'Multiple colors and sizes'
                  : prefersArabicCopy
                    ? 'جاهز للطلب مباشرة'
                    : 'Ready for direct checkout'),
            },
            {
              label: prefersArabicCopy ? 'الشحن' : 'Shipping',
              value: prefersArabicCopy ? 'تجهيز واضح داخل مصر' : 'Clear Egypt-wide shipping',
            },
            {
              label: prefersArabicCopy ? 'الدعم' : 'Support',
              value:
                guaranteeItems[0]?.title?.trim() ||
                (prefersArabicCopy ? 'خدمة واضحة بعد الشراء' : 'Clear post-purchase support'),
            },
          ]
    )
      .map((fact) => ({
        label: String(fact?.label || '').trim(),
        value: String(fact?.value || '').trim(),
      }))
      .filter((fact) => fact.label && fact.value)
      .slice(0, 4);
    const boutiqueProofs = (
      Array.isArray(product['boutiqueProofs']) && product['boutiqueProofs'].length
        ? product['boutiqueProofs']
        : [
            {
              label: prefersArabicCopy ? 'القصّة' : 'Fit',
              title: prefersArabicCopy ? 'تظهر أوضح في اللقطات القريبة' : 'Clearer in close-up',
              description: boutiqueFitNote,
            },
            {
              label: prefersArabicCopy ? 'التنسيق' : 'Styling',
              title: prefersArabicCopy ? 'تكمل الإطلالة بدون ازدحام' : 'Completes without clutter',
              description: boutiqueStylingNote,
            },
            {
              label: prefersArabicCopy ? 'العناية' : 'Care',
              title: prefersArabicCopy ? 'تفصيلة صغيرة تطيل عمر القطعة' : 'A small note that helps it last',
              description: boutiqueCareNote,
            },
          ]
    )
      .map((proof) => ({
        label: String(proof?.label || '').trim(),
        title: String(proof?.title || '').trim(),
        description: String(proof?.description || '').trim(),
      }))
      .filter((proof) => proof.label && proof.title && proof.description)
      .slice(0, 3);
    const boutiqueGuaranteeCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'صور أقرب للواقع' : 'Closer imagery',
              description: prefersArabicCopy
                ? 'نحاول إبقاء الأقمشة والدرجات أوضح حتى يكون القرار أهدأ.'
                : 'Imagery stays closer to real fabric and tone so the decision feels calmer.',
            },
            {
              title: prefersArabicCopy ? 'استبدال أوضح' : 'Clear exchanges',
              description: prefersArabicCopy
                ? 'إذا احتجت تغيير المقاس، تبقى الخطوات أبسط قبل وما بعد الشراء.'
                : 'If you need a size change, the path stays clearer before and after checkout.',
            },
            {
              title: prefersArabicCopy ? 'توصيل داخل مصر' : 'Egypt-wide delivery',
              description: prefersArabicCopy
                ? 'رسالة الشحن وخطوات التوصيل تبقى ظاهرة خلال الرحلة كلها.'
                : 'Delivery expectations stay visible through the purchase flow.',
            },
          ]
    ).slice(0, 3);
    const boutiqueSpecs = specs
      .map((spec) => ({
        label: String(spec?.label || '').trim(),
        value: String(spec?.value || '').trim(),
      }))
      .filter((spec) => spec.label && spec.value)
      .slice(0, 4);

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#ead8d3] bg-[linear-gradient(180deg,#fffefc_0%,#fff7f3_100%)] shadow-[0_36px_96px_-74px_rgba(86,58,58,0.2)]">
          <div className="space-y-4 border-b border-[#efe1da] px-5 py-5">
            <nav className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#9f8c86]">
              <Link to={homePath} className="transition-colors hover:text-[#8f5e6c]">
                {breadcrumbHomeLabel}
              </Link>
              <span>/</span>
              <Link to={shopPath} className="transition-colors hover:text-[#8f5e6c]">
                {breadcrumbShopLabel}
              </Link>
              <span>/</span>
              <span className="max-w-[18rem] truncate text-[#6e5757]">{product.name}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#e6c7d0] bg-white/92 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#9c6274] shadow-[0_14px_28px_-24px_rgba(122,77,89,0.3)]">
                {boutiqueBadge}
              </span>
              {boutiqueRating ? (
                <span className="inline-flex rounded-full border border-[#efe1da] bg-[#fffaf7] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#7b6262]">
                  {prefersArabicCopy
                    ? `★ ${boutiqueRating.toFixed(1)} من ${boutiqueReviewCount} تقييم`
                    : `★ ${boutiqueRating.toFixed(1)} from ${boutiqueReviewCount} reviews`}
                </span>
              ) : null}
              {selectedOptionSummary ? (
                <span className="inline-flex rounded-full border border-[#efe1da] bg-white/86 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#8d6d68]">
                  {prefersArabicCopy ? `المحدد: ${selectedOptionSummary}` : `Selected: ${selectedOptionSummary}`}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-[1.95rem] font-black leading-[1.08] tracking-tight text-[#3f2f33] md:text-[2.45rem]">
                {product.name}
              </h1>
              <p className="text-sm leading-7 text-[#6e5757] md:text-base md:leading-8">
                {boutiqueNote}
              </p>
            </div>

            {boutiqueStyleWith.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {boutiqueStyleWith.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="rounded-full border border-[#efdcd6] bg-white/86 px-3 py-1.5 text-xs font-bold text-[#6e5757]"
                  >
                    {prefersArabicCopy
                      ? index === 0
                        ? `يتماشى مع ${item}`
                        : `وأيضًا ${item}`
                      : index === 0
                        ? `Pairs with ${item}`
                        : `Also ${item}`}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {boutiqueFacts.map((fact, index) => (
                <div
                  key={`${fact.label}-${index}`}
                  className="rounded-[1.2rem] border border-[#efe0da] bg-white/90 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(86,58,58,0.14)]"
                >
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#4a383b]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {boutiqueProofs.length > 0 ? (
            <div className="grid gap-3 border-b border-[#efe1da] px-5 py-4 md:grid-cols-2">
              {boutiqueProofs.map((proof, index) => (
                <div
                  key={`${proof.label}-${index}`}
                  className="rounded-[1.25rem] border border-[#efe0da] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,244,0.9))] px-4 py-4 shadow-[0_18px_36px_-32px_rgba(86,58,58,0.14)]"
                >
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {proof.label}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-6 text-[#433134]">
                    {proof.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#6e5757]">
                    {proof.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 p-3 md:p-4">
            <div className="rounded-[1.75rem] border border-[#ead9d2] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] p-5 shadow-[0_26px_82px_-62px_rgba(86,58,58,0.18)]">
              <div className="space-y-3 border-b border-[#efe1da] pb-4">
                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-[2.35rem] font-black text-[#3f2f33] md:text-[2.8rem]">
                    {displayPrice}
                  </span>
                  {originalPrice ? (
                    <span className="text-base font-bold text-[#9d857f] line-through decoration-[#dfc4bd]">
                      {originalPrice}
                    </span>
                  ) : null}
                  {discount && discount > 0 ? (
                    <span className="inline-flex rounded-full bg-[#3f2f33] px-3 py-1 text-[10px] font-black tracking-[0.18em] text-white shadow-[0_18px_32px_-24px_rgba(63,47,51,0.4)]">
                      {prefersArabicCopy ? `خصم ${discount}%` : `${discount}% off`}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-[#6e5757]">
                  {shortDescription || descriptionPreviewText}
                </p>
              </div>

              <div className="pt-4">{commonActionsWithRef}</div>
            </div>

            {commonVariantSelector ? (
              <div className="rounded-[1.7rem] border border-[#efe0da] bg-white/92 p-5 shadow-[0_24px_72px_-58px_rgba(86,58,58,0.14)]">
                <div className="mb-3 space-y-1">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {prefersArabicCopy ? 'اختيارك' : 'Selection'}
                  </p>
                  <p className="text-sm leading-6 text-[#766060]">
                    {prefersArabicCopy
                      ? 'اختاري اللون أو المقاس المناسب ثم أغلقي الطلب بهدوء.'
                      : 'Choose the right color or size, then complete checkout calmly.'}
                  </p>
                </div>
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.65rem] border border-[#efe0da] bg-[#fffaf7] p-5">
                <p className="text-sm font-black text-[#433134]">
                  {prefersArabicCopy ? 'ملاحظات روزا' : 'Roza notes'}
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: prefersArabicCopy ? 'القصّة' : 'Fit',
                      value: boutiqueFitNote,
                    },
                    {
                      label: prefersArabicCopy ? 'التنسيق' : 'Styling',
                      value: boutiqueStylingNote,
                    },
                    {
                      label: prefersArabicCopy ? 'العناية' : 'Care',
                      value: boutiqueCareNote,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.05rem] border border-[#f1e3dd] bg-white/88 px-4 py-3"
                    >
                      <p className="text-[10px] font-black tracking-[0.2em] text-[#a06a77]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6e5757]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.65rem] border border-[#efe0da] bg-[#fffaf7] p-5">
                <p className="text-sm font-black text-[#433134]">{guaranteesTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#766060]">
                  {guaranteesSubtitle}
                </p>
                <div className="mt-4 space-y-3">
                  {boutiqueGuaranteeCards.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-[1.05rem] border border-[#f1e3dd] bg-white/88 px-4 py-3"
                    >
                      <p className="text-sm font-black text-[#433134]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6e5757]">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {boutiqueSpecs.length > 0 ? (
              <div className="rounded-[1.65rem] border border-[#efe0da] bg-white/92 p-5 shadow-[0_22px_60px_-54px_rgba(86,58,58,0.12)]">
                <p className="text-sm font-black text-[#433134]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {boutiqueSpecs.map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="rounded-[1rem] border border-[#f1e3dd] bg-[#fffaf7] px-4 py-3"
                    >
                      <p className="text-[10px] font-black tracking-[0.2em] text-[#a06a77]">
                        {spec.label}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#4a383b]">
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[1.55rem] border border-[#efe0da] bg-white/92 p-4 shadow-[0_18px_50px_-44px_rgba(86,58,58,0.12)]">
              <p className="text-sm font-black text-[#433134]">{shippingTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[#6e5757]">{shippingText}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const gearTagValues = productTagValues;
  const gearCategoryLabel =
    typeof product.category?.name === 'string' && product.category.name.trim()
      ? product.category.name.trim()
      : typeof product.categoryId === 'string' && product.categoryId.trim()
        ? product.categoryId.trim()
        : prefersArabicCopy
          ? 'Gaming Gear'
          : 'Gaming Gear';
  const normalizedSpecs = specs
    .map((spec) => ({
      label: String(spec.label || '').trim(),
      value: String(spec.value || '').trim(),
    }))
    .filter((spec) => spec.label && spec.value);
  const gearFallbackFacts = [
    {
      label: prefersArabicCopy ? 'الفئة' : 'Category',
      value: gearCategoryLabel,
    },
    {
      label: prefersArabicCopy ? 'التهيئة' : 'Setup',
      value:
        product.productVariants && product.productVariants.length > 0
          ? prefersArabicCopy
            ? 'خيارات متعددة جاهزة للتخصيص'
            : 'Multiple configurations available'
          : prefersArabicCopy
            ? 'جاهز للشراء مباشرة'
            : 'Ready for instant checkout',
    },
    {
      label: prefersArabicCopy ? 'الشحن' : 'Shipping',
      value: prefersArabicCopy
        ? 'الرسوم والتجهيز تظهر بوضوح قبل اعتماد الطلب.'
        : 'Shipping and handling stay visible before final checkout.',
    },
    {
      label: prefersArabicCopy ? 'الدعم' : 'Support',
      value:
        guaranteeItems[0]?.title?.trim() ||
        (prefersArabicCopy ? 'دعم واضح بعد الشراء' : 'Clear post-purchase support'),
    },
  ];
  const gearQuickFacts = [...normalizedSpecs.slice(0, 2), ...gearFallbackFacts]
    .filter(
      (fact, index, array) =>
        array.findIndex((candidate) => candidate.label === fact.label) === index,
    )
    .slice(0, 4);
  const gearSupportItems = (
    guaranteeItems.length
      ? guaranteeItems
      : [
          {
            title: prefersArabicCopy ? 'اختيارات موثوقة' : 'Trusted picks',
            description: prefersArabicCopy
              ? 'كل قطعة تمر برسالة خدمة أوضح قبل غلق الطلب.'
              : 'Each product keeps service messaging visible before checkout.',
          },
          {
            title: prefersArabicCopy ? 'شحن أوضح' : 'Clear shipping',
            description: prefersArabicCopy
              ? 'تظهر الرسوم وخطوات التوصيل داخل مسار الشراء نفسه.'
              : 'Delivery cost and steps stay visible in the purchase flow.',
          },
          {
            title: prefersArabicCopy ? 'تجهيز أسرع' : 'Faster setup',
            description: prefersArabicCopy
              ? 'اقتراحات الباندل والإضافات تقلل وقت اتخاذ القرار.'
              : 'Bundle suggestions reduce decision time for full setups.',
          },
        ]
  ).slice(0, 3);
  const gearStatusChips = [
    discount && discount > 0
      ? prefersArabicCopy
        ? `وفر ${discount}%`
        : `Save ${discount}%`
      : product.productVariants && product.productVariants.length > 0
        ? prefersArabicCopy
          ? 'قابل للتخصيص'
          : 'Configurable'
        : prefersArabicCopy
          ? 'جاهز الآن'
          : 'Ready now',
    ...gearTagValues.slice(0, 2),
  ].filter(Boolean) as string[];
  const gearSummaryText =
    shortDescription ||
    (prefersArabicCopy
      ? 'جمعنا لك أهم التفاصيل وخيارات الشراء والإضافات المرتبطة في مسار واحد أوضح حتى تحسم اختيارك بسرعة.'
      : 'Key details, purchase options, and related add-ons are grouped into one clearer buying flow.');
  const gearMobileQuickNav = (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
      {[
        {
          label: generalTabLabel,
          targetId: primaryActionTargetId,
          block: hasEmbeddedPdpCheckout
            ? ('start' as ScrollLogicalPosition)
            : ('center' as ScrollLogicalPosition),
        },
        {
          label: descriptionTitle,
          targetId: STOREFRONT_PRODUCT_DESCRIPTION_ID,
          block: 'start' as ScrollLogicalPosition,
        },
        {
          label: reviewsTabLabel,
          targetId: STOREFRONT_REVIEWS_SECTION_ID,
          block: 'start' as ScrollLogicalPosition,
        },
      ].map((item) => (
        <button
          key={item.targetId}
          type="button"
          onClick={() => handleQuickScroll(item.targetId, item.block)}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
  const gearShareActions = (
    <div className="flex items-center gap-6 pt-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
        {prefersArabicCopy ? 'شاركي' : 'Share'}
      </span>
      <div className="flex gap-3 text-slate-300/75">
        {[
          {
            id: 'facebook' as const,
            label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
            icon: Facebook,
          },
          {
            id: 'twitter' as const,
            label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
            icon: Twitter,
          },
          {
            id: 'copy' as const,
            label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
            icon: Share2,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                void handleShareAction(item.id);
              }}
              aria-label={item.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-slate-200 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
  const gearVariantSelector =
    product.productVariants && product.productVariants.length > 0 ? (
      <div
        id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
        className="space-y-4"
      >
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
            {prefersArabicCopy ? 'التخصيص' : 'Loadout'}
          </p>
          <p className="text-sm leading-6 text-slate-300/78">
            {prefersArabicCopy
              ? 'اختر النسخة أو اللون أو المقاس المناسب قبل تأكيد الإضافة للسلة.'
              : 'Pick the right configuration before you lock the item into the cart.'}
          </p>
        </div>
      <VariantSelector
        variants={product.productVariants}
        selectedAttributes={selectedAttributes}
        onChange={setSelectedAttributes}
        variantSettings={variantSettings}
      />
    </div>
  ) : null;

  if (isElessiBagBuybox) {
    const bagRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const bagReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const bagStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} طلب مكتمل`
          : `${soldCount} completed orders`
        : null,
      utilityViewerMessage || null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const bagDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاختيار' : 'Selection',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'ألوان ومقاسات متعددة'
              : 'Multiple colors and sizes'
            : prefersArabicCopy
              ? 'جاهزة للإضافة مباشرة'
              : 'Ready to add'),
      },
      {
        label: prefersArabicCopy ? 'التوفر' : 'Availability',
        value:
          typeof activeStock === 'number'
            ? activeStock <= 10
              ? prefersArabicCopy
                ? `متبقي ${activeStock}`
                : `${activeStock} left`
              : prefersArabicCopy
                ? 'متاح الآن'
                : 'Available now'
            : prefersArabicCopy
              ? 'حسب التوفر'
              : 'Subject to stock',
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value:
          utilityDeliveryRange ||
          (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
    ];

    return (
      <section className="w-full border-y border-[#efe2d7] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#efe2d7] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {bagStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#eadfd4] bg-white px-3 py-1.5 text-xs font-bold text-[#6f5a50]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {bagRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#6f5a50]">
                  <span className="text-[#d89d35]">
                    {'★★★★★'.slice(0, Math.round(bagRating))}
                  </span>
                  <span className="font-bold text-[#241815]">
                    {bagRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${bagReviewsCount} مراجعة)`
                      : `(${bagReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              <p className="max-w-3xl text-sm leading-7 text-[#6f5a50] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#efe2d7] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.6rem] border border-[#eadfd4] bg-[linear-gradient(180deg,#fffdfa,#f8f0e8)] p-4 shadow-[0_24px_64px_-52px_rgba(61,37,25,0.2)] md:p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9a7666]">
                    {prefersArabicCopy ? 'اختيار الشراء' : 'Purchase setup'}
                  </p>
                  <p className="text-sm leading-7 text-[#6f5a50]">
                    {prefersArabicCopy
                      ? 'اختَر اللون أو المقاس، ثم أكمل الإضافة أو راجع الشحن والاستبدال من نفس السطح.'
                      : 'Choose the right color or size, then complete the add-to-cart decision from the same surface.'}
                  </p>
                </div>

                {commonActionsWithRef}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {bagDecisionFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="space-y-2 border-b border-[#efe2d7] pb-3 sm:border-b-0 sm:pb-0"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a7666]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#241815]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#6f5a50]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#241815]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#241815]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'آراء العملاء' : 'Customer reviews'}</span>
              </button>
            </div>

            <div className="grid gap-5 border-t border-[#efe2d7] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#241815]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#6f5a50]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#6f5a50]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#241815]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="border-b border-[#efe2d7] pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="text-sm font-bold text-[#241815]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5a50]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#6f5a50]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#efe2d7] pt-5">
                <p className="text-sm font-black text-[#241815]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#efe2d7] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#6f5a50]">{spec.label}</span>
                      <span className="text-sm font-black text-[#241815]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isElessiPlantBuybox) {
    const plantRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const plantReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const plantStatusChips = [
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} تم بيعها`
          : `${soldCount} sold`
        : null,
      utilityViewerMessage || null,
      utilityDeliveryRange
        ? prefersArabicCopy
          ? `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
          : `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
        : null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const plantDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاختيار' : 'Selection',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'متوفر بأكثر من خيار'
              : 'Multiple options available'
            : prefersArabicCopy
              ? 'جاهز للشراء مباشرة'
              : 'Ready to add'),
      },
      {
        label: prefersArabicCopy ? 'الحالة' : 'Availability',
        value:
          typeof activeStock === 'number'
            ? activeStock <= 10
              ? prefersArabicCopy
                ? `متبقي ${activeStock}`
                : `${activeStock} left`
              : prefersArabicCopy
                ? 'متاح الآن'
                : 'Available now'
            : prefersArabicCopy
              ? 'متاح للطلب'
              : 'Available to order',
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value:
          utilityDeliveryRange ||
          (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
    ];

    return (
      <section className="w-full border-y border-[#e7efe4] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#e7efe4] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {plantStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#d8e6d8] bg-white px-3 py-1.5 text-xs font-bold text-[#43604b]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {plantRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#56715e]">
                  <span className="text-[#f5a623]">
                    {'★★★★★'.slice(0, Math.round(plantRating))}
                  </span>
                  <span className="font-bold text-[#203528]">
                    {plantRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${plantReviewsCount} مراجعة)`
                      : `(${plantReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              {showUtilitySoldCounter ? (
                <p className="text-sm font-bold text-[#6c8b13]">
                  {prefersArabicCopy
                    ? `${soldCount} عملية بيع خلال آخر 12 ساعة`
                    : `${soldCount} sold in the last 12 hours`}
                </p>
              ) : null}
              <p className="max-w-3xl text-sm leading-7 text-[#56715e] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#e7efe4] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border-y border-[#e7efe4] py-5">
              {commonActionsWithRef}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#56715e]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#203528]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#203528]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'اسأل أو راجع التقييمات' : 'Ask or view reviews'}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {plantDecisionFacts.map((fact) => (
                <div key={fact.label} className="space-y-2 border-b border-[#e7efe4] pb-3 sm:border-b-0 sm:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#99a392]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#203528]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 border-t border-[#e7efe4] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#203528]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#56715e]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#56715e]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#203528]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="border-b border-[#e7efe4] pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-bold text-[#203528]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#56715e]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#56715e]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#e7efe4] pt-5">
                <p className="text-sm font-black text-[#203528]">
                  {prefersArabicCopy ? 'تفاصيل النبات' : 'Plant details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#e7efe4] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#56715e]">{spec.label}</span>
                      <span className="text-sm font-black text-[#203528]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#e7efe4] pt-5">
              <p className="text-sm font-black text-[#203528]">
                {prefersArabicCopy ? 'دفع آمن' : 'Guaranteed safe checkout'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['VISA', 'PayPal', 'Apple Pay', 'COD'].map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center rounded-[0.45rem] border border-[#d8e6d8] bg-white px-3 py-2 text-xs font-black text-[#43604b]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isElessiOrganicBuybox) {
    const organicRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const organicReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const organicStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      utilityDeliveryRange
        ? prefersArabicCopy
          ? `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
          : `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
        : null,
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} طلب مكتمل`
          : `${soldCount} completed orders`
        : null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const organicDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الحجم' : 'Pack',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'أكثر من عبوة متاحة'
              : 'Multiple pack sizes'
            : prefersArabicCopy
              ? 'عبوة جاهزة'
              : 'Ready pack'),
      },
      {
        label: prefersArabicCopy ? 'الطزاجة' : 'Freshness',
        value:
          soldCount > 0
            ? prefersArabicCopy
              ? `تجهيز يومي حسب الطلب`
              : 'Prepared fresh for recurring orders'
            : prefersArabicCopy
              ? 'تجهيز سريع حسب التوفر'
              : 'Quick prep subject to stock',
      },
      {
        label: prefersArabicCopy ? 'التخزين' : 'Storage',
        value:
          specs[0]?.value ||
          (prefersArabicCopy ? 'يحفظ في مكان بارد أو الثلاجة حسب النوع' : 'Store in a cool place or refrigerate by product type'),
      },
    ];

    return (
      <section className="w-full border-y border-[#eadfcd] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#efe4d6] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {organicStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#eadfcd] bg-[#fff9f2] px-3 py-1.5 text-xs font-bold text-[#6c5b49]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {organicRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#6c5b49]">
                  <span className="text-[#d39c4d]">
                    {'★★★★★'.slice(0, Math.round(organicRating))}
                  </span>
                  <span className="font-bold text-[#2d3b27]">
                    {organicRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${organicReviewsCount} مراجعة)`
                      : `(${organicReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              <p className="max-w-3xl text-sm leading-7 text-[#67705e] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#efe4d6] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.6rem] border border-[#eadfcd] bg-[linear-gradient(180deg,#fffdf9,#f8f1e8)] p-4 shadow-[0_24px_64px_-52px_rgba(45,59,39,0.18)] md:p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6546]">
                    {prefersArabicCopy ? 'اختيار الطلب' : 'Order setup'}
                  </p>
                  <p className="text-sm leading-7 text-[#67705e]">
                    {prefersArabicCopy
                      ? 'اختر العبوة أو الصندوق المناسب، ثم أضف المنتج أو راجع الشحن والاستبدال من نفس السطح.'
                      : 'Choose the right pack or crate, then complete the add-to-cart decision from the same surface.'}
                  </p>
                </div>

                {commonActionsWithRef}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {organicDecisionFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="space-y-2 border-b border-[#efe4d6] pb-3 sm:border-b-0 sm:pb-0"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b7d6d]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#2d3b27]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#6c5b49]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#2d3b27]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#2d3b27]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'آراء العملاء' : 'Customer reviews'}</span>
              </button>
            </div>

            <div className="grid gap-5 border-t border-[#efe4d6] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#2d3b27]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#67705e]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#67705e]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#2d3b27]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="border-b border-[#efe4d6] pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="text-sm font-bold text-[#2d3b27]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#67705e]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#67705e]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#efe4d6] pt-5">
                <p className="text-sm font-black text-[#2d3b27]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#efe4d6] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#6c5b49]">{spec.label}</span>
                      <span className="text-sm font-black text-[#2d3b27]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isElessiBikeBuybox) {
    const bikeRating = typeof product.rating === 'number' ? product.rating : 0;
    const bikeReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : parseMaybeNumber(product.reviewCount) ?? 0;
    const bikeStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : prefersArabicCopy
          ? 'جاهز للشحن'
          : 'Ready to ship',
      utilityDeliveryRange || (prefersArabicCopy ? 'شحن خلال 24-48 ساعة' : 'Ships in 24-48 hours'),
      commonVariantSelector ? (prefersArabicCopy ? 'مقاسات متعددة' : 'Multi sizes') : prefersArabicCopy ? 'اختيار سريع' : 'Quick pick',
    ];
    const bikeDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاستعمال' : 'Use case',
        value: product.category?.name || (prefersArabicCopy ? 'دراجات ومعدات' : 'Bikes & gear'),
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value: utilityDeliveryRange || (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
      {
        label: prefersArabicCopy ? 'الخدمة' : 'Support',
        value:
          guaranteeItems[0]?.title?.trim() ||
          (prefersArabicCopy ? 'تركيب وضمان أقرب للشراء' : 'Assembly and warranty support'),
      },
    ];

    return (
      <section className="w-full border-y border-[#e3e7eb] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#e3e7eb] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {bikeStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="border border-[#d9dee4] bg-[#f8fafb] px-3 py-1.5 text-xs font-bold text-[#516170]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {bikeRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#60717f]">
                  <span className="text-[#f4b74a]">
                    {'★★★★★'.slice(0, Math.round(bikeRating))}
                  </span>
                  <span className="font-bold text-[#1d2a33]">
                    {bikeRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${bikeReviewsCount} مراجعة)`
                      : `(${bikeReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              {showUtilitySoldCounter ? (
                <p className="text-sm font-bold text-[#1d2a33]">
                  {prefersArabicCopy
                    ? `${soldCount} طلب مكتمل على هذا الموديل`
                    : `${soldCount} completed orders on this model`}
                </p>
              ) : null}
              <p className="max-w-3xl text-sm leading-7 text-[#60717f] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#e3e7eb] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border-y border-[#e3e7eb] py-5">
              {commonActionsWithRef}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#60717f]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#1d2a33]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#1d2a33]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'راجع التقييمات' : 'View reviews'}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {bikeDecisionFacts.map((fact) => (
                <div key={fact.label} className="space-y-2 border-b border-[#e3e7eb] pb-3 sm:border-b-0 sm:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a97a2]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#1d2a33]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 border-t border-[#e3e7eb] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#1d2a33]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#60717f]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#60717f]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#1d2a33]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="border-b border-[#e3e7eb] pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-bold text-[#1d2a33]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#60717f]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#60717f]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#e3e7eb] pt-5">
                <p className="text-sm font-black text-[#1d2a33]">
                  {prefersArabicCopy ? 'تفاصيل الدراجة' : 'Bike details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#e3e7eb] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#60717f]">{spec.label}</span>
                      <span className="text-sm font-black text-[#1d2a33]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#e3e7eb] pt-5">
              <p className="text-sm font-black text-[#1d2a33]">
                {prefersArabicCopy ? 'دفع آمن' : 'Guaranteed safe checkout'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['VISA', 'PayPal', 'Apple Pay', 'COD'].map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center border border-[#d9dee4] bg-white px-3 py-2 text-xs font-black text-[#516170]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isElessiGiftBuybox || isElessiPetBuybox || isElessiWatchBuybox || isElessiGarageBuybox) {
    const isPetCommerce = isElessiPetBuybox;
    const isWatchCommerce = isElessiWatchBuybox;
    const isGarageCommerce = isElessiGarageBuybox;
    const giftStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      stockStatusLabel,
      selectedOptionSummary,
      ...productTagValues.slice(0, 1),
    ].filter(Boolean) as string[];
    const giftFactCards = (
      commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
          ? specs
          : [
              {
                label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
                value: displayPrice,
              },
              {
                label: prefersArabicCopy ? 'الشحن' : 'Shipping',
                value: prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout',
              },
              {
                label: prefersArabicCopy ? 'التخصيص' : 'Options',
                value:
                  product.productVariants && product.productVariants.length > 0
                    ? prefersArabicCopy
                      ? 'متاح باختيارات متعددة'
                      : 'Multiple variants available'
                    : prefersArabicCopy
                      ? 'جاهز للشراء مباشرة'
                      : 'Ready for direct purchase',
              },
              {
                label: prefersArabicCopy ? 'الدعم' : 'Support',
                value:
                  guaranteeItems[0]?.title?.trim() ||
                  (prefersArabicCopy ? 'دعم واضح بعد الشراء' : 'Clear post-purchase support'),
              },
            ]
    ).slice(0, 4);
    const giftSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: isPetCommerce
                ? prefersArabicCopy
                  ? 'روتين أوضح'
                  : 'Clearer routine'
                : isGarageCommerce
                  ? prefersArabicCopy
                    ? 'توافق أوضح'
                    : 'Clearer fitment'
                : isWatchCommerce
                  ? prefersArabicCopy
                    ? 'مقارنة أسرع'
                    : 'Faster comparison'
                : prefersArabicCopy
                  ? 'تغليف مرتب'
                  : 'Tidy packaging',
              description: prefersArabicCopy
                ? isPetCommerce
                  ? 'الحجم، الوجبة، أو الاستخدام يبقون قريبين من قرار الشراء المتكرر.'
                  : isGarageCommerce
                    ? 'المقاس، التوافق، ونوع الاستخدام يظلون قريبين من قرار الإضافة حتى تقل أخطاء الطلب.'
                  : isWatchCommerce
                    ? 'الحجم، اللمعة، أو النسخة يبقون أمام العميل في مسار أقصر وأوضح.'
                  : 'التغليف والهدية وخيارات التوصيل يبقون قريبين من قرار الشراء.'
                : isPetCommerce
                  ? 'Size, meal, or usage cues stay close to the repeat-purchase decision.'
                  : isGarageCommerce
                    ? 'Fitment, size, and use-case cues stay close to the add-to-cart decision to reduce ordering mistakes.'
                  : isWatchCommerce
                    ? 'Size, finish, or model cues stay visible in a shorter, clearer decision path.'
                  : 'Packaging, gifting, and delivery details stay close to the purchase decision.',
            },
            {
              title: isPetCommerce
                ? prefersArabicCopy
                  ? 'اختيار أسهل'
                  : 'Faster choice'
                : isGarageCommerce
                  ? prefersArabicCopy
                    ? 'قرار أسرع'
                    : 'Faster decision'
                : isWatchCommerce
                  ? prefersArabicCopy
                    ? 'تفاصيل أوضح'
                    : 'Clearer details'
                : prefersArabicCopy
                  ? 'ثقة أوضح'
                  : 'Clearer confidence',
              description: prefersArabicCopy
                ? isPetCommerce
                  ? 'النوع، السعر، والكمية يظهرون معًا داخل صفحة واحدة بدون تشتيت.'
                  : isGarageCommerce
                    ? 'السعر، البديل المناسب، وخدمة ما بعد البيع يظلون ظاهرين داخل صفحة واحدة بدون لف.'
                  : isWatchCommerce
                    ? 'الاسم، السعر، والمقاس أو اللون يظلون معًا داخل صفحة واحدة بدون تشتيت.'
                  : 'المقاس والسعر والمعدن ظاهرون داخل صفحة واحدة بدون تشتيت.'
                : isPetCommerce
                  ? 'Type, price, and pack size stay visible together without extra friction.'
                  : isGarageCommerce
                    ? 'Price, the right alternative, and after-purchase support stay visible in one page without extra loops.'
                  : isWatchCommerce
                    ? 'Name, price, and size or finish stay together in one page without extra friction.'
                  : 'Size, price, and material stay visible together without extra friction.',
            },
            {
              title: prefersArabicCopy ? 'خدمة بعد الشراء' : 'After-purchase support',
              description: prefersArabicCopy
                ? 'الاستبدال والمتابعة يظلان واضحين قبل إغلاق الطلب.'
                : 'Exchange and follow-up support remain clear before checkout closes.',
            },
          ]
    ).slice(0, 3);
    const showStickyMobileAddToCart =
      shouldRenderPrimaryBuyBox && !externalOnlyProduct && !isCartOpen;

    return (
      <>
        <section className="w-full px-1 py-4">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.9rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f9f0e8_100%)] p-5 shadow-[0_30px_80px_-62px_rgba(91,57,40,0.22)]">
              <span className="inline-flex rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#8f5c44]">
                {isPetCommerce
                  ? prefersArabicCopy
                    ? 'روتين الشراء'
                    : 'Routine setup'
                  : isGarageCommerce
                    ? prefersArabicCopy
                      ? 'قرار القطعة'
                      : 'Part setup'
                  : isWatchCommerce
                    ? prefersArabicCopy
                      ? 'قرار الساعة'
                      : 'Watch setup'
                  : prefersArabicCopy
                    ? 'اختيار الهدية'
                    : 'Gift setup'}
              </span>
              <h2 className="mt-4 text-[2rem] font-black leading-[1.02] tracking-tight text-[#2d211e] md:text-[2.35rem]">
                {isPetCommerce
                  ? prefersArabicCopy
                    ? 'اختيارات أقرب لروتين المربي'
                    : 'Choices closer to the pet routine'
                  : isGarageCommerce
                    ? prefersArabicCopy
                      ? 'اعرف التوافق قبل الشراء'
                      : 'Confirm fit before checkout'
                  : isWatchCommerce
                    ? prefersArabicCopy
                      ? 'قرار شراء دافئ ومباشر'
                      : 'A warm, direct watch decision'
                  : prefersArabicCopy
                    ? 'سلة هدية أقرب للحسم'
                    : 'A gift setup closer to checkout'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#6f5a54] md:text-base">
                {shortDescription ||
                  (isPetCommerce
                    ? prefersArabicCopy
                      ? 'الوجبة، الاستخدام، والحجم يبقون أمام المربي داخل مسار أقصر وأوضح حتى يعيد الطلب بسرعة.'
                      : 'Meal type, usage, and pack size stay together in a shorter, clearer repeat-order path.'
                    : isGarageCommerce
                      ? prefersArabicCopy
                        ? 'رقم القطعة، المقاس، ومدى التوافق يظلون أمام العميل في مسار واضح حتى يحسم الطلب بثقة أكبر.'
                        : 'Part number, sizing, and fitment stay visible in a clearer path for more confident ordering.'
                    : isWatchCommerce
                      ? prefersArabicCopy
                        ? 'الاسم، المقاس، والنسخة يظلون أمام العميل في مسار أوضح حتى يحسم المقارنة والشراء بسرعة.'
                        : 'Name, size, and selected finish stay together in a clearer path for faster watch comparison and purchase.'
                    : prefersArabicCopy
                      ? 'القطعة، السعر، وخيارات الهدية يظلون أمام العميل في مسار أقصر وأهدأ حتى يقرر بسرعة.'
                      : 'The piece, price, and gifting options stay together in a calmer, shorter purchase path.')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {giftStatusChips.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-[#ead8ca] bg-white/92 px-3 py-1.5 text-xs font-bold text-[#6b4a3c]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.65rem] border border-[#ead8ca] bg-white/96 p-5 shadow-[0_22px_60px_-48px_rgba(91,57,40,0.16)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44]">
                    {isPetCommerce
                      ? prefersArabicCopy
                        ? 'المنتج المختار'
                        : 'Selected item'
                      : isGarageCommerce
                        ? prefersArabicCopy
                          ? 'القطعة المختارة'
                          : 'Selected part'
                      : isWatchCommerce
                        ? prefersArabicCopy
                          ? 'الموديل المختار'
                          : 'Selected model'
                      : prefersArabicCopy
                        ? 'القطعة المختارة'
                        : 'Selected piece'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-[#2d211e]">
                    {product.name}
                  </h3>
                </div>
                {selectedOptionSummary ? (
                  <span className="rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-xs font-bold text-[#6b4a3c]">
                    {selectedOptionSummary}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {commonPrice}
                {discountAmount > 0 ? (
                  <p className="text-sm font-bold text-[#8f5c44]">
                    {prefersArabicCopy
                      ? `وفر ${formatStorefrontCurrency(discountAmount, currency)} على سعر القطعة الحالي.`
                      : `Save ${formatStorefrontCurrency(discountAmount, currency)} on the current piece.`}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {giftFactCards.map((fact, index) => (
                  <div
                    key={`${String(fact.label)}-${index}`}
                    className="rounded-[1.1rem] border border-[#ead8ca] bg-[#fffaf6] px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-black leading-6 text-[#2d211e]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {commonVariantSelector ? (
              <div className="rounded-[1.65rem] border border-[#ead8ca] bg-white/96 p-5 shadow-[0_22px_60px_-48px_rgba(91,57,40,0.14)]">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.65rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb,#fff7f0)] p-5 shadow-[0_24px_64px_-50px_rgba(91,57,40,0.18)]">
              <div className="lg:hidden">{compactMobileCommerceActions}</div>
              <div className="hidden lg:block">{commonActionsWithRef}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
                <p className="text-sm font-black text-[#2d211e]">{shippingTitle}</p>
                <p className="mt-2 text-sm leading-7 text-[#6f5a54]">{shippingText}</p>
              </div>
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
                <p className="text-sm font-black text-[#2d211e]">{guaranteesTitle}</p>
                <div className="mt-3 space-y-2">
                  {giftSupportCards.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-[1rem] border border-[#efe0d4] bg-white/88 px-3 py-3"
                    >
                      <p className="text-sm font-bold text-[#2d211e]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-white/96 p-4 shadow-[0_18px_44px_-34px_rgba(91,57,40,0.12)]">
                <p className="text-sm font-black text-[#2d211e]">
                  {isPetCommerce
                    ? prefersArabicCopy
                      ? 'تفاصيل المنتج'
                      : 'Product details'
                    : isGarageCommerce
                      ? prefersArabicCopy
                        ? 'تفاصيل التوافق'
                        : 'Fitment details'
                    : isWatchCommerce
                      ? prefersArabicCopy
                        ? 'تفاصيل الساعة'
                        : 'Watch details'
                    : prefersArabicCopy
                      ? 'تفاصيل القطعة'
                      : 'Piece details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-3 py-3"
                    >
                      <span className="text-sm font-bold text-[#6b4a3c]">{spec.label}</span>
                      <span className="text-sm font-black text-[#2d211e]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {showStickyMobileAddToCart ? (
          <>
            <div className="h-24 lg:hidden" aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] px-3 py-3 shadow-[0_-24px_60px_-40px_rgba(91,57,40,0.32)] backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-md items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                    {prefersArabicCopy ? 'السعر الحالي' : 'Current price'}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#2d211e]">{displayPrice}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 h-12 rounded-xl bg-primary px-4 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground shadow-[0_18px_44px_-26px_hsl(var(--primary)/0.48)] transition-transform hover:opacity-95 active:scale-[0.98]"
                >
                  {addToCartText}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (isAnyElessiBuybox) {
    const elessiIntroBadge = isElessiGiftBuybox
      ? prefersArabicCopy
        ? 'اختيار الهدية'
        : 'Gift setup'
      : isElessiSpecBuybox
        ? prefersArabicCopy
          ? 'قرار المواصفات'
          : 'Spec summary'
        : isElessiCareBuybox
          ? prefersArabicCopy
            ? 'العناية والدعم'
            : 'Care & support'
          : prefersArabicCopy
            ? 'ملخص الشراء'
            : 'Purchase summary';
    const elessiStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      isElessiGiftBuybox
        ? prefersArabicCopy
          ? 'جاهز للإهداء'
          : 'Gift-ready'
        : isElessiSpecBuybox
          ? prefersArabicCopy
            ? 'مواصفات أوضح'
            : 'Spec-led'
          : isElessiCareBuybox
            ? prefersArabicCopy
              ? 'خدمة أقرب'
              : 'Care-led'
            : prefersArabicCopy
              ? 'قرار أسرع'
              : 'Quick decision',
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const elessiSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'شحن واضح' : 'Clear shipping',
              description: prefersArabicCopy
                ? 'رسوم الشحن والتوصيل تظهر بوضوح داخل المسار.'
                : 'Shipping cost and delivery details stay visible in the flow.',
            },
            {
              title: prefersArabicCopy ? 'ثقة أعلى' : 'More confidence',
              description: prefersArabicCopy
                ? 'صور، اختيارات، وسعر أوضح قبل الحسم.'
                : 'Visuals, options, and price remain clearer before checkout.',
            },
            {
              title: prefersArabicCopy ? 'خدمة بعد الشراء' : 'After-purchase support',
              description: prefersArabicCopy
                ? 'سياسة الاستبدال والدعم أقرب لقرار الشراء.'
                : 'Exchange policy and support stay close to the purchase decision.',
            },
          ]
    ).slice(0, 3);
    const shouldUseInlineOrderFormOnly =
      isKhemetInlineQuickOrderBuybox && Boolean(mergedInlinePdpQuickOrder);
    const showStickyMobileAddToCart =
      isElessiCareBuybox &&
      shouldRenderPrimaryBuyBox &&
      !externalOnlyProduct &&
      !isGalleryZoomOpen &&
      !isInlineQuickOrderVisible &&
      !isCartOpen;
    const canOpenMobileVariantSheet =
      showStickyMobileAddToCart && Boolean(product.productVariants?.length);
    const shouldOpenMobileVariantSheetFromSticky =
      shouldProductInfoMobileStickyOpenVariantSheet(
        canOpenMobileVariantSheet,
        Boolean(selectedVariant),
      );
    const elessiSocialProofItems = initialElessiSocialProofItems;
    const activeElessiSocialProof =
      elessiSocialProofItems.length > 0
        ? elessiSocialProofItems[elessiSocialProofStep % elessiSocialProofItems.length]
        : null;
    const mobileBulkDiscountSource =
      selectedVariant && getProductVolumeDiscounts(selectedVariant).length > 0
        ? getProductVolumeDiscounts(selectedVariant)
        : getProductVolumeDiscounts(product);
    const mobileBulkSavingsOffers = (() => {
      const unitPrice =
        typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
          ? selectedVariant.price
          : Number(product.price) || 0;

      if (unitPrice <= 0) {
        return [];
      }

      const breakpointQuantities = Array.from(
        new Set([1, ...mobileBulkDiscountSource.map((discount) => Math.max(1, discount.minQuantity))]),
      )
        .sort((left, right) => left - right)
        .slice(0, 3);

      if (breakpointQuantities.length <= 1) {
        return [];
      }

      const nextBreakpoints = [...breakpointQuantities.slice(1), Number.POSITIVE_INFINITY];

      return breakpointQuantities.map((offerQuantity, index) => {
        const pricing = calculateVolumeDiscountPricing({
          unitPrice,
          quantity: offerQuantity,
          discounts: mobileBulkDiscountSource,
        });
        const nextBreakpoint = nextBreakpoints[index];
        const isSelected =
          quantity >= offerQuantity &&
          (Number.isFinite(nextBreakpoint) ? quantity < nextBreakpoint : true);

        return {
          id: `mobile-bulk-${offerQuantity}`,
          quantity: offerQuantity,
          label:
            offerQuantity === 1
              ? prefersArabicCopy
                ? 'قطعة 1'
                : 'BUY 1'
              : Number.isFinite(nextBreakpoint)
                ? prefersArabicCopy
                  ? `${offerQuantity} قطع`
                  : `BUY ${offerQuantity}`
                : prefersArabicCopy
                  ? `${offerQuantity}+ قطع`
                  : `BUY ${offerQuantity}+`,
          unitPriceText: prefersArabicCopy
            ? `${formatStorefrontCurrency(pricing.effectiveUnitPrice, currency)} للوحدة`
            : `${formatStorefrontCurrency(pricing.effectiveUnitPrice, currency)} each`,
          helperText:
            pricing.totalDiscount > 0
              ? prefersArabicCopy
                ? `وفري ${formatStorefrontCurrency(pricing.totalDiscount, currency)}`
                : `Save ${formatStorefrontCurrency(pricing.totalDiscount, currency)}`
              : undefined,
          isSelected,
        };
      });
    })();
    const mobileVariantSheet = canOpenMobileVariantSheet ? (
      <MobileVariantSheet
        open={isMobileVariantSheetOpen}
        onOpenChange={setIsMobileVariantSheetOpen}
        mode={mobileVariantSheetMode}
        productName={product.name}
        imageUrl={selectedPrimaryImage}
        displayPrice={displayPrice}
        selectedOptionSummary={selectedOptionSummary}
        variants={product.productVariants || []}
        selectedAttributes={selectedAttributes}
        onVariantChange={setSelectedAttributes}
        variantSettings={elessiVariantSettings}
        quantity={quantity}
        onQuantityChange={setQuantity}
        primaryActionText={
          mobileVariantSheetMode === 'checkout' ? buyNowText : addToCartText
        }
        onPrimaryAction={
          mobileVariantSheetMode === 'checkout' ? handleBuyNow : handleAddToCart
        }
        sizeGuideText={sizeGuideText}
        onOpenSizeGuide={canOpenSizeGuide ? () => setIsSizeGuideDialogOpen(true) : undefined}
        availabilityText={stockStatusLabel}
        prefersArabicCopy={prefersArabicCopy}
        bulkSavingsOffers={mobileBulkSavingsOffers}
        onSelectBulkSavingsOffer={setQuantity}
      />
    ) : null;

    const elessiExtendedSupportCards = (
      supportSections.length
        ? supportSections
        : elessiSupportCards.map((item) => ({
            label: '',
            title: item.title,
            description: item.description,
          }))
    ).slice(0, 3);
    const elessiRatingSummary = commonRatingValue ? (
      <button
        type="button"
        onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
        className="inline-flex flex-wrap items-center gap-2 text-sm text-[#6f5a54] transition-colors hover:text-[#2d211e]"
      >
        <span className="text-[#d49011]">★★★★★</span>
        <span className="font-black text-[#2d211e]">{commonRatingValue.toFixed(2)}</span>
        <span>
          {prefersArabicCopy
            ? `(${commonReviewCount} مراجعات)`
            : `(${commonReviewCount} reviews)`}
        </span>
      </button>
    ) : null;
    const elessiBrandSpotlightCard = (() => {
      const spotlightTitle = brandSpotlight?.title || brandName;
      const spotlightHref = brandSpotlight?.href || brandUrl;

      if (!spotlightTitle) {
        return null;
      }

      const spotlightContent = (
        <>
          {brandSpotlight?.image ? (
            <img
              src={brandSpotlight.image}
              alt={spotlightTitle}
              className="h-5 w-5 rounded-full border border-[#ead8ca] object-cover"
            />
          ) : null}
          <span className="text-xs font-black text-[#2d211e]">{spotlightTitle}</span>
        </>
      );

      const className =
        'inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-1.5 transition-colors hover:border-[#d3b8a9]';

      if (spotlightHref) {
        return isExternalHref(spotlightHref) ? (
          <a href={spotlightHref} target="_blank" rel="noreferrer" className={className}>
            {spotlightContent}
          </a>
        ) : (
          <Link to={spotlightHref} reloadDocument className={className}>
            {spotlightContent}
          </Link>
        );
      }

      return <div className={className}>{spotlightContent}</div>;
    })();
    const elessiPrimaryActionsWithRef = shouldUseInlineOrderFormOnly ? null : externalOnlyProduct ? (
      <div
        ref={buyActionsRef}
        id={!hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
        className="flex flex-col gap-3"
      >
        {renderExternalPurchaseCta('card')}
      </div>
    ) : shouldRenderPrimaryBuyBox ? (
      <div
        ref={buyActionsRef}
        id={!hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <QuantitySelector value={quantity} onChange={setQuantity} />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className="h-14 rounded-[0.95rem] bg-primary px-4 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:opacity-95"
            >
              {addToCartText}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="h-14 rounded-[0.95rem] bg-[#78aa00] px-4 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#6e9b00]"
            >
              {buyNowText}
            </button>
          </div>
        </div>
      </div>
    ) : null;
    const elessiPersonalizationPanel =
      personalizationEnabled && personalizationFields.length > 0 ? (
        <details className="group space-y-0 rounded-[0.6rem] border border-[#ead8ca] bg-white/60 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 rounded-full border border-[#ead8ca] bg-white group-open:bg-[#8f5c44] group-open:border-[#8f5c44] transition-colors" />
              <div className="space-y-1">
                <p className="text-sm font-black text-[#2d211e]">{personalizationTitle}</p>
                {personalizationSubtitle ? (
                  <p className="text-sm leading-6 text-[#6f5a54]">{personalizationSubtitle}</p>
                ) : null}
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-[#8f5c44] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </summary>

          <div className="grid gap-3 border-t border-[#efe0d4] p-4 sm:grid-cols-2">
            {personalizationFields.map((field) => (
              <label key={`elessi-personalization-${field.key}`} className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
                  {field.label}
                </span>
                <select
                  value={selectedPersonalizationOptions[field.key] || field.options[0] || ''}
                  onChange={(event) => updatePersonalizationOption(field.key, event.target.value)}
                  className="h-11 rounded-[0.95rem] border border-[#ead8ca] bg-white px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors focus:border-[#8f5c44]"
                >
                  {field.options.map((option) => (
                    <option key={`${field.key}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
                {personalizationTextLabel}
              </span>
              <input
                type="text"
                value={personalizationText}
                onChange={(event) =>
                  setPersonalizationText(event.target.value.slice(0, personalizationMaxLength))
                }
                placeholder={personalizationTextPlaceholder}
                className="h-11 rounded-[0.95rem] border border-[#ead8ca] bg-white px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors placeholder:text-[#9e857a] focus:border-[#8f5c44]"
              />
            </label>
          </div>
        </details>
      ) : null;
    const hasElessiLowerDetails =
      Boolean(safeDescription) ||
      featureHighlights.length > 0 ||
      safeCheckoutItems.length > 0 ||
      elessiExtendedSupportCards.length > 0 ||
      elessiMetadataRows.length > 0;

    return (
      <>
        {sizeGuideDialog}
        {shippingPolicyDialog}
        {questionDialog}
        {mobileVariantSheet}
        <section className="w-full overflow-hidden px-1 py-3 sm:py-4">
          <div className="space-y-4 sm:space-y-5">
            {commonHeader}

            <div className="flex flex-wrap items-center gap-3 border-b border-[#ead8ca] pb-3 sm:pb-4">
              {elessiRatingSummary}
              {elessiBrandSpotlightCard}
            </div>

            <div className="space-y-3 sm:space-y-4 border-b border-[#ead8ca] pb-4 sm:pb-5">
              {commonPrice}
              {!isKhemetInlineQuickOrderBuybox && activeElessiSocialProof ? (
                <StaticMotionDiv
                  key={`${activeElessiSocialProof.key}-${elessiSocialProofStep}-${activeElessiSocialProof.label}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  data-testid="elessi-social-proof-ticker"
                  aria-live="polite"
                  className="flex items-center gap-2 text-sm font-bold text-[#8f5c44]"
                >
                  <StaticMotionSpan
                    aria-hidden="true"
                    animate={
                      activeElessiSocialProof.key === 'sold'
                        ? { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }
                        : { opacity: [0.55, 1, 0.55], y: [0, -1, 0] }
                    }
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className={`inline-flex text-base leading-none ${activeElessiSocialProof.accentClassName}`}
                  >
                    {activeElessiSocialProof.emoji}
                  </StaticMotionSpan>
                  <span>{activeElessiSocialProof.label}</span>
                </StaticMotionDiv>
              ) : null}
              {!isKhemetInlineQuickOrderBuybox ? elessiLowStockNotice : null}
              <p className="text-sm leading-7 text-[#6f5a54]">
                {shortDescription || descriptionPreviewText}
              </p>
              {brandSubtitle ? (
                <p className="text-sm leading-6 text-[#8f5c44]">{brandSubtitle}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setElessiLowerSection('details');
                  queueQuickScroll(STOREFRONT_PRODUCT_DESCRIPTION_ID, 'start');
                }}
                className="inline-flex items-center gap-2 text-sm font-black text-[#8f5c44] transition-colors hover:text-[#2d211e]"
              >
                {readMoreText}
              </button>
              {elessiSaleCountdown && !isKhemetInlineQuickOrderBuybox ? (
                <div className="border-t border-[#efe0d4] pt-3 sm:pt-4">
                  <div className="flex items-center justify-end gap-2 text-[16px] font-black text-[#2d211e]">
                    <StaticMotionSpan
                      animate={{ rotate: [0, -12, 10, 0], scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex text-[#c59a7a]"
                    >
                      <AlarmClock className="h-[15px] w-[15px]" />
                    </StaticMotionSpan>
                    <span>{elessiSaleCountdown.label}</span>
                  </div>
                  <div dir="ltr" className="mt-3 grid grid-cols-4 gap-2.5 sm:gap-3">
                    {elessiSaleCountdown.units.map((unit) => (
                      <StaticMotionDiv
                        key={`${unit.key}-${unit.value}`}
                        initial={{ opacity: 0.7, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="rounded-[1.05rem] border border-[#e7d8cb] bg-[linear-gradient(180deg,#fffdfa_0%,#fcf7f1_100%)] px-2.5 py-3 text-center shadow-[0_1px_0_rgba(45,33,30,0.02)]"
                      >
                        <div className="text-[22px] font-black leading-none tracking-[0.02em] text-[#2d211e] tabular-nums">
                          {unit.value}
                        </div>
                        <div className="mt-2 text-[10px] font-semibold tracking-[0.04em] text-[#967a6c]">
                          {unit.label}
                        </div>
                      </StaticMotionDiv>
                    ))}
                  </div>
                  <p className="sr-only">
                    {prefersArabicCopy
                      ? `العرض الحالي ينتهي في ${elessiSaleCountdown.srDateLabel}`
                      : `Current offer ends on ${elessiSaleCountdown.srDateLabel}`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 border-b border-[#ead8ca] pb-5">
              {elessiVariantSelector ? <div>{elessiVariantSelector}</div> : null}
              {elessiPersonalizationPanel ? (
                <div className={elessiVariantSelector ? 'border-t border-[#efe0d4] pt-3 sm:pt-4' : undefined}>
                  {elessiPersonalizationPanel}
                </div>
              ) : null}
              <div
                className={
                  elessiVariantSelector || elessiPersonalizationPanel
                    ? 'border-t border-[#efe0d4] pt-3 sm:pt-4'
                    : undefined
                }
              >
                {elessiPrimaryActionsWithRef}
                {mergedInlinePdpQuickOrder ? (
                  <div className={shouldUseInlineOrderFormOnly ? "" : "pt-3 sm:pt-4"}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
              </div>
            </div>

            {elessiUtilityRail}
            {inlinePdpQuickOrderBeforeDescription ? (
              <div className="pt-1 sm:pt-2">{inlinePdpQuickOrderBeforeDescription}</div>
            ) : null}
          </div>
        </section>

        {hasElessiLowerDetails ? (
          <section id={elessiLowerPanelsAnchorId} className="w-full px-1 pb-3 sm:pb-4">
            <div className="space-y-4 sm:space-y-5 border-t border-[#ead8ca] pt-4 sm:pt-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setElessiLowerSection('details')}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-black transition-colors ${
                    elessiLowerSection === 'details'
                      ? 'border-[#d3b8a9] bg-[#fff8f2] text-[#2d211e]'
                      : 'border-[#ead8ca] bg-white text-[#6f5a54] hover:border-[#d3b8a9] hover:bg-[#fff8f2] hover:text-[#2d211e]'
                  }`}
                >
                  {descriptionTitle}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                  className="inline-flex items-center justify-center rounded-full border border-[#ead8ca] bg-white px-4 py-2 text-xs font-black text-[#2d211e] transition-colors hover:border-[#d3b8a9] hover:bg-[#fff8f2]"
                >
                  {reviewsTabLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setElessiLowerSection('support')}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-black transition-colors ${
                    elessiLowerSection === 'support'
                      ? 'border-[#d3b8a9] bg-[#fff8f2] text-[#2d211e]'
                      : 'border-[#ead8ca] bg-white text-[#6f5a54] hover:border-[#d3b8a9] hover:bg-[#fff8f2] hover:text-[#2d211e]'
                  }`}
                >
                  {prefersArabicCopy ? 'الضمان والخدمة' : 'Support & warranty'}
                </button>
              </div>

              {elessiLowerSection === 'details' ? (
                <div id={STOREFRONT_PRODUCT_DESCRIPTION_ID} className="space-y-4 border-b border-[#ead8ca] pb-5">
                  <ProductDescription
                    safeDescription={safeDescription}
                    emptyText={descriptionPreviewText}
                  />
                  {featureHighlights.length ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {featureHighlights.slice(0, 3).map((item) => (
                        <div
                          key={item.title}
                          className="space-y-2 border-s-2 border-[#ead8ca] ps-3"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#8f5c44]" />
                            <p className="text-sm font-black text-[#2d211e]">{item.title}</p>
                          </div>
                          <p className="text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {inlinePdpQuickOrderAfterDescription ? (
                    <div>{inlinePdpQuickOrderAfterDescription}</div>
                  ) : null}
                </div>
              ) : null}

              {elessiLowerSection === 'support' && (elessiExtendedSupportCards.length || safeCheckoutItems.length || elessiMetadataRows.length) ? (
                <div id={elessiSupportAnchorId} className="space-y-4">
                  {safeCheckoutItems.length ? (
                    <div className="flex flex-wrap gap-2">
                      {safeCheckoutItems.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-xs font-black text-[#5f473e]"
                        >
                          <BadgeCheck className="h-4 w-4 text-[#8f5c44]" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {elessiExtendedSupportCards.length ? (
                    <div className="grid gap-4 border-b border-[#ead8ca] pb-5 md:grid-cols-3">
                      {elessiExtendedSupportCards.map((item) => (
                        <div
                          key={`${item.title}-${item.label}`}
                          className="space-y-2 border-s-2 border-[#ead8ca] ps-3"
                        >
                          {item.label ? (
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                              {item.label}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#8f5c44]" />
                            <p className="text-sm font-black text-[#2d211e]">{item.title}</p>
                          </div>
                          <p className="text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {elessiMetadataRows.length ? (
                    <div className="space-y-3">
                      <div className="divide-y divide-[#ead8ca] border-y border-[#ead8ca]">
                        {elessiMetadataRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between"
                          >
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8f5c44]">
                              {row.label}
                            </span>
                            <span className="text-sm font-medium text-[#2d211e]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {showStickyMobileAddToCart ? (
          <>
            <div
              className={
                isKhemetLuxeTheme
                  ? "h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden"
                  : "h-28 lg:hidden"
              }
              aria-hidden="true"
            />
            <div
              className={
                isKhemetLuxeTheme
                  ? "fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_46px_-36px_rgba(91,57,40,0.28)] backdrop-blur lg:hidden"
                  : "fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-24px_60px_-40px_rgba(91,57,40,0.32)] backdrop-blur lg:hidden"
              }
            >
              {!isKhemetLuxeTheme ? (
                <div className="mx-auto mb-2 flex max-w-md items-center justify-between gap-3 px-0.5 text-start">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black leading-5 text-[#2d211e]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[#8f5c44]">
                      {displayPrice}
                      {selectedOptionSummary ? ` / ${selectedOptionSummary}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#d8c3b4] bg-white px-2.5 py-1 text-[10px] font-black text-[#5f473e]">
                    {prefersArabicCopy ? '\u062C\u0627\u0647\u0632 \u0644\u0644\u0634\u062D\u0646' : 'Ready'}
                  </span>
                </div>
              ) : null}
              {shouldOpenMobileVariantSheetFromSticky ? (
                <div
                  className={
                    isKhemetLuxeTheme
                      ? "w-full"
                      : "mx-auto max-w-md overflow-hidden rounded-[1.1rem] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.24)]"
                  }
                >
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileVariantSheetMode('cart');
                        setIsMobileVariantSheetOpen(true);
                      }}
                      className={`${isKhemetLuxeTheme ? 'h-14 text-sm tracking-normal' : 'h-12 text-[11px] uppercase tracking-[0.18em]'} bg-primary px-4 font-black text-primary-foreground transition-opacity hover:opacity-95 active:opacity-90`}
                    >
                      {addToCartText}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileVariantSheetMode('checkout');
                        setIsMobileVariantSheetOpen(true);
                      }}
                      className={`${isKhemetLuxeTheme ? 'h-14 text-sm tracking-normal' : 'h-12 text-[11px] uppercase tracking-[0.18em]'} border-s border-white/10 bg-[#78aa00] px-4 font-black text-white transition-colors hover:bg-[#6d9a01]`}
                    >
                      {buyNowText}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    isKhemetLuxeTheme
                      ? "w-full"
                      : "mx-auto max-w-md overflow-hidden rounded-[1.1rem] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.24)]"
                  }
                >
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`${isKhemetLuxeTheme ? 'h-14 tracking-normal' : 'h-12 uppercase tracking-[0.18em]'} bg-primary px-4 text-sm font-black text-primary-foreground transition-opacity hover:opacity-95 active:opacity-90`}
                    >
                      {addToCartText}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className={`${isKhemetLuxeTheme ? 'h-14 tracking-normal' : 'h-12 uppercase tracking-[0.18em]'} border-s border-white/10 bg-[#78aa00] px-4 text-sm font-black text-white transition-colors hover:bg-[#6d9a01]`}
                    >
                      {buyNowText}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (isElessiDigitalBuybox) {
    const digitalFacts = (
      commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
          ? specs
          : [
              {
                label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
                value: displayPrice,
              },
              {
                label: prefersArabicCopy ? 'الضمان' : 'Warranty',
                value: prefersArabicCopy ? 'موضح قبل الطلب' : 'Shown before checkout',
              },
              {
                label: prefersArabicCopy ? 'الشحن' : 'Shipping',
                value: prefersArabicCopy ? '24-48 ساعة' : '24-48 hours',
              },
              {
                label: prefersArabicCopy ? 'الدعم' : 'Support',
                value:
                  guaranteeItems[0]?.title?.trim() ||
                  (prefersArabicCopy ? 'دعم واضح بعد الشراء' : 'Clear post-purchase support'),
              },
            ]
    ).slice(0, 4);
    const digitalSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'شحن سريع' : 'Fast shipping',
              description: prefersArabicCopy
                ? 'خيارات التوصيل والرسوم تظهر بوضوح قبل إغلاق الطلب.'
                : 'Delivery choices and cost stay visible before checkout closes.',
            },
            {
              title: prefersArabicCopy ? 'ضمان موثق' : 'Documented warranty',
              description: prefersArabicCopy
                ? 'مدة الضمان والدعم الفني أقرب لزر الإضافة.'
                : 'Warranty duration and support stay close to the add-to-cart action.',
            },
            {
              title: prefersArabicCopy ? 'اختيار أسهل' : 'Faster selection',
              description: prefersArabicCopy
                ? 'المواصفات والنسخ الأساسية تبقى ظاهرة طوال مسار القرار.'
                : 'Core specs and configurations remain visible throughout the decision flow.',
            },
          ]
    ).slice(0, 3);
    const digitalStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      stockStatusLabel,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden border border-[#e4e9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] shadow-[0_30px_86px_-64px_rgba(15,23,42,0.18)]">
          <div className="hidden">
            <div className="space-y-3">
              <span className="inline-flex border border-[#dce3ec] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#516170]">
                {prefersArabicCopy ? 'اختيار تقني موثوق' : 'Trusted tech pick'}
              </span>
              <h2 className="max-w-[16ch] font-heading text-3xl font-black tracking-tight text-[#161c26] md:text-[2.2rem]">
                {prefersArabicCopy ? 'المواصفات الأقرب للحسم' : 'Specs closest to the decision'}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[#536172] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {digitalStatusChips.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="border border-[#e4e9f0] bg-[#fbfcfe] px-3 py-1.5 text-xs font-bold text-[#516170]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {digitalFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="border border-[#dce3ec] bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.1)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#161c26]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {commonHeader}

            <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                {commonPrice}
                <p className="text-sm leading-7 text-[#536172]">
                  {shortDescription || descriptionPreviewText}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {digitalFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="border border-[#dce3ec] bg-[#fbfcfe] px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#161c26]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            {commonVariantSelector ? (
              <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.08)]">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.14)]">
              {commonActionsWithRef}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-[#e4e9f0] bg-[#fbfcfe] p-4">
                <p className="text-sm font-black text-[#161c26]">{shippingTitle}</p>
                <p className="mt-2 text-sm leading-7 text-[#536172]">{shippingText}</p>
              </div>

              <div className="border border-[#e4e9f0] bg-white p-4">
                <p className="text-sm font-black text-[#161c26]">{guaranteesTitle}</p>
                <p className="mt-1 text-sm leading-6 text-[#607184]">{guaranteesSubtitle}</p>
                <div className="mt-3 space-y-2">
                  {digitalSupportCards.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="border border-[#edf1f6] bg-[#fbfcfe] px-3 py-3">
                      <p className="text-sm font-bold text-[#161c26]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#536172]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border border-[#e4e9f0] bg-[#fbfcfe] p-4">
                <p className="text-sm font-black text-[#161c26]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border border-[#e4e9f0] bg-white px-3 py-3"
                    >
                      <span className="text-sm font-bold text-[#516170]">{spec.label}</span>
                      <span className="text-sm font-black text-[#161c26]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showStickyMobileAddToCart ? (
          <StickyMobileCTA
            activePrice={activePrice}
            currency={currency}
            onAddToCart={handleAddToCart}
            isVisible={showStickyCta}
            label={prefersArabicCopy ? 'ابدئي الطلب' : 'Start checkout'}
          />
        ) : null}
      </section>
    );
  }

  // Early Return for Nova Mobile Premium Variants
  if (variant === 'command-specs') {
    const commandSpecsFacts =
      ((isPcHubCommandSpecs && commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
        ? specs
        : [
            {
              label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
              value: displayPrice,
            },
            {
              label: prefersArabicCopy ? 'الضمان' : 'Warranty',
              value: prefersArabicCopy ? 'موضح قبل الطلب' : 'Shown before checkout',
            },
            {
              label: prefersArabicCopy ? 'الشحن' : 'Shipping',
              value: prefersArabicCopy ? '24-48 ساعة' : '24-48 hours',
            },
            {
              label: prefersArabicCopy ? 'الدعم' : 'Support',
              value: prefersArabicCopy ? 'قبل وبعد الطلب' : 'Before and after purchase',
            },
          ])).slice(0, 4);

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#1f242c]/10 bg-[linear-gradient(180deg,#fffef8,#f4ecd8)] shadow-[0_34px_96px_-70px_rgba(31,36,44,0.28)]">
          <div className="grid gap-4 border-b border-[#1f242c]/10 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-[#1f242c]/10 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#fff1b8]">
                {isPcHubCommandSpecs ? pcHubDecisionBadge : prefersArabicCopy ? 'المواصفات أولًا' : 'Spec-first retail'}
              </span>
              <h2 className="max-w-[16ch] font-heading text-3xl font-black tracking-tight text-[#1f242c] md:text-[2.2rem]">
                {isPcHubCommandSpecs ? pcHubDecisionTitle : prefersArabicCopy ? 'قرار أوضح قبل الحسم' : 'A clearer decision before checkout'}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[#4c5563] md:text-base">
                {isPcHubCommandSpecs
                  ? pcHubDecisionDescription
                  : shortDescription || commandSpecsDescriptionFallback}
              </p>
              {isPcHubCommandSpecs ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pcHubUseCases.slice(0, 3).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full border border-[#1f242c]/10 bg-white/76 px-3 py-1.5 text-xs font-bold text-[#4c5563]"
                    >
                      {prefersArabicCopy
                        ? index === 0
                          ? `مناسب لـ ${tag}`
                          : `يناسب أيضًا ${tag}`
                        : index === 0
                          ? `Best for ${tag}`
                          : `Also fits ${tag}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {commandSpecsFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="rounded-[1.1rem] border border-[#1f242c]/8 bg-white/86 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(31,36,44,0.22)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c818b]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#1f242c]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {isPcHubCommandSpecs && pcHubDecisionProofs.length > 0 ? (
            <div className="grid gap-3 border-b border-[#1f242c]/10 px-5 py-4 md:grid-cols-3">
              {pcHubDecisionProofs.map((proof, index) => (
                <div
                  key={`${proof.label}-${index}`}
                  className="rounded-[1.15rem] border border-[#1f242c]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,230,0.9))] px-4 py-4 shadow-[0_18px_36px_-32px_rgba(31,36,44,0.18)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b58b17]">
                    {proof.label}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-6 text-[#1f242c]">
                    {proof.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6270]">
                    {proof.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="p-2 md:p-3">
              <SpecsGrid
                specs={specs}
                header={commandSpecsHeader}
                price={commandSpecsPrice}
                actions={commonActionsWithRef}
                variantSelector={commonVariantSelector}
                emptyStateText={
                prefersArabicCopy
                  ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
                  : 'No technical specifications available for this model yet.'
              }
            />
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'specs-grid') {
    return (
      <section className="w-full bg-background overflow-hidden py-4 px-1">
        <SpecsGrid
          specs={specs}
          header={commonHeader}
          price={commonPrice}
          actions={commonActionsWithRef}
          variantSelector={commonVariantSelector}
          emptyStateText={
            prefersArabicCopy
              ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
              : 'No technical specifications available for this model yet.'
          }
        />
      </section>
    );
  }

  if (variant === 'bento-specs') {
    return (
      <section className="w-full bg-background overflow-hidden py-4 px-1">
        <BentoSpecs
          specs={specs}
          header={commonHeader}
          price={commonPrice}
          actions={commonActionsWithRef}
          variantSelector={commonVariantSelector}
          emptyStateText={
            prefersArabicCopy
              ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
              : 'Technical bento visualization requires product specification metadata.'
          }
        />
      </section>
    );
  }

  if (variant === 'gear-loadout') {
    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="relative isolate overflow-hidden rounded-[2.15rem] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(10,14,29,0.94))] p-5 text-slate-50 shadow-[0_42px_140px_-88px_rgba(34,211,238,0.72)] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_28%)]" />
          <div className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <nav className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              <Link to={homePath} className="transition-colors hover:text-cyan-100">
                {breadcrumbHomeLabel}
              </Link>
              <span>/</span>
              <Link to={shopPath} className="transition-colors hover:text-cyan-100">
                {breadcrumbShopLabel}
              </Link>
              <span>/</span>
              <span className="max-w-[18rem] truncate text-slate-200">{product.name}</span>
            </nav>

            <div className="flex flex-wrap gap-2">
              {gearStatusChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/85"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                  {gearCategoryLabel}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl md:leading-[0.95]">
                  {product.name}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
                  {gearSummaryText}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-cyan-400/20 bg-white/[0.05] px-5 py-4 shadow-[0_28px_80px_-60px_rgba(34,211,238,0.65)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                  {prefersArabicCopy ? 'السعر الحالي' : 'Live Price'}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <span className="text-4xl font-black text-white">{displayPrice}</span>
                  {originalPrice ? (
                    <span className="text-base font-semibold text-slate-400 line-through">
                      {originalPrice}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200/80">
                  {discount && discount > 0
                    ? prefersArabicCopy
                      ? `وفر ${discount}%`
                      : `Save ${discount}%`
                    : prefersArabicCopy
                      ? 'الشحن واضح عند الدفع'
                      : 'Shipping stays visible at checkout'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {gearQuickFacts.map((fact) => (
                <div
                  key={`${fact.label}:${fact.value}`}
                  className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.95)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/65">
                    {fact.label}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_90px_-70px_rgba(15,23,42,0.88)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                      {prefersArabicCopy ? 'اختيار الجير' : 'Gear Setup'}
                    </p>
                    <p className="text-sm leading-6 text-slate-300/80">
                      {prefersArabicCopy
                        ? 'ابدأ من النسخة المناسبة ثم أغلق الطلب أو أضف الإكسسوارات في نفس المسار.'
                        : 'Configure the main item first, then complete the order or add matching accessories in the same flow.'}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200/75">
                    {product.productVariants && product.productVariants.length > 0
                      ? prefersArabicCopy
                        ? `${product.productVariants.length} خيارات`
                        : `${product.productVariants.length} options`
                      : prefersArabicCopy
                        ? 'قطعة واحدة'
                        : 'Single setup'}
                  </span>
                </div>

                <div className="mt-5">
                  {gearVariantSelector ? (
                    gearVariantSelector
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-white/12 bg-black/20 p-4 text-sm leading-7 text-slate-300/78">
                      {prefersArabicCopy
                        ? 'هذا المنتج جاهز للإضافة المباشرة بدون إعدادات إضافية. لو تريد مقارنة بدائل قريبة ستجدها أسفل الصفحة.'
                        : 'This product is ready for direct checkout without extra configuration. Close alternatives are available lower on the page.'}
                    </div>
                  )}
                </div>
              </div>

              <div ref={buyActionsRef} className="space-y-4">
                {gearMobileQuickNav}

                <div className="rounded-[1.7rem] border border-cyan-400/18 bg-white/[0.05] p-5 shadow-[0_32px_90px_-68px_rgba(34,211,238,0.5)]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                      {prefersArabicCopy ? 'قفل الطلب' : 'Lock The Order'}
                    </p>
                    <p className="text-sm leading-6 text-slate-300/80">
                      {prefersArabicCopy
                        ? 'خذ قرار الشراء من نفس اللوحة مع كمية واضحة ورسائل دعم قبل ما تغلق السلة.'
                        : 'Complete the purchase from the same panel with clear quantity and support cues before checkout.'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {externalOnlyProduct ? (
                      renderExternalPurchaseCta('card')
                    ) : shouldRenderPrimaryBuyBox ? (
                      <>
                        <div
                          id={hasEmbeddedPdpCheckout ? undefined : STOREFRONT_BUYBOX_ID}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <QuantitySelector value={quantity} onChange={setQuantity} />
                            <button
                              type="button"
                              onClick={handleAddToCart}
                              className="h-14 flex-1 rounded-[1.2rem] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(6,182,212,0.95),rgba(59,130,246,0.95))] px-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_70px_-34px_rgba(34,211,238,0.55)] transition-all hover:brightness-105 active:scale-[0.98]"
                            >
                              {addToCartText}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleBuyNow}
                            className="h-12 rounded-[1rem] border border-white/12 bg-black/28 text-sm font-black uppercase tracking-[0.18em] text-slate-100 transition-colors hover:border-cyan-300/35 hover:text-cyan-100"
                          >
                            {buyNowText}
                          </button>
                        </div>
                        {showExternalAffiliateCta ? (
                          <div className="pt-1">{renderExternalPurchaseCta('inline')}</div>
                        ) : null}
                      </>
                    ) : showExternalAffiliateCta ? (
                      renderExternalPurchaseCta('block')
                    ) : null}

                    {fallbackPdpQuickOrderInBuyFlow}
                  </div>

                  {gearShareActions}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <div
                id={STOREFRONT_PRODUCT_DESCRIPTION_ID}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)] md:p-6"
              >
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                    {descriptionTitle}
                  </p>
                  <p className="text-sm leading-6 text-slate-300/78">
                    {prefersArabicCopy
                      ? 'رسالة أوضح عن الاستخدام والميزة الأساسية حتى لا تعتمد الصفحة على الصور وحدها.'
                      : 'A clearer usage and value story so the page does not rely on imagery alone.'}
                  </p>
                </div>

                {inlinePdpQuickOrderBeforeDescription ? (
                  <div className="mt-5">{inlinePdpQuickOrderBeforeDescription}</div>
                ) : null}

                <div className="mt-5">
                  {safeDescription ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-100 prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-cyan-200"
                      dangerouslySetInnerHTML={{ __html: safeDescription }}
                    />
                  ) : (
                    <p className="text-sm leading-8 text-slate-300/82">
                      {prefersArabicCopy
                        ? 'لا يوجد وصف تفصيلي لهذا المنتج بعد، لكن الصفحة الحالية أبقت المواصفات والشراء والثقة في مسار واحد أوضح.'
                        : 'Detailed copy is not available for this product yet, but the page now keeps specifications, purchase actions, and trust cues in one clearer flow.'}
                    </p>
                  )}
                </div>

                {inlinePdpQuickOrderAfterDescription ? (
                  <div className="mt-5">{inlinePdpQuickOrderAfterDescription}</div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                    {shippingTitle}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-300/82">
                    {shippingText}
                  </p>

                  <div className="mt-5 grid gap-3">
                    {gearSupportItems.map((item, index) => (
                      <div
                        key={`${item.title || 'support'}-${index}`}
                        className="rounded-[1.2rem] border border-white/10 bg-black/22 px-4 py-3"
                      >
                        <p className="text-sm font-black text-white">
                          {item.title || (prefersArabicCopy ? 'ميزة إضافية' : 'Support signal')}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300/78">
                          {item.description ||
                            (prefersArabicCopy
                              ? 'رسالة ثقة إضافية تساعدك تحسم قبل إغلاق الطلب.'
                              : 'An extra reassurance message that helps close the purchase faster.')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)]">
                  <ConfigurableTrustBadges
                    title={guaranteesTitle}
                    subtitle={guaranteesSubtitle}
                    items={guaranteeItems.length ? guaranteeItems : undefined}
                    variant={guaranteeStyle === 'grid' ? 'minimal' : guaranteeStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Theme Specific Overrides
  if (isButcherAtelier) {
    const butcherBadge = prefersArabicCopy ? 'درجة فاخرة • طازج يومياً' : 'PRIME GRADE • DAILY FRESH';
    const pricePerKgLabel = prefersArabicCopy ? 'السعر للكيلو' : 'Price per KG';
    const weightSelectorLabel = prefersArabicCopy ? 'اختر الوزن المطلوب' : 'Select Weight';
    const prepRoomLabel = prefersArabicCopy ? 'تجهيز غرفة التقطيع' : 'Prep Room Configuration';
    const butcherBuyCta = prefersArabicCopy ? 'تجهيز الطلب الآن' : 'Prepare My Order';
    
    return (
      <section className="w-full bg-[#f9f5f2] scroll-mt-20 selection:bg-[#3f0c0d] selection:text-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#3f0c0d]/40">
            <Link to={homePath} className="transition-colors hover:text-[#3f0c0d]">{breadcrumbHomeLabel}</Link>
            <span className="h-1 w-1 rounded-full bg-[#c5a059]" />
            <Link to={shopPath} className="transition-colors hover:text-[#3f0c0d]">{breadcrumbShopLabel}</Link>
            <span className="h-1 w-1 rounded-full bg-[#c5a059]" />
            <span className="text-[#3f0c0d]">{product.name}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left Column: Visuals & Experience */}
            <div className="space-y-10">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-2 shadow-[0_40px_100px_-40px_rgba(63,12,13,0.15)]">
                 <div className="absolute left-8 top-8 z-10">
                    <span className="rounded-full bg-[#3f0c0d] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] shadow-2xl">
                      {butcherBadge}
                    </span>
                 </div>
                 <div className="aspect-[4/5] overflow-hidden rounded-[2rem]">
                    <img 
                      src={selectedPrimaryImage || '/placeholder-meat.jpg'} 
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
                    />
                 </div>
              </div>

              {/* Artisan Notes */}
              <div className="rounded-[2.5rem] border border-[#efe1da] bg-white/50 p-8 backdrop-blur-sm">
                <h3 className="mb-6 text-xl font-black italic text-[#3f0c0d]">{prefersArabicCopy ? 'ملاحظات الجزار' : 'Master Butcher Notes'}</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { label: prefersArabicCopy ? 'التعتيق' : 'Aging', value: prefersArabicCopy ? '21 يوم' : '21 Days Dry-Aged' },
                    { label: prefersArabicCopy ? 'المصدر' : 'Source', value: prefersArabicCopy ? 'مزارعنا الخاصة' : 'Local Premium Farm' },
                    { label: prefersArabicCopy ? 'الرخامية' : 'Marbling', value: 'Grade A+' },
                    { label: prefersArabicCopy ? 'القطع' : 'Cut', value: product.category?.name || 'Prime' },
                  ].map((note) => (
                    <div key={note.label} className="border-s-2 border-[#c5a059] ps-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#3f0c0d]/50">{note.label}</p>
                      <p className="mt-1 text-sm font-bold text-[#3f0c0d]">{note.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Atelier Flow */}
            <div className="flex flex-col justify-center space-y-8 lg:ps-8">
              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-black tracking-tight text-[#3f0c0d] md:text-6xl">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-[#3f0c0d]">{displayPrice}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">{pricePerKgLabel}</span>
                  </div>
                  {originalPrice && (
                    <span className="text-xl text-[#3f0c0d]/30 line-through">{originalPrice}</span>
                  )}
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-[#3f0c0d]/70">
                <ProductDescription safeDescription={safeDescription} emptyText={descriptionPreviewText} />
              </div>

              {/* Weight Atelier */}
              <div className="space-y-6 rounded-[2.5rem] bg-[#3f0c0d] p-8 text-white shadow-2xl">
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c5a059]">{weightSelectorLabel}</p>
                  <div className="flex flex-wrap gap-3">
                    {[0.5, 1, 1.5, 2, 5].map((w) => (
                      <button
                        key={w}
                        onClick={() => setButcherWeight(w)}
                        className={`group relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all ${
                          butcherWeight === w 
                            ? 'border-[#c5a059] bg-[#c5a059] text-[#3f0c0d]' 
                            : 'border-white/10 bg-white/5 hover:border-[#c5a059]/50'
                        }`}
                      >
                        <span className="text-lg font-black">{w}</span>
                        <span className="absolute bottom-1 text-[8px] font-black uppercase">{prefersArabicCopy ? 'كجم' : 'KG'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c5a059]">{prepRoomLabel}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { key: 'cut', options: prefersArabicCopy ? ['مكعبات', 'شرائح', 'قطعة كاملة'] : ['Cubes', 'Steaks', 'Whole'] },
                      { key: 'trim', options: prefersArabicCopy ? ['وسط', 'بدون دهن', 'دسم'] : ['Regular', 'Trimmed', 'Fat-on'] }
                    ].map((pref) => (
                      <select
                        key={pref.key}
                        value={butcherPrep[pref.key]}
                        onChange={(e) => setButcherPrep(prev => ({ ...prev, [pref.key]: e.target.value }))}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white outline-none focus:border-[#c5a059]"
                      >
                        {pref.options.map(o => <option key={o} value={o} className="bg-[#3f0c0d]">{o}</option>)}
                      </select>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold opacity-60">{prefersArabicCopy ? 'إجمالي الوزن:' : 'Total Weight:'}</span>
                    <span className="text-xl font-black text-[#c5a059]">{butcherWeight} {prefersArabicCopy ? 'كجم' : 'KG'}</span>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="group relative h-16 w-full overflow-hidden rounded-2xl bg-[#c5a059] text-lg font-black uppercase tracking-widest text-[#3f0c0d] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span className="relative z-10">{butcherBuyCta}</span>
                    <div className="absolute inset-0 -translate-x-full bg-white/20 transition-transform group-hover:translate-x-0" />
                  </button>
                </div>
              </div>

              {/* Trust & Cold Chain */}
              <div className="flex items-center gap-6 rounded-[2rem] border border-[#efe1da] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c5a059]/10 text-[#c5a059]">
                   <Truck size={24} />
                </div>
                <div>
                   <p className="text-sm font-black text-[#3f0c0d]">{prefersArabicCopy ? 'توصيل مبرد مضمون' : 'Cold-Chain Delivery'}</p>
                   <p className="text-xs text-[#3f0c0d]/60">{prefersArabicCopy ? 'يصلك طازجاً في حافظات حرارية' : 'Arrives fresh in thermal artisan packaging'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isZenOrganic) {
    return (
      <section className="w-full bg-background scroll-mt-20">
        <div className="space-y-6">
          <nav className="flex w-fit items-center gap-2 rounded-full border border-[#d9e1d2] bg-white/88 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f7d66] shadow-sm">
            <Link to={homePath} className="transition-colors hover:text-[#1a3328]">
              {breadcrumbHomeLabel}
            </Link>
            <span>/</span>
            <Link to={shopPath} className="transition-colors hover:text-[#1a3328]">
              {breadcrumbShopLabel}
            </Link>
            <span>/</span>
            <span className="max-w-[18rem] truncate text-[#1a3328]">{product.name}</span>
          </nav>

          <div className="rounded-[2rem] border border-[#dbe3d3] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,243,238,0.94))] p-5 shadow-[0_30px_90px_-62px_rgba(26,51,40,0.3)] md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#d5ddca] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#688059] shadow-sm">
                {zenCategoryLabel}
              </span>
              {discount ? (
                <span className="inline-flex rounded-full bg-[#88a876] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                  وفر {discount}%
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-[#f1f3ee] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#688059]">
                  اختيار يومي هادئ
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <h1 className="font-heading text-3xl font-black leading-tight text-[#1a3328] md:text-4xl">
                {product.name}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#4f5f4c] md:text-lg">
                {shortDescription || 'سيظهر وصف هذا المنتج هنا بمجرد إضافة محتوى أوضح من لوحة الإدارة.'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-3xl font-black text-[#1a3328]">{displayPrice}</p>
                {originalPrice ? (
                  <p className="text-sm text-[#708269] line-through decoration-[#aab6a4]">
                    {originalPrice}
                  </p>
                ) : null}
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-3">
                {zenQuickFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-[1.35rem] border border-[#dde5d7] bg-white/90 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a9684]">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#1a3328]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sizeGuideHref || fitNote ? (
            <div className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/86 p-5 shadow-[0_22px_60px_-54px_rgba(26,51,40,0.32)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-black text-[#1a3328]">
                    دليل الأحجام والاختيار
                  </p>
                  <p className="text-sm leading-7 text-[#5a6956]">
                    {fitNote || 'راجع الأحجام أو الأبعاد أو سعة المنتج قبل الإضافة للسلة للحصول على اختيار أنسب.'}
                  </p>
                </div>

                {sizeGuideHref ? (
                  isExternalHref(sizeGuideHref) ? (
                    <a
                      href={sizeGuideHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#cfd8c7] bg-[#f6f7f2] px-5 py-2.5 text-sm font-black text-[#1a3328] transition-all hover:-translate-y-0.5 hover:border-[#88a876] hover:text-[#688059]"
                    >
                      {sizeGuideText || 'دليل الأحجام'}
                    </a>
                  ) : (
                    <Link
                      to={sizeGuideHref}
                      className="inline-flex items-center justify-center rounded-full border border-[#cfd8c7] bg-[#f6f7f2] px-5 py-2.5 text-sm font-black text-[#1a3328] transition-all hover:-translate-y-0.5 hover:border-[#88a876] hover:text-[#688059]"
                    >
                      {sizeGuideText || 'دليل الأحجام'}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          ) : null}

          {product.productVariants && product.productVariants.length > 0 && (
            <div
              id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
              className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/90 p-5 shadow-[0_20px_56px_-52px_rgba(26,51,40,0.28)]"
            >
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                الخيارات المتاحة
              </p>
              <VariantSelector
                variants={product.productVariants}
                selectedAttributes={selectedAttributes}
                onChange={setSelectedAttributes}
                variantSettings={variantSettings}
              />
            </div>
          )}

          {externalOnlyProduct ? (
            <div id={STOREFRONT_BUYBOX_ID} className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/92 p-5 shadow-[0_22px_60px_-52px_rgba(26,51,40,0.28)]">
              {renderExternalPurchaseCta('card')}
            </div>
          ) : shouldRenderPrimaryBuyBox ? (
            <div className="space-y-3">
              <div
                id={STOREFRONT_BUYBOX_ID}
                className="flex flex-col gap-4 rounded-[1.75rem] border border-[#dbe3d3] bg-white/92 p-4 shadow-[0_22px_60px_-52px_rgba(26,51,40,0.28)] sm:flex-row sm:items-center"
              >
                <QuantitySelector value={quantity} onChange={setQuantity} />
                <Button
                  size="lg"
                  fullWidth
                  onClick={handleAddToCart}
                  className="h-12 rounded-full border-none bg-[linear-gradient(135deg,#1a3328_0%,#476343_100%)] text-base font-black text-white shadow-[0_20px_50px_-24px_rgba(26,51,40,0.55)] transition-all hover:opacity-95"
                >
                  {addToCartText}
                </Button>
              </div>
              {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
            </div>
          ) : showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}

          <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-white/90 p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.24)] md:p-6">
              {inlinePdpQuickOrderBeforeDescription ? (
                <div className="mb-6">
                  {inlinePdpQuickOrderBeforeDescription}
                </div>
              ) : null}
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                    {descriptionTitle}
                  </p>
                  <div className="mt-4">
                    {safeDescription ? (
                      <ProductDescription
                        safeDescription={safeDescription}
                        emptyText={
                          prefersArabicCopy
                            ? 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'
                            : 'No description is available for this product yet.'
                        }
                      />
                    ) : (
                      <p className="max-w-2xl text-base leading-8 text-[#4f5f4c]">
                        لا يوجد وصف مفصل لهذا المنتج بعد. أضف وصفًا أوضح من لوحة الإدارة ليظهر هنا بشكل احترافي.
                      </p>
                    )}
                  </div>
                </div>
                {inlinePdpQuickOrderAfterDescription ? (
                  <div>
                    {inlinePdpQuickOrderAfterDescription}
                  </div>
                ) : null}

                <div className="border-t border-[#e4eadf] pt-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                    {shippingTitle}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-8 text-[#4f5f4c]">
                    {shippingText}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-[linear-gradient(180deg,rgba(246,247,242,0.96),rgba(255,255,255,0.96))] p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.22)]">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                  ملاحظات سريعة
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    'اختيار المقاس أو الوعاء المناسب يقلل الحاجة للاستبدال بعد الشراء.',
                    'الشحن يحسب حسب المحافظة داخل صفحة الدفع ليبقى السعر النهائي واضحًا.',
                    'عند التردد بين خيارين، ابدأ بما يناسب المساحة الفعلية لا الصورة فقط.',
                  ].map((note) => (
                    <div
                      key={note}
                      className="rounded-[1.2rem] border border-[#e2e9dd] bg-white/90 px-4 py-3 text-sm leading-7 text-[#3f4f3d]"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-white/92 p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.22)]">
                <ConfigurableTrustBadges
                  title={guaranteesTitle}
                  subtitle={guaranteesSubtitle}
                  items={guaranteeItems.length ? guaranteeItems : undefined}
                  variant={guaranteeStyle}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'playful-story') {
    return (
      <section className="w-full py-4 px-1">
        <PlayfulStory
          header={
            <div className="space-y-2">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {product.category?.name || 'Playtime'}
              </span>
              <h1 className="font-heading text-3xl font-black tracking-tight text-foreground md:text-5xl">
                {product.name}
              </h1>
            </div>
          }
          price={
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-primary">{displayPrice}</span>
              {originalPrice && (
                <span className="text-xl font-bold text-muted-foreground line-through opacity-40">
                  {originalPrice}
                </span>
              )}
            </div>
          }
          variants={commonVariantSelector}
          description={
            <div className="space-y-6">
              {inlinePdpQuickOrderBeforeDescription}
              <div className="prose prose-sm dark:prose-invert">
              <ProductDescription
                safeDescription={safeDescription}
                emptyText={
                  prefersArabicCopy
                    ? 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'
                    : 'No description is available for this product yet.'
                }
              />
              </div>
              {inlinePdpQuickOrderAfterDescription}
            </div>
          }
          actions={commonActions}
        />
      </section>
    );
  }

  if (isIntruderNft) {
    return (
      <section className="w-full bg-background font-sans">
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            <Link to={homePath} className="hover:text-white transition-colors opacity-60">Home</Link>
            <span className="opacity-30">/</span>
            <Link to={shopPath} className="hover:text-white transition-colors opacity-60">Market</Link>
            <span className="opacity-30">/</span>
            <span className="text-white">NFT Details</span>
          </div>
          <div className="space-y-2">
             <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Verified Collection
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
               {product.name}
             </h1>
             <div className="flex gap-2">
                <span className="text-sm font-bold text-primary">@{product.category?.name || "Artist"}</span>
                <span className="text-sm font-bold text-muted-foreground opacity-50">|</span>
                <span className="text-sm font-bold text-muted-foreground">Series #84/100</span>
             </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] group-hover:bg-primary/30 transition-all duration-700" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
                <div className="space-y-4">
                   <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-60">Current Offering</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border border-primary/30">Ξ</div>
                         <div className="flex flex-col">
                            <span className="text-3xl font-black text-white leading-tight">{(product.price / 5000).toFixed(2)} ETH</span>
                            <span className="text-sm font-bold text-muted-foreground">({displayPrice})</span>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   {commonVariantSelector}
                   <div className="flex items-center gap-3">
                      <button
                         onClick={handleAddToCart}
                         className="flex-1 bg-primary text-primary-foreground h-14 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] active:scale-[0.98]"
                      >
                         Place Bid Now
                      </button>
                      <button className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group/heart">
                         <Heart size={20} className="group-hover/heart:fill-primary group-hover/heart:text-primary" />
                      </button>
                   </div>
                </div>
             </div>
          </div>
          <div className="space-y-4 pt-4">
             <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Description</h3>
                <Share2 size={18} className="text-muted-foreground cursor-pointer hover:text-white" />
             </div>
             <p className="text-sm leading-relaxed text-muted-foreground/80 max-w-2xl font-medium">
                {product.description?.replace(/<[^>]+>/g, '') || "Futuristic aesthetic digital asset."}
             </p>
          </div>
        </div>
      </section>
    );
  }

  // Standard Storefront Return
  return (
    <section className="w-full bg-background scroll-mt-20">
      <div className="space-y-6">
        <nav className={`hidden items-center gap-2 sm:flex ${breadcrumbClassName}`}>
          <Link to={homePath} className="hover:text-primary transition-colors">{breadcrumbHomeLabel}</Link>
          <span>/</span>
          <Link to={shopPath} className="hover:text-primary transition-colors">{breadcrumbShopLabel}</Link>
          <span>/</span>
          <span className="text-foreground truncate font-medium">{product.name}</span>
        </nav>

        <div className={titleBlockClassName}>
          {isBiteRush ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[#111111] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-sm">
                {product.category?.name || 'اختيار اليوم'}
              </span>
              <span className="inline-flex rounded-full border border-[#fecda5] bg-[#fff1e4] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#b45309]">
                مطبخ سريع
              </span>
            </div>
          ) : isAirlume ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-primary/12 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary shadow-sm">
                {product.category?.name || 'Airlume Select'}
              </span>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                جاهز للشحن
              </span>
            </div>
          ) : isCutlineClub ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#2d3329] bg-[#111510] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#d9eb67] shadow-sm">
                {product.category?.name || (prefersArabicCopy ? 'ريل الليلة' : 'Night rail')}
              </span>
              <span className="inline-flex rounded-full border border-[#cbbf9b] bg-white/72 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#5d543f]">
                {prefersArabicCopy ? 'ملف الشراء' : 'Purchase file'}
              </span>
            </div>
          ) : isPerfumeScentBrief ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#e7d6cb] bg-white px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#5b3940] shadow-sm">
                {product.category?.name || (prefersArabicCopy ? 'عطر مختار' : 'Selected scent')}
              </span>
              <span className="inline-flex rounded-full border border-[#f0e0d1] bg-[#fff8f2] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#8b623e]">
                {prefersArabicCopy ? 'صور حقيقية' : 'Real photos'}
              </span>
            </div>
          ) : isVelaFashionDirectBuybox ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#efd9df] bg-white px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#8f5f6b] shadow-sm">
                {product.category?.name || (prefersArabicCopy ? 'اختيار فيلا' : 'Vela pick')}
              </span>
              <span className="inline-flex rounded-full border border-[#f4dfd4] bg-[#fff7f3] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#c07a55]">
                {prefersArabicCopy ? 'صور حقيقية' : 'Real photos'}
              </span>
            </div>
          ) : isStyleStoreUtilityRail ? (
            <div className="flex flex-wrap items-center gap-2">
              {typeof product.rating === 'number' ? (
                <span className="inline-flex rounded-full border border-[#111111]/16 bg-white px-3 py-1 text-[11px] font-black text-[#111111]">
                  {prefersArabicCopy
                    ? `★ ${product.rating.toFixed(1)} من ${product.reviewCount || 0} تقييم`
                    : `★ ${product.rating.toFixed(1)} from ${product.reviewCount || 0} reviews`}
                </span>
              ) : null}
            </div>
          ) : isWomenProductInfoVariant ? null : null}
          <h1
            className={`font-heading text-foreground tracking-tight leading-tight ${
              isBiteRush
                ? 'text-3xl font-black uppercase md:text-5xl md:leading-[0.92]'
                : isPerfumeScentBrief
                  ? 'text-[2.1rem] font-black text-[#332227] md:text-[2.9rem]'
                  : isVelaFashionDirectBuybox
                    ? 'text-[2.05rem] font-black text-[#4f3340] md:text-[2.7rem]'
                  : isStyleStoreUtilityRail
                    ? 'text-[2.1rem] font-black text-[#111111] md:text-[2.75rem]'
                : isWomenProductInfoVariant
                  ? 'text-[2rem] font-black text-[#3f2432] md:text-[2.6rem]'
                  : 'text-2xl md:text-3xl font-bold'
            }`}
          >
            {product.name}
          </h1>
          <div className={`flex flex-wrap items-end gap-3 ${isWomenProductInfoVariant ? 'gap-y-2' : ''}`}>
            <span
              className={`${
                isBiteRush
                  ? 'text-4xl font-black text-[#111111] md:text-5xl'
                  : isPerfumeScentBrief
                    ? 'text-[2.45rem] font-black text-[#332227] md:text-[3.2rem]'
                    : isVelaFashionDirectBuybox
                      ? 'text-[2.45rem] font-black text-[#4f3340] md:text-[3rem]'
                    : isStyleStoreUtilityRail
                      ? 'text-[2.45rem] font-black text-[#111111] md:text-[3rem]'
                  : isWomenProductInfoVariant
                    ? 'text-[2.25rem] font-black text-[#3f2432] md:text-[2.8rem]'
                    : 'text-3xl font-bold text-foreground'
              }`}
            >
              {displayPrice}
            </span>
            {originalPrice && (
              <div className="flex items-center gap-2">
                <span
                  className={`${
                    isBiteRush
                      ? 'text-xl font-black text-[#b45309]/70 line-through decoration-[#f97316]/35'
                      : isPerfumeScentBrief
                        ? 'text-lg font-bold text-[#8a746b] line-through decoration-[#d2bbb0]'
                        : isVelaFashionDirectBuybox
                          ? 'text-lg font-bold text-[#a88e96] line-through decoration-[#d7b4bf]'
                        : isStyleStoreUtilityRail
                          ? 'text-lg font-bold text-[#7c756d] line-through decoration-[#111111]/20'
                        : isWomenProductInfoVariant
                          ? 'text-base font-bold text-[#8d6a66] line-through decoration-[#d7b9bf]'
                        : isCutlineClub
                          ? 'text-xl font-black text-[#645a45]/72 line-through decoration-[#111510]/24'
                          : 'text-lg text-muted-foreground line-through decoration-muted-foreground/40'
                  }`}
                >
                  {originalPrice}
                </span>
                {discount && discount > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isBiteRush
                        ? 'bg-[#ef4444] text-white shadow-[0_12px_30px_-18px_rgba(239,68,68,0.8)]'
                        : isPerfumeScentBrief
                          ? 'bg-[#3d292c] text-white shadow-[0_20px_48px_-32px_rgba(61,41,44,0.34)]'
                          : isVelaFashionDirectBuybox
                            ? 'bg-[#7a5260] text-white shadow-[0_16px_32px_-20px_rgba(122,82,96,0.35)]'
                          : isStyleStoreUtilityRail
                            ? 'bg-[#d9ff59] text-[#111111] shadow-[0_12px_26px_-18px_rgba(217,255,89,0.8)]'
                          : isWomenProductInfoVariant
                            ? 'bg-[#3f2432] text-white shadow-[0_20px_48px_-32px_rgba(63,36,50,0.38)]'
                            : isCutlineClub
                            ? 'bg-[#d9eb67] text-[#111510] shadow-[0_12px_30px_-18px_rgba(217,235,103,0.6)]'
                            : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {isAirlume || prefersArabicCopy ? `وفر ${discount}%` : `SAVE ${discount}%`}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          {isStyleStoreUtilityRail && shortDescription ? (
            <p className="max-w-2xl text-sm leading-7 text-[#5f564d] md:text-[0.98rem]">
              {shortDescription}
            </p>
          ) : isVelaFashionDirectBuybox && shortDescription ? (
            <p className="max-w-2xl text-sm leading-7 text-[#8f6d77] md:text-[0.98rem]">
              {shortDescription}
            </p>
          ) : null}
          {isBiteRush ? (
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#7c2d12]">
              <span className="rounded-full border border-[#f9c49a] bg-white/80 px-3 py-1">جاهز خلال 20 دقيقة</span>
              <span className="rounded-full border border-[#f9c49a] bg-white/80 px-3 py-1">إضافات واضحة قبل الدفع</span>
            </div>
          ) : isStyleStoreUtilityRail ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  hasEmbeddedPdpCheckout
                    ? handleQuickScroll(PDP_CHECKOUT_SECTION_ID, 'start')
                    : handleBuyNow()
                }
                className="inline-flex min-h-[3rem] items-center justify-center rounded-full border-2 border-[#111111] bg-[#111111] px-5 text-sm font-black text-white transition-colors hover:bg-[#2a2a2a] sm:min-w-[11rem]"
              >
                {buyNowText}
              </button>
            </div>
          ) : isVelaFashionDirectBuybox ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  hasEmbeddedPdpCheckout
                    ? handleQuickScroll(PDP_CHECKOUT_SECTION_ID, 'start')
                    : handleBuyNow()
                }
                className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-[#7a5260] bg-[#7a5260] px-5 text-sm font-black text-white transition-colors hover:bg-[#946777] sm:min-w-[11rem]"
              >
                {buyNowText}
              </button>
            </div>
          ) : null}
        </div>

        {isWomenUtilityRail ? (
          <>
            {sizeGuideDialog}
            {shippingInteraction === 'modal' ? shippingPolicyDialog : null}
          </>
        ) : isVelaFashionDirectBuybox ? (
          <>
            {canOpenSizeGuide ? sizeGuideDialog : null}
            {shippingInteraction === 'modal' ? shippingPolicyDialog : null}
          </>
        ) : isStyleStoreUtilityRail ? (
          <>
            {canOpenSizeGuide ? sizeGuideDialog : null}
            {shippingInteraction === 'modal' ? shippingPolicyDialog : null}
          </>
        ) : isPerfumeScentBrief ? (
          <>{shippingInteraction === 'modal' ? shippingPolicyDialog : null}</>
        ) : sizeGuideInteraction === 'modal' ? (
          <>
            {sizeGuideTriggerButton}
            {sizeGuideDialog}
          </>
        ) : sizeGuideHref || fitNote ? (
          <div className={sizeGuideWrapperClassName}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground">اختيار المقاس</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {fitNote || 'راجعي دليل المقاسات السريع قبل الإضافة للسلة لاختيار أفضل مقاس ممكن.'}
                </p>
              </div>
              {sizeGuideHref ? (
                isExternalHref(sizeGuideHref) ? (
                  <a
                    href={sizeGuideHref}
                    target="_blank"
                    rel="noreferrer"
                    className={sizeGuideButtonClassName}
                  >
                    {sizeGuideText || 'دليل المقاسات'}
                  </a>
                ) : (
                  <Link
                    to={sizeGuideHref}
                    className={sizeGuideButtonClassName}
                  >
                    {sizeGuideText || 'دليل المقاسات'}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        ) : null}

        {variant === 'accordion' || isWomenProductInfoVariant || isPerfumeScentBrief || isVelaFashionDirectBuybox ? (
          <>
            {isMenShoesEg ? (
              <div
                id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                className={menShoesDecisionSurfaceClassName}
              >
                {menShoesDecisionMeta}
                {product.productVariants &&
                product.productVariants.length > 0 &&
                !isPrimaryQuantityOffersDecision ? (
                  <div className="space-y-3">
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      variantSettings={variantSettings}
                    />
                  </div>
                ) : null}
                {inlineQuantityOffers ? (
                  <div className={product.productVariants?.length ? 'pt-3' : ''}>
                    {inlineQuantityOffers}
                  </div>
                ) : null}
                {externalOnlyProduct ? (
                  <div className={product.productVariants?.length ? 'mt-4 border-t border-[#e5eadf] pt-4' : ''}>
                    {renderExternalPurchaseCta('card')}
                  </div>
                ) : shouldRenderStandaloneBuyBox ? (
                  <div className={`${product.productVariants?.length ? 'mt-4 border-t border-[#e5eadf] pt-4' : ''} space-y-3`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <QuantitySelector value={quantity} onChange={setQuantity} />
                        <Button
                          size="lg"
                          fullWidth
                          className={addToCartButtonClassName}
                          onClick={handleAddToCart}
                        >
                          {addToCartText}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className={buyNowButtonClassName}
                      >
                        {buyNowText}
                      </button>
                    </div>
                    {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : showExternalAffiliateCta ? (
                  <div className={product.productVariants?.length ? 'mt-4 border-t border-[#e5eadf] pt-4' : ''}>
                    {renderExternalPurchaseCta('inline')}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : mergedInlinePdpQuickOrder ? (
                  <div className={product.productVariants?.length ? 'mt-4 border-t border-[#e5eadf] pt-4' : 'pt-3'}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
              </div>
            ) : isWomenProductInfoVariant ? (
              <div
                id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                className={womenLedgerDecisionSurfaceClassName}
              >
                {womenLedgerDecisionMeta}
                {product.productVariants &&
                product.productVariants.length > 0 &&
                !isPrimaryQuantityOffersDecision ? (
                  <div className="space-y-3">
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      variantSettings={variantSettings}
                    />
                  </div>
                ) : null}
                {inlineQuantityOffers ? (
                  <div className={product.productVariants?.length ? 'pt-3' : ''}>
                    {inlineQuantityOffers}
                  </div>
                ) : null}
                {womenLedgerTrustStrip}
                {externalOnlyProduct ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0d7d2] pt-4' : ''}>
                    {renderExternalPurchaseCta('card')}
                  </div>
                ) : shouldRenderStandaloneBuyBox ? (
                  <div className={`${product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0d7d2] pt-4' : ''} space-y-3`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <QuantitySelector value={quantity} onChange={setQuantity} />
                        <Button
                          size="lg"
                          fullWidth
                          className={addToCartButtonClassName}
                          onClick={handleAddToCart}
                        >
                          {addToCartText}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className={buyNowButtonClassName}
                      >
                        {buyNowText}
                      </button>
                    </div>
                    {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : showExternalAffiliateCta ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0d7d2] pt-4' : ''}>
                    {renderExternalPurchaseCta('inline')}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : mergedInlinePdpQuickOrder ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0d7d2] pt-4' : 'pt-3'}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
              </div>
            ) : isPerfumeScentBrief ? (
              <div
                id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                className={perfumeBriefDecisionSurfaceClassName}
              >
                {perfumeScentBriefMeta}
                {product.productVariants &&
                product.productVariants.length > 0 &&
                !isPrimaryQuantityOffersDecision ? (
                  <div className="space-y-3">
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      density={isStyleStoreUtilityRail ? 'compact' : undefined}
                      layout={isStyleStoreUtilityRail ? 'inline-compact' : undefined}
                      variantSettings={variantSettings}
                    />
                  </div>
                ) : null}
                {inlineQuantityOffers ? (
                  <div className={product.productVariants?.length ? 'pt-3' : ''}>
                    {inlineQuantityOffers}
                  </div>
                ) : null}
                {externalOnlyProduct ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#eadfd7] pt-4' : ''}>
                    {renderExternalPurchaseCta('card')}
                  </div>
                ) : shouldRenderStandaloneBuyBox ? (
                  <div className={`${product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#eadfd7] pt-4' : ''} space-y-3`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <QuantitySelector value={quantity} onChange={setQuantity} />
                        <Button
                          size="lg"
                          fullWidth
                          className={addToCartButtonClassName}
                          onClick={handleAddToCart}
                        >
                          {addToCartText}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className={buyNowButtonClassName}
                      >
                        {buyNowText}
                      </button>
                    </div>
                    {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : showExternalAffiliateCta ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#eadfd7] pt-4' : ''}>
                    {renderExternalPurchaseCta('inline')}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : mergedInlinePdpQuickOrder ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#eadfd7] pt-4' : 'pt-3'}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
              </div>
            ) : isVelaFashionDirectBuybox ? (
              <div
                id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                className={velaFashionDecisionSurfaceClassName}
              >
                {velaFashionDecisionMeta}
                {product.productVariants &&
                product.productVariants.length > 0 &&
                !isPrimaryQuantityOffersDecision ? (
                  <div className="space-y-3">
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      density="compact"
                      layout="inline-compact"
                      variantSettings={variantSettings}
                    />
                  </div>
                ) : null}
                {inlineQuantityOffers ? (
                  <div className={product.productVariants?.length ? 'pt-3' : ''}>
                    {inlineQuantityOffers}
                  </div>
                ) : null}
                {externalOnlyProduct ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0dce1] pt-4' : ''}>
                    {renderExternalPurchaseCta('card')}
                  </div>
                ) : shouldRenderStandaloneBuyBox ? (
                  <div className={`${product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0dce1] pt-4' : ''} space-y-3`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <QuantitySelector value={quantity} onChange={setQuantity} />
                        <Button
                          size="lg"
                          fullWidth
                          className={addToCartButtonClassName}
                          onClick={handleAddToCart}
                        >
                          {addToCartText}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className={buyNowButtonClassName}
                      >
                        {buyNowText}
                      </button>
                    </div>
                    {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : showExternalAffiliateCta ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0dce1] pt-4' : ''}>
                    {renderExternalPurchaseCta('inline')}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-1">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : mergedInlinePdpQuickOrder ? (
                  <div className={product.productVariants?.length || inlineQuantityOffers ? 'mt-4 border-t border-[#f0dce1] pt-4' : 'pt-3'}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {product.productVariants &&
                product.productVariants.length > 0 &&
                !isPrimaryQuantityOffersDecision && (
                  <div
                    id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                    className={isCutlineClub ? cutlineAccordionDecisionPanelClassName : 'py-2'}
                  >
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      variantSettings={variantSettings}
                    />
                  </div>
                )}
                {inlineQuantityOffers ? (
                  <div className={product.productVariants?.length ? 'pt-4' : 'pt-2'}>
                    {inlineQuantityOffers}
                  </div>
                ) : null}
                {externalOnlyProduct ? (
                  <div id={STOREFRONT_BUYBOX_ID} className="pt-4">
                    {renderExternalPurchaseCta('card')}
                  </div>
                ) : shouldRenderStandaloneBuyBox ? (
                  <div className={isCutlineClub ? 'pt-4' : 'pt-4 space-y-3'}>
                    <div
                      id={STOREFRONT_BUYBOX_ID}
                      className={isCutlineClub ? `${cutlineAccordionDecisionPanelClassName} flex flex-col gap-4` : 'flex flex-col gap-4'}
                    >
                      <div className="flex items-center gap-4 sm:flex-row">
                        <QuantitySelector value={quantity} onChange={setQuantity} />
                        <Button
                          size="lg"
                          fullWidth
                          className={addToCartButtonClassName}
                          onClick={handleAddToCart}
                        >
                          {addToCartText}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className={buyNowButtonClassName}
                      >
                        {buyNowText}
                      </button>
                    </div>
                    {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
                    {mergedInlinePdpQuickOrder ? (
                      <div className={isCutlineClub ? 'pt-3' : ''}>{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </div>
                ) : showExternalAffiliateCta ? (
                  <>
                    {renderExternalPurchaseCta('inline')}
                    {mergedInlinePdpQuickOrder ? (
                      <div className="pt-4">{mergedInlinePdpQuickOrder}</div>
                    ) : null}
                  </>
                ) : mergedInlinePdpQuickOrder ? (
                  <div className="pt-4">{mergedInlinePdpQuickOrder}</div>
                ) : null}
              </>
            )}
            {isStyleStoreUtilityRail ? (
              <div className="pt-4">
                {styleStoreUtilityRail}
              </div>
            ) : null}
            {inlinePdpQuickOrderBeforeDescription ? (
              <div className="pt-4">
                {inlinePdpQuickOrderBeforeDescription}
              </div>
            ) : null}
            {/* Accordions - always render to preserve hooks order */}
              <div className={accordionWrapperClassName}>
                <Accordion
                  title={descriptionTitle}
                  tone={isCutlineClub ? 'cutline' : 'default'}
                  defaultOpen={!shouldCollapseDescriptionByDefault}
                >
                  {shouldHideDuplicateDescriptionSection ? null : (
                    <ProductDescription
                      safeDescription={safeDescription}
                      emptyText={
                        prefersArabicCopy
                          ? 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'
                          : 'No description is available for this product yet.'
                      }
                    />
                  )}
                </Accordion>
                {isWomenUtilityRail ? (
                  <div className="py-4">
                    {womenUtilityRail}
                  </div>
                ) : isVelaFashionDirectBuybox ? (
                  <div className="py-4">
                    {velaUtilityRail}
                  </div>
                ) : isPerfumeScentBrief ? (
                  <div className="py-4">
                    {perfumeUtilityRail}
                  </div>
                ) : null}
                {inlinePdpQuickOrderAfterDescription ? (
                  <div className="py-4">
                    {inlinePdpQuickOrderAfterDescription}
                  </div>
                ) : null}
                {isWomenUtilityRail || isStyleStoreUtilityRail || isPerfumeScentBrief || isVelaFashionDirectBuybox ? null : shippingInteraction === 'modal' ? (
                  <>
                    {shippingTriggerButton}
                    {shippingPolicyDialog}
                  </>
                ) : (
                  <Accordion title={shippingTitle} tone={isCutlineClub ? 'cutline' : 'default'}>
                    <p className="text-muted-foreground text-sm leading-relaxed">{shippingPolicyBody}</p>
                  </Accordion>
                )}
                {!isWomenUtilityRail &&
                !isStyleStoreUtilityRail &&
                !isPerfumeScentBrief &&
                !isVelaFashionDirectBuybox &&
                shippingInteraction !== 'modal' &&
                showReturnsAccordion ? (
                  <Accordion
                    title={returnsPolicyTitle}
                    tone={isCutlineClub ? 'cutline' : 'default'}
                  >
                    <p className="text-muted-foreground text-sm leading-relaxed">{returnsPolicyBody}</p>
                    {returnsPolicyDetails.length ? (
                      <div className="mt-3 space-y-2">
                        {returnsPolicyDetails.map((item) => (
                          <div
                            key={`legacy-returns-${item.label}`}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3"
                          >
                            <span className="text-xs font-black text-foreground">{item.label}</span>
                            <span className="text-xs leading-6 text-muted-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Accordion>
                ) : null}
                <Accordion title={guaranteesTitle} tone={isCutlineClub ? 'cutline' : 'default'}>
                  {showGuarantees ? (
                    <ConfigurableTrustBadges
                       title=""
                       subtitle={guaranteesSubtitle}
                       items={guaranteeItems.length ? guaranteeItems : undefined}
                       variant={guaranteeStyle}
                    />
                  ) : null}
                </Accordion>
              </div>
          </>
        ) : (
          <>
            {isStyleStoreUtilityRail ? (
              <div className="mt-4 space-y-4">
                {product.productVariants && product.productVariants.length > 0 ? (
                  <div
                    id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                    className="py-2"
                  >
                    <VariantSelector
                      variants={product.productVariants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      density={isStyleStoreUtilityRail ? 'compact' : undefined}
                      layout={isStyleStoreUtilityRail ? 'inline-compact' : undefined}
                      variantSettings={variantSettings}
                    />
                  </div>
                ) : null}
                {styleStoreUtilityRail}
              </div>
            ) : null}
            {inlinePdpQuickOrderBeforeDescription ? (
              <div className="mt-4">
                {inlinePdpQuickOrderBeforeDescription}
              </div>
            ) : null}
            {!shouldHideDuplicateDescriptionSection ? (
              <div className={descriptionSectionClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">{descriptionTitle}</p>
                  <ProductDescription
                  safeDescription={safeDescription}
                  emptyText={
                    prefersArabicCopy
                      ? 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'
                      : 'No description is available for this product yet.'
                  }
                  />
              </div>
            ) : null}
            {inlinePdpQuickOrderAfterDescription ? (
              <div className="mt-4">
                {inlinePdpQuickOrderAfterDescription}
              </div>
            ) : null}
            {product.productVariants && product.productVariants.length > 0 && !isStyleStoreUtilityRail && (
              <div
                id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
                className="py-2 mt-4"
              >
                <VariantSelector
                  variants={product.productVariants}
                  selectedAttributes={selectedAttributes}
                  onChange={setSelectedAttributes}
                  variantSettings={variantSettings}
                />
              </div>
            )}
            {externalOnlyProduct ? (
              <div id={STOREFRONT_BUYBOX_ID} className="pt-4">
                {renderExternalPurchaseCta('card')}
              </div>
            ) : shouldRenderPrimaryBuyBox ? (
              <div className="pt-4 space-y-3">
                <div
                  id={STOREFRONT_BUYBOX_ID}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-4 sm:flex-row">
                    <QuantitySelector value={quantity} onChange={setQuantity} />
                    <Button
                      size="lg"
                      fullWidth
                      className={addToCartButtonClassName}
                      onClick={handleAddToCart}
                    >
                      {addToCartText}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className={buyNowButtonClassName}
                  >
                    {buyNowText}
                  </button>
                </div>
                {showExternalAffiliateCta ? renderExternalPurchaseCta('block') : null}
              </div>
            ) : showExternalAffiliateCta ? renderExternalPurchaseCta('block') : null}
            <div className={trustSectionClassName}>
              <ConfigurableTrustBadges
                title={guaranteesTitle}
                subtitle={guaranteesSubtitle}
                items={guaranteeItems.length ? guaranteeItems : undefined}
                variant={guaranteeStyle}
              />
            </div>
          </>
        )}
      </div>

      {isNovaMobile && !productPageCheckoutEnabled && (
        <StickyMobileCTA
          activePrice={activePrice}
          currency={currency}
          onAddToCart={handleAddToCart}
          isVisible={showStickyCta}
          label={prefersArabicCopy ? 'اشتر الآن' : 'Buy Now'}
        />
      )}
    </section>
  );
};

ProductInfo.displayName = 'ProductInfo';

export default ProductInfo;
