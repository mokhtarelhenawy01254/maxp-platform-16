import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CheckoutFormData {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
  notes?: string;
  deliverySlot?: string;
}

export interface AppliedCheckoutCoupon {
  code: string;
  name?: string;
  discountAmount: number;
  finalAmount?: number;
  orderAmount?: number;
}

export interface StorefrontTierProgress {
  method: string;
  metricLabel: string;
  currentMetric: number;
  tier: {
    id: string;
    name?: string;
    nameAr?: string;
    color?: string;
    icon?: string;
    benefits?: any;
  } | null;
  nextTier: {
    id: string;
    name?: string;
    nameAr?: string;
    color?: string;
    targetMetric: number;
    remainingMetric: number;
    benefits?: any;
  } | null;
  rewards: {
    freeShipping: boolean;
    discountPercent: number;
  };
  activeVoucher: {
    id: string;
    percent: number;
    amount: number;
    expiresAt: string;
  } | null;
  walletBalance: number;
  loyaltySystem: string;
}

interface CheckoutStore {
  formData: CheckoutFormData;
  paymentMethod: 'cod' | 'card' | 'wallet';
  appliedCoupon: AppliedCheckoutCoupon | null;
  tierProgress: StorefrontTierProgress | null;

  // Actions
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  setPaymentMethod: (method: 'cod' | 'card' | 'wallet') => void;
  setAppliedCoupon: (coupon: AppliedCheckoutCoupon | null) => void;
  clearAppliedCoupon: () => void;
  setTierProgress: (progress: StorefrontTierProgress | null) => void;
  resetCheckout: () => void;
}

const initialFormData: CheckoutFormData = {
  customerName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  governorate: "",
  notes: "",
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: initialFormData,
      paymentMethod: 'cod',
      appliedCoupon: null,
      tierProgress: null,

      updateFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      setPaymentMethod: (method) => {
        set({ paymentMethod: method });
      },

      setAppliedCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },

      clearAppliedCoupon: () => {
        set({ appliedCoupon: null });
      },

      setTierProgress: (progress) => {
        set({ tierProgress: progress });
      },

      resetCheckout: () => {
        set({ formData: initialFormData, paymentMethod: 'cod', appliedCoupon: null, tierProgress: null });
      },
    }),
    {
      name: "sf-checkout-storage",
      storage: createJSONStorage(() => sessionStorage), // Use session storage for checkout draft
    }
  )
);
