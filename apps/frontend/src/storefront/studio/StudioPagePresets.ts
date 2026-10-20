export type StudioPagePresetCategory = "landing" | "commerce" | "content" | "support";

export interface StudioPagePresetSection {
  type: string;
  settings: Record<string, unknown>;
}

export interface StudioPagePreset {
  id: string;
  label: string;
  description: string;
  category: StudioPagePresetCategory;
  icon: string;
  suggestedSlug: string;
  menuLabel: string;
  sections: StudioPagePresetSection[];
}

export interface StudioPresetCategoryInfo {
  id: StudioPagePresetCategory;
  label: string;
  icon: string;
}

export const STUDIO_PAGE_PRESET_CATEGORIES: readonly StudioPresetCategoryInfo[] = [
  { id: "landing", label: "هبوط", icon: "🏛️" },
  { id: "commerce", label: "تجاري", icon: "🛍️" },
  { id: "content", label: "محتوى", icon: "📝" },
  { id: "support", label: "دعم", icon: "💬" },
] as const;

export const STUDIO_PAGE_PRESETS: StudioPagePreset[] = [
  // 1. editorial-home «هوم إديتوريال» — hero-banner · journal-strip · look-mosaic · featured-collections · newsletter (5)
  {
    id: "editorial-home",
    label: "هوم إديتوريال",
    description: "واجهة رئيسية تحريرية لعرض الإطلالات وتنسيقات المجموعات والقصص التحريرية",
    category: "landing",
    icon: "🏛️",
    suggestedSlug: "editorial-home",
    menuLabel: "إديتوريال",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "إطلالات الموسم",
          title: "أناقة معاصرة تروي حكايتك",
          subtitle: "تشكيلات استثنائية منسقة بعناية لتعكس شخصيتك في كل مناسبة وتمنحك حضوراً واثقاً.",
          contentAlign: "center",
          ctaText: "اكتشف المجموعة",
          ctaLink: "/shop",
          secondaryCtaText: "تصفح الإطلالات",
          secondaryCtaLink: "/collections",
        },
      },
      {
        type: "journal-strip",
        settings: {
          badge: "من اليوميات",
          title: "قصص وتنسيقات الأسبوع",
          subtitle: "إلهام ونصائح مستمرة لمساعدتك في تنسيق قطعك اليومية بأسلوب متفرد.",
          items:
            "دليل الإطلالة الهادئة|تنسيقات يومية مريحة|https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800|/collections|إلهام لأناقة عملية ومتميزة في كل وقت\nألوان الموسم الدافئة|أحدث لوحات الألوان|https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800|/shop|اكتشف كيف تدمج التدرجات الناعمة بأسلوب راقٍ",
        },
      },
      {
        type: "look-mosaic",
        settings: {
          title: "فسيفساء الإطلالات المتكاملة",
          subtitle: "مزيج متناغم يجمع بين أرقى القطع المختارة بعناية لتناسب مختلف الأوقات.",
          ctaText: "تسوق الإطلالة كاملة",
          ctaLink: "/shop",
        },
      },
      {
        type: "featured-collections",
        settings: {
          title: "التصنيفات المختارة بعناية",
          subtitle: "تسوق حسب النمط أو المناسبة التي تلائم ذوقك واحتياجاتك اليومية.",
          contentAlign: "center",
          limit: 6,
          ctaText: "جميع التصنيفات",
          ctaLink: "/collections",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "انضم إلى مجتمعنا التحريري",
          subtitle: "كن أول من يطّلع على مجموعاتنا الجديدة وإصداراتنا المحدودة فور إطلاقها.",
          contentAlign: "center",
          buttonText: "اشترك الآن",
          placeholder: "أدخل بريدك الإلكتروني",
        },
      },
    ],
  },

  // 2. campaign-home «هوم كامبين/عرض» — hero-banner · promo-strip · offer-bento · featured-products · newsletter (5)
  {
    id: "campaign-home",
    label: "هوم كامبين/عرض",
    description: "صفحة رئيسية مخصصة للحملات الترويجية الكبرى والعروض الحصرية سريعة الدوران",
    category: "landing",
    icon: "🏷️",
    suggestedSlug: "campaign-home",
    menuLabel: "العروض الحصرية",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "حملة التخفيضات الكبرى",
          title: "تخفيضات استثنائية لفترة محدودة",
          subtitle: "خصومات تصل حتى 50% على تشكيلة واسعة من أجود المنتجات المختارة.",
          contentAlign: "start",
          ctaText: "تسوق العروض فورًا",
          ctaLink: "/shop",
          secondaryCtaText: "استكشف الكتالوج",
          secondaryCtaLink: "/shop",
        },
      },
      {
        type: "promo-strip",
        settings: {
          badge: "عرض خاص",
          message: "توصيل سريع مجاني للطلبات فوق 500 جنيه + استبدال ميسر خلال 14 يومًا",
          saleLabel: "خصم حتى 50%",
          shippingLabel: "شحن فوري",
          returnLabel: "ضمان الاستبدال",
          ctaText: "تسوق الآن",
          ctaLink: "/shop",
        },
      },
      {
        type: "offer-bento",
        settings: {
          badge: "باقات التوفير",
          title: "عروض وصفقات لا تفوّت",
          subtitle: "تشكيلات حصرية مختارة تمنحك قيمة مضاعفة وتوفيرًا فوريًا عند الشراء.",
          contentAlign: "center",
          cards:
            "العرض الذهبي|وفر حتى 40% عند شراء قطعتين|خصم تلقائي عند الدفع|احصل على العرض|/shop|primary|الأكثر طلباً\nالعرض العائلي|باقة التوفير الشاملة لجميع الاحتياجات|تشكيلة متكاملة بخصم حصري|تسوق الباقة|/shop|accent|قيمة مضاعفة",
        },
      },
      {
        type: "featured-products",
        settings: {
          title: "أقوى الصفقات والمنتجات المميزة",
          limit: 8,
          contentAlign: "center",
          saleOnly: "true",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "لا تفوت عروض الفلاش القادمة",
          subtitle: "اشترك ليصلك كود خصم إضافي 10% فور إطلاق الحملات الجديدة.",
          contentAlign: "center",
          buttonText: "تفعيل الخصم",
          placeholder: "بريدك الإلكتروني للحصول على الخصم",
        },
      },
    ],
  },

  // 3. product-showcase «لوك بوك / عرض منتج» — hero-banner · lookbook-showcase · featured-products · features-bar · newsletter (5)
  {
    id: "product-showcase",
    label: "لوك بوك / عرض منتج",
    description: "صفحة استعراض بصري للمنتجات والإطلالات بتفاصيل غنية وشريط مزايا موثوق",
    category: "landing",
    icon: "📸",
    suggestedSlug: "product-showcase",
    menuLabel: "اللوك بوك",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "كتالوج الإطلالات",
          title: "تفاصيل متقنة تصنع الفارق",
          subtitle: "نظرة عن قرب على أدق تفاصيل التصميم وجودة المواد المختارة لكل قطعة.",
          contentAlign: "center",
          ctaText: "تصفح اللوك بوك",
          ctaLink: "/shop",
          secondaryCtaText: "اكتشف التشكيلة",
          secondaryCtaLink: "/collections",
        },
      },
      {
        type: "lookbook-showcase",
        settings: {
          badge: "إلهام",
          title: "إطلالات متكاملة لكل يوم",
          subtitle: "أفكار تنسيق مبتكرة تجمع بين الراحة والجاذبية في مختلف الأوقات.",
          limit: 4,
          ctaText: "تسوق الإطلالة",
          ctaLink: "/shop",
        },
      },
      {
        type: "featured-products",
        settings: {
          title: "القطع الرئيسية في التشكيلة",
          limit: 8,
          contentAlign: "center",
          saleOnly: "false",
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "معايير الجودة والتصنيع",
          subtitle: "نلتزم بأعلى مواصفات الإتقان لضمان تجربة مريحة وممتدة تدوم طويلاً.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "جديد اللوك بوك أسبوعيًا",
          subtitle: "اشترك لتصلك جلسات التصوير والتنسيقات الجديدة أولاً بأول.",
          contentAlign: "center",
          buttonText: "متابعة التنسيقات",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 4. shop-demo «متجر / مجموعة» — hero-banner · filters-sidebar · product-grid · features-bar · newsletter (5)
  {
    id: "shop-demo",
    label: "متجر / مجموعة",
    description: "تجربة تسوق متكاملة بفلترة جانبية متقدمة وشبكة منتجات واضحة",
    category: "commerce",
    icon: "🛍️",
    suggestedSlug: "shop-demo",
    menuLabel: "المتجر",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "الكتالوج الشامل",
          title: "كل ما تبحث عنه في مكان واحد",
          subtitle: "تصفح مجموعتنا الواسعة واستخدم الفلاتر الذكية للوصول إلى خيارك المثالي بسرعة.",
          contentAlign: "start",
          ctaText: "كل المنتجات",
          ctaLink: "/shop",
        },
      },
      {
        type: "filters-sidebar",
        settings: {
          badge: "تصفية ذكية",
          title: "تخصيص البحث",
          subtitle: "حدد التصنيف والسعر والمواصفات بدقة للعثور على ما يناسبك.",
          showSort: "true",
          showCategories: "true",
        },
      },
      {
        type: "product-grid",
        settings: {
          title: "قائمة المنتجات",
          limit: 12,
          contentAlign: "start",
          saleOnly: "false",
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "تسوق آمن ومضمون",
          subtitle: "طرق دفع متعددة، فحص عند الاستلام، ودعم فني متواصل على مدار الساعة.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "ابق على اطلاع بالمنتجات الجديدة",
          subtitle: "نضيف منتجات حصرية كل أسبوع، اشترك لتكون أول من يكتشفها.",
          contentAlign: "center",
          buttonText: "اشترك",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 5. flash-sale «عروض وفلاش سيل» — hero-banner · promo-strip · offer-bento · featured-products · features-bar · newsletter (6)
  {
    id: "flash-sale",
    label: "عروض وفلاش سيل",
    description: "صفحة مبيعات خاطفة بتنبيهات حصرية وبنتو صفقات وشريط ثقة لدفع التحويل",
    category: "commerce",
    icon: "⏰",
    suggestedSlug: "flash-sale",
    menuLabel: "فلاش سيل",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "عروض خاطفة — ساعات معدودة",
          title: "تخفيضات الفلاش سيل الكبرى",
          subtitle: "الكميات محدودة للغاية وتنتهي صلاحية الأسعار الخاصة بنهاية اليوم.",
          contentAlign: "center",
          ctaText: "الحق العروض الآن",
          ctaLink: "/shop",
          secondaryCtaText: "صفقات اليوم",
          secondaryCtaLink: "/shop",
        },
      },
      {
        type: "promo-strip",
        settings: {
          badge: "فلاش ديل",
          message: "عداد الخصم شغال: خصم حتى 60% + شحن سريع لكافة المحافظات",
          saleLabel: "خصم فوري 60%",
          shippingLabel: "شحن سريع 24h",
          returnLabel: "معاينة قبل الاستلام",
          ctaText: "اغتنم الفرصة",
          ctaLink: "/shop",
        },
      },
      {
        type: "offer-bento",
        settings: {
          badge: "صفقات اللحظة",
          title: "بنتو عروض الفلاش سيل",
          subtitle: "أقوى الصفقات مجمعة لك بأسعار لا تتكرر لتوفير فوري مضمون.",
          contentAlign: "center",
          cards:
            "صفقة اليوم|خصم قياسي على أحدث الموديلات|متاح لـ 50 عميل فقط|تسوق الآن|/shop|primary|عرض خاص\nحزمة التوفير|اشتري 2 واحصل على خصم إضافي|يطبق الخصم آليًا عند إتمام الطلب|اطلب الحزمة|/shop|accent|توفير إضافي",
        },
      },
      {
        type: "featured-products",
        settings: {
          title: "منتجات الفلاش سيل النشطة",
          limit: 8,
          contentAlign: "center",
          saleOnly: "true",
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "ضمانات الشراء أثناء العروض",
          subtitle: "منتجات أصلية 100% مع كامل حقوق الاسترجاع والاستبدال دون تعقيد.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "كن أول من يعلم بالفلاش سيل القادم",
          subtitle: "تنبيهات فورية بالبريد قبل فتح العروض بـ 30 دقيقة للمشتركين فقط.",
          contentAlign: "center",
          buttonText: "اشترك للتنبيهات",
          placeholder: "بريدك الإلكتروني للتنبيه المبكر",
        },
      },
    ],
  },

  // 6. about «عن المتجر» — hero-banner · info-content · features-bar · newsletter (4)
  {
    id: "about",
    label: "عن المتجر",
    description: "صفحة تعريفية متكاملة برؤية المتجر وقصة نجاحه ومميزاته الحصرية",
    category: "content",
    icon: "🏢",
    suggestedSlug: "about",
    menuLabel: "عن المتجر",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "قصتنا وهويتنا",
          title: "عن متجرنا ورؤيتنا للمستقبل",
          subtitle: "نبتكر تجربة تسوق راقية تلبي شغف عملائنا بأفضل المنتجات وأعلى معايير الإتقان.",
          contentAlign: "center",
          ctaText: "تصفح منتجاتنا",
          ctaLink: "/shop",
          secondaryCtaText: "تواصل معنا",
          secondaryCtaLink: "/contact",
        },
      },
      {
        type: "info-content",
        settings: {
          badge: "من نحن",
          title: "رحلة بدأت بالشغف والالتزام",
          subtitle: "انطلق متجرنا لتقديم منتجات تجمع بين جودة التصنيع والأسعار العادلة لخدمة آلاف العملاء السعداء.",
          contentAlign: "start",
          body: "نؤمن بأن كل تجربة شراء يجب أن تكون سهلة وممتعة وموثوقة.\n\nنختار كل قطعة بعناية فائقة ونختبر معايير الجودة بدقة قبل وصولها إليك، لنضمن لك تجربة تسوق استثنائية تفوق توقعاتك.",
          detailsTitle: "أرقامنا ومحطاتنا",
          details:
            "سنة التأسيس|2022\nالعملاء السعداء|+25,000 عميل\nنسبة رضا العملاء|99.4%\nالشحن والتغطية|جميع المحافظات",
          ctaText: "استكشف الكتالوج",
          ctaLink: "/shop",
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "قيمنا الأساسية التي نعتز بها",
          subtitle: "المصداقية، سرعة الخدمة، ورضا العميل فوق كل اعتبار.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "انضم إلى عائلة متجرنا",
          subtitle: "اشترك لتصلك تحديثاتنا وقصص نجاحنا وأحدث العروض الحصرية.",
          contentAlign: "center",
          buttonText: "اشترك الآن",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 7. contact «تواصل معنا» — hero-banner · info-content · services-grid · features-bar · newsletter (5)
  {
    id: "contact",
    label: "تواصل معنا",
    description: "صفحة قنوات الاتصال المباشرة ومواعيد العمل وشبكة الخدمات الفنية",
    category: "support",
    icon: "📞",
    suggestedSlug: "contact",
    menuLabel: "تواصل معنا",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "خدمة العملاء",
          title: "يسعدنا دائماً تواصلك معنا",
          subtitle: "فريق دعم متخصص متواجد للإجابة على استفساراتك ومساعدتك في كل خطوة.",
          contentAlign: "center",
          ctaText: "ابدأ محادثة واتساب",
          ctaLink: "https://wa.me",
          secondaryCtaText: "الأسئلة الشائعة",
          secondaryCtaLink: "/faq",
        },
      },
      {
        type: "info-content",
        settings: {
          badge: "قنوات التواصل",
          title: "طرق الاتصال المباشرة ومواعيد الدعم",
          subtitle: "تواصل معنا عبر القناة المفضلة لديك طوال أيام الأسبوع.",
          contentAlign: "start",
          body: "نحن هنا لمساعدتك في الاستفسار عن المنتجات، متابعة حالة الطلبيات، أو حل أي مشكلة قد تواجهك.\n\nنحرص على الرد السريع خلال أوقات العمل الرسمية بكل اهتمام.",
          detailsTitle: "بيانات التواصل الرسمية",
          details:
            "البريد الإلكتروني|support@maxp.online\nالواتساب|+20 100 000 0000\nساعات العمل|يوميًا من 9 صباحاً حتى 10 مساءً\nزمن الاستجابة|خلال 15 دقيقة",
          ctaText: "تصفح المتجر",
          ctaLink: "/shop",
        },
      },
      {
        type: "services-grid",
        settings: {
          badge: "خدمات الدعم",
          title: "كيف يمكننا مساعدتك اليوم؟",
          subtitle: "قنوات مساندة متعددة لضمان تجربة تسوق مريحة وسلسة دون أي عناء.",
          columns: 3,
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "التزامنا برعاية عملائنا",
          subtitle: "ضمان حقيقي، استبدال فوري، وفريق دعم ودود يضعك دائمًا في المقام الأول.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "ابق على تواصل دائم",
          subtitle: "اشترك لتصلك مستجدات خدمة العملاء ومواعيد العمل في العطلات والمواسم.",
          contentAlign: "center",
          buttonText: "تأكيد الاشتراك",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 8. faq «أسئلة شائعة» — hero-banner · info-content · services-grid · newsletter (4)
  {
    id: "faq",
    label: "أسئلة شائعة",
    description: "دليل الإجابات الشافية لاستفسارات الشحن والطلب وسياسات الضمان والاسترجاع",
    category: "support",
    icon: "❓",
    suggestedSlug: "faq",
    menuLabel: "الأسئلة الشائعة",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "مركز المساعدة",
          title: "الأسئلة الأكثر شيوعاً وإجاباتها",
          subtitle: "إجابات مباشرة ودقيقة لكل استفساراتك حول الشحن، الدفع، والمعاينة.",
          contentAlign: "center",
          ctaText: "تصفح المنتجات",
          ctaLink: "/shop",
          secondaryCtaText: "تواصل مع الدعم",
          secondaryCtaLink: "/contact",
        },
      },
      {
        type: "info-content",
        settings: {
          badge: "إجابات فورية",
          title: "دليلك السريع لكل ما تحتاج معرفته",
          subtitle: "جمعنا لك أهم الأسئلة التي يطرحها عملاؤنا مع إجابات واضحة ومباشرة.",
          contentAlign: "start",
          body: "كيف أقوم بمتابعة شحنتي؟ بمجرد شحن طلبك، ستصلك رسالة تحتوي على رقم التتبع ورابط المتابعة المباشر.\n\nهل يتوفر الدفع عند الاستلام؟ نعم، الدفع عند الاستلام متاح لجميع المحافظات مع إمكانية المعاينة قبل الدفع.",
          detailsTitle: "سياسات وإرشادات سريعة",
          details:
            "مدة التوصيل|خلال 24 إلى 48 ساعة\nالمعاينة قبل الاستلام|متاحة مع مندوب الشحن\nفترة الاستبدال|14 يومًا من تاريخ الاستلام\nطرق الدفع|كاش عند الاستلام، بطاقات بنكية، ومحافظ إلكترونية",
          ctaText: "هل لديك سؤال آخر؟",
          ctaLink: "/contact",
        },
      },
      {
        type: "services-grid",
        settings: {
          badge: "أقسام الأسئلة",
          title: "موضوعات المساعدة الرئيسية",
          subtitle: "تصفح الإجابات حسب فئة الخدمة أو المرحلة التي تحتاجها.",
          columns: 3,
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "لم تجد إجابة لسؤالك؟",
          subtitle: "اشترك أو تواصل معنا وسيقوم أحد ممثلي الخدمة بالرد عليك فوراً.",
          contentAlign: "center",
          buttonText: "تواصل معنا",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 9. blog «مقال / مدونة» — hero-banner · article-grid · journal-strip · newsletter (4)
  {
    id: "blog",
    label: "مقال / مدونة",
    description: "صفحة محتوى تحريري ومقالات متخصصة لتعزيز الثقة وتثقيف العملاء",
    category: "content",
    icon: "📝",
    suggestedSlug: "blog",
    menuLabel: "المدونة",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "المدونة التحريرية",
          title: "مقالات ونصائح لاختيارات أذكى",
          subtitle: "دليلك المتخصص وأفكار ملهمة من خبراء المنتجات والموضة للمساعدة في اختيار الأنسب.",
          contentAlign: "center",
          ctaText: "تصفح المقالات",
          ctaLink: "/blog",
          secondaryCtaText: "تسوق التشكيلة",
          secondaryCtaLink: "/shop",
        },
      },
      {
        type: "article-grid",
        settings: {
          title: "أحدث المقالات والنصائح",
          subtitle: "محتوى دوري يثري معرفتك بأفضل ممارسات الاستخدام والتنسيق.",
          limit: 6,
        },
      },
      {
        type: "journal-strip",
        settings: {
          badge: "مختارات المحرر",
          title: "من يوميات المحررين",
          subtitle: "أهم المراجعات والأفكار المفضلة لدى فريق العمل هذا الأسبوع.",
          items:
            "كيف تختار الحجم واللون المناسب|دليل الشراء|https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800|/blog|خطوات بسيطة لتفادي المقاسات غير المناسبة والحصول على النتيجة المطلوبة\nالعناية بالمنتجات لتدوم أطول|نصائح الحفظ|https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800|/blog|إرشادات عملية للحفاظ على رونق مقتنياتك واستدامتها لأطول فترة",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "نشرة المدونة الأسبوعية",
          subtitle: "اشترك لتصلك أحدث المقالات والمراجعات والنصائح مباشرة إلى بريدك.",
          contentAlign: "center",
          buttonText: "اشتراك في النشرة",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },

  // 10. thank-you-demo «شكرًا / تم الطلب» — hero-banner · info-content · features-bar · newsletter (4)
  {
    id: "thank-you-demo",
    label: "شكرًا / تم الطلب",
    description: "صفحة تأكيد وشكر تفاعلية توضح خطوات ما بعد الشراء والمتابعة مع شريط ثقة",
    category: "support",
    icon: "🤝",
    suggestedSlug: "thank-you-demo",
    menuLabel: "شكرًا لك",
    sections: [
      {
        type: "hero-banner",
        settings: {
          eyebrow: "تم تسجيل طلبك بنجاح",
          title: "شكرًا لثقتك واختيارك متجرنا",
          subtitle: "طلبك قيد التجهيز الآن وسيتواصل معك مندوب الشحن لتأكيد موعد التسليم بدقة.",
          contentAlign: "center",
          ctaText: "متابعة التسوق",
          ctaLink: "/shop",
          secondaryCtaText: "تواصل مع الدعم",
          secondaryCtaLink: "/contact",
        },
      },
      {
        type: "info-content",
        settings: {
          badge: "ماذا بعد؟",
          title: "خطوات تجهيز وشحن طلبك",
          subtitle: "خطوات واضحة وسريعة من لحظة تأكيد الطلب حتى استلامك للشحنة عند باب بيتك.",
          contentAlign: "start",
          body: "يقوم فريقنا بفحص وتجهيز طلبك بعناية تامة لضمان مطابقة كافة المواصفات.\n\nستصلك رسالة تأكيد تتضمن تفاصيل الطلب ورقم التتبع بمجرد خروج الشحنة مع شركة الشحن.",
          detailsTitle: "معلومات الشحن والمتابعة",
          details:
            "التجهيز والتغليف|خلال 12 ساعة\nموعد التسليم المتوقع|من 24 إلى 48 ساعة\nالمعاينة|يحق لك فتح الطرد ومعاينته مع المندوب\nالدعم المباشر|متاح عبر الواتساب للمساعدة في أي تعديل",
          ctaText: "العودة إلى المتجر",
          ctaLink: "/shop",
        },
      },
      {
        type: "features-bar",
        settings: {
          title: "ضمانات ما بعد الشراء",
          subtitle: "فريقنا معك خطوة بخطوة حتى وصول الشحنة والتأكد من رضاك التام.",
        },
      },
      {
        type: "newsletter",
        settings: {
          title: "احصل على خصم 10% لطلبك القادم",
          subtitle: "اشترك لتصلك قسيمة الخصم الحصرية للعملاء المميزين للاستفادة منها في مشترياتك القادمة.",
          contentAlign: "center",
          buttonText: "تفعيل قسيمة الخصم",
          placeholder: "بريدك الإلكتروني",
        },
      },
    ],
  },
];

export interface StudioCreatedSection {
  type: string;
  key: string;
  settings: Record<string, unknown>;
}

/**
 * Creates deep-copied section instances with timestamped keys for the given preset.
 * If pageTitle is provided, updates the title of the first hero-banner section.
 */
export const createPresetSections = (
  presetId: string,
  pageTitle?: string
): StudioCreatedSection[] => {
  const ts = Date.now();
  const preset = STUDIO_PAGE_PRESETS.find((p) => p.id === presetId);

  if (!preset) {
    return [];
  }

  return preset.sections.map((sec, index) => {
    const sectionKey = `${sec.type}-${ts}-${index + 1}`;
    const newSettings = { ...sec.settings };

    // Apply custom page title to hero-banner if given
    if (pageTitle && sec.type === "hero-banner" && index === 0) {
      newSettings.title = pageTitle;
    }

    return {
      type: sec.type,
      key: sectionKey,
      settings: newSettings,
    };
  });
};
