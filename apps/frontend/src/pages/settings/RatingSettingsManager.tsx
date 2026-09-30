import React, { useState, useEffect } from "react";
import {
  Star,
  Award,
  AlertTriangle,
  Save,
  Loader,
  Users,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { returnService, CustomerRatingHealthData } from "../../services/returnService";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

const RatingSettingsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthData, setHealthData] = useState<CustomerRatingHealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [settings, setSettings] = useState({
    excellentThreshold: 90,
    goodThreshold: 75,
    averageThreshold: 50,
    minOrdersForRating: 3,
    autoApproveExcellent: false,
    autoRejectBad: false,
  });

  useEffect(() => {
    fetchSettingsAndHealth();
  }, []);

  const fetchSettingsAndHealth = async () => {
    setLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.allSettled([
        returnService.getSettings(),
        returnService.getRatingHealth(),
      ]);

      if (settingsRes.status === "fulfilled") {
        const res = settingsRes.value;
        setSettings({
          excellentThreshold: res.data.excellentThreshold ?? 90,
          goodThreshold: res.data.goodThreshold ?? 75,
          averageThreshold: (res.data as any).averageThreshold ?? 50,
          minOrdersForRating: res.data.minOrdersForRating ?? 3,
          autoApproveExcellent: res.data.autoApproveExcellent ?? false,
          autoRejectBad: res.data.autoRejectBad ?? false,
        });
      }

      if (healthRes.status === "fulfilled" && healthRes.value.data?.data) {
        setHealthData(healthRes.value.data.data);
      }
    } catch (error) {
      console.error("Failed to load rating settings or health:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshHealthReport = async () => {
    setLoadingHealth(true);
    try {
      const res = await returnService.getRatingHealth();
      if (res.data?.data) {
        setHealthData(res.data.data);
      }
    } catch (e) {
      console.warn("Failed to refresh health report:", e);
    } finally {
      setLoadingHealth(false);
    }
  };

  const validateSequence = () => {
    const avg = Number(settings.averageThreshold);
    const good = Number(settings.goodThreshold);
    const exc = Number(settings.excellentThreshold);
    const minOrders = Number(settings.minOrdersForRating);

    if (isNaN(avg) || isNaN(good) || isNaN(exc) || isNaN(minOrders)) {
      return "جميع قيم العتبات والحد الأدنى للطلبات يجب أن تكون أرقاماً صالحة";
    }
    if (avg < 0 || avg > 100 || good < 0 || good > 100 || exc < 0 || exc > 100) {
      return "نسب التقييم يجب أن تكون بين 0% و 100%";
    }
    if (avg >= good) {
      return "نسبة التقييم المتوسط يجب أن تكون أقل من نسبة التقييم الجيد (متوسط < جيد)";
    }
    if (good >= exc) {
      return "نسبة التقييم الجيد يجب أن تكون أقل من نسبة التقييم الممتاز (جيد < ممتاز)";
    }
    if (minOrders < 1) {
      return "الحد الأدنى للطلبات يجب أن يكون 1 على الأقل";
    }
    return null;
  };

  const validationError = validateSequence();

  const handleSave = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await returnService.updateSettings(settings);
      tToast.success("RatingSettingsManager.success_save_3111");
      // Refresh health report in background after recalculation begins
      setTimeout(() => {
        refreshHealthReport();
      }, 1000);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message;
      if (msg) {
        toast.error(msg);
      } else {
        tToast.error("RatingSettingsManager.failed_save_dfaf");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        جاري تحميل الإعدادات...
      </div>
    );

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Automated Health & Telemetry Report Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تقرير صحة التقييم الآلي للعملاء
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                متابعة حية لتصنيف العملاء المعتمد على نسبة الاستلام ومزامنة الطلبات التلقائية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>نظام تلقائي 100%</span>
            </span>
            {healthData?.rulesVersion && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                v{healthData.rulesVersion}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي العملاء</span>
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {healthData?.totalCustomers ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">ممتاز</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {healthData?.breakdown?.EXCELLENT ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-sky-900/40 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-sky-700 dark:text-sky-400 font-medium">جيد</span>
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            </div>
            <span className="text-xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
              {healthData?.breakdown?.GOOD ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-100 dark:border-amber-900/40 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">متوسط</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <span className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {healthData?.breakdown?.AVERAGE ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-100 dark:border-rose-900/40 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">ضعيف</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <span className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
              {healthData?.breakdown?.POOR ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">جديد / غير مصنف</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <span className="text-xl font-bold tabular-nums text-slate-600 dark:text-slate-300">
              {healthData?.breakdown?.UNKNOWN ?? 0}
            </span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>العملاء المصنفون: <strong className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{healthData?.ratedCustomers ?? 0}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>آخر مزامنة فحص: {healthData?.lastRunAt ? new Date(healthData.lastRunAt).toLocaleTimeString("ar-EG") : "نشط الآن"}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              الأخطاء المسجلة: {healthData?.failureCount ?? 0} (سليم)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Automated Rating Thresholds Configuration Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-slate-400" />
            حدود التقييم الآلي للعملاء
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تحديد نسب نجاح التسليم المطلوبة والحد الأدنى للطلبات لاحتساب مستوى العميل آلياً.
          </p>
        </div>

        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
              ممتاز (Excellent)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">&ge;</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={settings.excellentThreshold}
                onChange={(e) =>
                  handleChange("excellentThreshold", parseFloat(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-slate-600 rounded text-center font-bold text-emerald-900 dark:text-white dark:bg-slate-700 tabular-nums"
              />
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">%</span>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700/80 dark:text-emerald-400">
              عدد الطلبات &ge; 10 ونسبة استلام &ge; {settings.excellentThreshold}%
            </p>
          </div>

          <div className="bg-sky-50/70 dark:bg-sky-950/20 p-4 rounded-lg border border-sky-100 dark:border-sky-800/50">
            <div className="flex items-center gap-2 mb-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
              <Star className="h-4 w-4 text-sky-600" />
              جيد (Good)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">&ge;</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={settings.goodThreshold}
                onChange={(e) =>
                  handleChange("goodThreshold", parseFloat(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-slate-600 rounded text-center font-bold text-sky-900 dark:text-white dark:bg-slate-700 tabular-nums"
              />
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">%</span>
            </div>
            <p className="mt-2 text-[11px] text-sky-700/80 dark:text-sky-400">
              عدد الطلبات &ge; 5 ونسبة استلام &ge; {settings.goodThreshold}%
            </p>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
            <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <Star className="h-4 w-4 text-amber-600" />
              متوسط (Average)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">&ge;</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={settings.averageThreshold}
                onChange={(e) =>
                  handleChange("averageThreshold", parseFloat(e.target.value) || 0)
                }
                className="w-20 p-1 border dark:border-slate-600 rounded text-center font-bold text-amber-900 dark:text-white dark:bg-slate-700 tabular-nums"
              />
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">%</span>
            </div>
            <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-400">
              عدد الطلبات &ge; {settings.minOrdersForRating} ونسبة استلام &ge; {settings.averageThreshold}%
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              الحد الأدنى للطلبات
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300">&ge;</span>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.minOrdersForRating}
                onChange={(e) =>
                  handleChange("minOrdersForRating", parseInt(e.target.value) || 1)
                }
                className="w-20 p-1 border dark:border-slate-600 rounded text-center font-bold text-slate-900 dark:text-white dark:bg-slate-700 tabular-nums"
              />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                طلبات
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              أقل من هذا العدد يصنف كـ "جديد / غير مصنف"
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 rounded-b-xl">
          <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>قواعد الاحتساب الآلي في المنصة:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 ps-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <li>التقييم <strong>تلقائي 100%</strong> ومبني مباشرةً على تطابق شرطي (عدد المحاولات + نسبة الاستلام معاً).</li>
            <li>الطلبات الجزئية (تسليم جزئي أو استرجاع جزئي) تُوزن نسبياً بمقدار 50% تسليم و50% محاولة.</li>
            <li>حالات الضياع في الشحن (LOST) واسترجاع المتجر (REFUNDED) لا تُخصم من نسبة استلام العميل افتراضياً.</li>
            <li>يتم تحديث التقييم آلياً وفورياً عند تسليم الطلبات أو استرجاعها وبواسطة Webhooks شركات الشحن.</li>
            <li>عند حفظ الإعدادات، يتم تحديث تصنيف كافة العملاء تلقائياً في الخلفية بدون الحاجة لأي تدخل يدوي.</li>
          </ul>
        </div>
      </div>

      {/* 3. Automation Policies Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-slate-400" />
            الأتمتة (Automations)
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            إجراءات تلقائية بناءً على تقييم العملاء.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                الموافقة التلقائية لـ "الممتازين"
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
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
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoApproveExcellent ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
              ></label>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                الرفض التلقائي/مراجعة يدوية لـ "الضعفاء"
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                تحويل طلبات العملاء ذوي التقييم الضعيف للمراجعة اليدوية دائماً (Risk Protection).
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
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.autoRejectBad ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
              ></label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || Boolean(validationError)}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all duration-150 cursor-pointer"
        >
          {saving ? (
            <Loader className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          <span>حفظ التغييرات</span>
        </button>
      </div>
    </div>
  );
};

export default RatingSettingsManager;
