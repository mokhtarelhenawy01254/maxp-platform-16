/**
 * 📊 Attribution Settings
 *
 * إعدادات إحالة التحويلات
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Settings,
  ArrowLeft,
  Clock,
  MousePointer,
  Eye,
  Loader2,
  CheckCircle,
  Info,
  BarChart3,
} from "lucide-react";
import { facebookAdsService } from "../../services/facebookAdsService";

const AttributionSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    adSetId: "",
    clickWindow: "7d" as "1d" | "7d" | "28d",
    viewWindow: "1d" as "1d" | "7d",
    useAccountDefault: false,
  });

  const clickWindowOptions = [
    {
      value: "1d",
      label: "يوم واحد",
      description: "تحويلات خلال 24 ساعة من النقر",
    },
    {
      value: "7d",
      label: "7 أيام",
      description: "تحويلات خلال أسبوع من النقر (موصى به)",
    },
    { value: "28d", label: "28 يوم", description: "تحويلات خلال شهر من النقر" },
  ];

  const viewWindowOptions = [
    {
      value: "1d",
      label: "يوم واحد",
      description: "تحويلات خلال 24 ساعة من المشاهدة",
    },
    {
      value: "7d",
      label: "7 أيام",
      description: "تحويلات خلال أسبوع من المشاهدة",
    },
  ];

  const handleSave = async () => {
    if (!settings.adSetId.trim()) {
      toast.error("يرجى إدخال معرف مجموعة الإعلانات");
      return;
    }

    try {
      setLoading(true);
      const attributionPayload: any = {
        clickWindow: settings.clickWindow,
        viewWindow: settings.viewWindow,
        useAccountDefault: settings.useAccountDefault,
      };
      await facebookAdsService.updateAttributionSettings(
        settings.adSetId,
        attributionPayload,
      );
      toast.success("تم حفظ إعدادات الإحالة بنجاح! ✅");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error?.response?.data?.error || "فشل في حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/advertising/facebook-ads")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-gray-600" />
            إعدادات الإحالة (Attribution)
          </h1>
          <p className="text-gray-600 mt-1">
            تحديد كيفية احتساب التحويلات للإعلانات
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">ما هي نافذة الإحالة؟</h3>
            <p className="text-sm text-blue-700 mt-1">
              نافذة الإحالة تحدد الفترة الزمنية التي يتم فيها احتساب التحويل
              للإعلان. مثلاً، إذا اخترت 7 أيام للنقر، فإن أي عملية شراء تحدث
              خلال 7 أيام من النقر على الإعلان ستُحتسب كتحويل.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            تحديد مجموعة الإعلانات
          </h2>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              معرف مجموعة الإعلانات (Ad Set ID) *
            </label>
            <input
              type="text"
              value={settings.adSetId}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, adSetId: e.target.value }))
              }
              placeholder="أدخل معرف Ad Set"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Click Attribution */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <MousePointer className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              نافذة النقر (Click-Through)
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            الفترة الزمنية بعد النقر على الإعلان التي يتم فيها احتساب التحويلات
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clickWindowOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    clickWindow: option.value as any,
                  }))
                }
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  settings.clickWindow === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock
                    className={`w-5 h-5 ${settings.clickWindow === option.value ? "text-blue-600" : "text-gray-400"}`}
                  />
                  {settings.clickWindow === option.value && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h3
                  className={`font-semibold ${settings.clickWindow === option.value ? "text-blue-900" : "text-gray-900"}`}
                >
                  {option.label}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* View Attribution */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              نافذة المشاهدة (View-Through)
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            الفترة الزمنية بعد مشاهدة الإعلان (بدون نقر) التي يتم فيها احتساب
            التحويلات
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viewWindowOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    viewWindow: option.value as any,
                  }))
                }
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  settings.viewWindow === option.value
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock
                    className={`w-5 h-5 ${settings.viewWindow === option.value ? "text-purple-600" : "text-gray-400"}`}
                  />
                  {settings.viewWindow === option.value && (
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <h3
                  className={`font-semibold ${settings.viewWindow === option.value ? "text-purple-900" : "text-gray-900"}`}
                >
                  {option.label}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Account Default */}
        <div className="p-6 border-b">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useAccountDefault}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  useAccountDefault: e.target.checked,
                }))
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900">
                استخدام الإعدادات الافتراضية للحساب
              </span>
              <p className="text-sm text-gray-500">
                تجاهل الإعدادات أعلاه واستخدام إعدادات الحساب
              </p>
            </div>
          </label>
        </div>

        {/* Summary */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">ملخص الإعدادات</h3>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">نافذة النقر:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {
                    clickWindowOptions.find(
                      (o) => o.value === settings.clickWindow,
                    )?.label
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-500">نافذة المشاهدة:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {
                    viewWindowOptions.find(
                      (o) => o.value === settings.viewWindow,
                    )?.label
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex gap-3 justify-end">
          <button
            onClick={() => navigate("/advertising/facebook-ads")}
            className="px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !settings.adSetId.trim()}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributionSettings;
