import React from 'react';
import { Routes, Route, useParams, type Location } from 'react-router-dom';
import { PageComposer } from '../engine/PageComposer';
import {
  resolveStorefrontPageLayout,
  StorefrontSectionFrame,
} from '../layout/StorefrontSectionFrame';
import { useProduct, setGlobalPresentationSlug } from '../hooks/useProduct';
import { useCategories } from '../hooks/useCategories';
import {
  resolveThemeBuilderTemplate,
  type ThemeBuilderTemplate,
} from '../studio/utils/themeBuilder';
import ProductImageLandingPage from '../pages/ProductImageLandingPage';
import FunnelCodSalesPage from '../pages/FunnelCodSalesPage';
import ReturnsPage from '../pages/ReturnsPage';
import PostPurchaseOfferPage from '../pages/PostPurchaseOfferPage';
import StorefrontNotFound from '../components/StorefrontNotFound';
import DynamicStorefrontPage from '../pages/DynamicStorefrontPage';
import CollectionCategoryPage from '../pages/CollectionCategoryPage';
import type { StorefrontPageLayout } from '../types/theme.types';
import {
  sproutRoomPageBanner,
  harvestFoldPageBanner,
  signalDeckPageBanner,
  pedalLabPageBanner,
  glowRoutinePageBanner,
  gemAtelierPageBanner,
  tailSupplyPageBanner,
  garageFitPageBanner,
  chronoGalleryPageBanner,
  carryLanePageBanner,
  elessiCompactProductCrumbs,
} from './StorefrontPageBanners';

const StorefrontArticlePage = React.lazy(
  () => import('../pages/StorefrontArticlePage'),
);

export const PresentationRouteWrapper: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { presentationSlug } = useParams<{ presentationSlug: string }>();
  React.useEffect(() => {
    setGlobalPresentationSlug(presentationSlug || null);
    return () => setGlobalPresentationSlug(null);
  }, [presentationSlug]);
  return element;
};

export const StorefrontThemeBuilderPdpWrapper: React.FC<{
  defaultPage: any;
  templates: ThemeBuilderTemplate[];
  runtimeText: any;
  currentLocale?: any;
}> = ({ defaultPage, templates, runtimeText, currentLocale }) => {
  const { id } = useParams<{ id: string }>();
  const { product } = useProduct(id);

  const matchedSingle = resolveThemeBuilderTemplate({
    templates,
    type: 'single',
    target: 'product',
    entity: product,
  });

  const activePdpConfig = matchedSingle?.page || defaultPage;

  return (
    <PageComposer
      pageConfig={activePdpConfig}
      layout={resolveStorefrontPageLayout(activePdpConfig, 'product-detail')}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
      locale={currentLocale}
    />
  );
};

