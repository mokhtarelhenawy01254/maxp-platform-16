import { useCallback, useMemo } from 'react';
import {
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackViewContent,
} from '../../utils/facebookPixel';
import storefrontAnalytics from '../services/storefrontAnalytics';
import { useStorefrontSettings } from './useStorefrontSettings';

type ProductTrackingPayload = {
  id: string;
  name: string;
  price: number;
  category?: string;
  quantity?: number;
};

type CartTrackingPayload = {
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
  total: number;
};

type PurchaseTrackingPayload = {
  orderNumber: string;
  items: Array<{
    id: string;
    productId?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
};

type TrackingSettingKey =
  | 'pixelTrackViewContent'
  | 'pixelTrackAddToCart'
  | 'pixelTrackInitiateCheckout'
  | 'pixelTrackPurchase';

const normalizeCurrency = (currency?: string | null): string => {
  const candidate = currency?.trim().toUpperCase();
  return candidate && /^[A-Z]{3}$/.test(candidate) ? candidate : 'EGP';
};

const createInternalTrackingToken = (eventName: string) =>
  `internal:${eventName}:${Date.now()}`;

export const useStorefrontFacebookTracking = () => {
  const { settings } = useStorefrontSettings();
  const publicSettings = settings?.storefrontSettings || null;
  const isPreviewMode = Boolean(settings?.storefront?.isPreview);
  const isProductPreview =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('productPreview') === '1' ||
     new URLSearchParams(window.location.search).get('preview') === '1');
  const shouldTrackInternally = !isPreviewMode && !isProductPreview;

  const trackingSettings = useMemo(
    () => ({
      facebookPixelEnabled: false,
      facebookPixelId: '',
      pixelTrackViewContent: true,
      pixelTrackAddToCart: true,
      pixelTrackInitiateCheckout: true,
      pixelTrackPurchase: true,
      facebookConvApiEnabled: false,
      capiTrackPurchase: true,
      gtmEnabled: false,
      gtmSuppressPixels: false,
      currency:
        settings?.storefront?.settings?.currency ||
        publicSettings?.currency ||
        settings?.company?.currency ||
        'EGP',
      ...(publicSettings || {}),
    }),
    [publicSettings, settings?.company?.currency, settings?.storefront?.settings?.currency],
  );

  const currency = useMemo(
    () => normalizeCurrency(trackingSettings.currency),
    [trackingSettings.currency],
  );

  const browserTrackingEnabled = Boolean(
    !isPreviewMode &&
      !isProductPreview &&
      trackingSettings.facebookPixelEnabled &&
      trackingSettings.facebookPixelId &&
      !(trackingSettings.gtmEnabled && trackingSettings.gtmSuppressPixels),
  );

  const canTrackEvent = useCallback(
    (settingKey: TrackingSettingKey) =>
      !isPreviewMode &&
      !isProductPreview &&
      browserTrackingEnabled &&
      trackingSettings[settingKey] !== false,
    [browserTrackingEnabled, isPreviewMode, isProductPreview, trackingSettings],
  );

  const trackViewContentEvent = useCallback(
    (product: ProductTrackingPayload) => {
      const internalEventId = createInternalTrackingToken('view_content');

      if (shouldTrackInternally) {
        void storefrontAnalytics.trackProductView(product.id, 'storefront');
      }

      if (!canTrackEvent('pixelTrackViewContent')) {
        return internalEventId;
      }

      return trackViewContent(product, currency) ?? internalEventId;
    },
    [canTrackEvent, currency, shouldTrackInternally],
  );

  const trackAddToCartEvent = useCallback(
    (product: ProductTrackingPayload) => {
      const internalEventId = createInternalTrackingToken('add_to_cart');
      const quantity = Math.max(1, Number(product.quantity || 1));

      if (shouldTrackInternally) {
        void storefrontAnalytics.trackAddToCart(product.id, product.price * quantity);
      }

      if (!canTrackEvent('pixelTrackAddToCart')) {
        return internalEventId;
      }

      return trackAddToCart({ ...product, quantity }, currency) ?? internalEventId;
    },
    [canTrackEvent, currency, shouldTrackInternally],
  );

  const trackInitiateCheckoutEvent = useCallback(
    (cart: CartTrackingPayload) => {
      const internalEventId = createInternalTrackingToken('checkout');
      const productIds = cart.items
        .map((item) => String(item.id || '').trim())
        .filter(Boolean);

      if (shouldTrackInternally) {
        void storefrontAnalytics.trackCheckout(cart.total, productIds);
      }

      if (!canTrackEvent('pixelTrackInitiateCheckout')) {
        return internalEventId;
      }

      return trackInitiateCheckout(cart, currency) ?? internalEventId;
    },
    [canTrackEvent, currency, shouldTrackInternally],
  );

  const trackPurchaseEvent = useCallback(
    (order: PurchaseTrackingPayload, eventId?: string) => {
      const internalEventId = eventId || createInternalTrackingToken('purchase');
      const productIds = order.items
        .map((item) => String(item.productId || item.id || '').trim())
        .filter(Boolean);

      if (shouldTrackInternally) {
        void storefrontAnalytics.trackPurchase(order.orderNumber, order.total, productIds);
      }

      if (!canTrackEvent('pixelTrackPurchase')) {
        return internalEventId;
      }

      return trackPurchase(order, eventId, currency) ?? internalEventId;
    },
    [canTrackEvent, currency, shouldTrackInternally],
  );

  return {
    currency,
    browserTrackingEnabled,
    trackViewContentEvent,
    trackAddToCartEvent,
    trackInitiateCheckoutEvent,
    trackPurchaseEvent,
  };
};

export default useStorefrontFacebookTracking;
