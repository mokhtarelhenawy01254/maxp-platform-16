import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Settings } from "../types";
import tokenManager from "../../../utils/tokenManager";

export const useWooCommerceSettings = () => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsList, setSettingsList] = useState<Settings[]>([]);
  const [selectedSettingsId, setSelectedSettingsId] = useState<string | null>(
    null,
  );
  const [settingsForm, setSettingsForm] = useState({
    id: "",
    storeUrl: "",
    consumerKey: "",
    consumerSecret: "",
    syncEnabled: false,
    syncDirection: "both",
    syncInterval: 15,
    autoImport: false,
    autoExport: false,
    webhookEnabled: false,
    webhookSecret: "",
    statusMapping: {} as Record<string, string>,
  });

  // Ngrok URL state (for local development webhooks)
  const [ngrokUrl, setNgrokUrl] = useState(() => {
    return localStorage.getItem("woocommerce_ngrok_url") || "";
  });
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/woocommerce/settings", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : [data.data];
        setSettingsList(list);

        // If we have items and none selected, select first
        if (list.length > 0 && !selectedSettingsId) {
          const first = list[0];
          setSelectedSettingsId(first.id);
          setSettingsForm({
            id: first.id,
            storeUrl: first.storeUrl,
            consumerKey: "",
            consumerSecret: "",
            syncEnabled: first.syncEnabled,
            syncDirection: first.syncDirection,
            syncInterval: first.syncInterval,
            autoImport:
              first.syncDirection === "import_only" ||
              first.syncDirection === "both",
            autoExport:
              first.syncDirection === "export_only" ||
              first.syncDirection === "both",
            webhookEnabled: first.webhookEnabled,
            webhookSecret: first.webhookSecret || "",
            statusMapping: first.statusMapping || {},
          });
        }
      } else {
        setSettingsList([]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("فشل جلب الإعدادات");
    }
  }, []);

  const handleSelectSite = useCallback(
    (id: string | null) => {
      setSelectedSettingsId(id);
      if (id === "new") {
        setSettingsForm({
          id: "",
          storeUrl: "",
          consumerKey: "",
          consumerSecret: "",
          syncEnabled: false,
          syncDirection: "both",
          syncInterval: 15,
          autoImport: false,
          autoExport: false,
          webhookEnabled: false,
          webhookSecret: "",
          statusMapping: {},
        });
      } else if (id) {
        const s = settingsList.find((item) => item.id === id);
        if (s) {
          setSettingsForm({
            id: s.id,
            storeUrl: s.storeUrl,
            consumerKey: "",
            consumerSecret: "",
            syncEnabled: s.syncEnabled,
            syncDirection: s.syncDirection,
            syncInterval: s.syncInterval,
            autoImport:
              s.syncDirection === "import_only" || s.syncDirection === "both",
            autoExport:
              s.syncDirection === "export_only" || s.syncDirection === "both",
            webhookEnabled: s.webhookEnabled,
            webhookSecret: s.webhookSecret || "",
            statusMapping: s.statusMapping || {},
          });
        }
      }
    },
    [settingsList],
  );

  const saveSettings = async () => {
    // Check required fields (allow empty keys if present in system)
    const currentSite = settingsList.find((s) => s.id === settingsForm.id);
    const hasKeys =
      currentSite?.hasCredentials ||
      (settingsForm.consumerKey && settingsForm.consumerSecret);

    if (!settingsForm.storeUrl || !hasKeys) {
      toast.error("جميع بيانات الاتصال مطلوبة");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/woocommerce/settings", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(settingsForm),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("تم حفظ الإعدادات بنجاح");
        loadSettings();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("خطأ في حفظ الإعدادات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    const currentSite = settingsList.find((s) => s.id === settingsForm.id);
    const useStoredCredentials =
      !!settingsForm.id &&
      !!currentSite?.hasCredentials &&
      !settingsForm.consumerKey &&
      !settingsForm.consumerSecret;

    if (
      !settingsForm.storeUrl ||
      (!useStoredCredentials &&
        (!settingsForm.consumerKey || !settingsForm.consumerSecret))
    ) {
      toast.error("يرجى ملء جميع الحقول أولاً");
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch("/api/v1/woocommerce/fetch-products", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settingsForm.id || undefined,
          storeUrl: settingsForm.storeUrl,
          consumerKey: useStoredCredentials
            ? "from_settings"
            : settingsForm.consumerKey,
          consumerSecret: useStoredCredentials
            ? "from_settings"
            : settingsForm.consumerSecret,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`✅ الاتصال ناجح! تم العثور على ${data.data.count} منتج`);
      } else {
        toast.error(`❌ فشل الاتصال: ${data.message}`);
      }
    } catch (error: any) {
      toast.error("❌ خطأ في اختبار الاتصال");
    } finally {
      setTestingConnection(false);
    }
  };

  const setupWebhooks = async (customNgrokUrl?: string) => {
    const urlToUse = customNgrokUrl || ngrokUrl;

    if (!settingsForm.id) {
      toast.error("احفظ إعدادات المتجر أولاً قبل تثبيت Webhooks");
      return;
    }

    // Check for ngrok on localhost
    if (window.location.hostname === "localhost" && !urlToUse) {
      toast.error("يرجى إدخال ngrok URL للاختبار على localhost");
      return;
    }

    if (urlToUse) {
      localStorage.setItem("woocommerce_ngrok_url", urlToUse);
      setNgrokUrl(urlToUse);
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/woocommerce/webhooks/setup", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settingsForm.id,
          ngrokUrl: urlToUse || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        if (data.data?.webhookUrl) {
          toast.success(`Webhook URL: ${data.data.webhookUrl}`, {
            duration: 5000,
          });
        }
        loadSettings();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("خطأ في إعداد Webhooks");
    } finally {
      setLoading(false);
    }
  };

  const disconnectSettings = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في الغاء الربط لهذا الموقع؟"))
      return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/woocommerce/settings/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("تم الغاء الربط بنجاح");
        if (selectedSettingsId === id) setSelectedSettingsId(null);
        loadSettings();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("خطأ في الغاء الربط");
    } finally {
      setLoading(false);
    }
  };

  const resetWooCommerceData = async (options: {
    resetOrders: boolean;
    resetProducts: boolean;
    resetLogs: boolean;
    resetSettings: boolean;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/woocommerce/reset", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settingsForm.id || undefined,
          ...options,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        loadSettings();
      } else {
        toast.error(data.message);
      }
      return data;
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("فشل عملية إعادة الضبط");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    testingConnection,
    settingsList,
    selectedSettingsId,
    setSelectedSettingsId: handleSelectSite,
    settingsForm,
    setSettingsForm,
    ngrokUrl,
    setNgrokUrl,
    loadSettings,
    saveSettings,
    testConnection,
    setupWebhooks,
    disconnectSettings,
    resetWooCommerceData,
  };
};
