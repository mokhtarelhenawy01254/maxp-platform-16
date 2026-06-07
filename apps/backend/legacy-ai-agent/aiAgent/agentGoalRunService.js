/**
 * @module agentGoalRunService
 * @description Durable-ish per-chat goal runs for resumable CEO Agent work.
 *
 * This is the workflow state layer between chat turns and the intent/tool
 * gateway. It keeps short follow-ups like "499" and "كمل" attached to the
 * active goal instead of treating every message as a fresh standalone prompt.
 */

const agentRunRuntimeService = require('./agentRunRuntimeService');
const agentIntentRelevanceService = require('./agentIntentRelevanceService');

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\p{L}\p{N}_\s.,:-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, needles = []) {
  const normalized = normalizeText(text);
  return needles.some(needle => normalized.includes(normalizeText(needle)));
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function parseNumber(value) {
  const match = normalizeText(value).match(/\b\d+(?:[.,]\d+)?\b/);
  if (!match) return null;
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function isShortNumeric(value = '') {
  return /^\s*[٠-٩۰-۹\d]+(?:[.,][٠-٩۰-۹\d]+)?\s*$/.test(String(value || ''));
}

function isProductGoalStart(message = '') {
  return includesAny(message, [
    'منتج جديد',
    'اعمل منتج',
    'انشئ منتج',
    'اضيف منتج',
    'اضافة منتج',
    'ضيف منتج',
    'نضيف منتج',
    'create product',
    'add product',
  ]) || (
    includesAny(message, ['كوتشي', 'جزمه', 'حذاء', 'شنطه', 'شنطة', 'تيشيرت', 'فستان'])
    && includesAny(message, ['اعمل', 'انشئ', 'اضيف', 'ضيف', 'نعمل', 'نضيف'])
  );
}

function isAgentTaskDelegationMessage(message = '') {
  const text = normalizeText(message);
  return includesAny(text, ['ايجنت', 'اجينت', 'وكيل', 'agent'])
    && includesAny(text, [
      'كلف', 'كلفه', 'كلف الوكيل', 'اطلب من', 'اطلب منه', 'شغل الوكيل',
      'اختبر الوكيل', 'اختبار تشغيل الوكيل', 'جرب الوكيل', 'run agent', 'assign task',
    ]);
}

function isAgentSkillGoalStart(message = '') {
  const text = normalizeText(message);
  if (isSkillOnlyActionStart(text)) return false;
  const delegatesToExistingAgent = isAgentTaskDelegationMessage(text);
  const explicitlyCreatesAgent = includesAny(text, [
    'ايجنت جديد', 'اجينت جديد', 'وكيل جديد', 'اعمل وكيل', 'انشئ وكيل',
    'اخلق وكيل', 'وظف وكيل', 'عين وكيل', 'create agent', 'hire agent',
  ]);
  if (delegatesToExistingAgent && !explicitlyCreatesAgent) return false;
  const wantsAgent = includesAny(text, [
    'ايجنت', 'اجينت', 'وكيل', 'وكلاء', 'agent',
  ]);
  const wantsAction = includesAny(text, [
    'اعمل', 'انشئ', 'اخلق', 'وظف', 'عين', 'ننشئ', 'نعمل', 'جديد',
    'عايز', 'اريد', 'محتاج', 'عمل',
    'create', 'spawn', 'hire',
  ]);
  const mentionsSkillOrPurpose = includesAny(text, [
    'مهاره', 'مهارات', 'بيع', 'اوردر', 'طلبات', 'رد علي رسايل', 'رد على رسايل',
    'فيس بوك', 'فيسبوك', 'facebook', 'messenger', 'sales', 'support',
    'دعم', 'دعم فني', 'خدمه عملاء', 'خدمة عملاء', 'تسويق', 'اعلانات', 'اعلان',
    'مخزون', 'مخازن', 'ستوك', 'شحن', 'توصيل', 'hr', 'موارد بشريه', 'موظفين',
  ]);
  return wantsAgent && wantsAction && (mentionsSkillOrPurpose || explicitlyCreatesAgent);
}

function isSkillOnlyActionStart(message = '') {
  const text = normalizeText(message);
  const wantsSkill = includesAny(text, [
    'مهاره', 'مهارات', 'skill', 'skill.create',
  ]);
  const wantsAction = includesAny(text, [
    'اعمل', 'انشئ', 'اخلق', 'ضيف', 'صمم', 'جهز', 'ابني', 'بني',
    'create', 'add', 'build', 'draft', 'new',
  ]) || /(?:^|\s)(?:انشاء|اضافه|بناء|تصميم)(?:\s|$)/u.test(text);
  if (!wantsSkill || !wantsAction) return false;

  const explicitlyCreatesAgent = includesAny(text, [
    'ايجنت جديد',
    'اجينت جديد',
    'وكيل جديد',
    'اعمل وكيل',
    'انشئ وكيل',
    'اخلق وكيل',
    'وظف وكيل',
    'عين وكيل',
    'create agent',
    'hire agent',
    'spawn agent',
    'agent.spawn',
  ]);

  return !explicitlyCreatesAgent || includesAny(text, ['مهاره فقط', 'مهارة فقط', 'skill only']);
}

function isCancel(message = '') {
  return includesAny(message, ['الغاء', 'الغي', 'وقف', 'مش عايز', 'cancel', 'stop']);
}

function shouldDetachActiveGoal(run = null, message = '') {
  if (!run || ['completed', 'cancelled'].includes(run.status)) return false;
  if (agentIntentRelevanceService._private?.isAmbiguousCreateRequest(message)) return true;
  if (isCancel(message) || isExecutionConfirmation(message) || isStrongExecutionConfirmation(message)) return false;
  if (run.type === 'create_agent_with_skill') {
    return isProductGoalStart(message) || isSkillOnlyActionStart(message) || isAgentTaskDelegationMessage(message);
  }
  if (run.type === 'create_product') {
    return isAgentSkillGoalStart(message) || isSkillOnlyActionStart(message);
  }
  return false;
}

function isExecutionConfirmation(message = '') {
  const text = normalizeText(message);
  if (!text) return false;
  if (includesAny(text, ['لكل متغير', 'لكل مقاس', 'لكل لون'])) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 12) return false;
  return includesAny(text, [
    'كمل',
    'نفذ',
    'ابدأ',
    'ابدا',
    'ابدء',
    'موافق',
    'تمام نفذ',
    'اكد',
    'اؤكد',
    'اعمل المسوده',
    'اعمل المسودة',
    'go ahead',
    'do it',
  ]);
}

function isStrongExecutionConfirmation(message = '') {
  const text = normalizeText(message);
  if (!text) return false;
  if (includesAny(text, ['لكل متغير', 'لكل مقاس', 'لكل لون'])) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 16) return false;
  return includesAny(text, [
    'نفذ',
    'ابدأ التنفيذ',
    'ابدء التنفيذ',
    'ابدا التنفيذ',
    'لبدء ف التنفيذ',
    'ابدأ',
    'ابدء',
    'ابدا',
    'كمل',
    'نعم',
    'اه',
    'اوكي',
    'ok',
    'yes',
    'موافق',
    'تمام',
    'go ahead',
    'do it',
    'start execution',
  ]);
}

