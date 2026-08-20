/**
 * ≡ƒô¿ Radiology Delivery Notify ΓÇö ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä╪¬╪│┘ä┘è┘à (best-effort)
 *
 * ╪╣┘å╪» ╪¬╪│┘ä┘è┘à ┘å╪¬┘è╪¼╪⌐ ╪»╪▒╪º╪│╪⌐ ╪ú╪┤╪╣╪⌐╪î ┘è┘Å╪¡╪º┘ê┘ä ╪Ñ╪▒╪│╪º┘ä:
 *   1) PDF ╪¬┘é╪▒┘è╪▒ ╪º┘ä╪ú╪┤╪╣╪⌐ ┘ä┘ä┘à╪▒┘è╪╢ ╪╣╪¿╪▒ WhatsApp (╪Ñ╪░╪º ╪¬┘ê┘ü╪▒ ╪▒┘é┘à ┘ç╪º╪¬┘ü + ╪¬┘é╪▒┘è╪▒).
 *   2) ╪▒╪│╪º┘ä╪⌐ "╪º┘ä┘å╪¬┘è╪¼╪⌐ ╪¼╪º┘ç╪▓╪⌐" ┘ä┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à┘Å╪¡┘è┘ä ╪╣╪¿╪▒ WhatsApp (╪Ñ╪░╪º ┘ê┘Å╪¼╪» ╪▒┘é┘à ┘ç╪º╪¬┘ü┘ç).
 *
 * ┘ç╪░┘ç ╪º┘ä╪»╪º┘ä╪⌐ ╪Ñ╪▒╪┤╪º╪»┘è╪⌐ ┘ä╪º ╪¬┘Å┘ü╪┤┘ä ╪ú╪¿╪»╪º┘ï ╪º┘ä╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪ú╪╡┘ä┘è╪⌐: ┘â┘ä ╪┤┘è╪í ╪»╪º╪«┘ä try/catch
 * ┘ê╪¬╪╣┘è╪» ┘â╪º╪ª┘å ┘å╪¬╪º╪ª╪¼ ╪¿╪»┘ä╪º┘ï ┘à┘å ╪ú┘å ╪¬╪▒┘à┘è. ╪ú┘è ┘ü╪┤┘ä (╪¼┘ä╪│╪⌐ ╪║┘è╪▒ ┘à╪¬╪╡┘ä╪⌐╪î ╪▒┘é┘à ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪î
 * ┘ü╪┤┘ä ╪¬┘ê┘ä┘è╪» PDF...) ┘è┘Å╪│╪¼┘Ä┘æ┘ä ┘ü┘é╪╖ ╪╣╪¿╪▒ console.log/warn.
 *
 * ┘å┘à╪╖ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘à╪╣╪º╪» ╪º╪│╪¬╪«╪»╪º┘à┘ç: ┘å┘ü╪│ ┘å┘à╪╖ `sendTierCardImage` ┘ü┘è
 * services/loyalty/loyaltyTierCardService.js ΓÇö ╪¼┘ä╪│╪⌐ Baileys ┘à┘å ╪º┘ä╪░╪º┘â╪▒╪⌐ ╪ú┘ê┘ä╪º┘ï ╪½┘à
 * ┘à┘å ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬╪î ╪½┘à ╪º╪│╪¬╪»╪╣╪º╪í WhatsAppMessageHandler.sendDocument / sendText.
 */

const { formatPhoneNumber } = require('./phoneFormat');

