export interface ToolDefinition {
  name: string;
  description: string;
  sideEffects: "read" | "write";
  requiresApproval: boolean;
}

export interface SkillDefinition {
  id: string;
  displayName: string;
  version?: string;
  description?: string;
  allowedTools: string[];
  requiresHumanApproval?: boolean;
  maxToolCount?: number;
  skillMd?: string;
  group?: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon?: string;
  status: string;
  allowedSkills?: string[];
  allowedTools?: string[];
}

export type SkillVertical =
  | "all"
  | "sales"
  | "support"
  | "marketing"
  | "medical"
  | "hotels"
  | "education"
  | "inventory"
  | "management"
  | "other";

export interface SkillMetadataMeta {
  titleAr: string;
  descAr: string;
  vertical: SkillVertical;
  triggerAr: string;
  isApprovalRequired?: boolean;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    glow: string;
  };
}

export const VERTICAL_CONFIG: Record<
  SkillVertical,
  { labelAr: string; icon: string; accentColor: string }
> = {
  all: { labelAr: "الكل", icon: "", accentColor: "from-indigo-500 to-violet-500" },
  sales: { labelAr: "المبيعات والتجارة", icon: "", accentColor: "from-emerald-500 to-teal-600" },
  support: { labelAr: "خدمة العملاء والدعم", icon: "", accentColor: "from-blue-500 to-indigo-600" },
  marketing: { labelAr: "التسويق والحملات", icon: "", accentColor: "from-violet-500 to-purple-600" },
  medical: { labelAr: "العيادات والمراكز الطبية", icon: "", accentColor: "from-rose-500 to-pink-600" },
  hotels: { labelAr: "الفنادق والضيافة", icon: "", accentColor: "from-sky-500 to-cyan-600" },
  education: { labelAr: "التعليم والتدريب", icon: "", accentColor: "from-amber-500 to-orange-600" },
  inventory: { labelAr: "المخزون والمنتجات", icon: "", accentColor: "from-teal-500 to-emerald-600" },
  management: { labelAr: "الإدارة والعمليات", icon: "", accentColor: "from-slate-600 to-zinc-800" },
  other: { labelAr: "مهارات مخصصة", icon: "", accentColor: "from-slate-500 to-gray-600" },
};

