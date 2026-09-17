import {
  Monitor,
  Smartphone,
  Printer,
  ShieldCheck,
  LucideIcon,
  Laptop,
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
  category: "desktop" | "mobile" | "pos" | "enterprise";
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
    id: "windows-monitor",
    slug: "maxp-desktop-monitor",
    name: "برنامج مراقبة وإنتاجية فريق العمل",
    nameEn: "MaxP Workstation & Productivity Agent",
    category: "desktop",
    categoryLabel: "سطح المكتب",
    platform: "ويندوز (Windows 10 / 11 x64)",
    platformEn: "Windows 64-bit",
    version: "v1.0.4",
    releaseDate: "2026-03",
    icon: Monitor,
    summary: "تسجيل دقيق لساعات العمل والإنتاجية مع طابور تخزين محلي يعمل دون اتصال بالإنترنت.",
    primaryActionLabel: "تحميل مثبت البرنامج",
    telemetry: {
      targetSystem: "Windows 10 / 11 (x64)",
      primarySize: "84.1 MB",
      ramConsumption: "< 45 MB RAM",
    },
    files: [
      {
        id: "win-setup",
        label: "مثبت البرنامج (Setup .exe)",
        size: "84.1 MB",
        url: "https://maxp.online/downloads/MaxP-Monitor-Setup.exe",
        extension: ".exe",
        isPrimary: true,
      },
      {
        id: "win-portable",
        label: "نسخة محمولة (Portable .zip)",
        size: "114.8 MB",
        url: "https://maxp.online/downloads/MaxP-Monitor-Portable.zip",
        extension: ".zip",
        isPrimary: false,
      },
    ],
    tags: ["windows", "monitor", "exe", "zip", "sqlite", "productivity", "مراقبة", "إنتاجية"],
    drawerDetails: {
      overview: "عميل تشغيل محلي خفيف الوزن مصمم لمراقبة إنتاجية المحطات واحتساب ساعات الدوام الفعلية بدقة الثواني دون استهلاك لموارد المعالج أو الذاكرة.",
      features: [
        "رصد دقيق للبرامج والنوافذ النشطة وكشف فترات الخمول التلقائي.",
        "طابور تخزين محلي (Offline SQLite Buffer) يضمن عدم فقدان السجلات عند انقطاع الإنترنت.",
        "ربط مشفر بمعرّف المنشأة المركزي لمنع التلاعب بسجلات الحضور.",
        "تشغيل صامت كخدمة خلفية خفيفة مع بدء إقلاع النظام.",
      ],
      minRequirements: [
        "نظام تشغيل Windows 10 (إصدار 1903 أو أحدث) أو Windows 11.",
        "معالج بتردد 1.5 GHz ثنائي النواة.",
        "ذاكرة عشوائية (RAM) فارغة بحجم 120 MB.",
        "مساحة قرص صلب فارغة بحجم 250 MB.",
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
          version: "v1.0.4",
          date: "2026-03",
          changes: [
            "تحسين كفاءة الذاكرة وخفض الاستهلاك لأقل من 40 MB.",
            "دعم أسرع لطابور SQLite عند استعادة الاتصال بعد انقطاع طويل.",
            "إصلاح التوافق مع تحديثات Windows 11 24H2.",
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
    id: "mobile-companion",
    slug: "maxp-mobile-companion",
    name: "تطبيق الموبايل للموظفين والميدان",
    nameEn: "MaxP Mobile Operations & Delivery App",
    category: "mobile",
    categoryLabel: "الموبايل والميدان",
    platform: "أندرويد وآيفون (Android & iOS)",
    platformEn: "Android APK & iOS PWA",
    version: "v2.1.0",
    releaseDate: "2026-03",
    icon: Smartphone,
    summary: "تسجيل حضور بالبصمة الحيوية والنطاق الجغرافي، مع تنبيهات فورية للمهام والمبيعات.",
    primaryActionLabel: "تحميل تطبيق أندرويد (APK)",
    telemetry: {
      targetSystem: "Android 8+ / iOS 14+",
      primarySize: "155.7 MB",
      ramConsumption: "Zero Setup PWA",
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
      {
        id: "web-pwa",
        label: "تطبيق الويب الفوري (PWA)",
        size: "Zero MB",
        url: "https://maxp.online",
        extension: "PWA",
        isPrimary: false,
      },
    ],
    tags: ["android", "ios", "mobile", "apk", "pwa", "attendance", "موبايل", "أندرويد", "بصمة", "حضور"],
    drawerDetails: {
      overview: "تطبيق متكامل للمناديب وموظفي الفروع والميدان، يدعم إثبات الحضور بالبصمة الحيوية والنطاق الجغرافي (Geofencing) واستلام إشعارات المهام لحظياً.",
      features: [
        "تسجيل الحضور والانصراف بالبصمة الحيوية مع التحقق من الموقع الجغرافي للفرع.",
        "إشعارات فورية بحالات الطلبات وتكليفات التوصيل والمهام المستجدة.",
        "دعم العمل دون اتصال بالشبكة ومزامنة العمليات فور توفر الإنترنت.",
        "تثبيت فوري كـ Progressive Web App على جميع الهواتف دون الحاجة لمتاجر التطبيقات.",
      ],
      minRequirements: [
        "أجهزة أندرويد بنظام Android 8.0 Oreo أو أحدث مع خدمات Google Play أو بدائلها.",
        "أجهزة آبل iPhone بنظام iOS 14.0 أو أحدث عبر متصفح Safari.",
        "صلاحيات الموقع الجغرافي (GPS) والكاميرا للتحقق من الحضور.",
      ],
      recommendedSpecs: [
        "Android 12+ أو iOS 16+.",
        "مستشعر بصمة نشط لتسجيل الدخول السريع.",
      ],
      iosGuide: {
        step1: "افتح الرابط maxp.online في متصفح سفاري Safari على الآيفون.",
        step2: "اضغط على زر المشاركة (أيقونة المربع والسهم لأعلى) في شريط المتصفح.",
        step3: "اختر من القائمة 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen).",
        step4: "سيظهر تطبيق MaxP كأيقونة مستقلة على شاشة هاتفك مع دعم الإشعارات الفورية.",
      },
      sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      changelog: [
        {
          version: "v2.1.0",
          date: "2026-03",
          changes: [
            "تحديث محرك التنبيهات اللحظية وتقليل استهلاك بطارية الهاتف بنسبة 35%.",
            "تحسين دقة النطاق الجغرافي لمستودعات وفروع المنشأة.",
          ],
        },
      ],
    },
  },
  {
    id: "web-pos",
    slug: "maxp-web-pos",
    name: "استوديو الكاشير والطباعة الفورية",
    nameEn: "MaxP Web-Native Cloud POS Station",
    category: "pos",
    categoryLabel: "الكاشير والطباعة",
    platform: "جميع المتصفحات (Zero-Install Web POS)",
    platformEn: "Web Native POS & ESC/POS",
    version: "v3.2.0",
    releaseDate: "2026-03",
    icon: Printer,
    summary: "محطة نقاط بيع سحابية فورية تدعم طابعات الفواتير الحرارية وماسحات الباركود دون برامج وسيطة.",
    primaryActionLabel: "فتح محطة الكاشير (POS)",
    telemetry: {
      targetSystem: "Chrome, Edge, Safari",
      primarySize: "Zero Install",
      protocol: "Raw ESC/POS 80mm/58mm",
    },
    files: [
      {
        id: "pos-web",
        label: "محطة الكاشير السحابية (/pos)",
        size: "0 MB",
        url: "https://maxp.online/pos",
        extension: "Web",
        isPrimary: true,
      },
    ],
    tags: ["pos", "cashier", "thermal", "printer", "barcode", "escpos", "كاشير", "فواتير", "طابعة"],
    drawerDetails: {
      overview: "محطة كاشير ونقاط بيع متكاملة تعمل مباشرة داخل المتصفح، تدعم الاتصال بطابعات الإيصالات الحرارية عبر USB أو الشبكة المحلية، مع قراءة الباركود اللحظية.",
      features: [
        "طباعة فواتير حرارية صامتة وفورية بدون نوافذ منبثقة أو مقاطعة لحركة البيع.",
        "دعم كامل لبروتوكول Raw ESC/POS القياسي لمقاسات 80mm و 58mm.",
        "تكامل لحظي مع المخزون المركزي لمنع تكرار البيع وتحديث الأرصدة.",
        "تعمل على أي جهاز (شاشات لمس، كمبيوتر، أجهزة لوحية) دون الحاجة لتثبيت برامج وسيطة.",
      ],
      minRequirements: [
        "متصفح Google Chrome أو Microsoft Edge أو Safari محدث.",
        "طابعة إيصالات حرارية متوافقة مع ESC/POS (USB أو LAN).",
      ],
      recommendedSpecs: [
        "شاشة لمس بدقة Full HD للكاشير مع ماسح ضوئي 2D QR.",
      ],
      changelog: [
        {
          version: "v3.2.0",
          date: "2026-02",
          changes: [
            "إضافة دعم الطباعة المباشرة عبر WebUSB دون برامج تعريف وسيطة.",
            "تسريع وتيرة إصدار الفواتير المتتالية في أوقات الذروة.",
          ],
        },
      ],
    },
  },
  {
    id: "enterprise-kit",
    slug: "maxp-enterprise-it-kit",
    name: "دليل النشر والتوزيع المؤسسي",
    nameEn: "MaxP Corporate Deployment & MDM Kit",
    category: "enterprise",
    categoryLabel: "دليل التوزيع",
    platform: "حزمة مسؤولي الـ IT والمنشآت",
    platformEn: "IT Kit & Group Policies",
    version: "v1.2.0",
    releaseDate: "2026-03",
    icon: ShieldCheck,
    summary: "روابط الحزم المجمعة، رموز التوثيق المركزي، وإرشادات الربط الآلي لأجهزة الشركات والفروع.",
    primaryActionLabel: "نسخ الحزمة الكاملة للفريق",
    telemetry: {
      targetSystem: "Multi-Platform Central Hub",
      primarySize: "MDM Kit",
      ramConsumption: "TLS 1.3 Encryption",
    },
    files: [
      {
        id: "corporate-pack",
        label: "دليل الروابط الرسمي المجمع",
        size: "Pack",
        url: "https://maxp.online/marketplace/downloads",
        extension: "Pack",
        isPrimary: true,
      },
    ],
    tags: ["enterprise", "mdm", "it", "policy", "نشر", "توزيع", "مؤسسي", "مسؤول"],
    drawerDetails: {
      overview: "حزمة شاملة مخصصة لمدراء تقنية المعلومات (IT Admins) وأصحاب الأعمال لتوزيع البرامج والتطبيقات على مئات الأجهزة وربطها بالمنشأة المركزية آلياً.",
      features: [
        "توزيع صامت ومؤتمت لحزم ويندوز عبر بروتوكولات Active Directory و GPO.",
        "تثبيت مباشر لحزم الـ APK دون الحاجة لتسجيل حسابات شخصية على متجر Google Play.",
        "ربط مشفر متعدد الفروع برمز منشأة مركزي محمي بتشفير TLS 1.3.",
      ],
      minRequirements: [
        "صلاحيات مسؤول نظام (Admin) على أجهزة الموظفين المراد ربطها.",
      ],
      recommendedSpecs: [
        "شبكة داخلية مستقرة تدعم اتصالات الـ WebSocket المشفرة.",
      ],
      changelog: [
        {
          version: "v1.2.0",
          date: "2026-03",
          changes: [
            "تسهيل نسخ الرابط المباشر لمعرف الشركة.",
            "إضافة إرشادات التوزيع الصامت بدون تدخل المستخدم النهائي.",
          ],
        },
      ],
    },
  },
];
