import React, { useEffect, useState } from "react";
import { ImageIcon, Loader2, Sparkles, Download, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SettingsPageShell,
  SettingsPageHero,
  SettingsStatusAlert,
} from "../settings/components/SettingsPagePrimitives";
import { apiClient } from "../../services/apiClient";
import { useTranslation } from "react-i18next";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", ratios: ["1:1", "4:5", "9:16"] },
  { value: "facebook", label: "Facebook", ratios: ["1:1", "4:3", "16:9", "1.91:1"] },
  { value: "linkedin", label: "LinkedIn", ratios: ["1:1", "4:3", "16:9"] },
  { value: "twitter", label: "Twitter / X", ratios: ["16:9", "1:1"] },
  { value: "tiktok", label: "TikTok", ratios: ["9:16", "1:1"] },
  { value: "pinterest", label: "Pinterest", ratios: ["2:3", "1:1"] },
  { value: "youtube", label: "YouTube", ratios: ["16:9", "4:3"] },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "مربع 1:1" },
  { value: "4:5", label: "4:5 (Instagram Portrait)" },
  { value: "9:16", label: "ستوري 9:16" },
  { value: "16:9", label: "عريض 16:9" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3 (Pinterest)" },
  { value: "1.91:1", label: "1.91:1 (Facebook Link)" },
];

const CURRENCIES = ["SAR", "AED", "EGP", "USD", "EUR", "GBP", "Other"];

const CTAS = [
  "Shop Now", "Learn More", "Sign Up", "Get Started",
  "Book Now", "Download", "Subscribe", "Contact Us",
  "Try Free", "View Offer", "Limited Time", "Join Now",
  "Pre-order", "Custom",
];

const MOODS = [
  "professional", "luxury", "playful", "minimal", "bold",
  "warm", "cool", "energetic", "calm", "nostalgic",
  "futuristic", "organic", "editorial", "celebratory",
];

const THEMES = [
  "flat", "gradient", "3d", "glassmorphism", "neon",
  "vintage", "modern", "typography_heavy", "product_hero",
  "lifestyle", "minimalist", "dark_mode", "light_air",
  "pattern", "illustration", "photography",
];

const LAYOUTS = [
  "product_centered", "product_left_text_right", "text_left_product_right",
  "product_overlay", "split_screen", "collage",
  "minimal_text_overlay", "full_bleed_image", "framed", "magazine",
];

const PURPOSES = [
  { value: "new_product_launch", label: "إطلاق منتج جديد" },
  { value: "sale_promotion", label: "عرض / تخفيضات" },
  { value: "brand_awareness", label: "تعريف بالعلامة التجارية" },
  { value: "seasonal_event", label: "مناسبة موسمية" },
  { value: "holiday", label: "عيد / مناسبة" },
  { value: "announcement", label: "إعلان" },
  { value: "educational", label: "محتوى تعليمي" },
  { value: "testimonial_social_proof", label: "توصيات العملاء" },
  { value: "lead_generation", label: "توليد عملاء محتملين" },
  { value: "event_invitation", label: "دعوة فعالية" },
  { value: "engagement", label: "تفاعل" },
  { value: "traffic_driving", label: "جلب زيارات" },
];

const URGENCIES = [
  { value: "", label: "بدون" },
  { value: "limited_time", label: "عرض لفترة محدودة" },
  { value: "limited_stock", label: "كمية محدودة" },
  { value: "flash_sale", label: "Flash Sale" },
  { value: "last_chance", label: "الفرصة الأخيرة" },
];

const TEXT_POSITIONS = [
  "top-left", "top-center", "top-right",
  "center",
  "bottom-left", "bottom-center", "bottom-right",
];

const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Cairo", "Noto Sans Arabic", "Tajawal"];

interface FormData {
  platform: string;
  aspectRatio: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  productName: string;
  tagline: string;
  description: string;
  price: string;
  currency: string;
  discountBadge: string;
  headline: string;
  subheadline: string;
  bodyText: string;
  cta: string;
  customCta: string;
  hashtags: string;
  textPosition: string;
  textAlignment: string;
  mood: string;
  theme: string;
  layout: string;
  borderRadius: string;
  shadow: string;
  purpose: string;
  campaignName: string;
  urgency: string;
  url: string;
  format: string;
  quality: number;
  transparentBg: boolean;
}

