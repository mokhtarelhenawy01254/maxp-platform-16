import React from "react";
import { useTemplate } from "../../templates/useTemplate";
import { templateMetas } from "../../config/templates";
import i18n from "../../i18n";
import { Layout, Check, Palette, ShieldCheck, Info } from "lucide-react";

const TemplateSettings: React.FC = () => {
  const { templateId, setTemplate, meta } = useTemplate();

  return (
    <div className="w-full space-y-3.5" dir={i18n.dir()}>
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
            <Layout className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                إدارة قوالب واجهة النظام
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                UI Themes
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              تحديد نمط وتصميم الواجهة الافتراضي لمنظومة إدارة الأعمال ولوحات التحكم
            </p>
          </div>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">القالب المطبق حالياً</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
              {meta?.name || "Business OS"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">السمة البصرية النشطة</p>
          </div>
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي القوالب المتاحة</span>
              <Palette className="size-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {templateMetas.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">سمات مهيأة بالنظام</p>
          </div>
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نطاق التأثير</span>
              <ShieldCheck className="size-3.5 text-amber-500" />
            </div>
            <div className="text-xs font-semibold text-foreground">
              لوحة التحكم لجميع الشركات
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تطبيق عام فوري</p>
          </div>
        </div>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {templateMetas.map((t) => {
          const isActive = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`relative rounded-xl border p-3.5 text-right transition-all duration-150 active:scale-[0.99] text-start ${
                isActive
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                  : "border-border/80 bg-card/40 hover:border-primary/50 hover:bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-7 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs"
                    style={{ background: `rgb(${t.colors.primary})` }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-foreground">{t.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {t.id === "template-1" ? "القالب القياسي (Business OS Default)" : t.id === "template-2" ? "نمط هندسي عصري مستوحى من Linear" : "سمة مخصصة"}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs">
                    <Check className="size-2.5" />
                    <span>نشط</span>
                  </span>
                )}
              </div>

              {/* Color Swatch Preview Strip */}
              <div className="flex gap-1.5 pt-2 border-t border-border/40">
                <div className="flex-1 h-4 rounded border border-border/40" style={{ background: `rgb(${t.colors.primary})` }} title="Primary Color" />
                <div className="flex-1 h-4 rounded border border-border/40" style={{ background: `rgb(${t.colors.secondary})` }} title="Secondary Color" />
                <div className="flex-1 h-4 rounded border border-border/40" style={{ background: `rgb(${t.colors.background})` }} title="Background" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Notice Strip */}
      <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 flex items-start gap-3 shadow-xs">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
            ملاحظات تطبيق القوالب
          </h4>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside font-mono">
            <li>تغيير القالب يطبق فوراً على مظهر لوحة التحكم دون الحاجة لإعادة تشغيل الخادم.</li>
            <li>القوالب لا تؤثر على البيانات، الطلبات، العملاء، المخزون، أو أي إعدادات برمجية.</li>
            <li>يمكن الرجوع للقالب الافتراضي في أي وقت بنقرة واحدة.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TemplateSettings;
