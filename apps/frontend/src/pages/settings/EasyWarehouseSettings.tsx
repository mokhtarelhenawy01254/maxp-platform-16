import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import easyWarehouseService from "../../services/easyWarehouseService";

const EasyWarehouseSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await easyWarehouseService.getSettings();
        setEnabled(res.data?.easyWarehouseMode === true);
      } catch (error: any) {
        toast.error(error?.message || "تعذر تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await easyWarehouseService.updateSettings(enabled);
      setEnabled(res.data?.easyWarehouseMode === true);
      toast.success(res.data?.easyWarehouseMode ? "تم تفعيل الوضع السهل" : "تم إيقاف الوضع السهل");
    } catch (error: any) {
      toast.error(error?.message || "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">وضع المستودع السهل</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          استيراد المنتجات تلقائيًا عند إنشاء طلب لمنتج غير موجود في الكتالوج.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">تفعيل استيراد المنتجات تلقائيًا</h3>
            <p className="text-xs text-gray-500">
              عند التفعيل، أي طلب يحتوي منتجًا غير موجود في كتالوجك سيُنشأ تلقائيًا بسعر الطلب.
            </p>
          </div>
          <button
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EasyWarehouseSettings;
