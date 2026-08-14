/**
 * 📨 Radiology Delivery Notify — إشعار التسليم (best-effort)
 *
 * عند تسليم نتيجة دراسة أشعة، يُحاول إرسال:
 *   1) PDF تقرير الأشعة للمريض عبر WhatsApp (إذا توفر رقم هاتف + تقرير).
 *   2) رسالة "النتيجة جاهزة" للطبيب المُحيل عبر WhatsApp (إذا وُجد رقم هاتفه).
 *
 * هذه الدالة إرشادية لا تُفشل أبداً العملية الأصلية: كل شيء داخل try/catch
 * وتعيد كائن نتائج بدلاً من أن ترمي. أي فشل (جلسة غير متصلة، رقم غير موجود،
 * فشل توليد PDF...) يُسجَّل فقط عبر console.log/warn.
 *
 * نمط الإرسال المعاد استخدامه: نفس نمط `sendTierCardImage` في
 * services/loyalty/loyaltyTierCardService.js — جلسة Baileys من الذاكرة أولاً ثم
 * من قاعدة البيانات، ثم استدعاء WhatsAppMessageHandler.sendDocument / sendText.
 */

const { formatPhoneNumber } = require('./phoneFormat');

/**
 * إيجاد جلسة Baileys متصلة للشركة (من الذاكرة أولاً ثم من قاعدة البيانات).
 */
async function resolveBaileysSession(prisma, companyId) {
  const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
  let session = (WhatsAppManager.getCompanySessions(companyId) || []).find(
    (s) => s.status === 'connected' && s.provider !== 'META_CLOUD'
  );
  if (!session) {
    const dbSession = await prisma.whatsAppSession.findFirst({
      where: { companyId, status: 'CONNECTED', provider: { not: 'META_CLOUD' } },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
    });
    const inMemory = dbSession ? WhatsAppManager.getSession(dbSession.id) : null;
    if (dbSession && inMemory && inMemory.status === 'connected') session = inMemory;
  }
  return session;
}

/**
 * إرسال نص عبر WhatsApp (best-effort).
 */
async function sendWhatsAppText(prisma, companyId, phone, text) {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return { success: false, reason: 'no_phone' };
  const session = await resolveBaileysSession(prisma, companyId);
  if (!session) return { success: false, reason: 'no_baileys_session' };
  const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
  const result = await WhatsAppMessageHandler.sendText(session.id || session.sessionId, formatted, text);
  return { success: true, result };
}

/**
 * إرسال PDF عبر WhatsApp (best-effort).
 */
async function sendWhatsAppPdf(prisma, companyId, phone, buffer, fileName, caption) {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return { success: false, reason: 'no_phone' };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { success: false, reason: 'no_pdf' };
  const session = await resolveBaileysSession(prisma, companyId);
  if (!session) return { success: false, reason: 'no_baileys_session' };
  const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
  const result = await WhatsAppMessageHandler.sendDocument(
    session.id || session.sessionId,
    formatted,
    { buffer, mimetype: 'application/pdf', fileName },
    { caption }
  );
  return { success: true, result };
}

/**
 * حل رقم هاتف الطبيب المُحيل: عبر referringPhysicianId، ثم محاولة مطابقة الاسم.
 */
async function resolvePhysicianPhone(prisma, companyId, study) {
  if (study.referringPhysicianId) {
    const physician = await prisma.radiologyReferringPhysician
      .findFirst({
        where: { id: study.referringPhysicianId, companyId },
        select: { phone: true },
      })
      .catch(() => null);
    if (physician?.phone) return physician.phone;
  }
  if (study.referralDoctor) {
    const physician = await prisma.radiologyReferringPhysician
      .findFirst({
        where: { companyId, name: study.referralDoctor },
        select: { phone: true },
      })
      .catch(() => null);
    if (physician?.phone) return physician.phone;
  }
  return null;
}

