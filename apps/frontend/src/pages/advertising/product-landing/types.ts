import React from "react";
import {
  Clock,
  Code,
  HelpCircle,
  Image as ImageIcon,
  Megaphone,
  ShoppingBag,
  Star,
  Store,
  Type,
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
  icon: React.ReactNode;
  iconBg: string;
  desc: string;
}

export const SIDEBAR_ITEMS: SidebarElementItem[] = [
  {
    type: "MEDIA",
    label: "الصور والميديا",
    icon: React.createElement(ImageIcon, { size: 20 }),
    iconBg: "#3B82F6",
    desc: "معرض صور المنتج والفيديوهات الرئيسية",
  },
  {
    type: "TEXT",
    label: "نص ووصف",
    icon: React.createElement(Type, { size: 20 }),
    iconBg: "#4B5563",
    desc: "عناوين، وصف تسويقي، وتفاصيل المنتج",
  },
  {
    type: "COUNTDOWN",
    label: "عداد تنازلي",
    icon: React.createElement(Clock, { size: 20 }),
    iconBg: "#22C55E",
    desc: "عداد التخفيضات وشريط نفاد المخزون",
  },
  {
    type: "FEATURES",
    label: "مميزات المتجر",
    icon: React.createElement(Store, { size: 20 }),
    iconBg: "#14B8A6",
    desc: "شارات الثقة: الشحن، المعاينة، والضمان",
  },
  {
    type: "FORM",
    label: "نموذج الشراء",
    icon: React.createElement(ShoppingBag, { size: 20 }),
    iconBg: "#10B981",
    desc: "فورم الدفع عند الاستلام COD السريع",
  },
  {
    type: "REVIEWS",
    label: "تقييمات مخصصة",
    icon: React.createElement(Star, { size: 20 }),
    iconBg: "#F59E0B",
    desc: "آراء وتقييمات العملاء بالنجوم والصور",
  },
  {
    type: "FAQ",
    label: "الأسئلة الشائعة",
    icon: React.createElement(HelpCircle, { size: 20 }),
    iconBg: "#8B5CF6",
    desc: "قائمة الأسئلة والإجابات الشائعة للعملاء",
  },
  {
    type: "BANNERS",
    label: "لافتات ترويجية",
    icon: React.createElement(Megaphone, { size: 20 }),
    iconBg: "#EC4899",
    desc: "بنرات الخصومات والتنبيهات الملونة",
  },
  {
    type: "HTML",
    label: "كود HTML مخصص",
    icon: React.createElement(Code, { size: 20 }),
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
