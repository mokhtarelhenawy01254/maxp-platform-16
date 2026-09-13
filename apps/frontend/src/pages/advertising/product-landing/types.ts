import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Clock,
  Code,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Megaphone,
  ShoppingBag,
  Sliders,
  Star,
  Store,
  Type,
  Video,
} from "lucide-react";
import {
  LandingSection,
  ProductLandingProduct,
  ProductLandingSlice,
  ProductLandingStatus,
  SectionType,
} from "../../../services/productLandingPagesService";

export type {
  LandingSection,
  SectionType,
  ProductLandingStatus,
  ProductLandingProduct,
  ProductLandingSlice,
};

export interface EditorState {
  title: string;
  slug: string;
  status: ProductLandingStatus;
  designNotes: string;
  formConfig: {
    orderKicker: string;
    orderTitle: string;
    orderCopy: string;
    buttonLabel: string;
  };
  slices: ProductLandingSlice[];
  sections: LandingSection[];
}

export interface SidebarElementItem {
  type: SectionType;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  desc: string;
}

export interface SectionVariantOption {
  id: string;
  label: string;
  desc?: string;
}

export const SECTION_VARIANTS_MAP: Partial<Record<SectionType, SectionVariantOption[]>> = {
  REVIEWS: [
    { id: "CARDS", label: "كروت النجوم", desc: "تقييمات كلاسيكية فاخرة" },
    { id: "WHATSAPP", label: "محادثات واتساب", desc: "محادثات واقعية لرفع الثقة" },
  ],
  COMPARISON: [
    { id: "TABLE", label: "جدول مصفوفة", desc: "مقارنة كاملة الأصلي vs المقلد" },
    { id: "DUAL_CARDS", label: "كارتين متجاورين", desc: "منتجنا vs بدائل السوق جنب إلى جنب" },
  ],
  BREAKDOWN: [
    { id: "BENTO", label: "شبكة بينتو", desc: "4 كروت متناسقة لتشريح المنتج" },
    { id: "CHECKLIST", label: "قائمة فحص الجودة", desc: "مؤشرات فنية دقيقة بنقاط التحقق" },
  ],
  FEATURES: [
    { id: "BENTO", label: "شبكة الثقة 2x2", desc: "معاينة، شحن، COD، استبدال" },
    { id: "OFFICIAL_SEAL", label: "شهادة الضمان والختم", desc: "وثيقة ضمان ذهبية رسمية" },
  ],
};

export const SIDEBAR_ITEMS: SidebarElementItem[] = [
  {
    type: "MEDIA",
    label: "الصور والميديا",
    icon: ImageIcon,
    iconBg: "#3B82F6",
    desc: "معرض صور المنتج والفيديوهات الرئيسية",
  },
  {
    type: "VIDEO_REEL",
    label: "فيديو رأسي / ريلز UGC",
    icon: Video,
    iconBg: "#8B5CF6",
    desc: "فيديو عمودي 9:16 يوثق المنتج على الطبيعة بحركة حقيقية",
  },
  {
    type: "BEFORE_AFTER",
    label: "سلايدر قبل وبعد التفاعلي",
    icon: Sliders,
    iconBg: "#0EA5E9",
    desc: "مقارنة بصرية حية بسلايدر سحب تفاعلي بين حالتين",
  },
  {
    type: "BREAKDOWN",
    label: "تشريح ومواصفات دقيقة",
    icon: Layers,
    iconBg: "#2563EB",
    desc: "كروت بصرية لمواصفات النعل والخامات والراحة",
  },
  {
    type: "COMPARISON",
    label: "جدول المقارنة الذكي",
    icon: CheckCircle,
    iconBg: "#059669",
    desc: "مقارنة مقنعة: منتجنا الأصلي vs المنتجات المقلدة",
  },
  {
    type: "TEXT",
    label: "نص ووصف",
    icon: Type,
    iconBg: "#4B5563",
    desc: "عناوين، وصف تسويقي، وتفاصيل المنتج",
  },
  {
    type: "GALLERY",
    label: "معرض صور على الطبيعة",
    icon: LayoutGrid,
    iconBg: "#7C3AED",
    desc: "لقطات للمنتج في الشارع ومن زوايا متعددة",
  },
  {
    type: "LIVE_PROOF",
    label: "إثبات اجتماعي وطلبات حية",
    icon: Flame,
    iconBg: "#EA580C",
    desc: "إشعارات الشراء الحديثة وشارات الأمان",
  },
  {
    type: "COUNTDOWN",
    label: "عداد تنازلي",
    icon: Clock,
    iconBg: "#22C55E",
    desc: "عداد التخفيضات وشريط نفاد المخزون",
  },
  {
    type: "FEATURES",
    label: "مميزات المتجر",
    icon: Store,
    iconBg: "#14B8A6",
    desc: "شارات الثقة: الشحن، المعاينة، والضمان",
  },
  {
    type: "FORM",
    label: "نموذج الشراء",
    icon: ShoppingBag,
    iconBg: "#10B981",
    desc: "فورم الدفع عند الاستلام COD السريع",
  },
  {
    type: "REVIEWS",
    label: "تقييمات مخصصة",
    icon: Star,
    iconBg: "#F59E0B",
    desc: "آراء وتقييمات العملاء بالنجوم والصور",
  },
  {
    type: "FAQ",
    label: "الأسئلة الشائعة",
    icon: HelpCircle,
    iconBg: "#8B5CF6",
    desc: "قائمة الأسئلة والإجابات الشائعة للعملاء",
  },
  {
    type: "BANNERS",
    label: "لافتات ترويجية",
    icon: Megaphone,
    iconBg: "#EC4899",
    desc: "بنرات الخصومات والتنبيهات الملونة",
  },
  {
    type: "HTML",
    label: "كود HTML مخصص",
    icon: Code,
    iconBg: "#EF4444",
    desc: "تضمين أكواد تتبع أو عناصر مخصصة",
  },
];

