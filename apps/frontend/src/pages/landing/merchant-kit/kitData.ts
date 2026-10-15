// أدوات مشتركة للصفحات الجديدة (merchant-kit)
// كل الأرقام من كود المنصة: كتالوج السوق + عرض أكتوبر المعتمد + إحصاء الإنتاج.
import {
  BUNDLE_PRICE,
  INDIVIDUAL_TOTAL,
  CSB_FAMILIES,
  CSB_LINES,
  OFFICIAL_WHATSAPP_NUMBER,
  csbFmt,
} from "../complete-store/csbData";

export { BUNDLE_PRICE, INDIVIDUAL_TOTAL, CSB_FAMILIES, CSB_LINES, csbFmt };

export const KIT_WHATSAPP = OFFICIAL_WHATSAPP_NUMBER;

export const kitWhatsApp = (message: string): string =>
  `https://wa.me/${KIT_WHATSAPP}?text=${encodeURIComponent(message)}`;

/** إحصاء إنتاج حقيقي (13 أكتوبر 2026). */
export const KIT_FACTS = [
  { value: "101", label: "متجر شغّال" },
  { value: "2,775", label: "أوردر / 30 يوم" },
  { value: "17", label: "أداة في باقة" },
];

export const KIT_STAGES = [
  { name: "التأكيد", duration: "دقايق", clause: "رسالة واتساب تأكد العنوان قبل الشحن.", weight: 12 },
  { name: "التجهيز", duration: "ساعة", clause: "البوليصة تتصدر وتتسلّم للمندوب.", weight: 18 },
  { name: "التسليم", duration: "يوم لـ3", clause: "التتبع جاي من شركة الشحن.", weight: 30 },
  { name: "التحصيل", duration: "أيام", clause: "الـCOD منسوب للأوردر لحد الخزنة.", weight: 40 },
];

export const KIT_SCREENS = {
  orders: "/landing/merchant-dossier/screen-orders.webp",
  ordersMobile: "/landing/merchant-dossier/screen-orders-mobile.webp",
  rows: "/landing/merchant-dossier/screen-orders-rows.webp",
  filters: "/landing/merchant-dossier/screen-orders-filters.webp",
};

export const KIT_TIERS = [
  {
    id: "free",
    name: "متجر مجاني",
    price: "0",
    unit: "ج.م",
    line: "متجر تستقبل فيه أوردرات + إدارة أوردر أساسية.",
  },
  {
    id: "core",
    name: "إدارة الأوردر",
    price: "1",
    unit: "ج.م / أوردر",
    line: "مسار حالات كامل للأوردر، ومنه تترقّى للباقة.",
  },
  {
    id: "bundle",
    name: "الباقة الكاملة",
    price: csbFmt(BUNDLE_PRICE),
    unit: "ج.م / شهر",
    line: `الـ17 أداة مع بعض (فرادى = ${csbFmt(INDIVIDUAL_TOTAL)} ج.م).`,
  },
];

export const KIT_QUESTIONS = [
  {
    q: "أدفع قبل ما أشوف حاجة؟",
    a: "لأ. المتجر المجاني بـ0 ج.م، وإدارة الأوردر بـ1 ج.م. الباقة بـ999 ج.م في الشهر لما تحتاج الأدوات الـ17 كلهم.",
  },
  {
    q: "عندي نظام شغّال بالفعل.",
    a: "بتعرف ربح الأوردر بالقرش، والمرتجع جاي من أنهي مقاس؟ لو لأ، ده الفرق.",
  },
  {
    q: "الرسائل على واتساب بتتكلفني كام؟",
    a: "الأداة جوه الباقة. ميتا بتحاسب على رسائل القوالب حسب استهلاكك مباشرة، والردود داخل نافذة الـ24 ساعة ليها حصصها المجانية.",
  },
  {
    q: "الشحن بيتحسب إزاي؟",
    a: "بتربط حسابك مع بوسطة أو Turbo أو QP Express أو مناديبك، والبوليصة تتصدر من شاشة الأوردر، وتكلفتها تتسجّل عليه.",
  },
  {
    q: "أقدر ألغي؟",
    a: "أي وقت من لوحة الاشتراكات، بدون التزام سنوي، وبياناتك تفضل ملكك وقابلة للتصدير.",
  },
  {
    q: "نشاطي مش متجر أونلاين.",
    a: "في الكتالوج باقات للمطاعم والكافيهات، والعيادات والمعامل، والموارد البشرية، وحزمة تحليل وتسعير مالي.",
  },
];

export const KIT_ORDERS = [
  { n: "ORD-501201", c: "منى سامي", t: 850, s: "مؤكد", city: "مدينة نصر", pay: "عند الاستلام" },
  { n: "ORD-501202", c: "أحمد فتحي", t: 1530, s: "تم الشحن", city: "المعادي", pay: "عند الاستلام" },
  { n: "ORD-501203", c: "سارة إبراهيم", t: 420, s: "قيد الانتظار", city: "الإسكندرية", pay: "مدفوع مقدمًا" },
  { n: "ORD-501204", c: "خالد منصور", t: 990, s: "تم التسليم", city: "طنطا", pay: "عند الاستلام" },
  { n: "ORD-501205", c: "هبة عادل", t: 640, s: "مرتجع", city: "أسيوط", pay: "عند الاستلام" },
  { n: "ORD-501206", c: "محمود رضا", t: 1250, s: "قيد التنفيذ", city: "الجيزة", pay: "عند الاستلام" },
  { n: "ORD-501207", c: "إيمان سعيد", t: 760, s: "تم الشحن", city: "المنصورة", pay: "عند الاستلام" },
];

export const KIT_STATUSES = ["كل الطلبات", "مؤكد", "تم الشحن", "مرتجع"];

/**
 * حساب فوري بأرقام المنصة الحقيقية ، مستخدم في سلايدر «الأرقام».
 * العمولة صفر، والوفر = فرق سعر الأدوات الفرادى عن الباقة.
 */
export const kitNumbers = (monthlyOrders: number) => {
  const delivered = Math.round(monthlyOrders * 0.87);
  const returned = Math.round(monthlyOrders * 0.11);
  const aov = 900;
  const cod = delivered * aov;
  const monthlySaving = INDIVIDUAL_TOTAL - BUNDLE_PRICE;
  return {
    delivered,
    returned,
    cod,
    saving: monthlySaving,
    savedYearly: monthlySaving * 12,
    costOfSplit: INDIVIDUAL_TOTAL,
  };
};
