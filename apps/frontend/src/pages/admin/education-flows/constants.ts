import type { CanvasNodeData, FlowConnection, FlowSubJourney } from './types';

export const SUB_JOURNEYS: FlowSubJourney[] = [
  {
    id: 'all',
    name: 'الرحلة الكاملة (End-to-End)',
    description: 'خط السير الكامل من أول استفسار لولي الأمر وحتى تجديد الباقة',
    nodeIds: ['node-trigger', 'node-msg-1', 'node-msg-2', 'node-delay-1', 'node-msg-3', 'node-delay-2', 'node-msg-4', 'node-cond-1', 'node-msg-5a', 'node-msg-5b', 'node-delay-3', 'node-msg-6', 'node-cond-2', 'node-msg-7'],
  },
  {
    id: 'demo_booking',
    name: '1. حجز الديمو داي',
    description: 'رسائل الترحيب وفحص السن واختيار موعد الورشة التجريبية',
    nodeIds: ['node-trigger', 'node-msg-1', 'node-msg-2'],
  },
  {
    id: 'attendance',
    name: '2. تذكيرات الحضور ومعالجة الغياب',
    description: 'تذكير قبل 24 ساعة وساعتين وتأكيد الحضور برابط الزووم',
    nodeIds: ['node-delay-1', 'node-msg-3', 'node-delay-2', 'node-msg-4', 'node-cond-1', 'node-msg-5a', 'node-msg-5b'],
  },
  {
    id: 'enrollment',
    name: '3. تقييم المستوى والاشتراك',
    description: 'إرسال تقييم المدرب ورابط دفع الباقة الإلكتروني',
    nodeIds: ['node-cond-1', 'node-msg-5a', 'node-delay-3'],
  },
  {
    id: 'retention',
    name: '4. الحصص وتجديد الساعات',
    description: 'تأكيد الحصص الأسبوعية وتنبيه التجديد قبل نفاد الساعات',
    nodeIds: ['node-delay-3', 'node-msg-6', 'node-cond-2', 'node-msg-7'],
  },
];

