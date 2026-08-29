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
async function resolveScanAiKey(prisma, companyId) {
  if (!prisma || !prisma.aiKey || typeof prisma.aiKey.findMany !== 'function') return null;
  let keys = [];
  try {
    keys = await prisma.aiKey.findMany({
      where: { isActive: true, OR: [{ companyId }, { keyType: 'CENTRAL' }] },
      orderBy: { priority: 'asc' },
    });
  } catch (error) {
    return null;
  }
  if (!Array.isArray(keys) || keys.length === 0) return null;

  const google = keys.find((k) => String(k.provider || '').toUpperCase() === 'GOOGLE');
  const selected = google || keys[0];
  if (!selected || !selected.apiKey) return null;

  return {
    provider: String(selected.provider || '').toUpperCase(),
    apiKey: selected.apiKey,
    baseUrl: selected.baseUrl || DEFAULT_BASE_URL,
    model: selected.model || DEFAULT_MODEL,
  };
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
 * يحلّل صورة سكان/أمر شغل عبر Gemini REST (مفتاح من قاعدة البيانات).
 * @param {{ base64: string, mimeType?: string, companyId?: string|null }} opts
 */
async function parseScanImage({ base64, mimeType, companyId }) {
  const prisma = getSharedPrismaClient();
  const key = await resolveScanAiKey(prisma, companyId || null);
  if (!key || !key.apiKey) return { success: false, error: 'AI_NOT_CONFIGURED' };

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
    return { success: false, error: error && error.message ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { parseScanImage, resolveScanAiKey, SCAN_PROMPT };