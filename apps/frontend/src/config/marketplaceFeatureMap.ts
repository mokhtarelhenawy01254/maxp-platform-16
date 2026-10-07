export type FeatureAuditStatus =
  | "core"
  | "covered"
  | "needs-granular-gate"
  | "missing-app";

export type FeatureAuditArea =
  | "commerce"
  | "crm"
  | "marketing"
  | "communication"
  | "hr"
  | "analytics"
  | "finance"
  | "productivity"
  | "integration"
  | "platform"
  | "orders"
  | "shipping"
  | "warehouse"
  | "payments"
  | "procurement"
  | "wholesale"
  | "accounting";

export type FeatureRoute = {
  path: string;
  label: string;
};

export type MarketplaceFeatureMapEntry = {
  id: string;
  area: FeatureAuditArea;
  label: string;
  description: string;
  status: FeatureAuditStatus;
  routes: FeatureRoute[];
  appSlug?: string;
  appLabel?: string;
  currentGate?: string;
  legacyGate?: string;
  action: string;
};

export type MarketplaceFeatureAuditEntry = MarketplaceFeatureMapEntry & {
  appExists: boolean;
  effectiveStatus: FeatureAuditStatus;
};

export type FeatureAuditSummary = {
  total: number;
  core: number;
  covered: number;
  needsGranularGate: number;
  missingApp: number;
};

export const statusLabels: Record<FeatureAuditStatus, string> = {
  core: "Core",
  covered: "مربوط بتطبيق",
  "needs-granular-gate": "يحتاج ربط أدق",
  "missing-app": "يحتاج تطبيق جديد",
};

export const areaLabels: Record<FeatureAuditArea, string> = {
  commerce: "التجارة والمتجر",
  crm: "CRM والعملاء",
  marketing: "التسويق",
  communication: "التواصل",
  hr: "الموارد البشرية",
  analytics: "التحليلات",
  finance: "المالية",
  productivity: "الإنتاجية",
  integration: "التكاملات",
  platform: "المنصة",
  orders: "الطلبات والتنفيذ",
  shipping: "الشحن والتوصيل",
  warehouse: "المخزون والمستودعات",
  payments: "الدفع والتحصيل",
  procurement: "المشتريات والموردين",
  wholesale: "البيع بالجملة",
  accounting: "الفواتير والمحاسبة",
};