export const COMMERCIAL_SKILLS_DICTIONARY: Record<string, SkillMetadataMeta> = {
  "sales-co-pilot": {
    titleAr: "مساعد المبيعات الذكي",
    descAr: "إدارة رحلة البيع الكاملة من أول ظهور العميل على واتساب حتى إغلاق الصفقة والرد على الاعتراضات.",
    vertical: "sales",
    triggerAr: "عند استفسار العميل عن المنتجات، التردد، أو طلب مساعدة في اختيار المناسب.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "deal-closing": {
    titleAr: "إغلاق الصفقات المتأخرة",
    descAr: "توجيه الصفقات عالية القيمة عبر مراحل الإغلاق النهائية وتحفيز العميل على تأكيد الطلب فوراً.",
    vertical: "sales",
    triggerAr: "عند اقتراب العميل من الشراء ولكنه متردد أو يؤجل تأكيد الطلب.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "smart-negotiation": {
    titleAr: "التفاوض الذكي على الأسعار",
    descAr: "إدارة مساومة الأسعار مع العميل وتحديد بدائل العروض مع الالتزام التام بالحدود الآمنة لربحية التاجر.",
    vertical: "sales",
    triggerAr: "عند طلب العميل تخفيضاً في السعر أو مقارنته بالمنافسين.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "discount-proposal": {
    titleAr: "مقترحات الخصومات المشروطة",
    descAr: "حساب خصومات تحفيزية محسوبة بدقة على سلة الشراء لزيادة المبيعات دون الإضرار بالأرباح.",
    vertical: "sales",
    triggerAr: "عند استحقاق العميل لحافز شراء أو شراء كميات كبيرة.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "cart-recovery": {
    titleAr: "استرجاع السلات المتروكة",
    descAr: "رصد السلات غير المكتملة وتوجيه رسائل مخصصة بالمنتجات المحفوظة لتشجيع العميل على إتمام الطلب.",
    vertical: "sales",
    triggerAr: "عند مغادرة العميل للمتجر أو توقفه قبل تأكيد الشحن.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "upsell-engine": {
    titleAr: "محرك البيع المتقاطع والإضافي",
    descAr: "اقتراح منتجات تكميلية وإكسسوارات متوافقة مع اختيار العميل لرفع متوسط قيمة الطلب.",
    vertical: "sales",
    triggerAr: "بعد اختيار العميل لمنتج رئيسي وقبل الانتهاء من الطلب.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "booking-upsell-packages": {
    titleAr: "باقات الترقية والخدمات الإضافية",
    descAr: "عرض باقات VIP، خدمات تأمين إضافية، أو ترقيات أثناء حجز مواعيد العيادات أو غرف الفنادق.",
    vertical: "sales",
    triggerAr: "أثناء تأكيد خطوات الحجز للغرف أو الخدمات المتخصصة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "smart-followup": {
    titleAr: "المتابعة الاستباقية للعملاء",
    descAr: "تحديد العملاء المحتملين الذين يحتاجون متابعة واقتراح التوقيت والرسالة الأنسب لكل مرحلة.",
    vertical: "sales",
    triggerAr: "مرور فترة زمنية محددة دون رد من العميل بعد تقديم عرض.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
  },
  "facebook-sales-conversion": {
    titleAr: "تحويل مبيعات فيسبوك وإنستجرام",
    descAr: "الرد الفوري على تعليقات الحملات الإعلانية والرسائل وتحويل المعجبين إلى مشترين مؤكدين.",
    vertical: "marketing",
    triggerAr: "وصول تعليق يسأل عن السعر أو تفاصيل إعلان على فيسبوك أو إنستجرام.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20", glow: "shadow-violet-500/10" },
  },
  "facebook-ad-draft": {
    titleAr: "صياغة نصوص وزوايا الإعلانات",
    descAr: "توليد نصوص إعلانية مبتكرة بنقاط جذب نفسية (Hooks) مستهدفة لمنتجات المتجر.",
    vertical: "marketing",
    triggerAr: "عند رغبة التاجر أو الميديا باير في إطلاق حملة جديدة لمنتج معين.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20", glow: "shadow-violet-500/10" },
  },
  "social-image-generation": {
    titleAr: "توليد منشورات وصور تسويقية",
    descAr: "إنشاء تصاميم وصور إعلانية فورية للمنتجات بنسب أبعاد مناسبة لمنصات التواصل الاجتماعي.",
    vertical: "marketing",
    triggerAr: "طلب تصميم صورة ترويجية أو إعلان لمنتج.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20", glow: "shadow-violet-500/10" },
  },
  "campaign-report": {
    titleAr: "تقارير أداء الحملات الإعلانية",
    descAr: "استخراج تقارير تحليلية ومعدلات التحويل وتكلفة اكتساب العميل مع توصيات تحسين الميزانية.",
    vertical: "marketing",
    triggerAr: "طلب تقرير أداء أسبوعي أو شهري للحملات الممولة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20", glow: "shadow-violet-500/10" },
  },
  "order-confirmation": {
    titleAr: "تأكيد الطلبات وتجهيز الشحن",
    descAr: "مراجعة العنوان والمدينة ورقم الهاتف البديل مع العميل وتأكيد جاهزية الطلب لشركات الشحن.",
    vertical: "support",
    triggerAr: "إنشاء طلب جديد يتطلب التحقق النهائي مع المشتري.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "order-support": {
    titleAr: "تتبع وحل مشكلات الشحنات",
    descAr: "إفادة العميل بمكان الشحنة وموعد التسليم المتوقع والتنسيق مع مندوبي شركات الشحن.",
    vertical: "support",
    triggerAr: "سؤال العميل 'أوردر بتاعي وصل فين؟' أو الإبلاغ عن تأخير في التسليم.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "exchange-support": {
    titleAr: "إدارة طلبات الاستبدال والاسترجاع",
    descAr: "مراجعة سياسة الاسترجاع والتحقق من حالة المنتج وتنسيق استلام المرتجع مع شركة الشحن.",
    vertical: "support",
    triggerAr: "طلب العميل تبديل مقاس أو إرجاع منتج غير مطابق.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "customer-context-summary": {
    titleAr: "ملخص تاريخ وسياق العميل",
    descAr: "تجميع سجل تعاملات العميل وقيمته السابقة قبل بدء الرد لتخصيص المعاملة بما يليق بمكانته.",
    vertical: "support",
    triggerAr: "بدء أي جلسة محادثة جديدة مع عميل حالي مسجل في قاعدة البيانات.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "post-sale-retention": {
    titleAr: "رعاية وتقييمات ما بعد البيع",
    descAr: "التواصل بعد استلام الطلب للاطمئنان على الجودة وطلب تقييم إيجابي مع كود خصم للطلب القادم.",
    vertical: "support",
    triggerAr: "تسليم الطلب بنجاح وتأكيده في نظام التوصيل.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "handoff-to-human": {
    titleAr: "التسليم السلس لموظف بشري",
    descAr: "تحويل المحادثة فوراً لموظف خدمة العملاء البشري مع ملخص كامل لما دار عند غضب العميل أو في الحالات الخاصة.",
    vertical: "support",
    triggerAr: "طلب العميل التحدث مع موظف، أو رصد مشكلة شكوى حادة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", glow: "shadow-blue-500/10" },
  },
  "medical-center-booking": {
    titleAr: "حجز مواعيد العيادات والمراكز الطبية",
    descAr: "فحص مواعيد الأطباء المتاحة وتنسيق كشف المريض وتأكيد وقت وتكلفة الاستشارة الطبية.",
    vertical: "medical",
    triggerAr: "استفسار المريض عن أوقات عيادة دكتور معين أو رغبته في حجز موعد كشف.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", glow: "shadow-rose-500/10" },
  },
  "medical-center-management": {
    titleAr: "تشغيل العيادات وجداول الأطباء",
    descAr: "تنظيم كشوفات اليوم، اعتذارات الأطباء الطارئة، وإرسال تنبيهات المواعيد للمرضى المسجلين.",
    vertical: "medical",
    triggerAr: "إدارة العمليات اليومية للعيادة وتحديث جدول الدخول.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", glow: "shadow-rose-500/10" },
  },
  "clinic-knowledge-resolver": {
    titleAr: "دليل خدمات العيادات والتحاليل",
    descAr: "إجابة المريض عن تخصصات المركز، شروط التحاليل، الأجهزة المتوفرة، والأسعار المعتمدة.",
    vertical: "medical",
    triggerAr: "سؤال عن تجهيزات المركز أو الاستعدادات قبل كشف طبي أو فحص معين.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", glow: "shadow-rose-500/10" },
  },
  "hotel-booking": {
    titleAr: "حجز وتسكين غرف الفنادق",
    descAr: "فحص الغرف والأجنحة الشاغرة وتواريخ الدخول والمغادرة واحتساب التكلفة الإجمالية وتأكيد الحجز.",
    vertical: "hotels",
    triggerAr: "رغبة النزيل في حجز إقامة لعدد معين من الليالي والأفراد.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/20", glow: "shadow-sky-500/10" },
  },
  "hotel-info": {
    titleAr: "خدمات وسياسات النزلاء بالفندق",
    descAr: "إفادة النزيل بمواعيد Check-in و Check-out، خدمات الغرف، حمامات السباحة، وقواعد الإقامة.",
    vertical: "hotels",
    triggerAr: "سؤال عن مرافق الفندق، مواعيد الإفطار، أو سياسات الأطفال والحيوانات الأليفة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/20", glow: "shadow-sky-500/10" },
  },
  "education-center-info": {
    titleAr: "دليل كورسات وتدريب الأكاديمية",
    descAr: "شرح البرامج التعليمية، الفئات العمرية المستهدفة، مدة الكورس، والمحاضرين المشرفين.",
    vertical: "education",
    triggerAr: "استفسار ولي الأمر أو الطالب عن تفاصيل ومناهج الدورات التدريبية المتاحة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "education-enrollment": {
    titleAr: "تسجيل وقبول الطلاب في المجموعات",
    descAr: "تسجيل بيانات الطالب في المجموعات المتوافقة ومتابعة سداد الرسوم وإرسال رابط الحضور.",
    vertical: "education",
    triggerAr: "طلب الطالب الانضمام لدورة معينة أو إتمام إجراءات التسجيل.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "education-session-booking": {
    titleAr: "حجز الجلسات الفردية وورش العمل",
    descAr: "تنسيق مواعيد الجلسات الخاصة مع المعلمين والمدربين وتأكيد قاعات التدريب أو روابط البث.",
    vertical: "education",
    triggerAr: "طلب جلسة تعليمية مخصصة أو ورشة عمل في موعد محدد.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "course-coaching": {
    titleAr: "المتابعة والتحفيز الدراسي المستمر",
    descAr: "تذكير الطلاب بالواجبات، حل الاستفسارات الشائعة في المنهج، وتشجيعهم لإتمام متطلبات الدورة.",
    vertical: "education",
    triggerAr: "متابعة تقدم الطالب أسبوعياً أو عند تعثره في تسليم واجب.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
  },
  "catalog-search": {
    titleAr: "البحث الفوري في الكتالوج والمقاسات",
    descAr: "البحث عن المنتجات ومطابقتها بأسرع وقت مع فحص المخزون والأسعار والمقاسات المتوفرة.",
    vertical: "inventory",
    triggerAr: "بحث العميل عن منتج محدد بالاسم أو الوصف أو كود القطعة.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20", glow: "shadow-teal-500/10" },
  },
  "low-stock-watch": {
    titleAr: "رادار مراقبة نواقص المخزون",
    descAr: "تنبيه التاجر مبكراً عند وصول صنف معين للحد الحرج في المخزن لمنع نفاذه وفقدان المبيعات.",
    vertical: "inventory",
    triggerAr: "انخفاض الكمية المتاحة لمنتج عن حد إعادة الطلب المحدد.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20", glow: "shadow-teal-500/10" },
  },
  "pricing-review": {
    titleAr: "تدقيق الأسعار وحماية هوامش الربح",
    descAr: "فحص هوامش الربح لكل صنف والتأكد من عدم وجود أخطاء في التسعير أو خصومات تؤدي لخسارة.",
    vertical: "inventory",
    triggerAr: "تعديل أسعار المنتجات أو إطلاق حملة تخفيضات كبرى.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20", glow: "shadow-teal-500/10" },
  },
  "public-store-builder": {
    titleAr: "تخصيص واجهة المتجر الإلكتروني",
    descAr: "تنسيق عروض الصفحة الرئيسية، إضافة بانرات مميزة، وتنظيم أقسام الكتالوج للمشتري.",
    vertical: "inventory",
    triggerAr: "تحديث وتجديد تصميم متجر التاجر الإلكتروني.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20", glow: "shadow-teal-500/10" },
  },
  "read-company-state": {
    titleAr: "لقطة المؤشرات والعمليات اليومية",
    descAr: "تزويد الوكلاء ببيانات حية وفورية عن حالة الشركة (مبيعات اليوم، حالة المخزون، فرق العمل).",
    vertical: "management",
    triggerAr: "طلب المدير أو الوكيل ملخصاً تشغيلياً شاملاً للوضع الحالي.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20", glow: "shadow-slate-500/10" },
  },
  "review-agent-performance": {
    titleAr: "تدقيق جودة وردود الوكلاء",
    descAr: "مراجعة ردود الوكلاء في المحادثات وقياس سرعة إغلاق التذاكر ودقة الإجابات المقدمة.",
    vertical: "management",
    triggerAr: "فحص دوري لجودة محادثات الذكاء الاصطناعي وكفاءة فريق العمل.",
    isApprovalRequired: false,
    badgeColor: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20", glow: "shadow-slate-500/10" },
  },
  "delegate-goal": {
    titleAr: "تفكيك وتفويض الأهداف التجارية",
    descAr: "تقسيم هدف تجاري استراتيجي إلى خطوات تنفيذية وتوزيعها على الوكلاء المناسبين تلقائياً.",
    vertical: "management",
    triggerAr: "تحديد هدف أعمال كبير يحتاج مشاركة وكيل المبيعات ووكيل المخزون معاً.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20", glow: "shadow-slate-500/10" },
  },
  "hire-agent": {
    titleAr: "تجهيز وتعيين وكيل جديد",
    descAr: "تفعيل وكيل افتراضي متقدم مع تخصيص الـ Persona والأدوات والمهارات الملحقة بضغطة واحدة.",
    vertical: "management",
    triggerAr: "رغبة الإدارة في توظيف وكيل جديد لخدمة قسم مستحدث في المنشأة.",
    isApprovalRequired: true,
    badgeColor: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20", glow: "shadow-slate-500/10" },
  },
};