export const buildDefaultSectionsForProduct = (
  product?: ProductLandingProduct | null,
): LandingSection[] => {
  const prodName = product?.name || "المنتج الجديد";
  const prodPrice = product?.price ? `${Number(product.price).toLocaleString("ar-EG")} ج.م` : "سعر خاص";
  const mainImg = product?.mainImage || (Array.isArray(product?.images) ? product.images[0] : "");

  return [
    {
      id: "sec-media-1",
      type: "MEDIA",
      title: "الصور والميديا",
      enabled: true,
      content: {
        images: mainImg ? [mainImg] : [],
        mainImage: mainImg || "",
      },
    },
    {
      id: "sec-text-1",
      type: "TEXT",
      title: "نص ووصف المنتج",
      enabled: true,
      content: {
        heading: `${prodName} — جودة عالية وتصميم عصري`,
        subheading: "احصل على أفضل تجربة شراء مع شحن سريع وضمان شامل",
        bodyText: "تصميم أنيق وعملي يلبي احتياجاتك بدقة. مصنوع من خامات عالية الجودة لتدوم طويلاً، مع ضمان الرضا التام وسهولة الاستخدام.",
      },
    },
    {
      id: "sec-breakdown-1",
      type: "BREAKDOWN",
      variant: "BENTO",
      title: "تشريح ومواصفات المنتج الفاخرة",
      enabled: true,
      content: {
        breakdownTitle: `تشريح ومميزات تصنيع ${prodName}`,
        breakdownItems: [
          { title: "نعل طبي ماص للصدمات", desc: "مصنوع من مادة EVA المرنة لراحة الكعب والركبة طوال اليوم", icon: "👟", tag: "طبي 100%" },
          { title: "فرش هوائي مانع للتعرق", desc: "مسامات تهوية نشطة لمنع الروائح والحفاظ على انتعاش القدمين", icon: "💨", tag: "انتعاش دائم" },
          { title: "خياطة يدوية مدبلة", desc: "غرز متينة ومقاومة للتمزق والفك حتى مع المشاوير اليومية الشاقة", icon: "🧵", tag: "متانة فائقة" },
          { title: "خفة وزن استثنائية", desc: "وزن خفيف جداً يجعلك تشعر وكأنك تمشي بخفة بدون إجهاد", icon: "🪶", tag: "خفيف جداً" },
        ],
      },
    },
    {
      id: "sec-comparison-1",
      type: "COMPARISON",
      variant: "TABLE",
      title: "جدول المقارنة الذكي",
      enabled: true,
      content: {
        comparisonTitle: `لماذا تختار ${prodName} بدلاً من البدائل العادية في السوق؟`,
        comparisonUsLabel: `${prodName} الأصلي`,
        comparisonThemLabel: "المنتجات المقلدة في السوق",
        comparisonItems: [
          { feature: "جودة الخامات", us: "خامات نخب أول متينة ومقاومة للاهتراء", them: "خامات بلاستيكية رديئة تتشقق سريعاً" },
          { feature: "راحة المشي والاستخدام", us: "تصميم مريح يوزع ثقل الجسم بدون إجهاد", them: "نعل ناشف يسبب آلام القدم والظهر" },
          { feature: "حق الفحص والمعاينة", us: "افتح الشحنة وافحص براحتك قبل دفع قرش", them: "ممنوع فتح الشحنة إلا بعد الدفع" },
          { feature: "الضمان والاسترجاع", us: "ضمان استبدال واسترجاع سهل خلال 14 يوماً", them: "لا يوجد أي ضمان بعد استلام الشحنة" },
        ],
      },
    },
    {
      id: "sec-liveproof-1",
      type: "LIVE_PROOF",
      title: "إثبات اجتماعي وطلبات حية",
      enabled: true,
      content: {
        satisfactionRate: "4.9 / 5 (أكثر من 1,420 تقييم)",
        recentOrders: [
          { buyer: "أميرة م.", city: "مدينة نصر، القاهرة", timeAgo: "منذ 4 دقائق", item: prodName },
          { buyer: "محمود ع.", city: "سموحة، الإسكندرية", timeAgo: "منذ 11 دقيقة", item: `${prodName} (باقة قطعتين)` },
          { buyer: "نورهان س.", city: "المنصورة، الدقهلية", timeAgo: "منذ 19 دقيقة", item: prodName },
        ],
      },
    },
    {
      id: "sec-countdown-1",
      type: "COUNTDOWN",
      title: "عداد تنازلي ونفاد الكمية",
      enabled: true,
      content: {
        timerEndsMinutes: 45,
        lowStockCount: 14,
      },
    },
    {
      id: "sec-features-1",
      type: "FEATURES",
      variant: "BENTO",
      title: "مميزات المتجر",
      enabled: true,
      content: {
        features: [
          { title: "شحن سريع لكافة المحافظات", desc: "وصول خلال 24 إلى 48 ساعة فقط", icon: "🚚" },
          { title: "معاينة قبل الدفع", desc: "افحص وتأكد من المنتج قبل دفع الكاش", icon: "✅" },
          { title: "دفع عند الاستلام COD", desc: "بدون أي دفع مسبق أو بطاقات ائتمان", icon: "💵" },
          { title: "ضمان استبدال 14 يوم", desc: "حق الاستبدال والإرجاع بسهولة", icon: "🔁" },
        ],
      },
    },
    {
      id: "sec-form-1",
      type: "FORM",
      title: "نموذج الشراء والدفع عند الاستلام",
      enabled: true,
      content: {
        orderKicker: "نموذج الطلب المباشر",
        orderTitle: `اطلب ${prodName} الآن بسعر ${prodPrice}`,
        orderCopy: "املأ بيانات التوصيل وسيتم التواصل معك هاتفياً لتأكيد الشحن فوراً.",
        buttonLabel: "تأكيد الطلب الآن — دفع عند الاستلام 🚚",
      },
    },
    {
      id: "sec-reviews-1",
      type: "REVIEWS",
      variant: "WHATSAPP",
      title: "تقييمات مخصصة",
      enabled: true,
      content: {
        reviews: [
          { name: "أحمد إبراهيم", text: "المنتج ممتاز جداً والتوصيل كان سريع في يومين والمعاينة تمت قبل الدفع.", rating: 5 },
          { name: "سارة محمود", text: "الجودة فاقت توقعاتي وخدمة العملاء متعاونين جداً. أنصح به بشدة!", rating: 5 },
          { name: "محمود حسن", text: "تجربة شراء محترمة ومطابق تماماً للصور والمواصفات المعروضة.", rating: 5 },
        ],
      },
    },
    {
      id: "sec-faq-1",
      type: "FAQ",
      title: "الأسئلة الشائعة",
      enabled: true,
      content: {
        faqs: [
          { question: "هل يمكنني معاينة المنتج قبل الدفع؟", answer: "نعم بالتأكيد! مندوب الشحن ينتظرك لفتح الشحنة ومعاينتها والتأكد منها قبل الاستلام." },
          { question: "كم يستغرق وقت التوصيل؟", answer: "التوصيل يستغرق من 24 إلى 48 ساعة لجميع محافظات مصر." },
          { question: "ما هي سياسة الاستبدال والاسترجاع؟", answer: "لديك 14 يوماً من تاريخ الاستلام لاستبدال أو إرجاع المنتج بسهولة." },
        ],
      },
    },
  ];
};

export const DEFAULT_EDITOR: EditorState = {
  title: "",
  slug: "",
  status: "DRAFT",
  designNotes: "",
  formConfig: {
    orderKicker: "نموذج الطلب",
    orderTitle: "اطلب المنتج الآن",
    orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
    buttonLabel: "تأكيد الطلب الآن",
  },
  slices: [],
  sections: [],
};

export const getProductImage = (product?: ProductLandingProduct | null): string => {
  if (!product) return "";
  if (product.mainImage) return product.mainImage;

  if (Array.isArray(product.images)) {
    return typeof product.images[0] === "string" ? product.images[0] : "";
  }

  if (typeof product.images === "string") {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
    } catch {
      return product.images;
    }
  }

  return "";
};

export const formatMoney = (value?: number | string | null): string => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString("ar-EG")} ج.م`
    : "غير محدد";
};