/**
 * ╪Ñ┘è╪¼╪º╪» ╪¼┘ä╪│╪⌐ Baileys ┘à╪¬╪╡┘ä╪⌐ ┘ä┘ä╪┤╪▒┘â╪⌐ (┘à┘å ╪º┘ä╪░╪º┘â╪▒╪⌐ ╪ú┘ê┘ä╪º┘ï ╪½┘à ┘à┘å ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬).
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
 * ╪Ñ╪▒╪│╪º┘ä ┘å╪╡ ╪╣╪¿╪▒ WhatsApp (best-effort).
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
 * ╪Ñ╪▒╪│╪º┘ä PDF ╪╣╪¿╪▒ WhatsApp (best-effort).
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
 * ╪¡┘ä ╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à┘Å╪¡┘è┘ä: ╪╣╪¿╪▒ referringPhysicianId╪î ╪½┘à ┘à╪¡╪º┘ê┘ä╪⌐ ┘à╪╖╪º╪¿┘é╪⌐ ╪º┘ä╪º╪│┘à.
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
  const lines = ['┘å╪¬┘è╪¼╪⌐ ╪º┘ä┘ü╪¡╪╡ ╪¼╪º┘ç╪▓╪⌐ ≡ƒ⌐║', ''];
  lines.push(`╪º┘ä╪º╪│┘à: ${study.patientName || 'ΓÇö'}`);
  lines.push(`╪º┘ä┘ü╪¡╪╡: ${study.examTypeName || study.modality || 'ΓÇö'}`);
  if (study.studyNumber) lines.push(`╪▒┘é┘à ╪º┘ä╪¡╪º┘ä╪⌐: ${study.studyNumber}`);
  return lines.join('\n');
}

/**
 * ╪Ñ╪┤╪╣╪º╪▒ ╪¬╪│┘ä┘è┘à ╪»╪▒╪º╪│╪⌐ ╪ú╪┤╪╣╪⌐ (best-effort ΓÇö ┘ä╪º ┘è╪▒┘à┘è ╪ú╪¿╪»╪º┘ï).
 * @param {object} prisma - ╪╣┘à┘è┘ä Prisma ┘à╪┤╪¬╪▒┘â.
 * @param {object} study - ╪»╪▒╪º╪│╪⌐ ╪¿╪╣╪» ╪º┘ä╪¬╪│┘ä┘è┘à (┘è┘Å┘ü╪╢┘æ┘ä ╪ú┘å ╪¬╪¡╪¬┘ê┘è report).
 * @param {object} options - { companyId }
 * @returns {Promise<{ patientPdf, physicianText }>} ┘å╪¬╪º╪ª╪¼ ╪º┘ä╪Ñ╪▒╪│╪º┘ä (success/reason).
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

    // 1) PDF ╪º┘ä╪¬┘é╪▒┘è╪▒ ┘ä┘ä┘à╪▒┘è╪╢
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
        const caption = `╪¬┘é╪▒┘è╪▒ ╪º┘ä╪ú╪┤╪╣╪⌐ ╪¼╪º┘ç╪▓ Γ£à${study.studyNumber ? ` ΓÇö ╪¡╪º┘ä╪⌐ ${study.studyNumber}` : ''}`;
        results.patientPdf = await sendWhatsAppPdf(prisma, cid, study.patientPhone, pdfBuffer, fileName, caption);
        console.log(
          `[RADIOLOGY-NOTIFY] Patient PDF ${results.patientPdf.success ? 'sent' : `skipped (${results.patientPdf.reason})`} ΓÇö study ${study.id}`
        );
      } catch (e) {
        console.warn('[RADIOLOGY-NOTIFY] Patient PDF failed (non-blocking):', e?.message || e);
      }
    } else {
      console.log(
        `[RADIOLOGY-NOTIFY] Patient PDF skipped ΓÇö deliverPatient=${deliverPatient}, missing phone/report (study ${study.id})`
      );
    }

    // 2) ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à┘Å╪¡┘è┘ä
    if (notifyPhysician) {
      try {
        const phone = await resolvePhysicianPhone(prisma, cid, study);
        if (phone) {
          results.physicianText = await sendWhatsAppText(prisma, cid, phone, buildReadyText(study));
          console.log(
            `[RADIOLOGY-NOTIFY] Physician text ${results.physicianText.success ? 'sent' : `skipped (${results.physicianText.reason})`} ΓÇö study ${study.id}`
          );
        } else {
          console.log(`[RADIOLOGY-NOTIFY] Physician text skipped ΓÇö no physician phone (study ${study.id})`);
        }
      } catch (e) {
        console.warn('[RADIOLOGY-NOTIFY] Physician notify failed (non-blocking):', e?.message || e);
      }
    } else {
      console.log(`[RADIOLOGY-NOTIFY] Physician text skipped ΓÇö notifyReferringDoctor=${notifyPhysician} (study ${study.id})`);
    }
  } catch (e) {
    console.warn('[RADIOLOGY-NOTIFY] notifyStudyDelivery failed (non-blocking):', e?.message || e);
  }
  return results;
}

module.exports = { notifyStudyDelivery };
