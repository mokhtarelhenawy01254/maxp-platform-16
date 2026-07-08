import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  Grid3X3,
  AlertCircle,
  Info,
  Wand2,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SettingsPageShell,
  SettingsPageHero,
  SettingsStatusAlert,
} from "../settings/components/SettingsPagePrimitives";
import { apiClient } from "../../services/apiClient";

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

const ASPECT_SIZES: Record<string, string> = {
  "1:1": "1080 × 1080",
  "4:5": "1080 × 1350",
  "9:16": "1080 × 1920",
  "16:9": "1920 × 1080",
  "4:3": "1600 × 1200",
  "3:4": "1200 × 1600",
  "3:2": "1500 × 1000",
  "2:3": "1000 × 1500",
  "1.91:1": "1200 × 628",
};

const CURRENCIES = ["SAR", "AED", "EGP", "USD", "EUR", "GBP", "Other"];

const CTAS = [
  { value: "تسوق الآن", label: "تسوق الآن" },
  { value: "اعرف المزيد", label: "اعرف المزيد" },
  { value: "سجّل الآن", label: "سجّل الآن" },
  { value: "ابدأ الآن", label: "ابدأ الآن" },
  { value: "احجز الآن", label: "احجز الآن" },
  { value: "حمّل الآن", label: "حمّل الآن" },
  { value: "اشترك", label: "اشترك" },
  { value: "تواصل معنا", label: "تواصل معنا" },
  { value: "جرب مجاناً", label: "جرب مجاناً" },
  { value: "شاهد العرض", label: "شاهد العرض" },
  { value: "عرض محدود", label: "عرض محدود" },
  { value: "انضم الآن", label: "انضم الآن" },
  { value: "اطلب مسبقاً", label: "اطلب مسبقاً" },
  { value: "custom", label: "نص مخصص" },
];

const MOODS = [
  { value: "professional", label: "احترافي" },
  { value: "luxury", label: "فاخر" },
  { value: "playful", label: "مرح" },
  { value: "minimal", label: "بسيط" },
  { value: "bold", label: "جريء" },
  { value: "warm", label: "دافئ" },
  { value: "cool", label: "بارد" },
  { value: "energetic", label: "حيوي" },
  { value: "calm", label: "هادئ" },
  { value: "nostalgic", label: "حنيني" },
  { value: "futuristic", label: "مستقبلي" },
  { value: "organic", label: "طبيعي" },
  { value: "editorial", label: "تحريري" },
  { value: "celebratory", label: "احتفالي" },
];

const THEMES = [
  { value: "flat", label: "تصميم مسطح" },
  { value: "gradient", label: "تدرج لوني" },
  { value: "3d", label: "ثلاثي الأبعاد" },
  { value: "glassmorphism", label: "زجاجي" },
  { value: "neon", label: "نيون" },
  { value: "vintage", label: "كلاسيكي" },
  { value: "modern", label: "عصري" },
  { value: "typography_heavy", label: "نص بارز" },
  { value: "product_hero", label: "بطولة المنتج" },
  { value: "lifestyle", label: "لايف ستايل" },
  { value: "minimalist", label: "مينيماليست" },
  { value: "dark_mode", label: "وضع داكن" },
  { value: "light_air", label: "إضاءة ناعمة" },
  { value: "pattern", label: "باترن" },
  { value: "illustration", label: "رسوم توضيحية" },
  { value: "photography", label: "تصوير فوتوغرافي" },
];

const LAYOUTS = [
  { value: "product_centered", label: "المنتج في المركز" },
  { value: "product_left_text_right", label: "المنتج يسار والنص يمين" },
  { value: "text_left_product_right", label: "النص يسار والمنتج يمين" },
  { value: "product_overlay", label: "النص فوق المنتج" },
  { value: "split_screen", label: "شاشة منقسمة" },
  { value: "collage", label: "كولاج" },
  { value: "minimal_text_overlay", label: "نص بسيط فوق صورة" },
  { value: "full_bleed_image", label: "صورة بملء الإطار" },
  { value: "framed", label: "بإطار" },
  { value: "magazine", label: "مجلة" },
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
  { value: "top-left", label: "أعلى اليسار" },
  { value: "top-center", label: "أعلى المنتصف" },
  { value: "top-right", label: "أعلى اليمين" },
  { value: "center", label: "المنتصف" },
  { value: "bottom-left", label: "أسفل اليسار" },
  { value: "bottom-center", label: "أسفل المنتصف" },
  { value: "bottom-right", label: "أسفل اليمين" },
];

const FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Roboto",
  "Cairo",
  "Noto Sans Arabic",
  "Tajawal",
];

const TEMPLATES: Record<string, Partial<FormData>> = {
  sale_promotion: {
    purpose: "sale_promotion",
    mood: "energetic",
    theme: "gradient",
    layout: "product_centered",
    headline: "خصم 50% لفترة محدودة",
    subheadline: "أفضل العروض على كل المنتجات",
    cta: "تسوق الآن",
    urgency: "limited_time",
    hashtags: "خصومات, عروض, تسوق",
  },
  new_product_launch: {
    purpose: "new_product_launch",
    mood: "modern",
    theme: "product_hero",
    layout: "product_centered",
    headline: "وصل حديثاً",
    subheadline: "اكتشف المجموعة الجديدة الآن",
    cta: "اعرف المزيد",
    hashtags: "جديد, منتج, إطلاق",
  },
  brand_awareness: {
    purpose: "brand_awareness",
    mood: "professional",
    theme: "modern",
    layout: "full_bleed_image",
    headline: "ثقة تستحقها",
    subheadline: "جودة وخدمة في كل تفصيلة",
    cta: "تواصل معنا",
    hashtags: "علامة_تجارية, جودة, ثقة",
  },
  engagement: {
    purpose: "engagement",
    mood: "playful",
    theme: "lifestyle",
    layout: "split_screen",
    headline: "شاركنا رأيك",
    subheadline: "إيه أكتر حاجة عجبتك في الشهر ده؟",
    cta: "علق الآن",
    hashtags: "تفاعل, رأيك_يهم, مجتمع",
  },
};

interface ModelConfigResponse {
  model?: string;
}

interface BrandIdentityResponse {
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  brandVoice?: string;
  designRules?: string;
  visualGuidelines?: string;
}

interface GenerateResponse {
  imageUrl?: string;
  message?: string;
  data?: {
    imageUrl?: string;
    message?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
}

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
  avoidPrompt: string;
  editablePrompt: string;
}

const DRAFT_KEY = "aiImageGenerator_draft_v1";

const loadDraft = (): Partial<FormData> | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (form: FormData) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {}
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
};

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
  avoidPrompt: "",
  editablePrompt: "",
};

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive mx-1">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function AspectPreview({
  ratio,
  platformLabel,
}: {
  ratio: string;
  platformLabel: string;
}) {
  const [w, h] = ratio.split(":").map(Number);
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 rounded-xl border-2 border-dashed border-border bg-muted/40 p-1.5">
        <div
          style={{ aspectRatio: `${w}/${h}` }}
          className="rounded-lg bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950 dark:to-slate-900"
        />
      </div>
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold text-foreground">{ratio}</p>
        <p className="text-muted-foreground">{ASPECT_SIZES[ratio] || ""}</p>
        <p className="text-xs text-muted-foreground">مناسب لـ {platformLabel}</p>
      </div>
    </div>
  );
}

