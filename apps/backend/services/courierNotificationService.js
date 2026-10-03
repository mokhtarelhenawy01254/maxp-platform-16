const { getSharedPrismaClient } = require('./sharedDatabase');

const COURIER_NOTIFICATION_EVENTS = {
  OUT_FOR_DELIVERY: 'courier_out_for_delivery',
  DELIVERED: 'courier_delivered',
  RETURNED: 'courier_returned',
};

const NOTIFICATION_TEMPLATES = {
  [COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY]: `أهلاً {customerName} 👋

طلبك رقم {orderNumber} خرج للتوصيل الآن 🚚

👨‍✈️ الكابتن: {courierName}
📞 للتواصل: {courierPhone}
💰 المبلغ المطلوب عند الاستلام: {amount}
{otpLine}
يُرجى تجهيز المبلغ نقدًا. شكرًا لك!`,

  [COURIER_NOTIFICATION_EVENTS.DELIVERED]: `تم تسليم طلبك ✅

أهلاً {customerName}، تم تسليم طلبك رقم {orderNumber} بنجاح وتحصيل مبلغ {amount}.

شكرًا لثقتك في {storeName}! 🌟`,

  [COURIER_NOTIFICATION_EVENTS.RETURNED]: `تعذّر تسليم طلبك

أهلاً {customerName}، لم نتمكن من تسليم طلبك رقم {orderNumber} في محاولة اليوم.

السبب: {reason}

هنتواصل معك قريبًا لإعادة ترتيب التسليم. نعتذر عن الإزعاج.`,
};

function replaceVariables(template, vars) {
  let text = template;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
  }
  return text;
}

function formatAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num} ج.م` : '';
}

/**
 * Send a fleet-path customer notification. Fire-and-forget friendly: never throws.
 * Gated by the fleet app settings (notifications.*) on top of the company-wide
 * WhatsApp notification settings the platform already enforces.
 */
async function sendCourierNotification({ companyId, eventType, order, courier, amount, reason, storeName, otpLine }) {
  try {
    if (!order?.customerPhone) return { success: false, reason: 'no_phone' };

    // Fleet-level toggle (settings/notifications.*) — read fresh per send, cheap query
    const prisma = getSharedPrismaClient();
    const fleetApp = await prisma.companyApp.findFirst({
      where: { companyId, app: { slug: 'internal-courier-fleet' } },
      select: { settings: true }
    });
    const { buildInstalledMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');
    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', fleetApp?.settings || {}, {});
    const notifyKey = {
      [COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY]: 'notifyCustomerOnDispatch',
      [COURIER_NOTIFICATION_EVENTS.DELIVERED]: 'notifyCustomerOnDelivery',
      [COURIER_NOTIFICATION_EVENTS.RETURNED]: 'notifyCustomerOnReturn'
    }[eventType];
    if (installed?.notifications && installed.notifications[notifyKey] === false) {
      return { success: false, reason: 'disabled_by_fleet_settings' };
    }

    const template = NOTIFICATION_TEMPLATES[eventType];
    if (!template) return { success: false, reason: 'no_template' };

    const vars = {
      customerName: order.customerName || 'عميلنا العزيز',
      orderNumber: order.orderNumber || '',
      courierName: courier?.name || 'مندوب التوصيل',
      courierPhone: courier?.phone || '',
      amount: formatAmount(amount),
      reason: reason || '',
      storeName: storeName || '',
      otpLine: otpLine || ''
    };
    const content = replaceVariables(template, vars);

    const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
    return await sendNotification({
      companyId,
      recipientPhone: order.customerPhone,
      recipientName: order.customerName || 'عميلنا العزيز',
      recipientType: 'CUSTOMER',
      category: 'courier_fleet',
      eventType,
      variables: { ...vars, contentOverride: content },
      orderId: order.id || null,
      priority: 4
    });
  } catch (error) {
    console.error(`[CourierNotification] Error sending ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fire-and-forget dispatch notifications for every shipment entering a new run.
 * Called AFTER the dispatch transaction commits — never blocks or fails the dispatch.
 * otpByShipment: Map shipmentId → plain OTP included in the customer message when present.
 */
function notifyRunDispatched(companyId, { run, shipments, courier, otpByShipment }) {
  for (const s of shipments || []) {
    if (!s.order) continue;
    const otp = otpByShipment?.get?.(s.id);
    sendCourierNotification({
      companyId,
      eventType: COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
      order: s.order,
      courier,
      amount: s.order?.total,
      otpLine: otp
        ? `🔑 كود الاستلام: ${otp} — اعرضه للكابتن عند استلام الطلب`
        : ''
    }).catch((e) => console.error('[CourierNotification] dispatch notify failed:', e.message));
  }
}

/**
 * Fire-and-forget delivery/return notifications after a field update commits.
 */
function notifyFieldUpdate(companyId, { status, order, courier, collectedAmount, reason }) {
  if (!order) return;
  const eventType =
    status === 'DELIVERED'
      ? COURIER_NOTIFICATION_EVENTS.DELIVERED
      : status === 'RETURNED'
      ? COURIER_NOTIFICATION_EVENTS.RETURNED
      : null;
  if (!eventType) return;

  sendCourierNotification({
    companyId,
    eventType,
    order,
    courier,
    amount: collectedAmount,
    reason
  }).catch((e) => console.error('[CourierNotification] field notify failed:', e.message));
}

module.exports = {
  COURIER_NOTIFICATION_EVENTS,
  NOTIFICATION_TEMPLATES,
  sendCourierNotification,
  notifyRunDispatched,
  notifyFieldUpdate
};
