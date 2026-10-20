/**
 * 🛡️ Central pre-send guard for WhatsApp notifications.
 *
 * المشكلة اللي الملف ده بيحلها:
 *  - مسارات الإرسال كانت بتلف على المستلمين واحد واحد وتنادي sendNotification.
 *    لما القالب مفقود أو غير معتمد، الحارس القديم (جوه sendNotification بعد
 *    إنشاء سطر اللوج) كان بيرفض *بعد* ما بيكتب صف FAILED لكل مستلم → آلاف
 *    الصفوف في الساعة (ANNOUNCEMENT + templateId=null).
 *
 * الحل:
 *  1) بوابة واحدة (evaluateSendGate) بتتقيّم *قبل* أي لوج أو أي نداء لميتا.
 *  2) سطر لوج واحد لكل (company + event + template + سبب) في نافذة زمنية —
 *     مش صف لكل مستلم. مفاتيح الفشل بتتفتح مرة واحدة وبعدها الإرسال بيتوقف
 *     (circuit breaker) لمدة 24 ساعة افتراضيًا.
 *  3) أي مسار جديد بينادي sendNotification / scheduleNotification / الطابور
 *     بيرث الحماية تلقائيًا — مفيش حاجة يضيفها في كل caller.
 *
 * الملف نقي (بلا DB / بلا شبكة) وبياخد `now` اختياريًا عشان الاختبارات
 * تستخدم fake timers.
 */

const DEFAULT_BLOCK_LOG_TTL_MS = 60 * 60 * 1000; // سطر واحد/ساعة لكل مفتاح
const DEFAULT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 ساعة قفل بعد فشل قالب

const ERROR_CODES = Object.freeze({
  NO_TEMPLATE_CONFIGURED: 'NO_TEMPLATE_CONFIGURED',
  META_TEMPLATE_NOT_APPROVED: 'META_TEMPLATE_NOT_APPROVED',
  NO_SESSION: 'NO_SESSION',
});

// key → timestamp آخر سطر اتطبع
const lastEmittedAt = new Map();
// key → { expiresAt, errorCode, templateId, openedAt, suppressed }
const failureWindows = new Map();

function normalizeProvider(provider) {
  return String(provider || '').toUpperCase();
}

function isMetaCloud(provider) {
  return normalizeProvider(provider) === 'META_CLOUD';
}

function normalizeEventType(eventType) {
  return String(eventType || '').toUpperCase();
}

function hasApprovedMetaBinding(template) {
  return Boolean(
    template?.metaTemplateName &&
      String(template?.metaTemplateStatus || '').toUpperCase() === 'APPROVED'
  );
}

/**
 * مفتاح الفشل: (companyId + eventType + templateId).
 * templateId='none' يعني «مفيش قالب مربوط» — بيتفتح لوحده وأول ما قالب يتضاف
 * المفتاح بيتغيّر فالإرسال بيرجع يشتغل فورًا.
 */
function buildFailureKey({ companyId, eventType, templateId }) {
  return [companyId || '*', normalizeEventType(eventType) || '*', templateId || 'none'].join('::');
}

/**
 * هل الإرسال مسموح بالقالب/القناة الحالية؟ (قرار نقي — بلا لوج وبلا حالة)
 *
 * @param {Object} params
 * @param {string} params.sessionProvider  META_CLOUD | BAILEYS
 * @param {Object|null} params.template    صف القالب من DB (أو كائن القالب الافتراضي)
 * @param {string} [params.contentOverride] نص حر جاهز
 * @param {string} params.eventType
 * @returns {{allowed: boolean, reason: string, errorCode: string|null, templateId: string|null, metaTemplateName: string|null, message: string}}
 */
