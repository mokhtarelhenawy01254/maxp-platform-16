import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import {
  InvoicePrintSettings,
  DEFAULT_INVOICE_SETTINGS,
} from "../types/invoiceSettings";
import { tokenManager } from "../utils/tokenManager";

const cachedInvoiceSettingsByCompany: Record<string, InvoicePrintSettings> = {};
let inflightInvoiceSettingsPromise: Promise<InvoicePrintSettings> | null = null;
let inflightCompanyId: string | null = null;

export const clearInvoiceSettingsCache = (companyId?: string) => {
  if (companyId) {
    delete cachedInvoiceSettingsByCompany[companyId];
  } else {
    for (const k of Object.keys(cachedInvoiceSettingsByCompany)) {
      delete cachedInvoiceSettingsByCompany[k];
    }
  }
  inflightInvoiceSettingsPromise = null;
  inflightCompanyId = null;
};

export const setCachedInvoiceSettings = (settings: InvoicePrintSettings, companyId?: string) => {
  const merged = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
  const user = tokenManager.getUser();
  const targetCompany = companyId || user?.companyId || (user as any)?.company?.id || "default";
  cachedInvoiceSettingsByCompany[targetCompany] = merged;
};

export function useInvoiceSettings() {
  const user = tokenManager.getUser();
  const currentCompanyId = user?.companyId || (user as any)?.company?.id || "default";
  const cachedForCurrent = cachedInvoiceSettingsByCompany[currentCompanyId];

  const [settings, setSettings] = useState<InvoicePrintSettings>(
    cachedForCurrent || DEFAULT_INVOICE_SETTINGS,
  );
  const [loading, setLoading] = useState(!cachedForCurrent);

  const fetchSettings = useCallback(async (force = false) => {
    const currentUser = tokenManager.getUser();
    const activeCompany = currentUser?.companyId || (currentUser as any)?.company?.id || "default";
    const cached = cachedInvoiceSettingsByCompany[activeCompany];
    if (cached && !force) {
      setSettings(cached);
      setLoading(false);
      return cached;
    }

    if (!inflightInvoiceSettingsPromise || force || inflightCompanyId !== activeCompany) {
      inflightCompanyId = activeCompany;
      inflightInvoiceSettingsPromise = apiClient
        .get("/order-invoice-settings")
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            const merged = { ...DEFAULT_INVOICE_SETTINGS, ...res.data.data };
            cachedInvoiceSettingsByCompany[activeCompany] = merged;
            return merged;
          }
          return cachedInvoiceSettingsByCompany[activeCompany] || DEFAULT_INVOICE_SETTINGS;
        })
        .catch(() => {
          return cachedInvoiceSettingsByCompany[activeCompany] || DEFAULT_INVOICE_SETTINGS;
        })
        .finally(() => {
          inflightInvoiceSettingsPromise = null;
          inflightCompanyId = null;
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
    const currentUser = tokenManager.getUser();
    const activeCompany = currentUser?.companyId || (currentUser as any)?.company?.id || "default";
    if (!cachedInvoiceSettingsByCompany[activeCompany]) {
      void fetchSettings();
    } else {
      setSettings(cachedInvoiceSettingsByCompany[activeCompany]);
      setLoading(false);
    }
  }, [currentCompanyId, fetchSettings]);

  const mergeSettings = useCallback(
    (overrides?: Partial<InvoicePrintSettings>): InvoicePrintSettings => ({
      ...settings,
      ...(overrides || {}),
    }),
    [settings],
  );

  return { settings, loading, mergeSettings, refetch: () => fetchSettings(true) };
}
