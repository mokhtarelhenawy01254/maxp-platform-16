import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  checkoutFormSettingsService,
  CheckoutFormSettingsUpdate,
} from "../services/checkoutFormSettingsService";
import {
  DEFAULT_CHECKOUT_FORM_SETTINGS,
  normalizeCheckoutFormSettings,
} from "../constants/checkoutFormDefaults";

interface UseCheckoutFormSettingsOptions {
  enabled?: boolean;
}

export { DEFAULT_CHECKOUT_FORM_SETTINGS };

const extractSettingsPayload = (input: unknown): CheckoutFormSettingsUpdate => {
  if (!input || typeof input !== "object") {
    return {} as CheckoutFormSettingsUpdate;
  }

  const maybeData = (input as { data?: unknown }).data;
  if (maybeData && typeof maybeData === "object") {
    const nested = (maybeData as { data?: unknown }).data;
    if (nested && typeof nested === "object") {
      return nested as CheckoutFormSettingsUpdate;
    }
    return maybeData as CheckoutFormSettingsUpdate;
  }

  return input as CheckoutFormSettingsUpdate;
};

const buildUpdatePayload = (
  source: CheckoutFormSettingsUpdate,
): CheckoutFormSettingsUpdate => ({
  showGuestName: source.showGuestName,
  requireGuestName: source.requireGuestName,
  showGuestPhone: source.showGuestPhone,
  requireGuestPhone: source.requireGuestPhone,
  showGuestEmail: source.showGuestEmail,
  requireGuestEmail: source.requireGuestEmail,
  showCity: source.showCity,
  requireCity: source.requireCity,
  showShippingAddress: source.showShippingAddress,
  requireShippingAddress: source.requireShippingAddress,
  showPaymentMethod: source.showPaymentMethod,
  showNotes: source.showNotes,
});

export const useCheckoutFormSettings = (
  options: UseCheckoutFormSettingsOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const [settings, setSettings] =
    useState<CheckoutFormSettingsUpdate | null>(null);
  const settingsRef = useRef<CheckoutFormSettingsUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applySettings = useCallback(
    (partial: Partial<CheckoutFormSettingsUpdate>) => {
      const merged = normalizeCheckoutFormSettings({
        ...(settingsRef.current || {}),
        ...partial,
      });
      settingsRef.current = merged;
      setSettings(merged);
    },
    [],
  );

  const loadSettings = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const response = await checkoutFormSettingsService.getSettings();
      const raw = extractSettingsPayload(response?.data);
      const normalized = normalizeCheckoutFormSettings(raw);
      settingsRef.current = normalized;
      setSettings(normalized);
    } catch (error) {
      console.error("Error loading checkout form settings:", error);
      toast.error("خطأ في تحميل إعدادات الشيك أوت");
      const fallback = normalizeCheckoutFormSettings(null);
      settingsRef.current = fallback;
      setSettings(fallback);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setSettings(null);
      settingsRef.current = null;
      setLoading(false);
      return;
    }

    void loadSettings();
  }, [enabled, loadSettings]);

  const handleSave = async (
    updatedSettings?: CheckoutFormSettingsUpdate | unknown,
    options: { silent?: boolean } = {},
  ) => {
    if (!enabled) return false;

    const dataToSave =
      updatedSettings &&
      typeof updatedSettings === "object" &&
      !("nativeEvent" in updatedSettings) &&
      !(updatedSettings instanceof Event)
        ? (updatedSettings as CheckoutFormSettingsUpdate)
        : settingsRef.current;

    if (!dataToSave) return false;

    try {
      setSaving(true);
      const normalized = normalizeCheckoutFormSettings(dataToSave);
      const payload = buildUpdatePayload(normalized);
      await checkoutFormSettingsService.updateSettings(payload);
      if (!options.silent) {
        toast.success("تم حفظ الإعدادات بنجاح");
      }
      await loadSettings();
      return true;
    } catch (error) {
      console.error("Error saving checkout form settings:", error);
      if (!options.silent) {
        toast.error("خطأ في حفظ إعدادات الشيك أوت");
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!enabled) return;
    if (!window.confirm("هل أنت متأكد من إعادة تعيين إعدادات الشيك أوت؟")) {
      return;
    }

    try {
      setSaving(true);
      await checkoutFormSettingsService.resetSettings();
      toast.success("تم إعادة تعيين الإعدادات بنجاح");
      await loadSettings();
    } catch (error) {
      console.error("Error resetting checkout form settings:", error);
      toast.error("خطأ في إعادة تعيين إعدادات الشيك أوت");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (
    key: keyof CheckoutFormSettingsUpdate,
    value: boolean,
  ) => {
    applySettings({ [key]: value });
  };

  return {
    settings,
    loading,
    saving,
    updateSetting,
    applySettings,
    handleSave,
    handleReset,
    loadSettings,
  };
};
