const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');

const DEFAULT_SETTINGS = {
  enabled: false,
  autoReply: false,
  autoReplyIntents: ['ADDRESS', 'APPOINTMENT'],
  maxPerRun: 25,
};

function hashMessageBody(body, sentAt) {
  return crypto
    .createHash('sha256')
    .update(`${body || ''}|${sentAt ? new Date(sentAt).toISOString() : ''}`)
    .digest('hex');
}

class TicketThreadService {
  constructor(prisma = null) {
    this._prisma = prisma;
  }

  get prisma() {
    return this._prisma || getSharedPrismaClient();
  }

  async upsertThread({ companyId, providerKey, externalId, orderId = null, shipmentId = null, code = null, subject = null }) {
    if (!companyId || !providerKey || !externalId) {
      throw new Error('companyId, providerKey, and externalId are required for upsertThread');
    }

    return this.prisma.carrierTicket.upsert({
      where: {
        companyId_providerKey_externalId: {
          companyId,
          providerKey,
          externalId: String(externalId),
        },
      },
      update: {
        ...(orderId ? { orderId } : {}),
        ...(shipmentId ? { shipmentId } : {}),
        ...(code ? { code } : {}),
        ...(subject ? { subject } : {}),
      },
      create: {
        companyId,
        providerKey,
        externalId: String(externalId),
        orderId,
        shipmentId,
        code,
        subject,
        status: 'OPEN',
        unreadCount: 0,
      },
    });
  }

  async appendMessage(threadId, { companyId, direction = 'INBOUND', externalId = null, body, authorName = null, sentAt = null }) {
    if (!threadId || !companyId || !body) {
      throw new Error('threadId, companyId, and body are required for appendMessage');
    }

    const effectiveSentAt = sentAt ? new Date(sentAt) : new Date();
    const effectiveExternalId = externalId ? String(externalId) : hashMessageBody(body, effectiveSentAt);

    try {
      const message = await this.prisma.carrierTicketMessage.create({
        data: {
          ticketId: threadId,
          companyId,
          direction,
          externalId: effectiveExternalId,
          body,
          authorName,
          sentAt: effectiveSentAt,
        },
      });

      // Update thread lastMessageAt and unreadCount
      await this.prisma.carrierTicket.update({
        where: { id: threadId },
        data: {
          lastMessageAt: effectiveSentAt,
          ...(direction === 'INBOUND' ? { unreadCount: { increment: 1 } } : {}),
        },
      });

      return { duplicate: false, message };
    } catch (err) {
      if (err.code === 'P2002') {
        return { duplicate: true, externalId: effectiveExternalId };
      }
      throw err;
    }
  }

