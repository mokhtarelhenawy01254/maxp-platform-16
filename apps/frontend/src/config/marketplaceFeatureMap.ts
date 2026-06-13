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
  | "platform";

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
    id: "orders-core",
    area: "commerce",
    label: "إدارة الطلبات الأساسية",
    description: "قائمة الطلبات، التجهيز، الطلبات الناقصة، POS، الطلب اليدوي، والمرتجعات.",
    status: "covered",
    appSlug: "order-core",
    appLabel: "إدارة الطلبات - المستوى الأساسي",
    currentGate: "order-core",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/orders", label: "الطلبات" },
      { path: "/orders/preparation", label: "تجهيز الطلبات" },
      { path: "/orders/incomplete", label: "الطلبات الناقصة" },
      { path: "/pos", label: "نقطة البيع" },
      { path: "/orders/manual", label: "طلب يدوي" },
      { path: "/returns", label: "المرتجعات" },
    ],
    action: "تم ربطها بـ order-core مع fallback مؤقت على ecommerce-basic للشركات القديمة.",
  },
  {
    id: "order-shipping",
    area: "commerce",
    label: "الشحن و Turbo",
    description: "إعدادات Turbo، شركات الشحن، سجلات الشحن، وتذاكر Turbo.",
    status: "covered",
    appSlug: "order-shipping-turbo",
    appLabel: "شحن Turbo الذكي",
    currentGate: "order-shipping-turbo",
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/settings/turbo", label: "إعدادات Turbo" },
      { path: "/orders/turbo-records", label: "سجلات Turbo" },
      { path: "/tickets", label: "تذاكر Turbo" },
      { path: "/shipping-companies", label: "شركات الشحن" },
    ],
    action: "تم ربط ظهور هذه الصفحات بـ order-shipping-turbo مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "order-invoicing",
    area: "finance",
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
    legacyGate: "ecommerce-basic",
    routes: [
      { path: "/settings/store/product-conversion", label: "أدوات التحويل" },
      { path: "/settings/store/offers-bundles", label: "العروض والباقات" },
      { path: "/settings/store/growth-widgets", label: "ودجات الموقع" },
      { path: "/settings/store/selling-modes", label: "أوضاع البيع" },
      { path: "/settings/store/reviews-social-proof", label: "المراجعات والثقة" },
    ],
    action: "تم ربط مجموعة التحويل بـ conversion-suite مع fallback مؤقت على ecommerce-basic.",
  },
  {
    id: "inventory",
    area: "commerce",
    label: "المخزون والمستودعات",
    description: "المخزون، المستودعات، الجرد، تحليلات وتقارير المخزون.",
    status: "covered",
    appSlug: "inventory-pro",
    appLabel: "إدارة المخزون المتقدمة",
    currentGate: "inventory-pro",
    legacyGate: "ecommerce-basic",
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
    label: "Inbox وفيسبوك CRM",
    description: "محادثات فيسبوك، Unified Inbox، التعليقات، الردود الذكية، وتتبع المنتجات.",
    status: "covered",
    appSlug: "crm-basic",
    appLabel: "CRM الأساسي",
    currentGate: "crm-basic",
    routes: [
      { path: "/facebook-inbox", label: "Facebook Inbox" },
      { path: "/instagram-inbox", label: "Instagram Inbox" },
      { path: "/unified-inbox", label: "Unified Inbox" },
      { path: "/unified-comments", label: "Unified Comments" },
      { path: "/settings/smart-replies", label: "الردود الذكية" },
      { path: "/settings/instagram", label: "إعدادات إنستجرام" },
    ],
    action: "مغطى حالياً، لكن يمكن فصل smart replies لاحقاً كتطبيق CRM مستقل.",
  },
  {
    id: "whatsapp",
    area: "communication",
    label: "واتساب",
    description: "واتساب، الإعدادات، التنبيهات، التحليلات، وإشعارات العملاء.",
    status: "covered",
    appSlug: "whatsapp-integration",
    appLabel: "تكامل WhatsApp Business",
    currentGate: "whatsapp-integration",
    routes: [
      { path: "/whatsapp", label: "واتساب" },
      { path: "/whatsapp/settings", label: "إعدادات واتساب" },
      { path: "/whatsapp/notifications", label: "تنبيهات واتساب" },
      { path: "/whatsapp/analytics", label: "تحليلات واتساب" },
      { path: "/orders/whatsapp-notifications", label: "تنبيهات الطلبات" },
    ],
    action: "مغطى، ويفضل توحيد whatsapp-business وwhatsapp-integration مستقبلاً لمنع ازدواجية التسعير.",
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
    id: "facebook-ads",
    area: "marketing",
    label: "إعلانات فيسبوك والكتالوج",
    description: "Pixel، GTM، Ads dashboard، مكتبة الإعلانات، الجماهير، الكتالوجات، الاختبارات، والتحسينات.",
    status: "covered",
    appSlug: "facebook-ads-pro",
    appLabel: "Facebook & Instagram Ads Pro",
    currentGate: "facebook-ads-pro",
    legacyGate: "crm-basic",
    routes: [
      { path: "/advertising/facebook-pixel", label: "Facebook Pixel" },
      { path: "/advertising/google-tag-manager", label: "Google Tag Manager" },
      { path: "/advertising/facebook-ads", label: "Facebook Ads" },
      { path: "/advertising/facebook-ads/ad-library", label: "Ad Library" },
      { path: "/advertising/facebook-ads/audiences", label: "Audiences" },
      { path: "/advertising/facebook-ads/catalogs", label: "Catalogs" },
      { path: "/advertising/facebook-ads/tests", label: "A/B Tests" },
    ],
    action: "تم نقل صفحات الإعلانات إلى facebook-ads-pro مع fallback مؤقت على crm-basic.",
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
      { path: "/analytics", label: "Advanced Analytics" },
      { path: "/analytics/orders", label: "Orders Overview" },
      { path: "/analytics/orders/revenue", label: "Revenue" },
      { path: "/analytics/orders/profit", label: "Profit" },
      { path: "/analytics/orders/cancellations", label: "Cancellation Reasons" },
      { path: "/analytics/orders/funnel", label: "Funnel" },
      { path: "/analytics/orders/abandoned-cart", label: "Abandoned Cart" },
    ],
    action: "مغطى. يمكن فصل shipping reports تحت order-shipping-reports لو احتجنا تسعير أدق.",
  },
  {
    id: "hr-core",
    area: "hr",
    label: "HR الأساسي",
    description: "الموظفون، الأقسام، السياسات، التقارير العامة، وإعدادات HR.",
    status: "covered",
    appSlug: "hr-basic",
    appLabel: "إدارة الموارد البشرية الأساسية",
    currentGate: "hr-basic",
    routes: [
      { path: "/hr", label: "HR Dashboard" },
      { path: "/hr/employees", label: "الموظفون" },
      { path: "/hr/departments", label: "الأقسام" },
      { path: "/hr/company-policy", label: "سياسة الشركة" },
      { path: "/hr/settings", label: "إعدادات HR" },
    ],
    action: "مغطى كتطبيق أساسي، مع فصل الحضور والرواتب والأصول والتوظيف كتطبيقات أدق.",
  },
  {
    id: "hr-attendance",
    area: "hr",
    label: "الحضور والانصراف",
    description: "الحضور، الورديات، الإجازات، الأذونات، والتقارير الذاتية للموظف.",
    status: "covered",
    appSlug: "hr-attendance-pro",
    appLabel: "الحضور والانصراف المتقدم",
    currentGate: "hr-attendance-pro",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/attendance", label: "الحضور" },
      { path: "/hr/shifts", label: "الورديات" },
      { path: "/hr/leaves", label: "الإجازات" },
      { path: "/hr/permissions", label: "الأذونات" },
      { path: "/my-attendance", label: "حضوري" },
      { path: "/my-leaves", label: "إجازاتي" },
    ],
    action: "تم ربط الحضور والورديات بـ hr-attendance-pro مع fallback مؤقت على hr-basic.",
  },
  {
    id: "hr-payroll",
    area: "hr",
    label: "الرواتب والمستحقات",
    description: "الرواتب، السلف، الخصومات، التاريخ، المزايا، والصفحات الذاتية.",
    status: "covered",
    appSlug: "hr-payroll",
    appLabel: "نظام الرواتب",
    currentGate: "hr-payroll",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/payroll", label: "الرواتب" },
      { path: "/hr/advances", label: "السلف" },
      { path: "/hr/deductions", label: "الخصومات" },
      { path: "/hr/salary-history", label: "سجل الراتب" },
      { path: "/my-payroll", label: "راتبي" },
      { path: "/my-advances", label: "سلفي" },
    ],
    action: "تم ربط الرواتب بـ hr-payroll مع fallback مؤقت على hr-basic.",
  },
  {
    id: "hr-talent-assets",
    area: "hr",
    label: "الأصول والتوظيف والتقدير",
    description: "الأصول، التوظيف، التدريب، الأداء، المكافآت، وKudos.",
    status: "covered",
    appSlug: "hr-assets",
    appLabel: "إدارة الأصول والمعدات",
    currentGate: "hr-assets",
    legacyGate: "hr-basic",
    routes: [
      { path: "/hr/assets", label: "الأصول" },
      { path: "/hr/recruitment", label: "التوظيف" },
      { path: "/hr/training", label: "التدريب" },
      { path: "/hr/performance-reviews", label: "تقييم الأداء" },
      { path: "/hr/rewards", label: "المكافآت" },
      { path: "/my-rewards", label: "مكافآتي" },
    ],
    action: "تم ربط الأصول والتوظيف والتقدير بـ hr-assets مع fallback مؤقت على hr-basic.",
  },
  {
    id: "productivity",
    area: "productivity",
    label: "المواعيد والمهام",
    description: "المواعيد، المهام، الأهداف، المشاريع، التصنيفات، وإعدادات التكاملات.",
    status: "covered",
    appSlug: "smart-scheduler",
    appLabel: "الجدولة الذكية للمهام",
    currentGate: "smart-scheduler",
    routes: [
      { path: "/appointments", label: "المواعيد" },
      { path: "/tasks", label: "المهام" },
      { path: "/goals", label: "الأهداف" },
      { path: "/tasks/projects", label: "مشاريع المهام" },
      { path: "/tasks/integrations", label: "تكاملات المهام" },
    ],
    action: "تم ربط المواعيد والمهام بـ smart-scheduler.",
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
    id: "procurement",
    area: "commerce",
    label: "المشتريات والموردين",
    description: "الموردون، أوامر الشراء، فواتير الشراء، ومدفوعات الموردين.",
    status: "covered",
    appSlug: "procurement-pro",
    appLabel: "Procurement Pro",
    currentGate: "procurement-pro",
    legacyGate: "ecommerce-pro",
    routes: [
      { path: "/procurement/dashboard", label: "لوحة المشتريات" },
      { path: "/procurement/suppliers", label: "الموردون" },
      { path: "/procurement/purchase-orders", label: "أوامر الشراء" },
      { path: "/procurement/purchase-invoices", label: "فواتير الشراء" },
      { path: "/procurement/supplier-payments", label: "مدفوعات الموردين" },
    ],
    action: "تم تجهيز procurement-pro وربطه مع fallback مؤقت على ecommerce-pro.",
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
      { path: "/affiliates/marketplace", label: "كتالوج منتجات الشركة" },
      { path: "/affiliates/products", label: "منتجات الأفليت" },
      { path: "/merchants", label: "التجار والدروب شيبنج" },
      { path: "/affiliates/commission", label: "العمولات" },
      { path: "/affiliates/settings", label: "إعدادات الأفليت" },
    ],
    action: "تم تجهيز affiliate-pro وربط إدارة الأفليت به مع fallback مؤقت على ecommerce-basic.",
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
      { path: "/alert-settings", label: "إعدادات التحذيرات" },
    ],
    action: "تم تجهيز notification-automation وربط التنبيهات والتذكيرات به.",
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
