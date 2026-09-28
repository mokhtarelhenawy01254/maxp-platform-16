import React, { useEffect, useLayoutEffect } from 'react';
import { toast } from 'sonner';
import QuantitySelector from './QuantitySelector';
import Button from './Button';
import { useCartStore } from '../store/useCartStore';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useMinimumOrderSettings } from '../hooks/useMinimumOrderSettings';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { formatStorefrontCurrency } from '../utils/currency';
import {
  getActiveStorePromotionFromCompany,
  calculateStorePromotionDiscount,
} from '../utils/storePromotion';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import StorefrontProductImage from './StorefrontProductImage';
import { getCartItemImageCandidates } from '../utils/productImages';
import type { Product } from '../hooks/useProducts';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import {
  getCartDisplayEntries,
  getDisplayAttributes,
} from '../utils/cartQuantityOffers';
import {
  localizeBiteRushAttributeEntries,
  localizeBiteRushName,
} from '../utils/biteRushCopy';
import { isPharmacyThemeId } from '../utils/pharmacyThemes';
import { createStorefrontThemeTextReplacer } from '../utils/runtimeBrandText';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';

const LazyCartUpsellHost = React.lazy(() => import('./CartUpsellHost'));

type StorefrontSettingsRecord = Record<string, unknown>;

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
};

