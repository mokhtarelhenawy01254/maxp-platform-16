import { createPresetSections, STUDIO_PAGE_PRESETS } from "../StudioPagePresets";

export interface StudioPageTemplate {
  id: "about" | "contact" | "faq" | "article";
  name: string;
  description: string;
  icon: string;
  defaultSlug: string;
  pageType: "ABOUT_US" | "CONTACT_US" | "FAQ" | "CUSTOM";
  sectionsSummary: string[];
}

export const STUDIO_PAGE_TEMPLATES: StudioPageTemplate[] = [
  {
    id: "about",
    name: "عن المتجر",
    description: "واجهة تعريفية متكاملة بقصة المتجر ورؤيته ومميزاته الحصرية",
    icon: "🏢",
    defaultSlug: "about",
    pageType: "ABOUT_US",
    sectionsSummary: ["hero-banner", "info-content", "features-bar", "newsletter"],
  },
  {
    id: "contact",
    name: "تواصل معنا",
    description: "قنوات الاتصال المباشرة، خدمة العملاء والدعم الفني السريع",
    icon: "📞",
    defaultSlug: "contact",
    pageType: "CONTACT_US",
    sectionsSummary: ["hero-banner", "info-content", "features-bar", "newsletter"],
  },
  {
    id: "faq",
    name: "أسئلة شائعة",
    description: "إجابات شافية لأكثر الأسئلة تكراراً حول الشحن والطلب والضمان",
    icon: "❓",
    defaultSlug: "faq",
    pageType: "FAQ",
    sectionsSummary: ["hero-banner", "info-content", "features-bar", "newsletter"],
  },
  {
    id: "article",
    name: "مقال / مدونة",
    description: "محتوى تحريري غني ونصائح متخصصة لتعزيز ثقة عملائك",
    icon: "📝",
    defaultSlug: "article",
    pageType: "CUSTOM",
    sectionsSummary: ["hero-banner", "richtext", "features-bar", "newsletter"],
  },
];

export const createTemplateSections = (
  templateId: string,
  pageTitle: string
) => {
  // If it's one of the 10 presets in StudioPagePresets, generate from preset definitions
  const isPreset = STUDIO_PAGE_PRESETS.some((p) => p.id === templateId);
  if (isPreset) {
    const presetSections = createPresetSections(templateId, pageTitle);
    if (presetSections.length > 0) {
      return presetSections;
    }
  }

  const ts = Date.now();
  switch (templateId) {
    case "about":
      return [
        {
          type: "hero-banner",
          key: `hero-banner-${ts}-1`,
          settings: {
            title: pageTitle || "عن متجرنا",
            subtitle: "نحن هنا لنقدم لك تجربة تسوق استثنائية مع تشكيلات مختارة بعناية لأجود المنتجات.",
            ctaText: "تصفح الكتالوج",
            ctaLink: "/shop",
          },
        },
        {
          type: "info-content",
          key: `info-content-${ts}-2`,
          settings: {
            title: "قصتنا ورؤيتنا",
            body: "انطلقت رحلتنا من شغف تقديم منتجات عالية الجودة بأسعار تنافسية تلبي تطلعات عملائنا في كل مكان. نلتزم بأعلى معايير الإتقان والمصداقية.",
            badge: "من نحن",
          },
        },
        {
          type: "features-bar",
          key: `features-bar-${ts}-3`,
          settings: {
            title: "مميزات التسوق معنا",
          },
        },
        {
          type: "newsletter",
          key: `newsletter-${ts}-4`,
          settings: {
            title: "انضم إلى عائلة متجرنا",
            subtitle: "اشترك معنا لتصلك أحدث العروض الحصرية والقصص الملهمة فور صدورها.",
            buttonText: "اشترك الآن",
          },
        },
      ];

    case "contact":
      return [
        {
          type: "hero-banner",
          key: `hero-banner-${ts}-1`,
          settings: {
            title: pageTitle || "تواصل معنا",
            subtitle: "فريق خدمة العملاء متواجد دائماً لمساعدتك والإجابة عن أي استفسار بكل رحابة صدر.",
            ctaText: "تصفح المنتجات",
            ctaLink: "/shop",
          },
        },
        {
          type: "info-content",
          key: `info-content-${ts}-2`,
          settings: {
            title: "قنوات الاتصال المباشرة",
            body: "يسعدنا استقبال استفساراتكم عبر الواتساب أو الهاتف أو مراسلتنا بالبريد الإلكتروني طوال أيام الأسبوع خلال ساعات العمل.",
            badge: "خدمة العملاء",
          },
        },
        {
          type: "features-bar",
          key: `features-bar-${ts}-3`,
          settings: {
            title: "دعم فني سريع وموثوق",
          },
        },
        {
          type: "newsletter",
          key: `newsletter-${ts}-4`,
          settings: {
            title: "ابق على تواصل دائم",
            subtitle: "اشترك لتصلك تحديثات أوقات العمل في المواسم والأعياد.",
            buttonText: "اشترك الآن",
          },
        },
      ];

    case "faq":
      return [
        {
          type: "hero-banner",
          key: `hero-banner-${ts}-1`,
          settings: {
            title: pageTitle || "الأسئلة الشائعة",
            subtitle: "إجابات شاملة ومباشرة على أكثر الأسئلة شيوعاً حول الطلب والشحن وطرق الدفع والضمان.",
            ctaText: "تصفح المتجر",
            ctaLink: "/shop",
          },
        },
        {
          type: "info-content",
          key: `info-content-${ts}-2`,
          settings: {
            title: "دليلك السريع لكل ما تحتاج معرفته",
            body: "كيف أقوم بتتبع طلبيتي؟ ما هي مدة التوصيل؟ هل الدفع عند الاستلام متاح؟ إجابات كل هذه التساؤلات تجدها مفصلة هنا.",
            badge: "إجابات فورية",
          },
        },
        {
          type: "features-bar",
          key: `features-bar-${ts}-3`,
          settings: {
            title: "تسوق بكل ثقة وراحة بال",
          },
        },
        {
          type: "newsletter",
          key: `newsletter-${ts}-4`,
          settings: {
            title: "لم تجد إجابة لسؤالك؟",
            subtitle: "فريقنا جاهز لمساعدتك في أي وقت، تواصل معنا مباشرة.",
            buttonText: "تواصل معنا",
          },
        },
      ];

    case "article":
      return [
        {
          type: "hero-banner",
          key: `hero-banner-${ts}-1`,
          settings: {
            title: pageTitle || "مقال مفيد",
            subtitle: "دليلك الشامل ونصائح خبرائنا لاختيار الأنسب لك بكل ثقة.",
            ctaText: "تسوق التشكيلة",
            ctaLink: "/shop",
          },
        },
        {
          type: "richtext",
          key: `richtext-${ts}-2`,
          settings: {
            title: "تفاصيل ونصائح المتخصصين",
            content: "أفضل الممارسات والنصائح التي تساعدك في اختيار المنتجات المناسبة والاستفادة القصوى من كل قطعة تقتنيها.",
          },
        },
        {
          type: "features-bar",
          key: `features-bar-${ts}-3`,
          settings: {
            title: "محتوى موثوق وجودة معتمدة",
          },
        },
        {
          type: "newsletter",
          key: `newsletter-${ts}-4`,
          settings: {
            title: "لا تفوت جديد المقالات",
            subtitle: "اشترك لتصلك النصائح والعروض الحصرية أسبوعياً.",
            buttonText: "اشترك الآن",
          },
        },
      ];

    default:
      return [];
  }
};