const initialForm: FormData = {
  platform: "instagram",
  aspectRatio: "1:1",
  brandName: "",
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  accentColor: "#ff0000",
  headingFont: "Cairo",
  productName: "",
  tagline: "",
  description: "",
  price: "",
  currency: "SAR",
  discountBadge: "",
  headline: "",
  subheadline: "",
  bodyText: "",
  cta: "",
  customCta: "",
  hashtags: "",
  textPosition: "center",
  textAlignment: "center",
  mood: "",
  theme: "",
  layout: "",
  borderRadius: "subtle",
  shadow: "soft",
  purpose: "",
  campaignName: "",
  urgency: "",
  url: "",
  format: "png",
  quality: 90,
  transparentBg: false,
};

const AIImageGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [brandIdentity, setBrandIdentity] = useState<Record<string, string>>({});
  const [agentModel, setAgentModel] = useState("google/gemini-3.1-flash-image");

  useEffect(() => {
    apiClient.get("/ai-image/model-config").then((res) => {
      if (res.success && res.data?.model) setAgentModel(res.data.model);
    }).catch(() => {});
    apiClient.get("/settings/brand-identity").then((res) => {
      if (res.success && res.data) {
        setBrandIdentity(res.data);
        setForm((prev) => ({
          ...prev,
          brandName: res.data.brandName || prev.brandName,
          primaryColor: res.data.primaryColor || prev.primaryColor,
          secondaryColor: res.data.secondaryColor || prev.secondaryColor,
          accentColor: res.data.accentColor || prev.accentColor,
          headingFont: res.data.headingFont || prev.headingFont,
        }));
      }
    }).catch(() => {});
  }, []);

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const buildPromptJson = () => {
    return {
      platform: form.platform,
      aspectRatio: form.aspectRatio,
      brand: {
        name: form.brandName,
        colors: { primary: form.primaryColor, secondary: form.secondaryColor, accent: form.accentColor },
        font: form.headingFont,
      },
      product: {
        name: form.productName,
        tagline: form.tagline || undefined,
        description: form.description || undefined,
        price: form.price ? `${form.price} ${form.currency}` : undefined,
        discountBadge: form.discountBadge || undefined,
        hasImage: primaryImage !== null,
      },
      copy: {
        headline: form.headline,
        subheadline: form.subheadline || undefined,
        bodyText: form.bodyText || undefined,
        cta: form.cta === "Custom" ? form.customCta : form.cta || undefined,
        hashtags: form.hashtags ? form.hashtags.split(",").map((h) => h.trim()).filter(Boolean) : [],
        textPosition: form.textPosition,
        textAlignment: form.textAlignment,
      },
      visualStyle: {
        mood: form.mood || undefined,
        theme: form.theme || undefined,
        layout: form.layout || undefined,
        borderRadius: form.borderRadius,
        shadow: form.shadow,
      },
      campaign: {
        purpose: form.purpose || undefined,
        name: form.campaignName || undefined,
        urgency: form.urgency || undefined,
        url: form.url || undefined,
      },
      output: {
        format: form.format,
        quality: form.quality,
        transparentBg: form.transparentBg,
      },
    };
  };

  const buildPromptText = (): string => {
    const parts: string[] = [];
    const j = buildPromptJson();

    parts.push(`Create a social media image for ${form.platform} with aspect ratio ${form.aspectRatio}.`);

    if (form.brandName) parts.push(`Brand: ${form.brandName}.`);
    if (form.productName) parts.push(`Product: ${form.productName}${form.tagline ? ` — ${form.tagline}` : ""}${form.price ? ` at ${form.price} ${form.currency}` : ""}.`);
    if (form.description) parts.push(`Description: ${form.description}.`);
    if (form.discountBadge) parts.push(`Show discount badge: ${form.discountBadge}.`);

    if (form.headline) parts.push(`Headline: "${form.headline}".`);
    if (form.subheadline) parts.push(`Subheadline: "${form.subheadline}".`);
    if (form.bodyText) parts.push(`Body text: "${form.bodyText}".`);
    if (form.cta) parts.push(`Call to action: "${form.cta === "Custom" ? form.customCta : form.cta}".`);
    if (form.hashtags) parts.push(`Hashtags: ${form.hashtags}.`);
    parts.push(`Text position: ${form.textPosition}, alignment: ${form.textAlignment}.`);

    if (form.mood) parts.push(`Mood: ${form.mood}.`);
    if (form.theme) parts.push(`Theme: ${form.theme}.`);
    if (form.layout) parts.push(`Layout: ${form.layout}.`);
    parts.push(`Style: ${form.borderRadius} corners, ${form.shadow} shadow.`);

    if (form.purpose) {
      const p = PURPOSES.find((x) => x.value === form.purpose);
      if (p) parts.push(`Campaign purpose: ${p.label}.`);
    }
    if (form.urgency) parts.push(`Urgency: ${form.urgency}.`);

    if (brandIdentity.brandVoice) parts.push(`Brand voice: ${brandIdentity.brandVoice}.`);
    if (brandIdentity.designRules) parts.push(`Design rules: ${brandIdentity.designRules}.`);
    if (brandIdentity.visualGuidelines) parts.push(`Visual guidelines: ${brandIdentity.visualGuidelines}.`);

    parts.push("Design must be in Arabic, professional, suitable for social media, with clear typography and strong visual hierarchy.");
    parts.push(`Use brand colors: primary ${form.primaryColor}, secondary ${form.secondaryColor}, accent ${form.accentColor}.`);

    return parts.join(" ");
  };

  const handleGenerate = async () => {
    if (!form.productName && !form.headline) {
      setMessage({ type: "error", text: "من فضلك أدخل اسم المنتج أو العنوان الرئيسي" });
      return;
    }
    setLoading(true);
    setImageUrl("");
    setMessage(null);

    try {
      const structured = buildPromptJson();
      const prompt = buildPromptText();

      const res = await apiClient.post("/ai-image/generate", {
        prompt,
        structured,
        model: agentModel,
        aspectRatio: form.aspectRatio,
        style: form.mood || form.theme || undefined,
      });

      if (res.success && res.data?.imageUrl) {
        setImageUrl(res.data.imageUrl);
        setMessage({ type: "success", text: "تم توليد الصورة بنجاح" });
      } else {
        setMessage({ type: "error", text: "لم يتم استلام الصورة من الموديل" });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || err.message || "فشل في توليد الصورة",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `maxp-ai-${Date.now()}.${form.format}`;
    a.click();
  };

  const handleReset = () => {
    setForm(initialForm);
    setImageUrl("");
    setMessage(null);
    setPrimaryImage(null);
  };

  const inputCls = "bg-white dark:bg-gray-900";
  const FieldWrap = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel="AI"
        title="مصمم صور السوشيال ميديا"
        description="صمم صور احترافية ببيانات منتظمة — منغير ما تكتب برومبت خام"
        action={
          <Button variant="outline" size="sm" onClick={handleReset}>
            <Trash2 className="size-4 ml-1" />
            تصفير
          </Button>
        }
      />
      <SettingsStatusAlert message={message} />

      <Tabs defaultValue="product" className="mt-4">
        <TabsList variant="line" className="mb-4 flex-wrap gap-1">
          <TabsTrigger value="product">المنتج</TabsTrigger>
          <TabsTrigger value="brand">العلامة</TabsTrigger>
          <TabsTrigger value="copy">النص</TabsTrigger>
          <TabsTrigger value="style">التصميم</TabsTrigger>
          <TabsTrigger value="campaign">الحملة</TabsTrigger>
          <TabsTrigger value="output">المخرجات</TabsTrigger>
          <TabsTrigger value="platform">المنصة</TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المنتج</CardTitle>
              <CardDescription>صور المنتج وتفاصيله</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="اسم المنتج">
                  <Input
                    dir="auto"
                    placeholder="شنطة جلدية فاخرة"
                    value={form.productName}
                    onChange={(e) => update("productName", e.target.value)}
                    className={inputCls}
                  />
                </FieldWrap>
                <FieldWrap label="السعر">
                  <div className="flex gap-2">
                    <Input
                      placeholder="199"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                      className={inputCls}
                    />
                    <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FieldWrap>
              </div>
              <FieldWrap label="شعار / Tagline">
                <Input
                  dir="auto"
                  placeholder="فخامة تبدأ من هنا"
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <FieldWrap label="وصف المنتج">
                <Textarea
                  dir="auto"
                  placeholder="وصف مختصر للمنتج..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="شارة تخفيض">
                  <Input
                    placeholder="50% OFF"
                    value={form.discountBadge}
                    onChange={(e) => update("discountBadge", e.target.value)}
                    className={inputCls}
                  />
                </FieldWrap>
                <FieldWrap label="صورة المنتج">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPrimaryImage(e.target.files?.[0] || null)}
                    className={inputCls}
                  />
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>الهوية البصرية</CardTitle>
              <CardDescription>العلامة التجارية والألوان</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldWrap label="اسم العلامة التجارية">
                <Input
                  dir="auto"
                  placeholder="متجر أزياء أونلاين"
                  value={form.brandName}
                  onChange={(e) => update("brandName", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <FieldWrap label="الخط الرئيسي">
                <Select value={form.headingFont} onValueChange={(v) => update("headingFont", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FieldWrap label="اللون الأساسي">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="size-10 cursor-pointer rounded-lg border"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className={`flex-1 font-mono text-xs ${inputCls}`}
                    />
                  </div>
                </FieldWrap>
                <FieldWrap label="اللون الثانوي">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => update("secondaryColor", e.target.value)}
                      className="size-10 cursor-pointer rounded-lg border"
                    />
                    <Input
                      value={form.secondaryColor}
                      onChange={(e) => update("secondaryColor", e.target.value)}
                      className={`flex-1 font-mono text-xs ${inputCls}`}
                    />
                  </div>
                </FieldWrap>
                <FieldWrap label="لون الإشارة">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className="size-10 cursor-pointer rounded-lg border"
                    />
                    <Input
                      value={form.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className={`flex-1 font-mono text-xs ${inputCls}`}
                    />
                  </div>
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy">
          <Card>
            <CardHeader>
              <CardTitle>النص والرسالة</CardTitle>
              <CardDescription>العنوان، CTA، هاشتاجات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldWrap label="العنوان الرئيسي">
                <Input
                  dir="auto"
                  placeholder="أجمل تشكيلة شتوية"
                  value={form.headline}
                  onChange={(e) => update("headline", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <FieldWrap label="عنوان فرعي">
                <Input
                  dir="auto"
                  placeholder="تسوق الآن ووفر 50%"
                  value={form.subheadline}
                  onChange={(e) => update("subheadline", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <FieldWrap label="نص إضافي">
                <Textarea
                  dir="auto"
                  placeholder="نص قصير يظهر في الصورة..."
                  value={form.bodyText}
                  onChange={(e) => update("bodyText", e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="دعوة للإجراء (CTA)">
                  <Select value={form.cta} onValueChange={(v) => update("cta", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر CTA" /></SelectTrigger>
                    <SelectContent>
                      {CTAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                {form.cta === "Custom" && (
                  <FieldWrap label="CTA مخصص">
                    <Input
                      placeholder="ادخل النص..."
                      value={form.customCta}
                      onChange={(e) => update("customCta", e.target.value)}
                      className={inputCls}
                    />
                  </FieldWrap>
                )}
              </div>
              <FieldWrap label="هاشتاجات (مفصولة بفاصلة)">
                <Input
                  dir="auto"
                  placeholder="موضة, تخفيضات, تسوق"
                  value={form.hashtags}
                  onChange={(e) => update("hashtags", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="مكان النص">
                  <Select value={form.textPosition} onValueChange={(v) => update("textPosition", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEXT_POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="محاذاة النص">
                  <Select value={form.textAlignment} onValueChange={(v) => update("textAlignment", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">يمين</SelectItem>
                      <SelectItem value="center">وسط</SelectItem>
                      <SelectItem value="left">يسار</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="style">
          <Card>
            <CardHeader>
              <CardTitle>التصميم البصري</CardTitle>
              <CardDescription>المود، الثيم، الـ Layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="المود / الجو العام">
                  <Select value={form.mood} onValueChange={(v) => update("mood", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر mood" /></SelectTrigger>
                    <SelectContent>
                      {MOODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="الثيم">
                  <Select value={form.theme} onValueChange={(v) => update("theme", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر ثيم" /></SelectTrigger>
                    <SelectContent>
                      {THEMES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
              <FieldWrap label="الـ Layout">
                <Select value={form.layout} onValueChange={(v) => update("layout", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر layout" /></SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="الزوايا">
                  <Select value={form.borderRadius} onValueChange={(v) => update("borderRadius", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">حادة</SelectItem>
                      <SelectItem value="subtle">ناعمة قليلاً</SelectItem>
                      <SelectItem value="rounded">مدورة</SelectItem>
                      <SelectItem value="pill">دائرية</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="الظل">
                  <Select value={form.shadow} onValueChange={(v) => update("shadow", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون</SelectItem>
                      <SelectItem value="soft">خفيف</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">قوي</SelectItem>
                      <SelectItem value="glow">توهج</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign">
          <Card>
            <CardHeader>
              <CardTitle>الحملة</CardTitle>
              <CardDescription>الهدف، الاستعجال، الرابط</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldWrap label="الهدف من الصورة">
                <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر الهدف" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="اسم الحملة">
                <Input
                  dir="auto"
                  placeholder="مثلاً: حملة الشتاء 2026"
                  value={form.campaignName}
                  onChange={(e) => update("campaignName", e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="الاستعجال">
                  <Select value={form.urgency} onValueChange={(v) => update("urgency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="الرابط">
                  <Input
                    dir="ltr"
                    placeholder="https://example.com"
                    value={form.url}
                    onChange={(e) => update("url", e.target.value)}
                    className={inputCls}
                  />
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <Card>
            <CardHeader>
              <CardTitle>المخرجات</CardTitle>
              <CardDescription>الموديل، الجودة، الصيغة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldWrap label="محرك التوليد (من إعدادات الأجنت)">
                  <div className="flex h-10 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm dark:bg-gray-900">
                    <span className="size-2 rounded-full bg-green-500" />
                    <span className="font-mono text-xs">{agentModel}</span>
                  </div>
                </FieldWrap>
                <FieldWrap label="الأبعاد">
                  <Select value={form.aspectRatio} onValueChange={(v) => update("aspectRatio", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FieldWrap label="صيغة الملف">
                  <Select value={form.format} onValueChange={(v) => update("format", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label={`الجودة (${form.quality}%)`}>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={form.quality}
                    onChange={(e) => update("quality", Number(e.target.value))}
                    className="w-full"
                  />
                </FieldWrap>
                <FieldWrap label="خلفية شفافة">
                  <Switch
                    checked={form.transparentBg}
                    onCheckedChange={(v) => update("transparentBg", v)}
                  />
                </FieldWrap>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>المنصة</CardTitle>
              <CardDescription>اختر المنصة ونوع المنشور</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      update("platform", p.value);
                      if (p.ratios.length > 0 && !p.ratios.includes(form.aspectRatio)) {
                        update("aspectRatio", p.ratios[0]);
                      }
                    }}
                    className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${
                      form.platform === p.value
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                الأبعاد المقترحة لـ {PLATFORMS.find((p) => p.value === form.platform)?.label}: {PLATFORMS.find((p) => p.value === form.platform)?.ratios.join(" · ")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showJson ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {showJson ? "إخفاء" : "عرض"} الـ JSON
        </button>
        {showJson && (
          <pre className="max-h-64 overflow-auto rounded-lg border bg-slate-50 p-4 text-xs dark:bg-gray-950">
            {JSON.stringify(buildPromptJson(), null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="gap-2"
          onClick={handleGenerate}
          disabled={loading || (!form.productName && !form.headline)}
        >
          {loading ? (
            <><Loader2 className="size-4 animate-spin" /> جاري التوليد...</>
          ) : (
            <><ImageIcon className="size-4" /> توليد الصورة</>
          )}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 dark:bg-gray-900">
            <div className="text-center">
              <Loader2 className="mx-auto size-10 animate-spin text-sky-600" />
              <p className="mt-3 text-sm text-slate-500">جاري توليد الصورة...</p>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-slate-50 dark:bg-gray-900">
              <img
                src={imageUrl}
                alt="Generated"
                className="mx-auto max-h-[500px] w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handleDownload}>
                <Download className="size-4" /> تحميل
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setImageUrl("")}>
                توليد جديدة
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 dark:bg-gray-900">
            <div className="text-center text-slate-400">
              <ImageIcon className="mx-auto size-16" />
              <p className="mt-3 text-sm">الصورة هتظهر هنا بعد التوليد</p>
            </div>
          </div>
        )}
      </div>
    </SettingsPageShell>
  );
};

export default AIImageGenerator;
