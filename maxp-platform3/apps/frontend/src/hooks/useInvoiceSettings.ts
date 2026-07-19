import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import {
  InvoicePrintSettings,
  DEFAULT_INVOICE_SETTINGS,
} from "../components/orders/InvoiceContent";

export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoicePrintSettings>(DEFAULT_INVOICE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiClient.get("/order-invoice-settings");
      if (res.data?.success && res.data?.data) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch {
      // use defaults silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const mergeSettings = useCallback(
    (overrides?: Partial<InvoicePrintSettings>): InvoicePrintSettings => ({
      ...settings,
      ...(overrides || {}),
    }),
    [settings],
  );

  return { settings, loading, mergeSettings };
}
