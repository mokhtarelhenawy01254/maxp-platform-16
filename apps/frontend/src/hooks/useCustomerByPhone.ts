import { useEffect, useRef, useState } from "react";
import { apiClient } from "../services/apiClient";

export interface EligiblePreviousOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  total: number;
  createdAt: string;
  orderItems?: Array<{
    id: string;
    productName: string;
    productColor?: string | null;
    productSize?: string | null;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export interface PreviousOrderItem {
  id?: string | null;
  productId?: string | null;
  name?: string;
  productName: string;
  productColor?: string | null;
  productSize?: string | null;
  quantity: number;
  price: number;
  total: number;
  image?: string | null;
}

export interface PreviousOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  governorate?: string | null;
  city?: string | null;
  area?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  conversationId?: string | null;
  sourceType?: string | null;
  createdAt: string;
  orderItems: PreviousOrderItem[];
}

export interface ExchangeReturnPolicy {
  requirePreviousOrder: boolean;
  allowedStatuses: string[];
  timeLimitDays: number;
  requireExplicitOrderLink: boolean;
}

export interface CustomerLookupResult {
  id?: string | null;
  firstName: string;
  lastName: string;
  name?: string;
  phone?: string | null;
  phone2?: string | null;
  phoneNormalized?: string | null;
  email?: string | null;
  address?: string | null;
  governorate?: string | null;
  city?: string | null;
  area?: string | null;
  notes?: string | null;
  tags?: string[];
  customerRating?: string;
  status?: string;
  totalOrdersCount?: number;
  totalDelivered?: number;
  deliveryRate?: number;
  successScore?: number;
  previousOrders?: PreviousOrder[];
  eligiblePreviousOrders?: EligiblePreviousOrder[];
  exchangeReturnPolicy?: ExchangeReturnPolicy;
}

const toDigits = (value?: string | null): string =>
  (value || "").replace(/\D/g, "");

const stripCountryCode = (digits: string): string => {
  if (digits.startsWith("20") && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const normalizePhoneDigits = (phone?: string | null): string => {
  const stripped = stripCountryCode(toDigits(phone));
  return stripped;
};

/**
 * Compares two phone numbers ignoring spaces, country codes and the leading 0.
 * Returns true when both normalized numbers share the same trailing digits
 * (at least 9), which is enough to confirm the same Egyptian mobile number.
 */
export const phonesMatch = (
  a?: string | null,
  b?: string | null,
): boolean => {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  const min = Math.min(da.length, db.length);
  return min >= 9 && da.slice(-min) === db.slice(-min);
};

/**
 * Looks up a customer by phone number.
 *
 * Uses the dedicated backend endpoint `/customers/by-phone/:phone` which:
 * 1. Finds the registered customer (name/phone/notes/ratings/tags) using phone normalization.
 * 2. Pulls all previous orders (previousOrders) for this customer/phone/conversation.
 * 3. Pulls clean location details (governorate, city, address) from historical records.
 *
 * Returns null when nothing meaningful was found.
 */
export async function lookupCustomerByPhone(
  phone: string,
  conversationId?: string | null,
): Promise<CustomerLookupResult | null> {
  const query = toDigits(phone);
  if (query.length < 9) return null;

  try {
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const response = await apiClient.get(
      `/customers/by-phone/${encodeURIComponent(phone)}${queryString}`,
    );

    if (!response.data?.success) return null;

    const { customer, latestOrder, previousOrders, eligiblePreviousOrders, exchangeReturnPolicy } =
      response.data.data || {};

    if (!customer && !latestOrder && (!previousOrders || previousOrders.length === 0)) {
      if (exchangeReturnPolicy) {
        return {
          firstName: "",
          lastName: "",
          phone: null,
          address: null,
          governorate: null,
          city: null,
          area: null,
          notes: null,
          previousOrders: [],
          eligiblePreviousOrders: eligiblePreviousOrders || [],
          exchangeReturnPolicy,
        };
      }
      return null;
    }

    const governorate =
      latestOrder?.governorate || customer?.governorate || latestOrder?.city || customer?.city || null;
    const areaCity =
      latestOrder?.area ||
      latestOrder?.city ||
      customer?.area ||
      customer?.city ||
      null;
    const area = areaCity && areaCity !== governorate ? areaCity : (customer?.area || null);
    const address =
      latestOrder?.address ||
      customer?.address ||
      null;
    const notes = customer?.notes || latestOrder?.notes || null;

    return {
      id: customer?.id || latestOrder?.customerId || null,
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      name: customer?.name || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || latestOrder?.customerName || "",
      phone: customer?.phone || latestOrder?.customerPhone || phone,
      phone2: customer?.phone2 || null,
      phoneNormalized: customer?.phoneNormalized || null,
      email: customer?.email || null,
      address,
      governorate,
      city: latestOrder?.city || customer?.city || null,
      area,
      notes,
      tags: customer?.tags || [],
      customerRating: customer?.customerRating || "UNKNOWN",
      status: customer?.status || "ACTIVE",
      totalOrdersCount: customer?.totalOrdersCount ?? (previousOrders?.length || 0),
      totalDelivered: customer?.totalDelivered ?? 0,
      deliveryRate: customer?.deliveryRate ?? 0,
      successScore: customer?.successScore ?? 0,
      previousOrders: previousOrders || [],
      eligiblePreviousOrders: eligiblePreviousOrders || [],
      exchangeReturnPolicy,
    };
  } catch (error) {
    console.error("Error in lookupCustomerByPhone:", error);
    return null;
  }
}

/**
 * Debounced customer lookup by phone. Returns the latest lookup result and a
 * boolean indicating an in-flight search. Only fires for complete numbers and
 * cancels stale requests when the phone changes.
 */
export function useCustomerByPhone(phone: string, delay = 250, conversationId?: string | null) {
  const [result, setResult] = useState<CustomerLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const digits = toDigits(phone);
    if (digits.length < 9) {
      setResult(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const currentRequest = ++requestId.current;
    const timeoutId = window.setTimeout(async () => {
      const found = await lookupCustomerByPhone(phone, conversationId);
      if (currentRequest === requestId.current) {
        setResult(found);
        setSearching(false);
      }
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (currentRequest === requestId.current) {
        setSearching(false);
      }
    };
  }, [phone, delay, conversationId]);

  return { customer: result, searching };
}
