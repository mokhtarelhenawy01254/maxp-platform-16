import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  FileText,
  Hash,
  Type,
  MessageSquare,
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SettingsStatusAlert,
} from "../settings/components/SettingsPagePrimitives";
import { apiClient } from "../../services/apiClient";
import { useCompany } from "../../contexts/CompanyContext";

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

type Vertical = "ecommerce" | "medical" | "education" | "restaurant" | "services" | "general";

const VERTICALS: { value: Vertical; label: string }[] = [
  { value: "ecommerce", label: "متجر إلكتروني" },
  { value: "medical", label: "عيادة / مركز طبي" },
  { value: "education", label: "مركز تعليمي" },
  { value: "restaurant", label: "مطعم / كافيه" },
  { value: "services", label: "خدمات / استشارات" },
  { value: "general", label: "عام" },
];

interface VerticalConfig {
  productNameLabel: string;
  productNamePlaceholder: string;
  priceLabel: string;
  priceHint: string;
  discountBadgeLabel: string;
  discountBadgePlaceholder: string;
  headlineLabel: string;
  headlinePlaceholder: string;
  subheadlinePlaceholder: string;
  taglineLabel: string;
  taglinePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  ctaOptions: { value: string; label: string }[];
  purposeOptions: { value: string; label: string }[];
  platformDefaults?: string[];
}

const VERTICAL_CONFIG: Record<Vertical, VerticalConfig> = {
  ecommerce: {
    productNameLabel: "اسم المنتج",
    productNamePlaceholder: "مثال: حقيبة جلدية كلاسيكية",
    priceLabel: "السعر والعملة",
    priceHint: "اتركه فارغاً لإخفاء السعر",
    discountBadgeLabel: "شارة الخصم",
    discountBadgePlaceholder: "خصم 30%",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: خصم 50% لفترة محدودة",
    subheadlinePlaceholder: "مثال: التوصيل مجاني لكل مناطق المملكة",
    taglineLabel: "شعار قصير / Tagline",
    taglinePlaceholder: "مثال: الأناقة والجودة في تصميم واحد",
    descriptionLabel: "وصف المنتج التفصيلي",
    descriptionPlaceholder: "حقيبة مصنوعة من الجلد الطبيعي المقاوم للماء بمقبض يدوي مريح...",
    ctaOptions: CTAS,
    purposeOptions: PURPOSES,
  },
  medical: {
    productNameLabel: "اسم الخدمة / الطبيب",
    productNamePlaceholder: "مثال: كشف أسنان / د. أحمد",
    priceLabel: "رسوم الخدمة",
    priceHint: "اتركه فارغاً لإخفاء الرسوم",
    discountBadgeLabel: "عرض الخدمة",
    discountBadgePlaceholder: "كشف مجاني أول مرة",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: احجز موعدك بسهولة",
    subheadlinePlaceholder: "مثال: فريق طبي متخصص بانتظارك",
    taglineLabel: "نبذة عن المركز",
    taglinePlaceholder: "مثال: رعاية طبية موثوقة",
    descriptionLabel: "تفاصيل الخدمة الطبية",
    descriptionPlaceholder: "وصف مختصر للخدمة، فوائدها، ومدة الجلسة...",
    ctaOptions: [
      { value: "احجز الآن", label: "احجز الآن" },
      { value: "اعرف المزيد", label: "اعرف المزيد" },
      { value: "تواصل معنا", label: "تواصل معنا" },
      { value: "احجز موعد", label: "احجز موعد" },
      { value: "استشارة مجانية", label: "استشارة مجانية" },
      { value: "custom", label: "نص مخصص" },
    ],
    purposeOptions: [
      { value: "new_service_launch", label: "إطلاق خدمة جديدة" },
      { value: "appointment_booking", label: "حجز مواعيد" },
      { value: "awareness", label: "توعية صحية" },
      { value: "seasonal_event", label: "مناسبة موسمية" },
      { value: "announcement", label: "إعلان" },
      { value: "testimonial_social_proof", label: "توصيات المرضى" },
    ],
    platformDefaults: ["instagram", "facebook", "linkedin"],
  },
  education: {
    productNameLabel: "اسم الدورة / المادة",
    productNamePlaceholder: "مثال: دورة لغة إنجليزية للأطفال",
    priceLabel: "سعر الاشتراك",
    priceHint: "اتركه فارغاً لإخفاء السعر",
    discountBadgeLabel: "عرض التسجيل",
    discountBadgePlaceholder: "خصم 20% للتسجيل المبكر",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: التسجيل مفتوح الآن",
    subheadlinePlaceholder: "مثال: حصص تفاعلية مع معلمين متخصصين",
    taglineLabel: "شعار المركز التعليمي",
    taglinePlaceholder: "مثال: تعلم بمتعة وثقة",
    descriptionLabel: "تفاصيل الدورة",
    descriptionPlaceholder: "محتوى الدورة، الفئة العمرية، عدد الحصص، والمميزات...",
    ctaOptions: [
      { value: "سجّل الآن", label: "سجّل الآن" },
      { value: "احجز حصة تجريبية", label: "احجز حصة تجريبية" },
      { value: "اعرف المزيد", label: "اعرف المزيد" },
      { value: "تواصل معنا", label: "تواصل معنا" },
      { value: "custom", label: "نص مخصص" },
    ],
    purposeOptions: [
      { value: "new_course_launch", label: "إطلاق دورة جديدة" },
      { value: "enrollment_open", label: "فتح التسجيل" },
      { value: "educational", label: "محتوى تعليمي" },
      { value: "engagement", label: "تفاعل" },
      { value: "announcement", label: "إعلان" },
    ],
    platformDefaults: ["instagram", "facebook", "tiktok"],
  },
  restaurant: {
    productNameLabel: "اسم الوجبة / العرض",
    productNamePlaceholder: "مثال: وجبة غداء خاصة",
    priceLabel: "السعر",
    priceHint: "اتركه فارغاً لإخفاء السعر",
    discountBadgeLabel: "عرض الطعام",
    discountBadgePlaceholder: "خصم 30% على الطلبات",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: طعم ما يُنسى",
    subheadlinePlaceholder: "مثال: اطلب الآن ونوصلك لحد باب البيت",
    taglineLabel: "شعار المطعم",
    taglinePlaceholder: "مثال: طازج في كل لقمة",
    descriptionLabel: "تفاصيل الوجبة / العرض",
    descriptionPlaceholder: "مكونات الوجبة، الحجم، والعرض المقدم...",
    ctaOptions: [
      { value: "اطلب الآن", label: "اطلب الآن" },
      { value: "احجز طاولة", label: "احجز طاولة" },
      { value: "اعرف المزيد", label: "اعرف المزيد" },
      { value: "تواصل معنا", label: "تواصل معنا" },
      { value: "custom", label: "نص مخصص" },
    ],
    purposeOptions: [
      { value: "new_menu_item", label: "وجبة جديدة" },
      { value: "sale_promotion", label: "عرض / تخفيضات" },
      { value: "brand_awareness", label: "تعريف بالعلامة" },
      { value: "engagement", label: "تفاعل" },
      { value: "traffic_driving", label: "جلب زيارات" },
    ],
    platformDefaults: ["instagram", "tiktok", "facebook"],
  },
  services: {
    productNameLabel: "اسم الخدمة",
    productNamePlaceholder: "مثال: جلسة استشارة قانونية",
    priceLabel: "رسوم الخدمة",
    priceHint: "اتركه فارغاً لإخفاء الرسوم",
    discountBadgeLabel: "عرض الخدمة",
    discountBadgePlaceholder: "استشارة أولى مجانية",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: احصل على استشارة متخصصة",
    subheadlinePlaceholder: "مثال: خبراء في خدمتك لحل كل تحدياتك",
    taglineLabel: "شعار الشركة",
    taglinePlaceholder: "مثال: حلول عملية بخبرة حقيقية",
    descriptionLabel: "تفاصيل الخدمة",
    descriptionPlaceholder: "اشرح الخدمة، المشكلة التي تحلها، وطريقة التواصل...",
    ctaOptions: [
      { value: "تواصل معنا", label: "تواصل معنا" },
      { value: "احجز استشارة", label: "احجز استشارة" },
      { value: "اعرف المزيد", label: "اعرف المزيد" },
      { value: "ابدأ الآن", label: "ابدأ الآن" },
      { value: "custom", label: "نص مخصص" },
    ],
    purposeOptions: [
      { value: "lead_generation", label: "توليد عملاء محتملين" },
      { value: "brand_awareness", label: "تعريف بالعلامة" },
      { value: "announcement", label: "إعلان" },
      { value: "educational", label: "محتوى تعليمي" },
    ],
    platformDefaults: ["linkedin", "instagram", "facebook"],
  },
  general: {
    productNameLabel: "اسم المحتوى / العرض",
    productNamePlaceholder: "مثال: عرض خاص محدود",
    priceLabel: "السعر / التكلفة",
    priceHint: "اتركه فارغاً لإخفاء السعر",
    discountBadgeLabel: "شارة العرض",
    discountBadgePlaceholder: "عرض محدود",
    headlineLabel: "العنوان الرئيسي للإعلان",
    headlinePlaceholder: "مثال: عرض لا يفوت",
    subheadlinePlaceholder: "مثال: تفاصيل إضافية توضح القيمة",
    taglineLabel: "شعار قصير / Tagline",
    taglinePlaceholder: "مثال: قيمة حقيقية في كل تفصيلة",
    descriptionLabel: "وصف التصميم",
    descriptionPlaceholder: "اشرح الفكرة الأساسية للصورة والرسالة المطلوبة...",
    ctaOptions: CTAS,
    purposeOptions: PURPOSES,
  },
};

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