export const marketplaceFeatureMap: MarketplaceFeatureMapEntry[] = [
  {
    id: "platform-core",
    area: "platform",
    label: "أساسيات مساحة العمل",
    description: "الرئيسية، روابط الشركة، الحساب الشخصي، الدعم، الإعدادات العامة، وإدارة الشركة.",
    status: "core",
    routes: [
      { path: "/company-dashboard", label: "الرئيسية" },
      { path: "/my-companies/links", label: "روابط الشركة" },
      { path: "/profile", label: "الملف الشخصي" },
      { path: "/support", label: "الدعم" },
      { path: "/settings", label: "الإعدادات العامة" },
      { path: "/users", label: "إدارة المستخدمين" },
      { path: "/roles", label: "إدارة الصلاحيات" },
    ],
    action: "تظل Core لأنها مطلوبة لتشغيل الحساب نفسه ولا ينفع تتعطل باشتراك App.",
  },
  {
    id: "executable-mindmap",
    area: "productivity",
    label: "الخرائط الذهنية ومسارات العمل",
    description: "تخطيط شجري لا نهائي، وضع الشرح والتدريب السينمائي، وأتمتة تنفيذية للمهام والرسائل.",
    status: "covered",
    appSlug: "executable-mindmap",
    appLabel: "الخرائط الذهنية ومسارات العمل",
    currentGate: "executable-mindmap",
    routes: [
      { path: "/mindmap", label: "الخرائط الذهنية ومسارات العمل" },
    ],
    action: "تطبيق في متجر التطبيقات يربط التخطيط بالتدريب والأتمتة التنفيذية.",
  },
  {
    id: "orders-core",
    area: "orders",
    label: "إدارة الطلبات الأساسية",
    description: "قائمة الطلبات، التجهيز، الطلبات الناقصة، POS، الطلب اليدوي، والمرتجعات.",
    status: "covered",
    appSlug: "order-core",
    appLabel: "إدارة الطلبات - المستوى الأساسي",
    currentGate: "order-core",
    legacyGate: "store",
    routes: [
      { path: "/orders", label: "الطلبات" },
      { path: "/orders/preparation", label: "تجهيز الطلبات" },
      { path: "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP", label: "تجهيز الطلبات المعلقة" },
      { path: "/orders/incomplete", label: "الطلبات الناقصة" },
      { path: "/pos", label: "نقطة البيع" },
      { path: "/orders/manual", label: "طلب يدوي" },
      { path: "/returns", label: "المرتجعات" },
    ],
    action: "تم ربطها بـ order-core مع fallback مؤقت على ecommerce-basic للشركات القديمة.",
  },
  {
    id: "order-shipping",
    area: "shipping",
    label: "مركز وبوابة شركات الشحن",
    description: "إدارة شركات الشحن (QP Express، بوسطة Bosta، تربو Turbo، أرامكس، والمناديب)، سجلات الشحن، والتسويات.",
    status: "covered",
    appSlug: "order-shipping-turbo",
    appLabel: "بوابة وشركات الشحن الذكي",
    currentGate: "order-shipping-turbo",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/shipping-companies", label: "مركز شركات الشحن" },
      { path: "/orders/shipments", label: "سجلات الشحنات" },
      { path: "/shipping-settlement", label: "تسوية مستحقات الشحن" },
      { path: "/settings/turbo", label: "إعدادات Turbo" },
      { path: "/orders/turbo-records", label: "سجلات Turbo" },
      { path: "/orders/turbo-captains", label: "تقارير المندوبين" },
      { path: "/tickets", label: "تذاكر الدعم والشحن" },
    ],
    action: "تم ربط ظهور هذه الصفحات ببوابة شركات الشحن مع fallback على ecommerce-basic وباقات المتجر.",
  },
  {
    id: "internal-courier-fleet",
    area: "shipping",
    label: "أسطول المناديب والتوصيل الداخلي",
    description: "إدارة أسطول مناديب التوصيل الداخلي، رحلات التوزيع ومنافستات التسليم، الجرد والتحصيل الميداني، والتسوية المالية وتوريد الخزينة.",
    status: "covered",
    appSlug: "internal-courier-fleet",
    appLabel: "أسطول المناديب والتوصيل الداخلي",
    currentGate: "internal-courier-fleet",
    routes: [
      { path: "/shipping/couriers", label: "أسطول المناديب الداخلي" },
      { path: "/shipping/delivery-runs", label: "رحلات التوزيع والمانيفست" },
      { path: "/shipping/courier-settlements", label: "تسويات المناديب وتوريد الخزينة" },
    ],
    action: "تم ربط صفحات المناديب ورحلات التوزيع والتسويات بتطبيق أسطول المناديب والتوصيل الداخلي.",
  },
  {
    id: "order-invoicing",
    area: "accounting",
    label: "فواتير الطلبات",
    description: "فواتير الطلبات، إعدادات الفواتير، والفواتير الاحترافية.",
    status: "covered",
    appSlug: "order-invoicing",
    appLabel: "نظام الفواتير المتقدم",
    currentGate: "order-invoicing",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/orders/invoices", label: "فواتير الطلبات" },
      { path: "/settings/order-invoices", label: "إعدادات فواتير الطلبات" },
      { path: "/invoices", label: "فواتيري" },
    ],
    action: "تم ربط فواتير الطلبات بـ order-invoicing مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "storefront-conversion",
    area: "commerce",
    label: "أدوات تحويل المتجر",
    description: "عناصر PDP، العروض، ودجات النمو، أوضاع البيع، والمراجعات الاجتماعية.",
    status: "covered",
    appSlug: "conversion-suite",
    appLabel: "Conversion Suite",
    currentGate: "conversion-suite",
    legacyGate: "store",
    routes: [
      { path: "/settings/store/tools", label: "أدوات التحويل" },
    ],
    action: "تم ربط مجموعة التحويل بـ conversion-suite مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "inventory",
    area: "warehouse",
    label: "المخزون والمستودعات",
    description: "المخزون، المستودعات، الجرد، تحليلات وتقارير المخزون.",
    status: "covered",
    appSlug: "inventory-pro",
    appLabel: "إدارة المخزون المتقدمة",
    currentGate: "inventory-pro",
    legacyGate: "store",
    routes: [
      { path: "/inventory", label: "المخزون" },
      { path: "/inventory/warehouses", label: "المستودعات" },
      { path: "/inventory/audits", label: "الجرد" },
      { path: "/inventory/analytics", label: "تحليلات المخزون" },
      { path: "/inventory/reports", label: "تقارير المخزون" },
    ],
    action: "تم فصل المخزون وربطه بـ inventory-pro مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "cafe-restaurant-suite",
    area: "operations",
    label: "نظام الكافيهات والمطاعم",
    description: "معايير تصنيع المشروبات، تفكيك الخامات، جلسات الجرد، وخيارات التعديل.",
    status: "covered",
    appSlug: "cafe-restaurant-pro",
    appLabel: "نظام الكافيهات والمطاعم",
    currentGate: "cafe-restaurant-pro",
    legacyGate: "cafe-restaurant-pro",
    routes: [
      { path: "/cafe/recipes", label: "معايير الرسيبي" },
      { path: "/cafe/audits", label: "جلسات الجرد" },
      { path: "/cafe/modifiers", label: "خيارات المشروبات" },
    ],
    action: "تم ربط منظومة الكافيهات والمطاعم بـ cafe-restaurant-pro.",
  },
  {
    id: "crm-customers",
    area: "crm",
    label: "CRM والعملاء",
    description: "العملاء، العملاء المحتملون، الرحلة، الولاء، النقاط، والكاش باك.",
    status: "covered",
    appSlug: "crm-loyalty",
    appLabel: "CRM + نظام الولاء",
    currentGate: "crm-loyalty",
    legacyGate: "crm-basic",
    routes: [
      { path: "/customers", label: "العملاء" },
      { path: "/leads", label: "Leads" },
      { path: "/whatsapp/customer-journey", label: "رحلة واتساب" },
      { path: "/customers/loyalty-programs", label: "برامج الولاء" },
      { path: "/customers/loyalty-members", label: "أعضاء الولاء" },
      { path: "/customers/points-center", label: "مركز النقاط" },
      { path: "/customers/cashback", label: "Cashback" },
    ],
    action: "تم ربط العملاء والولاء بـ crm-loyalty مع fallback مؤقت على crm-basic.",
  },
  {
    id: "facebook-inbox",
    area: "crm",
    label: "Unified Inbox",
    description: "صندوق وارد موحد يجمع محادثات فيسبوك، واتساب، تليجرام، وإنستجرام في مكان واحد.",
    status: "covered",
    appSlug: "unified-inbox",
    appLabel: "Unified Inbox",
    currentGate: "unified-inbox",
    routes: [
      { path: "/unified-inbox", label: "Unified Inbox" },
      { path: "/unified-inbox/connections", label: "Platform Connections" },
    ],
    action: "مغطى بـ Unified Inbox مع Gating مستقل.",
  },
  {
    id: "whatsapp",
    area: "communication",
    label: "واتساب",
    description: "واتساب، الإعدادات، التنبيهات، التحليلات، وإشعارات العملاء.",
    status: "covered",
    appSlug: "whatsapp-business",
    appLabel: "WhatsApp Business API",
    currentGate: "whatsapp-business",
    routes: [
      { path: "/whatsapp", label: "واتساب" },
      { path: "/whatsapp/settings", label: "إعدادات واتساب" },
      { path: "/whatsapp/notifications", label: "تنبيهات واتساب" },
      { path: "/orders/whatsapp-notifications", label: "تنبيهات الطلبات" },
    ],
    action: "مغطى بتطبيق WhatsApp Business API الموحد بعد إزالة whatsapp-integration.",
  },
  {
    id: "bot-automation",
    area: "communication",
    label: "أتمتة المحادثات",
    description: "بوت محادثات بدون ذكاء اصطناعي: ردود بالكلمات، ترحيب، رد افتراضي، بدء محادثة، قائمة مسنجر، ودجت، فلوهات تفاعلية، أزرار، وشرائح.",
    status: "covered",
    appSlug: "bot-automation",
    appLabel: "أتمتة المحادثات",
    currentGate: "bot-automation",
    routes: [
      { path: "/automation/bot-studio", label: "البوت الآلي" },
    ],
    action: "مغطى بتطبيق أتمتة المحادثات المستقل.",
  },
  {
    id: "telegram",
    area: "communication",
    label: "تليجرام",
    description: "Telegram Pro، Userbot، الرد الآلي، الحملات، الجدولة، والجروبات.",
    status: "covered",
    appSlug: "telegram-integration",
    appLabel: "تكامل Telegram",
    currentGate: "telegram-integration",
    routes: [
      { path: "/telegram/pro", label: "Telegram Pro" },
      { path: "/telegram-userbot", label: "Userbot" },
      { path: "/telegram/auto-reply", label: "الرد الآلي" },
      { path: "/telegram/bulk-messages", label: "رسائل جماعية" },
      { path: "/telegram/scheduler", label: "الجدولة" },
      { path: "/telegram/groups", label: "الجروبات" },
    ],
    action: "مغطى، ويفضل توحيد telegram-business وtelegram-integration إذا كانا نفس المنتج.",
  },
  {
    id: "facebook-pages",
    area: "marketing",
    label: "صفحات فيسبوك",
    description: "ربط الصفحات، إدارة المحتوى، الرد على التعليقات، وتحليلات الصفحة.",
    status: "covered",
    appSlug: "facebook-pages-connect",
    appLabel: "ربط صفحات فيسبوك",
    currentGate: "facebook-pages-connect",
    routes: [
      { path: "/facebook/pages", label: "الصفحات" },
      { path: "/facebook/create-post", label: "إنشاء منشور" },
    ],
    action: "تطبيق مستقل لربط وإدارة صفحات فيسبوك.",
  },
  {
    id: "instagram-business",
    area: "communication",
    label: "انستجرام بزنس",
    description: "إدارة الرسائل والتعليقات والـ DMs على انستجرام، الرد الآلي، وتحليلات التفاعل.",
    status: "covered",
    appSlug: "instagram-business",
    appLabel: "انستجرام بزنس",
    currentGate: "instagram-business",
    routes: [
      { path: "/instagram-inbox", label: "صندوق انستجرام" },
      { path: "/settings/instagram", label: "إعدادات انستجرام" },
    ],
    action: "تطبيق مستقل لإدارة تفاعلات انستجرام.",
  },
  {
    id: "facebook-pixel",
    area: "marketing",
    label: "Facebook Pixel & CAPI",
    description: "Pixel tracking، Conversions API، أحداث قياسية، وتقارير التحويل.",
    status: "covered",
    appSlug: "facebook-pixel-capi",
    appLabel: "Pixel وتحليلات التحويل",
    currentGate: "facebook-pixel-capi",
    routes: [
      { path: "/advertising/facebook-pixel", label: "Facebook Pixel" },
      { path: "/advertising/google-tag-manager", label: "Google Tag Manager" },
    ],
    action: "تطبيق مستقل للتتبع والتحويل بعد فصله عن Ads Pro.",
  },
  {
    id: "tiktok-integrations",
    area: "marketing",
    label: "تكامل TikTok",
    description: "نشر المحتوى، ربط متجر TikTok Shop، تسجيل دخول العملاء، عرض الفيديوهات في المتجر، وتتبع أحداث الإعلانات.",
    status: "covered",
    appSlug: "tiktok-integrations",
    appLabel: "نشر وتجارة وتتبع TikTok",
    currentGate: "tiktok-integrations",
    routes: [
      { path: "/tiktok/publish", label: "نشر محتوى TikTok" },
      { path: "/tiktok/shop", label: "متجر TikTok Shop" },
      { path: "/tiktok/settings", label: "إعدادات TikTok" },
    ],
    action: "تطبيق مستقل للتكامل الرسمي مع TikTok.",
  },
  {
    id: "marketing-agency",
    area: "marketing",
    label: "إدارة وكالات التسويق",
    description: "لوحة عملاء الوكالة، متابعة الصرف والوتيرة الإعلانية، مسار إنتاج واعتماد المحتوى، وتوليد تقارير الأداء.",
    status: "covered",
    appSlug: "marketing-agency-pro",
    appLabel: "إدارة وكالات التسويق",
    currentGate: "marketing-agency-pro",
    routes: [
      { path: "/agency", label: "لوحة تحكم الوكالة" },
      { path: "/agency/approvals", label: "اعتمادات المحتوى" },
    ],
    action: "تطبيق متخصص لإدارة شركات ووكالات التسويق والميديا بايرز.",
  },
  {
    id: "facebook-ads",
    area: "marketing",
    label: "إعلانات فيسبوك",
    description: "إدارة الحملات، Audience Targeting، A/B Testing، Automation Rules، Budget Alerts، و Lead Forms.",
    status: "covered",
    appSlug: "facebook-ads-pro",
    appLabel: "إعلانات فيسبوك وانستجرام",
    currentGate: "facebook-ads-pro",
    legacyGate: "crm-basic",
    routes: [
      { path: "/advertising/facebook-ads", label: "Facebook Ads" },
      { path: "/advertising/facebook-ads/campaigns", label: "Campaigns" },
      { path: "/advertising/facebook-ads/ad-library", label: "Ad Library" },
      { path: "/advertising/facebook-ads/audiences", label: "Audiences" },
      { path: "/advertising/facebook-ads/tests", label: "A/B Tests" },
      { path: "/advertising/facebook-ads/automation-rules", label: "Automation Rules" },
      { path: "/advertising/facebook-ads/lead-forms", label: "Lead Forms" },
      { path: "/advertising/facebook-ads/budget-alerts", label: "Budget Alerts" },
    ],
    action: "تطبيق مستقل للإعلانات بعد فصل Pixel و Catalog.",
  },
  {
    id: "facebook-catalog",
    area: "marketing",
    label: "Facebook Catalog & Shop",
    description: "مزامنة الكتالوج، Dynamic Ads، Instagram Shop، Facebook Shops، وإدارة المخزون.",
    status: "covered",
    appSlug: "facebook-catalog-shop",
    appLabel: "كتالوج ومتجر فيسبوك",
    currentGate: "facebook-catalog-shop",
    routes: [
      { path: "/advertising/facebook-ads/catalogs", label: "Catalogs" },
    ],
    action: "تطبيق مستقل بعد توسيع نطاق Catalog Sync ليشمل Shops والمخزون.",
  },
  {
    id: "facebook-post",
    area: "marketing",
    label: "منشورات فيسبوك",
    description: "إنشاء ونشر منشورات فيسبوك، إضافة الصور، وجدولة النشر على الصفحات.",
    status: "covered",
    appSlug: "facebook-post",
    appLabel: "إنشاء منشور فيسبوك",
    currentGate: "facebook-post",
    legacyGate: "facebook-pages-connect",
    routes: [
      { path: "/facebook/create-post", label: "إنشاء منشور" },
    ],
    action: "تطبيق مستقل لنشر المحتوى على الصفحات بعد ربطها بـ facebook-pages-connect.",
  },
  {
    id: "broadcast",
    area: "marketing",
    label: "البث والحملات",
    description: "Broadcast، إنشاء منشورات فيسبوك، الرسائل الجماعية، وأتمتة الحملات.",
    status: "covered",
    appSlug: "broadcast-pro",
    appLabel: "نظام البث المتقدم",
    currentGate: "broadcast-pro",
    legacyGate: "crm-basic",
    routes: [
      { path: "/broadcast", label: "Broadcast" },
      { path: "/facebook/create-post", label: "إنشاء منشور" },
      { path: "/telegram/bulk-messages", label: "رسائل تليجرام جماعية" },
    ],
    action: "تم فصل البث عن CRM وربطه بـ broadcast-pro مع fallback مؤقت على crm-basic.",
  },
  {
    id: "analytics",
    area: "analytics",
    label: "التحليلات المتقدمة",
    description: "تحليلات الطلبات، الإيراد، المنتجات، الربح، التحويل، السلة المتروكة، والفريق.",
    status: "covered",
    appSlug: "analytics-advanced",
    appLabel: "التحليلات المتقدمة",
    currentGate: "analytics-advanced",
    routes: [
      { path: "/analytics/orders", label: "Orders Overview" },
      { path: "/analytics/orders/orders", label: "Orders Analytics" },
      { path: "/analytics/orders/revenue", label: "Revenue" },
      { path: "/analytics/orders/profit", label: "Profit" },
      { path: "/analytics/orders/cancellations", label: "Cancellation Reasons" },
      { path: "/analytics/orders/funnel", label: "Funnel" },
      { path: "/analytics/orders/abandoned-cart", label: "Abandoned Cart" },
      { path: "/reports/profit-loss", label: "Profit & Loss" },
      { path: "/reports/status-analysis", label: "Status Analysis" },
    ],
    action: "مغطى. يمكن فصل shipping reports تحت order-shipping-reports لو احتجنا تسعير أدق.",
  },
  {
    id: "orders-analytics",
    area: "analytics",
    label: "تحليلات الطلبات",
    description: "لوحة تحليلات الطلبات المستقلة: إجمالي الطلبات، الحالات، المقارنات الزمنية.",
    status: "covered",
    appSlug: "orders-analytics",
    appLabel: "تحليلات الطلبات",
    currentGate: "orders-analytics",
    legacyGate: "analytics-basic",
    routes: [
      { path: "/analytics/orders/orders", label: "Orders Analytics" },
    ],
    action: "تطبيق مستقل لتقارير تحليلات الطلبات في تصنيف التحليلات.",
  },
  {
    id: "hr-core",
    area: "hr",
    label: "HR الأساسي",
    description: "الموظفون، الأقسام، السياسات، التقارير العامة، وإعدادات HR.",
    status: "covered",
    appSlug: "hr-core",
    appLabel: "نظام HR الأساسي",
    currentGate: "hr-core",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr", label: "HR Dashboard" },
      { path: "/hr/employees", label: "الموظفون" },
      { path: "/hr/departments", label: "الأقسام" },
      { path: "/hr/company-policy", label: "سياسة الشركة" },
      { path: "/hr/settings", label: "إعدادات HR" },
      { path: "/hr/online", label: "الفريق المتصل" },
      { path: "/hr/reports-hub", label: "مركز التقارير" },
      { path: "/hr/audit-logs", label: "سجلات التدقيق" },
    ],
    action: "مغطى كتطبيق أساسي، مع دعم hr-basic كـ fallback قديم.",
  },
  {
    id: "hr-attendance",
    area: "hr",
    label: "الحضور والانصراف والورديات",
    description: "الحضور، الورديات، الإجازات، الأذونات، والتقارير الذاتية للموظف.",
    status: "covered",
    appSlug: "hr-attendance-pro",
    appLabel: "الحضور والانصراف والورديات",
    currentGate: "hr-attendance-pro",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/attendance", label: "الحضور" },
      { path: "/hr/shifts", label: "الورديات" },
      { path: "/hr/leaves", label: "الإجازات" },
      { path: "/hr/permissions", label: "الأذونات" },
      { path: "/my-attendance", label: "حضوري" },
      { path: "/my-leaves", label: "إجازاتي" },
      { path: "/my-permissions", label: "أذوناتي" },
    ],
    action: "تم ربط الحضور والورديات بـ hr-attendance-pro مع fallback على hr-core/hr-basic.",
  },
  {
    id: "hr-payroll",
    area: "hr",
    label: "الرواتب والمستحقات",
    description: "الرواتب، السلف، الخصومات، التاريخ، المزايا، والصفحات الذاتية.",
    status: "covered",
    appSlug: "hr-payroll",
    appLabel: "مسير الرواتب والمستحقات",
    currentGate: "hr-payroll",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/payroll", label: "الرواتب" },
      { path: "/hr/advances", label: "السلف" },
      { path: "/hr/deductions", label: "الخصومات" },
      { path: "/hr/salary-history", label: "سجل الراتب" },
      { path: "/hr/benefits", label: "المزايا" },
      { path: "/my-payroll", label: "راتبي" },
      { path: "/my-advances", label: "سلفي" },
      { path: "/my-deductions", label: "خصوماتي" },
      { path: "/my-performance", label: "تقييم أدائي" },
    ],
    action: "تم ربط الرواتب بـ hr-payroll مع fallback على hr-core/hr-basic.",
  },
  {
    id: "hr-recruitment",
    area: "hr",
    label: "التوظيف واستبيانات العمل",
    description: "نشر الوظائف، استبيانات التقديم، مسار تتبع المتقدمين، وتقارير العمل.",
    status: "covered",
    appSlug: "hr-recruitment",
    appLabel: "نظام التوظيف واستبيانات العمل",
    currentGate: "hr-recruitment",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/recruitment", label: "التوظيف" },
      { path: "/hr/reporting/forms", label: "نماذج تقارير العمل" },
    ],
    action: "تطبيق مستقل لإدارة مسار التوظيف واستبيانات العمل مع fallback على hr-core/hr-basic.",
  },
  {
    id: "hr-assets-performance",
    area: "hr",
    label: "العهد والأصول وتقييم الأداء",
    description: "إدارة العهد، تقييم الأداء، التدريب، المكافآت، الإنذارات، والاستقالات.",
    status: "covered",
    appSlug: "hr-assets",
    appLabel: "إدارة العهد والأصول وتقييم الأداء",
    currentGate: "hr-assets",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/assets", label: "العهد والأصول" },
      { path: "/hr/performance-reviews", label: "تقييم الأداء" },
      { path: "/hr/performance-360", label: "لوحة تقييم الفريق 360°" },
      { path: "/hr/training", label: "التدريب" },
      { path: "/hr/rewards", label: "المكافآت" },
      { path: "/hr/warnings", label: "الإنذارات" },
      { path: "/hr/promotions", label: "الترقيات" },
      { path: "/hr/resignations", label: "الاستقالات" },
      { path: "/my-custody", label: "عهدتي" },
      { path: "/my-rewards", label: "مكافآتي" },
      { path: "/my-training", label: "تدريبي" },
      { path: "/my-warnings", label: "إنذاراتي" },
      { path: "/my-promotions", label: "ترقياتي" },
      { path: "/my-resignation", label: "استقالتي" },
      { path: "/my-feedback", label: "مقترحاتي" },
    ],
    action: "تم ربط العهد والأداء بـ hr-assets مع fallback على hr-core/hr-basic.",
  },
  {
    id: "appointments",
    area: "productivity",
    label: "المواعيد",
    description: "حجوزات المواعيد وجدولة الأوقات المتاحة وإدارة الحالات.",
    status: "covered",
    appSlug: "booking-app",
    appLabel: "حجوزات المواعيد",
    currentGate: "booking-app",
    routes: [
      { path: "/appointments", label: "المواعيد" },
    ],
    action: "تم ربط المواعيد بـ booking-app كتطبيق مستقل.",
  },
  {
    id: "productivity",
    area: "productivity",
    label: "المهام والمشاريع",
    description: "المهام، الأهداف، المشاريع، التصنيفات، وإعدادات التكاملات.",
    status: "covered",
    appSlug: "smart-scheduler",
    appLabel: "الجدولة الذكية للمهام",
    currentGate: "business-tools",
    routes: [
      { path: "/tasks", label: "المهام" },
      { path: "/goals", label: "الأهداف" },
      { path: "/tasks/projects", label: "مشاريع المهام" },
      { path: "/tasks/integrations", label: "تكاملات المهام" },
    ],
    action: "تم ربط المهام والمشاريع بـ smart-scheduler.",
  },
  {
    id: "integrations",
    area: "integration",
    label: "التكاملات الخارجية",
    description: "WooCommerce، Webhooks، Platform integrations، API automation.",
    status: "covered",
    appSlug: "webhooks-pro",
    appLabel: "Webhooks & API Pro",
    currentGate: "webhooks-pro",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/woocommerce-sync", label: "WooCommerce Sync" },
      { path: "/platform-integrations", label: "Platform Integrations" },
      { path: "/tasks/integrations", label: "Task Integrations" },
    ],
    action: "تم ربط Webhooks/API بـ webhooks-pro مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "wallet-billing",
    area: "finance",
    label: "المحفظة والاشتراكات",
    description: "محفظة العميل، محفظة الفوترة، المدفوعات، الاشتراكات، والتجديد.",
    status: "covered",
    appSlug: "wallet-system",
    appLabel: "نظام المحفظة الإلكترونية",
    currentGate: "wallet-system",
    routes: [
      { path: "/wallet", label: "محفظة العميل" },
      { path: "/billing/wallet", label: "محفظة الفوترة" },
      { path: "/payments", label: "مدفوعاتي" },
      { path: "/subscription", label: "اشتراكي" },
    ],
    action: "تم ربط المحفظة بـ wallet-system، مع بقاء الاشتراك الأساسي Core لأنه لازم لتشغيل الحساب.",
  },
  {
    id: "treasury-expenses",
    area: "finance",
    label: "الخزينة والنفقات ورأس المال",
    description: "إدارة نفقات ومصروفات الشركة، تتبع الخزائن النقدية والحسابات، وضخ رأس المال وكشف الحساب الموحد.",
    status: "covered",
    appSlug: "treasury-expenses-pro",
    appLabel: "الخزينة والنفقات ورأس المال",
    currentGate: "treasury-expenses-pro",
    routes: [
      { path: "/treasury-expenses", label: "الخزينة والنفقات" },
      { path: "/expenses", label: "سجل النفقات" },
      { path: "/treasury", label: "الخزائن ورأس المال" },
    ],
    action: "تطبيق مستقل لإدارة النفقات والخزائن ورأس المال بدقة FinOps ومنع السحب على المكشوف.",
  },
  {
    id: "procurement",
    area: "procurement",
    label: "المشتريات والموردين",
    description: "الموردون، أوامر الشراء، فواتير الشراء، ومدفوعات الموردين.",
    status: "covered",
    appSlug: "procurement-pro",
    appLabel: "Procurement Pro",
    currentGate: "procurement-pro",
    routes: [
      { path: "/procurement/dashboard", label: "لوحة المشتريات" },
      { path: "/procurement/suppliers", label: "الموردون" },
      { path: "/procurement/purchase-orders", label: "أوامر الشراء" },
      { path: "/procurement/purchase-invoices", label: "فواتير الشراء" },
      { path: "/procurement/supplier-payments", label: "مدفوعات الموردين" },
    ],
    action: "تم تجهيز procurement-pro كتطبيق مستقل للمشتريات والموردين.",
  },
  {
    id: "affiliate",
    area: "marketing",
    label: "الأفليت والدروب شيبنج",
    description: "إدارة الأفليت، كتالوج منتجات الشركة للمسوقين، العمولات، الإعدادات، والتجار.",
    status: "covered",
    appSlug: "affiliate-pro",
    appLabel: "Affiliate Pro",
    currentGate: "affiliate-pro",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/affiliates/management", label: "إدارة الأفليت" },
      { path: "/affiliates/products",   label: "منتجات الأفليت" },
      { path: "/affiliates/products/visibility", label: "إدارة ظهور المنتجات للمسوقين" },
      { path: "/merchants", label: "التجار والدروب شيبنج" },
      { path: "/affiliates/commission", label: "العمولات" },
      { path: "/affiliates/settings", label: "إعدادات الأفليت" },
    ],
    action: "تم تجهيز affiliate-pro وربط إدارة الأفليت به مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "amazonAffiliate",
    area: "marketing",
    label: "أمازون أفليت",
    description: "استيراد منتجات أمازون، ربط حساب Amazon Associates، مزامنة الأسعار والمخزون، زر الشراء من أمازون، والتوجيه حسب بلد الزائر.",
    status: "covered",
    appSlug: "amazon-affiliate-pro",
    appLabel: "Amazon Affiliate",
    currentGate: "amazon-affiliate-pro",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/amazon-affiliate/settings", label: "إعدادات أمازون أفليت" },
      { path: "/amazon-affiliate/import",   label: "استيراد المنتجات" },
      { path: "/amazon-affiliate/products", label: "المنتجات المستوردة" },
    ],
    action: "تم تجهيز amazon-affiliate-pro كتطبيق مستقل لأفليت أمازون.",
  },
  {
    id: "notifications",
    area: "productivity",
    label: "التنبيهات والتذكيرات",
    description: "الإشعارات، التذكيرات، إعدادات التنبيهات، والتنبيهات الذكية.",
    status: "covered",
    appSlug: "notification-automation",
    appLabel: "Notification Automation",
    currentGate: "notification-automation",
    routes: [
      { path: "/notifications", label: "الإشعارات" },
      { path: "/reminders", label: "التذكيرات" },
      { path: "/notification-settings", label: "إعدادات التنبيهات" },

    ],
    action: "تم تجهيز notification-automation وربط التنبيهات والتذكيرات به.",
  },
  {
    id: "wholesale",
    area: "wholesale",
    label: "البيع بالجملة",
    description: "قوائم الأسعار، عملاء الجملة، كشوف الحساب، المديونية، وبوابة الموزعين.",
    status: "covered",
    appSlug: "wholesale-pro",
    appLabel: "البيع بالجملة",
    currentGate: "wholesale-pro",
    routes: [
      { path: "/wholesale/dashboard", label: "لوحة الجملة" },
      { path: "/wholesale/price-lists", label: "قوائم الأسعار" },
      { path: "/wholesale/price-lists/:id", label: "قائمة أسعار" },
      { path: "/wholesale/customers", label: "عملاء الجملة" },
      { path: "/wholesale/customers/:id", label: "عميل جملة" },
      { path: "/wholesale/statements", label: "كشوف الحساب" },
      { path: "/wholesale/debts", label: "المديونية" },
    ],
    action: "تم تجهيز wholesale-pro لربط البيع بالجملة.",
  },
  {
    id: "pos",
    area: "commerce",
    label: "نظام POS",
    description: "نقطة البيع، الكاشير، البيع السريع، وفواتير البيع الفورية.",
    status: "covered",
    appSlug: "pos-pro",
    appLabel: "نظام POS",
    currentGate: "pos-pro",
    legacyGate: "store-pro",
    routes: [
      { path: "/pos", label: "نقطة البيع" },
    ],
    action: "فصل نظام POS إلى تطبيق مستقل pos-pro مع grandfathering عبر store-pro.",
  },
  {
    id: "coupons",
    area: "marketing",
    label: "الكوبونات والعروض الترويجية",
    description: "كوبونات الخصم، العروض الترويجية، وتتبع أداء الكوبونات.",
    status: "covered",
    appSlug: "coupons-pro",
    appLabel: "الكوبونات والعروض",
    currentGate: "coupons-pro",
    legacyGate: "store-pro",
    routes: [
      { path: "/coupons", label: "الكوبونات" },
      { path: "/settings/promotion", label: "عروض الشحن المجاني" },
      { path: "/settings/store-promotion", label: "عروض المتجر" },
    ],
    action: "فصل الكوبونات والعروض إلى تطبيق مستقل coupons-pro مع grandfathering عبر store-pro.",
  },
  {
    id: "woocommerce",
    area: "integration",
    label: "تكامل WooCommerce",
    description: "مزامنة المنتجات والطلبات والمخزون مع WooCommerce.",
    status: "covered",
    appSlug: "woocommerce-pro",
    appLabel: "تكامل WooCommerce",
    currentGate: "woocommerce-pro",
    legacyGate: "store-pro",
    routes: [
      { path: "/orders/woocommerce-sync", label: "مزامنة WooCommerce" },
    ],
    action: "فصل تكامل WooCommerce إلى تطبيق مستقل woocommerce-pro مع grandfathering عبر store-pro.",
  },
  {
    id: "multi-warehouse",
    area: "warehouse",
    label: "المخزون المتعدد",
    description: "مستودعات متعددة، تحويلات المخزون، وتوزيع الكميات على الفروع.",
    status: "covered",
    appSlug: "multi-warehouse-pro",
    appLabel: "المخزون المتعدد",
    currentGate: "multi-warehouse-pro",
    legacyGate: "store-pro",
    routes: [
      { path: "/inventory/warehouses", label: "المستودعات" },
      { path: "/inventory", label: "المخزون" },
    ],
    action: "فصل إدارة المخزون المتعدد إلى تطبيق مستقل multi-warehouse-pro مع grandfathering عبر store-pro.",
  },
  {
    id: "order-sources-accounting",
    area: "orders",
    label: "مصادر الطلبات والمحاسبة",
    description: "تتبع مصدر كل طلب (متجر، يدوي، فيسبوك، واتساب، استيراد) مع محاسبة منفصلة لكل مصدر.",
    status: "covered",
    appSlug: "order-accounting-sources",
    appLabel: "مصادر الطلبات والمحاسبة",
    currentGate: "order-accounting-sources",
    legacyGate: "order-source-tracking",
    routes: [
      { path: "/orders", label: "الطلبات" },
      { path: "/analytics/orders", label: "تحليلات الطلبات" },
    ],
    action: "تتبع مصادر الطلبات مع محاسبة منفصلة لكل قناة عبر order-accounting-sources.",
  },
  {
    id: "manual-orders",
    area: "orders",
    label: "الطلب اليدوي",
    description: "إنشاء طلبات يدوية من صفحة مخصصة مع اختيار المنتجات والعميل والدفع والشحن.",
    status: "covered",
    appSlug: "manual-orders-pro",
    appLabel: "الطلب اليدوي",
    currentGate: "manual-orders-pro",
    legacyGate: "order-core",
    routes: [
      { path: "/orders/manual", label: "الطلب اليدوي" },
    ],
    action: "فصل الطلب اليدوي إلى تطبيق مستقل manual-orders-pro مع محاسبة مصدره.",
  },
  {
    id: "order-automation",
    area: "orders",
    label: "أتمتة الحالات",
    description: "تغيير حالة الطلبات تلقائياً بعد مرور وقت محدد أو عند حدوث حدث معين.",
    status: "covered",
    appSlug: "order-automation",
    appLabel: "أتمتة الحالات",
    currentGate: "order-automation",
    legacyGate: "order-core",
    routes: [
      { path: "/orders/automation", label: "أتمتة الحالات" },
    ],
    action: "ربط أتمتة الحالات بتطبيق مستقل order-automation.",
  },
  {
    id: "bulk-search",
    area: "orders",
    label: "البحث المجمع",
    description: "بحث مجمع عن الطلبات بالرقم أو التليفون واسترجاع عدة طلبات دفعة واحدة.",
    status: "covered",
    appSlug: "bulk-search",
    appLabel: "البحث المجمع",
    currentGate: "bulk-search",
    legacyGate: "order-core",
    routes: [
      { path: "/bulk-search", label: "البحث المجمع" },
    ],
    action: "ربط البحث المجمع بتطبيق مستقل bulk-search.",
  },
  {
    id: "customer-blocks",
    area: "orders",
    label: "حظر العملاء",
    description: "إدارة قائمة حظر العملاء ومنع العملاء غير المرغوب فيهم من إتمام الطلبات.",
    status: "covered",
    appSlug: "customer-blocks",
    appLabel: "حظر العملاء",
    currentGate: "customer-blocks",
    legacyGate: "order-core",
    routes: [
      { path: "/settings/customer-blocks", label: "حظر العملاء" },
    ],
    action: "ربط حظر العملاء بتطبيق مستقل customer-blocks.",
  },
  {
    id: "bulk-orders",
    area: "orders",
    label: "الطلبات الجماعية",
    description: "تنفيذ عمليات جماعية على الطلبات — تغيير الحالة، الحذف، والطباعة لعدد كبير من الطلبات.",
    status: "covered",
    appSlug: "bulk-orders",
    appLabel: "الطلبات الجماعية",
    currentGate: "bulk-orders",
    legacyGate: "order-core",
    routes: [
      { path: "/orders/bulk", label: "الطلبات الجماعية" },
    ],
    action: "ربط الطلبات الجماعية بتطبيق مستقل bulk-orders.",
  },
  {
    id: "quick-status",
    area: "orders",
    label: "التغيير السريع للحالة",
    description: "تغيير حالة الطلبات بسرعة بدون فتح كل طلب — تحديث مباشر من قائمة الطلبات.",
    status: "covered",
    appSlug: "quick-status",
    appLabel: "التغيير السريع للحالة",
    currentGate: "quick-status",
    legacyGate: "order-core",
    routes: [
      { path: "/orders/quick-status", label: "التغيير السريع للحالة" },
    ],
    action: "ربط التغيير السريع للحالة بتطبيق مستقل quick-status.",
  },
  {
    id: "status-summary",
    area: "orders",
    label: "ملخص حالات الطلبات",
    description: "ملخص فوري لتوزيع حالات الطلبات وعدد الطلبات في كل حالة.",
    status: "covered",
    appSlug: "status-summary",
    appLabel: "ملخص حالات الطلبات",
    currentGate: "status-summary",
    legacyGate: "order-core",
    routes: [
      { path: "/orders/status-summary", label: "ملخص حالات الطلبات" },
    ],
    action: "ربط ملخص حالات الطلبات بتطبيق مستقل status-summary.",
  },
  {
    id: "returns-settings",
    area: "orders",
    label: "إعدادات المرتجعات",
    description: "إعدادات نظام المرتجعات — أسباب الإرجاع والشروط والسياسات.",
    status: "covered",
    appSlug: "returns-settings",
    appLabel: "إعدادات المرتجعات",
    currentGate: "returns-settings",
    legacyGate: "order-core",
    routes: [
      { path: "/returns/settings", label: "إعدادات المرتجعات" },
    ],
    action: "ربط إعدادات المرتجعات بتطبيق مستقل returns-settings.",
  },
  {
    id: "order-workflow",
    area: "orders",
    label: "مسار الطلبات",
    description: "تخصيص مسار الطلبات — ترتيب الحالات وتسلسل المعالجة.",
    status: "covered",
    appSlug: "order-workflow",
    appLabel: "مسار الطلبات",
    currentGate: "order-workflow",
    legacyGate: "order-core",
    routes: [
      { path: "/settings/order-workflow", label: "مسار الطلبات" },
    ],
    action: "ربط مسار الطلبات بتطبيق مستقل order-workflow.",
  },
  {
    id: "cod-deposit",
    area: "payments",
    label: "الدفعة المقدمة COD",
    description: "طلب دفعة مقدمة على طلبات COD لتقليل المرتجعات.",
    status: "covered",
    appSlug: "cod-deposit",
    appLabel: "COD Deposit",
    currentGate: "cod-deposit",
    legacyGate: "order-core",
    routes: [
      { path: "/settings/cod-deposit", label: "الدفعة المقدمة COD" },
    ],
    action: "ربط الدفعة المقدمة COD بتطبيق مستقل cod-deposit.",
  },
  {
    id: "google-tag-manager",
    area: "marketing",
    label: "Google Tag Manager",
    description: "إعداد Google Tag Manager وربط حاوية GTM وأكواد التتبع.",
    status: "covered",
    appSlug: "google-tag-manager",
    appLabel: "Google Tag Manager",
    currentGate: "google-tag-manager",
    legacyGate: "facebook-pixel-capi",
    routes: [
      { path: "/advertising/google-tag-manager", label: "Google Tag Manager" },
    ],
    action: "ربط Google Tag Manager بتطبيق مستقل google-tag-manager.",
  },
];

