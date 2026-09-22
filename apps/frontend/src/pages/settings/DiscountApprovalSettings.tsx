import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  ShieldAlert,
  Percent,
  Ban,
  CheckCircle,
  Loader2,
  Save,
  AlertCircle,
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
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="mr-2 text-sm font-medium">جاري تحميل إعدادات الخصومات...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              سياسة حظر واعتماد الخصومات
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              التحكم في تطبيق الخصومات والكوبونات التلقائية واشتراط موافقة المالك قبل التأكيد أو الشحن
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        {/* Switch 1: Require Approval on any discount */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <label
                htmlFor="require-discount-approval"
                className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                الموافقة الإلزامية على الخصومات والكوبونات
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
              عند تفعيل هذا الخيار، يتم وضع أي طلب يحتوي على خصم (كوبون، عرض، أو خصم يدوي) في حالة <span className="font-semibold text-amber-700 dark:text-amber-300">«بانتظار اعتماد الخصم»</span>، ويُمنع تأكيد الطلب أو شحنه حتى يتم اعتماده صراحة من قِبل الإدارة أو إلغاء الخصم.
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
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {/* Switch 2: Block automatic promotions without prior approval */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <label
                htmlFor="disable-auto-discounts"
                className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                إيقاف تطبيق الكوبونات التلقائية والعروض في المتجر بدون موافقة مسبقة
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
              يمنع السلة وواجهة المتجر من خصم الكوبونات التلقائية والعروض الترويجية بشكل تلقائي وسري للعملاء بدون مراجعة، مما يحمي هوامش أرباحك من الخصومات غير المحسوبة.
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
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {/* Guidance Alert */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            عند اعتماد الخصم في تفاصيل الطلب، يتم تسجيل اسم المستخدم ووقت الاعتماد في سجل حركة الطلب، كما يمكن رفض الخصم بنقرة زر واحدة لإعادة احتساب الإجمالي بدون خصم.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountApprovalSettings;
