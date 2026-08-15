import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { Save, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface CashbackSettings {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  rules: {
    cashbackPercent: number;
    base: "total" | "subtotal";
    trigger: string;
    maxPerOrder?: number;
  };
}

const CashbackSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<{
    cashbackPercent: number;
    base: "total" | "subtotal";
    status: CashbackSettings["status"];
    maxPerOrder: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const settingsRes = await apiClient.get("/hr/customer-loyalty/cashback/settings");

      const cs: CashbackSettings | null = settingsRes?.data?.data || null;
      if (cs) {
        setSettings({
          cashbackPercent: cs.rules.cashbackPercent,
          base: cs.rules.base,
          status: cs.status,
          maxPerOrder: cs.rules.maxPerOrder || 0,
        });
      } else {
        // Default state if no settings exist
        setSettings({
          cashbackPercent: 0,
          base: "subtotal",
          status: "INACTIVE",
          maxPerOrder: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching cashback data:", error);
      tToast.error("CashbackSettings.error_error_6d32");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    // Validation
    if (settings.cashbackPercent < 0 || settings.cashbackPercent > 100) {
      tToast.error("CashbackSettings.msg_faa7");
      return;
    }

    if (settings.maxPerOrder < 0) {
      tToast.error("CashbackSettings.msg_3170");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put("/hr/customer-loyalty/cashback/settings", settings);
      tToast.success("CashbackSettings.success_save_fe44");
    } catch (error: any) {
      console.error("Error saving cashback settings:", error);
      toast.error(error?.response?.data?.error || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!settings) return <div>Failed to load settings</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إعدادات الكاش باك
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تكوين نظام المكافآت المالية للعملاء
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ التغييرات
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                الإعدادات الأساسية
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                التحكم في نسبة وآلية احتساب الكاش باك
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              حالة النظام
            </label>
            <div className="relative">
              <select
                value={settings.status}
                onChange={(e) =>
                  setSettings({ ...settings, status: e.target.value as any })
                }
                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="ACTIVE">نشط (Active)</option>
                <option value="INACTIVE">متوقف (Inactive)</option>
                <option value="DRAFT">مسودة (Draft)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                {settings.status === "ACTIVE" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          {/* Calculation Base */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              طريقة الحساب
            </label>
            <select
              value={settings.base}
              onChange={(e) =>
                setSettings({ ...settings, base: e.target.value as any })
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="subtotal">
                المجموع الفرعي (Subtotal) - قبل الضرائب والشحن
              </option>
              <option value="total">الإجمالي الكلي (Grand Total)</option>
            </select>
          </div>

          {/* Percentage */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نسبة الكاش باك (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.cashbackPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cashbackPercent: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                %
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              النسبة الافتراضية لجميع العملاء.
            </p>
          </div>

          {/* Max Limit */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الحد الأقصى للطلب الواحد
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.maxPerOrder}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxPerOrder: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="0 = بدون حد"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                عملة المتجر
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              اتركه 0 إذا كنت لا تريد وضع حد أقصى.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CashbackSettingsPage;
