import { CartItem } from "../types";
import { CustomerBlockEvaluation } from "../../../../../services/customerBlocklistService";
import {
  EligiblePreviousOrder,
  ExchangeReturnPolicy,
} from "../../../../../hooks/useCustomerByPhone";

export const EGYPTIAN_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
];

export const normalizeLocationLabel = (value: string | null | undefined) =>
  String(value || "").replace(/^\d+:/, "").trim();

export const buildVariantSummary = (item: CartItem) => {
  const baseSummary = [item.color, item.size].filter(Boolean).join(" / ");
  if (item.variantName && item.variantName !== baseSummary) {
    return item.variantName;
  }
  return baseSummary;
};

export interface CheckoutColumnProps {
  cartItems: CartItem[];
  onClearCart?: () => void;
  initialWholesaleCustomer?: {
    id: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    governorate?: string;
    area?: string;
    creditLimit?: number;
    currentBalance?: number;
  } | null;
}

export interface GovernmentOption {
  id: number;
  name: string;
}

export interface AreaOption {
  id: number;
  name: string;
}

export interface ShippingInfo {
  zoneId: string | null;
  price: number;
  deliveryTime: string;
  governorate: string | null;
}

export interface CouponInfo {
  id: string;
  code: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
}

export interface TurboLocationApiItem {
  id?: number | string;
  name?: string | null;
}

export interface ApiErrorPayload {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const payload = error as ApiErrorPayload;
  return payload.response?.data?.message || payload.response?.data?.error || fallback;
};