function hasInlineExecutionInstruction(message = '') {
  const text = normalizeText(message);
  if (!text) return false;
  return includesAny(text, [
    'نفذ بالاداه',
    'نفذ بالاداة',
    'نفذ الاداه',
    'نفذ الاداة',
    'استخدم الاداه',
    'استخدم الاداة',
    'استدعي الاداه',
    'استدعي الاداة',
    'نفذ الان',
    'ابدأ التنفيذ',
    'ابدء التنفيذ',
    'ابدا التنفيذ',
    'go ahead and execute',
    'execute now',
  ]);
}

function isAgentFieldCorrectionOnly(message = '') {
  const text = normalizeText(message);
  if (!text || hasInlineExecutionInstruction(text)) return false;
  if (includesAny(text, ['نفذ', 'ابدأ التنفيذ', 'ابدء التنفيذ', 'ابدا التنفيذ', 'لبدء ف التنفيذ', 'go ahead', 'do it', 'execute'])) {
    return false;
  }
  return includesAny(text, [
    'بس اسمه',
    'بس اسمها',
    'بس الاسم',
    'خلي الاسم',
    'خلي اسمه',
    'خليه اسمه',
    'خليها اسمها',
    'غير الاسم',
    'اسمه',
    'اسمها',
  ]);
}

function splitList(value = '') {
  const cleaned = normalizeText(value)
    .replace(/\b(والالوان|الالوان|والوان|الوان|الألوان|ألوان|متوفره|متوفر|هي|هما)\b/g, ' ')
    .replace(/[،/|]+/g, ' ');
  return uniqueStrings(cleaned.split(/\s+/).filter(token => token && token.length > 1));
}

