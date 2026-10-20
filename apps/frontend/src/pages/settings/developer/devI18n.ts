/**
 * Local strings for the Developer Hub feature.
 *
 * Scoped to this feature folder on purpose: the shared translation files stay
 * untouched so other screens are never affected by wording changes here.
 */
export type DevLang = "ar" | "en";

export interface DevStrings {
  hubTitle: string;
  hubSubtitle: string;
  tabs: { keys: string; docs: string; mcp: string; usage: string };
  common: {
    loading: string;
    loadFailed: string;
    retry: string;
    save: string;
    cancel: string;
    close: string;
    copy: string;
    copied: string;
    download: string;
    delete: string;
    confirmDelete: string;
    name: string;
    none: string;
    perMinute: string;
    perDay: string;
    requests: string;
  };
  keys: {
    title: string;
    description: string;
    createKey: string;
    createTitle: string;
    namePlaceholder: string;
    scopesLabel: string;
    scopesHint: string;
    rateLimitLabel: string;
    expiresLabel: string;
    expiresNever: string;
    empty: string;
    active: string;
    inactive: string;
    revoke: string;
    enable: string;
    lastUsed: string;
    neverUsed: string;
    createdAt: string;
    showOnceTitle: string;
    showOnceNote: string;
    keyValue: string;
    prefixColumn: string;
    nameColumn: string;
    statusColumn: string;
    actionsColumn: string;
    createdToast: string;
  };
  docs: {
    title: string;
    description: string;
    baseUrl: string;
    searchPlaceholder: string;
    scope: string;
    tryIt: string;
    tryItHint: string;
    copyCurl: string;
    downloadPostman: string;
    downloadOpenApi: string;
    paramsTitle: string;
    paramName: string;
    paramType: string;
    paramRequired: string;
    paramDescription: string;
    responseTitle: string;
    required: string;
    optional: string;
    selectEndpoint: string;
    noResults: string;
    authHint: string;
  };
  mcp: {
    title: string;
    description: string;
    descriptionUnavailable: string;
    create: string;
    typeBadge: string;
    serversTitle: string;
    toolsTitle: string;
    endpointLabel: string;
    connectTitle: string;
    clientLabel: string;
    configLabel: string;
    copyConfig: string;
    empty: string;
    missingHint: string;
    catalogServer: string;
    videoServer: string;
    serverNote: string;
    unavailableBadge: string;
    unavailableTitle: string;
    reasonLabel: string;
    reasonNotDeployed: string;
    reasonUnknown: string;
    serversUnavailable: string;
    configUnavailable: string;
    checking: string;
    alternativeTitle: string;
    alternativeBody: string;
  };
  usage: {
    title: string;
    description: string;
    window: string;
    last7: string;
    last30: string;
    last90: string;
    totalRequests: string;
    okRequests: string;
    errorRequests: string;
    dailyTitle: string;
    byKeyTitle: string;
    topEndpointsTitle: string;
    empty: string;
    day: string;
    count: string;
    endpoint: string;
    keyName: string;
  };
}