export const StorefrontProductPageBreadcrumbs: React.FC<{
  theme: any;
  previewProduct: { name: string } | null;
  pathname: string;
  search: string;
}> = ({ theme, previewProduct, pathname, search }) => {
  const { id } = useParams<{ id: string }>();
  const effectiveId = id || (theme?.id ? `preview:${theme.id}` : undefined);
  const { product } = useProduct(effectiveId);
  const { categories } = useCategories();

  const isRtl = theme?.direction === 'rtl';
  const homeLabel = isRtl ? 'الرئيسية' : 'Home';
  const shopLabel = isRtl ? 'المتجر' : 'Shop';

  // Base trail starts with Home, Shop
  const trail: string[] = [homeLabel, shopLabel];

  // Resolve category ancestry if available
  if (product?.category) {
    const cat = product.category as any;
    const ancestry: string[] = [];

    if (cat.parent) {
      let curr = cat.parent;
      const seen = new Set<string>();
      while (curr && curr.name && !seen.has(curr.id || curr.name) && seen.size < 10) {
        seen.add(curr.id || curr.name);
        ancestry.unshift(curr.name);
        curr = curr.parent;
      }
      ancestry.push(cat.name);
    } else if (cat.parentId && Array.isArray(categories) && categories.length > 0) {
      let parentId: string | undefined = cat.parentId;
      const seen = new Set<string>();
      const parentNames: string[] = [];
      while (parentId && !seen.has(parentId) && seen.size < 10) {
        seen.add(parentId);
        const parentCat = categories.find((c: any) => c.id === parentId);
        if (parentCat) {
          parentNames.unshift(parentCat.name);
          parentId = (parentCat as any).parentId;
        } else {
          break;
        }
      }
      ancestry.push(...parentNames, cat.name);
    } else if (cat.id && Array.isArray(categories) && categories.length > 0) {
      const found = categories.find((c: any) => c.id === cat.id);
      if (found && (found as any).parentId) {
        let parentId: string | undefined = (found as any).parentId;
        const seen = new Set<string>();
        const parentNames: string[] = [];
        while (parentId && !seen.has(parentId) && seen.size < 10) {
          seen.add(parentId);
          const parentCat = categories.find((c: any) => c.id === parentId);
          if (parentCat) {
            parentNames.unshift(parentCat.name);
            parentId = (parentCat as any).parentId;
          } else {
            break;
          }
        }
        ancestry.push(...parentNames, found.name || cat.name);
      } else {
        ancestry.push(cat.name);
      }
    } else if (cat.name) {
      ancestry.push(cat.name);
    }

    if (ancestry.length > 0) {
      trail.push(...ancestry);
    }
  } else {
    // Legacy fallback mappings for specific elessi presets when no category exists on product
    const isSproutRoom = theme?.id === 'elessi-sprout-room';
    const isHarvestFold = theme?.id === 'elessi-harvest-fold';
    const isSignalDeck = theme?.id === 'elessi-signal-deck';
    const isPedalLab = theme?.id === 'elessi-pedal-lab';
    const isGlowRoutine = theme?.id === 'elessi-glow-routine';
    const isGemAtelier = theme?.id === 'elessi-gem-atelier';
    const isTailSupply = theme?.id === 'elessi-tail-supply';
    const isGarageFit = theme?.id === 'elessi-garage-fit';
    const isChronoGallery = theme?.id === 'elessi-chrono-gallery';
    const isCarryLane = theme?.id === 'elessi-carry-lane';

    if (isSproutRoom) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'النباتات' : 'Plants');
    } else if (isHarvestFold) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'الخضار والفاكهة' : 'Fresh produce');
    } else if (isSignalDeck) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'الأجهزة والملحقات' : 'Devices & accessories');
    } else if (isPedalLab) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'الدراجات' : 'Bikes');
    } else if (isGlowRoutine) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'العناية اليومية' : 'Daily care');
    } else if (isGemAtelier) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'المجوهرات والهدايا' : 'Jewelry & gifts');
    } else if (isTailSupply) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'مستلزمات الحيوانات' : 'Pet essentials');
    } else if (isGarageFit) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'قطع الغيار والإضافات' : 'Parts & add-ons');
    } else if (isChronoGallery) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'الساعات والإضافات' : 'Watches & accessories');
    } else if (isCarryLane) {
      trail.length = 0;
      trail.push(homeLabel, isRtl ? 'الحقائب' : 'Bags');
    }
  }

  // Leaf segment: product name
  const leafName =
    product?.name ||
    previewProduct?.name ||
    (isRtl ? 'التفاصيل' : 'Details');
  trail.push(leafName);

  return elessiCompactProductCrumbs(trail, pathname, search);
};

export interface StorefrontRoutesProps {
  theme: any;
  settings: any;
  runtimeText: any;
  currentLocale: any;
  routePageKey: string;
  location: Location;
  previewProduct: { name: string } | null;
  shopLayoutFallback: StorefrontPageLayout;
  isKhemetLuxe: boolean;
  activeStorefrontTemplates: ThemeBuilderTemplate[];
}

