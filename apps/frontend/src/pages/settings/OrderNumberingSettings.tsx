import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import {
  Hash,
  Barcode,
  Save,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Layers,
} from "lucide-react";

interface OrderSettings {
  enableSequentialOrders: boolean;
  orderPrefix: string;
  nextOrderNumber: number;
  orderNumberFormat: string;
}

export const OrderNumberingSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<OrderSettings>({
    enableSequentialOrders: false,
    orderPrefix: "ORD",
    nextOrderNumber: 1,
    orderNumberFormat: "PREFIX-XXXXXX",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetNumber, setResetNumber] = useState("");
  const [previewNumber, setPreviewNumber] = useState("ORD-000001");
  const [applyToPastOrders, setApplyToPastOrders] = useState(false);
  const [prefixWarning, setPrefixWarning] = useState("");

  useEffect(() => {
    void fetchSettings();
  }, []);

  useEffect(() => {
    setPreviewNumber(`${settings.orderPrefix}-${settings.nextOrderNumber}`);
  }, [settings.orderPrefix, settings.nextOrderNumber]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/order-settings");
      if (res.data.success) {
        const d = res.data.data || {};
        setSettings({
          enableSequentialOrders: d.enableSequentialOrders ?? false,
          orderPrefix: d.orderPrefix || "ORD",
          nextOrderNumber: d.nextOrderNumber || 1,
          orderNumberFormat: d.orderNumberFormat || "PREFIX-XXXXXX",
        });
      }
    } catch (e) {
      console.error("Error fetching numbering settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put("/order-settings", { ...settings, applyToPastOrders });
      if (res.data.success) {
        toast.success(t("orderNumbering.saveSuccess") || "تم حفظ إعدادات الترقيم بنجاح");
        void fetchSettings();
      }
    } catch (e: any) {
      console.error("Error saving numbering settings:", e);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    const num = parseInt(resetNumber);
    if (!resetNumber || num < 1) {
      toast.error("الرجاء إدخال رقم صحيح (1 أو أكثر)");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من إعادة تعيين العداد إلى ${num}؟`)) return;

    try {
      setSaving(true);
      const res = await apiClient.post("/order-settings/reset-counter", { newStartNumber: num });
      if (res.data.success) {
        toast.success(`تمت إعادة تعيين العداد: الرقم التالي هو ${num}`);
        setResetNumber("");
        void fetchSettings();
      }
    } catch (e: any) {
      toast.error("فشل إعادة تعيين العداد");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل إعدادات ترقيم الطلبات...</span>
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
            <span className="text-xs font-semibold text-foreground">ترقيم وتسلسل الطلبات</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            نظام تسلسل وبادئات أرقام الطلبات
          </h2>
          <p className="text-xs text-muted-foreground">
            تخصيص البادئة الحرفية، ضبط الترقيم المتسلسل التلقائي، والتحكم في عداد الطلبات الجديد
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98] self-start sm:self-center"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>حفظ الإعدادات</span>
        </button>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>نمط الترقيم المعتمد</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {settings.enableSequentialOrders ? "تسلسلي منظم" : "عشوائي مشفر"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
              settings.enableSequentialOrders ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            }`}>
              {settings.enableSequentialOrders ? "Sequential" : "Random"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>البادئة النشطة (Prefix)</span>
            <Barcode className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground uppercase">
              {settings.orderPrefix || "None"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">CODE128</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الرقم القادم في العداد</span>
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              #{settings.nextOrderNumber}
            </span>
            <span className="text-[11px] text-muted-foreground">التالي بالجدول</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Panel */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
        {/* Toggle Sequential Numbering */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Hash className="w-4 h-4" />
              </span>
              <label htmlFor="seq-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                تفعيل الترقيم التسلسلي المنظم للطلبات
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-primary/10 text-primary">
                Auto Sequence
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-8">
              توليد أرقام متتالية سهلة الحفظ والمتابعة (مثل: ORD-1001) بدلاً من الأكواد العشوائية الطويلة لتسهيل خدمة العملاء.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="seq-toggle"
              checked={settings.enableSequentialOrders}
              onChange={(e) => setSettings({ ...settings, enableSequentialOrders: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Prefix & Counter Inputs */}
        <div className={`p-4 sm:p-5 space-y-4 transition-opacity ${!settings.enableSequentialOrders ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prefix-input" className="block text-xs font-semibold text-foreground">
                البادئة الحرفية (Order Prefix)
              </label>
              <input
                id="prefix-input"
                type="text"
                value={settings.orderPrefix}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setPrefixWarning(/[^\x20-\x7E]/.test(e.target.value) ? "باركود CODE128 يقبل فقط أحرف إنجليزية وأرقام." : "");
                  setSettings({ ...settings, orderPrefix: upper.replace(/[^\x20-\x7E]/g, "") });
                }}
                maxLength={10}
                className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary uppercase"
                placeholder="ORD"
                disabled={!settings.enableSequentialOrders}
              />
              {prefixWarning ? (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{prefixWarning}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">أحرف لاتينية مختصرة تظهر في بداية رقم الطلب على بوليصة الشحن.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="next-input" className="block text-xs font-semibold text-foreground">
                رقم الطلب التالي في العداد (Next Counter)
              </label>
              <input
                id="next-input"
                type="number"
                value={settings.nextOrderNumber}
                onChange={(e) => setSettings({ ...settings, nextOrderNumber: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                disabled={!settings.enableSequentialOrders}
              />
              <p className="text-[11px] text-muted-foreground">الرقم التسلسلي الذي سيتم تخصيصه تلقائياً للطلب القادم.</p>
            </div>
          </div>

          {/* Live Preview Strip */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              معاينة تنسيق رقم الطلب القادم:
            </span>
            <div className="px-3 py-1.5 rounded-md bg-background border border-border/80 font-mono text-sm font-bold text-primary tracking-wider tabular-nums">
              {settings.enableSequentialOrders ? previewNumber : "ORD-173719-456 (عشوائي)"}
            </div>
          </div>
        </div>

        {/* Scope Selection */}
        <div className="p-4 sm:p-5 space-y-3">
          <label className="block text-xs font-semibold text-foreground">نطاق تطبيق الترقيم على الطلبات:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setApplyToPastOrders(false)}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-right transition-all active:scale-[0.98] ${
                !applyToPastOrders
                  ? "border-primary bg-primary/10 text-foreground font-medium shadow-2xs"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-foreground block">الطلبات الجديدة القادمة فقط (موصى به)</span>
                <span className="text-[11px] text-muted-foreground block leading-relaxed">
                  الحفاظ التام على أرقام وسجلات الطلبات القديمة دون أي تعديل لتجنب تضارب بوالص الشحن السابقة.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setApplyToPastOrders(true)}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-right transition-all active:scale-[0.98] ${
                applyToPastOrders
                  ? "border-amber-500 bg-amber-500/10 text-foreground font-medium shadow-2xs"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-foreground block">تحديث كافة الطلبات السابقة</span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 block leading-relaxed">
                  تنبيه: سيتم استبدال أرقام جميع الطلبات السابقة في النظام لتتوافق مع البادئة والترقيم الجديد.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Counter Reset Action */}
        {settings.enableSequentialOrders && (
          <div className="p-4 sm:p-5 space-y-3 bg-muted/15">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              إعادة تعيين أو قفز عداد الطلبات
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
              <input
                id="reset-input"
                type="number"
                value={resetNumber}
                onChange={(e) => setResetNumber(e.target.value)}
                min="1"
                placeholder="مثال: 5000"
                className="h-9 px-3 text-xs font-mono font-medium rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-destructive flex-1"
              />
              <button
                type="button"
                onClick={handleResetCounter}
                disabled={saving || !resetNumber}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط العداد</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderNumberingSettings;
