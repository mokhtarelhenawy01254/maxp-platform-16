import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RocketLaunchIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  KeyIcon,
  LinkIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { apiClient } from "../../services/apiClient";

interface TurboSettings {
  turboEnabled: boolean;
  turboAutoCreate: boolean;
  turboApiKey: string;
  turboMainClientCode: number | null;
  turboSenderNumber: string;
  turboWebhookUrl: string;
  turboWebhookToken: string;
  hasApiKey: boolean;
  maskedApiKey: string;
}

const TurboSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState<TurboSettings>({
    turboEnabled: false,
    turboAutoCreate: false,
    turboApiKey: "",
    turboMainClientCode: null,
    turboSenderNumber: "",
    turboWebhookUrl: "",
    turboWebhookToken: "",
    hasApiKey: false,
    maskedApiKey: "",
  });
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/store-settings/turbo");
      if (response.data.success) {
        setSettings({
          turboEnabled: response.data.data.turboEnabled || false,
          turboAutoCreate: response.data.data.turboAutoCreate || false,
          turboApiKey: "",
          turboMainClientCode: response.data.data.turboMainClientCode || null,
          turboSenderNumber: response.data.data.turboSenderNumber || "",
          turboWebhookUrl: response.data.data.turboWebhookUrl || "",
          turboWebhookToken: response.data.data.turboWebhookToken || "",
          hasApiKey: response.data.data.hasApiKey || false,
          maskedApiKey: response.data.data.maskedApiKey || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading Turbo settings:", error);
      toast.error("فشل تحميل إعدادات Turbo");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error("يرجى إدخال Turbo API Key");
      return;
    }

    if (settings.turboEnabled && !settings.turboApiKey && !settings.hasApiKey) {
      toast.error("يرجى إدخال Turbo API Key لتفعيل Turbo");
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put("/store-settings/turbo", {
        turboApiKey: settings.turboApiKey || undefined,
        turboMainClientCode: settings.turboMainClientCode || undefined,
        turboSenderNumber: settings.turboSenderNumber || undefined,
        turboEnabled: settings.turboEnabled,
        turboAutoCreate: settings.turboAutoCreate,
        turboWebhookUrl: settings.turboWebhookUrl || undefined,
        turboWebhookToken: settings.turboWebhookToken || undefined,
      });

      if (response.data.success) {
        toast.success("تم حفظ إعدادات Turbo بنجاح");
        loadSettings(); // Reload to get updated masked key
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل حفظ الإعدادات");
      console.error("Error saving Turbo settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error("يرجى إدخال Turbo API Key أولاً");
      return;
    }

    try {
      setSaving(true);
      // Test by trying to calculate shipping cost (simple test)
      const response = await apiClient.post("/turbo/calculate", {
        city: "القاهرة",
        address: "test",
        items: [
          { weight: 1, dimensions: { length: 10, width: 10, height: 10 } },
        ],
      });
      if (response.data.success) {
        toast.success("✅ الاتصال بـ Turbo يعمل بشكل صحيح!");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "فشل الاتصال بـ Turbo. تحقق من API Key",
      );
      console.error("Error testing Turbo connection:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/store-settings")}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 ml-2" />
          العودة لإعدادات المتجر
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <RocketLaunchIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          إعدادات Turbo للشحن
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          تكامل مع شركة Turbo للشحن - إدارة API Key والإعدادات
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
        {/* Status Card */}
        <div
          className={`p-4 rounded-lg border-2 ${settings.turboEnabled
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {settings.turboEnabled ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 ml-2" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 ml-2" />
              )}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {settings.turboEnabled ? "Turbo مفعّل" : "Turbo معطّل"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.turboEnabled
                    ? "خدمة Turbo للشحن نشطة وجاهزة للاستخدام"
                    : "قم بتفعيل Turbo وإدخال API Key للبدء"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.turboEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, turboEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* API Key Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Turbo API Key
            </h3>
          </div>

          <div className="space-y-4">
            {settings.hasApiKey && settings.maskedApiKey && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  API Key الحالي:
                </p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                    {settings.maskedApiKey}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {showApiKey ? "إخفاء" : "تحديث API Key"}
                  </button>
                </div>
              </div>
            )}

            {(showApiKey || !settings.hasApiKey) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {settings.hasApiKey ? "API Key جديد" : "Turbo API Key"}
                </label>
                <input
                  type="password"
                  value={settings.turboApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, turboApiKey: e.target.value })
                  }
                  placeholder="أدخل Turbo API Key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  يمكنك الحصول على API Key من{" "}
                  <a
                    href="https://portal.turbo-eg.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    بوابة Turbo
                  </a>
                </p>
              </div>
            )}

            <button
              onClick={handleTestConnection}
              disabled={
                saving || (!settings.turboApiKey && !settings.hasApiKey)
              }
              className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <InformationCircleIcon className="h-4 w-4 ml-1" />
              اختبار الاتصال
            </button>
          </div>
        </div>

        {/* Main Client Code Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Main Client Code
            </h3>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              value={settings.turboMainClientCode || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  turboMainClientCode: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              placeholder="37321"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Main Client Code الخاص بك من Turbo (مثال: 37321)
            </p>
          </div>
        </div>

        {/* Sender Number Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              رقم الراسل
            </h3>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={settings.turboSenderNumber || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  turboSenderNumber: e.target.value,
                })
              }
              placeholder="01000000000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              رقم هاتف الراسل الذي سيتم إرساله مع كل شحنة Turbo (مثال:
              01000000000)
            </p>
          </div>
        </div>

        {/* Auto Create Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                الشحن التلقائي
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إنشاء شحنة Turbo تلقائياً لأي طلب يتم تأكيده. إذا كان معطلاً،
                يجب إنشاء الشحنة يدوياً من صفحة تفاصيل الطلب.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.turboAutoCreate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    turboAutoCreate: e.target.checked,
                  })
                }
                disabled={!settings.turboEnabled}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!settings.turboEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
              ></div>
            </label>
          </div>
        </div>

        {/* Webhook URL Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Webhook URL (اختياري)
            </h3>
          </div>

          <div className="space-y-2">
            <input
              type="url"
              value={settings.turboWebhookUrl}
              onChange={(e) =>
                setSettings({ ...settings, turboWebhookUrl: e.target.value })
              }
              placeholder="https://yourdomain.com/api/v1/turbo/webhook"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              رابط لاستقبال تحديثات حالة الشحنات من Turbo تلقائياً
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              مثال: {window.location.origin}/api/v1/turbo/webhook
            </p>
          </div>
        </div>

        {/* Webhook Token Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Webhook Token (اختياري)
            </h3>
          </div>

          <div className="space-y-2">
            <input
              type="password"
              value={settings.turboWebhookToken}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  turboWebhookToken: e.target.value,
                })
              }
              placeholder="Bearer Token"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Token اختياري للتحقق من صحة webhook requests من Turbo
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              سيتم استخدام هذا الـ Token للبحث عن الشركة عند استقبال webhook
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-800 dark:text-indigo-300">
                <h4 className="font-medium mb-2">معلومات مهمة:</h4>
                <ul className="list-disc list-inside space-y-1 text-indigo-700 dark:text-indigo-400">
                  <li>يجب الحصول على Turbo API Key من بوابة Turbo أولاً</li>
                  <li>
                    رقم الراسل سيتم إرساله كـ api_followup_phone مع كل شحنة
                    Turbo
                  </li>
                  <li>
                    عند تفعيل "الشحن التلقائي"، سيتم إنشاء شحنة تلقائياً عند
                    تأكيد أي طلب
                  </li>
                  <li>
                    إذا كان الشحن التلقائي معطلاً، يجب إنشاء الشحنات يدوياً من
                    صفحة تفاصيل الطلب
                  </li>
                  <li>
                    Webhook URL اختياري - يستخدم لتلقي تحديثات حالة الشحنات
                    تلقائياً
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={
              saving ||
              (settings.turboEnabled &&
                !settings.turboApiKey &&
                !settings.hasApiKey)
            }
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurboSettings;