const ar: DevStrings = {
  hubTitle: "المطورون",
  hubSubtitle: "اربط أنظمتك الخارجية وقدرات الذكاء الاصطناعي بحساب شركتك.",
  tabs: { keys: "مفاتيح API", docs: "الدوكيومنتيشن", mcp: "MCP", usage: "الاستخدام" },
  common: {
    loading: "جاري التحميل…",
    loadFailed: "تعذر تحميل البيانات",
    retry: "إعادة المحاولة",
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    copy: "نسخ",
    copied: "تم النسخ",
    download: "تحميل",
    delete: "حذف",
    confirmDelete: "تأكيد الحذف؟ لا يمكن التراجع.",
    name: "الاسم",
    none: "بدون",
    perMinute: "طلب/دقيقة",
    perDay: "طلب/يوم",
    requests: "طلبات",
  },
  keys: {
    title: "مفاتيح API",
    description: "مفاتيح للوصول البرمجي للقراءة من حساب شركتك عبر /api/v1/public/ext.",
    createKey: "إنشاء مفتاح جديد",
    createTitle: "مفتاح API جديد",
    namePlaceholder: "مثال: تكامل المتجر أو Postman",
    scopesLabel: "الصلاحيات",
    scopesHint: "الافتراضي قراءة فقط. امنح أقل صلاحية ممكنة.",
    rateLimitLabel: "حد الطلبات",
    expiresLabel: "مدة الصلاحية (أيام، اختياري)",
    expiresNever: "اتركه فارغًا لعدم الانتهاء",
    empty: "لا توجد مفاتيح بعد — أنشئ أول مفتاح للبدء.",
    active: "نشط",
    inactive: "معطّل",
    revoke: "تعطيل",
    enable: "تفعيل",
    lastUsed: "آخر استخدام",
    neverUsed: "لم يُستخدم بعد",
    createdAt: "تاريخ الإنشاء",
    showOnceTitle: "تم إنشاء المفتاح بنجاح",
    showOnceNote: "انسخ المفتاح الآن — لن يظهر مرة أخرى لأسباب أمنية.",
    keyValue: "المفتاح",
    prefixColumn: "المفتاح",
    nameColumn: "الاسم",
    statusColumn: "الحالة",
    actionsColumn: "إجراءات",
    createdToast: "تم إنشاء المفتاح",
  },
  docs: {
    title: "الدوكيومنتيشن",
    description: "مرجع الـ API العام — أمثلة جاهزة للنسخ وتصدير Postman و OpenAPI.",
    baseUrl: "الرابط الأساسي",
    searchPlaceholder: "ابحث في المسارات…",
    scope: "الصلاحية المطلوبة",
    tryIt: "جرّبها",
    tryItHint: "أدخل مفتاحًا للتجربة الحية من المتصفح",
    copyCurl: "نسخ cURL",
    downloadPostman: "تحميل Postman",
    downloadOpenApi: "تحميل OpenAPI",
    paramsTitle: "المعاملات",
    paramName: "المعامل",
    paramType: "النوع",
    paramRequired: "مطلوب",
    paramDescription: "الوصف",
    responseTitle: "مثال الاستجابة",
    required: "مطلوب",
    optional: "اختياري",
    selectEndpoint: "اختر مسارًا من القائمة لعرض تفاصيله.",
    noResults: "لا توجد نتائج مطابقة.",
    authHint: "أضف المفتاح كـ Bearer في هيدر المصادقة.",
  },
  mcp: {
    title: "MCP",
    description: "صِل أدوات Cursor و Claude وأي عميل MCP بحساب شركتك.",
    descriptionUnavailable:
      "إدارة توكنات MCP من هنا جاهزة، لكن سيرفرات MCP نفسها غير منشورة في الإنتاج حاليًا — للتكامل الآن استخدم الـREST API العام.",
    create: "إنشاء توكن MCP",
    typeBadge: "توكن MCP",
    serversTitle: "السيرفرات المتاحة",
    toolsTitle: "الأدوات",
    endpointLabel: "الرابط",
    connectTitle: "ربط العميل",
    clientLabel: "العميل",
    configLabel: "الإعداد الجاهز",
    copyConfig: "نسخ الإعداد",
    empty: "لا يوجد توكن MCP بعد — أنشئ توكنًا لربط أدواتك.",
    missingHint: "أنشئ توكنًا أولًا وسيظهر في الإعداد تلقائيًا.",
    catalogServer: "كتالوج المنتجات والمخزون",
    videoServer: "توليد فيديو Veo",
    serverNote: "كل الطلبات تُوثّق وتخضع لحدود الاستخدام الخاصة بالتوكن.",
    unavailableBadge: "غير متاح",
    unavailableTitle: "سيرفرات MCP غير متاحة في الإنتاج حاليًا",
    reasonLabel: "السبب",
    reasonNotDeployed: "السيرفرات لم تُنشر على هذا النطاق بعد، فمسارات /mcp/* غير مفعّلة.",
    reasonUnknown: "تعذر التحقق من حالة السيرفرات الآن، ولسنا نفترض أنها تعمل.",
    serversUnavailable:
      "مسارات /mcp/* غير مفعّلة على هذا النطاق، لذلك لا نعرض عناوين قابلة للنسخ.",
    configUnavailable:
      "الإعداد الجاهز متوقف حتى تُنشر السيرفرات — أي رابط MCP الآن سيكون رابطًا ميتًا.",
    checking: "جارٍ التحقق من حالة سيرفرات MCP…",
    alternativeTitle: "البديل العملي الآن: الـREST API العام",
    alternativeBody:
      "نفس التوكن/المفتاح يشتغل على /api/v1/public/ext لقراءة المنتجات والمخزون والطلبات والعملاء والكوبونات والتحليلات — راجع تبويب الدوكيومنتيشن.",
  },
  usage: {
    title: "الاستخدام",
    description: "سجل الطلبات على مفاتيح API وتوكنات MCP خلال الفترة المحددة.",
    window: "الفترة",
    last7: "آخر 7 أيام",
    last30: "آخر 30 يومًا",
    last90: "آخر 90 يومًا",
    totalRequests: "إجمالي الطلبات",
    okRequests: "ناجحة",
    errorRequests: "أخطاء",
    dailyTitle: "الطلبات اليومية",
    byKeyTitle: "الاستخدام حسب المفتاح",
    topEndpointsTitle: "أكثر المسارات استخدامًا",
    empty: "لا يوجد استخدام مسجّل في هذه الفترة.",
    day: "اليوم",
    count: "العدد",
    endpoint: "المسار",
    keyName: "المفتاح",
  },
};

