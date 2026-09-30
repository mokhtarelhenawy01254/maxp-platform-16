import { useEffect, useState } from "react";
import { useInvoiceSettings } from "./useInvoiceSettings";
import { storefrontSettingsService } from "../services/storefrontSettingsService";
import { getPdpQuickOrderSettingsFromDesignTokens } from "../storefront/utils/pdpQuickOrderSettings";
import { InvoicePrintSettings } from "../components/orders/InvoiceContent";

export interface OrderCustomFieldsConfig {
  isEnabled: boolean;
  label: string;
  placeholder: string;
  source: "invoice" | "storefront" | "none";
  loading: boolean;
}

export interface UseOrderCustomFieldsConfigOptions {
  invoiceSettings?: InvoicePrintSettings | null;
  overrideConfig?: {
    isEnabled?: boolean;
    label?: string;
    placeholder?: string;
  } | null;
}

export function useOrderCustomFieldsConfig(
  options?: UseOrderCustomFieldsConfigOptions,
): { config: OrderCustomFieldsConfig } {
  const { settings: fetchedInvoiceSettings, loading: invoiceLoading } = useInvoiceSettings();
  const effectiveInvoiceSettings = options?.invoiceSettings ?? fetchedInvoiceSettings;

  const [storefrontLoading, setStorefrontLoading] = useState(true);
  const [storefrontCustomField, setStorefrontCustomField] = useState<{
    enabled: boolean;
    label: string;
    placeholder: string;
  }>({
    enabled: false,
    label: "",
    placeholder: "",
  });

  useEffect(() => {
    let isMounted = true;
    void storefrontSettingsService
      .getSettings()
      .then((res) => {
        if (!isMounted) return;
        const tokens = res.data?.designTokens;
        const pdpSettings = getPdpQuickOrderSettingsFromDesignTokens(tokens);
        if (pdpSettings?.customField) {
          setStorefrontCustomField({
            enabled: Boolean(pdpSettings.customField.enabled),
            label: pdpSettings.customField.label || "",
            placeholder: pdpSettings.customField.placeholder || "",
          });
        }
      })
      .catch(() => {
        // silently fallback
      })
      .finally(() => {
        if (isMounted) setStorefrontLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (options?.overrideConfig) {
    return {
      config: {
        isEnabled: Boolean(options.overrideConfig.isEnabled),
        label: options.overrideConfig.label || "",
        placeholder: options.overrideConfig.placeholder || "",
        source: options.overrideConfig.isEnabled ? "invoice" : "none",
        loading: false,
      },
    };
  }

  const invoiceShow = Boolean(effectiveInvoiceSettings?.showCustomFields);
  const storefrontShow = Boolean(storefrontCustomField.enabled);
  const isEnabled = invoiceShow || storefrontShow;

  const label = storefrontShow && storefrontCustomField.label
    ? storefrontCustomField.label
    : "";
  const placeholder = storefrontShow && storefrontCustomField.placeholder
    ? storefrontCustomField.placeholder
    : "";

  const source = invoiceShow ? "invoice" : storefrontShow ? "storefront" : "none";

  return {
    config: {
      isEnabled,
      label,
      placeholder,
      source,
      loading: invoiceLoading || storefrontLoading,
    },
  };
}
