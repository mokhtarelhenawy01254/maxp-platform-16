// بيانات «نسخة الملف» (merchant-dossier) ، tasteskill v2 · direction: One motif
// كل الأرقام الحقيقية من كود المنصة: كتالوج السوق (bundles/apps) + عرض أكتوبر المعتمد + إحصاء الإنتاج.
// أرقام الشاشات (بوليصة، مخزون، تحصيل) محتوى نموذجي للتصميم ومعلَّم عليه في التقرير.

import {
  BUNDLE_PRICE,
  INDIVIDUAL_TOTAL,
  CSB_FAMILIES,
  CSB_LINES,
  OFFICIAL_WHATSAPP_NUMBER,
  csbFmt,
} from "../complete-store/csbData";

export { BUNDLE_PRICE, INDIVIDUAL_TOTAL, CSB_FAMILIES, CSB_LINES, csbFmt };

export const MD_WHATSAPP = OFFICIAL_WHATSAPP_NUMBER;

export const mdWhatsApp = (message: string): string =>
  `https://wa.me/${MD_WHATSAPP}?text=${encodeURIComponent(message)}`;

/** إحصاء إنتاج حقيقي (psql ، 13 أكتوبر 2026). */
export const MD_FACTS = [
  { id: "stores", value: "101", caption: "متجر شغّال على المنصة دلوقتي" },
  { id: "orders", value: "2,775", caption: "أوردر اتعالج في آخر 30 يوم" },
  { id: "tools", value: "17", caption: "أداة في باقة واحدة" },
];

export interface MdStage {
  id: string;
  name: string;
  duration: string;
  clause: string;
  weight: number;
  tone: "accent" | "surface" | "field2" | "ink";
}

/** مدة كل مرحلة بالكلام ، الأوزان بتعبّر عن طول المرحلة الحقيقي. */
export const MD_STAGES: MdStage[] = [
  {
    id: "confirm",
    name: "التأكيد",
    duration: "دقايق",
    clause: "رسالة واتساب تأكد العنوان قبل ما الأوردر ياخد مصاريف شحن.",
    weight: 12,
    tone: "accent",
  },
  {
    id: "prepare",
    name: "التجهيز",
    duration: "ساعة",
    clause: "البوليصة تتصدر من نفس الشاشة وتتسلّم للمندوب.",
    weight: 18,
    tone: "field2",
  },
  {
    id: "deliver",
    name: "التسليم",
    duration: "يوم لـ3",
    clause: "التتبع جاي من شركة الشحن، والمصاريف متسجلة على الأوردر.",
    weight: 30,
    tone: "surface",
  },
  {
    id: "collect",
    name: "التحصيل",
    duration: "أيام",
    clause: "مبلغ الـCOD بيفضل منسوب للأوردر لحد ما يوصل الخزنة.",
    weight: 40,
    tone: "ink",
  },
];

export interface MdTile {
  id: string;
  name: string;
  line: string;
  span: "wide" | "tall" | "small";
  tone: "accent" | "surface" | "field2" | "ink";
}

/** لوح الشاشات المكبرة ، كل عنصر واجهة حقيقي من المنصة، مكبر 300–400%. */
export const MD_TILES: MdTile[] = [
  {
    id: "confirm",
    name: "تأكيد قبل الشحن",
    line: "الأوردر الوهمي بيتقفل قبل ما ياخد مصاريف.",
    span: "wide",
    tone: "surface",
  },
  {
    id: "waybill",
    name: "بوليصة بنقرة",
    line: "تصدر وتتسلّم للمندوب من نفس الشاشة.",
    span: "tall",
    tone: "ink",
  },
  {
    id: "stock",
    name: "مخزون بالمقاس",
    line: "تعرف الرصيد لكل مقاس قبل ما تبيع.",
    span: "small",
    tone: "accent",
  },
  {
    id: "reorder",
    name: "تنبيه إعادة الطلب",
    line: "تشوف اللي خلص قبل ما يخلص.",
    span: "small",
    tone: "field2",
  },
  {
    id: "returns",
    name: "سبب المرتجع",
    line: "تعرف الرجعة جاية من أنهي مقاس.",
    span: "wide",
    tone: "surface",
  },
  {
    id: "cod",
    name: "تحصيل اليوم",
    line: "الكاش اللي مع المناديب قدامك.",
    span: "small",
    tone: "ink",
  },
  {
    id: "profit",
    name: "صافي الأوردر",
    line: "الربح بعد الشحن والإعلان.",
    span: "small",
    tone: "accent",
  },
  {
    id: "campaign",
    name: "منسوب للحملة",
    line: "كل أوردر عارف جاي من أنهي إعلان.",
    span: "wide",
    tone: "field2",
  },
];