export const getSkillMeta = (skill: SkillDefinition): SkillMetadataMeta => {
  const custom = COMMERCIAL_SKILLS_DICTIONARY[skill.id];
  if (custom) return custom;

  // Infer vertical
  let v: SkillVertical = "other";
  const sid = skill.id.toLowerCase();
  if (sid.includes("hotel")) v = "hotels";
  else if (sid.includes("clinic") || sid.includes("medical") || sid.includes("doctor")) v = "medical";
  else if (sid.includes("education") || sid.includes("course") || sid.includes("school")) v = "education";
  else if (sid.includes("sales") || sid.includes("deal") || sid.includes("cart") || sid.includes("discount") || sid.includes("upsell")) v = "sales";
  else if (sid.includes("support") || sid.includes("order") || sid.includes("retention") || sid.includes("handoff")) v = "support";
  else if (sid.includes("ad") || sid.includes("campaign") || sid.includes("facebook") || sid.includes("marketing")) v = "marketing";
  else if (sid.includes("stock") || sid.includes("catalog") || sid.includes("price") || sid.includes("store")) v = "inventory";
  else if (sid.includes("agent") || sid.includes("company") || sid.includes("goal")) v = "management";
  else if (skill.group && skill.group in VERTICAL_CONFIG) v = skill.group as SkillVertical;

  return {
    titleAr: skill.displayName || skill.id,
    descAr: skill.description || "قدرة وظيفية تنفيذية مخصصة للوكلاء الذاتيين.",
    vertical: v,
    triggerAr: "يتم استدعاؤها حسب رغبة التاجر أو متطلبات المحادثة.",
    isApprovalRequired: skill.requiresHumanApproval ?? false,
    badgeColor: {
      bg: "bg-slate-500/10",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-500/20",
      glow: "shadow-slate-500/10",
    },
  };
};
