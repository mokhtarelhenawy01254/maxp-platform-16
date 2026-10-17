import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  ShieldAlert,
  Percent,
  Ban,
  CheckCircle2,
  Loader2,
  Save,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export const DiscountApprovalSettings: React.FC = () => {
  const [requireDiscountApproval, setRequireDiscountApproval] = useState<boolean>(true);
  const [disableAutoDiscounts, setDisableAutoDiscounts] = useState<boolean>(true);
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
        const data = res.data.data;
        if (data) {
          setRequireDiscountApproval(
            data.requireDiscountApproval !== undefined
              ? Boolean(data.requireDiscountApproval)
              : true
          );
          setDisableAutoDiscounts(
            data.disableAutoDiscountsWithoutApproval !== undefined
              ? Boolean(data.disableAutoDiscountsWithoutApproval)
              : true
          );
        }
      }
    } catch (error) {
      console.error("Error loading discount approval settings:", error);
      toast.error("فشل في تحميل إعدادات اعتماد الخصومات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put("/order-settings", {
        requireDiscountApproval,
        disableAutoDiscountsWithoutApproval: disableAutoDiscounts,
      });

      if (res.data?.success) {
        toast.success("تم حفظ إعدادات اعتماد الخصومات بنجاح");
      } else {
        toast.error(res.data?.message || "فشل حفظ الإعدادات");
      }
    } catch (error: any) {
      console.error("Error saving discount approval settings:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2 select-none" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">جاري تحميل إعدادات الخصومات...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-3.5 select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">اعتماد وحظر الخصومات</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            سياسة حظر واعتماد الخصومات
          </h2>
          <p className="text-xs text-muted-foreground">
            التحكم في تطبيق الخصومات والكوبونات التلقائية واشتراط موافقة المالك قبل التأكيد أو الشحن
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>شرط الاعتماد اليدوي</span>
            <Percent className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-foreground">
              {requireDiscountApproval ? "إلزامي للمالك" : "تطبيق فوري"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
              requireDiscountApproval
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-muted text-muted-foreground border-border/60"
            }`}>
              {requireDiscountApproval ? "نشط" : "معطل"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الكوبونات التلقائية</span>
            <Ban className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-foreground">
              {disableAutoDiscounts ? "محظورة بالمتجر" : "تطبيق تلقائي"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
              disableAutoDiscounts
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border/60"
            }`}>
              {disableAutoDiscounts ? "محمي" : "مفتوح"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>مستوى حماية الهامش</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-bold font-mono text-foreground tabular-nums">
              {requireDiscountApproval && disableAutoDiscounts ? "100%" : requireDiscountApproval || disableAutoDiscounts ? "50%" : "0%"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {requireDiscountApproval && disableAutoDiscounts ? "أمان تام" : "حماية جزئية"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Panel */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60 shadow-2xs">
        {/* Toggle 1: Manual Approval */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Percent className="w-3.5 h-3.5" />
              </span>
              <label
                htmlFor="require-discount-approval"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                الموافقة الإلزامية على الخصومات والكوبونات
              </label>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Manual Approval
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-7">
              عند تفعيل هذا الخيار، يتم وضع أي طلب يحتوي على خصم في حالة{" "}
              <span className="font-semibold text-foreground underline decoration-amber-500/40">
                «بانتظار اعتماد الخصم»
              </span>
              ، ويُمنع تأكيد الطلب أو شحنه حتى يتم اعتماده صراحة من قِبل الإدارة.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="require-discount-approval"
              checked={requireDiscountApproval}
              onChange={(e) => setRequireDiscountApproval(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Toggle 2: Block Auto Apply */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Ban className="w-3.5 h-3.5" />
              </span>
              <label
                htmlFor="disable-auto-discounts"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                إيقاف تطبيق الكوبونات والعروض التلقائية بالمتجر بدون موافقة مسبقة
              </label>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                Block Auto-Apply
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-7">
              يمنع السلة وواجهة المتجر من خصم الكوبونات التلقائية والعروض الترويجية بشكل خفي وتلقائي بدون مراجعة بشرية، مما يحمي هوامش أرباحك الصافية.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="disable-auto-discounts"
              checked={disableAutoDiscounts}
              onChange={(e) => setDisableAutoDiscounts(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Audit info row */}
        <div className="p-3.5 bg-muted/20 flex items-start gap-2.5 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            عند اعتماد الخصم داخل تفاصيل الطلب، يتم توثيق اسم المشرف ووقت الاعتماد في سجل التدقيق (Audit Log)، كما يمكن نقض الخصم بنقرة زر واحدة لإعادة احتساب الإجمالي الأصلي فورياً.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiscountApprovalSettings;
