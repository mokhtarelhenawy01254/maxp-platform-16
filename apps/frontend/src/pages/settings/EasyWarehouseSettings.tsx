import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import easyWarehouseService from "../../services/easyWarehouseService";
import {
  Package,
  Boxes,
  Save,
  Loader2,
  CheckCircle2,
  Info,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const EasyWarehouseSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await easyWarehouseService.getSettings();
        setEnabled(res.data?.easyWarehouseMode === true);
      } catch (error: any) {
        toast.error(error?.message || "تعذر تحميل إعدادات المستودع السهل");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await easyWarehouseService.updateSettings(enabled);
      setEnabled(res.data?.easyWarehouseMode === true);
      toast.success(
        res.data?.easyWarehouseMode
          ? "تم تفعيل وضع المستودع السهل بنجاح"
          : "تم إيقاف وضع المستودع السهل"
      );
    } catch (error: any) {
      toast.error(error?.message || "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل إعدادات المستودع...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">وضع المستودع السهل</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            وضع المستودع السهل (Easy Warehouse Mode)
          </h2>
          <p className="text-xs text-muted-foreground">
            استيراد وإنشاء المنتجات تلقائياً في الكتالوج عند ورود طلب لمنتج جديد لتسهيل الانطلاق السريع
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98] self-start sm:self-center"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>حفظ التغييرات</span>
        </button>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حالة الاستيراد التلقائي</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {enabled ? "مفعل تلقائياً" : "معطل"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
              enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              {enabled ? "Auto-Import" : "Manual Only"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>مزامنة الكتالوج</span>
            <Package className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {enabled ? "لحظية عند الطلب" : "كتالوج يدوي"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">On-the-fly</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حماية تسعير الصنف</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">سعر الطلب الأصلي</span>
            <span className="text-[10px] font-mono text-muted-foreground">Order Price Lock</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Panel */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
        {/* Toggle Switch */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Boxes className="w-4 h-4" />
              </span>
              <label htmlFor="easy-warehouse-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                تفعيل استيراد وإنشاء المنتجات تلقائياً بالكتالوج
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-primary/10 text-primary">
                Instant SKU Creation
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-8">
              عند تفعيل هذا الخيار، إذا ورد أي طلب يحتوي على منتج جديد غير مسجل مسبقاً في كتالوج المنتجات، يقوم النظام بإنشاء صنف جديد تلقائياً بالاسم والسعر المحدد في الطلب، دون تعطيل مسار البيع.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="easy-warehouse-toggle"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Operating Architecture Explanation */}
        <div className="p-4 sm:p-5 space-y-2 bg-muted/15 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Info className="w-4 h-4 text-primary" />
            <span>كيف يعمل وضع المستودع السهل في المتجر والمخزن؟</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside pr-1 leading-relaxed">
            <li>يمنع فشل أو رفض الطلبات الخارجية والواردة عبر الـ Webhook أو ملفات Excel حتى لو لم تكن المنتجات مضافة بالكتالوج.</li>
            <li>يتم توليد رمز تسلسلي فريد (SKU) لكل منتج جديد مستورد تلقائياً لتسهيل جرد المخزون لاحقاً.</li>
            <li>يمكن لمدير المتجر تعديل تكلفة المنتج، صوره، ومخزونه في أي وقت لاحق من شاشة كتالوج المنتجات.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EasyWarehouseSettings;