  async listThreads(companyId, { status = null, unreadOnly = false, limit = 25, cursor = null } = {}) {
    if (!companyId) return { success: false, threads: [], error: 'companyId is required' };

    const take = Math.min(Number(limit) || 25, 100);
    const where = { companyId };

    if (status && status !== 'all') {
      where.status = status;
    }
    if (unreadOnly === true || unreadOnly === 'true' || unreadOnly === '1') {
      where.unreadCount = { gt: 0 };
    }

    const queryOptions = {
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take,
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const threads = await this.prisma.carrierTicket.findMany(queryOptions);
    return { success: true, threads };
  }

  async getThread(companyId, id) {
    if (!companyId || !id) return { success: false, error: 'companyId and id are required' };

    const thread = await this.prisma.carrierTicket.findFirst({
      where: { id, companyId },
    });

    if (!thread) {
      return { success: false, error: 'المحادثة غير موجودة', status: 404 };
    }

    const messages = await this.prisma.carrierTicketMessage.findMany({
      where: { ticketId: id, companyId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return {
      success: true,
      thread: {
        ...thread,
        messages,
      },
    };
  }

  async markRead(companyId, id) {
    if (!companyId || !id) return { success: false };

    await this.prisma.carrierTicket.updateMany({
      where: { id, companyId },
      data: { unreadCount: 0 },
    });

    return { success: true };
  }

  applyReplyPolicy(thread, message, settings = {}) {
    if (!settings || settings.autoReply !== true) {
      return 'NEEDS_APPROVAL';
    }

    if (!message || message.direction !== 'INBOUND') {
      return 'IGNORE';
    }

    const text = String(message.body || '').trim();

    // Financial / compensation / cancellation prohibitions (AGENTS.md:9-13)
    const financialProhibitionRegex = /(مبلغ|تعويض|فلوس|استرداد|إلغاء|الغاء|مرتجع|تحويل|خصم|refund|cancel|compensation|money|penalty)/i;
    if (financialProhibitionRegex.test(text)) {
      return 'NEEDS_APPROVAL';
    }

    // Address / appointment / phone confirmation intents
    const allowedIntents = settings.autoReplyIntents || ['ADDRESS', 'APPOINTMENT'];
    const checks = [];

    if (allowedIntents.includes('ADDRESS')) {
      checks.push('عنوان', 'لوكيشن', 'موقع', 'address', 'location', 'شارع', 'عمارة', 'شقة');
    }
    if (allowedIntents.includes('APPOINTMENT')) {
      checks.push('موعد', 'ميعاد', 'توقيت', 'وقت', 'appointment', 'time', 'هاتف', 'تليفون', 'رقم', 'phone');
    }

    const matchesIntent = checks.some((term) => text.toLowerCase().includes(term.toLowerCase()));
    if (matchesIntent) {
      return 'AUTO_REPLY';
    }

    return 'NEEDS_APPROVAL';
  }

  async getSettings(companyId) {
    if (!companyId) return { ...DEFAULT_SETTINGS };

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company || !company.settings) return { ...DEFAULT_SETTINGS };

    try {
      const parsed = typeof company.settings === 'object' ? company.settings : JSON.parse(company.settings);
      const threadSettings = parsed.shipping_agent_threads || {};
      return {
        ...DEFAULT_SETTINGS,
        ...threadSettings,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async updateSettings(companyId, updates = {}) {
    if (!companyId) throw new Error('companyId is required');

    const payload = JSON.stringify(updates);
    await this.prisma.$executeRawUnsafe(
      `UPDATE companies
       SET settings = jsonb_set(
             COALESCE(NULLIF(settings,'')::jsonb, '{}'::jsonb),
             '{shipping_agent_threads}',
             COALESCE(COALESCE(NULLIF(settings,'')::jsonb,'{}'::jsonb)->'shipping_agent_threads', '{}'::jsonb) || $1::jsonb
           )::text,
           "updatedAt" = NOW()
       WHERE id = $2;`,
      payload,
      companyId
    );

    return this.getSettings(companyId);
  }

  async notifyCustomerShipmentUpdate({ companyId, orderId, recipientPhone, recipientName, variables = {}, trackingNumber = null }) {
    if (!companyId || (!orderId && !recipientPhone)) {
      return { success: false, reason: 'MISSING_TARGET' };
    }

    const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
    const { findCanonicalNotificationTemplate } = WhatsAppNotificationService;

    // Fail-safe check: verify if canonical template exists for SHIPPING_DELAY_UPDATE
    let template = null;
    try {
      template = await findCanonicalNotificationTemplate(companyId, 'SHIPPING_DELAY_UPDATE', null, this.prisma);
    } catch (tplErr) {
      console.warn('[SHIPPING-AGENT] Error checking notification template:', tplErr.message);
    }

    if (!template) {
      // Fail-safe: No valid template -> create ai_notifications only, NO direct raw whatsapp_send (T00 §4)
      await this.prisma.aiNotification.create({
        data: {
          companyId,
          type: 'AGENT_SHIPPING_DELAY',
          severity: 'low',
          title: 'تحديث شحنة (بدون قالب واتساب)',
          message: `تحديث شحنة للطلب ${orderId || ''}: لا يوجد قالب واتساب معتمد للحدث SHIPPING_DELAY_UPDATE.`,
          metadata: JSON.stringify({ orderId, recipientPhone, variables, trackingNumber }),
        },
      });
      return { success: false, reason: 'NO_ACTIVE_TEMPLATE', notificationCreated: true };
    }

    // Send via official WhatsAppNotificationService
    try {
      const sendResult = await WhatsAppNotificationService.sendNotification({
        companyId,
        recipientPhone,
        recipientName,
        recipientType: 'CUSTOMER',
        eventType: 'SHIPPING_DELAY_UPDATE',
        variables: {
          ...variables,
          trackingNumber: trackingNumber || variables.trackingNumber || '',
        },
        orderId,
      });

      return { success: true, sendResult };
    } catch (sendErr) {
      console.warn('[SHIPPING-AGENT] Failed to send customer notification:', sendErr.message);
      return { success: false, error: sendErr.message };
    }
  }
}

module.exports = new TicketThreadService();