export const getMarketplaceFeatureAudit = (
  marketplaceSlugs: Iterable<string>,
  entries: MarketplaceFeatureMapEntry[] = marketplaceFeatureMap,
): MarketplaceFeatureAuditEntry[] => {
  const slugSet = new Set(Array.from(marketplaceSlugs, (slug) => slug.toLowerCase()));

  return entries.map((entry) => {
    const appExists = entry.appSlug ? slugSet.has(entry.appSlug.toLowerCase()) : false;
    const effectiveStatus =
      entry.status === "core"
        ? "core"
        : entry.appSlug && !appExists
          ? "missing-app"
          : entry.status === "covered"
            ? "covered"
            : "needs-granular-gate";

    return {
      ...entry,
      appExists,
      effectiveStatus,
    };
  });
};

export const getFeatureAuditSummary = (
  entries: MarketplaceFeatureAuditEntry[],
): FeatureAuditSummary =>
  entries.reduce<FeatureAuditSummary>(
    (summary, entry) => {
      summary.total += 1;

      if (entry.effectiveStatus === "core") {
        summary.core += 1;
      } else if (entry.effectiveStatus === "covered") {
        summary.covered += 1;
      } else if (entry.effectiveStatus === "needs-granular-gate") {
        summary.needsGranularGate += 1;
      } else {
        summary.missingApp += 1;
      }

      return summary;
    },
    {
      total: 0,
      core: 0,
      covered: 0,
      needsGranularGate: 0,
      missingApp: 0,
    },
  );
