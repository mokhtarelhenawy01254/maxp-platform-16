import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// الحالات القابلة للاختيار كـ "حالات مستهدفة"
const PREPARATION_STATUSES = [
  { code: "READY_FOR_PROCESSING", label: "جاهز للتجهيز" },
  { code: "PROCESSING", label: "قيد التجهيز" },
  { code: "PREPARING", label: "يجري التجهيز" },
  { code: "PENDING_PREPARATION", label: "في انتظار التجهيز" },
  { code: "QUALITY_CHECK", label: "فحص الجودة" },
  { code: "PACKAGED", label: "تم التغليف" },
  { code: "READY", label: "جاهز" },
  { code: "CONFIRMED", label: "مؤكد" },
];

interface LateCancellationState {
  lateCancellationInterceptEnabled: boolean;
  lateCancellationTargetStatuses: string[];
}

const LateCancellationSettings: React.FC = () => {
  const [settings, setSettings] = useState<LateCancellationState>({
    lateCancellationInterceptEnabled: false,
    lateCancellationTargetStatuses: ["PROCESSING", "PREPARING", "PACKAGED"],
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
        const data = response.data.data;
        setSettings({
          lateCancellationInterceptEnabled:
            data?.lateCancellationInterceptEnabled ?? false,
          lateCancellationTargetStatuses:
            data?.lateCancellationTargetStatuses ?? [
              "PROCESSING",
              "PREPARING",
              "PACKAGED",
            ],
        });
      }
    } catch (error) {
      console.error("Error fetching late cancellation settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/order-settings", {
        lateCancellationInterceptEnabled:
          settings.lateCancellationInterceptEnabled,
        lateCancellationTargetStatuses:
          settings.lateCancellationTargetStatuses,
      });
      if (response.data.success) {
        toast.success("تم حفظ إعدادات اعتراض الإلغاء المتأخر بنجاح ✅");
        fetchSettings();
      }
    } catch (error) {
      console.error("Error saving late cancellation settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (code: string) => {
    setSettings((prev) => {
      const already = prev.lateCancellationTargetStatuses.includes(code);
      return {
        ...prev,
        lateCancellationTargetStatuses: already
          ? prev.lateCancellationTargetStatuses.filter((s) => s !== code)
          : [...prev.lateCancellationTargetStatuses, code],
      };
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center">
            <ShieldExclamationIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            نظام اعتراض الإلغاء المتأخر
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mr-13">
          عندما يطلب عميل إلغاء أوردر يكون في مرحلة التجهيز، يقوم السيستم
          تلقائياً بتحويله لحالة "إلغاء قيد التنفيذ" بدلاً من إلغائه مباشرة،
          مما يمنع خروجه للشحن قبل إيقافه في المخزن.
        </p>
      </div>

      {/* Toggle Feature */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              تفعيل الميزة
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              عند التفعيل، يظهر زر "طلب إلغاء الأوردر" في صفحة تفاصيل الطلب
              عند الحالات المستهدفة
            </p>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                lateCancellationInterceptEnabled:
                  !prev.lateCancellationInterceptEnabled,
              }))
            }
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${
              settings.lateCancellationInterceptEnabled
                ? "bg-rose-600"
                : "bg-gray-200 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                settings.lateCancellationInterceptEnabled
                  ? "translate-x-8"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Target Statuses */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-opacity ${
          !settings.lateCancellationInterceptEnabled
            ? "opacity-40 pointer-events-none"
            : ""
        }`}
      >
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
          الحالات المستهدفة
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          اختر الحالات التي سيظهر فيها زر "طلب إلغاء الأوردر" — عادةً حالات
          التجهيز والتغليف
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PREPARATION_STATUSES.map((s) => {
            const isSelected =
              settings.lateCancellationTargetStatuses.includes(s.code);
            return (
              <button
                key={s.code}
                onClick={() => toggleStatus(s.code)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    isSelected
                      ? "border-rose-500 bg-rose-500"
                      : "border-gray-300 dark:border-gray-500"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>

        {settings.lateCancellationTargetStatuses.length === 0 && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
            <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
            لم تحدد أي حالة مستهدفة — الميزة لن تعمل حتى تختار حالة واحدة على
            الأقل
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800 p-5">
        <div className="flex gap-3">
          <InformationCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 dark:text-rose-300 space-y-2">
            <p className="font-medium">كيف تعمل الميزة؟</p>
            <ul className="list-disc list-inside space-y-1 text-rose-700 dark:text-rose-400">
              <li>
                عند ضغط المودريتور على "طلب إلغاء الأوردر" يتحول الأوردر تلقائياً
                لحالة <strong>إلغاء قيد التنفيذ</strong>
              </li>
              <li>
                تظهر هذه الأوردرات في قائمة مميزة بالمخزن لإيقاف التجهيز فوراً
              </li>
              <li>
                السيستم لا يسمح باستكمال شحن أوردر بهذه الحالة (حظر الاسكانر)
              </li>
              <li>
                بعد تأكيد إيقاف الأوردر في المخزن يتحول لحالة "ملغي" نهائياً
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 font-medium"
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
          className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className="w-5 h-5" />
          إعادة تحميل
        </button>
      </div>
    </div>
  );
};

export default LateCancellationSettings;
