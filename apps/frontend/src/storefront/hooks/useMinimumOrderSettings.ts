import { useEffect, useMemo, useState } from "react";
import { storefrontApi } from "../../utils/storefrontApi";
import { formatStorefrontCurrency } from "../utils/currency";

export interface MinimumOrderSettings {
  enabled: boolean;
  amount: number;
  message: string;
}

const DEFAULT_MINIMUM_ORDER_MESSAGE =
  "الحد الأدنى للطلبات هو {amount}. أضف منتجات بقيمة {remaining} لإتمام الطلب.";

const formatMinimumOrderMessage = (
  template: string,
  amount: number,
  remaining: number,
  currency: string,
) =>
  (template || DEFAULT_MINIMUM_ORDER_MESSAGE)
    .replace(/\{amount\}/g, formatStorefrontCurrency(amount, currency))
    .replace(/\{remaining\}/g, formatStorefrontCurrency(remaining, currency));

let _cachedSettingsPromise: Promise<MinimumOrderSettings | null> | null = null;
let _cachedSettingsValue: MinimumOrderSettings | null = null;
let _cachedSettingsTimestamp = 0;
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedMinimumOrderSettings = async (): Promise<MinimumOrderSettings | null> => {
  const now = Date.now();
  if (_cachedSettingsValue && now - _cachedSettingsTimestamp < SETTINGS_CACHE_TTL_MS) {
    return _cachedSettingsValue;
  }
  if (_cachedSettingsPromise) {
    return _cachedSettingsPromise;
  }

  _cachedSettingsPromise = (async () => {
    try {
      const response = await storefrontApi.getMinimumOrderSettings();
      const data = response?.data || {};
      if (response?.success) {
        _cachedSettingsValue = {
          enabled: Boolean(data.enabled),
          amount: Number(data.amount || 0),
          message: String(data.message || DEFAULT_MINIMUM_ORDER_MESSAGE),
        };
        _cachedSettingsTimestamp = Date.now();
        return _cachedSettingsValue;
      }
      return null;
    } catch (error) {
      console.error("Error fetching minimum order settings:", error);
      return null;
    } finally {
      _cachedSettingsPromise = null;
    }
  })();

  return _cachedSettingsPromise;
};

export interface UseMinimumOrderSettingsOptions {
  enabled?: boolean;
}

export const useMinimumOrderSettings = (
  subtotal: number,
  currency = "EGP",
  options?: UseMinimumOrderSettingsOptions,
) => {
  const isEnabled = options?.enabled ?? true;
  const [settings, setSettings] = useState<MinimumOrderSettings | null>(
    _cachedSettingsValue,
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      try {
        if (_cachedSettingsValue && Date.now() - _cachedSettingsTimestamp < SETTINGS_CACHE_TTL_MS) {
          setSettings(_cachedSettingsValue);
          return;
        }

        setIsLoading(true);
        const data = await getCachedMinimumOrderSettings();

        if (!cancelled && data) {
          setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching minimum order settings:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [isEnabled]);

  return useMemo(() => {
    const amount = Number(settings?.amount || 0);
    const currentSubtotal = Number(subtotal || 0);
    const remaining = Math.max(0, amount - currentSubtotal);
    const enabled = Boolean(settings?.enabled && amount > 0);
    const blocked = enabled && currentSubtotal < amount;

    return {
      settings,
      isLoading,
      enabled,
      blocked,
      amount,
      remaining,
      progress:
        enabled && amount > 0
          ? Math.min((currentSubtotal / amount) * 100, 100)
          : 0,
      message: formatMinimumOrderMessage(
        settings?.message || DEFAULT_MINIMUM_ORDER_MESSAGE,
        amount,
        remaining,
        currency,
      ),
    };
  }, [currency, isLoading, settings, subtotal]);
};