export const StorefrontRoutes: React.FC<StorefrontRoutesProps> = ({
  theme,
  settings,
  runtimeText,
  currentLocale,
  routePageKey,
  location,
  previewProduct,
  shopLayoutFallback,
  isKhemetLuxe,
  activeStorefrontTemplates,
}) => {
  const isSproutRoom = theme.id === 'elessi-sprout-room';
  const isHarvestFold = theme.id === 'elessi-harvest-fold';
  const isSignalDeck = theme.id === 'elessi-signal-deck';
  const isPedalLab = theme.id === 'elessi-pedal-lab';
  const isGlowRoutine = theme.id === 'elessi-glow-routine';
  const isGemAtelier = theme.id === 'elessi-gem-atelier';
  const isTailSupply = theme.id === 'elessi-tail-supply';
  const isGarageFit = theme.id === 'elessi-garage-fit';
  const isChronoGallery = theme.id === 'elessi-chrono-gallery';
  const isCarryLane = theme.id === 'elessi-carry-lane';
  const isElessiPackTheme = theme.id?.startsWith('elessi-') === true;

  const isHomeDraft =
    (theme.pages?.home as any)?.status === 'draft' ||
    ((settings as any)?.designTokens?.pages?.home as any)?.status === 'draft';

  const homeDraftBadge = isHomeDraft ? (
    <div
      data-testid="draft-preview-badge"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-xs"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>معاينة — مسودة غير منشورة</span>
    </div>
  ) : null;

  const homePageElement = (
    <div className="w-full">
      {homeDraftBadge}
      <PageComposer
        key={`home:${routePageKey}`}
        pageConfig={theme.pages.home}
        layout={resolveStorefrontPageLayout(theme.pages.home)}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
        locale={currentLocale}
      />
    </div>
  );

  const shopPageElement = (
    <div key={`shop:${routePageKey}`} className="w-full flex flex-col">
      {isSproutRoom
        ? sproutRoomPageBanner(
            'Plants',
            theme.direction === 'rtl' ? ['الرئيسية', 'النباتات'] : ['Home', 'Plants'],
            location.pathname,
            location.search,
          )
        : isHarvestFold
          ? harvestFoldPageBanner(
              theme.direction === 'rtl' ? 'الخضار والفاكهة' : 'Fresh produce',
              theme.direction === 'rtl' ? ['الرئيسية', 'الخضار والفاكهة'] : ['Home', 'Fresh produce'],
              location.pathname,
              location.search,
            )
          : isSignalDeck
            ? signalDeckPageBanner(
                theme.direction === 'rtl' ? 'الأجهزة والملحقات' : 'Devices & accessories',
                theme.direction === 'rtl' ? ['الرئيسية', 'الأجهزة والملحقات'] : ['Home', 'Devices & accessories'],
                location.pathname,
                location.search,
              )
            : isPedalLab
              ? pedalLabPageBanner(
                  theme.direction === 'rtl' ? 'الدراجات والمعدات' : 'Bikes & gear',
                  theme.direction === 'rtl' ? ['الرئيسية', 'الدراجات'] : ['Home', 'Bikes'],
                  location.pathname,
                  location.search,
                )
              : isGlowRoutine
                ? glowRoutinePageBanner(
                    theme.direction === 'rtl' ? 'العناية اليومية والمجموعات' : 'Daily care & gift sets',
                    theme.direction === 'rtl' ? ['الرئيسية', 'العناية اليومية'] : ['Home', 'Daily care'],
                    location.pathname,
                    location.search,
                  )
                : isGemAtelier
                  ? gemAtelierPageBanner(
                      theme.direction === 'rtl' ? 'المجوهرات والهدايا' : 'Jewelry & gifts',
                      theme.direction === 'rtl' ? ['الرئيسية', 'المجوهرات والهدايا'] : ['Home', 'Jewelry & gifts'],
                      location.pathname,
                      location.search,
                    )
                  : isTailSupply
                    ? tailSupplyPageBanner(
                        theme.direction === 'rtl' ? 'مستلزمات الحيوانات' : 'Pet essentials',
                        theme.direction === 'rtl' ? ['الرئيسية', 'مستلزمات الحيوانات'] : ['Home', 'Pet essentials'],
                        location.pathname,
                        location.search,
                      )
                    : isGarageFit
                      ? garageFitPageBanner(
                          theme.direction === 'rtl' ? 'قطع الغيار والإضافات' : 'Parts & add-ons',
                          theme.direction === 'rtl' ? ['الرئيسية', 'قطع الغيار والإضافات'] : ['Home', 'Parts & add-ons'],
                          location.pathname,
                          location.search,
                        )
                      : isChronoGallery
                        ? chronoGalleryPageBanner(
                            theme.direction === 'rtl' ? 'الساعات والإضافات' : 'Watches & accessories',
                            theme.direction === 'rtl' ? ['الرئيسية', 'الساعات والإضافات'] : ['Home', 'Watches & accessories'],
                            location.pathname,
                            location.search,
                          )
                        : isCarryLane
                          ? carryLanePageBanner(
                              theme.direction === 'rtl' ? 'الحقائب والإكسسوارات' : 'Bags & accessories',
                              theme.direction === 'rtl' ? ['الرئيسية', 'الحقائب والإكسسوارات'] : ['Home', 'Bags & accessories'],
                              location.pathname,
                              location.search,
                            )
                          : null}
      {theme.id === 'zen-organic' && (
        <div className="w-full bg-[#fdfdfc] py-14 md:py-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#f1f3ee]/80 via-[#fdfdfc] to-[#fdfdfc] relative overflow-hidden border-b border-[#e9ebe5]">
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #88a876 1.5px, transparent 0)',
              backgroundSize: '30px 30px',
              backgroundPosition: 'center',
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            }}
          />
          <div className="container relative z-10 text-center flex flex-col items-center justify-center space-y-4">
            <h1 className="text-4xl md:text-[2.6rem] font-bold font-sans text-[#1a3328] tracking-tight">
              Shop
            </h1>
            <div className="text-sm md:text-[0.95rem] font-medium text-muted-foreground flex items-center justify-center gap-2.5 tracking-wide">
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">Home</span>
              <span className="opacity-60 text-xs">/</span>
              <span className="text-[#1a3328]">Shop</span>
            </div>
          </div>
        </div>
      )}
      {(() => {
        const matchedArchive = resolveThemeBuilderTemplate({
          templates: activeStorefrontTemplates,
          type: 'archive',
          target: 'products',
          entity: null,
        });
        const activeShopConfig = matchedArchive?.page || theme.pages.shop;
        return (
          <PageComposer
            pageConfig={activeShopConfig}
            layout={resolveStorefrontPageLayout(activeShopConfig, shopLayoutFallback)}
            runtimeText={runtimeText}
            renderSectionFrame={StorefrontSectionFrame}
            locale={currentLocale}
          />
        );
      })()}
    </div>
  );

  const productPageElement = (
    <div key={`product:${routePageKey}`} className="w-full flex flex-col">
      {isElessiPackTheme ||
      theme.id === 'marketplace-avenue' ||
      theme.id === 'marketplace-avenue-ar' ||
      theme.id?.startsWith('marketplace-') ? (
        <StorefrontProductPageBreadcrumbs
          theme={theme}
          previewProduct={previewProduct}
          pathname={location.pathname}
          search={location.search}
        />
      ) : null}
      {theme.id === 'zen-organic' && (
        <div className="w-full bg-[#fdfdfc] py-14 md:py-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#f1f3ee]/80 via-[#fdfdfc] to-[#fdfdfc] relative overflow-hidden border-b border-[#e9ebe5] mb-8">
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #88a876 1.5px, transparent 0)',
              backgroundSize: '30px 30px',
              backgroundPosition: 'center',
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            }}
          />
          <div className="container relative z-10 text-center flex flex-col items-center justify-center space-y-4">
            <h1 className="text-4xl md:text-[2.6rem] font-bold font-sans text-[#1a3328] tracking-tight">
              Shop
            </h1>
            <div className="text-sm md:text-[0.95rem] font-medium text-muted-foreground flex items-center justify-center gap-2.5 tracking-wide">
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">Home</span>
              <span className="opacity-60 text-xs">/</span>
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">Plants</span>
              <span className="opacity-60 text-xs">/</span>
              <span className="text-[#1a3328]">Product Details</span>
            </div>
          </div>
        </div>
      )}
      <StorefrontThemeBuilderPdpWrapper
        defaultPage={theme.pages.pdp}
        templates={activeStorefrontTemplates}
        runtimeText={runtimeText}
        currentLocale={currentLocale}
      />
    </div>
  );

  const cartPageElement = (
    <div key={`cart:${routePageKey}`} className="w-full flex flex-col pb-28 md:pb-0">
      {isSproutRoom
        ? sproutRoomPageBanner(
            theme.direction === 'rtl' ? 'السلة' : 'Cart',
            theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
            location.pathname,
            location.search,
          )
        : isHarvestFold
          ? harvestFoldPageBanner(
              theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
              theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
              location.pathname,
              location.search,
            )
          : isSignalDeck
            ? signalDeckPageBanner(
                theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                location.pathname,
                location.search,
              )
            : isPedalLab
              ? pedalLabPageBanner(
                  theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                  theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                  location.pathname,
                  location.search,
                )
              : isGlowRoutine
                ? glowRoutinePageBanner(
                    theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                    theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                    location.pathname,
                    location.search,
                  )
                : isGemAtelier
                  ? gemAtelierPageBanner(
                      theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                      theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                      location.pathname,
                      location.search,
                    )
                  : isTailSupply
                    ? tailSupplyPageBanner(
                        theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                        theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                        location.pathname,
                        location.search,
                      )
                    : isGarageFit
                      ? garageFitPageBanner(
                          theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                          theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                          location.pathname,
                          location.search,
                        )
                      : isChronoGallery
                        ? chronoGalleryPageBanner(
                            theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                            theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                            location.pathname,
                            location.search,
                          )
                        : isCarryLane
                          ? carryLanePageBanner(
                              theme.direction === 'rtl' ? 'سلة الشراء' : 'Shopping cart',
                              theme.direction === 'rtl' ? ['الرئيسية', 'السلة'] : ['Home', 'Cart'],
                              location.pathname,
                              location.search,
                            )
                          : null}
      <PageComposer
        pageConfig={theme.pages.cart}
        layout={resolveStorefrontPageLayout(theme.pages.cart, 'sidebar-right')}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
        locale={currentLocale}
      />
    </div>
  );

  const khemetCheckoutSteps =
    theme.direction === 'rtl'
      ? ['السلة', 'البيانات', 'الشحن', 'الدفع']
      : ['Cart', 'Information', 'Shipping', 'Payment'];

  const khemetCheckoutProgress = isKhemetLuxe ? (
    <div className="w-full border-b border-[#e9dfd2] bg-white">
      <div className="container px-4 py-4 md:px-6">
        <div
          className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          dir={theme.direction === 'rtl' ? 'rtl' : 'ltr'}
        >
          {khemetCheckoutSteps.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 ? <span className="text-[#cbbba4]">›</span> : null}
              <span className={index === 1 ? 'text-[#111111]' : 'text-[#b29667]'}>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  // System checkout: a commercial template owns home/shop/pdp/cart/collections/contact and
  // must NOT ship a checkout page, so the shell supplies the default checkout sections when
  // the theme omits them (same pattern as thank-you / registration). Task 120-day01.
  const checkoutPageConfig = theme.pages.checkout || {
    sections: ['checkout-form', 'payment'],
  };

  const checkoutPageElement = (
    <div key={`checkout:${routePageKey}`} className="w-full flex flex-col">
      {khemetCheckoutProgress}
      <PageComposer
        pageConfig={checkoutPageConfig}
        layout={resolveStorefrontPageLayout(checkoutPageConfig, 'sidebar-right')}
        prioritizeSidebarOnMobile={isKhemetLuxe}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
        locale={currentLocale}
      />
    </div>
  );

  const thankYouPageElement = (
    <PageComposer
      key={`thank-you:${routePageKey}`}
      pageConfig={theme.pages['thank-you'] || { sections: ['order-confirmation'] }}
      layout={resolveStorefrontPageLayout(theme.pages['thank-you'], 'stack')}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
      locale={currentLocale}
    />
  );

  const registrationPageElement = (
    <PageComposer
      key={`registration:${routePageKey}`}
      pageConfig={theme.pages['registration'] || { sections: ['member-registration'] }}
      layout={resolveStorefrontPageLayout(theme.pages['registration'], 'stack')}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
      locale={currentLocale}
    />
  );

  const notFoundElement = <StorefrontNotFound />;

  const renderScopedRoutes = (scopePrefix?: string) => {
    const scopedPath = (route?: string): string => {
      if (!scopePrefix) {
        return route || '';
      }
      return route ? `${scopePrefix}/${route}` : scopePrefix;
    };

    return (
      <>
        {scopePrefix ? (
          <Route path={scopedPath()} element={homePageElement} />
        ) : (
          <Route index element={homePageElement} />
        )}
        <Route path={scopedPath('shop')} element={shopPageElement} />
        <Route path={scopedPath('products')} element={shopPageElement} />
        <Route path={scopedPath('catalog')} element={shopPageElement} />
        <Route path={scopedPath('product/:id')} element={productPageElement} />
        <Route path={scopedPath('products/:id')} element={productPageElement} />
        <Route
          path={scopedPath('product/:id/:presentationSlug')}
          element={<PresentationRouteWrapper element={productPageElement} />}
        />
        <Route
          path={scopedPath('products/:id/:presentationSlug')}
          element={<PresentationRouteWrapper element={productPageElement} />}
        />
        <Route
          path={scopedPath('shop/products/:id/:presentationSlug')}
          element={<PresentationRouteWrapper element={productPageElement} />}
        />
        <Route path={scopedPath('lp/:id')} element={<ProductImageLandingPage />} />
        <Route path={scopedPath('landing/:id')} element={<ProductImageLandingPage />} />
        <Route path={scopedPath('funnel/:slug')} element={<FunnelCodSalesPage />} />
        <Route path={scopedPath('p/:slug')} element={<FunnelCodSalesPage />} />
        <Route path={scopedPath('shop/products/:id')} element={productPageElement} />
        <Route path={scopedPath('cart')} element={cartPageElement} />
        <Route path={scopedPath('checkout')} element={checkoutPageElement} />
        <Route path={scopedPath('order-offer')} element={<PostPurchaseOfferPage />} />
        <Route path={scopedPath('thank-you')} element={thankYouPageElement} />
        <Route path={scopedPath('registration')} element={registrationPageElement} />
        <Route path={scopedPath('collections/:categorySlug')} element={<CollectionCategoryPage />} />
        <Route path={scopedPath('shop/page/:pageSlug/*')} element={<DynamicStorefrontPage />} />
        <Route path={scopedPath('pages/:pageSlug/*')} element={<DynamicStorefrontPage />} />
        <Route
          path={scopedPath('articles/:slug')}
          element={
            <React.Suspense fallback={<div className="container py-20 text-center">جاري التحميل...</div>}>
              <StorefrontArticlePage embedded />
            </React.Suspense>
          }
        />
        <Route path={scopedPath('returns')} element={<ReturnsPage />} />
        <Route path={scopedPath(':pageSlug/*')} element={<DynamicStorefrontPage />} />
      </>
    );
  };

  return (
    <Routes>
      {renderScopedRoutes('store')}
      {renderScopedRoutes()}
      <Route path="*" element={notFoundElement} />
    </Routes>
  );
};

export default StorefrontRoutes;
