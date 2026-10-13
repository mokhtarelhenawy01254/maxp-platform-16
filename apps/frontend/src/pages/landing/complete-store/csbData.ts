// بيانات باقة المتجر الكاملة — الأسعار من كتالوج السوق الرسمي
// (/api/marketplace/bundles/store-complete-bundle — أكتوبر 2026)

export interface CsbLine {
  id: string;
  name: string;
  feature: string;
  price: number; // السعر الشهري المنفرد — 0 = شاملة داخل الأداة الأم
}

export interface CsbFamily {
  id: string;
  name: string;
  tagline: string;
  lineIds: string[];
}

export const BUNDLE_PRICE = 999;
export const INDIVIDUAL_TOTAL = 2936;
export const MONTHLY_SAVING = INDIVIDUAL_TOTAL - BUNDLE_PRICE; // 1,937
export const ANNUAL_SAVING = MONTHLY_SAVING * 12; // 23,244
export const DISCOUNT_PCT = 66;
export const PRICE_PER_DAY = Math.round(BUNDLE_PRICE / 30); // ≈33 ج.م/يوم

// أرقام المنصة الحقيقية — من إنتاج (psql) بتاريخ 2026-10-13
export const PLATFORM_STATS_DATE = "أرقام المنصة حتى 13 أكتوبر 2026";
export const PLATFORM_STATS = [
  { value: "101", label: "متجر شغال على MaxP" },
  { value: "2,775", label: "أوردر اتعالج في آخر 30 يوم" },
  { value: "17", label: "أداة في باقة واحدة" },
];

