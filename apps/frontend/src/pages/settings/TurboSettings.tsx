import { useTranslation } from "react-i18next";
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
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
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
  const { t: tVal } = useTranslation();
  const t = tVal as any;
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
      toast.error(t('turbo.k_1'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error(t('turbo.k_2'));
      return;
    }

    if (settings.turboEnabled && !settings.turboApiKey && !settings.hasApiKey) {
      toast.error(t('turbo.k_3'));
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
        toast.success(t('turbo.k_4'));
        loadSettings(); // Reload to get updated masked key
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('turbo.k_5'));
      console.error("Error saving Turbo settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.turboApiKey && !settings.hasApiKey) {
      toast.error(t('turbo.k_6'));
      return;
    }

    try {
      setSaving(true);
      // Test by trying to calculate shipping cost (simple test)
      const response = await apiClient.post("/turbo/calculate", {
        city: t('turbo.k_7'),
        address: "test",
        items: [
          { weight: 1, dimensions: { length: 10, width: 10, height: 10 } },
        ],
      });
      if (response.data.success) {
        toast.success(t('turbo.k_8'));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || t('turbo.k_9'),
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
            {t('turbo.k_23')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={() => navigate("/shipping-companies")}
            className="flex items-center hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 ml-1" />
            شركات الشحن
          </button>
          <span>/</span>
          <button
            onClick={() => navigate("/store-settings")}
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            {t('turbo.k_24')}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <RocketLaunchIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
              {t('turbo.k_25')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('turbo.k_26')}
            </p>
          </div>
          <button
            onClick={() => navigate("/settings/turbo/status-mapping")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-medium text-sm transition-colors shadow-sm"
          >
            <ArrowsRightLeftIcon className="h-4 w-4" />
            <span>ربط حالات Turbo بالنظام</span>
          </button>
        </div>
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
                  {settings.turboEnabled ? t('turbo.k_10') : t('turbo.k_11')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.turboEnabled
                    ? t('turbo.k_12')
                    : t('turbo.k_13')}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" dir="ltr">
              <input
                type="checkbox"
                checked={settings.turboEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, turboEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
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
                  {t('turbo.k_27')}
                </p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                    {settings.maskedApiKey}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {showApiKey ? t('turbo.k_14') : t('turbo.k_15')}
                  </button>
                </div>
              </div>
            )}

            {(showApiKey || !settings.hasApiKey) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {settings.hasApiKey ? t('turbo.k_16') : "Turbo API Key"}
                </label>
                <input
                  type="password"
                  value={settings.turboApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, turboApiKey: e.target.value })
                  }
                  placeholder={t('turbo.k_17')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('turbo.k_28')}{" "}
                  <a
                    href="https://portal.turbo-eg.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t('turbo.k_29')}
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
              {t('turbo.k_30')}
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
              {t('turbo.k_31')}
            </p>
          </div>
        </div>

        {/* Sender Number Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('turbo.k_32')}
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
              {t('turbo.k_33')}
            </p>
          </div>
        </div>

        {/* Auto Create Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('turbo.k_20')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('turbo.k_34')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" dir="ltr">
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
                className={`w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${!settings.turboEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
              ></div>
            </label>
          </div>
        </div>

        {/* Webhook URL Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('turbo.k_35')}
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
              {t('turbo.k_36')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('turbo.k_37')} {window.location.origin}/api/v1/turbo/webhook
            </p>
          </div>
        </div>

        {/* Webhook Token Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('turbo.k_38')}
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
              {t('turbo.k_39')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('turbo.k_40')}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-800 dark:text-indigo-300">
                <h4 className="font-medium mb-2">{t('turbo.k_18')}</h4>
                <ul className="list-disc list-inside space-y-1 text-indigo-700 dark:text-indigo-400">
                  <li>{t('turbo.k_19')}</li>
                  <li>
                    {t('turbo.k_41')}
                  </li>
                  <li>
                    {t('turbo.k_44')}
                  </li>
                  <li>
                    {t('turbo.k_42')}
                  </li>
                  <li>
                    {t('turbo.k_43')}
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
            {saving ? t('turbo.k_21') : t('turbo.k_22')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurboSettings;