function buildReadyText(study) {
  const lines = ['نتيجة الفحص جاهزة 🩺', ''];
  lines.push(`الاسم: ${study.patientName || '—'}`);
  lines.push(`الفحص: ${study.examTypeName || study.modality || '—'}`);
  if (study.studyNumber) lines.push(`رقم الحالة: ${study.studyNumber}`);
  return lines.join('\n');
}

/**
 * إشعار تسليم دراسة أشعة (best-effort — لا يرمي أبداً).
 * @param {object} prisma - عميل Prisma مشترك.
 * @param {object} study - دراسة بعد التسليم (يُفضّل أن تحتوي report).
 * @param {object} options - { companyId }
 * @returns {Promise<{ patientPdf, physicianText }>} نتائج الإرسال (success/reason).
 */
async function notifyStudyDelivery(prisma, study, { companyId } = {}) {
  const results = { patientPdf: null, physicianText: null };
  try {
    if (!prisma || !study) return results;
    const cid = companyId || study.companyId;
    if (!cid) return results;

    // Per-company toggles (RadiologySetting). Default ON; centres can disable either.
    let settings = {};
    try {
      const rows = await prisma.radiologySetting.findMany({ where: { companyId: cid }, select: { key: true, value: true } });
      settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    } catch (e) {
      console.warn('[RADIOLOGY-NOTIFY] Failed to load delivery settings:', e?.message || e);
    }
    const deliverPatient = settings.deliverSmsPatient === undefined || settings.deliverSmsPatient === 'true';
    const notifyPhysician = settings.notifyReferringDoctor === undefined || settings.notifyReferringDoctor === 'true';

    // 1) PDF التقرير للمريض
    if (deliverPatient && study.patientPhone && study.report) {
      try {
        const { generateStudyReportPdf } = require('../services/radiologyPdfService');
        let company = null;
        try {
          company = await prisma.company.findUnique({ where: { id: cid }, select: { name: true } });
        } catch (e) {
          console.warn('[RADIOLOGY-NOTIFY] Failed to load company name:', e?.message || e);
        }
        const pdfBuffer = await generateStudyReportPdf({ ...study, report: study.report }, company);
        const fileName = `report-${(study.studyNumber || study.id || 'study').replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
        const caption = `تقرير الأشعة جاهز ✅${study.studyNumber ? ` — حالة ${study.studyNumber}` : ''}`;
        results.patientPdf = await sendWhatsAppPdf(prisma, cid, study.patientPhone, pdfBuffer, fileName, caption);
        console.log(
          `[RADIOLOGY-NOTIFY] Patient PDF ${results.patientPdf.success ? 'sent' : `skipped (${results.patientPdf.reason})`} — study ${study.id}`
        );
      } catch (e) {
        console.warn('[RADIOLOGY-NOTIFY] Patient PDF failed (non-blocking):', e?.message || e);
      }
    } else {
      console.log(
        `[RADIOLOGY-NOTIFY] Patient PDF skipped — deliverPatient=${deliverPatient}, missing phone/report (study ${study.id})`
      );
    }

    // 2) إشعار الطبيب المُحيل
    if (notifyPhysician) {
      try {
        const phone = await resolvePhysicianPhone(prisma, cid, study);
        if (phone) {
          results.physicianText = await sendWhatsAppText(prisma, cid, phone, buildReadyText(study));
          console.log(
            `[RADIOLOGY-NOTIFY] Physician text ${results.physicianText.success ? 'sent' : `skipped (${results.physicianText.reason})`} — study ${study.id}`
          );
        } else {
          console.log(`[RADIOLOGY-NOTIFY] Physician text skipped — no physician phone (study ${study.id})`);
        }
      } catch (e) {
        console.warn('[RADIOLOGY-NOTIFY] Physician notify failed (non-blocking):', e?.message || e);
      }
    } else {
      console.log(`[RADIOLOGY-NOTIFY] Physician text skipped — notifyReferringDoctor=${notifyPhysician} (study ${study.id})`);
    }
  } catch (e) {
    console.warn('[RADIOLOGY-NOTIFY] notifyStudyDelivery failed (non-blocking):', e?.message || e);
  }
  return results;
}

module.exports = { notifyStudyDelivery };
