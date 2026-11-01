'use strict';

/**
 * agentReplyGuard — حارس الصدق في ردود الوكيل (Task 0bb2afa9).
 *
 * المشكلة: الوكيل ردّ «شلته» على طلب إزالة عرض، ومفيش أداة حذف أصلًا،
 * ومفيش أي tool_call في نفس الدورة. الحارس هنا بيمنع الادعاء الكاذب
 * في **مسار الرد** نفسه (مش في الـprompt بس).
 *
 * قواعد:
 *  - لو الرد فيه ادعاء تنفيذ (شلته / تم الحذف / deleted / removed …)
 *    ومفيش tool_call ناجح في نفس الدورة → الرد يتبدّل برسالة صريحة.
 *  - لو فيه tool_call ناجح → يعدّي زي ما هو.
 *  - لو الرد مافيهوش ادعاء تنفيذ → يعدّي زي ما هو.
 *
 * الدالة خالصة (بدون أي اعتماد) عشان تتست لوحدها.
 */

// عبارات ادعاء تنفيذ — مقصودة إنها مركّبة عشان «تم» لوحدها (شائعة جدًا) ما تتضربش
const EXECUTION_CLAIM_PATTERNS = [
  // عربي
  /شلت(ه|ها|هم|العروض|العرض)/,
  /تم\s*(ال)?حذف/,
  /حذفت/,
  /تم\s*(ال)?تنفيذ/,
  /تم\s*(ال)?تعديل/,
  /تم\s*(ال)?إضافة/,
  /تمت\s*(ال)?إضافة/,
  /تم\s*(ال)?إنشاء/,
  /تم\s*(ال)?إيقاف/,
  /تم\s*(ال)?تفعيل/,
  /تم\s*(ال)?حفظ/,
  /أضفت|عدّلت|عدلت|غيّرت|غيرت|حدّثت|حدثت/,
  /اتعمل|اتنفّذ|اتنفذ/,
  // إنجليزي
  /\bdeleted\b/i,
  /\bremoved\b/i,
  /\bupdated\b/i,
  /\bcreated\b/i,
  /\bhas been (?:deleted|removed|updated|created)\b/i,
  /\bI(?:'ve| have) (?:deleted|removed|updated|created)\b/i,
];

function detectExecutionClaim(text) {
  if (typeof text !== 'string' || text.trim() === '') return false;
  return EXECUTION_CLAIM_PATTERNS.some((re) => re.test(text));
}

/**
 * هل فيه tool_call ناجح في الدورة؟
 * متساهلة في الشكل لأن مصدر الأداة خارجي (ai-service).
 */
function hasSuccessfulToolCall(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return false;

  return toolCalls.some((call) => {
    if (!call) return false;

    if (call.error) return false;
    if (call.status === 'failed' || call.status === 'error') return false;

    if (call.output && typeof call.output === 'object') {
      if (call.output.error) return false;
      if (call.output.success === false) return false;
      if (call.output.ok === false) return false;
      return true;
    }

    if (call.status === 'success' || call.status === 'succeeded' || call.status === 'ok') {
      return true;
    }

    // tool_call موجود ومفيش أي إشارة فشل → يعتبر ناجح
    return true;
  });
}

const DEFAULT_FALLBACK_MESSAGE =
  'مش متاح أنفّذ الإجراء ده حاليًا — مفيش أداة مفعّلة له في النظام. ' +
  'أقدر أقولك إيه المطلوب بالظبط أو إيه البديل المتاح، وأي تعديل بيتعمل من الشاشة المخصصة له.';

/**
 * @param {object} input
 * @param {string} input.reply رد الوكيل
 * @param {Array} input.toolCalls الأدوات اللي اتنفذت في نفس الدورة
 * @param {string} [input.fallbackMessage]
 * @returns {{reply: string, blocked: boolean, reason: string|null, originalReply: string|null}}
 */
function applyReplyGuard({ reply, toolCalls, fallbackMessage } = {}) {
  const original = typeof reply === 'string' ? reply : '';
  const claims = detectExecutionClaim(original);
  const succeeded = hasSuccessfulToolCall(toolCalls);

  if (claims && !succeeded) {
    return {
      reply: fallbackMessage || DEFAULT_FALLBACK_MESSAGE,
      blocked: true,
      reason: 'EXECUTION_CLAIM_WITHOUT_TOOL_RESULT',
      originalReply: original,
    };
  }

  return {
    reply: original,
    blocked: false,
    reason: null,
    originalReply: null,
  };
}

module.exports = {
  EXECUTION_CLAIM_PATTERNS,
  DEFAULT_FALLBACK_MESSAGE,
  detectExecutionClaim,
  hasSuccessfulToolCall,
  applyReplyGuard,
};
