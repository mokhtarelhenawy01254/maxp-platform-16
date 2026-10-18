import {
  Monitor,
  Smartphone,
  Apple,
  LucideIcon,
  Laptop,
  Bot,
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
        {
          version: "v1.0.16",
          date: "2026-09",
          changes: [
            "ثبات واستقرار تحديث حالات المهام: معالجة جذرية لانعكاس أو رجوع حالة المهمة من خلال تمرير ترويسة المنشأة (X-Company-Id) ومعالجة حالات السقوط الآمن في السيرفر.",
            "تبسيط واجهة قائمة المهام: إزالة مربع الاختيار (Checkbox / لست تشيك) المربك والاعتماد الحصري على أزرار الإجراءات الصريحة (بدء العمل، تسليم للمراجعة، إنجاز مباشر، اعتماد وإنجاز).",
          ],
        },
        {
          version: "v1.0.15",
          date: "2026-09",
          changes: [
            "تحصين فتح النوافذ: إضافة آلية إيقاظ واسترجاع قسري للنافذة في حال كان البرنامج يعمل في الخلفية أو مصغراً بجوار الساعة.",
            "إضافة حواجز أمان شاملة (Global Process Guards) لمنع أي انهيار صامت وضمان استقرار تشغيل النواة.",
          ],
        },
        {
          version: "v1.0.14",
          date: "2026-09",
          changes: [
            "معالجة التكرار والازدواجية: تنظيف واستبدال تلقائي لكافة الاختصارات والنسخ والمجلدات السابقة من الإصدارات القديمة (MaxP Agent Studio / MaxP Monitor) لضمان بقاء نسخة واحدة موحدة ونظيفة.",
            "إغلاق ذكي للعمليات العالقة في الخلفية قبل استبدال الملفات لمنع حجز الملفات أثناء التثبيت والتحديث.",
          ],
        },
        {
          version: "v1.0.13",
          date: "2026-09",
          changes: [
            "تحديث أمني شامل: إزالة أي أدوات ملحقة وتأمين نواة البرنامج بنسبة 100% لمنع إشتباه برامج الحماية (Windows Defender / Antivirus).",
            "إصلاح المزامنة اللحظية لمهام العمل لكافة حسابات الموظفين والإدارة وضمان ظهور المهام فور تسجيل الدخول وحل مشكلة تعذر تحميل المهام.",
            "إضافة تبويب 'كل مهام الفريق' للمدراء والمشرفين لمتابعة كافة مهام المنشأة إلى جانب المهام الفردية الموكلة.",
            "تحسين عداد الوقت الحقيقي واحتساب ساعات العمل بدقة الميلي ثانية مع دعم التخزين المؤقت في حالة انقطاع الاتصال.",
          ],
        },
        {
          version: "v1.0.4",
          date: "2026-09",
          changes: [
            "عزل صلاحيات المهام ومنع تشغيل أو استعراض مهام الموظفين الآخرين.",
            "إصلاح فتح وعرض المرفقات والصور بدقة كاملة مع أزرار التحميل والمعاينة.",
            "تحديد مهلة استحقاق افتراضية 24 ساعة للمهام وتحديد المدة بالدقائق.",
            "إمكانية تعديل المهام وإعادة فتح المهام المكتملة مع إشعارات وتنبيهات صوتية فورية.",
            "تمييز المهام الطارئة بإشعارات وصوت مخصص ومؤشرات بصرية بارزة.",
          ],
        },
        {
          version: "v1.0.3",
          date: "2026-01",
          changes: [
            "إضافة النسخة المحمولة (Portable Zip) دون الحاجة لصلاحيات مدير النظام.",
            "تشفير السجلات المحلية بمفتاح الشركة الفريد.",
          ],
        },
      ],
    },
  },
  {
    id: "android-app",
    slug: "maxp-android-companion",
    name: "تطبيق أندرويد للموظفين والميدان",
    nameEn: "MaxP Android Mobile & Delivery App",
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
      overview: "تطبيق متكامل لموظفي الفروع والميدان والمناديب، يدعم إثبات الحضور بالبصمة الحيوية والنطاق الجغرافي (Geofencing) واستلام إشعارات المهام لحظياً.",
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
            "تسريع فتح الصفحات والمزامنة الفورية مع السيرفر.",
            "إصلاحات لاستقرار التنبيهات وإشعارات الدفع وتحسين تجربة التصفح والطباعة المحمولة.",
          ],
        },
        {
          version: "v1.0.8",
          date: "2026-09",
          changes: [
            "تحديث محرك التنبيهات اللحظية وتقليل استهلاك بطارية الهاتف بنسبة 35%.",
            "تحسين دقة النطاق الجغرافي لمستودعات وفروع المنشأة.",
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