const en: DevStrings = {
  hubTitle: "Developer",
  hubSubtitle: "Connect your external systems and AI tools to your company account.",
  tabs: { keys: "API keys", docs: "Documentation", mcp: "MCP", usage: "Usage" },
  common: {
    loading: "Loading…",
    loadFailed: "Could not load data",
    retry: "Retry",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    delete: "Delete",
    confirmDelete: "Delete? This cannot be undone.",
    name: "Name",
    none: "None",
    perMinute: "req/min",
    perDay: "req/day",
    requests: "requests",
  },
  keys: {
    title: "API keys",
    description: "Read-only programmatic access to your company data via /api/v1/public/ext.",
    createKey: "Create key",
    createTitle: "New API key",
    namePlaceholder: "e.g. Store integration or Postman",
    scopesLabel: "Scopes",
    scopesHint: "Read-only by default. Grant the least privilege needed.",
    rateLimitLabel: "Rate limit",
    expiresLabel: "Expiry (days, optional)",
    expiresNever: "Leave empty for no expiry",
    empty: "No keys yet — create your first key to start.",
    active: "Active",
    inactive: "Disabled",
    revoke: "Disable",
    enable: "Enable",
    lastUsed: "Last used",
    neverUsed: "Never used",
    createdAt: "Created",
    showOnceTitle: "Key created",
    showOnceNote: "Copy it now — it will never be shown again for security reasons.",
    keyValue: "Key",
    prefixColumn: "Key",
    nameColumn: "Name",
    statusColumn: "Status",
    actionsColumn: "Actions",
    createdToast: "Key created",
  },
  docs: {
    title: "Documentation",
    description: "Public API reference — copy-ready examples with Postman and OpenAPI exports.",
    baseUrl: "Base URL",
    searchPlaceholder: "Search endpoints…",
    scope: "Required scope",
    tryIt: "Try it",
    tryItHint: "Enter a key to run a live request from the browser",
    copyCurl: "Copy cURL",
    downloadPostman: "Download Postman",
    downloadOpenApi: "Download OpenAPI",
    paramsTitle: "Parameters",
    paramName: "Parameter",
    paramType: "Type",
    paramRequired: "Required",
    paramDescription: "Description",
    responseTitle: "Sample response",
    required: "required",
    optional: "optional",
    selectEndpoint: "Select an endpoint from the list to see its details.",
    noResults: "No matching endpoints.",
    authHint: "Send the key as a Bearer value in the auth header.",
  },
  mcp: {
    title: "MCP",
    description: "Connect Cursor, Claude and any MCP client to your company account.",
    descriptionUnavailable:
      "MCP credential management is ready here, but the MCP servers themselves are not deployed in production yet — use the public REST API for integrations today.",
    create: "Create MCP credential",
    typeBadge: "MCP",
    serversTitle: "Available servers",
    toolsTitle: "Tools",
    endpointLabel: "Endpoint",
    connectTitle: "Connect a client",
    clientLabel: "Client",
    configLabel: "Ready-to-paste config",
    copyConfig: "Copy config",
    empty: "No MCP credential yet — create one to connect your tools.",
    missingHint: "Create one first and it will appear in the config automatically.",
    catalogServer: "Products & inventory catalog",
    videoServer: "Veo video generation",
    serverNote: "Every request is audited and subject to the credential's rate limit.",
    unavailableBadge: "Unavailable",
    unavailableTitle: "MCP servers are not available in production right now",
    reasonLabel: "Reason",
    reasonNotDeployed: "The servers are not published on this domain yet, so /mcp/* paths are disabled.",
    reasonUnknown: "Could not verify server status right now — we do not assume they are up.",
    serversUnavailable:
      "/mcp/* paths are disabled on this domain, so no copyable endpoints are shown.",
    configUnavailable:
      "The ready-to-paste config is disabled until the servers are deployed — any MCP URL right now would be a dead link.",
    checking: "Checking MCP server status…",
    alternativeTitle: "Practical alternative today: the public REST API",
    alternativeBody:
      "The same credential works against /api/v1/public/ext for products, inventory, orders, customers, coupons and analytics — see the Documentation tab.",
  },
  usage: {
    title: "Usage",
    description: "Request history across your API keys and MCP credentials for the selected window.",
    window: "Window",
    last7: "Last 7 days",
    last30: "Last 30 days",
    last90: "Last 90 days",
    totalRequests: "Total requests",
    okRequests: "Succeeded",
    errorRequests: "Errors",
    dailyTitle: "Daily requests",
    byKeyTitle: "Usage by key",
    topEndpointsTitle: "Top endpoints",
    empty: "No recorded usage in this window.",
    day: "Day",
    count: "Count",
    endpoint: "Endpoint",
    keyName: "Key",
  },
};

export const getDevStrings = (lang: string | undefined): DevStrings =>
  lang === "en" ? en : ar;
