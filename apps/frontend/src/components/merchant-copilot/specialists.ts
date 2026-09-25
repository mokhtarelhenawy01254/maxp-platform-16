export interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  title: string;
  description: string;
  badge: string;
  suggestedPrompts: string[];
}

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    id: 'store-manager-agent',
    slug: 'store-manager-agent',
    name: 'كريم — مدير التشغيل',
    role: 'STORE_MANAGER',
    title: 'المدير التنفيذي للمنظومة',
    description: 'إدارة المتجر والعمليات اليومية، متابعة المبيعات والربط بين الأقسام دون تعقيد.',
    badge: 'المدير العام',
    suggestedPrompts: [
      'أعطني ملخصاً تنفيذياً سريعاً لأداء النشاط اليوم',
      'ما هي أهم المهام التي تحتاج انتباهي كصاحب عمل؟',
      'فحص إعدادات المتجر وطرق الدفع والشحن',
    ],
  },
  {
    id: 'facebook-media-buyer-agent',
    slug: 'facebook-media-buyer-agent',
    name: 'الميديا باير المحترف',
    role: 'MEDIA_BUYER',
    title: 'خبير إعلانات ميتا وفيسبوك',
    description: 'إدارة الميزانيات، صياغة زوايا البيع، مراقبة الـ CPA وقرارات SCALE و KILL.',
    badge: 'إعلانات وتسويق',
    suggestedPrompts: [
      'افحص الحملات الإعلانية الحالية وقارن CPA بهامش الربح',
      'اقترح 3 زوايا بيع وهوكات إعلانية جديدة للمنتج الأكثر مبيعاً',
      'اقترح سيناريو فيديو ترويجي 9:16 احترافي يصلح لتوليده بأداة Veo 3.1',
    ],
  },
  {
    id: 'order-confirmation-agent',
    slug: 'order-confirmation-agent',
    name: 'منى — تأكيد الطلبات',
    role: 'ORDER_CONFIRMATION',
    title: 'مسؤولة تأكيد ومتابعة الشحن',
    description: 'متابعة أوردرات الدفع عند الاستلام COD المعلقة، تتبع بوالص بوسطة وتيربو ورفع نسب التسليم.',
    badge: 'الطلبات والشحن',
    suggestedPrompts: [
      'لخص لي كل أوردرات COD المعلقة اليوم التي تحتاج تأكيد شحن فوري',
      'افحص بوالص الشحن المتأخرة لدى شركات الشحن',
      'ما هو معدل تسليم الشحنات الفعلي هذا الأسبوع؟',
    ],
  },
  {
    id: 'inventory-pricing-agent',
    slug: 'inventory-pricing-agent',
    name: 'مساعد المخزون والتسعير',
    role: 'INVENTORY_PRICING',
    title: 'خبير المستودعات والتسعير',
    description: 'مراقبة نواقص المخزون، نقاط إعادة الطلب، وحساب هوامش الربح ونقاط التعادل.',
    badge: 'المستودعات والمخازن',
    suggestedPrompts: [
      'ما المنتجات التي أوشكت على النفاد في المخزن؟',
      'احسب لي هوامش الربح ونقاط التعادل للمنتجات الأكثر حركة',
      'اعرض قائمة بأعلى 5 منتجات مبيعاً وأكثر المقاسات طلباً',
    ],
  },
  {
    id: 'competitor-analysis',
    slug: 'competitor-analysis',
    name: 'محلل إعلانات المنافسين',
    role: 'COMPETITOR_SPY',
    title: 'راصد السوق والمنافسين',
    description: 'تتبع مكتبة إعلانات ميتا واستكشاف أحدث العروض والزوايا البيعية في السوق المصري.',
    badge: 'أبحاث السوق',
    suggestedPrompts: [
      'هات لي أفضل زوايا وهوكات إعلانات المنافسين الشغالة حالياً',
      'ما العروض الترويجية الأكثر تكراراً في سوقنا هذا الشهر؟',
    ],
  },
];
