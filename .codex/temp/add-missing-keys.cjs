const fs = require('fs');

const additions = {
  archive: {
    title: 'أرشفة الوكيل',
    confirm: 'هل أنت متأكد من أرشفة <strong>{{name}}</strong>؟',
    note: 'الوكيل سيُحذف من القائمة النشطة لكن بياناته تبقى محفوظة.',
    cancel: 'إلغاء',
    archiving: 'جارٍ الأرشفة...',
    confirmButton: 'أرشفة'
  },
  settings: {
    persona: 'شخصية الوكيل',
    personaHint: 'صف الشخصية اللي هيتكلم بيها الوكيل مع العملاء',
    personaPlaceholder: 'مثال: ودود، محترف، سريع في الرد',
    goal: 'الهدف الرئيسي',
    goalHint: 'إيه أكتر حاجة المساعد دي مطلوب منه يحققها؟',
    goalPlaceholder: 'مثال: يساعد العملاء في اختيار المنتجات وإتمام الطلبات',
    tone: 'نبرة الكلام',
    toneHint: 'اختار النبرة المناسبة لطبيعة المتجر والعملاء',
    toneFriendly: 'ودود',
    toneFormal: 'رسمي',
    toneConcise: 'مختصر',
    toneDetailed: 'مفصل',
    tasks: 'المهام الأساسية',
    tasksHint: 'اكتب المهام اللي الوكيل يقدر يساعد فيها',
    tasksPlaceholder: 'مثال: الرد على الأسئلة، البحث عن المنتجات، إنشاء الطلبات',
    boundaries: 'الحدود',
    boundariesHint: 'حدد الحاجات اللي الوكيل مينفعش يعملها',
    boundariesPlaceholder: 'مثال: لا يعدل الأسعار، لا يلغي الطلبات بدون موافقة',
    language: 'لغة الرد',
    languageHint: 'اختار اللغة الافتراضية للردود',
    languageAuto: 'تلقائي',
    languageAr: 'العربية',
    languageEn: 'English',
    welcome: 'رسالة الترحيب',
    welcomeHint: 'رسالة افتتاحية اختيارية تظهر للعميل في بداية المحادثة',
    welcomePlaceholder: 'مثال: أهلاً بيك! أنا مساعدك الشخصي، إزاي أقدر أساعدك؟',
    escalation: 'عند عدم معرفة الإجابة',
    escalationHint: 'إيه اللي المساعد يعمله لما ميعرفش يرد؟'
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const arPath = 'H:/maxp-platform/apps/frontend/src/locales/ar/sections/agentProfiles.json';
const enPath = 'H:/maxp-platform/apps/frontend/src/locales/en/sections/agentProfiles.json';

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

deepMerge(ar, additions);
deepMerge(en, {
  archive: {
    title: 'Archive Agent',
    confirm: 'Are you sure you want to archive <strong>{{name}}</strong>?',
    note: 'The agent will be removed from the active list but data is preserved.',
    cancel: 'Cancel',
    archiving: 'Archiving...',
    confirmButton: 'Archive'
  },
  settings: {
    persona: 'Agent Persona',
    personaHint: 'Describe the persona the agent will use with customers',
    personaPlaceholder: 'e.g. Friendly, professional, quick to respond',
    goal: 'Primary Goal',
    goalHint: 'What is the main outcome this assistant should achieve?',
    goalPlaceholder: 'e.g. Help customers choose products and complete orders',
    tone: 'Tone of Voice',
    toneHint: 'Choose the tone that fits your store and customers',
    toneFriendly: 'Friendly',
    toneFormal: 'Formal',
    toneConcise: 'Concise',
    toneDetailed: 'Detailed',
    tasks: 'Core Tasks',
    tasksHint: 'List the tasks the agent can help with',
    tasksPlaceholder: 'e.g. Answer questions, search products, create orders',
    boundaries: 'Boundaries',
    boundariesHint: 'Define what the agent must not do',
    boundariesPlaceholder: 'e.g. Do not change prices, do not cancel orders without approval',
    language: 'Reply Language',
    languageHint: 'Choose the default language for replies',
    languageAuto: 'Auto',
    languageAr: 'Arabic',
    languageEn: 'English',
    welcome: 'Welcome Message',
    welcomeHint: 'Optional greeting shown to the customer at the start of a chat',
    welcomePlaceholder: 'e.g. Hello! I am your personal assistant, how can I help?',
    escalation: 'When Unsure',
    escalationHint: 'What should the assistant do when it does not know the answer?'
  }
});

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log('Updated section files.');
