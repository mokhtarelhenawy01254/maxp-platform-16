import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Save,
  Coins,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface PointsSettingsData {
  pointsPerAmount: number;
  pointsPerPurchase: number;
  pointsPerReferral: number;
  redemptionRate: number;
  minimumPoints: number;
  maxPointsPerTransaction: number;
  expiryMonths: number;
}

const DEFAULT_POINTS_SETTINGS: PointsSettingsData = {
  pointsPerAmount: 1,
  pointsPerPurchase: 1,
  pointsPerReferral: 10,
  redemptionRate: 100,
  minimumPoints: 100,
  maxPointsPerTransaction: 0,
  expiryMonths: 12,
};

const PointsSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PointsSettingsData>(DEFAULT_POINTS_SETTINGS);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/hr/customer-loyalty/points/settings");
      const data: Partial<PointsSettingsData> = res?.data?.data || {};
      setSettings({ ...DEFAULT_POINTS_SETTINGS, ...data });
    } catch (error) {
      console.error("Error fetching points settings:", error);
      toast.error("حدث خطأ أثناء جلب إعدادات النقاط");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    const numericFields: (keyof PointsSettingsData)[] = [
      "pointsPerAmount",
      "pointsPerPurchase",
      "pointsPerReferral",
      "redemptionRate",
      "minimumPoints",
      "maxPointsPerTransaction",
      "expiryMonths",
    ];

    for (const field of numericFields) {
      if (!Number.isFinite(settings[field]) || settings[field] < 0) {
        toast.error("من فضلك أدخل قيماً صحيحة (أرقام موجبة) لإعدادات النقاط");
        return;
      }
    }

    try {
      setIsSaving(true);
      await apiClient.put("/hr/customer-loyalty/points/settings", settings);
      toast.success("تم تحديث إعدادات النقاط في جميع أنظمة الولاء بنجاح");
    } catch (error: any) {
      console.error("Error saving points settings:", error);
      toast.error(error?.response?.data?.error || "حدث خطأ أثناء حفظ إعدادات النقاط");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof PointsSettingsData, value: number) => {
    setSettings({ ...settings, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const inputCls =
    "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إعدادات النقاط
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            إعدادات عامة على مستوى الشركة — تُطبَّق على جميع أنظمة الولاء
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
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                قواعد كسب واستبدال النقاط
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                التحكم في آلية احتساب النقاط ومعدلات الاستبدال
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              كل عملية شراء بمبلغ (عملة)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.pointsPerAmount}
              onChange={(e) => updateField("pointsPerAmount", Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">مثال: 1 تعني كل 1 عملة.</p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تساوي (نقاط)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.pointsPerPurchase}
              onChange={(e) => updateField("pointsPerPurchase", Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              النقاط المكتسبة مقابل المبلغ السابق.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              النقاط المكتسبة لكل إحالة ناجحة
            </label>
            <input
              type="number"
              min="0"
              value={settings.pointsPerReferral}
              onChange={(e) => updateField("pointsPerReferral", Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              معدل الاستبدال (1 عملة = كم نقطة؟)
            </label>
            <input
              type="number"
              min="0"
              value={settings.redemptionRate}
              onChange={(e) => updateField("redemptionRate", Number(e.target.value))}
              placeholder="مثال: 100 = كل 100 نقطة تخصم 1 عملة"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              مثال: 100 يعادل أن كل 100 نقطة تخصم 1 عملة.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الحد الأدنى للنقاط لبدء الاستبدال
            </label>
            <input
              type="number"
              min="0"
              value={settings.minimumPoints}
              onChange={(e) => updateField("minimumPoints", Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              أقصى نقاط بالطلب الواحد
            </label>
            <input
              type="number"
              min="0"
              value={settings.maxPointsPerTransaction}
              onChange={(e) => updateField("maxPointsPerTransaction", Number(e.target.value))}
              placeholder="0 = بدون حد"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              اتركه 0 إذا كنت لا تريد وضع حد أقصى.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              صلاحية النقاط (بالأشهر)
            </label>
            <input
              type="number"
              min="0"
              value={settings.expiryMonths}
              onChange={(e) => updateField("expiryMonths", Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          <strong>ملاحظة:</strong> هذه الإعدادات عامة على مستوى الشركة. أي تعديل
          هنا يُطبَّق تلقائياً على <strong>جميع أنظمة الولاء</strong> الموجودة
          (المستويات، الخصم التلقائي، وغيرها).
        </p>
      </div>
    </div>
  );
};

export default PointsSettingsPage;
