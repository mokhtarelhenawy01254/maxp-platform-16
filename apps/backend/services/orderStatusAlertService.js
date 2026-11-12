/**
 * Order Status-Change Alert Service
 *
 * Manages per-company status alert settings stored in `company.settings.statusAlerts`,
 * sends company-wide in-app notifications (`type: 'order_status_alert'`, `userId: null`)
 * and WhatsApp admin/owner alerts (`category: 'ORDER'`, `eventType: 'ANNOUNCEMENT'`),
 * and enforces the in-memory TTL deduplication guard (`statusAlertDedup`).
 */

const { checkStatusAlertDedup } = require('../utils/statusAlertDedup');

const DEFAULT_RECIPIENT_ROLES = ['COMPANY_ADMIN', 'MANAGER'];
const VALID_USER_COMPANY_ROLES = new Set([
  'OWNER',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'AGENT',
  'AFFILIATE',
]);

const NON_RETRYABLE_WHATSAPP_REASONS = new Set([
  'no_session',
  'session_not_connected',
  'no_template',
  'template_not_found',
  'no_template_configured',
  'meta_template_not_approved',
  'template_param_mismatch',
  'module_disabled',
  'disabled',
  'notifications_disabled',
  'event_disabled',
]);

function getDefaultStatusAlertSettings() {
  return {
    enabled: true,
    statuses: ['SHIPPED'],
    channels: {
      inApp: true,
      whatsapp: true,
    },
    recipients: {
      roles: [...DEFAULT_RECIPIENT_ROLES],
      phones: [],
    },
    windowMinutes: 5,
    updatedBy: null,
    updatedAt: null,
  };
}

function normalizePhoneList(rawPhones) {
  let list = [];
  if (Array.isArray(rawPhones)) {
    list = rawPhones;
  } else if (typeof rawPhones === 'string') {
    list = rawPhones.split(/[\n,;]+/);
  }
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    const cleaned = String(entry || '').trim();
    if (!cleaned) continue;
    const dedupKey = cleaned.replace(/[\s\-()]/g, '');
    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    result.push(cleaned);
  }
  return result;
}

function normalizeCodeList(rawList, fallback = []) {
  if (!Array.isArray(rawList)) {
    return [...fallback];
  }
  const seen = new Set();
  const out = [];
  for (const item of rawList) {
    const normalized = String(item || '').trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/**
 * Pure normalization of `company.settings.statusAlerts`.
 * @param {object|null|undefined} rawSettings
 */
function normalizeStatusAlertSettings(rawSettings) {
  const raw = rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)
    ? rawSettings
    : {};

  const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : true;

  const statuses = Array.isArray(raw.statuses)
    ? normalizeCodeList(raw.statuses, [])
    : ['SHIPPED'];

  const rawChannels = raw.channels && typeof raw.channels === 'object' ? raw.channels : {};
  const channels = {
    inApp: rawChannels.inApp !== undefined ? Boolean(rawChannels.inApp) : true,
    whatsapp: rawChannels.whatsapp !== undefined ? Boolean(rawChannels.whatsapp) : true,
  };

  const rawRecipients = raw.recipients && typeof raw.recipients === 'object' ? raw.recipients : {};
  const roles = Array.isArray(rawRecipients.roles)
    ? normalizeCodeList(rawRecipients.roles, [])
    : [...DEFAULT_RECIPIENT_ROLES];
  const phones = normalizePhoneList(rawRecipients.phones);

  let windowMinutes = 5;
  if (raw.windowMinutes !== undefined && raw.windowMinutes !== null && raw.windowMinutes !== '') {
    const parsed = Number(raw.windowMinutes);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1440) {
      windowMinutes = Math.round(parsed);
    }
  }

  const normalized = {
    enabled,
    statuses,
    channels,
    recipients: {
      roles,
      phones,
    },
    windowMinutes,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
  };

  Object.defineProperty(normalized, '_hasExplicitConfig', {
    value: Boolean(rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)),
    enumerable: false,
    configurable: true,
    writable: true,
  });

  return normalized;
}

/**
 * Pure validation for incoming PUT /order-status-alerts payload.
 * @param {any} payload
 * @returns {{ isValid: boolean, message?: string }}
 */
