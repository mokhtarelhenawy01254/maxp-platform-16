// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 Product Offer Service — إرسال تلقائي لمنتج جديد / عرض عبر الواتساب
// ═══════════════════════════════════════════════════════════════════════════════
// يستدعى بعد إنشاء منتج جديد من productController إذا كانت إعدادات الإرسال التلقائي
// مفعّلة (WhatsAppNotificationSettings.newProductAutoSend). يبني الجمهور، يبعت
// صورة المنتج + رسالة مخصصة لكل عميل، ويسجّل كل رسالة في whatsAppNotificationLog
// (لتظهر في "تقارير الرسائل" — إشعارات العملاء) وفي broadcastCampaign (تاريخ الحملات).

const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const WhatsAppMessageHandler = require('../whatsapp/WhatsAppMessageHandler');
const WhatsAppManager = require('../whatsapp/WhatsAppManager');
const { formatPhoneNumber } = require('../../utils/phoneFormat');

const DEFAULT_NEW_PRODUCT_MESSAGE = `عزيزي {اسم العميل} ✨

نبشرك بمنتجننا الجديد! 🎉

✨ {productName}
💰 السعر: {price} جنيه

اطلبه الآن من متجرنا 🛍️`;

async function getConnectedSessions(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const dbSessions = await safeQuery(() =>
      prisma.whatsAppSession.findMany({
        where: { companyId },
        select: { id: true, phoneNumber: true, status: true },
      })
    );
    const activeSessions = WhatsAppManager.getAllActiveSessions();
    return dbSessions.map((ds) => {
      const active = activeSessions[ds.id];
      return {
        sessionId: ds.id,
        phoneNumber: ds.phoneNumber || 'غير معروف',
        isConnected: active ? active.isConnected : false,
        status: active ? active.status : ds.status,
      };
    });
  } catch (err) {
    console.error('[OFFER] Error getting sessions:', err.message);
    return [];
  }
}

function buildAudienceWhere(companyId, audience, newDays = 7) {
  const where = { companyId, phone: { not: null } };
  switch (audience) {
    case 'withOrders':
      where.orders = { some: {} };
      break;
    case 'newCustomers':
    case 'new': {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(newDays, 10));
      where.createdAt = { gte: since };
      break;
    }
    case 'activeCustomers':
    case 'active':
      where.status = 'ACTIVE';
      break;
    case 'all':
    default:
      break;
  }
  return where;
}

function parseSpintax(text) {
  if (!text || typeof text !== 'string') return text || '';
  const regex = /\{([^{}]+)\}/g;
  return text.replace(regex, (match, group) => {
    const options = group.split('|').map((o) => o.trim()).filter(Boolean);
    if (options.length === 0) return '';
    return options[Math.floor(Math.random() * options.length)];
  });
}

async function createNotificationLogEntry(entry) {
  try {
    const prisma = getSharedPrismaClient();
    await safeQuery(() =>
      prisma.whatsAppNotificationLog.create({
        data: {
          companyId: entry.companyId,
          sessionId: entry.sessionId,
          recipientPhone: entry.phone,
          recipientName: entry.name,
          recipientType: 'CUSTOMER',
          category: 'MARKETING',
          eventType: entry.eventType || 'NEW_PRODUCT',
          content: entry.content || '',
          customerId: entry.customerId || null,
          productId: entry.productId || null,
          status: entry.status || 'SENT',
          messageType: entry.messageType || 'IMAGE',
          sentAt: entry.status === 'SENT' ? new Date() : null,
          failedAt: entry.status === 'FAILED' ? new Date() : null,
          failureReason: entry.failureReason || null,
        },
      })
    );
  } catch (err) {
    console.error('[OFFER] createNotificationLogEntry error:', err.message);
  }
}

/**
 * إرسال تلقائي لأحدث منتج مُنشأ للشركة — يُستدعى فورًا بعد إنشاء المنتج.
 * يقرأ الإعدادات من WhatsAppNotificationSettings (حقول newProduct*).
 */
