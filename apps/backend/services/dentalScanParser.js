const { getSharedPrismaClient } = require('./sharedDatabase');

const SCAN_PROMPT = `أنت مساعد تحليل صور لمختبر أسنان. اقرأ صورة الطلب أو أمر الشغل أو المسح الضوئي (كشف الأسنان) واستخرج البيانات التالية فقط في شكل JSON صالح بدون أي نص إضافي وبالمفاتيح التالية فقط:

{
  "patientName": string | null,
  "teeth": string | null,
  "shade": string | null,
  "material": string | null,
  "workTypeHint": string | null,
  "notes": string | null
}

القواعد:
- patientName: اسم المريض إذا ظهر.
- teeth: أرقام الأسنان أو نطاق الأسنان (مثل "11,12,13").
- shade: اللون مثل A1 أو B2.
- material: الخامة مثل زيركون أو إيماكس أو برسلين.
- workTypeHint: نوع الشغل إن وُجد (مثل تاج، جسر، طقم، زراعة).
- notes: أي ملاحظات أخرى مهمة.
- إذا لم يكن هناك أي معلومات واضحة، أعد كل القيم null.
- أعد JSON خام فقط، بدون أكواد json أو أي نص إضافي.`;

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * يقرأ مفتاح الذكاء الاصطناعي من قاعدة البيانات (جدول ai_keys) فقط —
 * لا يُستخدم أي مفتاح من .env. يفضّل مزوّد GOOGLE ثم أي مفتاح نشط.
 * @param {object} prisma
 * @param {string|null} companyId
 */
/**
 * يقرأ جميع مفاتيح الذكاء الاصطناعي الصالحة من قاعدة البيانات (جدول ai_keys)
 * مرتبة حسب الأولوية، مع تفضيل مزود GOOGLE.
 * @param {object} prisma
 * @param {string|null} companyId
 * @returns {Promise<Array<{provider: string, apiKey: string, baseUrl: string, model: string}>>}
 */
async function resolveScanAiKeys(prisma, companyId) {
  if (!prisma || !prisma.aiKey || typeof prisma.aiKey.findMany !== 'function') return [];
  let keys = [];
  try {
    keys = await prisma.aiKey.findMany({
      where: { isActive: true, OR: [{ companyId }, { keyType: 'CENTRAL' }] },
      orderBy: { priority: 'asc' },
    });
  } catch (error) {
    return [];
  }
  if (!Array.isArray(keys) || keys.length === 0) return [];

  // ترتيب المفاتيح: Google أولاً ثم البقية، مع استبعاد من لا يملك apiKey
  const validKeys = keys
    .filter((k) => Boolean(k && k.apiKey))
    .map((k) => ({
      provider: String(k.provider || '').toUpperCase(),
      apiKey: k.apiKey,
      baseUrl: k.baseUrl || DEFAULT_BASE_URL,
      model: k.model || DEFAULT_MODEL,
    }));

  validKeys.sort((a, b) => (a.provider === 'GOOGLE' ? -1 : 1) - (b.provider === 'GOOGLE' ? -1 : 1));
  return validKeys;
}

/**
 * للتوافق مع الإصدارات السابقة والاختبارات
 */
async function resolveScanAiKey(prisma, companyId) {
  const keys = await resolveScanAiKeys(prisma, companyId);
  return keys[0] || null;
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseScanJson(text) {
  const cleaned = stripCodeFences(text);
  const parsed = JSON.parse(cleaned);
  return {
    patientName: parsed.patientName ?? null,
    teeth: parsed.teeth ?? null,
    shade: parsed.shade ?? null,
    material: parsed.material ?? null,
    workTypeHint: parsed.workTypeHint ?? null,
    notes: parsed.notes ?? null,
  };
}

/**
 * يحلّل صورة سكان/أمر شغل عبر Gemini REST مع تدوير المفاتيح التلقائي عند تجاوز الحصة (429).
 * @param {{ base64: string, mimeType?: string, companyId?: string|null }} opts
 */
async function parseScanImage({ base64, mimeType, companyId }) {
  const prisma = getSharedPrismaClient();
  const keys = await resolveScanAiKeys(prisma, companyId || null);
  if (!keys || keys.length === 0) return { success: false, error: 'AI_NOT_CONFIGURED' };

  let lastError = null;
  let quotaExceeded = false;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    try {
      const url = `${key.baseUrl}/models/${encodeURIComponent(key.model)}:generateContent?key=${encodeURIComponent(key.apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } },
                { text: SCAN_PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 429 || detail.includes('RESOURCE_EXHAUSTED') || detail.toLowerCase().includes('quota')) {
          console.warn(`[dentalScanParser] Key ${i + 1}/${keys.length} (${key.provider}) hit quota 429, trying next key...`);
          quotaExceeded = true;
          lastError = new Error('AI_QUOTA_EXCEEDED');
          continue; // تجربة المفتاح التالي إن وجد
        }
        throw new Error(`AI HTTP ${response.status} ${detail.slice(0, 200)}`);
      }

      const json = await response.json();
      const text = (json.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || '')
        .join('')
        .trim();
      if (!text) throw new Error('AI returned empty response');
      const data = parseScanJson(text);
      return { success: true, data };
    } catch (error) {
      lastError = error;
      if (error && error.message === 'AI_QUOTA_EXCEEDED') {
        quotaExceeded = true;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (quotaExceeded) {
    return {
      success: false,
      error: 'AI_QUOTA_EXCEEDED',
      message: 'تم تجاوز حد الاستخدام المسموح لمفتاح الذكاء الاصطناعي (Gemini Quota Exceeded - HTTP 429). يرجى مراجعة الحصة في Google AI Studio أو إضافة مفتاح جديد من لوحة تحكم السوبر أدمن.',
    };
  }

  return {
    success: false,
    error: lastError && lastError.message ? lastError.message : 'فشل تحليل الصورة بالذكاء الاصطناعي',
  };
}

module.exports = { parseScanImage, resolveScanAiKey, resolveScanAiKeys, SCAN_PROMPT };