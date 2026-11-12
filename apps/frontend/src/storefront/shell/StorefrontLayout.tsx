import React from 'react';
import MemoStorefrontHeader from '../components/header/StorefrontHeader';
import StorefrontFooter from '../components/footer/StorefrontFooter';
import FreeShippingBar from '../components/FreeShippingBar';
import StorePromotionBar from '../components/StorePromotionBar';
import { DeferredCartDrawerHost } from '../components/DeferredCartDrawerHost';
import MobileBottomNav from '../components/MobileBottomNav';
import GracefulScrollTop from '../components/GracefulScrollTop';
import IntruderNftBackground from './StorefrontBackgroundEffects';
import StorefrontRoutes from './StorefrontRoutes';
import { useStorefrontLayoutController } from './useStorefrontLayoutController';
import type { StorefrontLayoutProps } from './shellTypes';

const StorefrontPreviewBanner = React.lazy(() =>
  import('../components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.StorefrontPreviewBanner,
  })),
);

const StorefrontProductPreviewBanner = React.lazy(() =>
  import('../components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.StorefrontProductPreviewBanner,
  })),
);

const MarketplacePreviewCartBootstrap = React.lazy(() =>
  import('../components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.MarketplacePreviewCartBootstrap,
  })),
);

const GlobalConversionHost = React.lazy(
  () => import('../components/GlobalConversionHost'),
);

const StickyAddToCartHost = React.lazy(
  () => import('../components/StickyAddToCartHost'),
);

export const StorefrontLayout: React.FC<StorefrontLayoutProps> = (props) => {
  const { previewThemeId } = props;
  const controller = useStorefrontLayoutController(props);

  const {
    theme,
    settings,
    location,
    search,
    canRenderConversionHosts,
    currentLocale,
    currentDirection,
    runtimeText,
    globalHeader,
    globalFooter,
    shopLayoutFallback,
    routePageKey,
    pageStyleVars,
    isProductImageLandingPage,
    isPostPurchaseOfferPage,
    isMinimal,
    isKhemetLuxe,
    isIntruderNft,
    isBiteRush,
    isMenShoes,
    isElessiPackTheme,
    isProductPreview,
    previewProductId,
    isFastlyTheme,
    isGracefulTheme,
    legacyProductSlugAliasTarget,
    previewProduct,
    showMobileBottomNav,
    showPreviewThemeBanner,
    showFooter,
    activeStorefrontTemplates,
  } = controller;

  if (legacyProductSlugAliasTarget) {
    return null;
  }

  return (
    <div
      className="storefront-shell flex min-h-screen flex-col relative"
      dir={currentDirection}
      data-storefront-locale={currentLocale}
      data-storefront-theme={theme?.id}
    >
      {previewThemeId ? (
        <React.Suspense fallback={null}>
          <MarketplacePreviewCartBootstrap previewThemeId={previewThemeId} />
        </React.Suspense>
      ) : null}

      {isIntruderNft && <IntruderNftBackground />}

      {showPreviewThemeBanner && previewThemeId ? (
        <React.Suspense fallback={null}>
          <StorefrontPreviewBanner previewThemeId={previewThemeId} />
        </React.Suspense>
      ) : null}

      {!isProductImageLandingPage ? (
        <MemoStorefrontHeader
          isMinimal={isMinimal}
          search={search}
          globalHeader={globalHeader}
        />
      ) : null}

      {isProductPreview ? (
        <React.Suspense fallback={null}>
          <StorefrontProductPreviewBanner previewProductId={previewProductId} />
        </React.Suspense>
      ) : null}

      {isGracefulTheme ? <GracefulScrollTop /> : null}

      {!isProductImageLandingPage && !isPostPurchaseOfferPage ? (
        <FreeShippingBar />
      ) : null}

      {!isProductImageLandingPage ? <StorePromotionBar /> : null}

      {!isProductImageLandingPage && !isFastlyTheme && !isGracefulTheme && canRenderConversionHosts ? (
        <React.Suspense fallback={null}>
          {!isElessiPackTheme ? <GlobalConversionHost /> : null}
          <StickyAddToCartHost />
        </React.Suspense>
      ) : null}

      <main
        className="flex-1"
        style={{
          ...pageStyleVars,
          '--accent': 'var(--store-accent)',
          '--radius': 'var(--store-radius)',
          ...(pageStyleVars['--store-bg'] ? { backgroundColor: pageStyleVars['--store-bg'] } : {}),
        } as React.CSSProperties}
      >
        <StorefrontRoutes
          theme={theme}
          settings={settings}
          runtimeText={runtimeText}
          currentLocale={currentLocale}
          routePageKey={routePageKey}
          location={location}
          previewProduct={previewProduct}
          shopLayoutFallback={shopLayoutFallback}
          isKhemetLuxe={isKhemetLuxe}
          activeStorefrontTemplates={activeStorefrontTemplates}
        />
      </main>

      {showFooter ? (
        <StorefrontFooter isMinimal={isMinimal} globalFooter={globalFooter} />
      ) : null}

      {!isProductImageLandingPage && theme.id !== 'intruder-nft' && (
        <DeferredCartDrawerHost />
      )}

      {showMobileBottomNav && (
        <MobileBottomNav onSearchOpen={() => search.setIsOpen(true)} />
      )}

      {showMobileBottomNav && (
        <div
          className={
            isBiteRush
              ? 'h-24 md:hidden'
              : isMenShoes
                ? 'h-24 md:hidden'
                : 'h-24 md:hidden'
          }
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default StorefrontLayout;