export const OFFICIAL_WHATSAPP_NUMBER = "201123087745";
export const WHATSAPP_CONSULT_URL = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "مرحباً، عايز أفاصيل باقة المتجر الكاملة (17 أداة بـ999 ج.م/شهر)"
)}`;

export const BUNDLE_SLUG = "store-complete-bundle";
export const LANDING_SLUG = "complete-store-bundle";
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export const CSB_LINES: CsbLine[] = [
  {
    id: "store",
    name: "المتجر",
    feature: "كتالوج وسلة وطلبات — واجهة بيع جاهزة من أول يوم.",
    price: 699,
  },
  {
    id: "order-workflow",
    name: "مسار الطلبات",
    feature: "حالات الأوردر بالترتيب اللي يناسب شغلك، من الاستلام للتسليم.",
    price: 149,
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business API",
    feature: "قناة واتساب رسمية باسم متجرك للتأكيد والمتابعة.",
    price: 350,
  },
  {
    id: "bot-automation",
    name: "أتمتة المحادثات",
    feature: "رد فوري بالكلمات المفتاحية على واتساب وفيسبوك.",
    price: 149,
  },
  {
    id: "bulk-orders",
    name: "الطلبات الجماعية",
    feature: "طباعة وتغيير حالة لمئات الأوردرات دفعة واحدة.",
    price: 99,
  },
  {
    id: "order-preparation-hold",
    name: "تجهيز الطلبات",
    feature: "متابعة النواقص والتوريد قبل الشحن.",
    price: 0,
  },
  {
    id: "order-shipping-turbo",
    name: "الشحن الذكي",
    feature: "إصدار بوليصة وتتبع مع Turbo وبوسطة وQP Express والمناديب.",
    price: 149,
  },
  {
    id: "inventory-pro",
    name: "المخزون والمستودعات",
    feature: "مستودعات متعددة، جرد دوري، ونقاط إعادة طلب.",
    price: 199,
  },
  {
    id: "returns-settings",
    name: "إعدادات المرتجعات",
    feature: "شروط وسياسات مراجعة واضحة للإرجاع والاستبدال.",
    price: 99,
  },
  {
    id: "returns-reasons-analytics",
    name: "أسباب المرتجعات",
    feature: "تعرف ليه العملاء بيرجّعوا — وبتصلّح السبب.",
    price: 99,
  },
  {
    id: "orders-analytics",
    name: "تحليلات الطلبات",
    feature: "الملغي والمدفوع مسبقًا والمقارنات الزمنية.",
    price: 99,
  },
  {
    id: "profit-analytics",
    name: "تحليلات الأرباح",
    feature: "صافي الربح والهامش بعد التكاليف والشحن.",
    price: 99,
  },
  {
    id: "campaign-attribution",
    name: "Campaign Attribution",
    feature: "كل أوردر مربوط بحملته وإعلانه وUTM بتاعه.",
    price: 149,
  },
  {
    id: "campaign-attribution-analytics",
    name: "بيانات الحملة",
    feature: "أي حملة بتجيب مبيعات فعلًا — بالأرقام.",
    price: 0,
  },
  {
    id: "facebook-ads-pro",
    name: "إعلانات فيسبوك وانستجرام",
    feature: "إدارة الحملات وتقارير الأداء من نفس اللوحة.",
    price: 199,
  },
  {
    id: "facebook-pages-connect",
    name: "ربط صفحات فيسبوك",
    feature: "صفحاتك ومحتواها متصلة بحسابك مباشرة.",
    price: 99,
  },
  {
    id: "unified-inbox",
    name: "Unified Inbox",
    feature: "رسائل كل المنصات في صندوق وارد واحد.",
    price: 299,
  },
];

// 17 بند = 15 مدفوعة + 2 إضافة شاملة ببلاش (تجهيز الطلبات + بيانات الحملة)
export const PAID_LINES_COUNT = CSB_LINES.filter((l) => l.price > 0).length; // 15
export const BONUS_LINES_COUNT = CSB_LINES.length - PAID_LINES_COUNT; // 2

export const CSB_FAMILIES: CsbFamily[] = [
  {
    id: "selling",
    name: "البيع والتشغيل",
    tagline: "من عرض المنتج لحد الأوردر المتجهز للشحن.",
    lineIds: ["store", "order-workflow", "bulk-orders", "order-preparation-hold"],
  },
  {
    id: "conversations",
    name: "المحادثات",
    tagline: "العميل بيكلمك في مكان واحد — والرد بيوصل بسرعة.",
    lineIds: ["unified-inbox", "whatsapp-business", "bot-automation"],
  },
  {
    id: "logistics",
    name: "الشحن والمخزون والمرتجعات",
    tagline: "اللي بعد التأكيد: بوليصة، تسليم، وإرجاع منظم.",
    lineIds: [
      "order-shipping-turbo",
      "inventory-pro",
      "returns-settings",
      "returns-reasons-analytics",
    ],
  },
  {
    id: "measurement",
    name: "القياس والإعلانات",
    tagline: "فلوس الإعلان رايحة فين؟ الأرقام بتجاوب.",
    lineIds: [
      "orders-analytics",
      "profit-analytics",
      "campaign-attribution",
      "campaign-attribution-analytics",
      "facebook-ads-pro",
      "facebook-pages-connect",
    ],
  },
];

export interface CsbJourneyStep {
  id: string;
  title: string;
  caption: string;
  tools: string;
}

export const CSB_JOURNEY: CsbJourneyStep[] = [
  {
    id: "message",
    title: "الرسالة توصل",
    caption: "ماسنجر وواتساب وإنستجرام في صندوق وارد واحد — من غير ما تدور على الشات.",
    tools: "Unified Inbox",
  },
  {
    id: "reply",
    title: "الرد بيرد لوحده",
    caption: "العميل يسأل عن السعر أو المقاس، الأتمتة ترد فورًا بالكلمات المفتاحية.",
    tools: "أتمتة المحادثات",
  },
  {
    id: "confirm",
    title: "التأكيد على واتساب",
    caption: "رسالة تأكيد بالعنوان والتليفون قبل التجهيز — الأوردرات الوهمية بتتقفل هنا.",
    tools: "WhatsApp Business API",
  },
  {
    id: "ship",
    title: "البوليصة تتصدر",
    caption: "إصدار بوليصة الشحن وتسليمها لشركة الشحن من غير ما تكتب ورقة.",
    tools: "الشحن الذكي — Turbo وبوسطة وQP",
  },
  {
    id: "collect",
    title: "التحصيل يترصّد",
    caption: "حالة كل شحنة ومتحصلاتها COD قدامك لحد ما الفلوس توصل حسابك.",
    tools: "الشحن الذكي + مسار الطلبات",
  },
  {
    id: "measure",
    title: "الرقم يوصل تقاريرك",
    caption: "الأوردر يظهر في صافي الربح ومربوط بالحملة اللي جابته.",
    tools: "تحليلات الأرباح + Campaign Attribution",
  },
];

export interface CsbCompareRow {
  before: string;
  after: string;
}

export const CSB_COMPARE: CsbCompareRow[] = [
  {
    before: "اشتراكات مشتتة على 4 و5 أدوات منفصلين",
    after: "اشتراك واحد بـ999 ج.م — كل حاجة داخله",
  },
  {
    before: "رسائل بتضيع بين الماسنجر والواتساب الشخصي",
    after: "صندوق وارد موحد بيرد ويأكد ويأرشف",
  },
  {
    before: "تأكيد كل أوردر بمكالمة تليفون",
    after: "تأكيد واتساب آلي بالعنوان والتليفون",
  },
  {
    before: "بوليصة شحن مكتوبة بإيد لكل شحنة",
    after: "إصدار بوليصة وتتبع بنقرة من الشحن الذكي",
  },
  {
    before: "جرد على شيت إكسل بيتأخر عن الواقع",
    after: "مخزون ومستودعات بيتحدثوا مع كل أوردر",
  },
  {
    before: "«الإعلانات جابت إيه؟» — سؤال من غير إجابة",
    after: "إسناد كل أوردر لحملته وإعلانه بالاسم",
  },
];

export interface CsbFaqItem {
  q: string;
  a: string;
}

export const CSB_FAQ: CsbFaqItem[] = [
  {
    q: "هل الباقة دي للملابس بس؟",
    a: "لأ. دي باقة المتجر الأونلاين بشكل عام — إلكترونيات، عناية، هوم، أحذية، إكسسوارات. لو محتاج كاشير فروع ومصفوفة مقاسات للمحلات الفعلية، فيه باقة تانية مخصصة للملابس والفروع.",
  },
  {
    q: "إيه اللي مش موجود في الباقة بصراحة؟",
    a: "الكاشير ونقاط البيع للفروع (POS)، وأدوات إدارة فريق المندوبين وهواتفهم. الباقة دي مركزة على المتجر الأونلاين ومسار الأوردر لحد التحليل. أي أداة زيادة بتتشترك فيها منفردة لو احتجتها.",
  },
  {
    q: "بتشتغل إزاي؟ أدفع وخلص؟",
    a: "بتشترك من الصفحة بكاشير Kashier الآمن، ولما الدفع يعدّي الـ17 أداة بتتفعل لحسابك فورًا وتبدأ تشتغل على طول. ومفيش تثبيت ولا شغل تقني محتاج منك.",
  },
  {
    q: "أقدر ألغي الاشتراك؟",
    a: "في أي وقت من لوحة الاشتراكات، من غير عقود ولا التزامات. لو ألغيت، بياناتك وطلباتك بتفضل محفوظة وتقدر تصدّرها.",
  },
  {
    q: "واتساب بيزنس فيه تكلفة رسائل من ميتا؟",
    a: "اشتراك الباقة بيغطي الأداة كاملة. ميتا نفسها بتحاسب على رسائل القوالب حسب استهلاكك وده بيتدفع لحسابك عند ميتا مباشرة — الرسائل Service والردود داخل نافذة 24 ساعة ضمن الحصص المجانية بتاعتها.",
  },
  {
    q: "أعمل إيه لو كنت بدفع أقل من 999 دلوقتي؟",
    a: "ساعتها الباقة مش ليك دلوقتي — ولحقك مع نظامين أو تلاتة لحد ما التكلفة المخفية (الوقت والأوردرات الضايعة) توصلها. سيب رقمك في الفورم تحت ونرشحلك اللي يبدأ بيه من غير ما تدفع حاجة مش محتاجها.",
  },
  {
    q: "منتجاتي وأوردراتي القديمة هتنقل إزاي؟",
    a: "في أدوات استيراد جاهزة جوه المنصة، وفريق الدعم بيمشي معاك في رفع المنتجات وتظبيط الإعدادات خطوة بخطوة — مفيش أي شغل تقني مطلوب منك.",
  },
  {
    q: "لو شغلت شهر وقررت أوقف؟",
    a: "بتلغي من لوحة الاشتراكات في أي وقت من غير مكالمات ولا إقناع — وطلباتك وبياناتك بتفضل محفوظة وتقدر تطلعها براحتك.",
  },
];

export const csbFmt = (n: number): string =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });
