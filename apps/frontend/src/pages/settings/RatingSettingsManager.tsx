import React, { useState, useEffect } from "react";
import {
  Star,
  ShieldAlert,
  Award,
  AlertTriangle,
  Save,
  Loader,
  Users,
  TrendingUp,
} from "lucide-react";
import { returnService } from "../../services/returnService";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

const RatingSettingsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    excellentThreshold: 90,
    goodThreshold: 70,
    averageThreshold: 50,
    minOrdersForRating: 3,
    autoApproveExcellent: false,
    autoRejectBad: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await returnService.getSettings();
      setSettings({
        excellentThreshold: res.data.excellentThreshold ?? 90,
        goodThreshold: res.data.goodThreshold ?? 70,
        averageThreshold: res.data.averageThreshold ?? 50,
        minOrdersForRating: res.data.minOrdersForRating ?? 3,
        autoApproveExcellent: res.data.autoApproveExcellent ?? false,
        autoRejectBad: res.data.autoRejectBad ?? false,
      });
    } catch (error) {
      console.error(error);
      // Fallback just in case
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await returnService.updateSettings(settings);
      tToast.success("RatingSettingsManager.success_save_3111");
    } catch (error) {
      tToast.error("RatingSettingsManager.failed_save_dfaf");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        جاري تحميل الإعدادات...
      </div>
    );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-gray-400" />
              حدود التقييم الآلي للعملاء
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              تحديد نسب نجاح التسليم المطلوبة والحد الأدنى للطلبات لاحتساب مستوى العميل آلياً.
            </p>
          </div>
        </div>

        <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
              ممتاز (Excellent)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                &ge;
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.excellentThreshold}
                onChange={(e) =>
                  handleChange("excellentThreshold", parseInt(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-emerald-900 dark:text-white dark:bg-gray-700 tabular-nums"
              />
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                %
              </span>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700/80 dark:text-emerald-400">
              أعلى نسبة استلام للطلبات
            </p>
          </div>

          <div className="bg-sky-50/70 dark:bg-sky-950/20 p-4 rounded-lg border border-sky-100 dark:border-sky-800/50">
            <div className="flex items-center gap-2 mb-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
              <Star className="h-4 w-4 text-sky-600" />
              جيد (Good)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                &ge;
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.goodThreshold}
                onChange={(e) =>
                  handleChange("goodThreshold", parseInt(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-sky-900 dark:text-white dark:bg-gray-700 tabular-nums"
              />
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                %
              </span>
            </div>
            <p className="mt-2 text-[11px] text-sky-700/80 dark:text-sky-400">
              نسبة استلام مقبولة ومستقرة
            </p>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
            <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <Star className="h-4 w-4 text-amber-600" />
              متوسط (Average)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                &ge;
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.averageThreshold}
                onChange={(e) =>
                  handleChange("averageThreshold", parseInt(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-amber-900 dark:text-white dark:bg-gray-700 tabular-nums"
              />
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                %
              </span>
            </div>
            <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-400">
              يحتاج متابعة وتأكيد
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              الحد الأدنى للطلبات
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                &ge;
              </span>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.minOrdersForRating}
                onChange={(e) =>
                  handleChange("minOrdersForRating", parseInt(e.target.value) || 1)
                }
                className="w-20 p-1 border dark:border-gray-600 rounded text-center font-bold text-slate-900 dark:text-white dark:bg-gray-700 tabular-nums"
              />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                طلبات
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              أقل من هذا العدد يصنف كـ "جديد"
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 text-xs text-gray-600 dark:text-gray-400 space-y-1.5 rounded-b-lg">
          <p className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>آلية التقييم التلقائي في النظام:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 ps-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            <li>التقييم <strong>تلقائي 100%</strong> ومبني مباشرةً على نسبة استلام طلبات العميل السابقة: (الطلبات المسلّمة ÷ الطلبات المنتهية [المسلّمة + المرتجعة]) × 100%.</li>
            <li>العميل الذي تقل نسبة استلامه عن نسبة "متوسط" يُصنف تلقائياً كـ <strong>"عميل ضعيف / مخاطرة"</strong>.</li>
            <li>العميل الذي لديه طلبات منتهية أقل من الحد الأدنى يُصنف تلقائياً كـ <strong>"عميل جديد / غير مصنف"</strong>.</li>
            <li>عند حفظ التغييرات، يقوم النظام آلياً بتحديث وإعادة احتساب تصنيف العملاء في الخلفية وفق المعايير الجديدة.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            الأتمتة (Automations)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إجراءات تلقائية بناءً على تقييم العملاء.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                الموافقة التلقائية لـ "الممتازين"
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                قبول طلبات الإرجاع تلقائياً إذا كان العميل ممتاز.
              </p>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                checked={settings.autoApproveExcellent}
                onChange={(e) =>
                  handleChange("autoApproveExcellent", e.target.checked)
                }
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoApproveExcellent ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
              ></label>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                الرفض التلقائي/مراجعة يدوية لـ "السيئين"
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تحويل طلبات العملاء السيئين للمراجعة اليدوية دائماً (Risk
                Protection).
              </p>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                checked={settings.autoRejectBad}
                onChange={(e) =>
                  handleChange("autoRejectBad", e.target.checked)
                }
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoRejectBad ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
              ></label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          {saving ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
};

export default RatingSettingsManager;