const AIImageGenerator: React.FC = () => {
  const [form, setForm] = useState<FormData>(() => {
    const draft = loadDraft();
    return { ...initialForm, ...(draft || {}) };
  });
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentityResponse>({});
  const [agentModel, setAgentModel] = useState("google/gemini-3.1-flash-image");

  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; url: string; filename: string }>({ open: false, url: "", filename: "" });
  const [promptTouched, setPromptTouched] = useState(false);
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string>("");
  const [galleryFilter, setGalleryFilter] = useState<string>("all");
  const [gallerySearch, setGallerySearch] = useState<string>("");
  const [lastParams, setLastParams] = useState<{ prompt: string; model: string; aspectRatio: string; style?: string; productImage?: string } | null>(null);
  const [usage, setUsage] = useState<{ prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null>(null);

  const selectValue = <K extends keyof FormData>(key: K) => (value: string | null) => {
    if (value !== null) update(key, value as FormData[K]);
  };

  useEffect(() => {
    apiClient
      .get<ModelConfigResponse>("/ai-image/model-config")
      .then((res) => {
        if (res.data?.model) setAgentModel(res.data.model);
      })
      .catch(() => {});
    apiClient
      .get<BrandIdentityResponse>("/settings/brand-identity")
      .then((res) => {
        const data = res.data;
        if (data) {
          setBrandIdentity(data);
          setForm((prev) => ({
            ...prev,
            brandName: data.brandName || prev.brandName,
            primaryColor: data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondaryColor || prev.secondaryColor,
            accentColor: data.accentColor || prev.accentColor,
            headingFont: data.headingFont || prev.headingFont,
          }));
        }
      })
      .catch(() => {});
    fetchGallery();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!promptTouched) {
      setForm((prev) => ({ ...prev, editablePrompt: buildPromptText() }));
    }
  }, [form.platform, form.aspectRatio, form.brandName, form.primaryColor, form.secondaryColor, form.accentColor, form.headingFont, form.productName, form.tagline, form.description, form.price, form.currency, form.discountBadge, form.headline, form.subheadline, form.bodyText, form.cta, form.customCta, form.hashtags, form.textPosition, form.textAlignment, form.mood, form.theme, form.layout, form.borderRadius, form.shadow, form.purpose, form.urgency, primaryImage]);

  useEffect(() => {
    if (!imageUrl) return;
    document.getElementById("ai-generated-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [imageUrl]);

  const canGenerate = useMemo(
    () => Boolean(form.productName.trim() || form.headline.trim()),
    [form.productName, form.headline],
  );

  const fetchGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await apiClient.get<any[]>("/ai-image/history");
      if (Array.isArray(res.data)) setGallery(res.data);
    } catch {
      // silent
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (!primaryImage) {
      setPrimaryImagePreview("");
      return;
    }
    const url = URL.createObjectURL(primaryImage);
    setPrimaryImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [primaryImage]);

  const setPrimaryImageAndDraft = (file: File | null) => {
    setPrimaryImage(file);
    setForm((prev) => {
      const next = { ...prev };
      saveDraft(next);
      return next;
    });
  };

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      saveDraft(next);
      return next;
    });
  };

  const platformLabel = useMemo(
    () => PLATFORMS.find((p) => p.value === form.platform)?.label || form.platform,
    [form.platform],
  );

  const buildPromptJson = () => {
    return {
      platform: form.platform,
      aspectRatio: form.aspectRatio,
      brand: {
        name: form.brandName,
        colors: {
          primary: form.primaryColor,
          secondary: form.secondaryColor,
          accent: form.accentColor,
        },
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
        cta: form.cta === "custom" ? form.customCta : form.cta || undefined,
        hashtags: form.hashtags
          ? form.hashtags.split(",").map((h) => h.trim()).filter(Boolean)
          : [],
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
      constraints: {
        avoid: form.avoidPrompt,
      },
    };
  };

  const buildPromptText = (): string => {
    const parts: string[] = [];

    parts.push(`Create a social media image for ${form.platform} with aspect ratio ${form.aspectRatio}.`);

    if (form.brandName) parts.push(`Brand: ${form.brandName}.`);
    if (form.productName)
      parts.push(
        `Product: ${form.productName}${form.tagline ? ` — ${form.tagline}` : ""}${form.price ? ` at ${form.price} ${form.currency}` : ""}.`,
      );
    if (form.description) parts.push(`Description: ${form.description}.`);
    if (form.discountBadge) parts.push(`Show discount badge: ${form.discountBadge}.`);

    if (form.headline) parts.push(`Headline: "${form.headline}".`);
    if (form.subheadline) parts.push(`Subheadline: "${form.subheadline}".`);
    if (form.bodyText) parts.push(`Body text: "${form.bodyText}".`);
    if (form.cta)
      parts.push(`Call to action: "${form.cta === "custom" ? form.customCta : form.cta}".`);
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

    if (brandIdentity["brandVoice"]) parts.push(`Brand voice: ${brandIdentity["brandVoice"]}.`);
    if (brandIdentity["designRules"]) parts.push(`Design rules: ${brandIdentity["designRules"]}.`);
    if (brandIdentity["visualGuidelines"]) parts.push(`Visual guidelines: ${brandIdentity["visualGuidelines"]}.`);

    parts.push(
      "Design must be in Arabic, professional, suitable for social media, with clear typography and strong visual hierarchy.",
    );
    parts.push(
      `Use brand colors: primary ${form.primaryColor}, secondary ${form.secondaryColor}, accent ${form.accentColor}.`,
    );

    if (form.avoidPrompt.trim()) {
      parts.push(`Avoid: ${form.avoidPrompt.trim()}.`);
    }

    return parts.join(" ");
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error("من فضلك أدخل اسم المنتج أو العنوان الرئيسي");
      setMessage({ type: "error", text: "من فضلك أدخل اسم المنتج أو العنوان الرئيسي" });
      return;
    }
    setLoading(true);
    setImageUrl("");
    setMessage(null);

    const prompt = (promptTouched && form.editablePrompt.trim()) ? form.editablePrompt.trim() : buildPromptText();
    const productImage = primaryImage ? await getBase64(primaryImage) : undefined;
    const params: Record<string, any> = {
      prompt,
      model: agentModel,
      aspectRatio: form.aspectRatio,
      style: form.mood || form.theme || undefined,
      productImage,
    };
    setLastParams(params);

    try {
      const res = await apiClient.post<GenerateResponse>("/ai-image/generate", {
        structured: buildPromptJson(),
        ...params,
      });
      if (res.data?.data?.imageUrl) {
        setImageUrl(res.data.data.imageUrl);
        setUsage(res.data?.data?.usage || null);
        toast.success("تم توليد الصورة بنجاح");
        fetchGallery();
      } else {
        const text = res.data?.data?.message || res.data?.message || "لم يتم استلام الصورة من الموديل";
        toast.error(text);
        setMessage({ type: "error", text });
      }
    } catch (err: any) {
      const text = err?.response?.data?.message || err?.response?.data?.data?.message || err.message || "فشل في توليد الصورة";
      toast.error(text);
      setMessage({ type: "error", text });
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
    toast.success("تم بدء التحميل");
  };

  const handleCopyUrl = async () => {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + imageUrl);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("فشل نسخ الرابط");
    }
  };

  const handleOpenTab = () => {
    if (!imageUrl) return;
    window.open(imageUrl, "_blank");
  };

  const handleRegenerate = () => {
    if (!lastParams) return;
    setImageUrl("");
    setMessage(null);
    setTimeout(() => handleGenerateFrom(lastParams.prompt, lastParams.model, lastParams.aspectRatio, lastParams.style, lastParams.productImage), 100);
  };

  const handleGenerateFrom = async (prompt: string, model: string, aspectRatio: string, style?: string, productImage?: string) => {
    setLoading(true);
    try {
      const res = await apiClient.post<GenerateResponse>("/ai-image/generate", { prompt, model, aspectRatio, style, productImage });
      if (res.data?.data?.imageUrl) {
        setImageUrl(res.data.data.imageUrl);
        setUsage(res.data?.data?.usage || null);
        toast.success("تم توليد الصورة بنجاح");
        fetchGallery();
      } else {
        const text = res.data?.data?.message || res.data?.message || "لم يتم استلام الصورة من الموديل";
        toast.error(text);
        setMessage({ type: "error", text });
      }
    } catch (err: any) {
      const text = err?.response?.data?.message || err?.response?.data?.data?.message || err.message || "فشل في توليد الصورة";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (filename: string) => {
    try {
      await apiClient.delete(`/ai-image/${filename}`);
      setGallery((prev) => prev.filter((g) => g.filename !== filename));
      setDeleteDialog({ open: false, url: "", filename: "" });
      toast.success("تم حذف الصورة");
    } catch {
      toast.error("فشل حذف الصورة");
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    clearDraft();
    setImageUrl("");
    setMessage(null);
    setPrimaryImage(null);
    setPromptTouched(false);
    setGalleryFilter("all");
    setGallerySearch("");
    setUsage(null);
    toast.info("تم تصفير النموذج");
  };

  const formatDate = (date: string | Date) => {
    try {
      return new Intl.DateTimeFormat("ar-SA", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
    } catch {
      return "";
    }
  };

  const filteredGallery = useMemo(() => {
    const q = gallerySearch.trim().toLowerCase();
    return gallery.filter((img) => {
      if (galleryFilter !== "all" && img.platform !== galleryFilter) return false;
      if (!q) return true;
      const hay = [
        img.filename || "",
        img.prompt || "",
        img.purpose || "",
        img.aspectRatio || "",
        formatDate(img.createdAt),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [gallery, galleryFilter, gallerySearch]);

  const applyTemplate = (template: string) => {
    const t = TEMPLATES[template];
    if (!t) return;
    setForm((prev) => {
      const next = { ...prev, ...t };
      saveDraft(next);
      return next;
    });
    setPromptTouched(false);
    setTimeout(() => setForm((prev) => {
      const next = { ...prev, editablePrompt: buildPromptText() };
      saveDraft(next);
      return next;
    }), 0);
  };

  const inputCls = "bg-white dark:bg-gray-900";

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel="AI"
        title="مصمم صور السوشيال ميديا"
        description="صمم صور احترافية ببيانات منتظمة — منغير ما تكتب برومبت خام"
      />

      <div className="px-5 pb-5 sm:px-6">
        <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">قوالب سريعة:</span>
          {[
            { key: "sale_promotion", label: "عرض / خصم" },
            { key: "new_product_launch", label: "إطلاق منتج" },
            { key: "brand_awareness", label: "تعريف بالعلامة" },
            { key: "engagement", label: "تفاعل" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:bg-primary/5"
            >
              <Sparkles className="size-3" />
              {t.label}
            </button>
          ))}
        </div>

        <Tabs defaultValue="platform" className="mt-4">
          <TabsList variant="line" className="mb-5 flex-wrap gap-1">
            <TabsTrigger value="platform">المنصة</TabsTrigger>
            <TabsTrigger value="product">المنتج</TabsTrigger>
            <TabsTrigger value="brand">العلامة</TabsTrigger>
            <TabsTrigger value="copy">النص</TabsTrigger>
            <TabsTrigger value="style">التصميم</TabsTrigger>
            <TabsTrigger value="campaign">الحملة</TabsTrigger>
            <TabsTrigger value="output">المخرجات</TabsTrigger>
          </TabsList>

          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle>المنصة والأبعاد</CardTitle>
                <CardDescription>اختر المنصة ونوع المنشور أولاً عشان نحدد المقاس المثالي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        update("platform", p.value);
                        if (p.ratios.length > 0 && !p.ratios.includes(form.aspectRatio)) {
                          update("aspectRatio", p.ratios[0] as FormData["aspectRatio"]);
                        }
                      }}
                      className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${
                        form.platform === p.value
                          ? "border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/10 dark:text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 dark:border-border dark:bg-gray-900 dark:text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="نسبة الأبعاد">
                    <Select value={form.aspectRatio} onValueChange={selectValue("aspectRatio")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">معاينة المقاس</Label>
                    <AspectPreview ratio={form.aspectRatio} platformLabel={platformLabel} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  الأبعاد المقترحة لـ {platformLabel}:{" "}
                  {PLATFORMS.find((p) => p.value === form.platform)?.ratios.join(" · ")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle>بيانات المنتج</CardTitle>
                <CardDescription>صور المنتج وتفاصيله</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="اسم المنتج" required hint="الاسم اللي هيظهر في الصورة">
                    <Input
                      dir="auto"
                      placeholder="شنطة جلدية فاخرة"
                      value={form.productName}
                      onChange={(e) => update("productName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="السعر" hint="اتركه فاضي لو مش عايز تظهر السعر">
                    <div className="flex gap-2">
                      <Input
                        placeholder="199"
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className={inputCls}
                      />
                      <Select value={form.currency} onValueChange={selectValue("currency")}>
                        <SelectTrigger className="w-28 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                </div>

                <Field label="شعار / Tagline" hint="جملة قصيرة توضح قيمة المنتج">
                  <Input
                    dir="auto"
                    placeholder="فخامة تبدأ من هنا"
                    value={form.tagline}
                    onChange={(e) => update("tagline", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="وصف المنتج">
                  <Textarea
                    dir="auto"
                    placeholder="وصف مختصر للمنتج..."
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={3}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="شارة تخفيض" hint="مثلاً: خصم 50%">
                    <Input
                      dir="auto"
                      placeholder="50% OFF"
                      value={form.discountBadge}
                      onChange={(e) => update("discountBadge", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="صورة المنتج" hint="اختياري — الصورة هتساعد الموديل يحافظ على الشكل">
                    {!primaryImagePreview ? (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPrimaryImageAndDraft(e.target.files?.[0] || null)}
                        className={inputCls}
                      />
                    ) : (
                      <div className="relative w-fit">
                        <img
                          src={primaryImagePreview}
                          alt="Product preview"
                          className="h-24 w-24 rounded-lg border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPrimaryImageAndDraft(null)}
                          className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow-sm hover:bg-muted"
                          title="إزالة الصورة"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    )}
                  </Field>
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
              <CardContent className="space-y-6">
                {Object.keys(brandIdentity).length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                    <Info className="size-4 shrink-0" />
                    <span>تم استيراد ألوان وهوية العلامة التجارية تلقائياً</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="اسم العلامة التجارية">
                    <Input
                      dir="auto"
                      placeholder="متجر أزياء أونلاين"
                      value={form.brandName}
                      onChange={(e) => update("brandName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="الخط الرئيسي">
                    <Select value={form.headingFont} onValueChange={selectValue("headingFont")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONTS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <SectionHeader
                  title="ألوان العلامة"
                  description="الألوان الأساسية اللي هيتم بناء التصميم عليها"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="اللون الأساسي">
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
                  </Field>
                  <Field label="اللون الثانوي">
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
                  </Field>
                  <Field label="لون الإشارة">
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
                  </Field>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="copy">
            <Card>
              <CardHeader>
                <CardTitle>النص والرسالة</CardTitle>
                <CardDescription>العنوان، دعوة الإجراء، الهاشتاجات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Field label="العنوان الرئيسي" required hint="الجملة الأهم اللي بتجذب الانتباه">
                  <Input
                    dir="auto"
                    placeholder="أجمل تشكيلة شتوية"
                    value={form.headline}
                    onChange={(e) => update("headline", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="عنوان فرعي" hint="تفاصيل إضافية أو عرض">
                    <Input
                      dir="auto"
                      placeholder="تسوق الآن ووفر 50%"
                      value={form.subheadline}
                      onChange={(e) => update("subheadline", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="دعوة للإجراء (CTA)">
                    <Select value={form.cta} onValueChange={selectValue("cta")}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر CTA" />
                      </SelectTrigger>
                      <SelectContent>
                        {CTAS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {form.cta === "custom" && (
                  <Field label="CTA مخصص">
                    <Input
                      dir="auto"
                      placeholder="ادخل النص..."
                      value={form.customCta}
                      onChange={(e) => update("customCta", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label="نص إضافي">
                  <Textarea
                    dir="auto"
                    placeholder="نص قصير يظهر في الصورة..."
                    value={form.bodyText}
                    onChange={(e) => update("bodyText", e.target.value)}
                    rows={2}
                    className={inputCls}
                  />
                </Field>

                <Field label="هاشتاجات (مفصولة بفاصلة)">
                  <Input
                    dir="auto"
                    placeholder="موضة, تخفيضات, تسوق"
                    value={form.hashtags}
                    onChange={(e) => update("hashtags", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="مكان النص">
                    <Select value={form.textPosition} onValueChange={selectValue("textPosition")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEXT_POSITIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="محاذاة النص">
                    <Select value={form.textAlignment} onValueChange={selectValue("textAlignment")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="right">يمين</SelectItem>
                        <SelectItem value="center">وسط</SelectItem>
                        <SelectItem value="left">يسار</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="style">
            <Card>
              <CardHeader>
                <CardTitle>التصميم البصري</CardTitle>
                <CardDescription>المود، الثيم، والـ Layout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="المود / الجو العام">
                    <Select value={form.mood} onValueChange={selectValue("mood")}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المود" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="الثيم">
                    <Select value={form.theme} onValueChange={selectValue("theme")}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الثيم" />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="ما يجب تجنبه في الصورة" hint="مثلاً: أشخاص، نصوص إنجليزية، خلفيات مشوشة">
                  <Textarea
                    dir="auto"
                    placeholder="اكتب كل ما لا تريد ظهوره..."
                    value={form.avoidPrompt}
                    onChange={(e) => update("avoidPrompt", e.target.value)}
                    rows={2}
                    className={inputCls}
                  />
                </Field>

                <Field label="الـ Layout">
                  <Select value={form.layout} onValueChange={selectValue("layout")}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التوزيع" />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUTS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="الزوايا">
                    <Select value={form.borderRadius} onValueChange={selectValue("borderRadius")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">حادة</SelectItem>
                        <SelectItem value="subtle">ناعمة قليلاً</SelectItem>
                        <SelectItem value="rounded">مدورة</SelectItem>
                        <SelectItem value="pill">دائرية</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="الظل">
                    <Select value={form.shadow} onValueChange={selectValue("shadow")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        <SelectItem value="soft">خفيف</SelectItem>
                        <SelectItem value="medium">متوسط</SelectItem>
                        <SelectItem value="hard">قوي</SelectItem>
                        <SelectItem value="glow">توهج</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
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
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="الهدف من الصورة">
                    <Select value={form.purpose} onValueChange={selectValue("purpose")}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="اسم الحملة">
                    <Input
                      dir="auto"
                      placeholder="مثلاً: حملة الشتاء 2026"
                      value={form.campaignName}
                      onChange={(e) => update("campaignName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="الاستعجال">
                    <Select value={form.urgency} onValueChange={selectValue("urgency")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCIES.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="الرابط">
                    <Input
                      dir="ltr"
                      placeholder="https://example.com"
                      value={form.url}
                      onChange={(e) => update("url", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
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
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="محرك التوليد (من إعدادات الأجنت)">
                    <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted px-3 text-sm">
                      <span className="size-2 rounded-full bg-green-500" />
                      <span className="font-mono text-xs">{agentModel}</span>
                    </div>
                  </Field>
                  <Field label="الأبعاد">
                    <Select value={form.aspectRatio} onValueChange={selectValue("aspectRatio")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="صيغة الملف">
                    <Select
                      value={form.format}
                      onValueChange={(v) => {
                        if (v === null) return;
                        update("format", v);
                        if (v !== "png") update("transparentBg", false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={`الجودة (${form.quality}%)`}>
                    <input
                      type="range"
                      min={60}
                      max={100}
                      value={form.quality}
                      onChange={(e) => update("quality", Number(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                  <Field
                    label="خلفية شفافة"
                    hint={form.format !== "png" ? "متاحة فقط مع صيغة PNG" : ""}
                  >
                    <Switch
                      checked={form.transparentBg}
                      onCheckedChange={(v) => update("transparentBg", v)}
                      disabled={form.format !== "png"}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">البرومبت النهائي (يمكنك تعديله قبل التوليد)</Label>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showJson ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {showJson ? "إخفاء JSON" : "عرض JSON"}
            </button>
          </div>
          <Textarea
            dir="auto"
            value={form.editablePrompt}
            onChange={(e) => {
              update("editablePrompt", e.target.value);
              setPromptTouched(true);
            }}
            rows={4}
            className={inputCls}
            placeholder="سيظهر البرومبت النهائي هنا بعد ملء الحقول..."
          />
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
            disabled={loading || !canGenerate}
            title={!canGenerate ? "اكتب اسم المنتج أو عنوان رئيسي أولاً" : undefined}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> جاري التوليد...
              </>
            ) : (
              <>
                <Wand2 className="size-4" /> {!canGenerate ? "اكتب بيانات أولاً" : "توليد الصورة"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw className="size-4" /> تصفير
          </Button>
        </div>

        {usage && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">استخدام الموديل:</span>
            {usage.prompt_tokens !== undefined && <span>prompt: {usage.prompt_tokens.toLocaleString()}</span>}
            {usage.completion_tokens !== undefined && <span>completion: {usage.completion_tokens.toLocaleString()}</span>}
            {usage.total_tokens !== undefined && <span className="font-semibold">الإجمالي: {usage.total_tokens.toLocaleString()} token</span>}
          </div>
        )}

        <div id="ai-generated-result" className="mt-6">
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
                <Button variant="outline" className="gap-2" onClick={handleCopyUrl}>
                  <Copy className="size-4" /> نسخ الرابط
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleOpenTab}>
                  <ExternalLink className="size-4" /> فتح في تبويب
                </Button>
                {lastParams && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleRegenerate}
                    disabled={loading}
                  >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> توليد مماثل
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="gap-2 text-red-500"
                  onClick={() => setImageUrl("")}
                >
                  <Trash2 className="size-4" /> مسح
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 dark:bg-gray-900">
              <div className="text-center text-slate-400">
                <ImageIcon className="mx-auto size-16" />
                <p className="mt-3 text-sm">الصورة هتظهر هنا بعد التوليد</p>
                <p className="mt-1 text-xs text-slate-400">
                  المقاس الحالي: {form.aspectRatio} · {ASPECT_SIZES[form.aspectRatio] || ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Grid3X3 className="size-5 text-sky-600" />
              الصور المُنشأة
              <Badge variant="secondary">{gallery.length}</Badge>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={fetchGallery}
              disabled={galleryLoading}
            >
              <RefreshCw className={`size-3 ${galleryLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">المنصة:</span>
              <Select value={galleryFilter} onValueChange={(v) => setGalleryFilter(v || "all")}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="ابحث باسم الملف، البرومبت، التاريخ..."
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              className={`h-8 sm:w-72 ${inputCls}`}
            />
          </div>

          {filteredGallery.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 dark:bg-gray-900">
              <div className="text-center text-slate-400">
                <ImageIcon className="mx-auto size-10" />
                <p className="mt-2 text-sm">
                  {gallerySearch || galleryFilter !== "all" ? "لا توجد نتائج مطابقة للبحث" : "لا توجد صور بعد. أول صورة هتظهر هنا."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredGallery.map((img) => (
                <div
                  key={img.filename}
                  className="group relative overflow-hidden rounded-lg border bg-slate-50 dark:bg-gray-900"
                >
                  <img
                    src={img.url}
                    alt=""
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {(img.platform || img.aspectRatio || img.purpose) && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {img.platform && <Badge variant="secondary" className="text-[10px]">{PLATFORMS.find((p) => p.value === img.platform)?.label || img.platform}</Badge>}
                      {img.aspectRatio && <Badge variant="outline" className="text-[10px]">{img.aspectRatio}</Badge>}
                    </div>
                  )}
                  {img.prompt && (
                    <div
                      title={img.prompt}
                      className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {img.prompt}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded bg-white/20 p-1.5 text-white hover:bg-white/40"
                      onClick={() => {
                        setImageUrl(img.url);
                        document.getElementById("ai-generated-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      title="عرض"
                    >
                      <ImageIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded bg-white/20 p-1.5 text-white hover:bg-white/40"
                      onClick={() => window.open(img.url, "_blank")}
                      title="فتح"
                    >
                      <ExternalLink className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-500/60 p-1.5 text-white hover:bg-red-500/80"
                      onClick={() => setDeleteDialog({ open: true, url: img.url, filename: img.filename })}
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(open ? deleteDialog : { open: false, url: "", filename: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-500" /> حذف الصورة
            </DialogTitle>
            <DialogDescription>متأكد إنك عايز تحذف الصورة دي؟ مش هتقدر ترجعها بعد كدا.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={deleteDialog.url}
              alt=""
              className="max-h-48 rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, url: "", filename: "" })}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteImage(deleteDialog.filename)}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageShell>
  );
};

export default AIImageGenerator;