function extractAgentName(message = '') {
  const raw = String(message || '');
  const patterns = [
    /(?:باسم|بإسم)\s+([^\n،,.]+)/iu,
    /(?:خلي\s+الاسم|خلي\s+اسمه|خليه\s+اسمه|خليها\s+اسمها|اسمه|اسمها|اسم\s+الوكيل|سميه|سمية)\s+([^\n،,.]+)/iu,
    /(?:اسمه|اسمها)\s*[:=]\s*([^\n،,.]+)/iu,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const name = match[1]
        .replace(/\b(?:والطريقه|والطريقة|والاسلوب|والأسلوب|وكمان|كمان)\b.*$/iu, '')
        .trim();
      if (name.length >= 2 && name.length <= 60) return name;
    }
  }
  return null;
}

function extractAgentStyle(message = '') {
  const text = normalizeText(message);
  if (includesAny(text, ['ود', 'ودود', 'في ود'])) return 'ودود، هادي، ومباشر مع العميل';
  if (includesAny(text, ['مرح', 'خفيف'])) return 'مرح وخفيف بدون مبالغة';
  const raw = String(message || '');
  const match = raw.match(/(?:الطريقة\s+بتاعته|الطريقه\s+بتاعته|اسلوبه|أسلوبه|اسلوبها|أسلوبها|طريقة\s+الرد)\s*(?:في|يبقى|يبقي|يكون)?\s+([^\n،,.]+)/iu);
  return match?.[1]?.trim() || null;
}

function inferAgentRole(message = '', previous = {}, llmSlots = {}) {
  // Check LLM-extracted agent description first (more dialect-robust than keywords)
  const agentHint = normalizeText(llmSlots.agent || llmSlots.skill || '');
  if (agentHint) {
    if (agentHint.includes('مخزون') || agentHint.includes('مخازن') || agentHint.includes('inventory')) return 'INVENTORY';
    if (agentHint.includes('تسويق') || agentHint.includes('اعلان') || agentHint.includes('marketing')) return 'MARKETING';
    if (agentHint.includes('شحن') || agentHint.includes('توصيل') || agentHint.includes('shipping')) return 'SHIPPING';
    if (agentHint.includes('دعم') || agentHint.includes('support')) return 'SUPPORT';
    if (agentHint.includes('بيع') || agentHint.includes('اوردر') || agentHint.includes('sales') || agentHint.includes('فيس')) return 'SALES';
  }
  // Keyword fallback on the raw message
  const text = normalizeText(message);
  if (includesAny(text, ['مخزون', 'مخازن', 'inventory'])) return 'INVENTORY';
  if (includesAny(text, ['تسويق', 'اعلان', 'اعلانات', 'marketing', 'facebook_ad'])) return 'MARKETING';
  if (includesAny(text, ['شحن', 'توصيل', 'shipping'])) return 'SHIPPING';
  if (includesAny(text, ['دعم', 'support'])) return 'SUPPORT';
  if (includesAny(text, ['بيع', 'اوردر', 'طلبات', 'رسايل الفيس', 'رسائل الفيس', 'فيس بوك', 'فيسبوك', 'messenger', 'sales'])) return 'SALES';
  return previous.role || 'SALES';
}

function inferAgentChannel(message = '', previous = {}) {
  const text = normalizeText(message);
  if (includesAny(text, ['فيس بوك', 'فيسبوك', 'facebook', 'messenger'])) return 'facebook';
  return previous.channel || null;
}

function inferDefaultAgentName(message = '', current = {}) {
  if (current.agentName) return current.agentName;
  const text = normalizeText(message);
  const role = current.role || inferAgentRole(message, current);
  const channel = current.channel || inferAgentChannel(message, current);
  if (role === 'SALES' && channel === 'facebook') return 'وكيل مبيعات فيسبوك';
  if (role === 'SALES' && includesAny(text, ['اوردر', 'طلبات', 'بيع', 'sales'])) return 'وكيل المبيعات';
  if (role === 'SALES') return 'وكيل المبيعات';
  if (role === 'SUPPORT' && channel === 'facebook') return 'وكيل دعم فيسبوك';
  if (role === 'SUPPORT') return 'وكيل الدعم';
  if (role === 'MARKETING') return 'وكيل التسويق';
  if (role === 'INVENTORY') return 'وكيل المخزون';
  if (role === 'SHIPPING') return 'وكيل الشحن';
  return null;
}

