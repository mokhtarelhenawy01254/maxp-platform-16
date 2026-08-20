const { getSharedPrismaClient } = require('./sharedDatabase');
const { normalizeBotText } = require('./botRuleEngine');

const UNSUBSCRIBE_KEYWORDS = [
  'stop',
  'ايقاف',
  'إيقاف',
  'أوقف',
  'اوقف',
  'توقف',
  'الغاء الاشتراك',
  'إلغاء الاشتراك',
  'الغاء الاشتراكات',
  'لا تبعث',
  'كفاية',
  'مش عايز رسايل',
  'don t send',
];

const UNSUBSCRIBE_CONFIRMATION = 'تم إلغاء اشتراكك في الرسائل التلقائية ✅ ستظل تتلقى ردود الخدمة فقط.';

function isUnsubscribeText(text) {
  if (!text) return false;
  const normalized = normalizeBotText(text);
  if (!normalized) return false;
  return UNSUBSCRIBE_KEYWORDS.some((k) => {
    const kw = normalizeBotText(k);
    return kw && (normalized === kw || normalized.includes(kw));
  });
}

async function isUnsubscribed(companyId, customerId, channel) {
  if (!companyId || !customerId) return false;
  try {
    const prisma = getSharedPrismaClient();
    const record = await prisma.botUnsubscribe.findUnique({
      where: { companyId_customerId_channel: { companyId, customerId, channel } },
    });
    return Boolean(record);
  } catch (e) {
    return false;
  }
}

async function recordUnsubscribe(companyId, customerId, channel, reason = null) {
  try {
    const prisma = getSharedPrismaClient();
    await prisma.botUnsubscribe.upsert({
      where: { companyId_customerId_channel: { companyId, customerId, channel } },
      update: { reason, createdAt: new Date() },
      create: { companyId, customerId, channel, reason },
    });
    return true;
  } catch (e) {
    console.error('[BOT-UNSUB] Failed to record unsubscribe:', e.message);
    return false;
  }
}

async function removeUnsubscribe(companyId, customerId, channel) {
  try {
    const prisma = getSharedPrismaClient();
    await prisma.botUnsubscribe.delete({
      where: { companyId_customerId_channel: { companyId, customerId, channel } },
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function listUnsubscribers(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const records = await prisma.botUnsubscribe.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { company: false },
    });
    const customerIds = records.map((r) => r.customerId);
    const customers = customerIds.length
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true, phone: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    return records.map((r) => {
      const c = customerMap.get(r.customerId) || {};
      return {
        id: r.id,
        customerId: r.customerId,
        channel: r.channel,
        reason: r.reason,
        unsubscribedAt: r.createdAt,
        customerName: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        phone: c.phone || null,
      };
    });
  } catch (e) {
    console.error('[BOT-UNSUB] Failed to list unsubscribers:', e.message);
    return [];
  }
}

module.exports = {
  UNSUBSCRIBE_KEYWORDS,
  UNSUBSCRIBE_CONFIRMATION,
  isUnsubscribeText,
  isUnsubscribed,
  recordUnsubscribe,
  removeUnsubscribe,
  listUnsubscribers,
};
