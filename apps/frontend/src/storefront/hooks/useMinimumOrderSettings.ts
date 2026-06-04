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

export const useMinimumOrderSettings = (
  subtotal: number,
  currency = "EGP",
) => {
  const [settings, setSettings] = useState<MinimumOrderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await storefrontApi.getMinimumOrderSettings();
        const data = response?.data || {};

        if (!cancelled && response?.success) {
          setSettings({
            enabled: Boolean(data.enabled),
            amount: Number(data.amount || 0),
            message: String(data.message || DEFAULT_MINIMUM_ORDER_MESSAGE),
          });
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
  }, []);

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
