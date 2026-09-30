import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import {
  InvoicePrintSettings,
  DEFAULT_INVOICE_SETTINGS,
} from "../types/invoiceSettings";

let cachedInvoiceSettings: InvoicePrintSettings | null = null;
let inflightInvoiceSettingsPromise: Promise<InvoicePrintSettings> | null = null;

export const clearInvoiceSettingsCache = () => {
  cachedInvoiceSettings = null;
  inflightInvoiceSettingsPromise = null;
};

export const setCachedInvoiceSettings = (settings: InvoicePrintSettings) => {
  cachedInvoiceSettings = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
};

export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoicePrintSettings>(
    cachedInvoiceSettings || DEFAULT_INVOICE_SETTINGS,
  );
  const [loading, setLoading] = useState(!cachedInvoiceSettings);

  const fetchSettings = useCallback(async (force = false) => {
    if (cachedInvoiceSettings && !force) {
      setSettings(cachedInvoiceSettings);
      setLoading(false);
      return cachedInvoiceSettings;
    }

    if (!inflightInvoiceSettingsPromise || force) {
      inflightInvoiceSettingsPromise = apiClient
        .get("/order-invoice-settings")
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            const merged = { ...DEFAULT_INVOICE_SETTINGS, ...res.data.data };
            cachedInvoiceSettings = merged;
            return merged;
          }
          return cachedInvoiceSettings || DEFAULT_INVOICE_SETTINGS;
        })
        .catch(() => {
          return cachedInvoiceSettings || DEFAULT_INVOICE_SETTINGS;
        })
        .finally(() => {
          inflightInvoiceSettingsPromise = null;
        });
    }

    try {
      const resolved = await inflightInvoiceSettingsPromise;
      setSettings(resolved);
      return resolved;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedInvoiceSettings) {
      void fetchSettings();
    }
  }, [fetchSettings]);

  const mergeSettings = useCallback(
    (overrides?: Partial<InvoicePrintSettings>): InvoicePrintSettings => ({
      ...settings,
      ...(overrides || {}),
    }),
    [settings],
  );

  return { settings, loading, mergeSettings, refetch: () => fetchSettings(true) };
}
