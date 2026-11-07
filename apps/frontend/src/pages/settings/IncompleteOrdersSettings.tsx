import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Save, Loader2, Sparkles } from "lucide-react";

interface OrderSettingsApiResponse {
  success: boolean;
  data?: {
    autoConvertIncompleteToPending?: boolean;
    showIncompleteCartsInOrders?: boolean;
    [key: string]: any;
  };
}

export default function IncompleteOrdersSettings() {
  const [autoConvertIncomplete, setAutoConvertIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<OrderSettingsApiResponse>("/order-settings");
      if (response.data?.success && response.data?.data) {
        setAutoConvertIncomplete(
          Boolean(response.data.data.autoConvertIncompleteToPending)
        );
      }
    } catch (error) {
      console.error("Error fetching incomplete order settings:", error);
      tToast.error("IncompleteOrdersSettings.error_fetch_53e5");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put<OrderSettingsApiResponse>("/order-settings", {
        autoConvertIncompleteToPending: autoConvertIncomplete,
      });

      if (response.data?.success) {
        toast.success(
          autoConvertIncomplete
            ? "تم تفعيل تحويل الطلبات غير المكتملة تلقائياً بنجاح"
            : "تم إيقاف تحويل الطلبات غير المكتملة بنجاح"
        );
        fetchSettings();
      }
    } catch (error) {
      console.error("Error saving incomplete order settings:", error);
      tToast.error("IncompleteOrdersSettings.error_save_bccf");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono text-xs gap-3 select-none" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>جاري تحميل إعدادات الطلبات غير المكتملة...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4 text-foreground select-none" dir="rtl">
      {/* لوحة الإعداد البسيطة والواضحة */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                تحويل الطلبات غير المكتملة تلقائياً إلى «قيد الانتظار»
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-11">
              عند تفعيل هذا الخيار، سيتم تحويل السلال المتروكة الحديثة المتوفر بها رقم هاتف صالح تلقائياً إلى جدول الطلبات الرئيسي تحت تابة «قيد الانتظار» لتجهيزها ومتابعتها فوراً.
            </p>
          </div>

          {/* شارة الحالة مفعل / غير مفعل */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              autoConvertIncomplete
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "bg-muted text-muted-foreground border border-border/70"
            }`}
          >
            {autoConvertIncomplete ? "مفعل" : "غير مفعل"}
          </span>
        </div>

        {/* سطر التبديل الرئيسي */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
          <div>
            <p className="text-sm font-semibold text-foreground">
              تفعيل التحويل التلقائي
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              تبديل يدوي لتشغيل أو إيقاف استعادة الطلبات غير المكتملة
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoConvertIncomplete}
              onChange={() => setAutoConvertIncomplete((prev) => !prev)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted border border-border/80 after:absolute after:left-[3px] after:top-[3px] after:h-4.5 after:w-4.5 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:bg-white" />
          </label>
        </div>

        {/* زر حفظ الإعدادات */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>حفظ التعديل</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
