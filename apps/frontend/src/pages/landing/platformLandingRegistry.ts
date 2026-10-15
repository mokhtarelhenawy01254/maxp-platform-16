export type PlatformLandingVariantId =
  | "enterprise-os"
  | "sales-flow"
  | "executive-atlas"
  | "business-os"
  | "merchant-daylight"
  | "merchant-dossier"
  | "merchant-performs"
  | "merchant-annual"
  | "merchant-poster";

export interface PlatformLandingVariantDefinition {
  id: PlatformLandingVariantId;
  label: string;
  badge: string;
  summary: string;
  audience: string;
  tone: string;
  accent: string;
  surface: string;
  focusPoints: string[];
}

export const DEFAULT_PLATFORM_LANDING_VARIANT_ID: PlatformLandingVariantId =
  "enterprise-os";

export const PLATFORM_LANDING_PREVIEW_BASE_PATH = "/preview/platform-home";

export const PLATFORM_LANDING_VARIANTS: PlatformLandingVariantDefinition[] = [
  {
    id: "enterprise-os",
    label: "Enterprise OS",
    badge: "الوضع التنفيذي الداكن",
    summary:
      "واجهة مؤسسية قوية تبرز التوحيد بين ERP وCRM وHR والأتمتة الذكية في مشهد واحد.",
    audience: "للمنصة الأساسية أمام الشركات الباحثة عن نظام موحّد شامل.",
    tone: "داكن، تنفيذي، غني بالإشارات المؤسسية.",
    accent: "#2F6BFF",
    surface: "#071120",
    focusPoints: [
      "Hero console حيّ",
      "نبرة مؤسسية",
      "CTA مباشرة للتسجيل",
    ],
  },
  {
    id: "sales-flow",
    label: "Sales Flow",
    badge: "نسخة تحويلية فاتحة",
    summary:
      "Landing أكثر مباشرة ووضوحًا، تربط بين الـ lead والطلب والمتابعة اليومية بخط بصري أسرع.",
    audience: "للزوار الذين يحتاجون فهمًا سريعًا لقيمة المنصة قبل الدخول في التفاصيل.",
    tone: "فاتح، سريع، يميل للـ conversion.",
    accent: "#f97316",
    surface: "#fff7ed",
    focusPoints: [
      "رسالة بيع أسرع",
      "أقسام أقل وأكثر حسمًا",
      "تأكيد فصل المنصة عن المتجر",
    ],
  },
  {
    id: "executive-atlas",
    label: "Executive Atlas",
    badge: "نسخة مجلس الإدارة",
    summary:
      "تصميم تحليلي أشبه بغرفة قرار يركّز على الحوكمة، القياس، وأثر التوحيد على القيادة.",
    audience: "للإدارات العليا والفرق التي تقيّم المنتج كقرار استراتيجي طويل الأمد.",
    tone: "تحليلي، رسمي، عالي الثقة.",
    accent: "#14b8a6",
    surface: "#0f172a",
    focusPoints: [
      "سرد قيادي",
      "Metrics أوضح",
      "إحساس boardroom / control room",
    ],
  },
  {
    id: "merchant-daylight",
    label: "نسخة التاجر — نهارية",
    badge: "نسخة نهارية تجارية",
    summary:
      "لاند فاتحة بمنطق معرض بيع لا كونسول هندسي: وعد واحد واضح، أرقام إنتاج حقيقية، أسعار من كتالوج المنصة، ودورة الأوردر كاملة في سطح واحد.",
    audience:
      "لتجّار مصر (متاجر أونلاين، مطاعم، عيادات، شركات) اللي بيقارنوا بين شراء 4-5 أدوات منفصلة ونظام واحد.",
    tone: "فاتح، تجاري، عالي الوضوح.",
    accent: "#2f6bff",
    surface: "#ffffff",
    focusPoints: [
      "أرقام إنتاج حقيقية فوق الطية",
      "باقات الكتالوج بأسعارها الفعلية",
      "دفتر قيمة يقارن الفردي بالباقة",
    ],
  },
  {
    id: "merchant-dossier",
    label: "نسخة الملف — الحس الفني",
    badge: "مبنية بـtasteskill v2",
    summary:
      "لاند اتحادت لها اتجاه فني من مكتبة الـskill (One motif: رزمة ملفات بألسنة) مع صور حقيقية من أرشيف مفتوح معتمدة على الصفحة، وحركة على مراحل، ومرور على بوابة فحص المتصفح.",
    audience:
      "لتجّار مصر (محل + أونلاين) اللي مربوطين بالدفع عند الاستلام — الصفحة بتبدأ من بوليصة الشحن وتنتهي بكاش في الخزنة.",
    tone: "حبر أخضر داكن على أرض فاتحة، وأصفر أكسنت واحد.",
    accent: "#f6e016",
    surface: "#f7f7f7",
    focusPoints: [
      "هيرو رزمة ملفات بألسنة",
      "الصور من عالم التاجر (أرشيف مفتوح)",
      "شاشة إنشاء المتجر مفتوحة فعلًا",
    ],
  },
  {
    id: "merchant-performs",
    label: "نسخة الشاشة الشغّالة",
    badge: "المنتج بيشتغل",
    summary:
      "Frost and slate: شاشة الطلبات نفسها شغّالة على الصفحة (فلترة، بحث، وفتح رسالة التأكيد)، وسلايدر بيحسب الأرقام بأسعار المنصة، ورقم واحد حي في الأسعار.",
    audience: "للتجّار اللي بيثقوا في الشاشة اللي بيشوفها شغّالة، لا في وصف مكتوب.",
    tone: "هادئ، تقني، بارد.",
    accent: "#0d7480",
    surface: "#f7f9fa",
    focusPoints: ["شريحة شغّالة في الهيرو", "حاسبة على أسعار حقيقية", "رقم حي في الأسعار"],
  },
  {
    id: "merchant-annual",
    label: "تقرير التاجر المطبوع",
    badge: "تحريري · كوبالت",
    summary:
      "محور رأسي ثابت على 42%: ماستهد بتلات قصّات، وعناوين بخط نسخ عربي مستضاف محليًا، وأعمدة واقفة على الحافة، وجدول أسعار حقيقي.",
    audience: "لمن يقرأ الأرقام قبل القرار، ويحب الواجهة المرتبة والمحددة.",
    tone: "تحريري، مطبوع، محدد.",
    accent: "#1f2de6",
    surface: "#eef0f3",
    focusPoints: [
      "محور رأسي ثابت",
      "خط نسخ عربي مستضاف",
      "جدول أسعار حقيقي",
    ],
  },
  {
    id: "merchant-poster",
    label: "بوستر الشارع",
    badge: "جريء · ألوان مليانة",
    summary:
      "أرض برتقالي مليانة، عنوان مدوّي بأقصى وزن خط متاح، وقصّة حقيقية مايلة تدخل على الكلام.",
    audience: "لمن يتوقف عند الصورة الكبيرة أولاً.",
    tone: "صاخب، مباشر، بلا لف.",
    accent: "#de194b",
    surface: "#ff8126",
    focusPoints: ["عنوان 12vw", "ألوان مليانة بدون تدرج", "رقم التواصل كعنوان"],
  },
  {
    id: "business-os",
    label: "نظام تشغيل الأعمال",
    badge: "نسخة القيادة الموحدة",
    summary:
      "Landing داكنة عالية الثقة تقدّم المنصة كنظام تشغيل أعمال موحّد يجمع المبيعات والعمليات والموارد البشرية والأتمتة في مركز قرار واحد.",
    audience:
      "للشركات التي تريد أن تفهم قيمة المنصة بسرعة كطبقة تشغيل كاملة، لا كأداة منفصلة أو متجر فقط.",
    tone: "داكن، واثق، تشغيلي تنفيذي.",
    accent: "#2f6bff",
    surface: "#091423",
    focusPoints: [
      "مركز قيادة موحّد",
      "سرد 5 محاور تشغيل",
      "مقارنة أثر وتكلفة واضحة",
    ],
  },
];

export const PLATFORM_LANDING_VARIANT_IDS = PLATFORM_LANDING_VARIANTS.map(
  (variant) => variant.id,
);

export const isPlatformLandingVariantId = (
  value: unknown,
): value is PlatformLandingVariantId =>
  typeof value === "string" &&
  PLATFORM_LANDING_VARIANT_IDS.includes(value as PlatformLandingVariantId);

export const getPlatformLandingVariant = (
  value?: string | null,
): PlatformLandingVariantDefinition =>
  PLATFORM_LANDING_VARIANTS.find((variant) => variant.id === value) ||
  PLATFORM_LANDING_VARIANTS[0];

export const getPlatformLandingPreviewPath = (
  variantId: PlatformLandingVariantId,
): string => `${PLATFORM_LANDING_PREVIEW_BASE_PATH}/${variantId}`;
