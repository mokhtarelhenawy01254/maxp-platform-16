import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileCode,
  Layers,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { apiClient } from "../../../services/apiClient";
import { H2MLuxuryLogo } from "./H2MLuxuryLogo";

export interface VisualIdentityData {
  brandName: string;
  tagline: string;
  colors: {
    id: string;
    name: string;
    hex: string;
    role: string;
  }[];
  fonts: {
    name: string;
    role: string;
    sample: string;
  }[];
  visualStyle: string;
  aiBackgroundDirective: string;
}

const DEFAULT_IDENTITY: VisualIdentityData = {
  brandName: "H2M MEDIA",
  tagline: "GROWTH & PERFORMANCE MARKETING AGENCY",
  colors: [
    {
      id: "charcoal-black",
      name: "الأسود الفحمي",
      hex: "#000000",
      role: "الخلفيات العميقة والأسطح السينمائية الفاخرة",
    },
    {
      id: "solar-gold",
      name: "الفاخر الذهبي الشمسي",
      hex: "#FFD368",
      role: "اللمسات الضوئية الحادة والعناوين المميزة والرموز",
    },
    {
      id: "bronze-gold",
      name: "الذهبي البرونزي",
      hex: "#D99518",
      role: "المعادن المنحوتة ثلاثية الأبعاد والتدرجات",
    },
    {
      id: "deep-bronze-brown",
      name: "البني البرونزي العميق",
      hex: "#5B3518",
      role: "الظلال المعدنية العميقة والحدود المنحوتة",
    },
    {
      id: "graphite-gray",
      name: "الرمادي الجرافيتي",
      hex: "#242424",
      role: "الأسطح الثانوية والبطاقات الداخلية والتدرج الشعاعي",
    },
  ],
  fonts: [
    {
      name: "كايرو بلاك (Cairo Black)",
      role: "للعناوين الرئيسية والعبارات التسويقية القوية، لإبراز الثقة والقيادة والطابع الفاخر.",
      sample: "نمو فائق • أداء استثنائي • ريادة سوقية",
    },
    {
      name: "تاجوال (Tajawal)",
      role: "للنصوص التوضيحية والمحتوى التعليمي والشروحات، بفضل وضوحه وسهولة قراءته على الشاشات.",
      sample: "نظام تشغيل وإدارة الحملات الإعلانية ومضاعفة المبيعات بأعلى معايير الدقة.",
    },
    {
      name: "الإمارات تايپوجرافي (Emirates Typography)",
      role: "للعناوين الفرعية والتوقيعات البصرية والعبارات المميزة، لإضفاء طابع عربي أنيق ومتوازن.",
      sample: "وكالة هبوط ونمو معتمدة 2026",
    },
  ],
  visualStyle:
    "هوية بصرية سينمائية فاخرة تجمع بين الأسود العميق والذهبي المعدني، مستوحاة مباشرة من الشعار ثلاثي الأبعاد ذي الحرفين المتداخلين والتفاصيل الذهبية الحادة. تعكس العلامة خبيراً في التسويق بالأداء، وإدارة الحملات الإعلانية، والتجارة الإلكترونية، وأنظمة إدارة الطلبات وعلاقات العملاء. تعتمد الهوية على التباين القوي، والتكوينات الهندسية الدقيقة، والإضاءة الدرامية، والتفاصيل المعدنية البراقة، مع دمج عناصر رقمية حديثة ومؤشرات أداء مجردة عند الحاجة. يجب أن تبدو جميع التصاميم احترافية، استراتيجية، وذات قيمة عالية، مع الحفاظ على وضوح المحتوى وسهولة قراءته باللغة العربية.",
  aiBackgroundDirective:
    "اعتمد خلفية سوداء فاخرة وعميقة (#000000) مع تدرج شعاعي ناعم من الأسود إلى الفحم الداكن (#242424)، واستلهم اللمسات اللونية حصرياً من الهوية البصرية للشعار، باستخدام الذهبي الدافئ (#FFD368) والعنبر الذهبي (#D99518) والبني الداكن (#5B3518) في انعكاسات ضوئية محدودة؛ أضف حبيبات سينمائية دقيقة بنسبة 3% مع ملمس مطفي فاخر. استخدم إضاءة سينمائية جانبية من أعلى اليسار، ناعمة وموجهة، مع توهج ذهبي خفيف وانعكاسات معدنية محسوسة لإبراز العمق والفخامة. وأضف طبقات ظل وضباب خفيف جداً لتعزيز الإحساس بالمسافة والبعد البصري. حافظ على أجواء تنفيذية تقنية راقية تجمع بين القوة والاحتراف والابتكار والثقة، بما يعكس هوية راسم أكاديمي كعلامة متخصصة في نمو الأعمال والتكنولوجيا والتسويق الرقمي. تجنب تماماً الألوان غير الموجودة في الشعار، والخلفيات البيضاء أو الفاتحة، والتدرجات الملونة الصاخبة، والتوهج المبالغ فيه، والعناصر الزخرفية المزدحمة، والمظهر الكرتوني أو الإضاءة المسطحة.",
};

export const AgencyVisualIdentityTab: React.FC = () => {
  const [data, setData] = useState<VisualIdentityData>(DEFAULT_IDENTITY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const fetchIdentity = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: VisualIdentityData }>(
        "/agency/visual-identity"
      );
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      // Default identity fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentity();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean; message: string; data: VisualIdentityData }>(
        "/agency/visual-identity",
        data
      );
      if (res.data?.success) {
        toast.success("تم حفظ الهوية البصرية وقواعد الذكاء الاصطناعي بنجاح!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حفظ الهوية البصرية.");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label} إلى الحافظة!`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Palette className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              الهوية البصرية وقواعد الذكاء الاصطناعي (Visual Identity)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            دليل الهوية المعتمد لوكالة H2M وقواعد توجيه نماذج الذكاء الاصطناعي لتوليد التصاميم والمحتوى
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-9 font-bold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="size-3.5" />
            <span>{saving ? "جاري الحفظ..." : "حفظ الهوية في النظام"}</span>
          </Button>
        </div>
      </div>

      {/* Main Showcase Grid: Logo & Directives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Luxury Logo Showcase */}
        <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-black p-6 flex flex-col items-center justify-between space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-2 right-3">
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 font-bold bg-amber-500/10">
              الشعار الرسمي المعتمد 2026
            </Badge>
          </div>

          <div className="w-full flex items-center justify-center pt-4">
            <H2MLuxuryLogo size={300} />
          </div>

          <div className="w-full pt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const svgString = `<svg viewBox="0 0 600 500" ...></svg>`;
                copyToClipboard(svgString, "كود الشعار SVG");
              }}
              className="h-8 text-xs font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-900 gap-1"
            >
              <FileCode className="size-3" />
              <span>نسخ كود SVG</span>
            </Button>

            <span className="text-[11px] text-zinc-500 font-mono" dir="ltr">
              #FFD368 • #D99518 • #000000
            </span>
          </div>
        </div>

        {/* Right: Color Palette Board */}
        <div className="lg:col-span-7 rounded-3xl border border-border/70 bg-card p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-base font-black text-foreground">لوحة الألوان المعتمدة (Color Palette)</h2>
            </div>
            <span className="text-xs text-muted-foreground">انقر على الكود لنسخه فوراً</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {data.colors.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  navigator.clipboard.writeText(c.hex);
                  setCopiedHex(c.hex);
                  toast.success(`تم نسخ الكود ${c.hex}!`);
                  setTimeout(() => setCopiedHex(null), 1500);
                }}
                className="cursor-pointer group rounded-2xl border border-border/60 bg-muted/20 p-2.5 space-y-2 hover:border-primary/50 transition-all text-center"
              >
                <div
                  className="h-14 w-full rounded-xl shadow-xs border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: c.hex }}
                >
                  {copiedHex === c.hex && (
                    <Check className={`size-4 ${c.hex === "#000000" ? "text-white" : "text-black"}`} />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-foreground truncate">{c.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground font-bold" dir="ltr">
                    {c.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Color Roles List */}
          <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
            <div className="font-bold text-foreground">وظائف واستخدام الألوان:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
              {data.colors.map((c) => (
                <div key={c.id} className="flex items-start gap-1.5">
                  <span className="size-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: c.hex }} />
                  <span>
                    <strong className="text-foreground">{c.name}:</strong> {c.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography System Section */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Type className="size-4 text-primary" />
          <h2 className="text-base font-black text-foreground">منظومة الخطوط الطباعية (Typography System)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.fonts.map((f, idx) => (
            <div key={idx} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
              <Badge variant="secondary" className="font-bold text-xs text-primary bg-primary/10">
                {f.name}
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.role}</p>
              <div className="p-3 rounded-xl bg-background border border-border/50 text-xs font-bold text-foreground">
                {f.sample}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Style Directive */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h2 className="text-base font-black text-foreground">النمط البصري العام (Visual Style)</h2>
          </div>
        </div>
        <Textarea
          rows={4}
          value={data.visualStyle}
          onChange={(e) => setData({ ...data, visualStyle: e.target.value })}
          className="text-xs sm:text-sm leading-relaxed text-muted-foreground"
        />
      </div>

      {/* AI Prompt Enforcement & Background Lock */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-card p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
              <Zap className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                أمر التوجيه الإلزامي للذكاء الاصطناعي (AI Prompt Directive & Background Lock)
              </h2>
              <p className="text-xs text-muted-foreground">
                هذا النص موجه لوكلاء ونماذج الذكاء الاصطناعي لإنشاء وتوليد الصور والتصاميم مع التقيد التام بنمط الخلفية والألوان
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(data.aiBackgroundDirective, "أمر توجيه الذكاء الاصطناعي")}
            className="h-8 text-xs font-bold gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <Copy className="size-3" />
            <span>نسخ الأمر للذكاء الاصطناعي</span>
          </Button>
        </div>

        <Textarea
          rows={5}
          value={data.aiBackgroundDirective}
          onChange={(e) => setData({ ...data, aiBackgroundDirective: e.target.value })}
          className="text-xs sm:text-sm leading-relaxed font-mono bg-muted/40"
        />

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">القيود الإلزامية:</span>
          <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-md">حظر الخلفيات البيضاء الفاتحة</span>
          <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-md">حظر التدرجات الصاخبة الملونة</span>
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">إلزامية الحبيبات السينمائية 3%</span>
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">إضاءة موجهة من أعلى اليسار</span>
        </div>
      </div>
    </div>
  );
};
