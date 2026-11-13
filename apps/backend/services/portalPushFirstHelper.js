const { getSharedPrismaClient } = require('./sharedDatabase');

function parseCompanySettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'object') return rawSettings;
  try {
    return JSON.parse(rawSettings) || {};
  } catch (_) {
    return {};
  }
}

/**
 * Determine whether Push-First (WhatsApp cost-saving) routing is enabled for a company.
 */
async function isPushFirstEnabled(companyId) {
  if (!companyId) return true;
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.company || typeof prisma.company.findUnique !== 'function') return true;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    if (!company?.settings) return true;
    const parsed = parseCompanySettings(company.settings);
    if (typeof parsed?.portalSettings?.pushFirstSaveWhatsApp === 'boolean') {
      return parsed.portalSettings.pushFirstSaveWhatsApp;
    }
    return parsed?.educationSettings?.pushFirstSaveWhatsApp !== false;
  } catch (_) {
    return true;
  }
}

/**
 * Attempt Push-First delivery to a portal actor without throwing on error.
 */
async function tryPushFirstNotification({
  companyId,
  actorType,
  actorId,
  typeId,
  title,
  body,
  url = '/',
  data = {},
  tag,
  forceWhatsApp = false,
}) {
  if (!companyId || !actorType || !actorId || forceWhatsApp) {
    return { pushed: false, deliveredCount: 0, skipped: true };
  }

  const enabled = await isPushFirstEnabled(companyId);
  if (!enabled) {
    return { pushed: false, deliveredCount: 0, disabled: true };
  }

  try {
    const { sendToPortalActor } = require('./browserPushService');
    const res = await sendToPortalActor({
      companyId,
      actorType,
      actorId: String(actorId),
      typeId,
      title,
      body,
      url,
      data,
      tag,
    });
    const deliveredCount = Number(res?.deliveredCount || 0);
    return {
      pushed: deliveredCount > 0,
      deliveredCount,
      attempted: Number(res?.attempted || 0),
      raw: res,
    };
  } catch (error) {
    console.error('[PortalPushFirst] sendToPortalActor failed:', error?.message || error);
    return { pushed: false, deliveredCount: 0, error: error?.message || 'push_failed' };
  }
}

module.exports = { isPushFirstEnabled, tryPushFirstNotification };