function validateStatusAlertSettings(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, message: 'بيانات إعدادات التنبيهات غير صالحة' };
  }

  if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') {
    return { isValid: false, message: 'قيمة التفعيل يجب أن تكون منطقية (true/false)' };
  }

  if (payload.statuses !== undefined && !Array.isArray(payload.statuses)) {
    return { isValid: false, message: 'قائمة الحالات يجب أن تكون مصفوفة' };
  }

  if (
    payload.channels !== undefined &&
    (typeof payload.channels !== 'object' || payload.channels === null || Array.isArray(payload.channels))
  ) {
    return { isValid: false, message: 'إعدادات القنوات غير صالحة' };
  }

  if (payload.recipients !== undefined) {
    if (typeof payload.recipients !== 'object' || payload.recipients === null || Array.isArray(payload.recipients)) {
      return { isValid: false, message: 'إعدادات المستقبلين غير صالحة' };
    }
    if (payload.recipients.roles !== undefined && !Array.isArray(payload.recipients.roles)) {
      return { isValid: false, message: 'قائمة أدوار المستقبلين يجب أن تكون مصفوفة' };
    }
    if (
      payload.recipients.phones !== undefined &&
      !Array.isArray(payload.recipients.phones) &&
      typeof payload.recipients.phones !== 'string'
    ) {
      return { isValid: false, message: 'أرقام الهواتف يجب أن تكون مصفوفة أو نصاً' };
    }
  }

  if (payload.windowMinutes !== undefined && payload.windowMinutes !== null && payload.windowMinutes !== '') {
    const num = Number(payload.windowMinutes);
    if (!Number.isFinite(num) || num < 0 || num > 1440) {
      return { isValid: false, message: 'نافذة منع التكرار يجب أن تكون بين 0 و 1440 دقيقة' };
    }
  }

  return { isValid: true };
}

/**
 * Pure check: is status-change alert enabled for a given status code?
 * @param {object|null|undefined} settings
 * @param {string} statusCode
 * @returns {boolean}
 */
function isStatusAlertEnabled(settings, statusCode) {
  if (!settings || settings.enabled !== true) {
    return false;
  }
  const code = String(statusCode || '').trim().toUpperCase();
  if (!code || !Array.isArray(settings.statuses)) {
    return false;
  }
  return settings.statuses.some((s) => String(s || '').trim().toUpperCase() === code);
}

function parseCompanySettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
}

function getPrismaClient(prismaOverride) {
  if (prismaOverride) return prismaOverride;
  const { getSharedPrismaClient } = require('./sharedDatabase');
  return getSharedPrismaClient();
}

async function getStatusAlertSettings(companyId, prismaOverride = null) {
  if (!companyId) {
    return normalizeStatusAlertSettings(null);
  }
  try {
    const prisma = getPrismaClient(prismaOverride);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const companySettings = parseCompanySettings(company?.settings);
    return normalizeStatusAlertSettings(companySettings.statusAlerts);
  } catch (err) {
    console.warn('⚠️ [ORDER-STATUS-ALERT] Error fetching settings:', err.message);
    return normalizeStatusAlertSettings(null);
  }
}

