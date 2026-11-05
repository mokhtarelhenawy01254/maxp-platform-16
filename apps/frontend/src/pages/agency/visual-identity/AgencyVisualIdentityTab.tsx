import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Palette, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { apiClient } from "../../../services/apiClient";
import { H2MLuxuryLogo, H2M_LOGO_SRC } from "./H2MLuxuryLogo";

export interface VisualIdentityData {
  colors: { id: string; name: string; hex: string }[];
  fonts: { id: string; name: string; role: string; sample: string; family: string; weight: number }[];
  visualStyle: string;
  aiBackgroundDirective: string;
}

const DEFAULT_IDENTITY: VisualIdentityData = {
  colors: [
    { id: "black", name: "الأسود الفحمي الفاخر", hex: "#000000" },
    { id: "solar-gold", name: "الذهبي الشمسي", hex: "#FFD368" },
    { id: "bronze-gold", name: "الذهبي البرونزي", hex: "#D99518" },
    { id: "deep-bronze", name: "البني البرونزي العميق", hex: "#5B3518" },
    { id: "graphite", name: "الرمادي الجرافيتي", hex: "#242424" },
  ],
  fonts: [
    {
      id: "cairo",
      name: "كايرو بلاك",
      role: "للعناوين الرئيسية والعبارات التسويقية القوية، لإبراز الثقة والقيادة والطابع الفاخر.",
      sample: "نمو فائق وأداء استثنائي",
      family: "Cairo, sans-serif",
      weight: 900,
    },
    {
      id: "tajawal",
      name: "تاجوال",
      role: "للنصوص التوضيحية والمحتوى والشروحات، بفضل وضوحه وسهولة قراءته على الشاشات.",
      sample: "نظام تشغيل الحملات الإعلانية بأعلى معايير الدقة",
      family: "Tajawal, sans-serif",
      weight: 500,
    },
    {
      id: "emirates",
      name: "الإمارات تايبوجرافي",
      role: "للعناوين الفرعية والتوقيعات البصرية والعبارات المميزة، لإضفاء طابع عربي أنيق ومتوازن.",
      sample: "وكالة نمو وأداء معتمدة",
      family: "'Emirates Typography', Tajawal, sans-serif",
      weight: 700,
    },
  ],
  visualStyle:
    "هوية بصرية سينمائية فاخرة تجمع بين الأسود العميق والذهبي المعدني، مستوحاة مباشرة من الشعار ثلاثي الأبعاد ذي الحروف المتداخلة والتفاصيل الذهبية الحادة. تعكس العلامة وكالة متخصصة في التسويق بالأداء، وإدارة الحملات الإعلانية، والتجارة الإلكترونية، وأنظمة إدارة الطلبات وعلاقات العملاء. تعتمد الهوية على التباين القوي، والتكوينات الهندسية الدقيقة، والإضاءة الدرامية، والتفاصيل المعدنية الراقية، مع دمج عناصر رقمية حديثة ومؤشرات أداء مجردة عند الحاجة. يجب أن تبدو جميع التصاميم احترافية، استراتيجية، وذات قيمة عالية، مع الحفاظ على وضوح المحتوى وسهولة قراءته باللغة العربية.",
  aiBackgroundDirective:
    "اعتمد خلفية سوداء فاخرة وعميقة (#000000) مع تدرج شعاعي ناعم من الأسود إلى الفحم الداكن (#242424)، واستلهم اللمسات اللونية حصرياً من الهوية البصرية للشعار، باستخدام الذهبي الدافئ (#FFD368) والعنبر الذهبي (#D99518) والبني الداكن (#5B3518) في انعكاسات ضوئية محدودة؛ أضف حبيبات سينمائية دقيقة بنسبة 3% مع ملمس مطفي فاخر. استخدم إضاءة سينمائية جانبية من أعلى اليسار، ناعمة وموجهة، مع توهج ذهبي خفيف وانعكاسات معدنية محسوسة لإبراز العمق والفخامة. وأضف طبقات ظل وضباب خفيف جداً لتعزيز الإحساس بالمسافة والبعد البصري. حافظ على أجواء تنفيذية تقنية راقية تجمع بين القوة والاحتراف والابتكار والثقة، بما يعكس هوية H2M كوكالة متخصصة في نمو الأعمال والتسويق بالأداء. تجنب تماماً الألوان غير الموجودة في الشعار، والخلفيات البيضاء أو الفاتحة، والتدرجات الملونة الصاخبة، والتوهج المبالغ فيه، والعناصر الزخرفية المزدحمة، والمظهر الكرتوني أو الإضاءة المسطحة.",
};

