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

interface CheckoutStore {
  formData: CheckoutFormData;
  paymentMethod: 'cod' | 'card' | 'wallet';
  appliedCoupon: AppliedCheckoutCoupon | null;
  
  // Actions
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  setPaymentMethod: (method: 'cod' | 'card' | 'wallet') => void;
  setAppliedCoupon: (coupon: AppliedCheckoutCoupon | null) => void;
  clearAppliedCoupon: () => void;
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

      resetCheckout: () => {
        set({ formData: initialFormData, paymentMethod: 'cod', appliedCoupon: null });
      },
    }),
    {
      name: "sf-checkout-storage",
      storage: createJSONStorage(() => sessionStorage), // Use session storage for checkout draft
    }
  )
);