function evaluateSendGate({ sessionProvider, template, contentOverride, eventType }) {
  const metaCloud = isMetaCloud(sessionProvider);
  const hasRow = Boolean(template && template.id);
  const metaTemplateName = template?.metaTemplateName || null;
  const metaTemplateStatus = String(template?.metaTemplateStatus || '').toUpperCase();

  if (metaCloud) {
    // ☁️ ميتا: ممنوع أي إرسال بدون قالب معتمد ومطابق — حتى لو فيه نص حر جاهز.
    if (!hasRow || !metaTemplateName) {
      return {
        allowed: false,
        reason: 'no_template_configured',
        errorCode: ERROR_CODES.NO_TEMPLATE_CONFIGURED,
        templateId: hasRow ? template.id : null,
        metaTemplateName,
        message:
          `[${ERROR_CODES.NO_TEMPLATE_CONFIGURED}] مفيش قالب ميتا مربوط/معتمد للحدث "${eventType}" ` +
          `(templateId=${hasRow ? template.id : 'null'}). الإرسال عبر META_CLOUD متوقف — ` +
          `اربط قالب APPROVED من صفحة القوالب.`,
      };
    }
    if (metaTemplateStatus !== 'APPROVED') {
      return {
        allowed: false,
        reason: 'meta_template_not_approved',
        errorCode: ERROR_CODES.META_TEMPLATE_NOT_APPROVED,
        templateId: template.id,
        metaTemplateName,
        message:
          `[${ERROR_CODES.META_TEMPLATE_NOT_APPROVED}] قالب ميتا "${metaTemplateName}" حالته ` +
          `${metaTemplateStatus || 'غير معروف'} — لازم APPROVED قبل الإرسال (event=${eventType}).`,
      };
    }
    return {
      allowed: true,
      reason: null,
      errorCode: null,
      templateId: template.id,
      metaTemplateName,
      message: null,
    };
  }

  // 📱 Baileys / قناة غير ميتا: النص الحر مسموح، لكن لازم يبقى فيه محتوى
  // (قالب من DB أو نص افتراضي/override) — ممنوع إرسال رسالة فاضية.
  const hasContent =
    Boolean(contentOverride && String(contentOverride).trim()) ||
    Boolean(template?.content && String(template.content).trim());

  if (!hasRow && !hasContent) {
    return {
      allowed: false,
      reason: 'no_template_configured',
      errorCode: ERROR_CODES.NO_TEMPLATE_CONFIGURED,
      templateId: null,
      metaTemplateName,
      message:
        `[${ERROR_CODES.NO_TEMPLATE_CONFIGURED}] مفيش قالب ولا محتوى للحدث "${eventType}" — ` +
        `الإرسال متوقف.`,
    };
  }

  return {
    allowed: true,
    reason: null,
    errorCode: null,
    templateId: hasRow ? template.id : null,
    metaTemplateName,
    message: null,
  };
}

/**
 * يفتح نافذة قفل للـ(company + event + template) بعد فشل قالب.
 * @returns {{expiresAt:number, openedAt:number}}
 */
function openFailureWindow({
  companyId,
  eventType,
  templateId,
  errorCode,
  windowMs = DEFAULT_FAILURE_WINDOW_MS,
  now = Date.now(),
}) {
  const key = buildFailureKey({ companyId, eventType, templateId });
  const entry = {
    expiresAt: now + Math.max(0, Number(windowMs) || 0),
    openedAt: now,
    errorCode: errorCode || ERROR_CODES.META_TEMPLATE_NOT_APPROVED,
    templateId: templateId || null,
    suppressed: 0,
  };
  failureWindows.set(key, entry);
  return entry;
}

/**
 * هل المفتاح مقفول حاليًا؟ (circuit breaker)
 * @returns {{suppressed:boolean, expiresAt:number|null, errorCode:string|null, suppressedCount:number}}
 */
function checkFailureWindow({ companyId, eventType, templateId, now = Date.now(), countSuppressed = false }) {
  const key = buildFailureKey({ companyId, eventType, templateId });
  const entry = failureWindows.get(key);
  if (!entry) {
    return { suppressed: false, expiresAt: null, errorCode: null, suppressedCount: 0 };
  }
  if (entry.expiresAt <= now) {
    failureWindows.delete(key);
    return { suppressed: false, expiresAt: null, errorCode: null, suppressedCount: 0 };
  }
  if (countSuppressed) entry.suppressed += 1;
  return {
    suppressed: true,
    expiresAt: entry.expiresAt,
    errorCode: entry.errorCode,
    suppressedCount: entry.suppressed,
  };
}

/**
 * سطر واحد فقط لكل مفتاح في نافذة TTL.
 * @returns {boolean} true لو لازم نطبع السطر دلوقتي
 */
function shouldEmitOnce(key, { ttlMs = DEFAULT_BLOCK_LOG_TTL_MS, now = Date.now() } = {}) {
  const last = lastEmittedAt.get(key);
  if (last !== undefined && now - last < ttlMs) return false;
  lastEmittedAt.set(key, now);
  return true;
}

function emitLine(message) {
  try {
    // سطر واحد واضح — أسهل للـ grep في اللوجات
    console.warn(message);
  } catch {
    /* اللوج عمره ما يكسر الإرسال */
  }
}

