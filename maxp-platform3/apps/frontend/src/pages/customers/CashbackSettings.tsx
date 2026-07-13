import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Save,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Crown,
  Shield,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface CustomerLoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  color: string;
  icon: string;
}

interface CashbackSettings {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  rules: {
    cashbackPercent: number;
    base: "total" | "subtotal";
    trigger: string;
    maxPerOrder?: number;
    tierOverrides?: Record<string, number>;
  };
}

const CashbackSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tiers, setTiers] = useState<CustomerLoyaltyTier[]>([]);
  const [settings, setSettings] = useState<{
    cashbackPercent: number;
    base: "total" | "subtotal";
    status: CashbackSettings["status"];
    maxPerOrder: number;
    tierOverrides: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tiersRes, settingsRes] = await Promise.all([
        apiClient.get("/hr/customer-loyalty/tiers"),
        apiClient.get("/hr/customer-loyalty/cashback/settings"),
      ]);

      setTiers(tiersRes.data.data || []);

      const cs: CashbackSettings | null = settingsRes?.data?.data || null;
      if (cs) {
        setSettings({
          cashbackPercent: cs.rules.cashbackPercent,
          base: cs.rules.base,
          status: cs.status,
          maxPerOrder: cs.rules.maxPerOrder || 0,
          tierOverrides: cs.rules.tierOverrides || {},
        });
      } else {
        // Default state if no settings exist
        setSettings({
          cashbackPercent: 0,
          base: "subtotal",
          status: "INACTIVE",
          maxPerOrder: 0,
          tierOverrides: {},
        });
      }
    } catch (error) {
      console.error("Error fetching cashback data:", error);
      toast.error("حدث خطأ أثناء تحميل الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    // Validation
    if (settings.cashbackPercent < 0 || settings.cashbackPercent > 100) {
      toast.error("نسبة الكاش باك يجب أن تكون بين 0 و 100");
      return;
    }

    if (settings.maxPerOrder < 0) {
      toast.error("الحد الأقصى للطلب يجب أن يكون رقم إيجابي (أو 0 بدون حد)");
      return;
    }

    // Validate tier overrides
    const invalidOverrides = Object.values(settings.tierOverrides).some(val => val < 0 || val > 100);
    if (invalidOverrides) {
      toast.error("يجب أن تكون نسب المستويات الخاصة بين 0 و 100");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put("/hr/customer-loyalty/cashback/settings", settings);
      toast.success("تم حفظ إعدادات الكاش باك بنجاح");
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

      {/* Tiers Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  تخصيص المستويات (Advanced)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تجاوز النسبة الافتراضية لعملاء محددين
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {tiers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
              <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد مستويات عملاء معرفة حالياً.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      ></span>
                      {tier.nameAr || tier.name}
                    </span>
                  </div>

                  <div className="relative">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      نسبة خاصة
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={`${settings.cashbackPercent}% (Default)`}
                      value={settings.tierOverrides?.[tier.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newOverrides = { ...settings.tierOverrides };
                        if (val === "") {
                           delete newOverrides[tier.id];
                        } else {
                           const numVal = Number(val);
                           if (!isNaN(numVal)) {
                             newOverrides[tier.id] = numVal;
                           }
                        }
                        setSettings({
                          ...settings,
                          tierOverrides: newOverrides,
                        });
                      }}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                    <div className="absolute left-3 top-[26px] text-gray-400 text-xs">
                      %
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>ملاحظة:</strong> إذا قمت بتعيين نسبة خاصة لمستوى معين،
              سيتم تجاهل "النسبة الافتراضية" لهذا المستوى واستخدام النسبة
              المحددة هنا.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashbackSettingsPage;