async function resolveAlertRecipients({ companyId, settings, prisma }) {
  const recipients = [];
  const seenPhones = new Set();

  const addRecipient = (phone, name = 'المسؤول') => {
    const cleaned = String(phone || '').trim();
    if (!cleaned) return;
    const dedupKey = cleaned.replace(/[\s\-()]/g, '');
    if (!dedupKey || seenPhones.has(dedupKey)) return;
    seenPhones.add(dedupKey);
    recipients.push({ phone: cleaned, name: String(name || 'المسؤول').trim() || 'المسؤول' });
  };

  // 1. Explicit manual phone numbers
  for (const phone of settings?.recipients?.phones || []) {
    addRecipient(phone, 'مستلم مخصص');
  }

  // 2. Active company users matching selected roles
  const roles = Array.isArray(settings?.recipients?.roles) ? settings.recipients.roles : [];
  if (roles.length > 0 && prisma) {
    try {
      const companyRoles = roles.filter((r) => VALID_USER_COMPANY_ROLES.has(r));
      if (companyRoles.length > 0 && prisma.userCompany?.findMany) {
        const companyUsers = await prisma.userCompany.findMany({
          where: {
            companyId,
            isActive: true,
            role: { in: companyRoles },
          },
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
          },
        });
        for (const membership of companyUsers || []) {
          const u = membership?.user;
          if (u && u.isActive !== false && u.phone) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            addRecipient(u.phone, fullName || membership.role || 'المسؤول');
          }
        }
      }
    } catch (ucErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] userCompany lookup failed:', ucErr.message);
    }

    try {
      if (prisma.user?.findMany) {
        const directUsers = await prisma.user.findMany({
          where: {
            companyId,
            isActive: true,
            role: { in: roles },
          },
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
        for (const u of directUsers || []) {
          if (u?.phone) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            addRecipient(u.phone, fullName || u.role || 'المسؤول');
          }
        }
      }
    } catch (uErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] user lookup failed:', uErr.message);
    }
  }

  // 3. Fallback to HRSettings.ownerWhatsAppNumber, then Company.phone (mirrors hrOwnerNotificationAgent)
  const shouldIncludeOwnerFallback =
    recipients.length === 0 || roles.includes('COMPANY_ADMIN') || roles.includes('OWNER');

  if (shouldIncludeOwnerFallback && prisma) {
    try {
      if (prisma.hRSettings?.findUnique) {
        const hrSettings = await prisma.hRSettings.findUnique({
          where: { companyId },
          select: { ownerWhatsAppNumber: true },
        });
        if (hrSettings?.ownerWhatsAppNumber) {
          addRecipient(hrSettings.ownerWhatsAppNumber, 'مالك الشركة');
        }
      }
    } catch (hrErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] HRSettings lookup failed:', hrErr.message);
    }
  }

  if (recipients.length === 0 && prisma) {
    try {
      if (prisma.company?.findUnique) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { phone: true, name: true },
        });
        if (company?.phone) {
          addRecipient(company.phone, company.name || 'مالك الشركة');
        }
      }
    } catch (compErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] Company phone lookup failed:', compErr.message);
    }
  }

  return recipients;
}

async function resolveActorName({ changedBy, changedByName, prisma }) {
  if (changedByName && String(changedByName).trim()) {
    return String(changedByName).trim();
  }
  if (changedBy && prisma?.user?.findUnique) {
    try {
      const actor = await prisma.user.findUnique({
        where: { id: changedBy },
        select: { firstName: true, lastName: true, email: true },
      });
      const fullName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim();
      if (fullName) return fullName;
      if (actor?.email) return actor.email;
    } catch (_) {}
  }
  return 'النظام';
}

async function resolveCustomerName({ order, prisma }) {
  if (order?.customer) {
    const fullName = [order.customer.firstName, order.customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) return fullName;
    if (order.customer.name) return String(order.customer.name).trim();
  }
  if (order?.customerName && String(order.customerName).trim()) {
    return String(order.customerName).trim();
  }
  if (order?.customerId && prisma?.customer?.findUnique) {
    try {
      const cust = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { firstName: true, lastName: true, phone: true },
      });
      const fullName = [cust?.firstName, cust?.lastName].filter(Boolean).join(' ').trim();
      if (fullName) return fullName;
      if (cust?.phone) return cust.phone;
    } catch (_) {}
  }
  return '';
}

