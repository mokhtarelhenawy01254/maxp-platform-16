// لاند «نسخة التاجر — نهارية» (merchant-daylight)
// كل رقم وكل سعر هنا مصدره كود المنصة نفسه، مفيش أرقام تسويقية مخترعة:
// - كتالوج السوق: apps/backend/catalog/marketplace/apps.json + bundles.json
// - عرض باقة المتجر المعتمد: apps/frontend/src/pages/landing/complete-store/csbData.ts (أكتوبر 2026)
// - أرقام الإنتاج: PLATFORM_STATS من نفس الملف (psql — 13 أكتوبر 2026)

import {
  BUNDLE_PRICE,
  INDIVIDUAL_TOTAL,
  MONTHLY_SAVING,
  ANNUAL_SAVING,
  PRICE_PER_DAY,
  DISCOUNT_PCT,
  CSB_LINES,
  CSB_FAMILIES,
  CSB_JOURNEY,
  CSB_COMPARE,
  OFFICIAL_WHATSAPP_NUMBER,
  PLATFORM_STATS,
  PLATFORM_STATS_DATE,
  csbFmt,
} from "../complete-store/csbData";

export {
  BUNDLE_PRICE,
  INDIVIDUAL_TOTAL,
  MONTHLY_SAVING,
  ANNUAL_SAVING,
  PRICE_PER_DAY,
  DISCOUNT_PCT,
  CSB_LINES,
  CSB_FAMILIES,
  CSB_JOURNEY,
  CSB_COMPARE,
  PLATFORM_STATS,
  PLATFORM_STATS_DATE,
  csbFmt,
};

export const MDL_WHATSAPP_NUMBER = OFFICIAL_WHATSAPP_NUMBER;

/** رابط واتساب برسالة مكتوبة مسبقًا — مفيش أي تخزين على سيرفر. */
export const mdlWhatsAppLink = (message: string): string =>
  `https://wa.me/${MDL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export interface MdlSolution {
  id: string;
  name: string;
  audience: string;
  price: number;
  priceNote: string;
  apps: string[];
  source: string;
}

/**
 * الباقات الحقيقية من كتالوج السوق (bundles.json) — الاسم والسعر والأدوات كما هي في المنصة.
 * باقة المتجر الكاملة من عرض أكتوبر المعتمد (csbData).
 */
export const MDL_SOLUTIONS: MdlSolution[] = [
  {
    id: "store-complete",
    name: "باقة المتجر الكاملة",
    audience: "متجر أونلاين بتبيع على السوشيال والتأكيد على واتساب",
    price: BUNDLE_PRICE,
    priceNote: `${CSB_LINES.length} أداة — ولو اشتريتها فرادى ${csbFmt(INDIVIDUAL_TOTAL)} ج.م`,
    apps: [
      "المتجر",
      "مسار الطلبات",
      "WhatsApp Business API",
      "أتمتة المحادثات",
      "الشحن الذكي",
      "المخزون والمستودعات",
      "أسباب المرتجعات",
      "تحليلات الأرباح",
      "Unified Inbox",
    ],
    source: "عرض معتمد — أكتوبر 2026",
  },
  {
    id: "cafe-complete-bundle",
    name: "باقة الكافيه والمطعم المتكاملة",
    audience: "كافيه أو مطعم عنده صالة وتيك أواي ودليفري",
    price: 399,
    priceNote: "بدل 4 أدوات منفصلة بـ796 ج.م",
    apps: ["نظام الكافيهات والمطاعم", "المخزون والمستودعات الشامل", "المشتريات وإدارة الموردين", "نظام POS"],
    source: "كتالوج السوق",
  },
  {
    id: "medical-bundle",
    name: "الباقة الطبية الشاملة",
    audience: "عيادة أو مركز طبي أو معمل أسنان",
    price: 999,
    priceNote: "4 أدوات متصلة",
    apps: ["النظام الطبي", "Unified Inbox", "AI Chat", "نظام معمل الأسنان"],
    source: "كتالوج السوق",
  },
  {
    id: "facebook-complete-bundle",
    name: "باقة فيسبوك الشاملة",
    audience: "بتجيب الأوردرات من إعلانات فيسبوك وإنستجرام",
    price: 399,
    priceNote: "بدل 5 أدوات منفصلة بـ695 ج.م",
    apps: [
      "ربط صفحات فيسبوك",
      "إعلانات فيسبوك وانستجرام",
      "Pixel وتحليلات التحويل",
      "كتالوج ومتجر فيسبوك",
      "إنشاء منشور فيسبوك",
    ],
    source: "كتالوج السوق",
  },
  {
    id: "hr-complete-bundle",
    name: "باقة الموارد البشرية المتكاملة",
    audience: "شركة عندها موظفين وورديات ورواتب",
    price: 299,
    priceNote: "بدل 5 أدوات منفصلة بـ342 ج.م",
    apps: ["نظام HR الأساسي", "الحضور والانصراف والورديات", "مسير الرواتب والمستحقات", "نظام التوظيف", "إدارة العهد والأصول"],
    source: "كتالوج السوق",
  },
  {
    id: "financial-pricing-suite",
    name: "حزمة التحليل والتسعير المالي",
    audience: "بتسأل «المنتج ده بيكسبني كام فعلاً؟»",
    price: 249,
    priceNote: "12 حاسبة مالية متصلة",
    apps: [
      "القوائم المالية الشهرية",
      "حاسبة نقطة التعادل",
      "حاسبة القيمة الدائمة للعميل (CLV)",
      "محسّن الشحن",
      "مخطط ميزانية الإعلانات",
      "تحليل تأثير الخصم",
    ],
    source: "كتالوج السوق",
  },
];

export interface MdlTier {
  id: string;
  name: string;
  price: string;
  unit: string;
  headline: string;
  points: string[];
  ctaLabel: string;
  ctaTo: string;
  highlight: boolean;
}

/** المستويات الثلاثة من العرض المعتمد: 0 / 1 / 999. */
export const MDL_TIERS: MdlTier[] = [
  {
    id: "free",
    name: "متجر مجاني",
    price: "0",
    unit: "ج.م",
    headline: "تبدأ من غير مقدم ومن غير بطاقة بنكية.",
    points: [
      "متجر إلكتروني تعرض فيه منتجاتك وتستقبل أوردرات",
      "إدارة أوردر أساسية (Order Core)",
      "تشتغل من الموبايل في نفس الدقيقة",
    ],
    ctaLabel: "افتح متجرك مجانًا",
    ctaTo: "/register",
    highlight: false,
  },
  {
    id: "order-core",
    name: "إدارة الأوردر",
    price: "1",
    unit: "ج.م",
    headline: "كل أوردر بحالة واضحة — من الاستلام للتسليم.",
    points: [
      "مسار حالات للأوردر بدل المحادثات المتناثرة",
      "تسجيل المدفوع عند الاستلام (COD) والتحصيل",
      "تقدر تترقى للباقة الكاملة في أي وقت",
    ],
    ctaLabel: "ابدأ بإدارة الأوردر",
    ctaTo: "/register",
    highlight: false,
  },
  {
    id: "bundle",
    name: "باقة المتجر الكاملة",
    price: csbFmt(BUNDLE_PRICE),
    unit: "ج.م / شهر",
    headline: `${CSB_LINES.length} أداة بتشتغل مع بعض على نفس البيانات.`,
    points: [
      `الأدوات الـ${CSB_LINES.length} لو اشتريتها فرادى = ${csbFmt(INDIVIDUAL_TOTAL)} ج.م شهريًا`,
      `توفير ${csbFmt(MONTHLY_SAVING)} ج.م في الشهر — و${csbFmt(ANNUAL_SAVING)} ج.م في السنة`,
      "تجديد شهري — تلغي في أي وقت وبياناتك تفضل ملكك",
    ],
    ctaLabel: "ابدأ بالباقة",
    ctaTo: "/register",
    highlight: true,
  },
];

export interface MdlQuestion {
  q: string;
  a: string;
}

export const MDL_QUESTIONS: MdlQuestion[] = [
  {
    q: "أدفع قبل ما أشوف حاجة؟",
    a: "لأ. المتجر المجاني بتفتحه من غير مقدم ومن غير بطاقة بنكية، وإدارة الأوردر بـ1 ج.م. الباقة الكاملة بتيجي لما تحتاج الأدوات الـ17 كلها فعلًا.",
  },
  {
    q: "عندي نظام شغّال بالفعل — أستفيد إيه؟",
    a: "سؤال واحد يحدد: بتعرف ربح الأوردر بالقرش، وبتعرف المرتجع جاي من أنهي مقاس أو أنهي حملة؟ لو الجواب من نظامك دلوقتي — متغيّرش حاجة. لو لأ، فده بالظبط الفرق.",
  },
  {
    q: "واتساب بيزنس عليه تكلفة رسائل من ميتا؟",
    a: "الأداة نفسها جوه الباقة. ميتا بتحاسب على رسائل القوالب حسب استهلاكك وبتتدفع لحسابك عند ميتا مباشرة — والردود داخل نافذة الـ24 ساعة والرسائل الخدمية ليها حصصها المجانية.",
  },
  {
    q: "الشحن بيتحسب إزاي؟",
    a: "بتربط حسابك مع شركة الشحن (بوسطة وTurbo وQP Express أو مناديبك)، والبوليصة بتتصدر من نفس شاشة الأوردر. تكلفة الشحن بتتسجّل على الأوردر فتبان في حساب الربح.",
  },
  {
    q: "أقدر ألغي؟ وبياناتي تروح فين؟",
    a: "بتلغي في أي وقت من لوحة الاشتراكات من غير مكالمات ولا التزام سنوي. وبياناتك (منتجات، عملاء، أوردرات) تفضل محفوظة وتقدر تصدّرها.",
  },
  {
    q: "منتجاتي وعملائي انتقلوا إزاي؟",
    a: "في أدوات استيراد جوه المنصة (من Excel أو من منصة تانية)، وفريق الدعم بيمشي معاك في رفع المنتجات وتظبيط الإعدادات خطوة بخطوة — مفيش شغل تقني مطلوب منك.",
  },
  {
    q: "نشاطي مش تجارة أونلاين — ينفع؟",
    a: "ينفع. العيادات والمراكز الطبية ومعامل الأسنان والمطاعم والكافيهات وشركات الخدمات والشركات اللي عندها موظفين — كل واحدة ليها باقة بمكوناتها وسعرها في الكتالوج، مش نفس الباقة للكل.",
  },
];

export interface MdlBeforeAfterRow {
  before: string;
  after: string;
}

export { CSB_COMPARE as MDL_COMPARE };