const CartDrawer: React.FC = () => {
  const {
    items,
    isOpen,
    setIsOpen,
    addItem,
    updateQuantity,
    removeItem,
    removeQuantityOfferGroup,
    getSubtotal,
  } = useCartStore();
  const [drawerQuickAdds, setDrawerQuickAdds] = React.useState<Product[]>([]);
  const { settings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const isBiteRush = theme.id === 'restaurant-demo';
  const isCafeDemo = theme.id === 'cafe-demo';
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const isRedlineAuto = theme.id === 'redline-auto';
  const scrollRegionRef = React.useRef<HTMLDivElement | null>(null);

  const onClose = React.useCallback(() => setIsOpen(false), [setIsOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useLayoutEffect(() => {
    const isCartRoute = /\/cart$/.test(location.pathname);

    if (isOpen && isCartRoute) {
      setIsOpen(false);
    }
  }, [items.length, location.pathname, isOpen, setIsOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) {
      return;
    }

    if (typeof scrollRegion.scrollTo === 'function') {
      scrollRegion.scrollTo({ top: 0 });
    } else {
      scrollRegion.scrollTop = 0;
    }
  }, [isOpen, items.length]);

  const subtotal = getSubtotal();
  const storePromotion = getActiveStorePromotionFromCompany(settings?.company);
  const { discount: storePromotionDiscount, tier: storePromotionTier } =
    calculateStorePromotionDiscount(items, storePromotion);
  const displayEntries = React.useMemo(() => getCartDisplayEntries(items), [items]);
  const checkoutPath = buildStorefrontPath(location.pathname, '/checkout', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const firstCartItem = items[0] || null;
  const firstCartItemName = String(firstCartItem?.name || '').trim();
  const firstCartItemUnitPrice = Number(firstCartItem?.basePrice ?? firstCartItem?.price ?? 0);
  const canIncreaseKhemetCartItem = Boolean(
    firstCartItem && !firstCartItem.quantityOffer?.groupId,
  );
  const handleKhemetQuantityUpsell = React.useCallback(() => {
    if (!firstCartItem || !canIncreaseKhemetCartItem) {
      return;
    }

    updateQuantity(firstCartItem.id, Number(firstCartItem.quantity || 1) + 1);
    setIsOpen(true);
  }, [canIncreaseKhemetCartItem, firstCartItem, setIsOpen, updateQuantity]);
  const currency = settings?.storefront?.settings?.currency || settings?.company?.currency || 'EGP';
  const minimumOrder = useMinimumOrderSettings(subtotal, currency, {
    enabled: isOpen || items.length > 0,
  });
  const handleCheckout = React.useCallback(() => {
    if (minimumOrder.blocked) {
      toast.error(minimumOrder.message);
      return;
    }

    onClose();
    window.location.assign(checkoutPath);
  }, [checkoutPath, minimumOrder.blocked, minimumOrder.message, onClose]);
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(settings, 'conversion-suite');
  const conversionSettings = getStorefrontMarketplaceAppSettings(settings, 'conversion-suite');
  const conversionModules =
    (conversionSettings['modules'] as StorefrontSettingsRecord | undefined) || {};
  const conversionThresholds =
    (conversionSettings['thresholds'] as StorefrontSettingsRecord | undefined) || {};
  const freeShippingThreshold = parsePositiveNumber(
    conversionThresholds['freeShippingAmount'],
    0,
  );
  const showKhemetFreeShippingProgress =
    conversionEnabled &&
    conversionModules['freeShippingBar'] !== false &&
    freeShippingThreshold > 0;
  const freeShippingRemaining = Math.max(freeShippingThreshold - subtotal, 0);
  const freeShippingProgress =
    showKhemetFreeShippingProgress && freeShippingThreshold > 0
      ? Math.min((subtotal / freeShippingThreshold) * 100, 100)
      : 0;
  const isThemePreview = new URLSearchParams(location.search).has('previewTheme');
  const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
    theme,
    settings,
    isThemePreview,
  });
  
  const cartSettings = theme.pages.cart?.settings;
  const getCartText = (...values: Array<string | undefined>): string =>
    replaceThemeBrandText(values.find((value) => value?.trim()) || '');
  const cartTitle = getCartText(
    cartSettings?.['title'] as string,
    theme.direction === 'rtl' ? 'سلة التسوق' : 'Cart',
  );
  const emptyCartText = getCartText(
    cartSettings?.['emptyText'] as string,
    cartSettings?.['emptyTitle'] as string,
    theme.direction === 'rtl' ? 'سلتك فارغة' : 'Your cart is empty',
  );
  const subtotalLabel = getCartText(
    cartSettings?.['subtotalLabel'] as string,
    theme.direction === 'rtl' ? 'المجموع الفرعي' : 'Subtotal',
  );
  const checkoutLabel = getCartText(
    cartSettings?.['checkoutLabel'] as string,
    theme.direction === 'rtl' ? 'إتمام الطلب' : 'Checkout',
  );
  const continueLabel = getCartText(
    cartSettings?.['continueShoppingText'] as string,
    cartSettings?.['continueLabel'] as string,
    theme.direction === 'rtl' ? 'تسوّق الآن' : 'Continue Shopping',
  );
  const removeLabel = getCartText(
    cartSettings?.['removeLabel'] as string,
    theme.direction === 'rtl' ? 'حذف' : 'Remove',
  );
  const closeCartLabel = getCartText(
    cartSettings?.['closeCartLabel'] as string,
    theme.direction === 'rtl' ? 'إغلاق السلة' : 'Close cart',
  );
  const cartDialogLabel =
    getCartText(
      cartSettings?.['dialogLabel'] as string,
      theme.direction === 'rtl' ? 'سلة التسوق' : 'Shopping Cart',
    );
  const saveLabel = getCartText(
    cartSettings?.['saveLabel'] as string,
    theme.direction === 'rtl' ? 'وفرت ' : 'Save ',
  );
  const drawerPanelClassName = isBiteRush
    ? 'bg-[linear-gradient(180deg,#fff9f3_0%,#fff1e5_100%)] shadow-[0_40px_120px_-46px_rgba(17,17,17,0.5)]'
    : isCafeDemo
      ? 'bg-[linear-gradient(180deg,#fffdfa_0%,#f6ede4_100%)] shadow-[0_40px_120px_-46px_rgba(75,46,31,0.34)]'
    : isPharmacy
      ? 'bg-[linear-gradient(180deg,#f8fffd_0%,#eefcf8_100%)] shadow-[0_40px_120px_-46px_rgba(15,118,110,0.28)]'
      : isKhemetLuxe
        ? 'bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e8_48%,#f4ebe0_100%)] shadow-[0_40px_120px_-56px_rgba(65,41,17,0.22)]'
      : 'bg-background shadow-2xl';
  const drawerPanelSizeClassName = isKhemetLuxe ? 'max-w-[44rem]' : 'max-w-md';
  const itemCardClassName = isBiteRush
    ? 'flex gap-4 rounded-[1.5rem] border border-[#f8c08c] bg-white/88 p-3 shadow-[0_18px_44px_-36px_rgba(247,115,22,0.24)]'
    : isCafeDemo
      ? 'flex gap-4 rounded-[1.5rem] border border-[#e6d0bc] bg-white/92 p-3 shadow-[0_18px_44px_-36px_rgba(75,46,31,0.18)]'
    : isPharmacy
      ? 'flex gap-4 rounded-[1.5rem] border border-[#99f6e4] bg-white/92 p-3 shadow-[0_18px_44px_-36px_rgba(20,184,166,0.18)]'
      : isKhemetLuxe
        ? 'relative flex gap-3.5 sm:gap-4 rounded-2xl border border-[#e7ddd0] bg-white/98 p-3.5 shadow-[0_8px_24px_-16px_rgba(109,85,39,0.12)]'
      : 'flex gap-4 rounded-[var(--radius)] border border-border bg-card p-3';
  const footerClassName = isBiteRush
    ? 'shrink-0 border-t border-[#f8c08c] p-5 space-y-4 bg-[linear-gradient(180deg,#fff8f1_0%,#fff0e1_100%)]'
    : isCafeDemo
      ? 'shrink-0 border-t border-[#e6d0bc] p-5 space-y-4 bg-[linear-gradient(180deg,#fffaf5_0%,#f5ece1_100%)]'
    : isPharmacy
      ? 'shrink-0 border-t border-[#99f6e4] p-5 space-y-4 bg-[linear-gradient(180deg,#f8fffd_0%,#effbf7_100%)]'
      : isKhemetLuxe
        ? 'shrink-0 border-t border-[#e7ddd0] px-4 py-3 space-y-3 bg-[linear-gradient(180deg,#fbf6ef_0%,#f5ecdf_100%)]'
      : 'shrink-0 border-t border-border p-5 space-y-4 bg-card';
  const checkoutButtonClassName = isBiteRush
    ? 'h-12 rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] font-black text-white shadow-[0_24px_70px_-34px_rgba(239,68,68,0.6)]'
    : isCafeDemo
      ? 'h-12 rounded-full border-none bg-[linear-gradient(135deg,#6f4a33_0%,#d6a77a_100%)] font-black text-white shadow-[0_24px_70px_-34px_rgba(111,74,51,0.4)]'
    : isPharmacy
      ? 'h-12 rounded-full border-none bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] font-black text-white shadow-[0_24px_70px_-34px_rgba(15,118,110,0.42)]'
      : isKhemetLuxe
        ? 'h-14 rounded-[0.95rem] border border-[#173f31] bg-[#173f31] text-base font-black text-[#fff7eb] shadow-[0_28px_74px_-42px_rgba(23,63,49,0.34)] transition-all hover:bg-[#204d3d]'
      : undefined;
  const drawerBorderClassName = isBiteRush
    ? 'border-[#f8c08c]'
    : isCafeDemo
      ? 'border-[#e6d0bc]'
      : isPharmacy
        ? 'border-[#99f6e4]'
        : isKhemetLuxe
          ? 'border-[#e7ddd0]'
          : 'border-border';
  const closeButtonClassName = isKhemetLuxe
    ? 'p-2 rounded-full border border-[#e7ddd0] bg-white/92 text-[#725523] transition-colors hover:border-[#cdb286] hover:text-[#5e4719]'
    : 'p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground';
  const continueButtonClassName = isKhemetLuxe
    ? 'w-full text-center text-sm font-semibold text-[#725523] transition-colors hover:text-[#173f31]'
    : 'w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors';
  const cartContentClassName = isKhemetLuxe
    ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3'
    : 'min-h-0 flex-1 overflow-y-auto p-5 space-y-4';
  const khemetShippingHint = isKhemetLuxe
    ? 'رسوم الشحن بتظهر بعد اختيار المحافظة في خطوة الدفع.'
    : null;
  const khemetServiceHighlights = isKhemetLuxe
    ? ['تأكيد المقاس قبل التجهيز', 'شحن داخل مصر', 'تبديل خلال 14 يوم']
    : [];
  const getItemName = (item: { name?: string; productId?: string; id?: string }) =>
    isBiteRush ? localizeBiteRushName(item.name, item.productId, item.id) : String(item.name || '').trim();
  const getAttributeEntries = (attributes?: Record<string, string>) => {
    const entries = getDisplayAttributes(attributes, theme.direction === 'rtl');
    return isBiteRush ? localizeBiteRushAttributeEntries(entries) : entries;
  };
  const drawerQuickAddProductId = items[0]?.productId || '';
  React.useEffect(() => {
    if (
      !isOpen ||
      (!isBiteRush && !isPharmacy && !isCafeDemo) ||
      !drawerQuickAddProductId
    ) {
      setDrawerQuickAdds([]);
      return;
    }

    let cancelled = false;

    void import('../preview/marketplaceSampleData').then(
      ({ getMarketplacePreviewRecommendations }) => {
        if (cancelled) {
          return;
        }

        const nextQuickAdds =
          getMarketplacePreviewRecommendations(
            drawerQuickAddProductId,
            'related',
          ) || [];
        setDrawerQuickAdds(nextQuickAdds.slice(0, 2));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    drawerQuickAddProductId,
    isBiteRush,
    isCafeDemo,
    isOpen,
    isPharmacy,
  ]);
  const handleQuickAdd = (product: Product) => {
    addItem(
      {
        productId: product.id,
        variantId: null,
        name: product.name,
        price: Number(product.price) || 0,
        basePrice: Number(product.price) || 0,
        comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
        quantity: 1,
        imageUrl: product.images?.[0],
      },
      { openCart: true },
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] ${
          isBiteRush
            ? 'bg-[#111111]/55'
            : isCafeDemo
              ? 'bg-[#2b1b12]/38'
              : isPharmacy
                ? 'bg-[#042f2e]/35'
                : isKhemetLuxe
                  ? 'bg-[#2c241b]/34'
                  : 'bg-black/50'
        } backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        dir={theme.direction}
        className={`fixed top-0 z-[70] h-full w-full ${drawerPanelSizeClassName} ${drawerPanelClassName} transform transition-[transform,visibility] duration-300 ease-out flex flex-col ${
          theme.direction === 'rtl' 
            ? `left-0 border-r ${drawerBorderClassName} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `right-0 border-l ${drawerBorderClassName} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
        } ${isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-label={cartDialogLabel}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className={`shrink-0 flex items-center justify-between p-5 border-b ${drawerBorderClassName}`}>
          <h2 className="text-lg font-bold font-heading text-foreground">
            {cartTitle} ({items.length})
          </h2>
          <button
            onClick={onClose}
            className={closeButtonClassName}
            aria-label={closeCartLabel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div
          ref={scrollRegionRef}
          className="min-h-0 flex-1 overflow-y-auto"
          aria-label={cartDialogLabel}
        >
        {/* Items */}
        <div className={cartContentClassName}>
          {showKhemetFreeShippingProgress ? (
            <div className={`rounded-xl border p-3 shadow-xs ${
              isRedlineAuto
                ? 'border-neutral-800 bg-[#121418] text-white'
                : 'border-[#e0d2bd]/80 bg-[#fffaf2]'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${
                  isRedlineAuto ? 'text-neutral-200' : 'text-[#173f31]'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isRedlineAuto ? 'text-red-500' : 'text-[#173f31]'}`}>
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                    <path d="M15 18H9" />
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                    <circle cx="17" cy="18.5" r="2.5" />
                    <circle cx="7" cy="18.5" r="2.5" />
                  </svg>
                  <span>
                    {freeShippingRemaining > 0
                      ? theme.direction === 'rtl'
                        ? isRedlineAuto
                          ? `أضف ${formatStorefrontCurrency(freeShippingRemaining, currency)} للشحن المجاني`
                          : `أضيفي ${formatStorefrontCurrency(freeShippingRemaining, currency)} للشحن المجاني`
                        : `Add ${formatStorefrontCurrency(freeShippingRemaining, currency)} for free shipping`
                      : theme.direction === 'rtl'
                        ? 'مبروك! شحن مجاني مفعّل لطلبك 🎉'
                        : 'Congratulations! Free shipping unlocked 🎉'}
                  </span>
                </div>
                <span className={`shrink-0 text-[11px] font-black tabular-nums ${
                  isRedlineAuto ? 'text-red-400' : 'text-[#173f31]'
                }`}>
                  {Math.round(freeShippingProgress)}%
                </span>
              </div>
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                isRedlineAuto ? 'bg-white/10' : 'bg-[#eadfcf]'
              }`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    isRedlineAuto ? 'bg-red-600' : 'bg-[#173f31]'
                  }`}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center text-muted-foreground space-y-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
              <p className="text-sm">{emptyCartText}</p>
            </div>
          ) : (
            <>
            {displayEntries.map((entry) =>
              entry.type === 'single' ? (() => {
                const itemName = getItemName(entry.item);
                const attributeEntries = getAttributeEntries(entry.item.attributes);

                return (
                <div key={entry.key} className={itemCardClassName}>
                  <div className={`flex ${isKhemetLuxe ? 'h-24 w-24' : 'h-20 w-20'} shrink-0 items-center justify-center overflow-hidden ${
                    isBiteRush
                      ? 'rounded-[1.3rem] bg-[#fff1e2]'
                      : isCafeDemo
                        ? 'rounded-[1.3rem] bg-[#f8ede0]'
                      : isPharmacy
                        ? 'rounded-[1.3rem] bg-[#e6fffa]'
                        : isKhemetLuxe
                          ? 'rounded-xl border border-[#eadfcf]/80 bg-[#fbf8f4]'
                        : 'rounded-[var(--radius)] bg-muted'
                  } text-xs text-muted-foreground`}>
                    <StorefrontProductImage
                      candidates={getCartItemImageCandidates(entry.item)}
                      alt={itemName}
                      requestedWidth={160}
                      responsiveWidths={[96, 128, 160, 220]}
                      responsiveSizes="96px"
                      imageQuality={72}
                      width="80"
                      height="80"
                      className={`h-full w-full ${isKhemetLuxe ? 'object-cover' : 'object-cover'}`}
                      fallback="IMG"
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-bold font-heading text-foreground">
                          {itemName}
                        </h3>
                        <button
                          onClick={() => removeItem(entry.item.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9e8f7a] transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`${removeLabel} ${itemName}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                      {attributeEntries.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {attributeEntries.map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center rounded-md bg-[#f5ede2] px-2 py-0.5 text-[11px] font-medium text-[#654e28]"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-[#173f31]">
                          {formatStorefrontCurrency(entry.pricing.effectiveUnitPrice, currency)}
                        </p>
                        {entry.pricing.totalDiscount > 0 ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground line-through text-[11px]">
                              {formatStorefrontCurrency(entry.pricing.baseUnitPrice, currency)}
                            </span>
                            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              {saveLabel}
                              {formatStorefrontCurrency(entry.pricing.totalDiscount, currency)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <QuantitySelector
                        size="compact"
                        value={entry.item.quantity}
                        onChange={(q) => updateQuantity(entry.item.id, q)}
                      />
                    </div>
                  </div>
                </div>
              )})() : (
                <div
                  key={entry.key}
                  className="space-y-3 rounded-[1.2rem] border border-primary/20 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                          عرض كميات
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-foreground">
                          {entry.group.selectedPieces} قطعة
                        </span>
                        {entry.group.freeShipping ? (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-600">
                            شحن مجاني
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-black text-foreground">
                        {entry.group.offerLabel}
                      </h3>
                    </div>
                    <button
                      onClick={() => removeQuantityOfferGroup(entry.group.groupId)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive"
                      aria-label={`${removeLabel} ${entry.group.offerLabel}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {entry.group.items.map(({ item, pricing }, index) => {
                      const itemName = getItemName(item);
                      const attributeEntries = getAttributeEntries(item.attributes);

                      return (
                      <div key={item.id} className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-xs text-muted-foreground">
                          <StorefrontProductImage
                            candidates={getCartItemImageCandidates(item)}
                            alt={itemName}
                            width="64"
                            height="64"
                            className="h-full w-full object-cover"
                            fallback="IMG"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black text-foreground">
                              القطعة {item.quantityOffer?.slotIndex || index + 1}
                            </p>
                            <p className="text-xs font-semibold text-foreground">
                              {formatStorefrontCurrency(pricing.lineSubtotal, currency)}
                            </p>
                          </div>
                          {attributeEntries.map(([key, value]) => (
                            <p key={key} className="text-xs text-muted-foreground">
                              {key}: {value}
                            </p>
                          ))}
                          {item.quantity > 1 ? (
                            <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                          ) : null}
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">إجمالي العرض</p>
                      <p className="text-sm font-black text-foreground">
                        {formatStorefrontCurrency(entry.group.subtotal, currency)}
                      </p>
                    </div>
                    {entry.group.totalDiscount > 0 ? (
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                        {saveLabel}
                        {formatStorefrontCurrency(entry.group.totalDiscount, currency)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ),
            )}
            {isKhemetLuxe ? (
              <React.Suspense fallback={null}>
                <LazyCartUpsellHost open={isOpen && items.length > 0} />
              </React.Suspense>
            ) : null}
            </>
          )}
        </div>

        {!isKhemetLuxe && (isBiteRush || isPharmacy || isCafeDemo) && drawerQuickAdds.length > 0 ? (
          <section
            className={`space-y-4 border-t px-5 py-5 ${
              isBiteRush
                ? 'border-[#f8c08c] bg-[linear-gradient(180deg,#fff9f4_0%,#fff3e7_100%)]'
                : isCafeDemo
                  ? 'border-[#e6d0bc] bg-[linear-gradient(180deg,#fffaf5_0%,#f4eadf_100%)]'
                : 'border-[#99f6e4] bg-[linear-gradient(180deg,#f8fffd_0%,#effbf7_100%)]'
            }`}
          >
            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                  isBiteRush ? 'bg-[#111111] text-white' : isCafeDemo ? 'bg-[#4b2e1f] text-[#f8eadf]' : 'bg-[#0f766e] text-white'
                }`}
              >
                {isBiteRush ? 'زوّد الطلب' : isCafeDemo ? 'تكملة الطلب' : 'منتجات مكملة'}
              </span>
              <h3 className={`mt-2 text-base font-black ${isBiteRush ? 'text-[#171717]' : isCafeDemo ? 'text-[#2c1d14]' : 'text-[#0f172a]'}`}>
                {isBiteRush ? 'اختيارات سريعة قبل الإتمام' : isCafeDemo ? 'مخبوزات وأدوات تكمل الطلب' : 'اختيارات تكمل الطلب الحالي'}
              </h3>
              <p className={`mt-1 text-sm ${isBiteRush ? 'text-[#8a4b1f]' : isCafeDemo ? 'text-[#6f4a33]' : 'text-[#0f766e]/80'}`}>
                {isBiteRush
                  ? 'إضافات خفيفة ترفع قيمة الطلب وتقرّبك من التوصيل المجاني.'
                  : isCafeDemo
                    ? 'اختيارات سريعة تزيد قيمة الطلب وتحافظ على نفس مزاج القهوة.'
                    : 'منتجات موثوقة تضيف حماية أو متابعة أسرع مع نفس الطلب.'}
              </p>
            </div>

            <div className="grid gap-3">
              {drawerQuickAdds.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 rounded-[1.35rem] border bg-white/92 p-3 ${
                    isBiteRush
                      ? 'border-[#f8c08c] shadow-[0_18px_40px_-34px_rgba(247,115,22,0.3)]'
                      : isCafeDemo
                        ? 'border-[#e6d0bc] shadow-[0_18px_40px_-34px_rgba(75,46,31,0.18)]'
                      : 'border-[#99f6e4] shadow-[0_18px_40px_-34px_rgba(20,184,166,0.2)]'
                  }`}
                >
                  <div className={`h-16 w-16 overflow-hidden rounded-[1rem] ${isBiteRush ? 'bg-[#fff1e2]' : isCafeDemo ? 'bg-[#f8ede0]' : 'bg-[#e6fffa]'}`}>
                    <StorefrontProductImage
                      candidates={product.images}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-black ${isBiteRush ? 'text-[#171717]' : isCafeDemo ? 'text-[#2c1d14]' : 'text-[#0f172a]'}`}>{product.name}</p>
                    <p className={`mt-1 text-xs ${isBiteRush ? 'text-[#8a4b1f]' : isCafeDemo ? 'text-[#6f4a33]' : 'text-[#0f766e]/80'}`}>
                      {formatStorefrontCurrency(Number(product.price) || 0, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(product)}
                    className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-black text-white ${
                      isBiteRush
                        ? 'bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] shadow-[0_16px_34px_-24px_rgba(239,68,68,0.9)]'
                        : isCafeDemo
                          ? 'bg-[linear-gradient(135deg,#6f4a33_0%,#d6a77a_100%)] shadow-[0_16px_34px_-24px_rgba(111,74,51,0.35)]'
                        : 'bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] shadow-[0_16px_34px_-24px_rgba(15,118,110,0.45)]'
                    }`}
                  >
                    أضف بسرعة
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : !isKhemetLuxe && isOpen && items.length > 0 ? (
            <React.Suspense fallback={null}>
              <LazyCartUpsellHost open />
            </React.Suspense>
        ) : null}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={footerClassName}>
            {khemetServiceHighlights.length > 0 ? (
              isKhemetLuxe ? (
                <div className="flex items-center justify-between border-b border-[#eadfcf]/60 pb-2 text-[11px] font-semibold text-[#725523]">
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-[#173f31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    {khemetServiceHighlights[0] || 'تأكيد المقاس'}
                  </span>
                  <span className="text-[#c7ad85]" aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-[#173f31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {khemetServiceHighlights[1] || 'شحن داخل مصر'}
                  </span>
                  <span className="text-[#c7ad85]" aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-[#173f31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    {khemetServiceHighlights[2] || 'تبديل 14 يوم'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {khemetServiceHighlights.map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border border-[#dcc9a8] bg-[#fff7eb] px-3 py-1 text-[11px] font-semibold text-[#725523]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )
            ) : null}

            {minimumOrder.blocked ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold leading-5 text-amber-900">
                  {minimumOrder.message}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-[width] duration-500"
                    style={{ width: `${minimumOrder.progress}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className="flex justify-between items-center text-sm">
              <span className={isKhemetLuxe ? 'font-medium text-[#725523]' : 'text-muted-foreground'}>{subtotalLabel}</span>
              <span className={isKhemetLuxe ? 'text-base font-black text-[#173f31]' : 'font-semibold text-foreground'}>
                {formatStorefrontCurrency(subtotal, currency)}
              </span>
            </div>
            {storePromotionDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700 dark:text-green-400 font-medium">{storePromotionTier?.label || 'عرض الكمية'}</span>
                <span className="text-green-700 dark:text-green-400 font-semibold">
                  -{formatStorefrontCurrency(storePromotionDiscount, currency)}
                </span>
              </div>
            )}
            {khemetShippingHint ? (
              <p className="text-[11px] text-[#7b6d58]">
                {khemetShippingHint}
              </p>
            ) : null}
            <Button
              fullWidth
              size="lg"
              className={checkoutButtonClassName}
              onClick={handleCheckout}
              disabled={minimumOrder.blocked}
            >
              {minimumOrder.blocked
                ? `${theme.direction === 'rtl' ? 'متبقي' : 'Remaining'} ${formatStorefrontCurrency(minimumOrder.remaining, currency)}`
                : `${checkoutLabel} — ${formatStorefrontCurrency(Math.max(0, subtotal - storePromotionDiscount), currency)}`}
            </Button>
            <button
              onClick={onClose}
              className={continueButtonClassName}
            >
              {continueLabel}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