async function autoSendNewProduct({ companyId, product }) {
  try {
    if (!companyId || !product || !product.id) return { success: false, reason: 'missing_ctx' };

    const prisma = getSharedPrismaClient();
    const settings = await safeQuery(() =>
      prisma.whatsAppNotificationSettings.findUnique({ where: { companyId } })
    );

    if (!settings?.newProductAutoSend) {
      return { success: false, reason: 'auto_send_disabled' };
    }
    if (settings.productNotificationsEnabled === false) {
      return { success: false, reason: 'product_notifications_disabled' };
    }

    const audience = settings.newProductAudience || 'all';
    const newDays = settings.newProductNewDays || 7;
    const rawMessage = settings.newProductMessage || DEFAULT_NEW_PRODUCT_MESSAGE;

    const connectedSessions = await getConnectedSessions(companyId);
    const usableSession = connectedSessions.find((s) => s.isConnected);
    if (!usableSession) {
      console.warn('[OFFER] auto-send skipped: no connected WhatsApp session for', companyId);
      return { success: false, reason: 'no_session' };
    }

    const where = buildAudienceWhere(companyId, audience, newDays);
    const customers = await safeQuery(() =>
      prisma.customer.findMany({
        where,
        select: { id: true, firstName: true, lastName: true, phone: true },
        orderBy: { createdAt: 'desc' },
      })
    );
    const eligibleCustomers = customers.filter((c) => c.phone && c.phone.trim() !== '');
    if (eligibleCustomers.length === 0) {
      return { success: false, reason: 'empty_audience' };
    }

    const productImage = product.images && product.images.length > 0 ? product.images[0] : null;
    const baseMessage = String(rawMessage || '')
      .replace(/{productName}/g, product.name || '')
      .replace(/{price}/g, String(product.price ?? ''))
      .replace(/{currency}/g, 'جنيه');

    // سجل الحملة في broadcastCampaign
    let dbCampaignId = null;
    try {
      const record = await prisma.broadcastCampaign.create({
        data: {
          companyId,
          name: `منتج جديد: ${product.name || ''}`,
          message: baseMessage,
          targetAudience: audience,
          status: 'running',
          recipientCount: eligibleCustomers.length,
        },
      });
      dbCampaignId = record.id;
    } catch (err) {
      console.error('[OFFER] persist campaign error:', err.message);
    }

    let sent = 0;
    let failed = 0;

    for (const customer of eligibleCustomers) {
      const customerName =
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عزيزي العميل';

      let personalizedMessage = baseMessage
        .replace(/{اسم العميل}/g, customerName)
        .replace(/{customerName}/g, customerName);
      personalizedMessage = parseSpintax(personalizedMessage);

      const formattedPhone = formatPhoneNumber(customer.phone);
      try {
        if (!formattedPhone) throw new Error('رقم الهاتف غير صالح');
        if (productImage) {
          await WhatsAppMessageHandler.sendImage(usableSession.sessionId, formattedPhone, productImage, personalizedMessage);
        } else {
          await WhatsAppMessageHandler.sendText(usableSession.sessionId, formattedPhone, personalizedMessage);
        }
        sent++;
        await createNotificationLogEntry({
          companyId,
          sessionId: usableSession.sessionId,
          phone: customer.phone,
          name: customerName,
          customerId: customer.id,
          productId: product.id,
          eventType: 'NEW_PRODUCT',
          content: personalizedMessage,
          status: 'SENT',
          messageType: productImage ? 'IMAGE' : 'TEXT',
        });
      } catch (err) {
        failed++;
        console.error(`[OFFER] Failed to send to ${customer.phone}:`, err.message);
        await createNotificationLogEntry({
          companyId,
          sessionId: usableSession.sessionId,
          phone: customer.phone,
          name: customerName,
          customerId: customer.id,
          productId: product.id,
          eventType: 'NEW_PRODUCT',
          content: personalizedMessage,
          status: 'FAILED',
          messageType: productImage ? 'IMAGE' : 'TEXT',
          failureReason: err.message || null,
        });
      }

      const jitter = Math.random() * 0.4 + 0.8;
      await new Promise((r) => setTimeout(r, Math.max(500, 1500 * jitter)));
    }

    if (dbCampaignId) {
      try {
        await prisma.broadcastCampaign.update({
          where: { id: dbCampaignId },
          data: { status: 'completed', sentCount: sent, failedCount: failed, sentAt: new Date() },
        });
      } catch (err) {
        console.error('[OFFER] update campaign error:', err.message);
      }
    }

    console.log(`✅ [OFFER] auto-send done: ${sent} sent, ${failed} failed for product ${product.id}`);
    return { success: true, sent, failed, total: eligibleCustomers.length, dbCampaignId };
  } catch (err) {
    console.error('[OFFER] autoSendNewProduct error:', err.message);
    return { success: false, reason: 'error', error: err.message };
  }
}

module.exports = {
  autoSendNewProduct,
  DEFAULT_NEW_PRODUCT_MESSAGE,
};