const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <h2 className="text-sm font-black text-foreground text-balance">{children}</h2>
    {action}
  </div>
);

export const AgencyVisualIdentityTab: React.FC = () => {
  const [data, setData] = useState<VisualIdentityData>(DEFAULT_IDENTITY);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ success: boolean; data: Partial<VisualIdentityData> | null }>("/agency/visual-identity")
      .then((res) => {
        const saved = res.data?.data;
        if (active && res.data?.success && saved) {
          setData({
            ...DEFAULT_IDENTITY,
            visualStyle: saved.visualStyle || DEFAULT_IDENTITY.visualStyle,
            aiBackgroundDirective: saved.aiBackgroundDirective || DEFAULT_IDENTITY.aiBackgroundDirective,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const copy = (text: string, key: string, message: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(message);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean }>("/agency/visual-identity", data);
      if (res.data?.success) toast.success("تم حفظ الهوية البصرية");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حفظ الهوية البصرية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto rounded-xl border border-border/70 bg-card divide-y divide-border/60" dir="rtl">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-amber-600" aria-hidden="true" />
          <h1 className="text-base sm:text-lg font-black text-foreground">الهوية البصرية</h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 gap-1.5 font-bold text-xs active:scale-[0.97]">
          <Save className="size-3.5" aria-hidden="true" />
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:divide-x md:divide-x-reverse divide-border/60">
        <div className="p-4 sm:p-6">
          <SectionTitle
            action={
              <a
                href={H2M_LOGO_SRC}
                download="h2m-logo.webp"
                aria-label="تحميل الشعار"
                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <Download className="size-3.5" aria-hidden="true" />
                تحميل
              </a>
            }
          >
            الشعار
          </SectionTitle>
          <div className="rounded-lg overflow-hidden bg-black">
            <H2MLuxuryLogo className="w-full aspect-square max-h-72 object-cover" />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <SectionTitle>لوحة الألوان</SectionTitle>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {data.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => copy(c.hex, c.id, `تم نسخ ${c.hex}`)}
                aria-label={`نسخ اللون ${c.name} ${c.hex}`}
                className="group text-center space-y-1.5 min-w-0 focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <span
                  className="flex items-center justify-center h-16 sm:h-20 w-full rounded-lg border border-border/60 transition-transform duration-150 group-active:scale-[0.97]"
                  style={{ backgroundColor: c.hex }}
                >
                  {copied === c.id && <Check className={`size-4 ${c.hex === "#FFD368" ? "text-black" : "text-white"}`} aria-hidden="true" />}
                </span>
                <span className="block text-[11px] leading-4 text-muted-foreground text-balance">{c.name}</span>
                <span className="block text-[11px] font-mono tabular-nums text-foreground" dir="ltr">
                  {c.hex}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <SectionTitle>الخطوط</SectionTitle>
        <div className="divide-y divide-border/50">
          {data.fonts.map((f) => (
            <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)] gap-1 sm:gap-6 py-3 first:pt-0 last:pb-0">
              <div className="text-xs font-bold text-foreground">{f.name}</div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl text-foreground text-balance" style={{ fontFamily: f.family, fontWeight: f.weight }}>
                  {f.sample}
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-pretty">{f.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <SectionTitle>النمط البصري</SectionTitle>
        <Textarea
          value={data.visualStyle}
          onChange={(e) => setData({ ...data, visualStyle: e.target.value })}
          rows={6}
          className="text-sm leading-8 text-foreground/90 text-pretty bg-transparent border-0 shadow-none p-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="p-4 sm:p-6">
        <SectionTitle
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(data.aiBackgroundDirective, "directive", "تم نسخ نمط الخلفية")}
              className="h-8 gap-1.5 text-xs font-bold active:scale-[0.97]"
            >
              {copied === "directive" ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              نسخ
            </Button>
          }
        >
          نمط الخلفية (يُقفل لكل الصور)
        </SectionTitle>
        <Textarea
          value={data.aiBackgroundDirective}
          onChange={(e) => setData({ ...data, aiBackgroundDirective: e.target.value })}
          rows={9}
          className="text-[13px] leading-7 text-foreground/80 text-pretty bg-muted/40"
        />
      </div>
    </div>
  );
};