function buildSalesSkill(agentName = 'وكيل المبيعات') {
  return {
    id: 'facebook-sales-conversion',
    displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
    description: 'تحويل محادثات فيسبوك إلى مسودات طلبات مؤكدة بخطوات بيع آمنة ومؤرشفة.',
    purpose: 'مساعدة العميل في اختيار المنتج المناسب وجمع بيانات الطلب حتى يصبح جاهزاً كمسودة طلب تحتاج موافقة التاجر.',
    triggerPhrases: [
      'عميل يسأل عن منتج من فيسبوك',
      'محادثة Messenger تحتاج تحويل لطلب',
      'العميل مهتم بالشراء',
    ],
    steps: [
      'افهم المنتج أو العرض الذي يسأل عنه العميل.',
      'استخدم product.search عند الحاجة لتثبيت بيانات المنتج.',
      'اسأل فقط عن البيانات الناقصة لإكمال الطلب.',
      'استخدم order.create_draft فقط بعد تأكيد المنتج والسعر والكمية وبيانات العميل الأساسية.',
      'لخص مسودة الطلب ووضح أنها تحتاج موافقة التاجر قبل التنفيذ النهائي.',
      'لا تدعي إنشاء طلب نهائي أو خصم إلا بعد نتيجة أداة مؤكدة.',
    ],
    constraints: [
      'لا تخترع سعر أو مخزون أو ميعاد تسليم.',
      'لا تضغط على العميل برسائل متكررة.',
      'إنشاء الطلبات يتم كمسودة/طلب موافقة وليس كتأكيد نهائي بدون مراجعة بشرية.',
      `حافظ على أسلوب ${agentName} الودود والمختصر.`,
    ],
    examples: [
      'العميل: السعر كام؟',
      'العميل: عايز أطلب اللون الأسود مقاس 38.',
    ],
    allowedTools: ['product.search', 'customer.info', 'order.create_draft'],
  };
}

function buildDefaultSkillForRole(role = '', agentName = '') {
  const name = agentName || 'الوكيل';
  switch (String(role).toUpperCase()) {
    case 'SALES':
      return buildSalesSkill(name);
    case 'SUPPORT':
      return {
        id: 'customer-support-general',
        displayName: 'دعم العملاء العام',
        description: 'الرد على استفسارات العملاء وحل مشاكلهم بأسلوب احترافي.',
        purpose: 'مساعدة العملاء في حل مشاكلهم والإجابة على استفساراتهم.',
        triggerPhrases: ['عميل يحتاج مساعدة', 'شكوى عميل', 'استفسار عميل'],
        steps: ['استمع لمشكلة العميل بدقة.', 'قدم حلاً واضحاً ومختصراً.', 'تأكد من رضا العميل عن الحل.'],
        constraints: [`لا تعد بما هو خارج صلاحياتك. حافظ على أسلوب ${name} الودود.`],
        allowedTools: ['order.lookup', 'customer.info'],
      };
    case 'INVENTORY':
      return {
        id: 'inventory-management-general',
        displayName: 'إدارة المخزون',
        description: 'مراقبة مستويات المخزون وإبلاغ الفريق عن المنتجات الناقصة.',
        purpose: 'ضمان توفر المنتجات وتنبيه الفريق عند انخفاض الكميات.',
        triggerPhrases: ['مخزون منخفض', 'كمية ناقصة', 'تحديث المخزون'],
        steps: ['راجع مستويات المخزون الحالية.', 'حدد المنتجات التي تحتاج تجديداً.', 'أبلغ الفريق بالنتائج.'],
        constraints: [`لا تعدّل الأسعار بدون موافقة. حافظ على ${name} دقيقاً في الأرقام.`],
        allowedTools: ['inventory.check', 'product.lowStock', 'product.search'],
      };
    case 'SHIPPING':
      return {
        id: 'shipping-general',
        displayName: 'إدارة الشحن والتوصيل',
        description: 'متابعة الطلبات ومستجدات الشحن والتواصل مع العملاء.',
        purpose: 'ضمان وصول الطلبات في الوقت المحدد وحل مشاكل الشحن.',
        triggerPhrases: ['طلب في الطريق', 'متابعة شحنة', 'مشكلة توصيل'],
        steps: ['تحقق من حالة الطلب.', 'أبلغ العميل بالمستجدات.', 'سجّل أي مشاكل في التوصيل.'],
        constraints: [`لا تؤكد مواعيد التسليم بدون بيانات حقيقية. احتفظ بأسلوب ${name} المحترم.`],
        allowedTools: ['order.lookup', 'order.summary'],
      };
    case 'MARKETING':
      return {
        id: 'marketing-general',
        displayName: 'تسويق وترويج',
        description: 'إدارة المحتوى التسويقي ومتابعة أداء الحملات.',
        purpose: 'رفع مبيعات الشركة من خلال الترويج الفعّال للمنتجات.',
        triggerPhrases: ['حملة إعلانية', 'ترويج منتج', 'محتوى تسويقي'],
        steps: ['حدد الجمهور المستهدف.', 'اقترح محتوى تسويقياً مناسباً.', 'تابع نتائج الحملة.'],
        constraints: [`لا تنشر معلومات غير مدققة. حافظ على ${name} منسجماً مع هوية الشركة.`],
        allowedTools: ['product.search', 'product.topSelling', 'sales.revenue'],
      };
    default:
      return null;
  }
}