// ModelConfigResponse removed — model selection is handled by the backend agent template.

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
  vertical: Vertical;
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
  brandKitAutoApply: boolean;
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
  vertical: "general",
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
  brandKitAutoApply: true,
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



function AspectPreview({
  formData,
  platformLabel,
}: {
  formData: FormData;
  platformLabel: string;
}) {
  const ratio = formData.aspectRatio;
  let aspectVal = 1;
  if (ratio.includes(":")) {
    const parts = ratio.split(":").map(Number);
    const w = parts[0];
    const h = parts[1];
    if (w !== undefined && h !== undefined && !isNaN(w) && !isNaN(h) && h !== 0) {
      aspectVal = w / h;
    }
  } else {
    const val = Number(ratio);
    if (!isNaN(val)) aspectVal = val;
  }

  const radiusMap: Record<string, string> = {
    none: "rounded-none",
    subtle: "rounded-md",
    rounded: "rounded-2xl",
    pill: "rounded-[32px]",
  };

  const shadowMap: Record<string, string> = {
    none: "shadow-none",
    soft: "shadow-sm",
    medium: "shadow-md",
    hard: "shadow-lg",
    glow: "shadow-[0_0_15px_rgba(56,189,248,0.25)]",
  };

  const positionMap: Record<string, string> = {
    "top-left": "justify-start items-start text-left",
    "top-center": "justify-start items-center text-center",
    "top-right": "justify-start items-end text-right",
    "center": "justify-center items-center text-center",
    "bottom-left": "justify-end items-start text-left",
    "bottom-center": "justify-end items-center text-center",
    "bottom-right": "justify-end items-end text-right",
  };

  const alignmentClass =
    formData.textAlignment === "left"
      ? "text-left"
      : formData.textAlignment === "right"
      ? "text-right"
      : "text-center";

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200/50 bg-slate-50/50 p-5 dark:border-slate-800/50 dark:bg-slate-900/50">
      <div className="relative flex min-h-[240px] w-full items-center justify-center p-2">
        <div
          style={{
            aspectRatio: aspectVal,
            maxHeight: "260px",
            maxWidth: "100%",
            backgroundColor: formData.primaryColor || "#0f172a",
            color: formData.secondaryColor || "#ffffff",
          }}
          className={`relative flex flex-col justify-between p-4 transition-all duration-300 w-full overflow-hidden border border-slate-200/20 dark:border-slate-800/20 ${
            radiusMap[formData.borderRadius] || "rounded-xl"
          } ${shadowMap[formData.shadow] || "shadow-md"}`}
        >
          <div
            style={{ backgroundColor: formData.accentColor || "#38bdf8" }}
            className="absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-xl"
          />

          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] opacity-80">
            <span className="font-bold tracking-wider">
              {formData.brandName || "اسم العلامة"}
            </span>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[8px] uppercase font-semibold">
              {platformLabel}
            </span>
          </div>

          <div
            className={`flex flex-1 flex-col py-2 ${
              positionMap[formData.textPosition] || "justify-center items-center text-center"
            }`}
          >
            <div className={`space-y-1 w-full ${alignmentClass}`}>
              {formData.discountBadge && (
                <span
                  style={{
                    backgroundColor: formData.accentColor || "#38bdf8",
                    color: formData.primaryColor || "#0f172a",
                  }}
                  className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
                >
                  {formData.discountBadge}
                </span>
              )}
              <h5 className="text-xs font-bold leading-tight line-clamp-2">
                {formData.headline || "العنوان الرئيسي للإعلان"}
              </h5>
              {formData.subheadline && (
                <p className="text-[10px] leading-tight opacity-90 line-clamp-1">
                  {formData.subheadline}
                </p>
              )}
              {formData.productName && (
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px]">
                  <span className="font-medium underline decoration-accent decoration-2">
                    {formData.productName}
                  </span>
                  {formData.price && (
                    <span className="rounded bg-black/30 px-1.5 py-0.5 font-bold text-accent">
                      {formData.price} {formData.currency}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between pt-1 text-[9px] opacity-90">
            <span className="truncate text-[8px] text-white/50">{formData.tagline || ""}</span>
            {(formData.cta || formData.customCta) && (
              <span
                style={{
                  backgroundColor: formData.accentColor || "#38bdf8",
                  color: formData.primaryColor || "#0f172a",
                }}
                className="rounded px-2.5 py-1 font-bold text-[9px] shadow-sm hover:scale-105 transition-transform"
              >
                {formData.cta === "custom" ? formData.customCta : formData.cta}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="w-full border-t border-slate-200/50 pt-2.5 text-center text-xs dark:border-slate-800/50">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          معاينة المقاس: <span className="font-mono text-sky-600 dark:text-sky-400">{ratio}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          الأبعاد التقريبية: {ASPECT_SIZES[ratio] || ""} بكسل
        </p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 dark:border-slate-800/50 py-3 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-right group"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600 dark:bg-slate-800/50 dark:text-slate-400 dark:group-hover:bg-sky-950/30 dark:group-hover:text-sky-400 transition-colors">
            <Icon className="size-4" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="size-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        ) : (
          <ChevronDown className="size-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
        )}
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[2000px] pt-4 pb-2 px-1" : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const detectVerticalFromCompany = (company: any | null): Vertical => {
  if (!company) return "general";
  const activeApps = company.activeApps || [];
  const appSet = new Set(Array.isArray(activeApps) ? activeApps : []);
  if (appSet.has("medical-system") || appSet.has("medical-app")) return "medical";
  if (appSet.has("education-app")) return "education";
  if (appSet.has("restaurant-app") || appSet.has("food-app") || appSet.has("menu-app")) return "restaurant";
  if (appSet.has("services-app") || appSet.has("consulting-app")) return "services";
  if (
    appSet.has("ecommerce-basic") ||
    appSet.has("ecommerce-pro") ||
    appSet.has("ecommerce-plus") ||
    appSet.has("inventory-pro") ||
    appSet.has("marketplace")
  ) {
    return "ecommerce";
  }
  return "general";
};

const AIImageGenerator: React.FC = () => {
  const { company } = useCompany();
  const [form, setForm] = useState<FormData>(() => {
    const draft = loadDraft();
    return { ...initialForm, ...(draft || {}) };
  });
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentityResponse>({});
  const [brandKitLoading, setBrandKitLoading] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState<{ headline?: string; caption: string; cta: string; hashtags: string[] } | null>(null);

  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; url: string; filename: string }>({
    open: false,
    url: "",
    filename: "",
  });
  const [promptTouched, setPromptTouched] = useState(false);
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string>("");
  const [referenceImagePreview, setReferenceImagePreview] = useState<string>("");
  const [galleryFilter, setGalleryFilter] = useState<string>("all");
  const [gallerySearch, setGallerySearch] = useState<string>("");
  const [lastParams, setLastParams] = useState<{
    prompt: string;
    aspectRatio: string;
    style?: string;
    quality?: number;
    productImage?: string;
    referenceImage?: string;
  } | null>(null);
  const [usage, setUsage] = useState<{
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null>(null);

  const [verticalLocked, setVerticalLocked] = useState(false);

  const vertical = form.vertical || "general";
  const vc = VERTICAL_CONFIG[vertical];
  const isBrandKitLoaded = Object.keys(brandIdentity).length > 0;

  const [openSections, setOpenSections] = useState<{
    branding: boolean;
    layout: boolean;
    campaign: boolean;
    output: boolean;
  }>({
    branding: false,
    layout: false,
    campaign: false,
    output: false,
  });

  const toggleSection = (section: "branding" | "layout" | "campaign" | "output") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const selectValue = <K extends keyof FormData>(key: K) => (value: string | null) => {
    if (value !== null) update(key, value as FormData[K]);
  };

  useEffect(() => {
    setBrandKitLoading(true);
    apiClient
      .get<BrandIdentityResponse>("/settings/brand-identity")
      .then((res) => {
        const data = res.data;
        if (data) {
          setBrandIdentity(data);
          setForm((prev) => {
            if (!prev.brandKitAutoApply) return prev;
            const next = {
              ...prev,
              brandName: data.brandName || prev.brandName,
              primaryColor: data.primaryColor || prev.primaryColor,
              secondaryColor: data.secondaryColor || prev.secondaryColor,
              accentColor: data.accentColor || prev.accentColor,
              headingFont: data.headingFont || prev.headingFont,
            };
            saveDraft(next);
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() => setBrandKitLoading(false));
    fetchGallery();
  }, []);

  useEffect(() => {
    if (!company || verticalLocked || form.vertical !== "general") return;
    const detected = detectVerticalFromCompany(company);
    if (detected !== "general") {
      setForm((prev) => {
        const next = {
          ...prev,
          vertical: detected,
          platform: VERTICAL_CONFIG[detected].platformDefaults?.[0] || prev.platform,
        };
        saveDraft(next);
        return next;
      });
      setVerticalLocked(true);
    }
  }, [company, verticalLocked, form.vertical]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  const rebuildPrompt = useCallback(() => buildPromptText(), [buildPromptText]);

  useEffect(() => {
    if (!promptTouched) {
      setForm((prev) => ({ ...prev, editablePrompt: rebuildPrompt() }));
    }
  }, [
    form.platform,
    form.aspectRatio,
    form.brandName,
    form.primaryColor,
    form.secondaryColor,
    form.accentColor,
    form.headingFont,
    form.productName,
    form.tagline,
    form.description,
    form.price,
    form.currency,
    form.discountBadge,
    form.headline,
    form.subheadline,
    form.bodyText,
    form.cta,
    form.customCta,
    form.hashtags,
    form.textPosition,
    form.textAlignment,
    form.mood,
    form.theme,
    form.layout,
    form.borderRadius,
    form.shadow,
    form.purpose,
    form.urgency,
    form.avoidPrompt,
    primaryImage,
  ]);

  useEffect(() => {
    if (!imageUrl) return;
    document.getElementById("ai-generated-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [imageUrl]);

  const generateCaption = useCallback(async () => {
    if (!canGenerate) {
      toast.error("من فضلك أدخل اسم المنتج أو العنوان الرئيسي لتوليد الكابشن");
      return;
    }
    try {
      const res = await apiClient.post<{
        success?: boolean;
        data?: { headline?: string; caption: string; cta: string; hashtags: string[] };
        message?: string;
      }>("/ai-image/caption", {
        structured: buildPromptJson(),
        brandVoice: brandIdentity["brandVoice"] || "",
      });
      if (res.data?.success && res.data?.data) {
        setGeneratedCaption(res.data.data);
        toast.success("تم توليد الكابشن والهاشتاجات");
      } else {
        toast.error(res.data?.message || "فشل توليد الكابشن");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "فشل توليد الكابشن");
    }
  }, [canGenerate, form, brandIdentity, buildPromptJson]);

  const canGenerate = useMemo(
    () => Boolean(form.productName.trim() || form.headline.trim()),
    [form.productName, form.headline]
  );

  const fetchGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await apiClient.get<any>("/ai-image/history");
      if (res.data?.success && Array.isArray(res.data.data)) setGallery(res.data.data);
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

  useEffect(() => {
    if (!referenceImage) {
      setReferenceImagePreview("");
      return;
    }
    const url = URL.createObjectURL(referenceImage);
    setReferenceImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);

  const setPrimaryImageAndDraft = (file: File | null) => {
    setPrimaryImage(file);
    setForm((prev) => {
      const next = { ...prev };
      saveDraft(next);
      return next;
    });
  };

  const setReferenceImageAndDraft = (file: File | null) => {
    setReferenceImage(file);
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
    [form.platform]
  );

  const buildPromptJson = useCallback(() => {
    return {
      vertical: form.vertical,
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
          ? form.hashtags
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean)
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
  }, [
    form,
    primaryImage,
  ]);

  const buildPromptText = (): string => {
    const parts: string[] = [];

    parts.push(`Create a social media image for ${form.platform} with aspect ratio ${form.aspectRatio}.`);
    parts.push(`Industry vertical: ${form.vertical}. Adapt the tone, imagery, and messaging to suit this business type.`);

    if (form.brandName) parts.push(`Brand: ${form.brandName}.`);
    if (form.productName)
      parts.push(
        `Product: ${form.productName}${form.tagline ? ` — ${form.tagline}` : ""}${
          form.price ? ` at ${form.price} ${form.currency}` : ""
        }.`
      );
    if (form.description) parts.push(`Description: ${form.description}.`);
    if (form.discountBadge) parts.push(`Show discount badge: ${form.discountBadge}.`);

    if (form.headline) parts.push(`Headline: "${form.headline}".`);
    if (form.subheadline) parts.push(`Subheadline: "${form.subheadline}".`);
    if (form.bodyText) parts.push(`Body text: "${form.bodyText}".`);
    if (form.cta) parts.push(`Call to action: "${form.cta === "custom" ? form.customCta : form.cta}".`);
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
      "Design must be in Arabic, professional, suitable for social media, with clear typography and strong visual hierarchy."
    );
    parts.push(
      `Use brand colors: primary ${form.primaryColor}, secondary ${form.secondaryColor}, accent ${form.accentColor}.`
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
    setGeneratedCaption(null);

    const prompt =
      promptTouched && form.editablePrompt.trim() ? form.editablePrompt.trim() : buildPromptText();
    const productImage = primaryImage ? await getBase64(primaryImage) : undefined;
    const referenceImageData = referenceImage ? await getBase64(referenceImage) : undefined;
    const params = {
      prompt,
      aspectRatio: form.aspectRatio,
      style: form.mood || form.theme || undefined,
      quality: form.quality,
      productImage,
      referenceImage: referenceImageData,
    };
    setLastParams(params);

    try {
      const res = await apiClient.post<GenerateResponse>(
        "/ai-image/generate",
        {
          structured: buildPromptJson(),
          ...params,
        },
        { timeout: 120000 }
      );
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
      const text =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err.message ||
        "فشل في توليد الصورة";
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

  const handleCopyCaption = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ النص");
    } catch {
      toast.error("فشل النسخ");
    }
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
    setTimeout(
      () =>
        handleGenerateFrom(
          lastParams.prompt,
          lastParams.aspectRatio,
          lastParams.style,
          lastParams.quality,
          lastParams.productImage,
          lastParams.referenceImage
        ),
      100
    );
  };

  const handleGenerateFrom = async (
    prompt: string,
    aspectRatio: string,
    style?: string,
    quality?: number,
    productImage?: string,
    referenceImage?: string
  ) => {
    setLoading(true);
    try {
      const res = await apiClient.post<GenerateResponse>(
        "/ai-image/generate",
        { prompt, aspectRatio, style, quality, productImage, referenceImage },
        { timeout: 120000 }
      );
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
      const text =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err.message ||
        "فشل في توليد الصورة";
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
    setReferenceImage(null);
    setPromptTouched(false);
    setGalleryFilter("all");
    setGallerySearch("");
    setUsage(null);
    setGeneratedCaption(null);
    toast.info("تم تصفير النموذج");
  };

  const formatDate = (date: string | Date) => {
    try {
      return new Intl.DateTimeFormat("ar-SA", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(date)
      );
    } catch {
      return "";
    }
  };

  const handleApplySettings = (img: any) => {
    setForm((prev) => {
      const next = {
        ...prev,
        platform: img.platform || prev.platform,
        aspectRatio: img.aspectRatio || prev.aspectRatio,
        purpose: img.purpose || prev.purpose,
        editablePrompt: img.prompt || prev.editablePrompt,
      };
      saveDraft(next);
      return next;
    });

    setPromptTouched(true);
    toast.success("تم تطبيق إعدادات الصورة المحددة للنموذج والبرومبت");
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
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [gallery, galleryFilter, gallerySearch]);

  const inputCls = "bg-white dark:bg-gray-900 border-slate-200 dark:border-slate-800 rounded-xl";

  return (
    <div dir="rtl" className="space-y-6 text-right w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Sleek 2026 low-profile Page Header */}
      <div className="flex flex-col gap-4 pb-4 pt-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="size-5 text-sky-500 animate-pulse" />
            مصمم صور السوشيال ميديا
          </h1>
          <p className="text-xs text-muted-foreground">
            أنشئ محتوى بصري احترافي متكيّف مع نوع نشاطك بدون برومبت معقد
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نوع النشاط:</span>
            <Select
              value={form.vertical}
              onValueChange={(v) => {
                const nextVertical = (v as Vertical) || "general";
                const defaults = VERTICAL_CONFIG[nextVertical].platformDefaults;
                setForm((prev) => {
                  const next = {
                    ...prev,
                    vertical: nextVertical,
                    platform: defaults?.[0] || prev.platform,
                    cta: vc.ctaOptions.find((c) => c.value === prev.cta) ? prev.cta : "",
                    purpose: vc.purposeOptions.find((p) => p.value === prev.purpose) ? prev.purpose : "",
                  };
                  saveDraft(next);
                  return next;
                });
                setVerticalLocked(true);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs rounded-xl bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERTICALS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {company && (
            <p className="text-[10px] text-muted-foreground">
              تم الكشف تلقائياً بناءً على تطبيقات الشركة المفعلة.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />

        {/* Main Grid: Config (Right) & Live Preview (Left) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Right Column: Configuration Form (lg:col-span-7) */}
          <div className="space-y-5 lg:col-span-7">
            
            {/* Core Product Information (Flat layout) */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-sky-500" />
                  بيانات المنتج والإعلان الأساسية
                </h3>
                <p className="text-[11px] text-muted-foreground">المعلومات الضرورية التي ستبنى عليها الصورة</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={vc.productNameLabel} required hint="الاسم الأساسي الذي سيظهر بالتصميم">
                    <Input
                      dir="auto"
                      placeholder={vc.productNamePlaceholder}
                      value={form.productName}
                      onChange={(e) => update("productName", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={vc.priceLabel} hint={vc.priceHint}>
                    <div className="flex gap-2">
                      <Input
                        placeholder="199"
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className={inputCls}
                      />
                      <Select value={form.currency} onValueChange={selectValue("currency")}>
                        <SelectTrigger className="w-28 shrink-0 rounded-xl">
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={vc.headlineLabel} required hint="الجملة الأهم لجذب انتباه العميل">
                    <Input
                      dir="auto"
                      placeholder={vc.headlinePlaceholder}
                      value={form.headline}
                      onChange={(e) => update("headline", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="العنوان الفرعي" hint="تفاصيل داعمة للعنوان الرئيسي">
                    <Input
                      dir="auto"
                      placeholder={vc.subheadlinePlaceholder}
                      value={form.subheadline}
                      onChange={(e) => update("subheadline", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={vc.taglineLabel} hint="عبارة توضح قيمة المحتوى الأساسية">
                    <Input
                      dir="auto"
                      placeholder={vc.taglinePlaceholder}
                      value={form.tagline}
                      onChange={(e) => update("tagline", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={vc.discountBadgeLabel} hint="مثال: 50% OFF أو عرض خاص">
                    <Input
                      dir="auto"
                      placeholder={vc.discountBadgePlaceholder}
                      value={form.discountBadge}
                      onChange={(e) => update("discountBadge", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label={vc.descriptionLabel} hint="وصف يوضح تفاصيل ومزايا التصميم المراد توليده">
                  <Textarea
                    dir="auto"
                    placeholder={vc.descriptionPlaceholder}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={3}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="صورة المنتج (Reference Image)" hint="اختياري — ارفع صورة منتجك الحقيقي ليدمجها بالذكاء الاصطناعي">
                    {!primaryImagePreview ? (
                      <div className="relative flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 p-2 dark:bg-slate-900/50">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPrimaryImageAndDraft(e.target.files?.[0] || null)}
                          className="opacity-0 absolute inset-0 cursor-pointer h-full w-full z-10"
                        />
                        <div className="text-center pointer-events-none py-1">
                          <ImageIcon className="mx-auto size-5 text-slate-400 mb-1" />
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">ارفع صورة المنتج</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-center gap-3 rounded-xl border p-2 bg-slate-50 dark:bg-slate-900 w-fit">
                        <img
                          src={primaryImagePreview}
                          alt="Product preview"
                          className="h-12 w-12 rounded-lg border object-cover bg-white"
                        />
                        <div className="text-xs pr-1">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">تم اختيار صورة المنتج</p>
                          <button
                            type="button"
                            onClick={() => setPrimaryImageAndDraft(null)}
                            className="text-red-500 hover:underline mt-0.5"
                          >
                            إزالة الصورة
                          </button>
                        </div>
                      </div>
                    )}
                  </Field>

                  <Field label="نص إضافي قصير" hint="نص يظهر في زاوية أو هامش التصميم">
                    <Input
                      dir="auto"
                      placeholder="متوفر الآن بألوان متعددة"
                      value={form.bodyText}
                      onChange={(e) => update("bodyText", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Panels */}
            <div className="space-y-4">
              
              {/* Section 1: Brand & Identity */}
              <CollapsibleSection
                title="الهوية البصرية وألوان العلامة"
                icon={Info}
                isOpen={openSections.branding}
                onToggle={() => toggleSection("branding")}
              >
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        {brandKitLoading ? (
                          <Loader2 className="size-3.5 animate-spin text-sky-500" />
                        ) : isBrandKitLoaded ? (
                          <span className="flex size-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="flex size-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        )}
                        <span>
                          {brandKitLoading
                            ? "جاري تحميل هوية العلامة..."
                            : isBrandKitLoaded
                            ? "تم استيراد ألوان وهوية العلامة التجارية تلقائياً."
                            : "لم يتم العثور على هوية علامة محفوظة."}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="brand-kit-auto"
                          checked={form.brandKitAutoApply}
                          onCheckedChange={(v) => update("brandKitAutoApply", v)}
                          disabled={!isBrandKitLoaded || brandKitLoading}
                        />
                        <Label htmlFor="brand-kit-auto" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                          تطبيق تلقائي
                        </Label>
                      </div>
                    </div>
                    {isBrandKitLoaded && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {brandIdentity.brandName && <span>العلامة: {brandIdentity.brandName}</span>}
                        {brandIdentity.primaryColor && (
                          <span className="flex items-center gap-1">
                            ألوان:
                            <span className="inline-flex gap-0.5">
                              {brandIdentity.primaryColor !== "#000000" && (
                                <span className="size-3 rounded-full border" style={{ backgroundColor: brandIdentity.primaryColor }} />
                              )}
                              {brandIdentity.secondaryColor !== "#ffffff" && (
                                <span className="size-3 rounded-full border" style={{ backgroundColor: brandIdentity.secondaryColor }} />
                              )}
                              {brandIdentity.accentColor !== "#ff0000" && (
                                <span className="size-3 rounded-full border" style={{ backgroundColor: brandIdentity.accentColor }} />
                              )}
                            </span>
                          </span>
                        )}
                        {brandIdentity.headingFont && brandIdentity.headingFont !== "Cairo" && <span>الخط: {brandIdentity.headingFont}</span>}
                      </div>
                    )}
                  </div>

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
                    <Field label="الخط المستهدف">
                      <Select value={form.headingFont} onValueChange={selectValue("headingFont")}>
                        <SelectTrigger className="rounded-xl">
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

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Label className="mb-2 block text-xs font-semibold text-slate-500">لوحة ألوان الهوية</Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="اللون الأساسي">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.primaryColor}
                            onChange={(e) => update("primaryColor", e.target.value)}
                            className="size-9 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                          />
                          <Input
                            value={form.primaryColor}
                            onChange={(e) => update("primaryColor", e.target.value)}
                            className={`flex-1 font-mono text-xs ${inputCls} h-9`}
                          />
                        </div>
                      </Field>
                      <Field label="اللون الثانوي">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.secondaryColor}
                            onChange={(e) => update("secondaryColor", e.target.value)}
                            className="size-9 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                          />
                          <Input
                            value={form.secondaryColor}
                            onChange={(e) => update("secondaryColor", e.target.value)}
                            className={`flex-1 font-mono text-xs ${inputCls} h-9`}
                          />
                        </div>
                      </Field>
                      <Field label="لون الإشارة / التوهج">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.accentColor}
                            onChange={(e) => update("accentColor", e.target.value)}
                            className="size-9 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                          />
                          <Input
                            value={form.accentColor}
                            onChange={(e) => update("accentColor", e.target.value)}
                            className={`flex-1 font-mono text-xs ${inputCls} h-9`}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Section 2: Layout & Aesthetics */}
              <CollapsibleSection
                title="تنسيق ومقاس الإعلان"
                icon={Grid3X3}
                isOpen={openSections.layout}
                onToggle={() => toggleSection("layout")}
              >
                <div className="space-y-4 pt-1">
                  {/* Platform selection */}
                  <div>
                    <Label className="mb-2 block text-xs font-semibold text-slate-500">المنصة الإعلانية المستهدفة</Label>
                    <div className="flex flex-wrap gap-2">
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
                          className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                            form.platform === p.value
                              ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-400"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="نسبة أبعاد الصورة">
                      <Select value={form.aspectRatio} onValueChange={selectValue("aspectRatio")}>
                        <SelectTrigger className="rounded-xl">
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

                    <Field label="توزيع العناصر (Layout)">
                      <Select value={form.layout} onValueChange={selectValue("layout")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="اختر التوزيع الافتراضي" />
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
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="المود / الجو العام">
                      <Select value={form.mood} onValueChange={selectValue("mood")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="اختر المود البصري" />
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
                    <Field label="ثيم التصميم">
                      <Select value={form.theme} onValueChange={selectValue("theme")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="اختر الثيم الفني" />
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
                    <Field label="دعوة للإجراء (CTA)">
                      <Select value={form.cta} onValueChange={selectValue("cta")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="زر الإجراء" />
                        </SelectTrigger>
                        <SelectContent>
                          {vc.ctaOptions.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {form.cta === "custom" && (
                    <Field label="نص الزر المخصص">
                      <Input
                        dir="auto"
                        placeholder="مثال: خصم خاص لك"
                        value={form.customCta}
                        onChange={(e) => update("customCta", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="مكان تموضع النصوص">
                      <Select value={form.textPosition} onValueChange={selectValue("textPosition")}>
                        <SelectTrigger className="rounded-xl">
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
                    <Field label="محاذاة النصوص">
                      <Select value={form.textAlignment} onValueChange={selectValue("textAlignment")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">يمين</SelectItem>
                          <SelectItem value="center">منتصف</SelectItem>
                          <SelectItem value="left">يسار</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Field label="نمط الزوايا">
                      <Select value={form.borderRadius} onValueChange={selectValue("borderRadius")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">حادة (لا توجد زوايا)</SelectItem>
                          <SelectItem value="subtle">ناعمة قليلاً (Subtle)</SelectItem>
                          <SelectItem value="rounded">دائرية مريحة (Rounded)</SelectItem>
                          <SelectItem value="pill">بيضاوي كامل (Pill)</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="نمط الظل البصري">
                      <Select value={form.shadow} onValueChange={selectValue("shadow")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون ظل (Flat)</SelectItem>
                          <SelectItem value="soft">ظل ناعم وخفيف</SelectItem>
                          <SelectItem value="medium">ظل متوسط</SelectItem>
                          <SelectItem value="hard">ظل حاد وبارز</SelectItem>
                          <SelectItem value="glow">ظل متوهج مضيء</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Section 3: Campaign details */}
              <CollapsibleSection
                title="تفاصيل الحملة والتسويق"
                icon={Sparkles}
                isOpen={openSections.campaign}
                onToggle={() => toggleSection("campaign")}
              >
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="الهدف الإعلاني للمنشور">
                      <Select value={form.purpose} onValueChange={selectValue("purpose")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="اختر الهدف التسويقي" />
                        </SelectTrigger>
                        <SelectContent>
                          {vc.purposeOptions.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="اسم الحملة التسويقية">
                      <Input
                        dir="auto"
                        placeholder="مثال: حملة تخفيضات صيف 2026"
                        value={form.campaignName}
                        onChange={(e) => update("campaignName", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="عنصر الاستعجال الزمني">
                      <Select value={form.urgency} onValueChange={selectValue("urgency")}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="نوع الاستعجال" />
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
                    <Field label="رابط الاستهداف (URL)">
                      <Input
                        dir="ltr"
                        placeholder="https://example.com/promo"
                        value={form.url}
                        onChange={(e) => update("url", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field label="الهاشتاجات المفضلة" hint="افصل بينها بفاصلة (,). ستظهر أسفل التصميم إن وجد متسع">
                    <Input
                      dir="auto"
                      placeholder="موضة_شتاء, خصم_مميز, متجرنا"
                      value={form.hashtags}
                      onChange={(e) => update("hashtags", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </CollapsibleSection>

              {/* Section 4: Advanced specifications */}
              <CollapsibleSection
                title="خيارات التوليد الفنية والتجنب"
                icon={Wand2}
                isOpen={openSections.output}
                onToggle={() => toggleSection("output")}
              >
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                    <div>
                      <Label className="mb-2 block text-xs font-semibold text-slate-500">صيغة الصورة</Label>
                      <Select
                        value={form.format}
                        onValueChange={(v) => {
                          if (v === null) return;
                          update("format", v);
                          if (v !== "png") update("transparentBg", false);
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpg">JPG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:px-3">
                      <Label className="mb-2 block text-xs font-semibold text-slate-500">
                        جودة الضغط: {form.quality}%
                      </Label>
                      <input
                        type="range"
                        min={60}
                        max={100}
                        value={form.quality}
                        onChange={(e) => update("quality", Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 pb-2">
                      <Switch
                        checked={form.transparentBg}
                        onCheckedChange={(v) => update("transparentBg", v)}
                        disabled={form.format !== "png"}
                        id="transparent-switch"
                      />
                      <Label htmlFor="transparent-switch" className="text-xs font-semibold text-slate-600 cursor-pointer">
                        خلفية شفافة (PNG فقط)
                      </Label>
                    </div>
                  </div>

                  <Field label="أشياء يفضل تجنبها بالرسم (Negative Prompt)" hint="مثال: نصوص إنجليزية عشوائية، أشخاص مشوشين، إلخ.">
                    <Textarea
                      dir="auto"
                      placeholder="كتابة نصوص غير مفهومة، أيدي مشوهة، خلفية فوضوية..."
                      value={form.avoidPrompt}
                      onChange={(e) => update("avoidPrompt", e.target.value)}
                      rows={2}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="صورة مرجعية للستايل (Style Reference)" hint="اختياري — ارفع صورة فنية ليحاكي الذكاء الاصطناعي ألوانها وتكوينها">
                    {!referenceImagePreview ? (
                      <div className="relative flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 p-3 dark:bg-slate-900/50">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setReferenceImageAndDraft(e.target.files?.[0] || null)}
                          className="opacity-0 absolute inset-0 cursor-pointer h-full w-full z-10"
                        />
                        <div className="text-center pointer-events-none py-1">
                          <Sparkles className="mx-auto size-5 text-slate-400 mb-1" />
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">ارفع صورة ستايل مرجعية</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-center gap-3 rounded-xl border p-2 bg-slate-50 dark:bg-slate-900 w-fit">
                        <img
                          src={referenceImagePreview}
                          alt="Style reference preview"
                          className="h-12 w-12 rounded-lg border object-cover bg-white"
                        />
                        <div className="text-xs pr-1">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">تم اختيار الصورة المرجعية</p>
                          <button
                            type="button"
                            onClick={() => setReferenceImageAndDraft(null)}
                            className="text-red-500 hover:underline mt-0.5"
                          >
                            إزالة الصورة
                          </button>
                        </div>
                      </div>
                    )}
                  </Field>
                </div>
              </CollapsibleSection>

            </div>

          </div>

          {/* Left Column: Sticky Control Panel & Image Output (lg:col-span-5) */}
          <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6 self-start">
            
            {/* AI Control Panel (Glassmorphism & ambient shadows) */}
            <div className="rounded-2xl border border-sky-100/50 dark:border-sky-950/20 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] space-y-5">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Wand2 className="size-4 text-sky-500" />
                  مربع التحكم الذكي
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">البرومبت المولد وإجراءات التوليد</p>
              </div>
              <div className="space-y-4">

                {/* Prompt Output View */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-500">نص البرومبت الموجه للذكاء الاصطناعي</Label>
                    <button
                      type="button"
                      onClick={() => setShowJson(!showJson)}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
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
                    className={`${inputCls} text-xs leading-relaxed focus-visible:ring-sky-500`}
                    placeholder="سيتم كتابة البرومبت ديناميكياً من الخيارات المدخلة..."
                  />
                  {showJson && (
                    <pre className="max-h-48 overflow-auto rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[10px] font-mono dark:border-slate-800 dark:bg-gray-950/75">
                      {JSON.stringify(buildPromptJson(), null, 2)}
                    </pre>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !canGenerate}
                    className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 py-5 shadow-md shadow-sky-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wand2 className="size-4" />
                    )}
                    {loading ? "جاري التوليد..." : "توليد الصورة"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading}
                    className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold gap-2 py-5"
                  >
                    <RotateCcw className="size-4" /> تصفير الحقول
                  </Button>
                </div>

                {usage && (
                  <div className="flex flex-wrap items-center justify-between rounded-xl border border-sky-100 bg-sky-50/20 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/20">
                    <span className="font-bold text-slate-700 dark:text-slate-300">استخدام الـ Token:</span>
                    <div className="flex gap-2 font-mono">
                      <span>prompt: {usage.prompt_tokens?.toLocaleString()}</span>
                      <span>completion: {usage.completion_tokens?.toLocaleString()}</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        الإجمالي: {usage.total_tokens?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Output Visualizer Panel */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">المعاينة وتفاصيل الإخراج</span>
                {imageUrl && !loading && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    جاهز للتحميل
                  </span>
                )}
              </div>
              <div id="ai-generated-result">
                
                {loading ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-100 bg-sky-50/5 dark:border-slate-800 dark:bg-slate-950/10 p-6 text-center animate-pulse">
                    <Loader2 className="size-10 animate-spin text-sky-500" />
                    <p className="mt-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300">جاري إطلاق الذكاء الاصطناعي لتوليد إعلانك...</p>
                    <p className="mt-1 text-xs text-slate-400">قد يستغرق ذلك ما بين 10 إلى 40 ثانية طبقاً للموديل</p>
                  </div>
                ) : imageUrl ? (
                  <div className="space-y-4">
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-gray-900 shadow-inner flex items-center justify-center p-2">
                      <img
                        src={imageUrl}
                        alt="AI generated social post"
                        className="max-h-[380px] w-full rounded-xl object-contain bg-white dark:bg-gray-900 shadow-sm transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                    </div>
                    
                    {/* Image Actions Toolbar */}
                    <div className="flex flex-wrap gap-2 justify-center border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl text-xs border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400"
                        onClick={generateCaption}
                        disabled={!canGenerate}
                      >
                        <MessageSquare className="size-3.5" /> كابشن
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" onClick={handleDownload}>
                        <Download className="size-3.5" /> تحميل
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" onClick={handleCopyUrl}>
                        <Copy className="size-3.5" /> نسخ الرابط
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" onClick={handleOpenTab}>
                        <ExternalLink className="size-3.5" /> فتح بتبويب جديد
                      </Button>
                      {lastParams && (
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs text-sky-600 dark:text-sky-400" onClick={handleRegenerate}>
                          <RefreshCw className="size-3.5" /> توليد مماثل
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => setImageUrl("")}
                      >
                        <Trash2 className="size-3.5" /> مسح المعاينة
                      </Button>
                      {generatedCaption && (
                        <div className="w-full mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                          {generatedCaption.headline && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                <Type className="size-3" /> العنوان المقترح
                              </div>
                              <div className="text-xs text-slate-800 dark:text-slate-200">{generatedCaption.headline}</div>
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                              <FileText className="size-3" /> الكابشن
                            </div>
                            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{generatedCaption.caption}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-500">CTA مقترح:</span>
                            <span className="text-xs font-medium text-sky-700 dark:text-sky-400">{generatedCaption.cta}</span>
                          </div>
                          {generatedCaption.hashtags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Hash className="size-3 text-slate-400" />
                              {generatedCaption.hashtags.map((h) => (
                                <Badge
                                  key={h}
                                  variant="secondary"
                                  className="cursor-pointer text-[10px] rounded-md"
                                  onClick={() => handleCopyCaption(h)}
                                  title="نسخ الهاشتاج"
                                >
                                  #{h}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-1.5 rounded-xl text-xs text-slate-500 hover:text-sky-600"
                            onClick={() => {
                              const text = [
                                generatedCaption.headline,
                                generatedCaption.caption,
                                generatedCaption.cta,
                                generatedCaption.hashtags.map((h) => `#${h}`).join(" "),
                              ].filter(Boolean).join("\n\n");
                              void handleCopyCaption(text);
                            }}
                          >
                            <Copy className="size-3.5" /> نسخ كل النصوص
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Live Dynamic Aspect Preview
                  <AspectPreview formData={form} platformLabel={platformLabel} />
                )}

              </div>
            </div>

          </div>

        </div>

        {/* Bottom Section: Full Width Created Images Gallery */}
        <div className="border-t border-slate-200/70 pt-8 dark:border-slate-800">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                <Grid3X3 className="size-5 text-sky-500" />
                معرض تصاميم السوشيال ميديا المُنشأة
                <Badge variant="secondary" className="rounded-full px-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {gallery.length} تصميم
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">تصفح تصاميمك السابقة وقارن بين المقاسات والبرومبتس المستعملة</p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 border"
              onClick={fetchGallery}
              disabled={galleryLoading}
            >
              <RefreshCw className={`size-3.5 ${galleryLoading ? "animate-spin" : ""}`} />
              تحديث المعرض
            </Button>
          </div>

          {/* Filters and search in gallery */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">منصة الفلترة:</span>
              <Select value={galleryFilter} onValueChange={(v) => setGalleryFilter(v || "all")}>
                <SelectTrigger className="h-8 w-36 text-xs rounded-xl bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (بدون فلتر)</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="ابحث بالبرومبت، المقاس، الهدف، التاريخ..."
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              className={`h-8 sm:w-80 ${inputCls} text-xs`}
            />
          </div>

          {/* Gallery Grid */}
          {filteredGallery.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/10 p-6 text-center text-slate-400">
              <ImageIcon className="mx-auto size-9 text-slate-300" />
              <p className="mt-2.5 text-sm font-medium">
                {gallerySearch || galleryFilter !== "all"
                  ? "لم نجد تصاميم مطابقة لبحثك"
                  : "لا توجد صور منشأة بعد. أول صور تنشئها ستظهر هنا."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredGallery.map((img) => {
                return (
                  <div
                    key={img.filename}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      
                      {/* Metas info badge overlay */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 opacity-90">
                        {img.platform && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 px-1.5 rounded-md font-semibold bg-white/90 text-slate-800 dark:bg-slate-950/90 dark:text-slate-200 shadow-sm">
                            {PLATFORMS.find((p) => p.value === img.platform)?.label || img.platform}
                          </Badge>
                        )}
                        {img.aspectRatio && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 px-1.5 rounded-md font-semibold bg-slate-950/70 text-white border-none shadow-sm">
                            {img.aspectRatio}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Meta/details container below image card */}
                    <div className="p-2.5 text-right space-y-1">
                      {img.purpose && (
                        <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400">
                          {VERTICAL_CONFIG[(img.vertical as Vertical) || "general"].purposeOptions.find(
                            (p) => p.value === img.purpose
                          )?.label ||
                            PURPOSES.find((p) => p.value === img.purpose)?.label ||
                            img.purpose}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground truncate leading-tight" title={img.prompt}>
                        {img.prompt || "تصميم بدون عنوان"}
                      </p>
                      <p className="text-[8px] text-slate-400/80 font-mono">
                        {formatDate(img.createdAt)}
                      </p>
                    </div>

                    {/* Action hover overlay grid */}
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-20">
                      <button
                        type="button"
                        className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/45 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        onClick={() => {
                          setImageUrl(img.url);
                          document.getElementById("ai-generated-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        aria-label="عرض"
                        title="عرض بالتفاصيل"
                      >
                        <ImageIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="فتح بتبويب جديد"
                        className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/45 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        onClick={() => window.open(img.url, "_blank")}
                        title="فتح في متصفح خارجي"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="استنساخ الخيارات"
                        className="rounded-lg bg-sky-500/70 p-2 text-white hover:bg-sky-500 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        onClick={() => handleApplySettings(img)}
                        title="نسخ الخيارات للنموذج"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="حذف الصورة"
                        className="rounded-lg bg-red-500/70 p-2 text-white hover:bg-red-500 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        onClick={() => setDeleteDialog({ open: true, url: img.url, filename: img.filename })}
                        title="حذف من المعرض"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog(open ? deleteDialog : { open: false, url: "", filename: "" })
        }
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <AlertCircle className="size-5 text-red-500" />
              حذف الصورة من المعرض
            </DialogTitle>
            <DialogDescription className="text-xs">
              هل أنت متأكد من رغبتك في حذف هذا التصميم نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl my-2">
            <img
              src={deleteDialog.url}
              alt=""
              className="max-h-40 rounded-lg object-contain bg-white dark:bg-gray-950"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <DialogFooter className="gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, url: "", filename: "" })}
              className="rounded-xl text-xs h-9"
            >
              إلغاء الأمر
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteImage(deleteDialog.filename)}
              className="rounded-xl text-xs h-9 font-bold"
            >
              نعم، احذفها
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIImageGenerator;
