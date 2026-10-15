import type { TaskPriority } from "../types";

export interface PresetTaskItem {
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedHours: number;
  tags: string[];
}

export interface PresetProjectTemplate {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  badge: string;
  iconName: string;
  tasks: PresetTaskItem[];
}

export const PRESET_PROJECT_TEMPLATES: PresetProjectTemplate[] = [
  {
    id: "courses-first-month",
    title: "خطة كورسات ومحتوى تدريبي — الشهر الأول",
    description: "هيكل متكامل لإطلاق وتصوير ومتابعة دورة تدريبية أو محتوى كورسات خطوة بخطوة مع الطلاب.",
    categoryName: "كورسات وتعليم",
    badge: "الأكثر طلباً",
    iconName: "AcademicCapIcon",
    tasks: [
      {
        title: "إعداد المنهج والمخطط التفصيلي للدروس",
        description: "تحديد الفصول ومحاور كل فيديو تدريبي والتمارين الملحقة.",
        priority: "high",
        estimatedHours: 6,
        tags: ["منهج", "تخطيط"],
      },
      {
        title: "تصوير وتسجيل الوحدات الأساسية (الجزء الأول)",
        description: "تسجيل الفيديوهات مع جودة صوت وإضاءة احترافية.",
        priority: "urgent",
        estimatedHours: 12,
        tags: ["تصوير", "إنتاج"],
      },
      {
        title: "مونتاج الفيديوهات وتجهيز الملفات المرفقة (PDFs)",
        description: "قص المقاطع، إضافة العناصر البصرية وتصدير المواد التدريبية.",
        priority: "high",
        estimatedHours: 8,
        tags: ["مونتاج", "ملفات"],
      },
      {
        title: "رفع الفيديوهات وتأمين الاختبارات على المنصة",
        description: "إنشاء الوحدات التدريبية واختبار تجربة فتح المحتوى خطوة بخطوة.",
        priority: "medium",
        estimatedHours: 4,
        tags: ["منصة", "رفع"],
      },
      {
        title: "إطلاق حملة الحجز والتسجيل المبكر",
        description: "نشر صفحة الهبوط وتفعيل بوابات الدفع ومتابعة المسجلين.",
        priority: "high",
        estimatedHours: 5,
        tags: ["تسويق", "إطلاق"],
      },
      {
        title: "بدء لقاء البث المباشر الترحيبي ومتابعة الطلاب",
        description: "ترحيب بالدفعة الأولى والرد على الاستفسارات وإرشادهم للدراسة.",
        priority: "medium",
        estimatedHours: 3,
        tags: ["طلاب", "دعم"],
      },
    ],
  },
  {
    id: "weekly-content-calendar",
    title: "جدول محتوى تسويقي أسبوعي",
    description: "نظام أسبوعي سريع لإنتاج محتوى تيك توك، إنستجرام وفيسبوك بانتظام وبدون انقطاع.",
    categoryName: "تسويق ومحتوى",
    badge: "أسبوعي",
    iconName: "VideoCameraIcon",
    tasks: [
      {
        title: "كتابة سكريبتات 5 فيديوهات ريلز وتيك توك",
        description: "زوايا جذابة وهوك قوي في أول 3 ثواني وعرض قيمة واضح.",
        priority: "high",
        estimatedHours: 4,
        tags: ["سكريبت", "ريلز"],
      },
      {
        title: "تصوير الفيديوهات الأسبوعية دفعة واحدة (Batching)",
        description: "تجهيز الملابس والمنتجات والتسجيل الكامل في جلسة واحدة.",
        priority: "high",
        estimatedHours: 5,
        tags: ["تصوير"],
      },
      {
        title: "مونتاج وإضافة النصوص والتعليقات الصوتية",
        description: "موسيقى تريند، ترجمة نصية، وضبط الإيقاع السريع.",
        priority: "medium",
        estimatedHours: 6,
        tags: ["مونتاج"],
      },
      {
        title: "جدولة المنشورات وكتابة الكابشن مع الهاشتاجات",
        description: "جدولة أوقات الذروة والتفاعل مع المتابعين في أول نصف ساعة.",
        priority: "medium",
        estimatedHours: 2,
        tags: ["جدولة", "نشر"],
      },
      {
        title: "مراجعة تقرير الأداء والتفاعل الأسبوعي",
        description: "تحليل أفضل فيديو تفاعلاً وتكرار زواياه في الأسبوع القادم.",
        priority: "low",
        estimatedHours: 2,
        tags: ["تحليل"],
      },
    ],
  },
  {
    id: "media-buying-launch",
    title: "إطلاق حملة إعلانية وميديا باينج",
    description: "إعداد الحملات الممولة على ميتا وتيك توك من مرحلة الزوايا حتى التوسيع والتحسين.",
    categoryName: "إعلانات ممولة",
    badge: "ميديا باير",
    iconName: "ChartBarIcon",
    tasks: [
      {
        title: "صياغة 3 زوايا إعلانية وعروض مغرية (Angles & Offer)",
        description: "تحديد نقاط الألم للعميل وصياغة العرض الترويجي والخصم.",
        priority: "high",
        estimatedHours: 3,
        tags: ["زوايا", "عرض"],
      },
      {
        title: "تصميم وتجهيز 4 كرياتيف مختلف (فيديو + صور كاروسيل)",
        description: "تجهيز مقاسات 9:16 للستوري و1:1 للبوستات.",
        priority: "high",
        estimatedHours: 5,
        tags: ["كرياتيف", "تصاميم"],
      },
      {
        title: "إعداد البكسل وتجهيز حملة التحويلات (Conversions / Purchases)",
        description: "ربط الأحداث مع الكتالوج وضبط الميزانية اليومية المبدئية.",
        priority: "urgent",
        estimatedHours: 3,
        tags: ["بكسل", "إطلاق"],
      },
      {
        title: "فحص تكلفة الطلب (CPA) ومعدل العائد (ROAS) بعد 48 ساعة",
        description: "إيقاف الإعلانات الضعيفة ورفع الميزانية للإعلانات الرابحة.",
        priority: "high",
        estimatedHours: 2,
        tags: ["تحسين", "ميزانية"],
      },
    ],
  },
  {
    id: "fulfillment-dispatch",
    title: "متابعة تجهيز وشحن الطلبيات",
    description: "دورة يومية لفريق التجهيز والمخزن لمتابعة البوليصات وتسليم شركة الشحن.",
    categoryName: "عمليات ومتجر",
    badge: "عمليات",
    iconName: "TruckIcon",
    tasks: [
      {
        title: "تأكيد الطلبات المعلقة وطباعة بوليصات الشحن (AWBs)",
        description: "مراجعة العناوين وأرقام الهواتف وإصدار البوليصات.",
        priority: "urgent",
        estimatedHours: 2,
        tags: ["بوليصات", "تأكيد"],
      },
      {
        title: "تغليف وفحص المنتجات وتجهيز شحنات اليوم",
        description: "مطابقة المقاسات والألوان وتغليف آمن ضد الصدمات.",
        priority: "high",
        estimatedHours: 4,
        tags: ["تجهيز", "تغليف"],
      },
      {
        title: "تسليم الشحنات لمندوب بوسطة / شركة الشحن والتوقيع",
        description: "استلام إيصال التسليم وتحديث حالة الطلبات إلى 'قيد الشحن'.",
        priority: "high",
        estimatedHours: 1,
        tags: ["تسليم", "شحن"],
      },
      {
        title: "حصر المرتجعات وإعادتها للمخزون أو التواصل مع العميل",
        description: "فحص سلامة المرتجع وتحديث رصيد المخزن.",
        priority: "medium",
        estimatedHours: 2,
        tags: ["مرتجعات"],
      },
    ],
  },
];
