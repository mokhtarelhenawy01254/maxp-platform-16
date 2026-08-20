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
  NVIDIA: 'https://integrate.api.nvidia.com/v1',
  HUGGINGFACE: 'https://router.huggingface.co/v1',
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
  NVIDIA: 'nvidia/llama-3.1-nemotron-70b-instruct',
  HUGGINGFACE: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  OLLAMA: 'llama3.1',
};

const FOCUS_INSTRUCTIONS = {
  findings: '╪º┘â╪¬╪¿ ┘é╪│┘à ╪º┘ä┘å╪¬╪º╪ª╪¼ ┘ü┘é╪╖.',
  impression: '╪º┘â╪¬╪¿ ┘é╪│┘à ╪º┘ä╪º┘å╪╖╪¿╪º╪╣ ┘ü┘é╪╖.',
  full: '╪º┘â╪¬╪¿ ╪º┘ä┘é╪│┘à┘è┘å: ╪º┘ä┘å╪¬╪º╪ª╪¼ ╪½┘à ╪º┘ä╪º┘å╪╖╪¿╪º╪╣.',
};

const PATIENT_FLAG_LABELS = {
  pregnancy: '╪¡┘à┘ä',
  contrast_allergy: '╪¡╪│╪º╪│┘è╪⌐ ╪¬╪¿╪º┘è┘å',
  renal: '┘é╪╡┘ê╪▒ ┘â┘ä┘ê┘è',
  bleeding: '╪º╪╢╪╖╪▒╪º╪¿ ┘å╪▓┘ü ╪»┘à┘ê┘è',
  diabetic: '╪│┘â╪▒┘è',
  claustrophobia: '╪▒┘ç╪º╪¿ ╪º┘ä╪ú┘à╪º┘â┘å ╪º┘ä┘à╪║┘ä┘é╪⌐',
  pacemaker: '╪¼┘ç╪º╪▓ ╪¬┘å╪╕┘è┘à ╪╢╪▒╪¿╪º╪¬ ╪º┘ä┘é┘ä╪¿',
};

const SYSTEM_PROMPT = '╪ú┘å╪¬ ╪ú╪«╪╡╪º╪ª┘è ╪ú╪┤╪╣╪⌐ ┘à╪│╪º╪╣╪» ╪»╪º╪«┘ä ┘å╪╕╪º┘à RIS ╪╖╪¿┘è ┘à╪╡╪▒┘è. ╪º┘â╪¬╪¿ ╪¬┘é╪▒┘è╪▒ ╪ú╪┤╪╣╪⌐ ╪¿╪º┘ä┘ä╪║╪⌐ ╪º┘ä╪╣╪▒╪¿┘è╪⌐ ╪¿┘å┘è╪⌐ ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐: ┘é╪│┘à ┬½╪º┘ä┘å╪¬╪º╪ª╪¼┬╗ ╪½┘à ┬½╪º┘ä╪º┘å╪╖╪¿╪º╪╣┬╗. ┘ä╪º ╪¬╪░┘â╪▒ ╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ ╪ú┘ê ╪▒┘é┘à┘ç ╪º┘ä┘é┘ê┘à┘è ┘ü┘è ╪º┘ä┘å╪╡. ┘ä╪º ╪¬╪┤╪«┘æ╪╡ ╪ú┘à╪▒╪º╪╢╪º┘ï ╪«╪º╪▒╪¼ ┘à╪º ╪¬╪»┘ä ╪╣┘ä┘è┘ç ┘à╪╣╪╖┘è╪º╪¬ ╪º┘ä┘ü╪¡╪╡ ╪º┘ä┘à┘é╪»┘à╪⌐. ┘ä╪º ╪¬╪«╪¬┘ä┘é ┘é┘è┘à╪º┘ï ╪Ñ╪┤╪╣╪º╪╣┘è╪⌐ ╪║┘è╪▒ ┘à╪╣╪╖╪º╪⌐. ╪Ñ╪░╪º ┘ä┘à ╪¬╪¬┘ê┘ü╪▒ ╪¿┘è╪º┘å╪º╪¬ ┘â╪º┘ü┘è╪⌐ ╪º┘â╪¬╪¿ ┘ê╪╡┘ü╪º┘ï ╪╣╪º┘à╪º┘ï ╪¬╪¡┘ü╪╕┘è╪º┘ï. ╪º┘ä╪¬╪▓┘à ╪º┘ä╪╖╪º╪¿╪╣ ╪º┘ä╪╖╪¿┘è ╪º┘ä╪▒╪│┘à┘è.';

const normalizeFlags = (patientFlags) => {
  if (!Array.isArray(patientFlags) || patientFlags.length === 0) return '┘ä╪º ╪¬┘ê╪¼╪»';
  return patientFlags
    .map((flag) => PATIENT_FLAG_LABELS[String(flag || '').toLowerCase()] || String(flag || ''))
    .filter(Boolean)
    .join('╪î ') || '┘ä╪º ╪¬┘ê╪¼╪»';
};

const formatUserPrompt = ({ examName, modality, patientAge, patientGender, patientFlags, imagesCount, existingReportText, focus, additionalContext }) => {
  const instruction = FOCUS_INSTRUCTIONS[focus] || FOCUS_INSTRUCTIONS.full;
  const lines = [
    `┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡: ${examName || '╪║┘è╪▒ ┘à╪¡╪»╪»'}`,
    `╪º┘ä┘ê╪╢╪╣ (Modality): ${modality || '╪║┘è╪▒ ┘à╪¡╪»╪»'}`,
    `╪╣┘à╪▒ ╪º┘ä┘à╪▒┘è╪╢: ${patientAge || '╪║┘è╪▒ ┘à╪¡╪»╪»'}`,
    `╪¼┘å╪│ ╪º┘ä┘à╪▒┘è╪╢: ${patientGender || '╪║┘è╪▒ ┘à╪¡╪»╪»'}`,
    `╪ú╪╣┘ä╪º┘à ╪º┘ä┘à╪▒┘è╪╢: ${normalizeFlags(patientFlags)}`,
    `╪╣╪»╪» ╪º┘ä╪╡┘ê╪▒: ${typeof imagesCount === 'number' ? imagesCount : '╪║┘è╪▒ ┘à╪¡╪»╪»'}`,
    `┘å╪╡ ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪º┘ä╪│╪º╪¿┘é: ${existingReportText || '┘ä╪º ┘è┘ê╪¼╪» ╪¬┘é╪▒┘è╪▒ ╪│╪º╪¿┘é'}`,
    `┘à╪╣╪╖┘è╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐: ${additionalContext || '┘ä╪º ╪¬┘ê╪¼╪»'}`,
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
