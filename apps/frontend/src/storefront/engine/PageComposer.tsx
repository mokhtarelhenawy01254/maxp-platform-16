import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ComponentRegistry } from './ComponentRegistry';
import {
  StorefrontPageConfig,
  StorefrontPageLayout,
  StorefrontSectionConfig,
} from '../types/theme.types';
import {
  DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  useCartStore,
} from '../store/useCartStore';
import {
  getStorefrontSectionComponentKey,
  STOREFRONT_CONVERSION_SECTION_IDS,
} from '../sections/manifest';
import { buildStorefrontPath } from '../utils/paths';
import { sanitizeStorefrontSectionConfig } from '../utils/runtimeBrandText';

interface PageComposerProps {
  pageConfig: StorefrontPageConfig;
  /** Optional layout hint: some pages use a sidebar grid (e.g., shop, cart, checkout) */
  layout?: StorefrontPageLayout;
  prioritizeSidebarOnMobile?: boolean;
  renderSectionFrame?: (args: RenderSectionFrameArgs) => React.ReactNode;
  runtimeText?: {
    shouldReplaceThemeBrand: boolean;
    replaceThemeBrandText: (value?: string | null) => string;
  };
}

export interface RenderSectionFrameArgs {
  element: React.ReactNode;
  index: number;
  sectionEntry: string | StorefrontSectionConfig;
  sectionId: string;
  componentKey: string;
}

export const getSectionSkeletonClassName = (
  componentKey?: string,
  sectionId?: string,
  sectionEntry?: string | StorefrontSectionConfig,
): string => {
  const key = `${sectionId || ''} ${componentKey || ''}`;
  const sectionSettings =
    typeof sectionEntry !== 'string' && isRecord(sectionEntry?.settings)
      ? sectionEntry.settings
      : null;

  if (key.includes('promo-strip')) {
    return 'min-h-[4rem]';
  }

  if (key.includes('reviews')) {
    return 'min-h-[28rem] md:min-h-[32rem]';
  }

  if (key.includes('hero-banner') || key.includes('hero-sidebar')) {
    if (getSectionVariant(sectionEntry) === 'cinematic-plinth') {
      return 'min-h-[42rem] md:min-h-[52rem]';
    }

    return 'min-h-[30rem] md:min-h-[34rem]';
  }

  if (key.includes('product-gallery')) {
    return 'min-h-[34rem] md:min-h-[41rem]';
  }

  if (key.includes('product-info')) {
    return 'min-h-[82rem] md:min-h-[98rem] lg:min-h-[111rem]';
  }

  if (shouldCollapseSectionSkeleton(componentKey, sectionId, sectionEntry)) {
    return 'min-h-0';
  }

  if (key.includes('product-grid') || key.includes('featured-products')) {
    return 'min-h-[34rem] md:min-h-[38rem]';
  }

  if (key.includes('related-products') || key.includes('bought-together')) {
    return 'min-h-[28rem] md:min-h-[32rem]';
  }

  if (key.includes('order-confirmation')) {
    return 'min-h-[88rem] md:min-h-[72rem]';
  }

  if (key.includes('order-summary')) {
    return 'min-h-[46rem] lg:min-h-[24rem]';
  }

  if (key.includes('newsletter')) {
    return 'min-h-[18rem] md:min-h-[20rem]';
  }

  if (key.includes('filters-sidebar')) {
    return 'min-h-11 lg:min-h-[12rem]';
  }

  if (key.includes('shop-command-bar')) {
    if (sectionSettings?.['simpleToolbar'] === true) {
      return 'min-h-0 lg:min-h-[4rem]';
    }

    return 'min-h-[5rem] md:min-h-[6rem]';
  }

  return 'min-h-[20rem] md:min-h-[24rem]';
};

