import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import toast from "react-hot-toast";
import { CheckCircleIcon, ArrowPathIcon, ClockIcon } from "@heroicons/react/24/outline";

const MIN_HOURS = 1;
const MAX_HOURS = 720;

const IncompleteOrdersSettings: React.FC = () => {
  const [hours, setHours] = useState<number>(24);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/order-settings");
      if (response.data?.success) {
        const value = parseInt(response.data.data?.incompleteOrderLostAfterHours, 10);
        if (!Number.isNaN(value) && value >= MIN_HOURS && value <= MAX_HOURS) {
          setHours(value);
        } else {
          setHours(24);
        }
      }
    } catch (error) {
      console.error("Error fetching incomplete order settings:", error);
      toast.error("خطأ في جلب إعدادات الطلبات غير المكتملة");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (hours < MIN_HOURS || hours > MAX_HOURS) {
      toast.error(`المدة يجب أن تكون بين ${MIN_HOURS} و ${MAX_HOURS} ساعة`);
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put("/order-settings", {
        incompleteOrderLostAfterHours: hours,
      });

      if (response.data?.success) {
        toast.success("تم حفظ الإعدادات بنجاح");
        fetchSettings();
      }
    } catch (error) {
      console.error("Error saving incomplete order settings:", error);
      toast.error("خطأ في حفظ الإعدادات");
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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              إعدادات الطلبات غير المكتملة
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              تحديد المدة التي بعدها يتم اعتبار الطلب غير المكتمل مفقود
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            مدة التحويل إلى مفقود (بالساعات)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={MIN_HOURS}
              max={MAX_HOURS}
              value={hours}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setHours(Number.isNaN(value) ? MIN_HOURS : value);
              }}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">ساعة</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            يتم حساب المدة من آخر تحديث لبيانات العميل داخل الشيك آوت.
          </p>

          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            مثال: إذا كانت القيمة {hours} ساعة، أي طلب لم يتم تحديثه خلال هذه المدة
            سيظهر في قائمة الطلبات المفقودة.
          </div>
        </div>

        <div className="mt-6">
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
        </div>
      </div>
    </div>
  );
};

export default IncompleteOrdersSettings;
