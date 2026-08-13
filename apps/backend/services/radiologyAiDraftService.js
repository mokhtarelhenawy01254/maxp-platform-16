const PROVIDER_PREFERENCE = [
  'OPENROUTER',
  'OPENAI',
  'GROQ',
  'ANTHROPIC',
  'DEEPSEEK',
  'GOOGLE',
  'MISTRAL',
  'NVIDIA',
  'HUGGINGFACE',
  'OLLAMA',
];

const BASE_URL_DEFAULTS = {
  OPENROUTER: 'https://openrouter.ai/api/v1',
  OPENAI: 'https://api.openai.com/v1',
  GROQ: 'https://api.groq.com/openai/v1',
  DEEPSEEK: 'https://api.deepseek.com/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1',
  GOOGLE: 'https://generativelanguage.googleapis.com/v1beta',
  MISTRAL: 'https://api.mistral.ai/v1',
  OLLAMA: 'http://localhost:11434/v1',
};

const MODEL_DEFAULTS = {
  OPENROUTER: 'openai/gpt-4o-mini',
  OPENAI: 'gpt-4o-mini',
  GROQ: 'llama-3.3-70b-versatile',
  DEEPSEEK: 'deepseek-chat',
  ANTHROPIC: 'claude-3-5-haiku-latest',
  GOOGLE: 'gemini-2.0-flash',
  MISTRAL: 'mistral-small-latest',
  OLLAMA: 'llama3.1',
};

const FOCUS_INSTRUCTIONS = {
  findings: 'اكتب قسم النتائج فقط.',
  impression: 'اكتب قسم الانطباع فقط.',
  full: 'اكتب القسمين: النتائج ثم الانطباع.',
};

const PATIENT_FLAG_LABELS = {
  pregnancy: 'حمل',
  contrast_allergy: 'حساسية تباين',
  renal: 'قصور كلوي',
  bleeding: 'اضطراب نزف دموي',
  diabetic: 'سكري',
  claustrophobia: 'رهاب الأماكن المغلقة',
  pacemaker: 'جهاز تنظيم ضربات القلب',
};

const SYSTEM_PROMPT = 'أنت أخصائي أشعة مساعد داخل نظام RIS طبي مصري. اكتب تقرير أشعة باللغة العربية بنية احترافية: قسم «النتائج» ثم «الانطباع». لا تذكر اسم المريض أو رقمه القومي في النص. لا تشخّص أمراضاً خارج ما تدل عليه معطيات الفحص المقدمة. لا تختلق قيماً إشعاعية غير معطاة. إذا لم تتوفر بيانات كافية اكتب وصفاً عاماً تحفظياً. التزم الطابع الطبي الرسمي.';

const normalizeFlags = (patientFlags) => {
  if (!Array.isArray(patientFlags) || patientFlags.length === 0) return 'لا توجد';
  return patientFlags
    .map((flag) => PATIENT_FLAG_LABELS[String(flag || '').toLowerCase()] || String(flag || ''))
    .filter(Boolean)
    .join('، ') || 'لا توجد';
};

const formatUserPrompt = ({ examName, modality, patientAge, patientGender, patientFlags, imagesCount, existingReportText, focus, additionalContext }) => {
  const instruction = FOCUS_INSTRUCTIONS[focus] || FOCUS_INSTRUCTIONS.full;
  const lines = [
    `نوع الفحص: ${examName || 'غير محدد'}`,
    `الوضع (Modality): ${modality || 'غير محدد'}`,
    `عمر المريض: ${patientAge || 'غير محدد'}`,
    `جنس المريض: ${patientGender || 'غير محدد'}`,
    `أعلام المريض: ${normalizeFlags(patientFlags)}`,
    `عدد الصور: ${typeof imagesCount === 'number' ? imagesCount : 'غير محدد'}`,
    `نص التقرير السابق: ${existingReportText || 'لا يوجد تقرير سابق'}`,
    `معطيات إضافية: ${additionalContext || 'لا توجد'}`,
    '',
    instruction,
  ];
  return lines.join('\n');
};

const buildAiDraftPrompt = (input = {}) => ({
  system: SYSTEM_PROMPT,
  user: formatUserPrompt(input),
});

const resolveAiKey = async (prisma, companyId) => {
  if (!prisma || !prisma.aiKey || typeof prisma.aiKey.findMany !== 'function') return null;
  const keys = await prisma.aiKey.findMany({
    where: {
      isActive: true,
      OR: [{ companyId }, { keyType: 'CENTRAL' }],
    },
    orderBy: { priority: 'asc' },
  });
  if (!Array.isArray(keys) || keys.length === 0) return null;

  let selected = null;
  for (const provider of PROVIDER_PREFERENCE) {
    const found = keys.find((key) => String(key.provider || '').toUpperCase() === provider);
    if (found) {
      selected = found;
      break;
    }
  }
  if (!selected) selected = keys[0];

  const provider = String(selected.provider || '').toUpperCase();
  return {
    provider,
    apiKey: selected.apiKey,
    baseUrl: selected.baseUrl || BASE_URL_DEFAULTS[provider] || 'https://api.openai.com/v1',
    model: selected.model || MODEL_DEFAULTS[provider] || 'gpt-4o-mini',
  };
};

const parseDraftResponse = (text) => {
  const raw = typeof text === 'string' ? text : '';
  let cleaned = raw.trim();
  const fence = cleaned.match(/^(?:`{3,4})\w*\s*\n?([\s\S]*?)(?:`{3,4})$/);
  if (fence && fence[1]) cleaned = fence[1].trim();
  if (!cleaned) throw new Error('AI returned empty draft');
  return cleaned;
};

const callChatCompletion = async ({ baseUrl, apiKey, model, system, user, timeoutMs = 25000 }) => {
  const url = String(baseUrl || '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (url.includes('generativelanguage')) {
      const response = await fetch(`${url}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text).join('');
      return parseDraftResponse(text);
    }

    if (url.includes('anthropic')) {
      const response = await fetch(`${url}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, max_tokens: 900, system, messages: [{ role: 'user', content: user }] }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
      const json = await response.json();
      const text = json.content?.map((block) => block.text).join('');
      return parseDraftResponse(text);
    }

    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 900,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
    const json = await response.json();
    const text = json.choices?.[0]?.message?.content;
    return parseDraftResponse(text);
  } finally {
    clearTimeout(timer);
  }
};

module.exports = {
  buildAiDraftPrompt,
  resolveAiKey,
  callChatCompletion,
  parseDraftResponse,
};
