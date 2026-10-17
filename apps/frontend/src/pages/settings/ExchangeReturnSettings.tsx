import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  ArrowLeftRight,
  ShieldCheck,
  Clock,
  Check,
  Link2,
  Loader2,
  Save,
  AlertCircle,
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
  { code: "DELIVERED", label: "تم التسليم بنجاح (DELIVERED) — قياسي" },
  { code: "SHIPPED", label: "خرج للشحن (SHIPPED)" },
  { code: "PARTIALLY_DELIVERED", label: "تسليم جزئي للأصناف (PARTIALLY_DELIVERED)" },
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
            allowedStatuses:
              Array.isArray(fetched.allowedStatuses) && fetched.allowedStatuses.length > 0
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
          allowedStatuses:
            policy.allowedStatuses.length > 0 ? policy.allowedStatuses : ["DELIVERED"],
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
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل سياسة الاستبدال والمرتجع...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">الاستبدال والاسترجاع</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            سياسة ومعايير طلبات الاستبدال والمرتجع
          </h2>
          <p className="text-xs text-muted-foreground">
            تنظيم وضبط عمليات المرتجع لمنع إصدار شحنات بدون سجل شراء مؤكد وحماية هامش التاجر
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98] self-start sm:self-center"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>حفظ السياسة</span>
        </button>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>شرط السجل السابق</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {policy.requirePreviousOrder ? "إلزامي للعميل" : "مفتوح دون قيد"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
              policy.requirePreviousOrder
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {policy.requirePreviousOrder ? "Strict" : "Open"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>مهلة الضمان القانونية</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {policy.timeLimitDays > 0 ? `${policy.timeLimitDays} يوم` : "غير مقيدة"}
            </span>
            <span className="text-[11px] text-muted-foreground">فترة السماح</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>ربط الطلب الصريح</span>
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {policy.requireExplicitOrderLink ? "اختيار رقم الطلب" : "فحص آلي بالهاتف"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Order Link</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Panel */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
        {/* Toggle 1: Require previous order */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <label htmlFor="req-prev-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                اشتراط وجود طلب شراء سابق ومسلّم للعميل
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Purchase Verification
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-8">
              يمنع أي مسوق أو موظف دعم من إنشاء طلب استبدال أو مرتجع وهمي لأي رقم هاتف لا يمتلك طلباً مسلماً بالفعل في سجلات المتجر.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="req-prev-toggle"
              checked={policy.requirePreviousOrder}
              onChange={(e) => setPolicy({ ...policy, requirePreviousOrder: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Detailed Constraints */}
        <div className={`p-4 sm:p-5 space-y-4 transition-opacity ${
          !policy.requirePreviousOrder ? "opacity-50 pointer-events-none" : ""
        }`}>
          {/* Allowed Statuses */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              الحالات المعتمدة للطلب السابق المؤهل للاستبدال:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AVAILABLE_STATUS_OPTIONS.map((opt) => {
                const checked = policy.allowedStatuses.includes(opt.code);
                return (
                  <button
                    type="button"
                    key={opt.code}
                    onClick={() => toggleStatus(opt.code)}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-right transition-all active:scale-[0.98] ${
                      checked
                        ? "border-primary bg-primary/10 text-foreground font-medium shadow-2xs"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{opt.label}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                        checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time window & explicit link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>المهلة الزمنية للاستبدال / الاسترجاع (أيام)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={policy.timeLimitDays}
                  onChange={(e) =>
                    setPolicy({ ...policy, timeLimitDays: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary tabular-nums"
                  placeholder="14"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  يوم
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                الافتراضي 14 يوماً وفق معايير التجارة. ضع 0 إذا كنت لا ترغب في فرض حد زمني.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>إلزام تحديد رقم الطلب السابق صراحة</span>
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/20">
                <span className="text-xs text-foreground font-medium">
                  إلزام الموظف باختيار الطلب من القائمة
                </span>
                <input
                  type="checkbox"
                  checked={policy.requireExplicitOrderLink}
                  onChange={(e) =>
                    setPolicy({ ...policy, requireExplicitOrderLink: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                في حال التعطيل، يكتفي السيستم بالتحقق الآلي من رقم هاتف العميل دون إجبار الموظف على اختيار الطلب.
              </p>
            </div>
          </div>
        </div>

        {/* Operating policy footer */}
        <div className="p-3.5 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary shrink-0" />
          <span>تضمن هذه السياسة حماية أرباح التاجر وتمنع الشحن العشوائي لطلبات الاستبدال دون تسليم مثبت.</span>
        </div>
      </div>
    </div>
  );
};

export default ExchangeReturnSettings;
