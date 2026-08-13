const { getSharedPrismaClient } = require('./sharedDatabase');

async function getWhatsAppPhone(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const session = await prisma.whatsAppSession.findFirst({
      where: { companyId, phoneNumber: { not: null }, status: 'CONNECTED' },
      orderBy: { isDefault: 'desc' },
      select: { phoneNumber: true },
    });
    const phone = session?.phoneNumber || null;
    if (!phone) return null;
    return String(phone).replace(/\D/g, '');
  } catch (e) {
    console.error('[BOT-LINKS] Failed to resolve WhatsApp phone:', e.message);
    return null;
  }
}

async function getFacebookPage(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    return await prisma.facebookPage.findFirst({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (e) {
    console.error('[BOT-LINKS] Failed to resolve Facebook page:', e.message);
    return null;
  }
}

function waLink(phone, text) {
  let clean = String(phone || '').replace(/[^\d]/g, '');
  if (!clean) return null;
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('0')) clean = `20${clean.slice(1)}`;
  const trimmed = text && String(text).trim() ? String(text).trim() : '';
  const query = trimmed ? `?text=${encodeURIComponent(trimmed)}` : '';
  return `https://wa.me/${clean}${query}`;
}

function meLink(pageId, refCode) {
  if (!pageId) return null;
  const ref = refCode && String(refCode).trim() ? `?ref=${encodeURIComponent(String(refCode).trim())}` : '';
  return `https://m.me/${pageId}${ref}`;
}

async function buildStarterLinks(companyId, starter) {
  const result = {
    starterId: starter.id,
    name: starter.name || '',
    message: starter.message || '',
    channels: [],
  };
  let channels = [];
  try {
    channels = starter.channels ? JSON.parse(starter.channels) : ['WHATSAPP', 'FACEBOOK'];
  } catch (e) {
    channels = ['WHATSAPP', 'FACEBOOK'];
  }

  if (channels.includes('WHATSAPP')) {
    const phone = await getWhatsAppPhone(companyId);
    const url = waLink(phone, starter.message);
    if (url) result.channels.push({ channel: 'WHATSAPP', url, phone });
  }
  if (channels.includes('FACEBOOK')) {
    const page = await getFacebookPage(companyId);
    const url = meLink(page?.pageId, starter.refCode);
    if (url) {
      result.channels.push({
        channel: 'FACEBOOK',
        url,
        pageId: page?.pageId,
        pageName: page?.pageName,
      });
    }
  }
  return result;
}

module.exports = {
  getWhatsAppPhone,
  getFacebookPage,
  waLink,
  meLink,
  buildStarterLinks,
};
