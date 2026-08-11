import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { Loader2, Zap, CheckCircle } from "lucide-react";

interface AutoDiscountSettingsProps {
  onSaved?: (data?: any) => void;
}

/**
 * إعدادات نظام "الخصم التلقائي":
 * كوبون خصم % على الأوردر الجاي، صلاحيته أيام، ويتحول لكاش باك عند الانتهاء،
 * + معدل النقاط وقيمة الاستبدال.
 */
const AutoDiscountSettings: React.FC<AutoDiscountSettingsProps> = ({ onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cfg, setCfg] = useState({
    system: "AUTO_DISCOUNT",
    activated: false,
    enabled: true,
    discountPercent: 10,
    validityDays: 3,
    convertExpiredToCashback: true,
    pointsPerAmount: 5,
    pointsRedemptionValue: 1,
    redeemPointsEnabled: true,
    loyaltyActivatedAt: undefined as string | undefined,
  });

  const load = async () => {
    try {
      const res = await apiClient.get("/hr/customer-loyalty/system-settings");
      setCfg((prev) => ({ ...prev, ...(res.data?.data || {}) }));
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // تفعيل نظام الخصم التلقائي: بيحفظ كل الإعدادات + بيفعّل النظام
  const activate = async () => {
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    try {
      const res = await apiClient.put("/hr/customer-loyalty/system-settings", {
        ...cfg,
        system: "AUTO_DISCOUNT",
        activated: true,
      });
      setCfg((prev) => ({ ...prev, ...(res.data?.data || {}), activated: true }));
      setSavedMsg("تم تفعيل نظام الخصم التلقائي وحفظ الإعدادات ✓");
      onSaved?.(res.data?.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || "فشل التفعيل");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) => setCfg((prev) => ({ ...prev, [k]: v }));

  const inputCls =
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

  const isActivated = cfg.activated === true;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">الخصم التلقائي</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            بعد كل أوردر مسلّم العميل بياخد خصم % على الأوردر الجاي، ولو خلصت المدة من غير استخدام بيتحول كاش باك في محفظته.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={Boolean(cfg.enabled)} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-amber-500" />
              تفعيل نظام الخصم التلقائي
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">نسبة الخصم %</label>
                <input type="number" min="0" max="100" value={cfg.discountPercent} onChange={(e) => set("discountPercent", Number(e.target.value))} className={inputCls + " mt-1"} />
              </div>
              <div>
                <label className="text-xs text-gray-500">مدة الصلاحية (أيام)</label>
                <input type="number" min="1" value={cfg.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} className={inputCls + " mt-1"} />
              </div>
              <div>
                <label className="text-xs text-gray-500">معدل النقاط (ج.م لكل نقطة)</label>
                <input type="number" min="0.01" step="0.01" value={cfg.pointsPerAmount} onChange={(e) => set("pointsPerAmount", Number(e.target.value))} className={inputCls + " mt-1"} />
                <p className="text-[10px] text-gray-400 mt-1">مثال: 5 = كل 100ج → 20 نقطة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">تاريخ تفعيل نظام الخصم</label>
                <input
                  type="date"
                  value={cfg.loyaltyActivatedAt ? cfg.loyaltyActivatedAt.slice(0, 10) : ""}
                  onChange={(e) => set("loyaltyActivatedAt", e.target.value ? new Date(e.target.value + "T00:00:00").toISOString() : null)}
                  className={inputCls + " mt-1"}
                />
                <p className="text-[10px] text-gray-400 mt-1">الأوردرات اللي اتسلمت قبل التاريخ ده مش بتاخد كوبون خصم وبتتوصف "قبل تفعيل النظام".</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">قيمة النقطة عند الاستبدال (ج.م لكل نقطة)</label>
                <input type="number" min="0.01" step="0.01" value={cfg.pointsRedemptionValue} onChange={(e) => set("pointsRedemptionValue", Number(e.target.value))} className={inputCls + " mt-1"} />
                <p className="text-[10px] text-gray-400 mt-1">مثال: 1 = كل نقطة بجنية — 500 نقطة = 500ج أوردر</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={Boolean(cfg.convertExpiredToCashback)} onChange={(e) => set("convertExpiredToCashback", e.target.checked)} className="h-4 w-4 accent-amber-500 mt-0.5" />
                <span>
                  تحويل الكوبون المنتهي لكاش باك
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">الكوبون اللي خلصت مدته من غير استخدام بيتحوّل لرصيد كاش باك في محفظة العميل.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={Boolean(cfg.redeemPointsEnabled)} onChange={(e) => set("redeemPointsEnabled", e.target.checked)} className="h-4 w-4 accent-amber-500 mt-0.5" />
                <span>
                  استبدال النقاط بالخصم
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">العميل يقدر يستبدل النقاط اللي جمعها بخصم على الأوردر الجاي.</span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              {savedMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{savedMsg}</span>}
              {errorMsg && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{errorMsg}</span>}
              <button
                onClick={activate}
                disabled={saving || isActivated}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActivated
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 cursor-not-allowed"
                    : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isActivated ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {isActivated ? "تم التفعيل" : "تفعيل النظام"}
              </button>
            </div>
            {isActivated && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">
                نظام الخصم التلقائي مفعّل — الإعدادات بتتحفظ أوتوماتيكياً عند أي تعديل، وبادج "خصم متاح" بيظهر للعملاء.
              </p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">ملاحظة:</p>
            <p>تفعيل هذا النظام يوقف نظام المستويات تلقائياً — لو رجعنا لنظام المستويات، بيوقف الخصم التلقائي.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AutoDiscountSettings;
