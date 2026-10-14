import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Globe, Palette, Terminal, Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";

/**
 * WebChatWidgetPage — embed setup for the public website chat widget.
 * Generates a copy-paste <script> snippet gated by the company's storefront domain.
 */
export default function WebChatWidgetPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState("#2563eb");
  const [title, setTitle] = useState("Need help?");

  const companyId = user?.companyId || "";
  const apiOrigin = (() => {
    try { return new URL(window.location.origin).origin; } catch { return window.location.origin; }
  })();

  const embedCode = `<script
  src="${apiOrigin}/api/v1/public/widget/script.js"
  data-widget-key="${companyId}"
  data-theme-color="${color}"
  data-title="${title}"
  async></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/80 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h1 className="text-sm sm:text-base font-bold text-foreground">
              {t("aiHub.widget.title", "أداة المحادثة المباشرة للموقع الإلكتروني")}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            تضمين بلمسة واحدة
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Chassis Card */}
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">تخصيص المظهر وتوليد كود التضمين</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("aiHub.widget.subtitle", "أضف وكيل الذكاء الاصطناعي لأي موقع بسطر برمجي واحد. يتفاعل الزوار مع الوكيل فوراً.")}
            </p>
          </div>

          {/* Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">مفتاح الشركة (Widget Key)</span>
              <span className="font-mono text-foreground font-semibold truncate block text-[11px]">{companyId || "غير محدد"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">خادم الخدمة</span>
              <span className="font-mono text-foreground font-semibold truncate block text-[11px]">{apiOrigin}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground block">اللون المختار</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: color }} />
                <span className="font-mono text-foreground font-semibold text-[11px]">{color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                {t("aiHub.widget.themeColor", "لون سمة المحادثة")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 rounded-lg border border-border/80 bg-background cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-28 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("aiHub.widget.titleLabel", "عنوان صندوق المحادثة")}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/80 bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Code Box */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                {t("aiHub.widget.embedCode", "كود التضمين (Script Tag)")}
              </label>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors shadow-xs active:scale-97 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t("aiHub.widget.copied", "تم النسخ بنجاح") : t("aiHub.widget.copy", "نسخ الكود")}
              </button>
            </div>
            <pre className="rounded-xl bg-muted/20 border border-border/80 text-foreground text-xs p-3.5 overflow-x-auto font-mono leading-relaxed" dir="ltr">
{embedCode}
            </pre>
            <p className="text-[11px] text-muted-foreground">
              {t("aiHub.widget.usage", "الصق هذا الكود قبل وسم </body> في موقعك، أو قبل </head> مع تفعيل خاصية async.")}
            </p>
          </div>
        </div>

        {/* Guidance Chassis */}
        <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">
              {t("aiHub.widget.routingHint", "ربط الوكيل بقناة محادثات الموقع")}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("aiHub.widget.routingBody", "توجه لتبويب التوجيه (Routing) لتعيين وكيل محدد لقناة Web Chat. في حال عدم تعيين وكيل، سيتم الرد برد افتراضي ذكي.")}
          </p>
        </div>
      </div>
    </div>
  );
}