export const FLOW_NODES: CanvasNodeData[] = [
  {
    id: 'node-trigger',
    type: 'trigger',
    title: 'المشغل: رسالة استفسار جديدة من إعلان أو الصفحة',
    subtitle: 'انطلاق المسار فور إرسال ولي الأمر أول رسالة على واتساب أو ماسنجر',
    category: 'demo_booking',
    badges: ['مشغل البداية', '24h شباك مفتوح'],
  },
  {
    id: 'node-msg-1',
    type: 'message',
    title: 'واتساب · رسالة #1: ترحيب وفحص السن',
    channel: 'WHATSAPP',
    messageText: 'أهلاً بحضرتك يا فندم في أكاديمية البرمجة 🌸\n\nعشان نساعدك في ترشيح أنسب مسار تدريبي ومجموعة مناسبة، كم عمر الطالب؟',
    buttons: [
      { id: 'btn-age-junior', label: 'من 8 إلى 11 سنة', targetNodeId: 'node-msg-2' },
      { id: 'btn-age-senior', label: 'من 12 إلى 16 سنة', targetNodeId: 'node-msg-2' },
    ],
    footerNote: 'في انتظار اختيار ولي الأمر للفئة العمرية...',
    category: 'demo_booking',
  },
  {
    id: 'node-msg-2',
    type: 'message',
    title: 'واتساب · رسالة #2: مواعيد الديمو داي المتاحة',
    channel: 'WHATSAPP',
    messageText: 'ممتاز جداً! السن ده مناسب جداً يبدأ في ورشة تجربة البرمجة التفاعلية مجاناً.\n\nأقرب مواعيد متاحة للديمو داي:\n📅 الجمعة الساعة 4:00 عصراً (أونلاين عبر زووم)\n📅 السبت الساعة 2:00 ظهراً (في مقر الأكاديمية)',
    buttons: [
      { id: 'btn-slot-fri', label: 'تأكيد حجز الجمعة 4 عصراً', targetNodeId: 'node-delay-1' },
      { id: 'btn-slot-sat', label: 'تأكيد حجز السبت 2 ظهراً', targetNodeId: 'node-delay-1' },
      { id: 'btn-slot-other', label: 'طلب موعد آخر', targetNodeId: 'node-delay-1' },
    ],
    footerNote: 'يتم قفل المقعد تلقائياً في قاعدة البيانات وتأكيد الحجز فورا...',
    category: 'demo_booking',
  },
  {
    id: 'node-delay-1',
    type: 'delay',
    title: 'تأخير زمني: انتظر حتى قبل موعد الديمو بـ 24 ساعة',
    delayText: 'قبل الفعالية بـ 24 ساعة (T-24 Hours)',
    delayDetail: 'يتم تشغيل الرسالة التالية تلقائياً قبل بدء الجلسة بيوم كامل لتثبيت الحضور',
    category: 'attendance',
  },
  {
    id: 'node-msg-3',
    type: 'message',
    title: 'واتساب · رسالة #3: تذكير بالديمو وزر تأكيد الحضور',
    channel: 'WHATSAPP',
    messageText: 'تذكير بموعد جلسة البرمجة المجانية ⏰\n\nأهلاً بحضرتك، نذكركم بموعد ورشة العمل التجريبية لـ [اسم الطالب] غداً الساعة 4:00 عصراً.\n\n📌 يرجى الضغط على زر التأكيد أدناه لتفعيل المقعد والحصول على رابط القاعة.',
    buttons: [
      { id: 'btn-confirm-yes', label: 'تأكيد الحضور واستلام الرابط', targetNodeId: 'node-delay-2' },
      { id: 'btn-confirm-apology', label: 'اعتذار عن الموعد الحالي', targetNodeId: 'node-msg-5b' },
    ],
    footerNote: 'نقر ولي الأمر يعيد فتح نافذة الـ 24 ساعة مجاناً للردود التفاعلية...',
    category: 'attendance',
  },
  {
    id: 'node-delay-2',
    type: 'delay',
    title: 'تأخير زمني: انتظر حتى قبل الموعد بـ ساعتين',
    delayText: 'قبل الفعالية بـ ساعتين فقط (T-2 Hours)',
    delayDetail: 'تنبيه أخير بالرابط المباشر لضمان عدم نسيان ميعاد الدخول',
    category: 'attendance',
  },
  {
    id: 'node-msg-4',
    type: 'message',
    title: 'واتساب · رسالة #4: رابط قاعة الزووم المباشرة',
    channel: 'WHATSAPP',
    messageText: 'جلسة البرمجة هتبدأ بعد ساعتين! 🚀\n\nرابط الدخول المباشر إلى قاعة الزووم:\nhttps://zoom.us/j/code-demo-live\n\nكلمة المرور: 2026\nيفضل دخول الطالب من لابتوب أو كمبيوتر لتطبيق الأكواد عملياً.',
    buttons: [
      { id: 'btn-zoom-enter', label: 'دخول القاعة الآن' },
    ],
    footerNote: 'تم إرسال تنبيه للمهندس المشرف ببيانات الطالب...',
    category: 'attendance',
  },
  {
    id: 'node-cond-1',
    type: 'condition',
    title: 'شرط وتفرع: هل حضر الطالب جلسة الديمو فعلياً؟',
    conditionQuestion: 'فحص حالة الحضور المسجلة من المهندس بعد انتهاء موعد الجلسة',
    branches: {
      yes: { label: 'نعم: حضر الجلسة وتفاعل', targetId: 'node-msg-5a' },
      no: { label: 'لا: لم يحضر (غائب)', targetId: 'node-msg-5b' },
    },
    category: 'attendance',
  },
  {
    id: 'node-msg-5a',
    type: 'message',
    title: 'واتساب · مسار الحضور: تقييم المستوى ورابط الدفع',
    channel: 'WHATSAPP',
    messageText: 'سعدنا جداً بمشاركة [اسم الطالب] في ورشة اليوم وتفاعله المتميز! 🌟\n\nبناءً على تقييم المدرب، المستوى المرشح له:\nالمستوى الأول: أساسيات التفكير البرمجي وصناعة الألعاب (16 ساعة تدريبية).\n\nسعر الباقة بعد خصم الديمو (10%): 1,200 ج.م بدلاً من 1,400 ج.م.\n\nرابط السداد الإلكتروني وتفعيل الاشتراك فوراً:',
    buttons: [
      { id: 'btn-pay-link', label: 'الدفع وتأكيد الاشتراك (فوري / كارت / إنستاباي)', targetNodeId: 'node-delay-3' },
      { id: 'btn-talk-admin', label: 'تحدث مع المشرف التعليمي' },
    ],
    footerNote: 'بمجرد الدفع يتم تفعيل حساب الطالب وبوابة ولي الأمر تلقائياً...',
    category: 'enrollment',
  },
  {
    id: 'node-msg-5b',
    type: 'message',
    title: 'واتساب · مسار الغياب: استعادة العميل بحجز ديمو بديل',
    channel: 'WHATSAPP',
    messageText: 'لعله خير! لاحظنا أنكم لم تتمكنوا من حضور جلسة البرمجة اليوم 🌸\n\nلأننا حريصون على تجربة [اسم الطالب] للبرمجة، وفرنا لكم مقعداً بديلاً في ديمو الأسبوع القادم مجاناً.\n\nتحب نثبت حجز الجمعة القادمة 4 عصراً؟',
    buttons: [
      { id: 'btn-rebook-yes', label: 'نعم، احجز لي الجمعة القادمة', targetNodeId: 'node-delay-1' },
      { id: 'btn-rebook-cancel', label: 'إلغاء المتابعة حالياً' },
    ],
    footerNote: 'يمنع تسرب العميل ويرفع نسبة التحويل الإجمالية لأكثر من 70%...',
    category: 'attendance',
  },
  {
    id: 'node-delay-3',
    type: 'delay',
    title: 'تأخير زمني: أثناء سير الكورس (بعد انتهاء كل حصة)',
    delayText: 'بعد انتهاء كل حصة دراسية مباشرة',
    delayDetail: 'يتم احتساب الدقائق الفعلية وخصمها من رصيد باقة الطالب',
    category: 'retention',
  },
  {
    id: 'node-msg-6',
    type: 'message',
    title: 'واتساب · رسالة تأكيد الحصة ورصيد الساعات المتبقي',
    channel: 'WHATSAPP',
    messageText: 'تم تأكيد حضور حصة اليوم بنجاح ✅\n\nالطالب: [اسم الطالب]\nالمادة: برمجة وتطوير الألعاب\nمدة الحصة: 60 دقيقة\n\n⏰ رصيد الساعات المتبقي في الباقة: [ساعتان فقط]',
    buttons: [
      { id: 'btn-view-portal', label: 'متابعة تقرير الحصة في بوابة ولي الأمر' },
    ],
    footerNote: 'يتم إرسال إشعار ويب مجاني أولاً ثم واتساب لتوفير التكاليف...',
    category: 'retention',
  },
  {
    id: 'node-cond-2',
    type: 'condition',
    title: 'شرط استباقي: هل رصيد الساعات المتبقي ≤ ساعتين؟',
    conditionQuestion: 'التحقق التلقائي من اقتراب نفاد ساعات الطالب لضمان عدم توقف دراسته',
    branches: {
      yes: { label: 'نعم: الرصيد قارب على النفاد', targetId: 'node-msg-7' },
      no: { label: 'لا: ما زال هناك رصيد كافٍ', targetId: 'node-delay-3' },
    },
    category: 'retention',
  },
  {
    id: 'node-msg-7',
    type: 'message',
    title: 'واتساب · عرض التجديد الاستباقي بنقرة واحدة',
    channel: 'WHATSAPP',
    messageText: 'تنبيه رصيد الساعات ⏳\n\nأهلاً بحضرتك، رصيد [اسم الطالب] أوشك على الانتهاء (متبقي ساعتان فقط - حصة واحدة قادمة).\n\nلضمان استمرار الطالب في نفس المجموعة ومع نفس المهندس دون انقطاع، يمكنكم تجديد باقة الـ 16 ساعة القادمة بنقرة واحدة مع خصم الاستمرارية (10%).',
    buttons: [
      { id: 'btn-renew-pay', label: 'تجديد الباقة الآن (سداد إلكتروني)' },
      { id: 'btn-renew-talk', label: 'التحدث مع إدارة المركز' },
    ],
    footerNote: 'يحافظ على استبقاء الطلاب بنسبة تزيد عن 80% أوتوماتيكياً...',
    category: 'retention',
  },
];

