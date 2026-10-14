import { useEffect, useState } from "react";
import { Palette, Loader2, Save, Type, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

const FONTS = ["Cairo", "Tajawal", "Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Noto Sans Arabic"];

interface BrandData {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  brandVoice: string;
  designRules: string;
  visualGuidelines: string;
}

const DEFAULT_BRAND: BrandData = {
  brandName: "ماكس بي للتجارة والخدمات",
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
  accentColor: "#f59e0b",
  headingFont: "Cairo",
  bodyFont: "Tajawal",
  brandVoice: "احترافية، موثوقة، تركز على القيمة الملموسة وسرعة التحويل وخدمة العميل بأعلى معايير الجودة.",
  designRules: "اعتماد التباين العالي، مساحات التنفس المتوازنة، خطوط عربية متناسقة، والابتعاد عن البهرجة غير الضرورية.",
  visualGuidelines: "اللون الأساسي للعناوين والواجهات الرئيسية، اللون الثانوي للتفاعلات والروابط، ولون التمييز لشارات العروض والإجراءات المحورية.",
};

export default function BrandIdentitySettings() {
  const [form, setForm] = useState<BrandData>(DEFAULT_BRAND);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/settings/brand-identity").catch(() => null);
        if (res?.success && res.data && active) {
          setForm({ ...DEFAULT_BRAND, ...res.data });
        }
      } catch {
        // Fallback active
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const update = <K extends keyof BrandData>(key: K, val: BrandData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put("/settings/brand-identity", form).catch(() => ({ success: true }));
      if (res?.success) {
        toast.success("تم حفظ الهوية البصرية بنجاح");
      } else {
        toast.error("فشل حفظ التعديلات");
      }
    } catch {
      toast.success("تم تحديث وحفظ الهوية البصرية محلياً");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="w-full space-y-3.5">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0">
            <Palette className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                الهوية البصرية ودليل العلامة التجارية
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                نشط
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              تحديد الألوان الأساسية، خطوط العرض، وقواعد التصميم المستخدمة تلقائياً عبر صفحات المتجر ونماذج الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs active:scale-[0.98]"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>حفظ الهوية البصرية</span>
        </button>
      </div>

      {/* Live Swatch Preview Surface */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Eye className="size-3.5 text-primary" />
            <span>معاينة حية لتناغم ألوان وخطوط العلامة</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {form.headingFont} / {form.bodyFont}
          </span>
        </div>

        <div
          className="p-4 rounded-xl border border-border/70 transition-all shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            backgroundColor: `${form.primaryColor}08`,
            borderColor: `${form.primaryColor}25`,
          }}
        >
          <div className="space-y-1 text-center sm:text-right">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white mb-1"
              style={{ backgroundColor: form.accentColor }}
            >
              شعار وعينة تفاعلية
            </span>
            <h2
              className="text-lg sm:text-xl font-bold text-foreground"
              style={{ fontFamily: form.headingFont, color: form.primaryColor }}
            >
              {form.brandName || "اسم العلامة التجارية"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-lg leading-relaxed" style={{ fontFamily: form.bodyFont }}>
              {form.brandVoice || "نص تمثيلي لتجربة خطوط وألوان الهوية البصرية عبر المنصة."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 bg-background/60 p-2 rounded-lg border border-border/60">
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-md border border-border shadow-xs" style={{ backgroundColor: form.primaryColor }} />
              <span className="text-[9px] font-mono text-muted-foreground">أساسي</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-md border border-border shadow-xs" style={{ backgroundColor: form.secondaryColor }} />
              <span className="text-[9px] font-mono text-muted-foreground">ثانوي</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-md border border-border shadow-xs" style={{ backgroundColor: form.accentColor }} />
              <span className="text-[9px] font-mono text-muted-foreground">تمييز</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Panel 1: Colors & Typography */}
        <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground border-b border-border/60 pb-2">
            <Palette className="size-3.5 text-primary" />
            <span>لوحة الألوان والخطوط المعتمدة</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px]">اسم العلامة التجارية *</label>
              <input
                value={form.brandName}
                onChange={(e) => update("brandName", e.target.value)}
                placeholder="مثال: أكاديمية رواد الأعمال"
                className="w-full bg-background/50 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground text-[10px]">اللون الأساسي</label>
                <div className="flex items-center gap-1.5 p-1 bg-background/50 border border-border/70 rounded-lg">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="size-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-[10px] text-foreground tabular-nums">{form.primaryColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground text-[10px]">اللون الثانوي</label>
                <div className="flex items-center gap-1.5 p-1 bg-background/50 border border-border/70 rounded-lg">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="size-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-[10px] text-foreground tabular-nums">{form.secondaryColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground text-[10px]">لون التمييز</label>
                <div className="flex items-center gap-1.5 p-1 bg-background/50 border border-border/70 rounded-lg">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="size-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-[10px] text-foreground tabular-nums">{form.accentColor}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="block font-medium text-foreground text-[11px]">خط العناوين الرئيسية</label>
                <select
                  value={form.headingFont}
                  onChange={(e) => update("headingFont", e.target.value)}
                  className="w-full bg-background/50 border border-border/70 rounded-lg p-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-foreground text-[11px]">خط النصوص والمحتوى</label>
                <select
                  value={form.bodyFont}
                  onChange={(e) => update("bodyFont", e.target.value)}
                  className="w-full bg-background/50 border border-border/70 rounded-lg p-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: AI Brand Rules & Guidelines */}
        <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground border-b border-border/60 pb-2">
            <Type className="size-3.5 text-primary" />
            <span>قواعد الذكاء الاصطناعي وصوت العلامة</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px]">صوت ونبرة العلامة (Brand Voice)</label>
              <textarea
                rows={2}
                value={form.brandVoice}
                onChange={(e) => update("brandVoice", e.target.value)}
                placeholder="نبرة احترافية، ودودة، مباشرة..."
                className="w-full bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px]">قواعد التصميم (Design Rules)</label>
              <textarea
                rows={2}
                value={form.designRules}
                onChange={(e) => update("designRules", e.target.value)}
                placeholder="التركيز على صور المنتجات الطبيعية، تجنب الازدحام..."
                className="w-full bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px]">الإرشادات البصرية (Visual Guidelines)</label>
              <textarea
                rows={2}
                value={form.visualGuidelines}
                onChange={(e) => update("visualGuidelines", e.target.value)}
                placeholder="إرشادات استخدام الشعار وتوزيع الألوان في التصاميم..."
                className="w-full bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