function extractAgentSkill(message = '', previous = {}) {
  const text = normalizeText(message);
  if (previous.skill && !includesAny(text, ['مهاره', 'مهارات', 'بيع', 'اوردر', 'طلبات', 'فيس بوك', 'فيسبوك', 'facebook'])) {
    return previous.skill;
  }
  if (includesAny(text, ['بيع', 'اوردر', 'طلبات', 'فيس بوك', 'فيسبوك', 'facebook', 'messenger'])) {
    return buildSalesSkill(previous.agentName || extractAgentName(message) || 'وكيل المبيعات');
  }
  // Auto-generate a default skill from the known role so the goal can proceed
  if (!previous.skill && previous.role) {
    return buildDefaultSkillForRole(previous.role, previous.agentName);
  }
  return previous.skill || null;
}

function getAgentGoalMissingFields(data = {}) {
  const missing = [];
  if (!data.agentName) missing.push('agentName');
  if (!data.role) missing.push('role');
  if (!data.skill) missing.push('skill');
  return missing;
}

function buildAgentExecutionParams(data = {}) {
  const style = data.style || 'ودود ومباشر';
  const agent = {
    role: data.role || 'SALES',
    name: data.agentName,
    templateSlug: data.role === 'SALES' ? 'sales-agent' : undefined,
    persona: {
      style,
      channel: data.channel || null,
      goal: data.skill?.purpose || null,
    },
  };
  const skill = data.skill ? {
    ...data.skill,
    assignToAgentId: '$createdAgentId',
    overwrite: true,
  } : null;
  return { agent, skill };
}

function extractColors(message = '') {
  const originalLines = String(message || '').split(/\r?\n/);
  const colorLine = originalLines.find(line => includesAny(line, ['الالوان', 'الألوان', 'الوان', 'ألوان']));
  if (!colorLine) return [];
  const afterColon = colorLine.split(/[:：]/).pop();
  return splitList(afterColon)
    .filter(color => !['الالوان', 'الألوان', 'الوان', 'ألوان'].includes(color));
}

function extractSizes(message = '') {
  const text = normalizeText(message);
  const range = text.match(/\b(?:من\s*)?(\d{1,2})\s*(?:ل|الى|الي|إلى|-|to)\s*(\d{1,2})\b/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start && end - start <= 80) {
      return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
    }
  }
  if (!includesAny(text, ['مقاس', 'مقاسات', 'size', 'sizes'])) return [];
  return uniqueStrings((text.match(/\b\d{1,2}\b/g) || []).map(String));
}