export const FLOW_CONNECTIONS: FlowConnection[] = [
  { fromId: 'node-trigger', toId: 'node-msg-1' },
  { fromId: 'node-msg-1', toId: 'node-msg-2' },
  { fromId: 'node-msg-2', toId: 'node-delay-1' },
  { fromId: 'node-delay-1', toId: 'node-msg-3' },
  { fromId: 'node-msg-3', toId: 'node-delay-2' },
  { fromId: 'node-delay-2', toId: 'node-msg-4' },
  { fromId: 'node-msg-4', toId: 'node-cond-1' },
  // Condition 1 branches:
  { fromId: 'node-cond-1', toId: 'node-msg-5a', fromPort: 'yes', color: '#10b981', label: 'نعم: حضر' },
  { fromId: 'node-cond-1', toId: 'node-msg-5b', fromPort: 'no', color: '#f59e0b', label: 'لا: غاب' },
  // After enrollment:
  { fromId: 'node-msg-5a', toId: 'node-delay-3' },
  { fromId: 'node-delay-3', toId: 'node-msg-6' },
  { fromId: 'node-msg-6', toId: 'node-cond-2' },
  // Condition 2 branches:
  { fromId: 'node-cond-2', toId: 'node-msg-7', fromPort: 'yes', color: '#f59e0b', label: 'الرصيد أوشك على الانتهاء' },
];