const SectionSkeleton: React.FC<{
  componentKey?: string;
  sectionId?: string;
  sectionEntry?: string | StorefrontSectionConfig;
}> = ({
  componentKey,
  sectionId,
  sectionEntry,
}) => {
  const key = `${sectionId || ''} ${componentKey || ''}`;
  const sectionSettings =
    typeof sectionEntry !== 'string' && isRecord(sectionEntry?.settings)
      ? sectionEntry.settings
      : null;

  if (shouldCollapseSectionSkeleton(componentKey, sectionId, sectionEntry)) {
    return null;
  }

  if (key.includes('promo-strip')) {
    return (
      <div
        className={`w-full border-y border-border bg-secondary/65 ${getSectionSkeletonClassName(componentKey, sectionId, sectionEntry)}`}
      >
        <div className="container px-4 py-3 md:px-6">
          <div className="flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-3">
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-9 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (key.includes('filters-sidebar')) {
    return (
      <section
        className={`w-full ${getSectionSkeletonClassName(componentKey, sectionId, sectionEntry)}`}
      >
        <div className="h-11 w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-4 hidden space-y-3 lg:block">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
          <div className="h-8 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (key.includes('shop-command-bar') && sectionSettings?.['simpleToolbar'] === true) {
    return (
      <section className="mb-6 hidden border-b border-[#e8ddd2] pb-4 lg:block">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
          <div className="h-11 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </section>
    );
  }

  if (
    (key.includes('hero-banner') || key.includes('hero-sidebar')) &&
    getSectionVariant(sectionEntry) === 'cinematic-plinth'
  ) {
    return (
      <div
        aria-hidden="true"
        className={`relative w-full overflow-hidden bg-[#111715] ${getSectionSkeletonClassName(componentKey, sectionId, sectionEntry)}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,11,0.18)_0%,rgba(9,13,11,0.46)_34%,rgba(9,13,11,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,182,108,0.16),transparent_38%),radial-gradient(circle_at_bottom,rgba(19,57,44,0.55),transparent_48%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(7,9,8,0.72))]" />
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-background py-8 md:py-12 ${getSectionSkeletonClassName(componentKey, sectionId, sectionEntry)}`}
    >
      <div className="space-y-4 w-full max-w-2xl px-8">
        <div className="h-6 bg-muted rounded-[var(--radius)] animate-pulse w-3/4 mx-auto" />
        <div className="h-4 bg-muted rounded-[var(--radius)] animate-pulse w-1/2 mx-auto" />
        <div className="h-32 bg-muted rounded-[var(--radius)] animate-pulse w-full" />
      </div>
    </div>
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getStringSetting = (
  settings: Record<string, unknown> | null,
  key: string,
  fallback: string,
) => {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const getCurrentStorefrontLocation = () => {
  if (typeof window === 'undefined') {
    return { pathname: '', search: '' };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
};

const getPersistedStorefrontCartItemCount = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const storageOptions = useCartStore.persist?.getOptions();
    const storageName =
      typeof storageOptions?.name === 'string'
        ? storageOptions.name
        : DEFAULT_STOREFRONT_CART_STORAGE_NAME;
    const rawCart = window.localStorage.getItem(storageName);
    if (!rawCart) {
      return 0;
    }

    const parsedCart = JSON.parse(rawCart) as {
      state?: { items?: unknown[] };
    };

    return Array.isArray(parsedCart.state?.items)
      ? parsedCart.state.items.length
      : 0;
  } catch {
    return 0;
  }
};

const StableEmptyCheckoutState: React.FC<{
  pageSettings: Record<string, unknown> | null;
}> = ({ pageSettings }) => {
  const { pathname, search } = getCurrentStorefrontLocation();
  const eyebrow = getStringSetting(
    pageSettings,
    'emptyCheckoutEyebrow',
    'Checkout step',
  );
  const title = getStringSetting(
    pageSettings,
    'emptyCheckoutTitle',
    'Your cart is still empty',
  );
  const description = getStringSetting(
    pageSettings,
    'emptyCheckoutDescription',
    'Choose a size and color from the shop, then come back here to confirm the order.',
  );
  const primaryText = getStringSetting(
    pageSettings,
    'emptyCheckoutPrimaryText',
    'Shop shoes',
  );
  const secondaryText = getStringSetting(
    pageSettings,
    'emptyCheckoutSecondaryText',
    'View offers',
  );
  const asideTitle = getStringSetting(
    pageSettings,
    'emptyCheckoutAsideTitle',
    'Before confirmation',
  );
  const supportText = getStringSetting(
    pageSettings,
    'emptyCheckoutSupportText',
    'Size and color stay visible in the cart before order confirmation.',
  );
  const sizeCue = getStringSetting(
    pageSettings,
    'emptyCheckoutSizeCue',
    'Clear size',
  );
  const shippingCue = getStringSetting(
    pageSettings,
    'emptyCheckoutShippingCue',
    'Shipping quote',
  );
  const confirmCue = getStringSetting(
    pageSettings,
    'emptyCheckoutConfirmCue',
    'Fast confirm',
  );
  const primaryHref = buildStorefrontPath(
    pathname,
    getStringSetting(pageSettings, 'emptyCheckoutPrimaryHref', '/shop'),
    search,
  );
  const secondaryHref = buildStorefrontPath(
    pathname,
    getStringSetting(pageSettings, 'emptyCheckoutSecondaryHref', '/sale'),
    search,
  );

  return (
    <section
      className="storefront-page-composer container px-4 py-6 md:px-6 md:py-8 xl:px-4"
      data-testid="checkout-empty-state"
    >
      <div className="grid min-h-[32rem] items-center gap-6 rounded-lg border border-[#e7ddd0] bg-[linear-gradient(180deg,#fffdf8_0%,#f7efe4_100%)] p-5 md:grid-cols-[minmax(0,1fr)_18rem] md:p-8">
        <div className="max-w-2xl space-y-5">
          <span className="inline-flex rounded-full border border-[#dcc79f] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#725523]">
            {eyebrow}
          </span>
          <div className="space-y-3">
            <h1 className="font-heading text-2xl font-bold text-[#111111] md:text-3xl">
              {title}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-[#6f6251] md:text-base">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={primaryHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#173126] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#204637] focus:outline-none focus:ring-2 focus:ring-[#b89255]/35"
            >
              {primaryText}
            </Link>
            <Link
              to={secondaryHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d9c49b] bg-white px-5 py-3 text-sm font-semibold text-[#725523] transition-colors hover:border-[#b89255] hover:bg-[#fcf8f2] focus:outline-none focus:ring-2 focus:ring-[#b89255]/25"
            >
              {secondaryText}
            </Link>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-[#e4d8c8] bg-white/78 p-4 text-sm leading-6 text-[#6f6251]">
          <p className="font-semibold text-[#241d18]">
            {asideTitle}
          </p>
          <p>{supportText}</p>
          <div className="flex flex-wrap gap-2 pt-1 text-[12px] font-semibold text-[#725523]">
            <span className="rounded-full bg-[#f4eadb] px-3 py-1">
              {sizeCue}
            </span>
            <span className="rounded-full bg-[#f4eadb] px-3 py-1">
              {shippingCue}
            </span>
            <span className="rounded-full bg-[#f4eadb] px-3 py-1">
              {confirmCue}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export const shouldCollapseSectionSkeleton = (
  componentKey?: string,
  sectionId?: string,
  sectionEntry?: string | StorefrontSectionConfig,
): boolean => {
  const key = `${sectionId || ''} ${componentKey || ''}`;
  const sectionSettings =
    typeof sectionEntry !== 'string' && isRecord(sectionEntry?.settings)
      ? sectionEntry.settings
      : null;

  return (
    key.includes('pdp-checkout') &&
    sectionSettings?.['surfaceMode'] === 'merged-buybox'
  );
};

const getSectionVariant = (
  sectionEntry?: string | StorefrontSectionConfig,
): string =>
  typeof sectionEntry !== 'string' && typeof sectionEntry?.variant === 'string'
    ? sectionEntry.variant
    : '';

const PDP_COMPANION_SECTION_IDS = new Set([
  ...STOREFRONT_CONVERSION_SECTION_IDS,
  'pdp-checkout',
]);

const isInlineBuyboxEmbeddedSection = (
  sectionEntry: string | StorefrontSectionConfig,
  sectionId: string,
  componentKey: string,
) =>
  typeof sectionEntry !== 'string' &&
  (sectionId === 'quantity-offers' || componentKey === 'quantity-offers') &&
  isRecord(sectionEntry.settings) &&
  sectionEntry.settings['placement'] === 'inline-buybox';

const isProductDetailCompanionSection = (sectionId: string, componentKey: string) =>
  PDP_COMPANION_SECTION_IDS.has(sectionId) ||
  (componentKey === 'conversion-stack' && sectionId !== 'product-info');

export const PageComposer: React.FC<PageComposerProps> = ({
  pageConfig,
  layout = 'stack',
  prioritizeSidebarOnMobile = false,
  renderSectionFrame,
  runtimeText,
}) => {
  const cartItems = useCartStore((state) => state.items);

  if (!pageConfig || !pageConfig.sections) {
    return <div className="p-8 text-center text-muted-foreground">No sections configured for this page.</div>;
  }

  let rawSections = pageConfig.sections;
  if (
    !renderSectionFrame &&
    rawSections.length >= 2 &&
    typeof rawSections[0] !== 'string' &&
    rawSections[0]?.type === 'promo-strip' &&
    typeof rawSections[1] !== 'string' &&
    (rawSections[1]?.type === 'hero-banner' || rawSections[1]?.type === 'hero-sidebar')
  ) {
    rawSections = [rawSections[1], rawSections[0], ...rawSections.slice(2)];
  }

  const indexedSections = rawSections.map((sectionEntry, index) => ({
    sectionEntry,
    index,
  })).filter(({ sectionEntry }) => {
    if (renderSectionFrame) {
      // In editor mode (renderSectionFrame provided), keep all sections (hidden sections are styled with dimmed look)
      return true;
    }
    if (typeof sectionEntry === 'string') {
      return true;
    }

    const isHidden =
      (isRecord(sectionEntry["settings"]) && sectionEntry["settings"]["hidden"] === true) ||
      sectionEntry["hidden"] === true;
    return !isHidden;
  });

  if (indexedSections.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No visible sections configured for this page.</div>;
  }

  const pageSettings = isRecord(pageConfig.settings) ? pageConfig.settings : null;
  const sidebarVisualDirection =
    pageSettings &&
    (pageSettings['sidebarVisualDirection'] === 'ltr' ||
      pageSettings['sidebarVisualDirection'] === 'rtl')
      ? String(pageSettings['sidebarVisualDirection'])
      : undefined;
  const surfaceTone =
    pageSettings && typeof pageSettings['surfaceTone'] === 'string'
      ? String(pageSettings['surfaceTone']).trim().toLowerCase()
      : '';
  const inheritedDirection =
    typeof document !== 'undefined' &&
    (document.documentElement.dir === 'ltr' || document.documentElement.dir === 'rtl')
      ? document.documentElement.dir
      : undefined;

  const getSectionId = (
    sectionEntry: string | StorefrontSectionConfig,
    index: number,
  ) =>
    typeof sectionEntry === 'string'
      ? sectionEntry
      : sectionEntry.type || sectionEntry.id || `section-${index}`;

  const getSectionComponentKey = (
    sectionEntry: string | StorefrontSectionConfig,
    index: number,
  ) => getStorefrontSectionComponentKey(getSectionId(sectionEntry, index));

  const findSectionIndex = (
    preferredIds: string[],
    fallbackIndex: number,
    options?: { exclude?: number[]; preferLast?: boolean },
  ) => {
    const excluded = new Set(options?.exclude || []);
    const matchedIndices = indexedSections
      .map(({ sectionEntry, index }) => ({
        index,
        id: getSectionId(sectionEntry, index),
        componentKey: getSectionComponentKey(sectionEntry, index),
      }))
      .filter(
        ({ index, id, componentKey }) =>
          !excluded.has(index) &&
          (preferredIds.includes(id) || preferredIds.includes(componentKey)),
      )
      .map(({ index }) => index);

    if (matchedIndices.length > 0) {
      return options?.preferLast
        ? matchedIndices[matchedIndices.length - 1]!
        : matchedIndices[0]!;
    }

    if (!excluded.has(fallbackIndex) && pageConfig.sections[fallbackIndex]) {
      return fallbackIndex;
    }

    return indexedSections.find(({ index }) => !excluded.has(index))?.index ?? -1;
  };

  const hasSection = (preferredIds: string[]) =>
    indexedSections.some(({ sectionEntry, index }) => {
      const sectionId = getSectionId(sectionEntry, index);
      const componentKey = getSectionComponentKey(sectionEntry, index);
      return preferredIds.includes(sectionId) || preferredIds.includes(componentKey);
    });
  const shouldRenderStableEmptyCheckout =
    layout === 'sidebar-right' &&
    surfaceTone === 'flat-checkout' &&
    cartItems.length === 0 &&
    getPersistedStorefrontCartItemCount() === 0 &&
    hasSection(['checkout-form']) &&
    hasSection(['order-summary', 'payment']);

  const renderSection = (
    sectionEntry: string | StorefrontSectionConfig,
    index: number,
  ) => {
    const sectionId = getSectionId(sectionEntry, index);
    const componentKey = getSectionComponentKey(sectionEntry, index);
    const SectionComponent = ComponentRegistry[sectionId];
    const renderedSectionEntry =
      runtimeText?.shouldReplaceThemeBrand && typeof sectionEntry !== 'string'
        ? sanitizeStorefrontSectionConfig(sectionEntry, runtimeText.replaceThemeBrandText)
        : sectionEntry;
    if (!SectionComponent) {
      if (import.meta.env.DEV) {
        return (
          <div key={`${sectionId}-${index}`} className="p-6 border-2 border-dashed border-destructive m-4 text-center rounded-[var(--radius)] bg-destructive/5">
            <span className="text-destructive font-bold text-sm">Missing Section:</span>{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{sectionId}</code>
          </div>
        );
      }
      return null; // Silently skip in production
    }

    const renderedSection = (
      <Suspense
        key={`${sectionId}-${index}`}
        fallback={
          <SectionSkeleton
            componentKey={componentKey}
            sectionId={sectionId}
            sectionEntry={renderedSectionEntry}
          />
        }
      >
        <SectionComponent
          section={typeof renderedSectionEntry === 'string' ? undefined : renderedSectionEntry}
          settings={typeof renderedSectionEntry === 'string' ? undefined : renderedSectionEntry.settings}
        />
      </Suspense>
    );

    if (!renderSectionFrame) {
      return renderedSection;
    }

    return renderSectionFrame({
      element: renderedSection,
      index,
      sectionEntry: renderedSectionEntry,
      sectionId,
      componentKey,
    });
  };

  const getSectionPriority = (
    sectionEntry: string | StorefrontSectionConfig,
    index: number,
  ) => {
    const sectionId = getSectionId(sectionEntry, index);
    const componentKey = getSectionComponentKey(sectionEntry, index);

    if (sectionId === 'pdp-checkout' || componentKey === 'pdp-checkout') {
      return 0;
    }

    if (isProductDetailCompanionSection(sectionId, componentKey)) {
      return 1;
    }

    return 99;
  };

  // Sidebar layout: render the known sidebar section separately from the main content.
  if (layout === 'sidebar-left' && indexedSections.length > 1 && hasSection(['filters-sidebar'])) {
    const sidebarIndex = findSectionIndex(['filters-sidebar'], 0);
    const sidebarSection = pageConfig.sections[sidebarIndex]!;
    const mainSections = indexedSections.filter(({ index }) => index !== sidebarIndex);
    return (
      <div className="storefront-page-composer w-full px-4 md:px-6 py-8">
        {!renderSectionFrame && (
          <div className="lg:hidden mb-6">{renderSection(sidebarSection, sidebarIndex)}</div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8">
          <aside className={renderSectionFrame ? "block" : "hidden lg:block"}>
            {renderSection(sidebarSection, sidebarIndex)}
          </aside>
          <div className="flex flex-col w-full">
            {mainSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
          </div>
        </div>
      </div>
    );
  }

  if (
    layout === 'sidebar-right' &&
    indexedSections.length > 1 &&
    hasSection(['filters-sidebar'])
  ) {
    const sidebarIndex = findSectionIndex(['filters-sidebar'], pageConfig.sections.length - 1, {
      preferLast: true,
    });
    const sidebarSection = pageConfig.sections[sidebarIndex]!;
    const mainSections = indexedSections.filter(({ index }) => index !== sidebarIndex);
    return (
      <div className="storefront-page-composer w-full px-4 py-8 md:px-6">
        {!renderSectionFrame && (
          <div className="mb-6 lg:hidden">{renderSection(sidebarSection, sidebarIndex)}</div>
        )}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col w-full">
            {mainSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
          </div>
          <aside className={renderSectionFrame ? "block" : "hidden lg:block"}>
            {renderSection(sidebarSection, sidebarIndex)}
          </aside>
        </div>
      </div>
    );
  }

  if (
    layout === 'sidebar-right' &&
    indexedSections.length > 1 &&
    hasSection(['order-summary', 'payment'])
  ) {
    if (shouldRenderStableEmptyCheckout) {
      return <StableEmptyCheckoutState pageSettings={pageSettings} />;
    }

    const sidebarIndex = findSectionIndex(
      ['order-summary', 'payment'],
      pageConfig.sections.length - 1,
      { preferLast: true },
    );
    const sidebarSection = pageConfig.sections[sidebarIndex]!;
    const mainSections = indexedSections.filter(({ index }) => index !== sidebarIndex);
    const checkoutComposerClassName =
      surfaceTone === 'flat-checkout'
        ? 'storefront-page-composer container px-4 py-6 md:px-6 md:py-8 xl:px-4'
        : 'storefront-page-composer container px-4 md:px-6 py-8';
    const checkoutGridClassName =
      surfaceTone === 'flat-checkout'
        ? 'grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-7'
        : 'grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]';
    const mainColumnClassName = [
      'flex flex-col w-full',
      prioritizeSidebarOnMobile ? 'order-2 lg:order-1' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const sidebarAsideClassName = [
      surfaceTone === 'flat-checkout' ? 'self-start lg:sticky lg:top-0 lg:h-screen lg:pt-32 lg:pb-10 lg:px-8 bg-[#faf9f8] lg:border-s border-[#e5dacb]' : '',
      prioritizeSidebarOnMobile ? 'order-1 lg:order-2' : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined;
    return (
      <div className={checkoutComposerClassName}>
        <div
          className={checkoutGridClassName}
          dir={sidebarVisualDirection}
        >
          <div className={mainColumnClassName} dir={inheritedDirection}>
            {mainSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
          </div>
          <aside className={sidebarAsideClassName} dir={inheritedDirection}>
            {renderSection(sidebarSection, sidebarIndex)}
          </aside>
        </div>
      </div>
    );
  }

  if (
    layout === 'product-detail' &&
    indexedSections.length > 1 &&
    hasSection(['product-gallery']) &&
    hasSection(['product-info'])
  ) {
    const detailColumnsDirection =
      isRecord(pageConfig.settings) &&
      (pageConfig.settings['detailColumnsDirection'] === 'ltr' ||
        pageConfig.settings['detailColumnsDirection'] === 'rtl')
        ? String(pageConfig.settings['detailColumnsDirection'])
        : undefined;
    const contentDirection =
      (typeof document !== 'undefined' &&
      (document.documentElement.dir === 'ltr' || document.documentElement.dir === 'rtl')
        ? document.documentElement.dir
        : undefined) || undefined;
    const galleryIndex = findSectionIndex(['product-gallery'], 0);
    const infoIndex = findSectionIndex(
      ['product-info'],
      galleryIndex === 0 ? 1 : 0,
      { exclude: [galleryIndex] },
    );

    if (galleryIndex !== -1 && infoIndex !== -1) {
      const gallerySection = pageConfig.sections[galleryIndex]!;
      const infoSection = pageConfig.sections[infoIndex]!;
      const shouldStabilizeExpandedBuyboxGrid =
        getSectionVariant(infoSection) === 'elessi-care-buybox';
      const companionSections = indexedSections
        .filter(({ sectionEntry, index }) => {
          if (index === galleryIndex || index === infoIndex) {
            return false;
          }

          const sectionId = getSectionId(sectionEntry, index);
          const componentKey = getSectionComponentKey(sectionEntry, index);
          if (isInlineBuyboxEmbeddedSection(sectionEntry, sectionId, componentKey)) {
            return false;
          }
          return isProductDetailCompanionSection(sectionId, componentKey);
        })
        .sort(
          (left, right) =>
            getSectionPriority(left.sectionEntry, left.index) -
            getSectionPriority(right.sectionEntry, right.index),
        );
      const extraSections = indexedSections.filter(({ sectionEntry, index }) => {
        if (index === galleryIndex || index === infoIndex) {
          return false;
        }

        const sectionId = getSectionId(sectionEntry, index);
        const componentKey = getSectionComponentKey(sectionEntry, index);
        if (isInlineBuyboxEmbeddedSection(sectionEntry, sectionId, componentKey)) {
          return false;
        }
        return !isProductDetailCompanionSection(sectionId, componentKey);
      });

      const useCompactMobileProductDetail =
        pageSettings?.['compactMobileLayout'] === true;
      const productDetailComposerClassName = useCompactMobileProductDetail
        ? 'storefront-page-composer container px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-8'
        : 'storefront-page-composer container px-3 py-2.5 sm:px-4 sm:py-5 md:px-6 md:py-8';
      const productDetailGridClassName = useCompactMobileProductDetail
        ? 'grid grid-cols-1 gap-2.5 sm:gap-3 md:gap-7 lg:grid-cols-2 lg:gap-10'
        : 'grid grid-cols-1 gap-3 sm:gap-5 md:gap-7 lg:grid-cols-2 lg:gap-10';

      return (
        <div className={productDetailComposerClassName}>
          <div
            className={`${productDetailGridClassName} ${
              shouldStabilizeExpandedBuyboxGrid ? 'lg:min-h-[111rem]' : ''
            }`}
            dir={detailColumnsDirection}
          >
            <div dir={contentDirection}>
              {renderSection(gallerySection, galleryIndex)}
            </div>
            <div dir={contentDirection} className="flex min-w-0 flex-col gap-3 sm:gap-5">
              {renderSection(infoSection, infoIndex)}
              {companionSections.map(({ sectionEntry, index }) =>
                renderSection(sectionEntry, index),
              )}
            </div>
          </div>
          {extraSections.length > 0 ? (
            <div className="mt-6 sm:mt-10 flex flex-col gap-6 sm:gap-10">
              {extraSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
            </div>
          ) : null}
        </div>
      );
    }
  }

  if (
    layout === 'commerce-3col' &&
    indexedSections.length > 1 &&
    hasSection(['filters-sidebar']) &&
    hasSection(['shop-promo-rail'])
  ) {
    const sidebarIndex = findSectionIndex(['filters-sidebar'], 0);
    const promoRailIndex = findSectionIndex(
      ['shop-promo-rail'],
      pageConfig.sections.length - 1,
      { exclude: [sidebarIndex], preferLast: true },
    );
    const topSectionIds = new Set(['hero-banner', 'shop-command-bar']);
    const topSections = indexedSections.filter(({ sectionEntry, index }) => {
      const sectionId = getSectionId(sectionEntry, index);
      const componentKey = getSectionComponentKey(sectionEntry, index);
      return topSectionIds.has(sectionId) || topSectionIds.has(componentKey);
    });

    const mainSections = indexedSections.filter(({ sectionEntry, index }) => {
      if (index === sidebarIndex || index === promoRailIndex) {
        return false;
      }

      const sectionId = getSectionId(sectionEntry, index);
      const componentKey = getSectionComponentKey(sectionEntry, index);
      return !(topSectionIds.has(sectionId) || topSectionIds.has(componentKey));
    });

    return (
      <div className="storefront-page-composer container px-4 md:px-6 py-8">
        {topSections.length > 0 ? (
          <div className="mb-6 flex flex-col gap-6">
            {topSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="order-2 xl:order-1">
            {renderSection(pageConfig.sections[sidebarIndex]!, sidebarIndex)}
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-6 xl:order-2">
            {mainSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
          </div>

          <aside className="order-3">
            {renderSection(pageConfig.sections[promoRailIndex]!, promoRailIndex)}
          </aside>
        </div>
      </div>
    );
  }

  // Default: vertical stack
  return (
    <div className="storefront-page-composer flex flex-col w-full h-full">
      {indexedSections.map(({ sectionEntry, index }) => renderSection(sectionEntry, index))}
    </div>
  );
};
