import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RocketLaunchIcon, CheckCircleIcon, XCircleIcon, KeyIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface BostaSettingsData {
  bostaEnabled: boolean;
  bostaApiKey: string;
  bostaWebhookToken: string;
  hasApiKey: boolean;
  maskedApiKey: string;
}

const BostaSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState<BostaSettingsData>({
    bostaEnabled: false, bostaApiKey: "", bostaWebhookToken: "", hasApiKey: false, maskedApiKey: "",
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/store-settings/bosta");
      if (res.data.success) {
        setSettings({
          bostaEnabled: res.data.data.bostaEnabled || false,
          bostaApiKey: "",
          bostaWebhookToken: res.data.data.bostaWebhookToken || "",
          hasApiKey: res.data.data.hasApiKey || false,
          maskedApiKey: res.data.data.maskedApiKey || "",
        });
      }
    } catch { tToast.error("BostaSettings.failed_load_f24b"); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!settings.bostaApiKey && !settings.hasApiKey) { tToast.error("BostaSettings.msg_d142"); return; }
    try {
      setSaving(true);
      const res = await apiClient.put("/store-settings/bosta", {
        bostaApiKey: settings.bostaApiKey || undefined,
        bostaWebhookToken: settings.bostaWebhookToken || undefined,
        bostaEnabled: settings.bostaEnabled,
      });
      if (res.data.success) { tToast.success("BostaSettings.success_save_6d9e"); loadSettings(); }
    } catch (err: any) { toast.error(err.response?.data?.message || "فشل حفظ الإعدادات"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96 dark:bg-gray-900">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-4 text-gray-600">جاري التحميل...</p></div>
    </div>
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <button onClick={() => navigate("/store-settings")} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-5 w-5 ml-2" /> العودة لإعدادات المتجر
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <RocketLaunchIcon className="h-8 w-8 text-indigo-600 ml-3" /> إعدادات Bosta للشحن
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">تكامل مع شركة Bosta للشحن - إدارة API Key والإعدادات</p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
        <div className={`p-4 rounded-lg border-2 ${settings.bostaEnabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {settings.bostaEnabled ? <CheckCircleIcon className="h-6 w-6 text-green-600 ml-2" /> : <XCircleIcon className="h-6 w-6 text-gray-400 ml-2" />}
              <div>
                <h3 className="font-medium text-gray-900">{settings.bostaEnabled ? "Bosta مفعّل" : "Bosta معطّل"}</h3>
                <p className="text-sm text-gray-600">{settings.bostaEnabled ? "خدمة Bosta للشحن نشطة وجاهزة" : "قم بتفعيل Bosta وإدخال API Key للبدء"}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.bostaEnabled} onChange={(e) => setSettings({ ...settings, bostaEnabled: e.target.checked })} className="sr-only peer" />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center mb-4"><KeyIcon className="h-5 w-5 text-indigo-600 ml-2" /><h3 className="text-lg font-medium text-gray-900">Bosta API Key</h3></div>
          <div className="space-y-4">
            {settings.hasApiKey && settings.maskedApiKey && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700 mb-2">API Key الحالي:</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-blue-700 bg-blue-100 px-3 py-1 rounded">{settings.maskedApiKey}</code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="text-sm text-blue-600 hover:text-blue-800">{showApiKey ? "إخفاء" : "تحديث API Key"}</button>
                </div>
              </div>
            )}
            {(showApiKey || !settings.hasApiKey) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{settings.hasApiKey ? "API Key جديد" : "Bosta API Key"}</label>
                <input type="password" value={settings.bostaApiKey} onChange={(e) => setSettings({ ...settings, bostaApiKey: e.target.value })}
                  placeholder="أدخل Bosta API Key" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">يمكنك الحصول على API Key من <a href="https://app.bosta.co" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">لوحة Bosta</a></p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center mb-4"><KeyIcon className="h-5 w-5 text-indigo-600 ml-2" /><h3 className="text-lg font-medium text-gray-900">Webhook Token (اختياري)</h3></div>
          <div className="space-y-2">
            <input type="password" value={settings.bostaWebhookToken} onChange={(e) => setSettings({ ...settings, bostaWebhookToken: e.target.value })}
              placeholder="Bearer Token" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            <p className="text-xs text-gray-500">Token اختياري للتحقق من صحة webhook requests من Bosta</p>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button onClick={handleSave} disabled={saving || (settings.bostaEnabled && !settings.bostaApiKey && !settings.hasApiKey)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BostaSettings;
