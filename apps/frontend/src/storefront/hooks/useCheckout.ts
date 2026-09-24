import { useState } from 'react';
import { buildCartItemId, CartItem, useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { storefrontApi, getCompanyId, getCartId } from '../../utils/storefrontApi';
import { useMinimumOrderSettings } from './useMinimumOrderSettings';
import {
  getOrderAttributionPayload,
  type StorefrontOrderAttributionSnapshot,
} from '../utils/orderAttribution';
import {
  getStorefrontSessionDetails,
  type StorefrontSessionDetails,
} from '../utils/storefrontSessionTracker';
import { persistPurchaseTracking } from '../utils/purchaseTrackingStorage';
import { toast } from 'sonner';

export interface CheckoutData {
  customerName: string;
  email: string;
  phone: string;
  phone2?: string;
  alternativePhone?: string;
  address: string;
  city: string;
  area?: string;
  governorate: string;
  notes?: string;
  paymentMethod: 'cod' | 'card' | 'wallet';
  couponCode?: string;
  shippingCost?: number;
  subtotal?: number;
  total?: number;
  redeemPoints?: boolean;
  useWallet?: boolean;
  walletAmount?: number;
  walletProof?: {
    imageUrl?: string;
    walletNumber?: string;
    transferRef?: string;
  };
}

export interface CheckoutOrderPayload {
  companyId?: string;
  pixelEventId?: string;
  attribution?: StorefrontOrderAttributionSnapshot;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestPhone2?: string;
  shippingAddress: {
    address: string;
    addressLine1: string;
    street: string;
    city: string;
    area?: string;
    governorate: string;
    phone2?: string;
  };
  paymentMethod: 'cod' | 'card' | 'wallet';
  couponCode?: string;
  notes?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    price: number;
    basePrice?: number;
    quantity: number;
    attributes: Record<string, string>;
    image?: string;
    productImage?: string;
    metadata?: Record<string, unknown>;
    quantityOffer?: CartItem["quantityOffer"];
    volumeDiscount?: Record<string, unknown> | null;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  redeemPoints?: boolean;
  useWallet?: boolean;
  walletAmount?: number;
  walletProof?: {
    imageUrl?: string;
    walletNumber?: string;
    transferRef?: string;
  };
}

interface CheckoutPurchaseTrackingItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  attributes: Record<string, string>;
  quantityOffer?: CartItem['quantityOffer'];
}

interface CheckoutPurchaseTrackingState {
  eventId: string;
  orderNumber: string;
  total: number;
  phone: string;
  customerName: string;
  paymentMethod: CheckoutData['paymentMethod'];
  items: CheckoutPurchaseTrackingItem[];
}

interface CheckoutSuccessState {
  id?: string | number;
  orderNumber?: string | number;
  total?: number;
  finalTotal?: number;
  purchaseTracking: CheckoutPurchaseTrackingState;
  [key: string]: unknown;
}

interface CheckoutApiResponse {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
}

const toCheckoutAmount = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const buildCheckoutOrderPayload = (
  data: CheckoutData,
  items: CartItem[],
  subtotal: number,
  companyId?: string | null,
  pixelEventId?: string | null,
  cartId?: string | null,
) => {
  const resolvedSubtotal = toCheckoutAmount(data.subtotal, subtotal);
  const resolvedShippingCost = toCheckoutAmount(data.shippingCost, 0);
  const resolvedTotal = toCheckoutAmount(
    data.total,
    resolvedSubtotal + resolvedShippingCost,
  );
  const attribution = getOrderAttributionPayload(companyId);
  const sessionDetails = getStorefrontSessionDetails(companyId);

  return {
    ...(companyId ? { companyId } : {}),
    ...(pixelEventId ? { pixelEventId } : {}),
    ...(cartId ? { cartId } : {}),
    ...(attribution ? { attribution } : {}),
    ...(sessionDetails ? { sessionDetails } : {}),
    guestName: data.customerName,
    guestEmail: data.email,
    guestPhone: data.phone,
    ...(data.phone2 || data.alternativePhone ? { guestPhone2: data.phone2 || data.alternativePhone } : {}),
    shippingAddress: {
      address: data.address,
      addressLine1: data.address,
      street: data.address,
      city: data.city,
      ...(data.area ? { area: data.area } : {}),
      governorate: data.governorate,
      ...(data.phone2 || data.alternativePhone ? { phone2: data.phone2 || data.alternativePhone } : {}),
    },
    paymentMethod: data.paymentMethod,
    ...(data.couponCode ? { couponCode: data.couponCode } : {}),
    ...(data.redeemPoints ? { redeemPoints: true } : {}),
    ...(data.useWallet && data.walletAmount ? { useWallet: true, walletAmount: data.walletAmount } : {}),
    ...(data.walletProof && data.walletProof.imageUrl ? { walletProof: data.walletProof } : {}),
    notes: data.notes || undefined,
    items: items.map((item) => ({
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      name: item.name,
      price: item.price,
      ...(item.basePrice !== undefined ? { basePrice: item.basePrice } : {}),
      quantity: item.quantity,
      attributes: item.attributes || {},
      ...(item.imageUrl ? { image: item.imageUrl, productImage: item.imageUrl } : {}),
      ...(item.quantityOffer
        ? {
            quantityOffer: item.quantityOffer,
            metadata: {
              quantityOffer: item.quantityOffer,
            },
          }
        : {}),
      ...(Array.isArray(item.volumeDiscounts) && item.volumeDiscounts[0]
        ? { volumeDiscount: item.volumeDiscounts[0] as Record<string, unknown> }
        : {}),
    })),
    subtotal: resolvedSubtotal,
    shippingCost: resolvedShippingCost,
    total: resolvedTotal,
  };
};

