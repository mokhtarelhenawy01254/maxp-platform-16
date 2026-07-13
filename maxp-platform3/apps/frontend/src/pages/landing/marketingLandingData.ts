export type LandingStatus = "live" | "upcoming";

export interface MarketingLandingMetric {
  label: string;
  value: string;
}

export interface MarketingLandingPillar {
  title: string;
  description: string;
  icon?: string; // e.g. emoji or icon name
}

export interface MarketingLandingTheme {
  accent: string;
  accentSoft: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface MarketingLandingSection {
  slug: string;
  navLabel: string;
  pageTitle: string;
  kicker: string;
  heroLead: string;
  audience: string;
  conversionGoal: string;
  status: LandingStatus;
  theme: MarketingLandingTheme;
  pains: { title: string; description: string }[];
  pillars: MarketingLandingPillar[];
  offers: string[];
  metrics: MarketingLandingMetric[];
  primaryCta: string;
  secondaryCta: string;
  demoCta: string;
  socialProof: { quote: string; author: string }[];
  guarantee: { title: string; description: string };
  useCases: { title: string; description: string }[];
}

// The new Premium Dark Theme Ultimate Lead Magnet configuration
export const marketingSections: MarketingLandingSection[] = [
  {
    slug: "premium-all-in-one",
    navLabel: "Max P Business OS",
    pageTitle: "أدر ERP و CRM و HR والأتمتة الذكية من مركز تحكم واحد",
    kicker: "Unified Business OS",
    heroLead:
      "منصة تشغيل موحّدة للشركات التي تريد إدارة المبيعات، خدمة العملاء، الموارد البشرية، وأتمتة القنوات الاجتماعية من لوحة تنفيذ واحدة موثوقة.",
    audience: "لكبرى المتاجر والشركات الطموحة",
    conversionGoal: "التسجيل والبدء",
    status: "live",
    theme: {
      accent: "#2F6BFF",
      accentSoft: "rgba(47, 107, 255, 0.15)",
      gradientFrom: "#071120",
      gradientTo: "#0C1B31",
    },
    pains: [
      {
        title: "أنظمة لا تتحدث مع بعضها",
        description:
          "الـ CRM في مكان، والطلبات في مكان آخر، والموظفون والموافقات بعيدون تمامًا عن مشهد التنفيذ اليومي.",
      },
      {
        title: "تكلفة تشغيل أعلى من اللازم",
        description:
          "كل أداة منفصلة تضيف اشتراكًا جديدًا، تدريبًا إضافيًا، وتأخيرًا في تسليم الخدمة أو متابعة العملاء.",
      },
      {
        title: "قرارات بطيئة وفرص ضائعة",
        description:
          "عند غياب الرؤية اللحظية، تضيع leads ساخنة، وتتأخر الموافقات، وتُدار المحادثات بدون سياق موحّد.",
      },
    ],
    pillars: [
      {
        title: "ERP & Operations",
        description:
          "إدارة الطلبات، المشتريات، المخازن، والتشغيل المالي من لوحة تنفيذ واضحة تربط البيانات بالقرارات.",
        icon: "🏢",
      },
      {
        title: "Unified CRM",
        description:
          "تتبّع دورة العميل بالكامل عبر WhatsApp و Messenger، مع pipelines ومهام وملاحظات فورية موحدة.",
        icon: "🎯",
      },
      {
        title: "تحكم كامل في التشغيل",
        description:
          "صلاحيات واضحة، قواعد تشغيل قابلة للضبط، وسجل قرارات يحافظ على سرعة الفريق وخصوصية البيانات.",
        icon: "⚙️",
      },
      {
        title: "Growth & Affiliate",
        description:
          "ابني جيشاً من المسوقين والشركاء.. أدر برنامج الأفليت الخاص بك، وزع العمولات، وتتبع الأداء آلياً.",
        icon: "🚀",
      },
      {
        title: "Financial Wallet",
        description:
          "استقلال مالي كامل.. محفظة داخلية لتسوية الحسابات، صرف العمولات، وإدارة التدفق النقدي بدقة متناهية.",
        icon: "💳",
      },
      {
        title: "HR & Logistics",
        description:
          "إدارة الحضور، الشفتات، المهام، ولوجستيات الشحن من نفس بيئة العمل لضمان انضباط التنفيذ.",
        icon: "👥",
      },
    ],
    useCases: [
      {
        title: "براندات التجارة العصرية",
        description:
          "للفِرق التي تحتاج متجراً ذكياً مرتبطاً بـ CRM وأتمتة واتساب لرفع معدل التحويل (CR) وقيمة الطلب (AOV).",
      },
      {
        title: "وكالات التسويق والأفليت",
        description:
          "للشركات التي تريد إدارة مئات المسوقين والشركاء مع تتبع دقيق للعمولات وتسويات مالية آلية.",
      },
      {
        title: "المؤسسات ذات التشغيل المعقد",
        description:
          "لمن يحتاج رؤية موحدة للمخازن، المشتريات، الموظفين، والمهام مع صلاحيات 'Sovereign' وسجل تدقيق متماسك.",
      },
    ],
    guarantee: {
      title: "ضمان السيادة التشغيلية",
      description:
        "نحن لا نوفر لك تطبيقاً، نحن نبني لك نظام تشغيل يمنحك السيطرة الكاملة على بياناتك، فريقك، وعملائك دون وسيط.",
    },
    offers: [
      "سيادة كاملة على قواعد التشغيل والصلاحيات لضمان خصوصية بياناتك",
      "نظام أفليت متكامل لإدارة المسوقين والشركاء وتوزيع العمولات آلياً",
      "محفظة مالية داخلية لتسوية الحسابات مع التجار والموردين والشركاء",
      "ربط Omnichannel موحد يجمع رسائل WhatsApp و Telegram و Facebook في شاشة واحدة",
    ],
    metrics: [
      { value: "4x", label: "سرعة الاستجابة" },
      { value: "100%", label: "دقة التسويات المالية" },
      { value: "24/7", label: "أتمتة العمليات" },
      { value: "ZERO", label: "تشتت البيانات" },
    ],
    primaryCta: "ابدأ تشغيل أعمالك بشكل أذكى",
    secondaryCta: "شاهد كيف تعمل المنصة",
    demoCta: "احجز عرضًا تنفيذيًا",
    socialProof: [
      {
        quote:
          "أخيرًا أصبح لدينا مشهد كامل للمبيعات والمحادثات والعمليات من شاشة واحدة، والقرار اليومي أصبح أسرع بكثير.",
        author: "مدير تشغيل شركة تجزئة",
      },
      {
        quote:
          "الربط بين CRM وأتمتة الواتساب خفّض الوقت الضائع بين الفرق وحسّن متابعة الـ leads بشكل واضح.",
        author: "رئيس فريق المبيعات",
      },
      {
        quote:
          "وجود HR والمهام والصلاحيات داخل نفس المنصة غيّر طريقة إدارة الفريق بالكامل ورفع الثقة في التنفيذ.",
        author: "مؤسس شركة خدمية",
      },
    ],
  },
];

export const findMarketingSection = (
  slug: string,
): MarketingLandingSection | undefined =>
  marketingSections.find((section) => section.slug === slug);