/** شاشات المنصة الحقيقية — مصوّرة من التطبيق ببيانات تجريبية (مفيش أي بيانات عملاء). */
export const MD_SCREENS = {
  orders: "/landing/merchant-dossier/screen-orders.webp",
  ordersMobile: "/landing/merchant-dossier/screen-orders-mobile.webp",
};

export interface MdPreview {
  id: string;
  kind: "screen" | "ui";
  src?: string;
  fragment?: string;
  alt?: string;
}

export const MD_PREVIEWS: MdPreview[] = [
  { id: "selling", kind: "screen", src: MD_SCREENS.orders, alt: "شاشة الطلبات في منصة MaxP" },
  { id: "conversations", kind: "screen", src: MD_SCREENS.ordersMobile, alt: "شاشة الطلبات على الموبايل" },
  { id: "logistics", kind: "ui", fragment: "waybill" },
  { id: "measurement", kind: "ui", fragment: "cod" },
];

export interface MdQuestion {
  topic: string;
  q: string;
  a: string;
}

export const MD_QUESTIONS: MdQuestion[] = [
  {
    topic: "البداية",
    q: "أدفع قبل ما أشوف حاجة؟",
    a: "لأ. المتجر المجاني بـ0 ج.م وإدارة الأوردر بـ1 ج.م للأوردر. الباقة الكاملة بـ999 ج.م في الشهر تجي لما تحتاج الأدوات الـ17 كلهم شغالين مع بعض.",
  },
  {
    topic: "الواتساب",
    q: "الرسائل على واتساب بتتكلفني كام؟",
    a: "الأداة نفسها جوه الباقة. ميتا بتحاسب على رسائل القوالب حسب استهلاكك، وبتتدفع لحسابك عند ميتا مباشرة ، والردود داخل نافذة الـ24 ساعة ليها حصصها المجانية.",
  },
  {
    topic: "الشحن",
    q: "بوليصة الشحن بتطلع من فين؟",
    a: "بتربط حسابك مع شركة الشحن (بوسطة أو Turbo أو QP Express أو مناديبك)، والبوليصة تتصدر من شاشة الأوردر نفسها، وتكلفة الشحن تتسجّل على الأوردر فتبان في حساب الربح.",
  },
  {
    topic: "البيانات",
    q: "بياناتي بتروح فين لو أوقفت؟",
    a: "البيانات ملكك: المنتجات والعملاء والأوردرات تفضل محفوظة وتقدر تصدّرها. وفيه أدوات استيراد تنقل شغلك من Excel أو من منصة تانية.",
  },
  {
    topic: "الإلغاء",
    q: "أقدر ألغي في أي وقت؟",
    a: "أيوه، من لوحة الاشتراكات ومن غير مكالمات ولا التزام سنوي. مفيش شروط جزائية.",
  },
  {
    topic: "نشاطي",
    q: "أنا مطعم/عيادة مش متجر أونلاين ، ينفع؟",
    a: "ينفع. في الكتالوج باقة للكافيه والمطعم، وباقة طبية للعيادات ومعامل الأسنان، وباقة موارد بشرية، وحزمة تحليل وتسعير مالي ، كل واحدة بمكوناتها وسعرها.",
  },
];

export const MD_PHOTOS = MD_SCREENS;

export const MD_BUNDLE_PRICE_TEXT = csbFmt(BUNDLE_PRICE);
export const MD_INDIVIDUAL_TOTAL_TEXT = csbFmt(INDIVIDUAL_TOTAL);
