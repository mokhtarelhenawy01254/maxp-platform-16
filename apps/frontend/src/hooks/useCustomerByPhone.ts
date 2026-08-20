import { useEffect, useRef, useState } from "react";
import { apiClient } from "../services/apiClient";

export interface CustomerLookupResult {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  governorate?: string | null;
  city?: string | null;
  area?: string | null;
  notes?: string | null;
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
 * 1. Finds the registered customer (name/phone/notes) using phone normalization.
 * 2. Pulls the latest order's shipping details (governorate, city, address),
 *    because address data is stored on orders, not on the customer record.
 *
 * Returns null when nothing meaningful was found.
 */
export async function lookupCustomerByPhone(
  phone: string,
): Promise<CustomerLookupResult | null> {
  const query = toDigits(phone);
  if (query.length < 9) return null;

  try {
    const response = await apiClient.get(
      `/customers/by-phone/${encodeURIComponent(phone)}`,
    );

    if (!response.data?.success) return null;

    const { customer, latestOrder } = response.data.data || {};

    if (!customer && !latestOrder) return null;

    const governorate =
      latestOrder?.governorate || latestOrder?.city || customer?.governorate || customer?.city || null;
    const areaCity =
      latestOrder?.city ||
      customer?.area ||
      customer?.city ||
      null;
    const area = areaCity && areaCity !== governorate ? areaCity : null;
    const address =
      latestOrder?.address ||
      customer?.address ||
      null;
    const notes = customer?.notes || latestOrder?.notes || null;

    return {
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      phone: customer?.phone || latestOrder?.customerPhone || null,
      address,
      governorate,
      city: latestOrder?.city || customer?.city || null,
      area,
      notes,
    };
  } catch {
    return null;
  }
}

/**
 * Debounced customer lookup by phone. Returns the latest lookup result and a
 * boolean indicating an in-flight search. Only fires for complete numbers and
 * cancels stale requests when the phone changes.
 */
export function useCustomerByPhone(phone: string, delay = 800) {
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
      const found = await lookupCustomerByPhone(phone);
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
  }, [phone, delay]);

  return { customer: result, searching };
}
