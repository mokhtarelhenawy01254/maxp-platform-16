import {
  Monitor,
  Smartphone,
  Apple,
  LucideIcon,
  Laptop,
  Bot,
  Truck,
  Package,
} from "lucide-react";

export interface DownloadFileSpec {
  id: string;
  label: string;
  size: string;
  sizeBytes?: number;
  url: string;
  extension: string;
  isPrimary?: boolean;
}

export interface DownloadPackage {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  category: "desktop" | "mobile";
  categoryLabel: string;
  platform: string;
  platformEn: string;
  version: string;
  releaseDate: string;
  icon: LucideIcon;
  summary: string;
  primaryActionLabel: string;
  telemetry: {
    targetSystem: string;
    primarySize: string;
    ramConsumption?: string;
    protocol?: string;
  };
  files: DownloadFileSpec[];
  tags: string[];
  drawerDetails: {
    overview: string;
    features: string[];
    minRequirements: string[];
    recommendedSpecs: string[];
    pairingNotes?: string;
    iosGuide?: {
      step1: string;
      step2: string;
      step3: string;
      step4: string;
    };
    sha256?: string;
    changelog: {
      version: string;
      date: string;
      changes: string[];
    }[];
  };
}

export const DOWNLOAD_PACKAGES: DownloadPackage[] = [
  {
    id: "courier-android-app",
    slug: "maxp-courier-driver-app",
    name: "تطبيق كابتن ومندوب الشحن — MaxP Courier",
    nameEn: "MaxP Courier & Delivery Driver App",
    category: "mobile",
    categoryLabel: "مندوب الشحن",
    platform: "أندرويد (Android 8.0+)",
    platformEn: "Android APK",
    version: "v1.0.0",
    releaseDate: "2026-11",
    icon: Truck,
    summary: "تطبيق أندرويد المستقل لمناديب التوصيل؛ مسح باركود فائق السرعة بالكاميرا، تتبع GPS في الخلفية، إثبات التسليم بـ OTP، وحساب عهدة الكاش COD.",
    primaryActionLabel: "تحميل تطبيق المندوب (APK)",
    telemetry: {
      targetSystem: "Android 8.0+ (ARM64 & x86)",
      primarySize: "3.8 MB",
      ramConsumption: "< 35 MB RAM",
    },
    files: [
      {
        id: "courier-apk",
        label: "تطبيق المندوب الرسمي (APK)",
        size: "3.8 MB",
        url: "https://maxp.online/downloads/maxp-courier.apk",
        extension: ".apk",
        isPrimary: true,
      },
      {
        id: "courier-portal-web",
        label: "بوابة المندوب المباشرة (Web View)",
        size: "سحابي",
        url: "https://maxp.online/courier-portal/login",
        extension: "Web",
        isPrimary: false,
      },
    ],
    tags: ["courier", "driver", "android", "apk", "shipping", "delivery", "qr", "barcode", "مندوب", "كابتن", "شحن", "توصيل", "باركود", "أندرويد"],
    drawerDetails: {
      overview: "تطبيق أندرويد مستقل مخصص لمناديب وكباتن أسطول الشحن والتوصيل الميداني، يدعم مسح بوالص الشحن فائق السرعة عبر الكاميرا، والتوجيه الذكي للمحطات عبر الخرائط، وإثبات التسليم بكود OTP وتوقيع المستلم، وتسوية العهدة النقدية اليومية.",
      features: [
        "ماسح باركود بصري بالكاميرا بسرعة 60 إطار في الثانية للتعرف التلقائي على الشحنات.",
        "تتبع الموقع الجغرافي المستمر (Foreground GPS) لإظهار مسار المندوب للعملاء والإدارة.",
        "إثبات تسليم آمن بـ OTP وتوقيع المستلم وصورة باب العميل لمنع التسليم الوهمي.",
        "محفظة كاش فورية لعرض العهدة النقدية في جيب المندوب وتوليد QR التوريد للخزينة.",
        "دعم العمل الكامل بدون إنترنت (Offline-First) لمناطق البدروم وانقطاع الشبكة.",
      ],
      minRequirements: [
        "هاتف أندرويد بنظام Android 8.0 Oreo أو أحدث.",
        "كاميرا خلفية مزودة بخاصية التركيز التلقائي لمسح الباركود.",
        "مستشعر GPS لتسجيل إحداثيات التسليم.",
      ],
      recommendedSpecs: [
        "Android 11.0 أو أحدث.",
        "اتصال 4G/5G لمزامنة البيانات اللحظية.",
      ],
      pairingNotes: "يقوم المندوب بتسجيل الدخول السريع برقم هاتفه وكود PIN الخاص به المعتمد من لوحة إدارة الأسطول.",
      changelog: [
        {
          version: "v1.0.0",
          date: "2026-11",
          changes: [
            "الإطلاق الرسمي لتطبيق مندوب ماكس بي المستقل للأندرويد.",
            "إضافة ماسح الكاميرا البصري عالي السرعة (60fps) لبوالص الشحن.",
            "دعم التحقق من OTP المستلم وتسجيل عهدة الـ COD اليومية.",
          ],
        },
      ],
    },
  },
  {
    id: "customer-android-app",
    slug: "maxp-shipping-customer-app",
    name: "تطبيق عميل الشحن وتتبع الطرود — MaxP Shipping",
    nameEn: "MaxP Shipping & Customer Tracking App",
    category: "mobile",
    categoryLabel: "شحن وتتبع",
    platform: "أندرويد (Android 8.0+)",
    platformEn: "Android APK",
    version: "v1.0.0",
    releaseDate: "2026-11",
    icon: Package,
    summary: "تطبيق أندرويد للتجار والمستلمين؛ إضافة ومتابعة الطرود، تتبع حركة المندوب بالخريطة الحية، طلبات البيك أب، وكشوف حسابات الـ COD.",
    primaryActionLabel: "تحميل تطبيق الشحن والعملاء (APK)",
    telemetry: {
      targetSystem: "Android 8.0+ (ARM64 & x86)",
      primarySize: "3.8 MB",
      ramConsumption: "< 30 MB RAM",
    },
    files: [
      {
        id: "customer-apk",
        label: "تطبيق الشحن والعملاء (APK)",
        size: "3.8 MB",
        url: "https://maxp.online/downloads/maxp-customer.apk",
        extension: ".apk",
        isPrimary: true,
      },
      {
        id: "customer-portal-web",
        label: "بوابة التاجر المباشرة (Web View)",
        size: "سحابي",
        url: "https://maxp.online/client-portal/shipping",
        extension: "Web",
        isPrimary: false,
      },
      {
        id: "public-tracking-web",
        label: "تتبع شحنة برقم البوليصة (Track)",
        size: "سحابي",
        url: "https://maxp.online/track",
        extension: "Web",
        isPrimary: false,
      },
    ],
    tags: ["customer", "merchant", "android", "apk", "shipping", "tracking", "pickups", "cod", "عميل", "تاجر", "شحن", "تتبع", "بوليصة", "أندرويد"],
    drawerDetails: {
      overview: "تطبيق متكامل لأصحاب المتاجر والمستلمين، يتيح للتاجر إضافة الشحنات فردياً ومجمعاً وطلب سيارات البيك أب ومتابعة أموال التحصيل، ويتيح للمستلم تتبع شحنته لحظياً بالخريطة والتواصل مع المندوب.",
      features: [
        "لوحة متابعة فورية لكافة الشحنات ومراحل التوصيل ونسب التسليم.",
        "تتبع حي للمندوب على الخريطة ووقت الوصول المتوقع (Live ETA).",
        "كشوف حسابات دورية لمبالغ الدفع عند الاستلام (COD) مع تفاصيل الرسوم وصافي الأرباح.",
        "طباعة بوالص الشحن الحرارية مقاس 4x6 وتصدير بيانات الشحنات.",
        "خدمة ذاتية للمستلم لتأكيد الاستلام أو طلب تغيير موعد التسليم.",
      ],
      minRequirements: [
        "هاتف أندرويد بنظام Android 8.0 Oreo أو أحدث.",
        "ذاكرة عشوائية (RAM) 500 MB فارغة.",
      ],
      recommendedSpecs: [
        "Android 11.0 أو أحدث.",
      ],
      pairingNotes: "يدخل التاجر بحساب متجره، أو يدخل المشتري برقم هاتفه أو رقم البوليصة لمتابعة الشحنات.",
      changelog: [
        {
          version: "v1.0.0",
          date: "2026-11",
          changes: [
            "الإطلاق الرسمي لتطبيق ماكس بي للشحن والعملاء على أندرويد.",
            "دعم الروابط العميقة (Deep Links) لفتح تتبع الشحنة فوراً من واتساب.",
            "ربط كشوف الحسابات والتسويات المالية للتحصيل COD.",
          ],
        },
      ],
    },
  },
  {
    id: "windows-agent-studio",
    slug: "maxp-agent-studio",
    name: "MaxP Agent Studio — غرفة قيادة الوكلاء الذكية",
    nameEn: "MaxP AI Agent Studio & Media Buyer Cockpit",
    category: "desktop",
    categoryLabel: "سطح المكتب (AI)",
    platform: "ويندوز (Windows 10 / 11 x64)",
    platformEn: "Windows 64-bit",
    version: "v1.0.4",
    releaseDate: "2026-09",
    icon: Bot,
    summary: "غرفة قيادة مستقلة للميديا باير وإدارة المتجر، مع اختصار Alt+Space، وتوليد مسودات Meta، وتأكيد أوردرات COD، وفيديوهات Veo 3.1.",
    primaryActionLabel: "تحميل مثبت استوديو الوكلاء",
    telemetry: {
      targetSystem: "Windows 10 / 11 (x64)",
      primarySize: "83.2 MB",
      ramConsumption: "< 50 MB RAM",
    },
    files: [
      {
        id: "agent-setup",
        label: "مثبت استوديو الوكلاء (Setup .exe)",
        size: "83.2 MB",
        url: "https://maxp.online/download/MaxP-Agent-Studio-Setup.exe",
        extension: ".exe",
        isPrimary: true,
      },
    ],
    tags: ["windows", "agent", "ai", "copilot", "media-buyer", "veo", "meta", "ذكاء اصطناعي", "وكيل", "إعلانات", "ويندوز"],
    drawerDetails: {
      overview: "تطبيق سطح مكتب مستقل وخفيف الوزن صُمم خصيصاً للتجار ومسؤولي الإعلانات لإدارة حملات الميديا باير، ورصد الأداء، وتأكيد الطلبات المعلقة دون الحاجة لفتح المتصفح.",
      features: [
        "شريط عائم فوري فوق أي برنامج بنقرة اختصار (Alt + Space).",
        "تكامل كامل مع Meta Graph API v21 واستهداف المحافظات المصرية وصياغة المسودات.",
        "توليد ريلز إعلانية وفيديوهات 9:16 بجودة سينمائية وصوت متزامن عبر Google Veo 3.1.",
        "إشعارات حية وتأكيد أوردرات الدفع عند الاستلام (COD) مع تيربو وبوسطة.",
        "تشفير كامل للجلسات والتوكن عبر Windows DPAPI مع حماية تامة من تسريب المفاتيح.",
      ],
      minRequirements: [
        "نظام تشغيل Windows 10 أو Windows 11 (x64).",
        "ذاكرة عشوائية (RAM) فارغة بحجم 150 MB.",
        "مساحة قرص صلب فارغة بحجم 300 MB.",
      ],
      recommendedSpecs: [
        "Windows 11 x64 أحدث تحديث.",
        "اتصال إنترنت مستقر للمزامنة الفورية مع وكلاء المنصة.",
      ],
      pairingNotes: "سجل الدخول بنفس بريدك وكلمة مرورك في منصة MaxP للوصول الفوري لكافة وكلاء المتجر والكتالوج.",
      changelog: [
        {
          version: "v1.0.0",
          date: "2026-09",
          changes: [
            "الإطلاق الرسمي لتطبيق MaxP Agent Studio لسطح المكتب.",
            "دعم وكلاء: Facebook Media Buyer, Order Confirmation (منى), Creative Video Studio (Veo 3.1), و Inventory Assistant.",
            "تفعيل اختصار لوحة المفاتيح العالمي Alt + Space وميزة التقاط الشاشة وتحليلها برؤية الذكاء الاصطناعي.",
          ],
        },
      ],
    },
  },
  {
    id: "windows-monitor",
    slug: "maxp-desktop-monitor",
    name: "برنامج مراقبة وإنتاجية فريق العمل",
    nameEn: "MaxP Workstation & Productivity Agent",
    category: "desktop",
    categoryLabel: "سطح المكتب",
    platform: "ويندوز (Windows 10 / 11 x64)",
    platformEn: "Windows 64-bit",
    version: "v1.0.95",
    releaseDate: "2026-10",
    icon: Monitor,
    summary: "تسجيل دقيق لساعات العمل والإنتاجية مع طابور تخزين محلي يعمل دون اتصال بالإنترنت وتحديثات تلقائية صامتة.",
    primaryActionLabel: "تحميل مثبت البرنامج",
    telemetry: {
      targetSystem: "Windows 10 / 11 (x64)",
      primarySize: "80.1 MB",
      ramConsumption: "< 45 MB RAM",
    },
    files: [
      {
        id: "win-setup",
        label: "مثبت البرنامج (Setup .exe)",
        size: "80.1 MB",
        url: "https://maxp.online/download/MaxP-Workspace-Setup.exe",
        extension: ".exe",
        isPrimary: true,
      },
      {
        id: "win-portable",
        label: "نسخة محمولة (Portable .zip)",
        size: "113.2 MB",
        url: "https://maxp.online/downloads/MaxP-Monitor-Portable.zip",
        extension: ".zip",
        isPrimary: false,
      },
    ],
    tags: ["windows", "monitor", "exe", "zip", "sqlite", "productivity", "مراقبة", "إنتاجية", "ويندوز"],
    drawerDetails: {
      overview: "عميل تشغيل محلي خفيف الوزن مصمم لمراقبة إنتاجية المحطات واحتساب ساعات الدوام الفعلية بدقة الثواني دون استهلاك لموارد المعالج أو الذاكرة.",
      features: [
        "لوحة مهام تفاعلية متزامنة لحظياً تتيح عرض مهامك والمهام الموكلة منك وكافة مهام المنشأة.",
        "عداد زمني دقيق لساعات العمل والمهام مع إمكانية التبديل بين مهام متعددة بسلاسة.",
        "تسجيل الحضور والانصراف الموثق وطلب فترات الاستراحة مع بيان الأسباب للإدارة.",
        "تخزين مؤقت بدون إنترنت لمزامنة النشاط تلقائياً فور استعادة الاتصال بالسيرفر.",
        "إشعارات سطح مكتب فورية وتنبيهات صوتية فور تكليفك بمهمة جديدة أو تعديلها.",
      ],
      minRequirements: [
        "نظام تشغيل Windows 10 أو Windows 11 بمعمارية 64-bit.",
        "معالج رباعي النواة مع 4 GB RAM.",
        "اتصال إنترنت مستقر للمزامنة الفورية.",
      ],
      recommendedSpecs: [
        "Windows 11 x64 أحدث تحديث.",
        "معالج رباعي النواة مع 4 GB RAM.",
        "اتصال إنترنت مستقر للمزامنة الفورية.",
      ],
      pairingNotes: "بعد تثبيت البرنامج، افتح نافذة الإعدادات وألصق معرّف المنشأة المرجعي لحسابك لتفعيل المزامنة التلقائية فوراً.",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      changelog: [
        {
          version: "v1.0.95",
          date: "2026-10",
          changes: [
            "تحديث أداء واستقرار النواة، تسريع المزامنة التلقائية اللحظية وحل مشكلات الجلسات العالقة.",
            "تحسين دقة عداد الوقت الحقيقي واحتساب ساعات العمل للمهام.",
          ],
        },
      ],
    },
  },
  {
    id: "android-app",
    slug: "maxp-android-companion",
    name: "تطبيق أندرويد للموظفين والميدان",
    nameEn: "MaxP Android Mobile & Attendance App",
    category: "mobile",
    categoryLabel: "أندرويد",
    platform: "أندرويد (Android 8.0+)",
    platformEn: "Android APK",
    version: "v1.1.0",
    releaseDate: "2026-10",
    icon: Smartphone,
    summary: "تسجيل حضور بالبصمة الحيوية والنطاق الجغرافي، مع تنبيهات فورية للمهام والمبيعات وتوصيل الطلبات.",
    primaryActionLabel: "تحميل تطبيق أندرويد (APK)",
    telemetry: {
      targetSystem: "Android 8.0+ (ARM64 & x86)",
      primarySize: "155.7 MB",
      ramConsumption: "Cloud Direct Access",
    },
    files: [
      {
        id: "android-apk",
        label: "تطبيق أندرويد الرسمي (APK)",
        size: "155.7 MB",
        url: "https://maxp.online/downloads/maxp.apk",
        extension: ".apk",
        isPrimary: true,
      },
    ],
    tags: ["android", "mobile", "apk", "attendance", "موبايل", "أندرويد", "بصمة", "حضور", "مناديب"],
    drawerDetails: {
      overview: "تطبيق متكامل لموظفي الفروع والميدان، يدعم إثبات الحضور بالبصمة الحيوية والنطاق الجغرافي (Geofencing) واستلام إشعارات المهام لحظياً.",
      features: [
        "تسجيل الحضور والانصراف بالبصمة الحيوية مع التحقق من الموقع الجغرافي للفرع.",
        "إشعارات فورية بحالات الطلبات وتكليفات التوصيل والمهام المستجدة.",
        "دعم العمل دون اتصال بالشبكة ومزامنة العمليات فور توفر الإنترنت.",
        "تثبيت مباشر وسريع لملف الـ APK دون الحاجة لتسجيل حساب على متجر خارجي.",
      ],
      minRequirements: [
        "أجهزة أندرويد بنظام Android 8.0 Oreo أو أحدث مع خدمات الموقع الجغرافي.",
        "ذاكرة عشوائية (RAM) فارغة بحجم 500 MB على الأقل.",
        "صلاحيات الموقع الجغرافي (GPS) والكاميرا للتحقق من الحضور.",
      ],
      recommendedSpecs: [
        "Android 11.0 أو أحدث مع معالج ثماني النواة.",
        "مستشعر بصمة نشط لتسجيل الدخول السريع.",
      ],
      sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      changelog: [
        {
          version: "v1.1.0",
          date: "2026-10",
          changes: [
            "تحديث رئيسي: خدمة المكالمات في الخلفية، تحسينات شاملة في الأداء والاستقرار.",
          ],
        },
      ],
    },
  },
  {
    id: "parent-portal-android-app",
    slug: "maxp-parent-portal-app",
    name: "تطبيق بوابات التعليم والأولياء (APK) — MaxP Portals",
    nameEn: "MaxP Portals Mobile App (Parents, Teachers & Students)",
    category: "mobile",
    categoryLabel: "بوابات التعليم",
    platform: "أندرويد (Android 8.0+)",
    platformEn: "Android APK",
    version: "v1.0.0",
    releaseDate: "2026-11",
    icon: Smartphone,
    summary: "تطبيق مستقل لأولياء الأمور والمدرسين والطلاب؛ تنبيهات فورية للحضور والحصص والنتائج، والتبديل السريع بين أكثر من مركز تعليمي.",
    primaryActionLabel: "تحميل تطبيق البوابات (APK)",
    telemetry: {
      targetSystem: "Android 8.0+ (ARM64 & x86)",
      primarySize: "~5 MB",
      ramConsumption: "< 40 MB RAM",
    },
    files: [
      {
        id: "parent-portal-apk",
        label: "تطبيق بوابات التعليم والأولياء (APK)",
        size: "~5 MB",
        url: "https://maxp.online/downloads/maxp-parent.apk",
        extension: ".apk",
        isPrimary: true,
      },
      {
        id: "parent-portal-connect-web",
        label: "اختيار المؤسسة والدخول المباشر (Web)",
        size: "سحابي",
        url: "https://maxp.online/portal-connect",
        extension: "Web",
        isPrimary: false,
      },
    ],
    tags: ["parent", "teacher", "student", "education", "portal", "android", "apk", "أولياء الأمور", "مدرس", "طالب", "تعليم", "أندرويد"],
    drawerDetails: {
      overview: "تطبيق أندرويد خفيف ومخصص لمتابعة البوابات التعليمية والصحية (ولي الأمر، المدرس، الطالب، الطبيب والمريض)، مع دعم التنبيهات الفورية عبر FCM والربط السريع بكود المؤسسة.",
      features: [
        "ربط فوري بالمؤسسة أو السنتر عبر رابط الدعوة أو الكود العام.",
        "إشعارات FCM فورية بمواعيد الحصص والغياب والمدفوعات.",
        "إمكانية حفظ والتبديل بين أكثر من مؤسسة أو مركز من شاشة واحدة.",
        "هوية مرئية وشعار مخصص للمؤسسة بمجرد الاتصال.",
      ],
      minRequirements: [
        "هاتف أندرويد بنظام Android 8.0 Oreo أو أحدث.",
        "اتصال إنترنت لتزامن الحصص والإشعارات.",
      ],
      recommendedSpecs: [
        "Android 11.0 أو أحدث.",
      ],
      pairingNotes: "افتح التطبيق وأدخل كود المؤسسة أو افتح رابط الدعوة المرسل من السنتر أو الأكاديمية للاتصال المباشر.",
      changelog: [
        {
          version: "v1.0.0",
          date: "2026-11",
          changes: [
            "الإطلاق الأول لتطبيق بوابات MaxP المستقل للأندرويد.",
            "دعم الربط الذكي بكود المؤسسة وإشعارات FCM الفورية.",
          ],
        },
      ],
    },
  },
  {
    id: "ios-companion",
    slug: "maxp-ios-companion",
    name: "تطبيق الآيفون ونظام iOS",
    nameEn: "MaxP iOS Mobile App & Safari Web Clip",
    category: "mobile",
    categoryLabel: "آبل iOS",
    platform: "آيفون وآيباد (Apple iOS 14.0+)",
    platformEn: "iOS Safari & PWA Web Clip",
    version: "v1.1.0",
    releaseDate: "2026-10",
    icon: Apple,
    summary: "تطبيق متكامل للآيفون يثبت مباشرة على الشاشة الرئيسية عبر متصفح Safari مع إشعارات فورية.",
    primaryActionLabel: "تثبيت للآيفون (iOS)",
    telemetry: {
      targetSystem: "iOS 14+ / iPadOS",
      primarySize: "تثبيت فوري",
      ramConsumption: "Safari Web App Engine",
    },
    files: [
      {
        id: "ios-webclip",
        label: "تثبيت تطبيق الآيفون (Safari PWA)",
        size: "0 MB",
        url: "https://maxp.online",
        extension: "iOS",
        isPrimary: true,
      },
    ],
    tags: ["ios", "apple", "iphone", "ipad", "safari", "pwa", "آيفون", "آبل", "موبايل", "بصمة", "تثبيت"],
    drawerDetails: {
      overview: "تطبيق مهيأ خصيصاً لأجهزة آبل iPhone و iPad ليعمل كتطبيق أصيل كامل الشاشة عبر متصفح Safari، مع دعم الإشعارات الفورية اللحظية والعمل الميداني وسرعة الاستجابة.",
      features: [
        "تشغيل بكامل الشاشة دون شريط عنوان المتصفح كأي تطبيق أصيل من متجر التطبيقات.",
        "استلام إشعارات الدفع الفورية (Web Push Notifications) بحالات الطلبات وتكليفات المناديب.",
        "تسجيل الحضور والانصراف بالبصمة ومطابقة النطاق الجغرافي (GPS).",
        "تحديثات تلقائية لحظية دون الحاجة لتحديث يدوي عبر App Store.",
      ],
      minRequirements: [
        "جهاز آيفون يعمل بنظام iOS 14.0 أو أحدث.",
        "متصفح Safari الافتراضي لإضافة التطبيق إلى الشاشة الرئيسية.",
        "تفعيل صلاحيات الموقع الجغرافي عند أول تشغيل.",
      ],
      recommendedSpecs: [
        "iOS 16.4 أو أحدث لدعم كامل للإشعارات الفورية على شاشة القفل.",
        "Face ID أو Touch ID لتسجيل الدخول اللحظي.",
      ],
      iosGuide: {
        step1: "افتح الرابط maxp.online في متصفح Safari على الآيفون.",
        step2: "اضغط على زر المشاركة (أيقونة المربع والسهم لأعلى) في شريط المتصفح.",
        step3: "اختر من القائمة 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen).",
        step4: "اضغط 'إضافة' في الزاوية العلوية، وستظهر أيقونة MaxP فوراً على شاشتك الرئيسية.",
      },
      changelog: [
        {
          version: "v1.1.0",
          date: "2026-10",
          changes: [
            "دعم كامل لإشعارات Web Push اللحظية.",
            "تحسينات شاملة في سرعة المزامنة والربط مع الحساب وسلاسة الواجهة.",
          ],
        },
      ],
    },
  },
];