export const useCheckout = () => {
  const { items, getSubtotal, clearCart } = useCartStore();
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<CheckoutSuccessState | null>(null);
  const subtotal = getSubtotal();
  const minimumOrder = useMinimumOrderSettings(subtotal, 'EGP');
  const prefersArabicCopy =
    typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl';

  const placeOrder = async (data: CheckoutData) => {
    const companyId = getCompanyId();
    if (items.length === 0) {
      toast.error(prefersArabicCopy ? 'سلتك فارغة.' : 'Your cart is empty.');
      return;
    }

    if (minimumOrder.blocked) {
      toast.error(minimumOrder.message);
      return;
    }

    // ربط السلة بالأوردر مهما كان توقيت الـ debounce الخاص بـ checkout-draft:
    // لو مفيش cartId محفوظ لسه، نعمل حفظ فوري للسلة ونستنى الـ cartId
    // قبل إرسال الأوردر حتى تُحذف السلة ويُسجَّل التحويل الطبيعي.
    const ensureCheckoutCart = async (): Promise<string | null> => {
      const existing = getCartId();
      if (existing) return existing;
      try {
        await storefrontApi.saveCheckoutDraft({
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          governorate: data.governorate,
          notes: data.notes,
          paymentMethod: data.paymentMethod,
          couponCode: data.couponCode || undefined,
          shippingCost: data.shippingCost,
          subtotal: data.subtotal,
          total: data.total,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            attributes: item.attributes || {},
          })),
        });
      } catch {
        // الفشل هنا مش مميت — الأوردر يكمل عادي، المرة الجاية السلة هتتربط
      }
      return getCartId();
    };

    try {
      setIsSubmitting(true);
      const pixelEventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Kashier card payment flow
      if (data.paymentMethod === 'card') {
        const cartId = await ensureCheckoutCart();
        const payload = buildCheckoutOrderPayload(data, items, subtotal, companyId, pixelEventId, cartId);
        const response = await storefrontApi.kashierCheckout(payload);

        if (response.success && response.data?.sessionUrl) {
          persistPurchaseTracking(
            {
              eventId: pixelEventId,
              orderNumber: String(response.data.orderNumber || pixelEventId),
              companyId: companyId || undefined,
              total: Number(payload.total),
              phone: data.phone,
              customerName: data.customerName,
              paymentMethod: 'card',
              items: items.map((item) => ({
                id: item.id || buildCartItemId(item),
                productId: item.productId,
                variantId: item.variantId || undefined,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                imageUrl: item.imageUrl,
                attributes: item.attributes || {},
                quantityOffer: item.quantityOffer || undefined,
              })),
            },
            companyId,
          );
          clearCart();
          resetCheckout();
          window.location.href = response.data.sessionUrl;
        } else {
          toast.error(response.error || 'فشل إنشاء جلسة الدفع.');
        }
        return response;
      }

      // COD / Wallet flow (existing)
      const cartId = await ensureCheckoutCart();
      const payload = buildCheckoutOrderPayload(
        data,
        items,
        subtotal,
        companyId,
        pixelEventId,
        cartId,
      );

      const response = (await storefrontApi.createOrder(payload)) as CheckoutApiResponse;
      const responseData = response.data || {};

      if (response.success) {
        const purchaseTracking = {
          eventId: pixelEventId,
          orderNumber: String(
            responseData.orderNumber || responseData.id || pixelEventId,
          ),
          companyId: companyId || undefined,
          total: Number(
            responseData.finalTotal ??
              responseData.total ??
              payload.total,
          ),
          storePromotionDiscount: responseData.storePromotionDiscount,
          storePromotionLabel: responseData.storePromotionLabel,
          phone: data.phone,
          customerName: data.customerName,
          paymentMethod: data.paymentMethod,
          items: items.map((item) => ({
            id: item.id || buildCartItemId(item),
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
            attributes: item.attributes || {},
            quantityOffer: item.quantityOffer || undefined,
          })),
        };
        persistPurchaseTracking(purchaseTracking, companyId);

        setOrderSuccess({
          ...responseData,
          purchaseTracking,
        });
        setTimeout(() => {
          clearCart();
          resetCheckout();
          toast.success('Order placed successfully!');
        }, 0);
      } else {
        toast.error(response.message || 'Failed to place order.');
      }

      return response;
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred during checkout.';
      toast.error(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    placeOrder,
    isSubmitting,
    orderSuccess,
  };
};
