import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  ArrowLeftRight,
  ShieldCheck,
  Clock,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
  Save,
} from "lucide-react";

export interface ExchangeReturnPolicyState {
  requirePreviousOrder: boolean;
  allowedStatuses: string[];
  timeLimitDays: number;
  requireExplicitOrderLink: boolean;
}

const DEFAULT_POLICY: ExchangeReturnPolicyState = {
  requirePreviousOrder: true,
  allowedStatuses: ["DELIVERED"],
  timeLimitDays: 14,
  requireExplicitOrderLink: false,
};

const AVAILABLE_STATUS_OPTIONS = [
  { code: "DELIVERED", label: "تم التسليم (DELIVERED) — موصى به" },
  { code: "SHIPPED", label: "تم الشحن (SHIPPED)" },
  { code: "PARTIALLY_DELIVERED", label: "تسليم جزئي (PARTIALLY_DELIVERED)" },
];

export const ExchangeReturnSettings: React.FC = () => {
  const [policy, setPolicy] = useState<ExchangeReturnPolicyState>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/order-settings");
      if (res.data?.success) {
        const fetched = res.data.data?.exchangeReturnPolicy;
        if (fetched) {
          setPolicy({
            requirePreviousOrder: Boolean(fetched.requirePreviousOrder),
            allowedStatuses: Array.isArray(fetched.allowedStatuses) && fetched.allowedStatuses.length > 0
              ? fetched.allowedStatuses
              : ["DELIVERED"],
            timeLimitDays: Number.isFinite(Number(fetched.timeLimitDays))
              ? Number(fetched.timeLimitDays)
              : 14,
            requireExplicitOrderLink: Boolean(fetched.requireExplicitOrderLink),
          });
        }
      }
    } catch (error) {
      console.error("Error loading exchange/return policy:", error);
      toast.error("فشل في تحميل إعدادات الاستبدال والاسترجاع");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put("/order-settings", {
        exchangeReturnPolicy: {
          requirePreviousOrder: policy.requirePreviousOrder,
          allowedStatuses: policy.allowedStatuses.length > 0 ? policy.allowedStatuses : ["DELIVERED"],
          timeLimitDays: Math.max(0, Number(policy.timeLimitDays) || 0),
          requireExplicitOrderLink: policy.requireExplicitOrderLink,
        },
      });

      if (res.data?.success) {
        toast.success("تم حفظ سياسة الاستبدال والاسترجاع بنجاح");
        if (res.data.data?.exchangeReturnPolicy) {
          setPolicy(res.data.data.exchangeReturnPolicy);
        }
      }
    } catch (error) {
      console.error("Error saving exchange/return policy:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (code: string) => {
    setPolicy((prev) => {
      const exists = prev.allowedStatuses.includes(code);
      const updated = exists
        ? prev.allowedStatuses.filter((s) => s !== code)
        : [...prev.allowedStatuses, code];
      return {
        ...prev,
        allowedStatuses: updated.length > 0 ? updated : ["DELIVERED"],
      };
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              سياسة طلبات الاستبدال والمرتجع
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              تنظيم عمليات إنشاء طلبات الاستبدال والاسترجاع لمنع إصدار طلبات بدون وجود سجل شراء سابق
              موثق للعميل، ولضمان مطابقة الشحنات للقوانين وسياسة الضمان.
            </p>
          </div>
        </div>
      </div>

      {/* Main Toggle Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                اشتراط وجود طلب سابق للعميل
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
              عند التفعيل، لن يُسمح لأي موظف أو مسوق بإنشاء طلب استبدال أو مرتجع لعميل جديد أو رقم هاتف لا
              يمتلك طلباً سابقاً مؤهلاً في النظام.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={policy.requirePreviousOrder}
              onChange={(e) =>
                setPolicy({ ...policy, requirePreviousOrder: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Detailed Constraints */}
        <div
          className={`pt-6 space-y-6 transition-opacity ${
            policy.requirePreviousOrder ? "opacity-100" : "opacity-40 pointer-events-none"
          }`}
        >
          {/* Allowed Statuses */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              الحالات المعتمدة للطلب السابق المؤهل
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              حدد الحالات التي يجب أن يكون عليها الطلب السابق ليتم اعتباره مؤهلاً للاستبدال أو المرتجع:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_STATUS_OPTIONS.map((opt) => {
                const checked = policy.allowedStatuses.includes(opt.code);
                return (
                  <button
                    type="button"
                    key={opt.code}
                    onClick={() => toggleStatus(opt.code)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-start transition-colors ${
                      checked
                        ? "bg-blue-50/60 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200"
                        : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        checked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {checked && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                المهلة الزمنية للاستبدال / الاسترجاع (أيام)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={policy.timeLimitDays}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      timeLimitDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="14"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  يوم
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                الافتراضي 14 يوماً وفق قانون حماية المستهلك. ضع 0 إذا كنت لا ترغب في فرض مهلة زمنية.
              </p>
            </div>

            {/* Explicit Link Toggle */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <LinkIcon className="w-4 h-4 text-gray-400" />
                إلزام اختيار رقم الطلب السابق صراحة
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  إلزام الموظف بتحديد رقم الطلب من القائمة
                </span>
                <input
                  type="checkbox"
                  checked={policy.requireExplicitOrderLink}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      requireExplicitOrderLink: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                إذا تم تعطيله، سيكتفي النظام بالتحقق التلقائي من وجود أي طلب سابق مسلّم للعميل.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeReturnSettings;
