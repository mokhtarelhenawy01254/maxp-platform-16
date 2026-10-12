import { PlatformToolItem, PricingPlan, FaqItem, AuditComparisonPoint } from "./types";

export const OFFICIAL_WHATSAPP_NUMBER = "201123087745";
export const WHATSAPP_CONSULT_URL = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "مرحباً، أود معرفة تفاصيل باقة متجر الملابس وربط بوسطة والفروع بنظام MaxP"
)}`;

export const FASHION_TOOLS: PlatformToolItem[] = [
  {
    id: "tool-storefront",
    name: "متجر الويب فائق السرعة للأزياء",
    category: "store",
    description: "واجهة متجر احترافية مهيأة للشراء الفوري مع تصفح سريع لتشكيلات الملابس والصور عالية الدقة.",
    standalonePrice: 299,
    keyFeature: "P95 < 0.65s زمن تحميل الكتالوج",
  },
  {
    id: "tool-matrix",
    name: "مصفوفة جرد المقاسات والألوان (Matrix)",
    category: "inventory",
    description: "إدارة تفصيلية لتنويعات S و M و L و XL و 2XL مع جرد مستقل لكل لون ومقاس في كل فرع.",
    standalonePrice: 249,
    keyFeature: "تزامن فوري بين الفروع والمستودع",
  },
  {
    id: "tool-pos",
    name: "كاشير ونقطة بيع الفروع (Cloud POS)",
    category: "operations",
    description: "شاشة كاشير سريعة تدعم قارئ الباركود وطباعة الفواتير الحرارية وتحديث رصيد المتجر الإلكتروني.",
    standalonePrice: 299,
    keyFeature: "دعم الباركود والطباعة الحرارية",
  },
  {
    id: "tool-size-advisor",
    name: "مستشار المقاسات الذكي لخفض المرتجعات",
    category: "store",
    description: "محرك تفاعلي يسأل المشتري عن الطول والوزن ويرشح المقاس الأدق تلقائياً مع توضيح نوع التلبيس.",
    standalonePrice: 179,
    keyFeature: "خفض أخطاء اختيار المقاس بنسبة 60%",
  },
  {
    id: "tool-bosta",
    name: "ربط بوسطة وشركات الشحن المصرية",
    category: "shipping",
    description: "إصدار بوالص الشحن بنقرة واحدة مع تتبع حالات التسليم وتحديث المتحصلات النقدية تلقائياً.",
    standalonePrice: 199,
    keyFeature: "إصدار بوليصة وتتبع بنقرة واحدة",
  },
  {
    id: "tool-whatsapp-bot",
    name: "تأكيد الطلبات والعناوين عبر واتساب",
    category: "operations",
    description: "إرسال رسائل آلية لتأكيد المقاس والعنوان ورقم الهاتف قبل تجهيز الشحنة دون جهد يدوي.",
    standalonePrice: 199,
    keyFeature: "تأكيد فوري يمنع شحن أوردرات وهمية",
  },
  {
    id: "tool-returns-portal",
    name: "بوابة تنظيم التبديل والمرتجعات",
    category: "operations",
    description: "مسار رقمي يتيح للعميل طلب استبدال المقاس مع جدولة مندوب الشحن وتتبع القطعة المستلمة.",
    standalonePrice: 149,
    keyFeature: "تسجيل أسباب الاستبدال لتحسين الإنتاج",
  },
  {
    id: "tool-awb-printer",
    name: "طباعة استيكرات الباركود وبوالص الشحن",
    category: "shipping",
    description: "طباعة مجمعة لبوالص الشحن وملصقات الملابس بحجم مخصص للطباعة الحرارية وأكياس التغليف.",
    standalonePrice: 129,
    keyFeature: "طباعة دفعية متوافقة مع الطابعات الحرارية",
  },
  {
    id: "tool-meta-capi",
    name: "ربط بيكسل فيسبوك وتيك توك (CAPI)",
    category: "marketing",
    description: "إرسال أحداث الشراء وتصفح الكتالوج خادمياً لتفادي حواجب الإعلانات وتغذية خوارزميات الاستهداف.",
    standalonePrice: 199,
    keyFeature: "دقة تتبع 100% بدون فقدان أحداث",
  },
  {
    id: "tool-bundle-engine",
    name: "محرك أطقم وعروض الملابس (Bundles)",
    category: "marketing",
    description: "تنسيق عروض تلقائية (قميص + بنطلون + حزام) لزيادة متوسط قيمة السلة عند إتمام الطلب.",
    standalonePrice: 149,
    keyFeature: "رفع متوسط قيمة السلة الشرائية",
  },
  {
    id: "tool-unit-economics",
    name: "حساب تكلفة القطعة وهوامش الربح",
    category: "operations",
    description: "احتساب تكلفة القماش والتفصيل ومصاريف الشحن وتكلفة الإعلانات لمعرفة صافي ربح كل كوليكشن.",
    standalonePrice: 179,
    keyFeature: "حساب صافي الربح الحقيقي لكل قطعة",
  },
  {
    id: "tool-suppliers",
    name: "سجل ورش التفصيل والموردين",
    category: "inventory",
    description: "متابعة طلبيات خطوط الإنتاج وورش الخياطة ودفعات الأقمشة مع مواعيد الاستلام والحسابات.",
    standalonePrice: 129,
    keyFeature: "متابعة مراحل الإنتاج والمصنعية",
  },
  {
    id: "tool-payments",
    name: "تكامل الدفع الإلكتروني و InstaPay",
    category: "store",
    description: "دعم بوابات الدفع المصرية مع ميزة الدفع عند الاستلام (COD) الموثوقة محلياً.",
    standalonePrice: 149,
    keyFeature: "دعم فوري لـ InstaPay وكروت ميزة",
  },
  {
    id: "tool-loyalty",
    name: "نقاط الولاء ومكافآت التكرار",
    category: "marketing",
    description: "منح نقاط قابلة للاستبدال على المشتريات لتحفيز المتسوقين على طلب كوليكشنات المواسم الجديدة.",
    standalonePrice: 129,
    keyFeature: "إعادة تفعيل مشتري المواسم السابقة",
  },
  {
    id: "tool-stock-alerts",
    name: "رادار التنبيه بنفاد المقاسات الأكثر طلباً",
    category: "inventory",
    description: "إشعارات استباقية عند اقتراب نفاد مقاس رائج لجدولة إعادة تصنيعه قبل فوات موسم الطلب.",
    standalonePrice: 119,
    keyFeature: "منع هدر المبيعات بسبب نفاد المقاس",
  },
  {
    id: "tool-sheets-sync",
    name: "استيراد وتصدير المنتجات عبر إكسيل",
    category: "inventory",
    description: "رفع وتحديث مئات القطع والتسعيرات والمقاسات من ملفات CSV و Excel في ثوانٍ معدودة.",
    standalonePrice: 99,
    keyFeature: "توافق كامل مع ملفات CSV و XLSX",
  },
  {
    id: "tool-mobile-cockpit",
    name: "لوحة تحكم سريعة لإدارة المتجر من الهاتف",
    category: "operations",
    description: "متابعة تدفق الأوردرات اليومية وحالات الشحن والمخزون المتبقي مباشرة من هاتفك المحمول.",
    standalonePrice: 90,
    keyFeature: "إشعارات وتنبيهات فورية بالطلبات",
  },
];

export const TOTAL_STANDALONE_PRICE = FASHION_TOOLS.reduce(
  (acc, item) => acc + item.standalonePrice,
  0
);
export const MONTHLY_BUNDLE_PRICE = 999;
export const SAVINGS_AMOUNT = TOTAL_STANDALONE_PRICE - MONTHLY_BUNDLE_PRICE;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free-plan",
    name: "المتجر الأساسي",
    tagline: "للبدء الفوري بدون مخاطرة وبدون رسوم تأسيس",
    price: 0,
    pricePeriod: "مجاناً دائماً",
    popular: false,
    features: [
      "متجر إلكتروني سريع مهيأ للأزياء والموبايل",
      "إضافة منتجات وتصنيفات بدون أي سقف عددي",
      "استقبال طلبات الدفع عند الاستلام (COD)",
      "لوحة إدارة الطلبات والعملاء الأساسية",
      "0% عمولة مبيعات وبدون اشتراك شهري",
    ],
    ctaText: "افتح متجرك (0 ج.م)",
    action: "free-register",
  },
  {
    id: "payg-plan",
    name: "إدارة الطلب (PAYG)",
    tagline: "ادفع فقط مقابل ما تشحنه بنجاح بدون التزام ثابت",
    price: 1,
    pricePeriod: "لكل طلب مكتمل",
    popular: false,
    features: [
      "جميع مميزات المتجر الأساسي المجاني",
      "1 ج.م فقط عن كل أوردر مكتمل يتم شحنه",
      "إصدار بوالص الشحن عبر بوسطة تلقائياً",
      "إشعارات تأكيد وتتبع الطلب عبر واتساب",
      "صفر تكلفة في الأيام أو الشهور التي لا تبيع فيها",
    ],
    ctaText: "ابدأ بنظام 1 ج.م/أوردر",
    action: "payg-register",
  },
  {
    id: "bundle-plan",
    name: "باقة البراند والفروع الشاملة",
    tagline: "المنظومة المتكاملة لإدارة المتجر والكاشير والشحن والمخزون",
    price: 999,
    pricePeriod: "شهرياً شامل 17 أداة",
    popular: true,
    features: [
      "جميع الأدوات الـ 17 المدمجة في منصة موحدة",
      "مصفوفة المقاسات والألوان (Matrix S/M/L/XL/2XL)",
      "كاشير الفروع (Cloud POS) متزامن مع المتجر لحظياً",
      "مستشار المقاسات الذكي لخفض مرتجعات الشحن 60%",
      "ربط شحن بوسطة وإصدار البوالص بنقرة واحدة",
      "ربط بيكسل فيسبوك وتيك توك خادمياً (CAPI)",
      "حاسبة هوامش وتكاليف أقمشة ومصنعية الكوليكشن",
      `وفر ${SAVINGS_AMOUNT.toLocaleString("en-US")} ج.م شهرياً مقارنة بشراء الأدوات منفردة`,
    ],
    ctaText: "اشترك في الباقة (999 ج.م)",
    action: "bundle-checkout",
  },
];

export const TASTE_FAQS: FaqItem[] = [
  {
    question: "هل خطة المتجر المجاني (0 ج.م) تتطلب بطاقة دفع بنكية؟",
    answer: "لا تتطلب أي بطاقة ائتمان على الإطلاق. يمكنك تسجيل الحساب والبدء في رفع منتجاتك واستقبال طلبات الزبائن فوراً وبشكل دائم دون أي خصم خفي.",
  },
  {
    question: "كيف يساهم مستشار المقاسات في تقليل مرتجعات الأزياء؟",
    answer: "السبب الأول لارتجاع ملابس الأونلاين هو عدم ملائمة المقاس. يسأل المستشار الذكي المشتري عن الطول والوزن ونوع التلبيس المفضل (عادي أم أوفرسايز)، ويرشح المقاس بدقة، مما خفض نسبة الاستبدال إلى 60% لدى المتاجر المشتركة.",
  },
  {
    question: "هل يتزامن كاشير المحل الفعلي مع المتجر الإلكتروني؟",
    answer: "نعم. عند مسح باركود أي قطعة وبيعها في المحل الفعلي عبر كاشير MaxP POS، يُخصم المخزون فورياً من المتجر الإلكتروني في نفس اللحظة لمنع بيع القطعة نفسها مرتين.",
  },
  {
    question: "كيف يتم ربط شركة شحن بوسطة؟",
    answer: "يتم ربط حسابك في بوسطة بمفتاح الـ API لمرة واحدة، لتتمكن بعدها من إنشاء البوليصة وطباعة استيكر الشحن بنقرة زر واحدة دون الحاجة لإعادة كتابة العناوين يدوياً.",
  },
];

export const AUDIT_COMPARISON_MATRIX: AuditComparisonPoint[] = [
  {
    pillar: "Aesthetic & Palette",
    pillarTitle: "لوحة الألوان والمادية البصرية",
    slopSymptom: "تدرج نيون بنفسجي وأزرق عشوائي فوق خلفية مظلمة، أو بيج باهت (#FAF8F5) مستهلك مع زجاجيات مفرطة في الضبابية.",
    tasteExecution: "لوحة كربون وتيتانيوم معمارية (#090A0F مع #121316) وحدود ميكانيكية فائقة الدقة (border-white/10) مع وميض أزرق أتيليه مركز.",
    whyItMatters: "يوحي بالاحترافية والثقة التجارية كمنصة تشغيل مؤسسية للمتاجر، بدل أن يبدو كقالب تسويقي مولّد عشوائياً.",
    ruleCode: "ANTI_SLOP_P01",
  },
  {
    pillar: "Typography & Micro-Craft",
    pillarTitle: "التايبوجرافي والأرقام الميكانيكية",
    slopSymptom: "خلط خط سيريف عشوائي في العناوين لادعاء الفخامة، وأرقام متذبذبة العرض، ونصوص طويلة تتجاوز 4 أسطر في الهيرو.",
    tasteExecution: "خط موحد متناسق (IBM Plex Sans Arabic) مع أرقام جدولية مصفوفة (tabular-nums)، وعلامات تنصيص حقيقية « »، وتوازن بصري text-wrap: balance.",
    whyItMatters: "يمنع تشتت عين التاجر، ويجعل جداول الأسعار والأرقام مصطفة هندسياً بدقة دون اهتزاز الأرقام.",
    ruleCode: "ANTI_SLOP_P02",
  },
  {
    pillar: "Hero Space Discipline",
    pillarTitle: "انضباط مساحة الهيرو والشاشات الأولى",
    slopSymptom: "هيرو ضخم يبتلع الشاشة بأكثر من 7 طبقات نصية وشعارات متكدسة تدفع أزرار التحويل إلى ما تحت الطي (Below The Fold).",
    tasteExecution: "هيرو منضبط لا يتجاوز شاشة العرض: عنوان مركز في سطرين، شرح لا يتجاوز 20 كلمة، وزر تحويل مباشر يظهر فوراً بدون تمرير.",
    whyItMatters: "على شاشات اللابتوب العادية (1366x768)، التاجر يرى القيمة والزر في الثواني الثلاث الأولى دون الحاجة للتمرير.",
    ruleCode: "ANTI_SLOP_P03",
  },
  {
    pillar: "Layout Architecture",
    pillarTitle: "معمارية الشبكة وشاسيه السطح الواحد",
    slopSymptom: "ثلاث بطاقات متطابقة الحجم أفقياً (Cookie-Cutter) أو جزر متناثرة متباعدة بفواصل رمادية عريضة تشتت النظر.",
    tasteExecution: "شبكة بينتو غير متناظرة بنسبة (8:4) وسطح تشغيلي موحد (Unified Chassis) بفواصل شعرية رقيقة (Hairline Dividers).",
    whyItMatters: "يعكس وزناً بصرياً واقعياً لكل ميزة (محاكي المقاسات يأخذ 8 أعمدة والكاشير 4) ويوفر تجربة استخدام متماسكة.",
    ruleCode: "ANTI_SLOP_P04",
  },
  {
    pillar: "Telemetry vs Buzzwords",
    pillarTitle: "البيانات التشغيلية الحقيقية مقابل الطنين التسويقي",
    slopSymptom: "عبارات حشو تسويقية فارغة: «الذكاء الاصطناعي السحري الخارق الذي يغير مستقبلك إلى الأبد».",
    tasteExecution: "أرقام تشغيلية موثقة: «P95 < 0.65s زمن تحميل الكتالوج»، «60% خفض مرتجعات المقاس»، «1-Click إصدار بوالص بوسطة»، «0% عمولة».",
    whyItMatters: "التاجر المصري لا يهمه الكلام الإنشائي، بل يبحث عن خفض مصاريف الشحن ووقف نزيف المرتجعات.",
    ruleCode: "ANTI_SLOP_P05",
  },
  {
    pillar: "Micro-Haptics & Physics",
    pillarTitle: "فيزياء التفاعل والحركة المحسوبة",
    slopSymptom: "حركات خطية متكررة بلا نهاية (توهجات قوس قزح دوارة وبطاقات تهتز باستمرار) تشتت القراءة.",
    tasteExecution: "فيزياء زنبركية محكومة: ضغط فيزيائي حقيقي عند النقر (scale(0.97)) وتجاوب فوري بدون تأخير، مع احترام تام للـ reduced-motion.",
    whyItMatters: "يشعر المستخدم بلمسة برمجية عالية الجودة كأنه يتعامل مع تطبيق سطح مكتب فاخر مثل Linear أو Cursor.",
    ruleCode: "ANTI_SLOP_P06",
  },
  {
    pillar: "Emoji & Icon Hygiene",
    pillarTitle: "نظافة الأيقونات وحظر الإيموجي العشوائي",
    slopSymptom: "توزيع إيموجي كحشو في كل بطاقة وعنوان (🤖 🚀 ⚡ ✨ 🔥 💡 🎯) وشارات ملونة ميتة لا يمكن النقر عليها.",
    tasteExecution: "حظر تام لإيموجي الحشو. الاعتماد فقط على أيقونات فيكتور خفيفة الوزن وشارات حالة ديناميكية تمثل أرقاماً وبيانات حية.",
    whyItMatters: "المظهر النظيف الجاد يعكس منتجاً مخصصاً لرواد الأعمال، وليس موقعاً تجريبياً للهواة.",
    ruleCode: "ANTI_SLOP_P07",
  },
];