async function dispatchWhatsAppAlert({
  companyId,
  orderId = undefined,
  title,
  content,
  recipients,
  whatsappService,
}) {
  if (!recipients || recipients.length === 0) {
    return { success: false, reason: 'no_recipients', attempted: 0, sent: 0 };
  }

  const waSvc = whatsappService || require('./whatsapp/WhatsAppNotificationService');
  let sentCount = 0;
  let lastReason = null;

  for (const recipient of recipients) {
    try {
      const waResult = await waSvc.sendNotification({
        companyId,
        recipientPhone: recipient.phone,
        recipientName: recipient.name || 'المسؤول',
        recipientType: 'ADMIN',
        category: 'ORDER',
        eventType: 'ANNOUNCEMENT',
        ...(orderId ? { orderId } : {}),
        variables: {
          title,
          content,
          signature: 'تنبيهات حالة الطلبات',
        },
        priority: 1,
      });

      if (waResult?.success) {
        sentCount += 1;
      } else {
        lastReason = waResult?.reason || waResult?.errorCode || 'send_failed';
        const reasonKey = String(lastReason).toLowerCase();
        const errorCodeKey = String(waResult?.errorCode || '').toLowerCase();
        console.warn(
          `⚠️ [ORDER-STATUS-ALERT] WhatsApp not delivered to ${recipient.phone}: reason=${lastReason}`
        );
        if (
          NON_RETRYABLE_WHATSAPP_REASONS.has(reasonKey) ||
          NON_RETRYABLE_WHATSAPP_REASONS.has(errorCodeKey)
        ) {
          break;
        }
      }
    } catch (waErr) {
      lastReason = waErr?.message || 'whatsapp_exception';
      console.warn(
        `⚠️ [ORDER-STATUS-ALERT] WhatsApp threw for ${recipient.phone}: ${lastReason}`
      );
    }
  }

  return {
    success: sentCount > 0,
    reason: sentCount > 0 ? null : lastReason || 'send_failed',
    attempted: recipients.length,
    sent: sentCount,
  };
}

function buildAlertMessages({ orderNumber, oldStatus, newStatus, actorName, customerName, now }) {
  const fromLabel = oldStatus || '—';
  const toLabel = newStatus;
  const timeText = new Date(now).toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const title = `تنبيه تغيير حالة الطلب #${orderNumber}`;
  const inAppMessage =
    `الطلب #${orderNumber} تغيّر من ${fromLabel} إلى ${toLabel} · بواسطة: ${actorName}` +
    (customerName ? ` · العميل: ${customerName}` : '');
  const whatsappContent =
    `طلب #${orderNumber} · من ${fromLabel} → ${toLabel} · بواسطة ${actorName} · ${timeText}` +
    (customerName ? ` · العميل: ${customerName}` : '');

  return { title, inAppMessage, whatsappContent };
}

/**
 * Triggers in-app & WhatsApp owner/team alert after an order status change.
 * Never throws; catches errors internally so the primary order mutation is unaffected.
 */
async function alertStatusChange({
  companyId,
  order,
  oldStatus = null,
  newStatus = null,
  customStatusCode = null,
  changedBy = null,
  changedByName = null,
  prisma: prismaOverride = null,
  whatsappService = null,
  notificationSvc = null,
  settings: settingsOverride = null,
  now = Date.now(),
} = {}) {
  try {
    if (!companyId || !order) {
      return { skipped: true, reason: 'missing_context' };
    }

    const effectiveStatus = String(customStatusCode || newStatus || '').trim().toUpperCase();
    const previousStatus = String(oldStatus || '').trim().toUpperCase();
    if (!effectiveStatus) {
      return { skipped: true, reason: 'missing_status' };
    }
    if (previousStatus && previousStatus === effectiveStatus) {
      return { skipped: true, reason: 'unchanged_status' };
    }

    const prisma = getPrismaClient(prismaOverride);
    const settings = settingsOverride || (await getStatusAlertSettings(companyId, prisma));

    if (!isStatusAlertEnabled(settings, effectiveStatus)) {
      return { skipped: true, reason: 'status_not_enabled', statusCode: effectiveStatus };
    }

    if (!settings.channels?.inApp && !settings.channels?.whatsapp) {
      return { skipped: true, reason: 'no_channels_enabled', statusCode: effectiveStatus };
    }

    const dedup = checkStatusAlertDedup({
      companyId,
      orderId: order.id,
      statusCode: effectiveStatus,
      windowMinutes: settings.windowMinutes,
      now,
    });

    if (!dedup.allowed) {
      return {
        skipped: true,
        reason: 'deduplicated',
        retryAfterMs: dedup.retryAfterMs,
        statusCode: effectiveStatus,
      };
    }

    const orderNumber = order.orderNumber || order.id;
    const [actorName, customerName] = await Promise.all([
      resolveActorName({ changedBy, changedByName, prisma }),
      resolveCustomerName({ order, prisma }),
    ]);

    const { title, inAppMessage, whatsappContent } = buildAlertMessages({
      orderNumber,
      oldStatus: previousStatus,
      newStatus: effectiveStatus,
      actorName,
      customerName,
      now,
    });

    let inAppResult = false;
    if (settings.channels?.inApp) {
      try {
        const notifService = notificationSvc || require('./notificationService');
        const created = await notifService.createNotification({
          companyId,
          title,
          message: inAppMessage,
          type: 'order_status_alert',
          userId: null,
          metadata: {
            orderId: order.id,
            orderNumber,
            oldStatus: previousStatus || null,
            newStatus: effectiveStatus,
            changedBy: changedBy || null,
            changedByName: actorName,
            customerName: customerName || null,
            url: `/orders?orderId=${order.id}`,
          },
        });
        inAppResult = Boolean(created);
      } catch (inAppErr) {
        console.warn('⚠️ [ORDER-STATUS-ALERT] In-app notification failed:', inAppErr.message);
      }
    }

    let whatsappResult = { success: false, reason: 'channel_disabled' };
    if (settings.channels?.whatsapp) {
      const recipients = await resolveAlertRecipients({ companyId, settings, prisma });
      whatsappResult = await dispatchWhatsAppAlert({
        companyId,
        orderId: order.id,
        title,
        content: whatsappContent,
        recipients,
        whatsappService,
      });
    }

    return {
      skipped: false,
      statusCode: effectiveStatus,
      inApp: inAppResult,
      whatsapp: whatsappResult,
    };
  } catch (err) {
    console.warn('⚠️ [ORDER-STATUS-ALERT] alertStatusChange error:', err.message);
    return { skipped: true, reason: 'error', error: err.message };
  }
}