function extractProductName(message = '') {
  const explicit = String(message || '').match(/(?:اسمه|اسم المنتج)\s+([^,\n.]+)/i);
  if (explicit?.[1]) return explicit[1].trim();

  const lines = String(message || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const productLine = lines.find(line => includesAny(line, ['كوتشي', 'جزمه', 'حذاء', 'شنطه', 'شنطة', 'تيشيرت', 'فستان']))
    || lines.find(line => includesAny(line, ['منتج']));
  if (!productLine) return null;

  let name = productLine
    .replace(/عايز|نريد|نعمل|نضيف|اضيف|ضيف|اعمل|انشئ|منتج|جديد/gi, ' ')
    .replace(/من\s*[٠-٩۰-۹\d]+\s*(?:ل|الى|الي|إلى|-|to)\s*[٠-٩۰-۹\d]+.*$/i, ' ')
    .replace(/المقاس.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || name.length < 2) return null;
  return name;
}

function extractPrice(message = '', current = {}) {
  const text = normalizeText(message);
  if (includesAny(text, ['لكل متغير', 'لكل مقاس', 'كل متغير', 'مخزون', 'كمية', 'stock'])) return null;
  if (isShortNumeric(message) && current.name && current.price === undefined) return parseNumber(message);
  if (!includesAny(text, ['سعر', 'السعر', 'price', 'egp', 'جنيه'])) return null;
  const value = parseNumber(message);
  return value !== null ? value : null;
}

function extractStockPerVariant(message = '') {
  const text = normalizeText(message);
  if (!includesAny(text, ['لكل متغير', 'كل متغير', 'لكل مقاس', 'لكل لون', 'مخزون', 'كمية', 'stock'])) return null;
  const value = parseNumber(message);
  return value !== null ? Math.max(0, Math.floor(value)) : null;
}

function buildDescription(data = {}) {
  const parts = [];
  const name = data.name || 'منتج';
  parts.push(`${name} عملي ومريح للاستخدام اليومي.`);
  if (Array.isArray(data.sizes) && data.sizes.length) {
    parts.push(`متوفر بمقاسات من ${data.sizes[0]} إلى ${data.sizes[data.sizes.length - 1]}.`);
  }
  if (Array.isArray(data.colors) && data.colors.length) {
    parts.push(`الألوان المتاحة: ${data.colors.join('، ')}.`);
  }
  parts.push('تصميم مناسب للإطلالات الكاجوال، وخامة خفيفة تساعد على الراحة في الحركة.');
  return parts.join(' ');
}

function getMissingFields(data = {}) {
  const missing = [];
  if (!data.name) missing.push('name');
  if (data.price === undefined || data.price === null) missing.push('price');
  return missing;
}

function buildExecutionParams(data = {}) {
  return {
    name: data.name,
    description: data.description || buildDescription(data),
    price: data.price,
    sku: data.sku || '',
    stock: Number.isFinite(Number(data.stockPerVariant)) ? Number(data.stockPerVariant) : 0,
    colors: Array.isArray(data.colors) ? data.colors : [],
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    tags: ['ai-agent-draft'],
  };
}

function publicSnapshot(run = null) {
  return agentRunRuntimeService.publicSnapshot(run);
}

class AgentGoalRunService {
  _cacheKey(companyId, conversationId) {
    return agentRunRuntimeService._cacheKey(companyId, conversationId);
  }

  async loadActiveRun(companyId, conversationId) {
    return agentRunRuntimeService.loadActiveRun(companyId, conversationId);
  }

  async processTurn({ companyId, userId, conversationId, sessionId, message, preClassified = null }) {
    const current = await this.loadActiveRun(companyId, conversationId);
    let run = current;

    if (run && isCancel(message)) {
      run = agentRunRuntimeService.transitionRun(run, {
        status: 'cancelled',
        nextStep: 'cancelled',
      }, { type: 'cancelled', message });
      await this.saveRun(companyId, conversationId, run);
      return { activeGoal: publicSnapshot(run), changed: true, promptBlock: this.formatPromptBlock(run) };
    }

    if (shouldDetachActiveGoal(run, message)) {
      const detachedRun = agentRunRuntimeService.transitionRun(run, {
        status: 'cancelled',
        nextStep: 'superseded_by_new_request',
      }, { type: 'superseded', message });
      await this.saveRun(companyId, conversationId, detachedRun);
      run = null;
    }

    if (!run) {
      const llmIntent = preClassified?.intent;
      // LLM intent is primary; keywords are the fallback for robustness
      const startsProduct = llmIntent === 'goals.create_product'
        || llmIntent === 'products.manage'
        || isProductGoalStart(message);
      const startsAgent = llmIntent === 'agents.manage'
        || llmIntent === 'goals.create_agent_with_skill'
        || isAgentSkillGoalStart(message);

      if (startsProduct) {
        run = agentRunRuntimeService.createRun({
          type: 'create_product',
          title: 'إنشاء منتج جديد',
          companyId,
          userId,
          sessionId,
          conversationId,
          message,
        });
      } else if (startsAgent) {
        run = agentRunRuntimeService.createRun({
          type: 'create_agent_with_skill',
          title: 'إنشاء وكيل ومهارة',
          companyId,
          userId,
          sessionId,
          conversationId,
          message,
        });
      }
    }

    if (!run || ['completed', 'cancelled'].includes(run.status)) {
      return { activeGoal: publicSnapshot(run), changed: false, promptBlock: this.formatPromptBlock(run) };
    }

    if (run.type === 'create_agent_with_skill') {
      const previous = run.collected || {};
      // Use LLM-extracted agent slot as additional hint for role inference
      const llmSlots = preClassified?.slots || {};
      const agentName = extractAgentName(message);
      const style = extractAgentStyle(message);
      const role = inferAgentRole(message, previous, llmSlots);
      const channel = inferAgentChannel(message, previous);
      const nextBase = {
        ...previous,
        ...(agentName ? { agentName } : {}),
        ...(style ? { style } : {}),
        ...(role ? { role } : {}),
        ...(channel ? { channel } : {}),
      };
      if (!nextBase.agentName) {
        const inferredAgentName = inferDefaultAgentName(message, nextBase);
        if (inferredAgentName) nextBase.agentName = inferredAgentName;
      }
      let skill = extractAgentSkill(message, nextBase);
      if (skill?.id === 'facebook-sales-conversion' && nextBase.agentName) {
        skill = buildSalesSkill(nextBase.agentName);
      }
      const collected = {
        ...nextBase,
        ...(skill ? { skill } : {}),
      };
      const missingFields = getAgentGoalMissingFields(collected);
      const ready = missingFields.length === 0;
      const confirmed = ready && (
        hasInlineExecutionInstruction(message)
        || (isStrongExecutionConfirmation(message) && !isAgentFieldCorrectionOnly(message))
      );
      const nextRun = agentRunRuntimeService.transitionRun(run, {
        collected,
        missingFields,
        status: confirmed ? 'ready_to_execute' : ready ? 'waiting_for_confirmation' : 'collecting',
        nextStep: confirmed ? 'execute_tool' : ready ? 'confirm_agent_and_skill' : 'collect_missing_fields',
        executionParams: ready ? buildAgentExecutionParams(collected) : null,
        plan: ready ? ['agent.spawn', ...(collected.skill ? ['skill.create'] : [])] : [],
      }, {
        type: confirmed ? 'confirmed' : 'updated',
        message,
        collected,
        missingFields,
      });
      await this.saveRun(companyId, conversationId, nextRun);
      return { activeGoal: publicSnapshot(nextRun), changed: true, promptBlock: this.formatPromptBlock(nextRun) };
    }

    if (run.type !== 'create_product') {
      return { activeGoal: publicSnapshot(run), changed: false, promptBlock: this.formatPromptBlock(run) };
    }

    const previous = run.collected || {};
    const colors = extractColors(message);
    const sizes = extractSizes(message);
    const name = extractProductName(message);
    const price = extractPrice(message, previous);
    const stockPerVariant = extractStockPerVariant(message);

    const collected = {
      ...previous,
      ...(name ? { name } : {}),
      ...(colors.length ? { colors } : {}),
      ...(sizes.length ? { sizes } : {}),
      ...(price !== null ? { price } : {}),
      ...(stockPerVariant !== null ? { stockPerVariant } : {}),
    };
    const missingFields = getMissingFields(collected);
    const ready = missingFields.length === 0;
    const confirmed = ready && isExecutionConfirmation(message);

    const nextRun = agentRunRuntimeService.transitionRun(run, {
      collected,
      missingFields,
      status: confirmed ? 'ready_to_execute' : ready ? 'waiting_for_confirmation' : 'collecting',
      nextStep: confirmed ? 'execute_tool' : ready ? 'confirm_create_draft' : 'collect_missing_fields',
      executionParams: ready ? buildExecutionParams(collected) : null,
    }, {
      type: confirmed ? 'confirmed' : 'updated',
      message,
      collected,
      missingFields,
    });

    await this.saveRun(companyId, conversationId, nextRun);
    return { activeGoal: publicSnapshot(nextRun), changed: true, promptBlock: this.formatPromptBlock(nextRun) };
  }

  async applyTaskResult(companyId, conversationId, taskResult = {}) {
    const run = await this.loadActiveRun(companyId, conversationId);
    if (!run || run.status !== 'ready_to_execute') return null;
    const tools = taskResult?.result?.tools || taskResult?.tools || [];
    let success = false;
    let error = null;
    let resultRefs = {};

    if (run.type === 'create_product') {
      const productCreate = tools.find(tool => tool.tool === 'product.create');
      if (!productCreate) return null;
      success = Boolean(productCreate.success);
      error = productCreate.error || null;
      resultRefs = { product: productCreate.result || null };
    } else if (run.type === 'create_agent_with_skill') {
      const agentSpawn = tools.find(tool => tool.tool === 'agent.spawn');
      const skillCreate = tools.find(tool => tool.tool === 'skill.create');
      if (!agentSpawn && !skillCreate) return null;
      const needsSkill = Boolean(run.executionParams?.skill);
      success = Boolean(agentSpawn?.success) && (!needsSkill || Boolean(skillCreate?.success));
      error = agentSpawn?.error || skillCreate?.error || null;
      resultRefs = {
        agent: agentSpawn?.result || null,
        skill: skillCreate?.result || null,
      };
    } else {
      return null;
    }

    const nextRun = agentRunRuntimeService.transitionRun(run, {
      status: success ? 'completed' : 'failed',
      nextStep: success ? 'done' : 'review_failure',
      completedAt: success ? new Date().toISOString() : null,
      lastError: error,
      resultRefs,
    }, {
      type: success ? 'completed' : 'failed',
      tools: tools.map(tool => ({ tool: tool.tool, success: Boolean(tool.success), error: tool.error || null })),
      error,
    });
    await this.saveRun(companyId, conversationId, nextRun);
    return publicSnapshot(nextRun);
  }

  async saveRun(companyId, conversationId, run) {
    return agentRunRuntimeService.saveRun(companyId, conversationId, run);
  }

  async clearConversation(companyId, conversationId) {
    return agentRunRuntimeService.clearConversation(companyId, conversationId);
  }

  buildStateReply(runOrSnapshot = null) {
    return null;
  }

  formatPromptBlock(runOrSnapshot = null) {
    const run = runOrSnapshot?.id ? runOrSnapshot : null;
    if (!run || ['completed', 'cancelled'].includes(run.status)) return '';
    return [
      '[هدف نشط محفوظ]',
      `goal_id: ${run.id}`,
      `goal_type: ${run.type}`,
      `status: ${run.status}`,
      `next_step: ${run.nextStep}`,
      `collected: ${JSON.stringify(run.collected || {}, null, 2)}`,
      `missing_fields: ${(run.missingFields || []).join(', ') || 'none'}`,
      run.checkpoint ? `checkpoint: ${JSON.stringify(run.checkpoint)}` : '',
      run.executionFingerprint ? `execution_fingerprint: ${run.executionFingerprint}` : '',
      run.executionParams ? `execution_params: ${JSON.stringify(run.executionParams, null, 2)}` : '',
      Array.isArray(run.plan) && run.plan.length ? `plan: ${run.plan.join(' -> ')}` : '',
      'تعامل مع رسالة المستخدم الحالية كجزء من هذا الهدف ما لم يطلب صراحة إلغاءه أو بدء هدف جديد.',
      'لو next_step = collect_missing_fields اسأل فقط عن البيانات الناقصة.',
      'لو next_step = confirm_create_draft اعرض ملخصاً قصيراً واطلب تأكيد التنفيذ.',
      'لو next_step = confirm_agent_and_skill اعرض الوكيل والمهارة المقترحين واطلب تأكيد التنفيذ بدون استدعاء أدوات.',
      'لو next_step = execute_tool استخدم Tool Gateway لتنفيذ الأداة المحددة ولا تطلب نفس البيانات مرة أخرى.',
      '[/هدف نشط محفوظ]',
    ].filter(Boolean).join('\n');
  }

  _resetMemory() {
    // Test helper: state lives in the mocked Redis service for unit tests.
  }
}

module.exports = new AgentGoalRunService();
module.exports._private = {
  normalizeText,
  isProductGoalStart,
  extractProductName,
  extractColors,
  extractSizes,
  extractPrice,
  extractStockPerVariant,
  isExecutionConfirmation,
  isStrongExecutionConfirmation,
  isAgentSkillGoalStart,
  isSkillOnlyActionStart,
  isAgentTaskDelegationMessage,
  shouldDetachActiveGoal,
  extractAgentName,
  inferDefaultAgentName,
  inferAgentRole,
  extractAgentSkill,
  buildExecutionParams,
  buildAgentExecutionParams,
};