/**
 * البوابة الكاملة المستخدمة من طبقة الإرسال:
 *  1) تقييم القالب، 2) فحص القفل، 3) سطر واحد لكل نافذة.
 *
 * @returns {{allowed:boolean, suppressed:boolean, reason:string|null, errorCode:string|null,
 *            templateId:string|null, message:string|null, circuitOpenUntil:number|null, emitted:boolean}}
 */
function guardNotificationSend({
  companyId,
  eventType,
  sessionProvider,
  template,
  contentOverride = null,
  logTtlMs = DEFAULT_BLOCK_LOG_TTL_MS,
  windowMs = DEFAULT_FAILURE_WINDOW_MS,
  now = Date.now(),
}) {
  const verdict = evaluateSendGate({ sessionProvider, template, contentOverride, eventType });
  const templateId = verdict.templateId;

  if (verdict.allowed) {
    return {
      allowed: true,
      suppressed: false,
      reason: null,
      errorCode: null,
      templateId,
      message: null,
      circuitOpenUntil: null,
      emitted: false,
    };
  }

  const circuit = checkFailureWindow({ companyId, eventType, templateId, now, countSuppressed: true });
  const key = buildFailureKey({ companyId, eventType, templateId });
  // 🛡️ سطر واحد لكل نافذة فشل: بنطبع بس أول ما القفل يتفتح (أو بعد انتهاء الـ24 ساعة).
  // كل المحاولات اللي بتتخطى أثناء القفل بتزيد العداد بصمت — صفر لوج spam.
  const emitted = !circuit.suppressed && shouldEmitOnce(key, { ttlMs: logTtlMs, now });

  if (!circuit.suppressed) {
    openFailureWindow({ companyId, eventType, templateId, errorCode: verdict.errorCode, windowMs, now });
  }

  if (emitted) {
    emitLine(`${verdict.message} (تم قفل المحاولات 24 ساعة لنفس الشركة/الحدث/القالب)`);
  }

  return {
    allowed: false,
    suppressed: circuit.suppressed,
    reason: verdict.reason,
    errorCode: verdict.errorCode,
    templateId,
    message: verdict.message,
    circuitOpenUntil: circuit.suppressed ? circuit.expiresAt : now + (Number(windowMs) || 0),
    emitted,
  };
}

/**
 * NO_SESSION: منع صف FAILED لكل مستلم — سطر واحد لكل (شركة + حدث) في النافذة.
 * @returns {{shouldRecord:boolean, emitted:boolean}}
 */
function guardSessionUnavailable({
  companyId,
  eventType,
  logTtlMs = DEFAULT_BLOCK_LOG_TTL_MS,
  now = Date.now(),
}) {
  const key = `NO_SESSION::${companyId || '*'}::${normalizeEventType(eventType) || '*'}`;
  const first = shouldEmitOnce(key, { ttlMs: logTtlMs, now });
  if (first) {
    emitLine(
      `[${ERROR_CODES.NO_SESSION}] مفيش جلسة واتساب متصلة للشركة ${companyId || '*'} ` +
        `(event=${eventType || '*'}) — تم تخطّي الإرسال بدون تسجيل فشل متكرر.`
    );
  }
  return { shouldRecord: first, emitted: first };
}

/**
 * بيعيد حالة القفل/اللوج — للتشخيص و/health والاختبارات.
 */
function getGuardSnapshot(now = Date.now()) {
  const windows = [];
  for (const [key, entry] of failureWindows.entries()) {
    if (entry.expiresAt > now) {
      windows.push({ key, ...entry });
    }
  }
  return {
    activeWindows: windows,
    activeWindowCount: windows.length,
    emittedKeys: lastEmittedAt.size,
  };
}

/**
 * تصفير الحالة — للاختبارات فقط (مايتنادى في مسار الإنتاج).
 */
function resetGuardState() {
  lastEmittedAt.clear();
  failureWindows.clear();
}

module.exports = {
  ERROR_CODES,
  DEFAULT_BLOCK_LOG_TTL_MS,
  DEFAULT_FAILURE_WINDOW_MS,
  evaluateSendGate,
  guardNotificationSend,
  guardSessionUnavailable,
  openFailureWindow,
  checkFailureWindow,
  shouldEmitOnce,
  buildFailureKey,
  hasApprovedMetaBinding,
  isMetaCloud,
  getGuardSnapshot,
  resetGuardState,
};