/**
 * Sends a synthetic test alert without creating or mutating any order rows.
 */
async function sendTestAlert({
  companyId,
  user = null,
  prisma: prismaOverride = null,
  whatsappService = null,
  notificationSvc = null,
  now = Date.now(),
} = {}) {
  const prisma = getPrismaClient(prismaOverride);
  const settings = await getStatusAlertSettings(companyId, prisma);

  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.name ||
    user?.email ||
    'اختبار النظام';

  const targetStatus =
    Array.isArray(settings.statuses) && settings.statuses.length > 0
      ? settings.statuses[0]
      : 'SHIPPED';

  const { title, inAppMessage, whatsappContent } = buildAlertMessages({
    orderNumber: 'TEST-1001',
    oldStatus: 'PROCESSING',
    newStatus: targetStatus,
    actorName,
    customerName: 'عميل تجريبي',
    now,
  });

  let inApp = false;
  if (settings.channels?.inApp !== false) {
    try {
      const notifService = notificationSvc || require('./notificationService');
      const created = await notifService.createNotification({
        companyId,
        title: `[تجربة] ${title}`,
        message: inAppMessage,
        type: 'order_status_alert',
        userId: null,
        metadata: {
          isTest: true,
          orderNumber: 'TEST-1001',
          oldStatus: 'PROCESSING',
          newStatus: targetStatus,
          changedBy: user?.id || user?.userId || null,
          changedByName: actorName,
          customerName: 'عميل تجريبي',
          url: '/settings/orders/status-alerts',
        },
      });
      inApp = Boolean(created);
    } catch (inAppErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] Test in-app notification failed:', inAppErr.message);
    }
  }

  let whatsapp = { success: false, reason: 'channel_disabled' };
  if (settings.channels?.whatsapp !== false) {
    const recipients = await resolveAlertRecipients({ companyId, settings, prisma });
    whatsapp = await dispatchWhatsAppAlert({
      companyId,
      title: `[تجربة] ${title}`,
      content: whatsappContent,
      recipients,
      whatsappService,
    });
  }

  return {
    inApp,
    whatsapp: {
      success: Boolean(whatsapp?.success),
      reason: whatsapp?.reason || null,
    },
  };
}

module.exports = {
  DEFAULT_RECIPIENT_ROLES,
  getDefaultStatusAlertSettings,
  normalizeStatusAlertSettings,
  validateStatusAlertSettings,
  isStatusAlertEnabled,
  getStatusAlertSettings,
  resolveAlertRecipients,
  alertStatusChange,
  sendTestAlert,
};
