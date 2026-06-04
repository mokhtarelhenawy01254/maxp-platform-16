import React from "react";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  KeyIcon,
  BoltIcon,
  Cog6ToothIcon,
  PlusIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import { Settings } from "../types";

interface SettingsTabProps {
  settings: Settings | null;
  settingsForm: any;
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
  saveSettings: () => Promise<void>;
  testConnection: () => Promise<void>;
  setupWebhooks: (url?: string) => Promise<void>;
  testingConnection: boolean;
  ngrokUrl: string;
  setNgrokUrl: (url: string) => void;
  loading: boolean;
  resetWooCommerceData: (options: any) => Promise<any>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  settingsForm,
  setSettingsForm,
  saveSettings,
  testConnection,
  setupWebhooks,
  testingConnection,
  ngrokUrl,
  setNgrokUrl,
  loading,
  resetWooCommerceData,
}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
        {settingsForm.id ? (
          <>
            <span className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-lg">
              <Cog6ToothIcon className="h-5 w-5" />
            </span>
            تعديل إعدادات المتجر
          </>
        ) : (
          <>
            <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <PlusIcon className="h-5 w-5" />
            </span>
            إضافة متجر WooCommerce جديد
          </>
        )}
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* بيانات الاتصال */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-blue-500" />
            بيانات المتجر
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط المتجر (Store URL)
              </label>
              <input
                type="text"
                value={settingsForm.storeUrl}
                onChange={(e) =>
                  setSettingsForm((prev: any) => ({
                    ...prev,
                    storeUrl: e.target.value,
                  }))
                }
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                مفتاح العميل (Consumer Key)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={settingsForm.consumerKey}
                  onChange={(e) =>
                    setSettingsForm((prev: any) => ({
                      ...prev,
                      consumerKey: e.target.value,
                    }))
                  }
                  placeholder={
                    settings?.hasCredentials ? "••••••••••••••••" : "ck_..."
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                  dir="ltr"
                />
                <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الرمز السري (Consumer Secret)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={settingsForm.consumerSecret}
                  onChange={(e) =>
                    setSettingsForm((prev: any) => ({
                      ...prev,
                      consumerSecret: e.target.value,
                    }))
                  }
                  placeholder={
                    settings?.hasCredentials ? "••••••••••••••••" : "cs_..."
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                  dir="ltr"
                />
                <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {testingConnection ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <BoltIcon className="h-5 w-5" />
              )}
              اختبار الاتصال
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5 text-purple-500" />
            إعدادات المزامنة
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div>
                <span className="block font-medium text-gray-900 dark:text-white">
                  تفعيل المزامنة التلقائية
                </span>
                <span className="text-sm text-gray-500">
                  مزامنة الطلبات تلقائياً في الخلفية
                </span>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.syncEnabled}
                onChange={(e) =>
                  setSettingsForm((prev: any) => ({
                    ...prev,
                    syncEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اتجاه المزامنة
                </label>
                <select
                  value={settingsForm.syncDirection}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettingsForm((prev: any) => ({
                      ...prev,
                      syncDirection: val,
                      autoImport: val === "import_only" || val === "both",
                      autoExport: val === "export_only" || val === "both",
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="import_only">
                    استيراد فقط (WooCommerce ← النظام)
                  </option>
                  <option value="export_only">
                    تصدير فقط (النظام ← WooCommerce)
                  </option>
                  <option value="both">اتجاهين (WooCommerce ↔ النظام)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الفاصل الزمني (دقيقة)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settingsForm.syncInterval}
                  onChange={(e) =>
                    setSettingsForm((prev: any) => ({
                      ...prev,
                      syncInterval: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Webhook Settings */}
            <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    ⚡ Webhooks (تحديث فوري)
                  </h4>
                  <p className="text-sm text-gray-500">
                    استقبال التحديثات فور حدوثها في المتجر
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.webhookEnabled}
                  onChange={(e) =>
                    setSettingsForm((prev: any) => ({
                      ...prev,
                      webhookEnabled: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </div>

              {settingsForm.webhookEnabled && (
                <div className="space-y-4">
                  {window.location.hostname === "localhost" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ngrok URL (للاختبار المحلي)
                      </label>
                      <input
                        type="text"
                        value={ngrokUrl}
                        onChange={(e) => setNgrokUrl(e.target.value)}
                        placeholder="https://your-ngrok-url.ngrok-free.app"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                        dir="ltr"
                      />
                    </div>
                  )}
                    <button
                      onClick={() => setupWebhooks()}
                      disabled={loading}
                      className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      إعادة تثبيت Webhooks
                    </button>

                    {settings?.webhookUrl && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Webhook URL (للمسار اليدوي)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={settings.webhookUrl}
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 dir-ltr"
                              dir="ltr"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(settings.webhookUrl || "");
                                toast.success("تم نسخ الرابط");
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 border border-gray-200 dark:border-gray-700 rounded hover:bg-white transition-colors"
                              title="نسخ الرابط"
                            >
                              <Square2StackIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {settingsForm.webhookSecret && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Webhook Secret Key
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                readOnly
                                value={settingsForm.webhookSecret}
                                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 dir-ltr font-mono"
                                dir="ltr"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(settingsForm.webhookSecret || "");
                                  toast.success("تم نسخ المفتاح السري");
                                }}
                                className="p-1.5 text-gray-400 hover:text-purple-600 border border-gray-200 dark:border-gray-700 rounded hover:bg-white transition-colors"
                                title="نسخ المفتاح السري"
                              >
                                <Square2StackIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-500">
                              * استخدم هذا المفتاح في إعدادات Webhook في WooCommerce للتحقق من التوقيع.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all font-bold"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            حفظ الإعدادات
          </button>
        </div>

        {/* المنطقة الخطرة - إعادة الضبط */}
        {settings?.id && (
          <div className="mt-12 border-t-2 border-red-100 dark:border-red-900/30 pt-8">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6" />
              المنطقة الخطرة (إعادة الضبط)
            </h3>
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-6">
              <p className="text-red-800 dark:text-red-300 text-sm mb-6">
                تحذير: هذه العمليات ستقوم بحذف البيانات المستوردة من WooCommerce
                بشكل نهائي. تأكد من أنك تريد القيام بذلك.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    id="reset-orders"
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    defaultChecked
                  />
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      حذف جميع الطلبات
                    </span>
                    <span className="text-xs text-gray-500">
                      حذف الطلبات التي تم استيرادها من هذا المتجر
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    id="reset-products"
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    defaultChecked
                  />
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      حذف المنتجات المستوردة
                    </span>
                    <span className="text-xs text-gray-500">
                      حذف المنتجات التي تم ربطها بـ WooCommerce
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    id="reset-logs"
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    defaultChecked
                  />
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      مسح سجلات المزامنة
                    </span>
                    <span className="text-xs text-gray-500">
                      حذف جميع سجلات العمليات السابقة
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    id="reset-settings"
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    defaultChecked
                  />
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      إعادة ضبط الإعدادات
                    </span>
                    <span className="text-xs text-gray-500">
                      تصفير تواريخ المزامنة وحالة الاتصال
                    </span>
                  </div>
                </label>
              </div>

              <button
                onClick={async () => {
                  const resetOrders = (
                    document.getElementById("reset-orders") as HTMLInputElement
                  )?.checked;
                  const resetProducts = (
                    document.getElementById(
                      "reset-products",
                    ) as HTMLInputElement
                  )?.checked;
                  const resetLogs = (
                    document.getElementById("reset-logs") as HTMLInputElement
                  )?.checked;
                  const resetSettings = (
                    document.getElementById(
                      "reset-settings",
                    ) as HTMLInputElement
                  )?.checked;

                  if (
                    !resetOrders &&
                    !resetProducts &&
                    !resetLogs &&
                    !resetSettings
                  ) {
                    return alert(
                      "يرجى اختيار خيار واحد على الأقل لإعادة الضبط",
                    );
                  }

                  if (
                    window.confirm(
                      "⚠️ هل أنت متأكد تماماً؟ لا يمكن التراجع عن هذه العملية وسيتم حذف البيانات المختارة بشكل نهائي.",
                    )
                  ) {
                    await resetWooCommerceData({
                      resetOrders,
                      resetProducts,
                      resetLogs,
                      resetSettings,
                    });
                  }
                }}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={loading ? "h-5 w-5 animate-spin" : "h-5 w-5"}
                />
                البدء في إعادة ضبط البيانات المحددة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
