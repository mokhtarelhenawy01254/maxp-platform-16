import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/api";
import {
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type DuplicateOrderAction = "ignore" | "filter";

interface DuplicateOrderSettingsState {
  duplicateOrderAction: DuplicateOrderAction;
  duplicateOrderWindowMinutes: number;
}

const DuplicateOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<DuplicateOrderSettingsState>({
    duplicateOrderAction: "filter",
    duplicateOrderWindowMinutes: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/order-settings");
      if (response.data.success) {
        setSettings({
          duplicateOrderAction:
            response.data.data?.duplicateOrderAction || "filter",
          duplicateOrderWindowMinutes:
            response.data.data?.duplicateOrderWindowMinutes ?? 60,
        });
      }
    } catch (error) {
      console.error("Error fetching duplicate order settings:", error);
      // Error toast is handled by apiClient
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/order-settings", {
        duplicateOrderAction: settings.duplicateOrderAction,
        duplicateOrderWindowMinutes: settings.duplicateOrderWindowMinutes,
      });
      if (response.data.success) {
        tToast.success("DuplicateOrderSettings.success_save_eed8");
        fetchSettings();
      }
    } catch (error) {
      console.error("Error saving duplicate order settings:", error);
      // Error toast is handled by apiClient
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          إعدادات الطلبات المكررة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              التصرف عند اكتشاف طلب مكرر
            </label>
            <select
              value={settings.duplicateOrderAction}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  duplicateOrderAction: e.target
                    .value as DuplicateOrderAction,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="filter">
                فلترة الطلبات المكررة (تسجيلها بحالة طلب مكرر)
              </option>
              <option value="ignore">
                تجاهل الطلب المكرر (عدم إنشاء طلب جديد)
              </option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              يتم اكتشاف التكرار عند تطابق الهاتف أو البريد مع نفس إجمالي الطلب
              خلال الفترة المحددة.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              مدة الفحص (بالدقائق)
            </label>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.duplicateOrderWindowMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  duplicateOrderWindowMinutes:
                    parseInt(e.target.value) || 60,
                })
              }
              className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              الحد الأدنى 5 دقائق والحد الأقصى 24 ساعة.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                حفظ الإعدادات
              </>
            )}
          </button>
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-5 h-5" />
            إعادة تحميل
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateOrderSettings;
