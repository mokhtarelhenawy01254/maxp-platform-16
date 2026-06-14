import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { storefrontApi } from "../utils/storefrontApi";
import type {
  CheckoutFormData,
  AppliedCoupon,
  ShippingMethod,
} from "../types/StorefrontTypes";

const INITIAL_FORM: CheckoutFormData = {
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  governorate: "",
  city: "",
  shippingAddress: "",
  notes: "",
  paymentMethod: "CASH",
  couponCode: "",
};

type WalletBalanceResponse = {
  success?: boolean;
  data?: {
    balance?: number;
  };
};

type ShippingCalculationResponse = {
  success?: boolean;
  data?: {
    methods?: ShippingMethod[];
  };
};

type CouponValidationResponse = {
  success?: boolean;
  error?: string;
  data?: {
    discountAmount?: number;
    coupon?: {
      code?: string;
      name?: string;
      type?: string;
    };
  };
};

export interface UseCheckoutOptions {
  subtotal: number;
  companyId: string;
  onSuccess?: (response: unknown) => void;
  onError?: (error: string) => void;
}

export const useCheckout = ({
  subtotal,
  companyId,
  onSuccess,
  onError,
}: UseCheckoutOptions) => {
  const [form, setForm] = useState<CheckoutFormData>(INITIAL_FORM);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof CheckoutFormData, string>>
  >({});
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const { data: walletData, isLoading: walletLoading } =
    useQuery<WalletBalanceResponse>({
      queryKey: ["wallet-balance"],
      queryFn: () => storefrontApi.getWalletBalance(),
      enabled: Boolean(companyId),
    });

  const walletBalance =
    walletData?.success ? Number(walletData.data?.balance) || 0 : 0;

  const updateField = useCallback(
    <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setValidationErrors((prev) => {
        if (!prev[field]) {
          return prev;
        }

        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof CheckoutFormData, string>> = {};

    if (!form.guestName?.trim()) errors.guestName = "الاسم مطلوب";
    if (!form.guestPhone?.trim()) errors.guestPhone = "رقم الهاتف مطلوب";
    if (!form.governorate?.trim()) errors.governorate = "المحافظة مطلوبة";
    if (!form.shippingAddress?.trim()) {
      errors.shippingAddress = "عنوان الشحن مطلوب";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const calculateShipping = useCallback(async (governorate: string) => {
    if (!governorate) {
      setShippingCost(0);
      setShippingMethods([]);
      setSelectedShippingMethodId("");
      return;
    }

    try {
      const data =
        (await storefrontApi.calculateShipping(
          governorate,
        )) as ShippingCalculationResponse;
      const responseMethods = data.data?.methods;
      const methods = Array.isArray(responseMethods) ? responseMethods : [];

      if (data.success && methods.length > 0) {
        setShippingMethods(methods);
        setSelectedShippingMethodId(methods[0]?.id || "");
        setShippingCost(Number(methods[0]?.cost) || 0);
        return;
      }

      setShippingMethods([]);
      setSelectedShippingMethodId("");
      setShippingCost(0);
    } catch {
      setShippingCost(0);
    }
  }, []);

  useEffect(() => {
    if (form.governorate) {
      void calculateShipping(form.governorate);
    }
  }, [calculateShipping, form.governorate]);

  const validateCoupon = useCallback(async () => {
    if (!form.couponCode?.trim()) {
      return;
    }

    setCouponLoading(true);

    try {
      const response = (await storefrontApi.validateCoupon(
        companyId,
        form.couponCode,
        subtotal,
      )) as CouponValidationResponse;

      if (response.success) {
        setAppliedCoupon({
          code: response.data?.coupon?.code || form.couponCode,
          name: response.data?.coupon?.name,
          discountAmount: Number(response.data?.discountAmount) || 0,
          type: response.data?.coupon?.type,
        });
        toast.success("تم تطبيق الكوبون بنجاح");
      } else {
        toast.error(response.error || "كوبون غير صالح");
      }
    } catch {
      toast.error("خطأ في التحقق من الكوبون");
    } finally {
      setCouponLoading(false);
    }
  }, [companyId, form.couponCode, subtotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    updateField("couponCode", "");
  }, [updateField]);

  const discount = appliedCoupon?.discountAmount || 0;
  const totalBeforeWallet = Math.max(0, subtotal + shippingCost - discount);
  const walletApplied = useWallet
    ? Math.min(
        walletBalance,
        walletAmountToUse || walletBalance,
        totalBeforeWallet,
      )
    : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletApplied);

  const submitMutation = useMutation<unknown, Error>({
    mutationFn: async () => {
      if (!validate()) {
        throw new Error("يرجى ملء البيانات المطلوبة");
      }

      const pixelId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      return storefrontApi.createOrder({
        ...form,
        pixelEventId: pixelId,
        useWallet,
        walletAmount: walletApplied,
        shippingAddress: {
          governorate: form.governorate,
          city: form.city || "",
          street: form.shippingAddress,
        },
      });
    },
    onSuccess: (response) => onSuccess?.(response),
    onError: (error) => {
      const message = error.message || "فشل إنشاء الطلب";
      toast.error(message);
      onError?.(message);
    },
  });

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
    }

    draftTimer.current = setTimeout(() => {
      void storefrontApi.saveCheckoutDraft({
        ...form,
        selectedShippingMethod: selectedShippingMethodId,
      });
    }, 2000);

    return () => {
      if (draftTimer.current) {
        clearTimeout(draftTimer.current);
      }
    };
  }, [companyId, form, selectedShippingMethodId]);

  return {
    form,
    updateField,
    shippingCost,
    shippingMethods,
    selectedShippingMethodId,
    setSelectedShippingMethodId: (id: string) => {
      const method = shippingMethods.find((entry) => entry.id === id);
      setSelectedShippingMethodId(id);
      if (method) {
        setShippingCost(Number(method.cost) || 0);
      }
    },
    subtotal,
    discount,
    total: finalTotal,
    isSubmitting: submitMutation.isPending,
    validationErrors,
    appliedCoupon,
    validateCoupon,
    removeCoupon,
    couponLoading,
    walletBalance,
    walletLoading,
    useWallet,
    setUseWallet,
    walletAmountToUse,
    setWalletAmountToUse,
    submit: () => submitMutation.mutate(),
    submitAsync: () => submitMutation.mutateAsync(),
  };
};
