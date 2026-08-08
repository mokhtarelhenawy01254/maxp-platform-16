/**
 * 🔔 WhatsApp Notification Service
 * خدمة إدارة الإشعارات التلقائية عبر WhatsApp
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const WhatsAppManager = require('./WhatsAppManager');
const axios = require('axios');
const { isNonNotifiableStatus } = require('../../utils/orderStatusMeta');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 القوالب الافتراضية (مستخرجة إلى templates/defaultTemplates.js — §5.1)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TEMPLATES = require('./templates/defaultTemplates');


// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 الدوال المساعدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استبدال المتغيرات في القالب
 */
function replaceVariables(template, variables) {
  if (!template) return '';
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{?\\{${escapedKey}\\}\\}?`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? value : '');
  }
  return result;
}

/**
 * اختيار قالب الحدث حسب قناة الإرسال الفعلية (Baileys أم Meta Cloud).
 *
 * الحالة الواحدة تقدر يكون ليها قالبان مستقلان (من صفحة قوالب الحالات):
 *  - template عادي (channel != META_CLOUD) يُرسل نصاً حراً.
 *  - metaTemplate (channel == META_CLOUD) مربوط بقالب ميتا معتمد.
 *
 * القاعدة:
 *  1) جلسة META_CLOUD → نفضّل قالب META_CLOUD المرتبط بقالب معتمد؛
 *     لو مش موجود/معتمد → ننزل للقالب العادي.
 *  2) جلسة BAILEYS → نفضّل القالب العادي.
 *  3) لو مفيش قالب مطابق للقناة → أي قالب للحدث (توافق مع بيانات قديمة
 *     مالهاش channel، واللي كان فيها الربط على نفس القالب).
 */
async function findNotificationTemplateForEvent(companyId, eventType, sessionProvider, prisma) {
  const isMetaSession = String(sessionProvider || '').toUpperCase() === 'META_CLOUD';

  if (isMetaSession) {
    // 1) سجل META_CLOUD مربوط بقالب معتمد — النموذج الجديد (قناة مفصولة).
    const metaTemplate = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType, isActive: true, channel: 'META_CLOUD' },
      orderBy: { isDefault: 'desc' }
    });
    if (metaTemplate && metaTemplate.metaTemplateName && String(metaTemplate.metaTemplateStatus || '').toUpperCase() === 'APPROVED') {
      return metaTemplate;
    }

    // 2) توافق قديم (legacy): سجل عادي (channel AUTO/غير محدد) عليه ربط ميتا معتمد.
    //    لازم يتفّضل على القالب العادي الصريح — وإلا هيتبعت نص حر بدل قالب ميتا.
    const legacyMeta = await prisma.whatsAppNotificationTemplate.findFirst({
      where: {
        companyId,
        eventType,
        isActive: true,
        channel: { not: 'META_CLOUD' },
        metaTemplateName: { not: null },
      },
      orderBy: { isDefault: 'desc' }
    });
    if (legacyMeta && legacyMeta.metaTemplateName && String(legacyMeta.metaTemplateStatus || '').toUpperCase() === 'APPROVED') {
      return legacyMeta;
    }
  }

  const regularTemplate = await prisma.whatsAppNotificationTemplate.findFirst({
    where: { companyId, eventType, isActive: true, channel: { not: 'META_CLOUD' } },
    orderBy: { isDefault: 'desc' }
  });
  if (regularTemplate) return regularTemplate;

  return prisma.whatsAppNotificationTemplate.findFirst({
    where: { companyId, eventType, isActive: true },
    orderBy: { isDefault: 'desc' }
  });
}

/**
 * بناء ID وظيفي لزر تغيير حالة الطلب من إعدادات الزر
 * @param {object} btn - { id, text, action }
 * @param {object} variables - متغيرات الإرسال (يجب أن تحتوي orderId)
 */
function buildOrderStatusButtonId(btn, variables) {
  const orderId = variables.orderId || '';

  // التوافق القديم: أزرار تحتوي بالفعل على ID وظيفي جاهز (مثل confirm_order_{orderId})
  if (btn.id && !btn.action) {
    return replaceVariables(btn.id, variables);
  }

  const action = String(btn.action || 'CONFIRMED').toUpperCase();

  if (action === 'CONFIRMED') return `confirm_order_${orderId}`;
  if (action === 'PROCESSING') return `delay_order_${orderId}`;
  if (action === 'CANCELLED') return `cancel_order_${orderId}`;

  // حالة مخصصة: set_status_{STATUS_CODE}_{orderId}
  return `set_status_${action}_${orderId}`;
}

/**
 * التحقق من ساعات الهدوء
 */
function isQuietHours(settings) {
  if (!settings?.quietHoursEnabled || !settings?.quietHoursStart || !settings?.quietHoursEnd) return false;

  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    if (isNaN(startHour) || isNaN(endHour)) return false;

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      // ساعات الهدوء تمتد لليوم التالي (مثل 22:00 - 08:00)
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  } catch (err) {
    console.error('Error calculating quiet hours:', err);
    return false;
  }
}

/**
 * تنسيق رقم الهاتف
 */

const { formatPhoneNumber } = require('../../utils/phoneFormat');

const COMPANY_OWNER_ROLES = ['OWNER', 'COMPANY_ADMIN'];
const COMPANY_OPERATIONS_ROLES = ['MANAGER', 'ADMIN'];
const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'];
const ADMIN_RECIPIENT_ROUTING_MODES = {
  AUTO: 'AUTO',
  MANUAL_ONLY: 'MANUAL_ONLY',
  MANUAL_PLUS_AUTO: 'MANUAL_PLUS_AUTO'
};
const COMPANY_LIFECYCLE_EVENT_TYPES = new Set([
  'NEW_SIGNUP_WELCOME',
  'NEW_SIGNUP_ADMIN_ALERT',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CANCELLED',
  'NEWSLETTER_SUBSCRIBED',
  'BENEFIT_GRANTED'
]);


let platformSenderCompanyCache = {
  value: null,
  expiresAt: 0
};

function formatNotificationDate(value) {
  if (!value) return '';

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return '';
  }

  return dateValue.toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}


/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §3.1):
 * نقطة واحدة للتحقق من تكرار إشعار — تستخدمها sendOrderCreatedNotification /
 * orderService / orderWorkflowService.
 * - للطلبات المسجلة (orderId موجود): المفتاح = orderId + eventType.
 * - للطلبات الضيوف (بدون orderId): المفتاح = recipientPhone + eventType.
 * - يُطبَّع الـ eventType عبر getPersistedNotificationEventType حتى يطابق ما
 *   يُخزَّن فعلاً في whatsAppNotificationLog (لا contains — تطابق تام).
 */
async function isDuplicateNotification({ companyId, orderId, recipientPhone, eventType, windowMs = 10000 }) {
  const prisma = getSharedPrismaClient();
  const persistedEventType = getPersistedNotificationEventType(eventType);
  const where = {
    companyId,
    eventType: persistedEventType,
    createdAt: { gte: new Date(Date.now() - windowMs) },
  };
  if (orderId) {
    where.orderId = orderId;
  } else if (recipientPhone) {
    where.recipientPhone = recipientPhone;
  } else {
    return false;
  }
  const found = await prisma.whatsAppNotificationLog.findFirst({ where, select: { id: true } });
  return Boolean(found);
}


function formatBillingCycleLabel(billingCycle) {
  const normalizedCycle = String(billingCycle || '').toLowerCase();
  if (normalizedCycle === 'yearly') return 'سنوي';
  if (normalizedCycle === 'quarterly') return 'ربع سنوي';
  if (normalizedCycle === 'weekly') return 'أسبوعي';
  return 'شهري';
}

function formatSignupTypeLabel(signupType) {
  const labels = {
    platform_signup: 'تسجيل منصة جديد',
    storefront_customer: 'تسجيل عميل جديد',
    landing_lead: 'تسجيل Lead جديد',
    membership_member: 'تسجيل عضوية جديدة',
    newsletter: 'اشتراك نشرة إخبارية'
  };

  return labels[signupType] || 'تسجيل جديد';
}

function buildDisplayName({ firstName, lastName, fallback = 'عميلنا العزيز' }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
}

function summarizeNotificationResults(results, recipients) {
  const normalizedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        ...result.value,
        recipient: recipients[index]
      };
    }

    return {
      success: false,
      reason: 'error',
      error: result.reason?.message || String(result.reason),
      recipient: recipients[index]
    };
  });

  return {
    success: normalizedResults.some((item) => item?.success),
    results: normalizedResults
  };
}

function dedupeRecipients(recipients = []) {
  const seen = new Set();

  return recipients.reduce((accumulator, recipient) => {
    const formattedPhone = formatPhoneNumber(recipient?.phone);
    if (!formattedPhone || seen.has(formattedPhone)) {
      return accumulator;
    }

    seen.add(formattedPhone);
    accumulator.push({
      ...recipient,
      phone: formattedPhone,
      name: recipient?.name || recipient?.email || formattedPhone
    });

    return accumulator;
  }, []);
}

function normalizeAdminRoutingMode(mode) {
  if (!mode || typeof mode !== 'string') {
    return ADMIN_RECIPIENT_ROUTING_MODES.AUTO;
  }

  const upperMode = mode.toUpperCase();
  return Object.values(ADMIN_RECIPIENT_ROUTING_MODES).includes(upperMode)
    ? upperMode
    : ADMIN_RECIPIENT_ROUTING_MODES.AUTO;
}

function parseConfiguredRecipientPhones(value, fallbackRole = 'ADMIN') {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const rawPhones = value
    .split(/[\r\n,;،]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return dedupeRecipients(
    rawPhones.map((phone, index) => ({
      phone,
      name: `Manual recipient ${index + 1}`,
      role: fallbackRole
    }))
  );
}

function mergeRecipientsByRoutingMode({
  autoRecipients = [],
  manualRecipients = [],
  routingMode = ADMIN_RECIPIENT_ROUTING_MODES.AUTO
}) {
  switch (normalizeAdminRoutingMode(routingMode)) {
    case ADMIN_RECIPIENT_ROUTING_MODES.MANUAL_ONLY:
      return manualRecipients;
    case ADMIN_RECIPIENT_ROUTING_MODES.MANUAL_PLUS_AUTO:
      return dedupeRecipients([...manualRecipients, ...autoRecipients]);
    case ADMIN_RECIPIENT_ROUTING_MODES.AUTO:
    default:
      return manualRecipients.length > 0 ? manualRecipients : autoRecipients;
  }
}

function getEventSettingKey(eventType) {
  return eventType.toLowerCase().replace(/_([a-z])/g, (match) => match[1].toUpperCase()) + 'Enabled';
}

function getModuleSettingKey(eventType) {
  if (COMPANY_LIFECYCLE_EVENT_TYPES.has(eventType)) {
    return 'companyLifecycleNotificationsEnabled';
  }

  if (eventType.startsWith('ORDER_') || eventType === 'PAYMENT_REMINDER') {
    return 'orderNotificationsEnabled';
  }

  if (
    eventType === 'BACK_IN_STOCK' ||
    eventType === 'PRICE_DROP' ||
    eventType === 'NEW_PRODUCT' ||
    eventType === 'REVIEW_REQUEST'
  ) {
    return 'productNotificationsEnabled';
  }

  if (
    eventType.startsWith('CART_') ||
    eventType === 'PROMOTIONAL' ||
    eventType === 'COUPON_SENT' ||
    eventType === 'BIRTHDAY_WISH'
  ) {
    return 'marketingNotificationsEnabled';
  }

  // 🎁 إشعارات الولاء والكاش باك والجودة — تُدار من مفتاح الولاء الخاص
  // (loyaltyEnabled) بدل الاعتماد على marketingNotificationsEnabled.
  if (
    eventType.startsWith('LOYALTY_') ||
    eventType.startsWith('CASHBACK_') ||
    eventType.startsWith('CUSTOMER_QUALITY_')
  ) {
    return 'loyaltyEnabled';
  }

  if (
    eventType.startsWith('ATTENDANCE_') ||
    eventType.startsWith('LEAVE_') ||
    eventType.startsWith('PERMISSION_') ||
    eventType === 'CHECKOUT_CONFIRMED' ||
    eventType === 'PAYROLL_READY' ||
    eventType === 'BIRTHDAY_EMPLOYEE' ||
    eventType === 'WARNING_ISSUED' ||
    eventType === 'MANUAL_DEDUCTION'
  ) {
    return 'hrNotificationsEnabled';
  }

  if (eventType.startsWith('TASK_')) {
    return 'taskNotificationsEnabled';
  }

  return null;
}

function isEventEnabledForSettings(settings, eventType) {
  if (!settings?.isEnabled) {
    return { enabled: false, reason: 'notifications_disabled' };
  }

  const moduleSettingKey = getModuleSettingKey(eventType);
  if (moduleSettingKey && settings[moduleSettingKey] === false) {
    return { enabled: false, reason: 'module_disabled', settingKey: moduleSettingKey };
  }

  const eventSettingKey = getEventSettingKey(eventType);
  if (Object.prototype.hasOwnProperty.call(settings, eventSettingKey) && settings[eventSettingKey] === false) {
    return { enabled: false, reason: 'event_type_disabled', settingKey: eventSettingKey };
  }

  return { enabled: true, reason: null, settingKey: eventSettingKey };
}

async function resolveCompanyContext(companyId) {
  if (!companyId) return null;

  return safeQuery(() =>
    getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        slug: true
      }
    })
  );
}

function mapUserRecipient(user, fallbackRole) {
  return {
    phone: user?.phone,
    name: buildDisplayName(user),
    email: user?.email,
    role: fallbackRole || user?.role || 'ADMIN'
  };
}

async function collectCompanyRecipientsByRoles(companyId, roles = []) {
  const prisma = getSharedPrismaClient();

  const [directUsers, memberships] = await Promise.all([
    safeQuery(() =>
      prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: roles }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true
        }
      })
    ),
    safeQuery(() =>
      prisma.userCompany.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: roles }
        },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      })
    )
  ]);

  const recipients = [];

  for (const user of directUsers || []) {
    recipients.push(mapUserRecipient(user, user.role));
  }

  for (const membership of memberships || []) {
    if (!membership?.user?.isActive) continue;
    recipients.push(mapUserRecipient(membership.user, membership.role || membership.user.role));
  }

  return dedupeRecipients(recipients);
}

async function resolveCompanyOwnerRecipients(companyId) {
  const [company, ownerRecipients] = await Promise.all([
    resolveCompanyContext(companyId),
    collectCompanyRecipientsByRoles(companyId, COMPANY_OWNER_ROLES)
  ]);

  return {
    company,
    recipients: ownerRecipients
  };
}

async function resolveCompanyLeadershipRecipients(companyId) {
  const ownerResult = await resolveCompanyOwnerRecipients(companyId);
  if (ownerResult.recipients.length > 0) {
    return ownerResult;
  }

  return {
    company: ownerResult.company,
    recipients: await collectCompanyRecipientsByRoles(companyId, COMPANY_OPERATIONS_ROLES)
  };
}

async function resolveCompanyAdminRecipients(companyId) {
  return resolveCompanyLeadershipRecipients(companyId);
}

async function resolveSuperAdminRecipients() {
  const prisma = getSharedPrismaClient();

  const [directUsers, memberships] = await Promise.all([
    safeQuery(() =>
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: SUPER_ADMIN_ROLES }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true
        }
      })
    ),
    safeQuery(() =>
      prisma.userCompany.findMany({
        where: {
          isActive: true,
          role: 'SUPER_ADMIN'
        },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      })
    )
  ]);

  const recipients = [];

  for (const user of directUsers || []) {
    recipients.push({
      phone: user.phone,
      name: buildDisplayName(user),
      email: user.email,
      role: user.role || 'SUPER_ADMIN'
    });
  }

  for (const membership of memberships || []) {
    if (!membership?.user?.isActive) continue;
    recipients.push({
      phone: membership.user.phone,
      name: buildDisplayName(membership.user),
      email: membership.user.email,
      role: membership.user.role || 'SUPER_ADMIN'
    });
  }

  return dedupeRecipients(recipients);
}

async function resolveRecipientSettingsCompanyId(companyId, audience = 'company-admins') {
  if (audience === 'super-admins') {
    return (await resolvePlatformSenderCompanyId()) || companyId;
  }

  return companyId;
}

async function loadManualAdminRecipients(companyId, audience = 'company-admins') {
  const recipientSettingsCompanyId = await resolveRecipientSettingsCompanyId(companyId, audience);
  if (!recipientSettingsCompanyId) {
    return {
      recipientSettingsCompanyId: null,
      recipientSettings: null,
      manualRecipients: [],
      routingMode: ADMIN_RECIPIENT_ROUTING_MODES.AUTO
    };
  }

  const recipientSettings = await ensureNotificationSettings(recipientSettingsCompanyId);
  return {
    recipientSettingsCompanyId,
    recipientSettings,
    manualRecipients: parseConfiguredRecipientPhones(
      recipientSettings?.companyLifecycleAdminPhones,
      audience === 'super-admins' ? 'SUPER_ADMIN' : 'ADMIN'
    ),
    routingMode: normalizeAdminRoutingMode(
      recipientSettings?.companyLifecycleAdminRoutingMode
    )
  };
}

async function resolveAudienceRecipients(companyId, audience = 'company-admins') {
  const manualConfig = await loadManualAdminRecipients(companyId, audience);

  if (audience === 'super-admins') {
    return {
      company: await resolveCompanyContext(companyId),
      recipients: mergeRecipientsByRoutingMode({
        autoRecipients: await resolveSuperAdminRecipients(),
        manualRecipients: manualConfig.manualRecipients,
        routingMode: manualConfig.routingMode
      }),
      recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
    };
  }

  if (audience === 'company-owners') {
    return resolveCompanyOwnerRecipients(companyId);
  }

  const companyResult = await resolveCompanyLeadershipRecipients(companyId);
  let autoRecipients = companyResult.recipients;

  if (audience === 'company-or-super-admins' && autoRecipients.length === 0) {
    autoRecipients = await resolveSuperAdminRecipients();
  }

  const recipients = mergeRecipientsByRoutingMode({
    autoRecipients,
    manualRecipients: manualConfig.manualRecipients,
    routingMode: manualConfig.routingMode
  });

  if (audience === 'company-or-super-admins' && recipients.length === 0) {
    return {
      company: companyResult.company,
      recipients: await resolveSuperAdminRecipients(),
      recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
    };
  }

  return {
    company: companyResult.company,
    recipients,
    recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
  };
}

async function hasConnectedSessionForCompany(companyId) {
  if (!companyId) return false;

  const memorySessions = (WhatsAppManager.getCompanySessions(companyId) || []).filter(
    (session) => session.status === 'connected'
  );

  if (memorySessions.length > 0) {
    return true;
  }

  const connectedSession = await safeQuery(() =>
    getSharedPrismaClient().whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED'
      },
      select: { id: true }
    })
  );

  return Boolean(connectedSession?.id);
}

async function resolvePlatformSenderCompanyId() {
  const now = Date.now();
  if (platformSenderCompanyCache.expiresAt > now) {
    return platformSenderCompanyCache.value;
  }

  const prisma = getSharedPrismaClient();
  const envCompanyId =
    process.env.WHATSAPP_PLATFORM_SENDER_COMPANY_ID ||
    process.env.PLATFORM_COMPANY_ID ||
    '';
  const slugCandidates = [
    process.env.WHATSAPP_PLATFORM_SENDER_COMPANY_SLUG,
    process.env.PLATFORM_COMPANY_SLUG,
    'maxp'
  ].filter(Boolean);

  let company = null;

  if (envCompanyId) {
    company = await safeQuery(() =>
      prisma.company.findFirst({
        where: {
          id: envCompanyId,
          isActive: true
        },
        select: { id: true }
      })
    );
  }

  if (!company && slugCandidates.length > 0) {
    company = await safeQuery(() =>
      prisma.company.findFirst({
        where: {
          slug: { in: slugCandidates },
          isActive: true
        },
        select: { id: true }
      })
    );
  }

  platformSenderCompanyCache = {
    value: company?.id || null,
    expiresAt: now + 5 * 60 * 1000
  };

  return platformSenderCompanyCache.value;
}

async function resolveDeliveryCompanyId(targetCompanyId, strategy = 'company') {
  if (!targetCompanyId || strategy === 'company') {
    return targetCompanyId;
  }

  const platformCompanyId = await resolvePlatformSenderCompanyId();
  if (!platformCompanyId) {
    return targetCompanyId;
  }

  if (strategy === 'platform-only') {
    return platformCompanyId;
  }

  const targetHasConnectedSession = await hasConnectedSessionForCompany(targetCompanyId);
  return targetHasConnectedSession ? targetCompanyId : platformCompanyId;
}

async function fanOutNotification(recipients, buildOptions) {
  if (!recipients.length) {
    return { success: false, reason: 'no_recipients', results: [] };
  }

  const results = await Promise.allSettled(
    recipients.map((recipient) => sendNotification(buildOptions(recipient)))
  );

  return summarizeNotificationResults(results, recipients);
}

function buildSignupAdminAlertContent(variables) {
  return `تنبيه تسجيل جديد 🔔

الاسم: {customerName}
الهاتف: {customerPhone}
البريد: {email}
نوع التسجيل: {signupTypeLabel}
الشركة: {companyName}
التاريخ: {createdAt}`;
}

function buildNewsletterAdminAlertContent() {
  return `اشتراك جديد في النشرة 💌

الاسم: {customerName}
الهاتف: {customerPhone}
البريد: {email}
الشركة: {companyName}
المصدر: {sourceLabel}
التاريخ: {subscribedAt}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 دوال الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

// تتبع الدوران (Round Robin) للجلسات لكل شركة لـ موازنة الحمل (Load Balancing)

// موازنة الجلسات مستخرجة (sessionBalancer.js — §5.1)
const { getOrAssignSession, ensureRuntimeSessionConnected, findAlternativeBaileysSession, isMetaWindowError } = require('./sessionBalancer');
const { isOrderCategory, getPersistedNotificationEventType, getPersistedNotificationCategory, getPersistedNotificationRecipientType } = require('./notificationTypes');
const { buildMetaBodyParams } = require('../../utils/metaTemplateVariables');

const settingsInitializationInFlight = new Map();

async function ensureNotificationSettings(companyId) {
  const prisma = getSharedPrismaClient();

  const existingSettings = await safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  }));

  if (existingSettings) {
    return existingSettings;
  }

  let pendingInitialization = settingsInitializationInFlight.get(companyId);

  if (!pendingInitialization) {
    console.log(`[WHATSAPP-DEBUG] Settings not found for company ${companyId}. Auto-creating default settings...`);

    pendingInitialization = (async () => {
      const currentSettings = await safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
        where: { companyId }
      }));

      if (currentSettings) {
        return currentSettings;
      }

      try {
        return await safeQuery(() => prisma.whatsAppNotificationSettings.create({
          data: {
            companyId,
            isEnabled: true,
            hrNotificationsEnabled: true,
            attendanceConfirmedEnabled: true,
            attendanceReminderEnabled: true,
            warningNotificationEnabled: true,
            payrollEnabled: true,
            leaveApprovalEnabled: true,
            permissionApprovalEnabled: true
          }
        }));
      } catch (e) {
        console.error(`❌ [WHATSAPP-DEBUG] Error auto-creating settings:`, e.message);
        return safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
          where: { companyId }
        }));
      }
    })().finally(() => {
      settingsInitializationInFlight.delete(companyId);
    });

    settingsInitializationInFlight.set(companyId, pendingInitialization);
  } else {
    console.log(`⏳ [WHATSAPP-DEBUG] Awaiting in-flight settings initialization for company ${companyId}`);
  }

  return pendingInitialization;
}

/**
 * إرسال إشعار
 */
async function sendNotification(options) {
  const {
    companyId,
    deliveryCompanyId = companyId,
    recipientPhone,
    recipientName,
    recipientType = 'CUSTOMER',
    category,
    eventType,
    variables = {},
    orderId,
    customerId,
    productId,
    employeeId,
    cartId,
    priority = 5,
    scheduleAt = null,
    buttons = null,
    fallbackEventType = null,
    // 🎁 دعم إشعارات العملاء: إرسال قالب محدد + فرض قناة (BAILEYS/META_CLOUD/AUTO)
    preferredTemplateId = null,
    channel = null
  } = options;

  const prisma = getSharedPrismaClient();

  // Ensure orderId is in variables for variable replacement in buttons and content
  if (orderId && !variables.orderId) {
    variables.orderId = orderId;
  }

  try {
    // 1. جلب إعدادات الإشعارات
    const settings = await ensureNotificationSettings(companyId);
    const persistedEventType = getPersistedNotificationEventType(eventType);
    const persistedCategory = getPersistedNotificationCategory(category, eventType);
    const persistedRecipientType =
      getPersistedNotificationRecipientType(recipientType);

    // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): multi-tenant brand resolution
    // (الاسم + النطاق من DB مع cache، لا هاردكود شركة محددة)
    const { getCompanyBranding } = require('../../utils/companyBranding');
    const branding = await getCompanyBranding(companyId);

    console.log(`[WHATSAPP-DEBUG-sendNotification] Settings check:`, {
      hasSettings: !!settings,
      isEnabled: settings?.isEnabled
    });

    const eventSettingState = isEventEnabledForSettings(settings, eventType);
    if (!eventSettingState.enabled) {
      console.log(
        `⚠️ [WHATSAPP-DEBUG] Notification for ${eventType} blocked. reason=${eventSettingState.reason} setting=${eventSettingState.settingKey || 'n/a'}`
      );
      return { success: false, reason: eventSettingState.reason };
    }


    // 2. التحقق من الجلسة (مع موازنة الحمل والـ Sticky Session)
    let sessionId = null;
    let senderSettings = settings;

    if (deliveryCompanyId && deliveryCompanyId !== companyId) {
      senderSettings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
        where: { companyId: deliveryCompanyId }
      }));
    }

    // جلب جميع الجلسات المتصلة لهذه الشركة من الذاكرة
    const connectedSessions = (WhatsAppManager.getCompanySessions(deliveryCompanyId) || [])
      .filter(s => s.status === 'connected');

    sessionId = await getOrAssignSession({
      companyId: deliveryCompanyId,
      customerId,
      recipientPhone,
      connectedSessions,
      settings: senderSettings
    });

    if (!sessionId) {
      // محاولة أخيرة: البحث عن أي جلسة متصلة في DB (fallback قديم)
      const connected = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findFirst({
        where: {
          companyId: deliveryCompanyId,
          status: 'CONNECTED'
        },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      }));

      if (connected?.id) {
        sessionId = connected.id;
        console.log(`ℹ️ [WHATSAPP-DEBUG] Used DB fallback session: ${sessionId}`);
      }
    }

    if (!sessionId) {
      console.log(`⚠️ [WHATSAPP-DEBUG] No session available for company ${companyId}`);
      return { success: false, reason: 'no_session' };
    }

    // 🆕 تحديد نوع الجلسة (META_CLOUD vs BAILEYS) من قاعدة البيانات.
    // جلسات META_CLOUD لا تُحمّل في ذاكرة Baileys (activeSessions)، لذلك يجب
    // معاملتها كجلسة "connected" بناءً على حالة DB فقط.
    let sessionProvider = 'BAILEYS';
    const dbSessionForSend = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findUnique({
      where: { id: sessionId },
      select: { provider: true, status: true }
    }));
    if (dbSessionForSend?.provider) sessionProvider = dbSessionForSend.provider;

    let session = WhatsAppManager.getSession(sessionId);
    console.log(`[WHATSAPP-DEBUG] Session status from manager memory:`, session ? session.status : 'null', `| provider: ${sessionProvider}`);

    // 🆕 جلسات Meta Cloud API تُعتبر متصلة إذا كانت CONNECTED في DB (لا socket في الذاكرة)
    if (sessionProvider === 'META_CLOUD' && dbSessionForSend?.status === 'CONNECTED') {
      session = { status: 'connected', provider: 'META_CLOUD', sessionId };
      console.log(`☁️ [WHATSAPP-DEBUG] META_CLOUD session ${sessionId} treated as connected (DB status=CONNECTED)`);
    } else if (!session || session.status !== 'connected') {
      // 🆕 JIT Initialization: إذا لم تكن الجلسة في الذاكرة ولكنها متصلة في DB، قم بتنشيطها
      session = await ensureRuntimeSessionConnected(sessionId, deliveryCompanyId);

      if (!session || session.status !== 'connected') {
        console.log(`⚠️ [WHATSAPP-DEBUG] Session not connected: ${sessionId}`);

        // Try one more fallback: pick any CONNECTED session from DB and see if runtime is connected
        const connected = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findFirst({
          where: {
            companyId: deliveryCompanyId,
            status: 'CONNECTED',
            id: { not: sessionId }
          },
          select: { id: true, provider: true },
          orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
        }));

        if (connected?.id) {
          const fallbackId = connected.id;
          if (connected.provider === 'META_CLOUD') {
            sessionId = fallbackId;
            sessionProvider = 'META_CLOUD';
            session = { status: 'connected', provider: 'META_CLOUD', sessionId };
            console.log(`☁️ Using fallback META_CLOUD session for company ${deliveryCompanyId}: ${sessionId}`);
          } else {
            const fallbackSession = WhatsAppManager.getSession(fallbackId);
            if (fallbackSession && fallbackSession.status === 'connected') {
              sessionId = fallbackId;
              sessionProvider = 'BAILEYS';
              session = fallbackSession;
              console.log(`ℹ️ Using fallback runtime-connected session for company ${deliveryCompanyId}: ${sessionId}`);
            }
          }
        }
      }
    }

    if (!session || session.status !== 'connected') {
      return { success: false, reason: 'session_not_connected' };
    }

    // 3. التحقق من ساعات الهدوء
    // استثناء: الطلبات الحرجة ورسائل onboarding / الاشتراك الخاصة بالشركات تُرسل فوراً.
    const bypassQuietHours =
      eventType === 'ORDER_CREATED' || COMPANY_LIFECYCLE_EVENT_TYPES.has(eventType);

    if (isQuietHours(settings) && !scheduleAt && !bypassQuietHours) {
      const nextAllowedSendAt = new Date();
      const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
      nextAllowedSendAt.setHours(endHour, endMin, 0, 0);

      // إذا كنا بعد وقت نهاية الهدوء لليوم الحالي، نؤجل لليوم التالي.
      if (nextAllowedSendAt <= new Date()) {
        nextAllowedSendAt.setDate(nextAllowedSendAt.getDate() + 1);
      }

      return scheduleNotification({
        ...options,
        scheduleAt: nextAllowedSendAt
      });
    }

    // 4. جلب القالب (ما لم يتم توفير محتوى مباشر)
    let template = null;
    let templateId = null;

    if (options.contentOverride) {
      console.log(`[WHATSAPP-NOTIFY] Using contentOverride for journey notification`);
    } else {
      // 🎁 إشعارات العملاء: عند تمرير قالب محدد نستخدمه مباشرة (وليس بحثاً بالحدث)
      if (preferredTemplateId) {
        template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
          where: { id: preferredTemplateId, companyId, isActive: true }
        }));
        if (!template) return { success: false, reason: 'template_not_found' };
        templateId = template.id;
      } else {
        // محاولة العثور على القالب برمز الحالة مباشرة أولاً
        // (مثل CONFIRMED بدل ORDER_CONFIRMED - القوالب المنشأة من صفحة حالات الطلبات)
        if (fallbackEventType && fallbackEventType !== eventType) {
          template = await safeQuery(() => findNotificationTemplateForEvent(
            companyId,
            fallbackEventType,
            sessionProvider,
            getSharedPrismaClient()
          ));
        }

        if (!template) {
          template = await safeQuery(() => findNotificationTemplateForEvent(
            companyId,
            eventType,
            sessionProvider,
            getSharedPrismaClient()
          ));
        }

        // استخدام القالب الافتراضي إذا لم يوجد
        // ملاحظة: أحداث الطلبات لا تستخدم القوالب المثبتة في الكود —
        // مصدر قوالب الطلبات الوحيد هو صفحة /orders/status-templates (جدول DB).
        const isOrderEvent = isOrderCategory(category, eventType);
        if (!template && !isOrderEvent && DEFAULT_TEMPLATES[eventType]) {
          const defaultTemplate = DEFAULT_TEMPLATES[eventType];
          template = {
            id: null,
            content: defaultTemplate.content,
            hasButtons: defaultTemplate.hasButtons || false,
            buttons: defaultTemplate.buttons || null,
            hasList: false
          };
        }

        // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.3): auto-seed دفاعي —
        // شركة جديدة لم تفتح صفحة /orders/status-templates بعد كانت تفشل بصمت
        // بـ no_template. نضمن قالباً (صف DB قابلاً للتعديل من الصفحة) ثم نعيد البحث.
        if (!template && isOrderEvent) {
          try {
            const { ensureOrderTemplate } = require('../orderTemplateSeeding');
            template = await ensureOrderTemplate({
              companyId,
              eventType,
              fallbackEventType,
              prisma: getSharedPrismaClient(),
            });
          } catch (seedErr) {
            console.error('⚠️ [WHATSAPP-ORDER] Auto-seed failed:', seedErr.message);
          }
        }

        if (!template) {
          if (isOrderEvent) {
            // لا نرسل نصاً حراً لحالات الطلبات — إن لم يوجد قالب في الداتابيز
            // (أُنشئ من صفحة /orders/status-templates) نتوقف ونُسجّل تحذيراً واضحاً.
            console.error(
              `⚠️ [WHATSAPP-ORDER] لا يوجد قالب طلب مُعدّ في الداتابيز للحدث "${eventType}" ` +
              `(fallback=${fallbackEventType || 'none'}, category=${category}). ` +
              `لم يتم الإرسال. أنشئ القالب من صفحة /orders/status-templates.`
            );
            return { success: false, reason: 'no_template' };
          }
          return { success: false, reason: 'no_template' };
        }
        templateId = template.id || null;
      }
    }

    const safeTemplate = template || {
      id: null,
      content: '',
      hasButtons: false,
      buttons: null,
      hasList: false,
      listData: null,
      footer: null
    };

    // 🎁 فرض القناة المطلوبة (من جدول إشعارات العملاء)
    if (channel === 'BAILEYS') {
      // إرسال نص حر دائماً — نجرد ربط الميتا حتى لا يدخل مسار القالب المعتمد
      safeTemplate.metaTemplateName = null;
      safeTemplate.metaTemplateStatus = null;
    } else if (channel === 'META_CLOUD') {
      const metaName = safeTemplate?.metaTemplateName;
      const metaStatus = String(safeTemplate?.metaTemplateStatus || '').toUpperCase();
      if (!metaName || metaStatus !== 'APPROVED') {
        console.warn(`⚠️ [WHATSAPP] Channel=META_CLOUD لكن قالب "${eventType}" غير مربوط/معتمد — تم التخطي.`);
        return { success: false, reason: 'meta_template_not_ready' };
      }
    }

    // 5. تجهيز المحتوى
    const rawContent = options.contentOverride || safeTemplate.content || '';
    const content = replaceVariables(rawContent, {
      ...variables,
      customerName: variables.customerName || recipientName || 'عميلنا العزيز',
      customerPhone: variables.customerPhone || recipientPhone || '',
      orderNumber: variables.orderNumber || '',
      orderDate: variables.orderDate || new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      orderItems: variables.orderItems || '',
      subtotal: variables.subtotal || '0',
      shipping: variables.shipping || '0',
      total: variables.total || '0',
      currency: variables.currency || settings.currency || 'EGP',
      trackingLink: variables.trackingLink || (variables.orderNumber ? `https://${branding.domain}/track/${variables.orderNumber}` : ''),
      trackingNumber: variables.trackingNumber || '',
      estimatedDays: variables.estimatedDays || '3-5',
      employeeName: variables.employeeName || recipientName || 'الموظف العزيز'
    });

    console.log(`[WHATSAPP-DEBUG] Content after variable replacement:`, content?.substring(0, 50));

    // 6. تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(recipientPhone);
    console.log(`[WHATSAPP-DEBUG] Formatted phone: ${formattedPhone} (original: ${recipientPhone})`);

    if (!formattedPhone) {
      console.log(`⚠️ [WHATSAPP-DEBUG] Invalid phone number: ${recipientPhone}`);
      return { success: false, reason: 'invalid_phone' };
    }

    // 7. إنشاء سجل الإشعار
    let notificationLog;
    try {
      notificationLog = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.create({
        data: {
          companyId,
          templateId: templateId || null,
          sessionId,
          recipientPhone: formattedPhone,
          recipientName,
          recipientType: persistedRecipientType,
          category: persistedCategory,
          eventType: persistedEventType,
          content,
          orderId,
          customerId,
          productId,
          employeeId,
          cartId,
          status: 'PENDING'
        }
      }));
    } catch (enumError) {
      // Workaround for enum issues - use raw SQL
      console.log(`[WHATSAPP-DEBUG] Enum error, trying raw SQL...`);
      const result = await prisma.$queryRaw`
        INSERT INTO "whatsapp_notification_logs" (
          id, "companyId", "templateId", "sessionId", "recipientPhone", "recipientName",
          "recipientType", category, "eventType", content, "orderId", "customerId",
          status, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${companyId}, ${templateId || null}, ${sessionId},
          ${formattedPhone}, ${recipientName},
          CAST(${persistedRecipientType} AS "whatsapp_notification_logs_recipientType"),
          CAST(${persistedCategory} AS "whatsapp_notification_logs_category"),
          CAST(${persistedEventType} AS "whatsapp_notification_logs_eventType"), ${content},
          ${orderId}, ${customerId}, 'PENDING', NOW(), NOW()
        ) RETURNING *;
      `;
      notificationLog = result[0];
      console.log(`[WHATSAPP-DEBUG] Created log via raw SQL: ${notificationLog.id}`);
    }

    // 8. إرسال الرسالة
    console.log(`[WHATSAPP-DEBUG] About to send message via session ${sessionId} to ${formattedPhone}`);

    try {
      const jid = `${formattedPhone}@s.whatsapp.net`;

      let result;
      let usedMessageType = 'TEXT'; // TEMPLATE | BUTTONS | TEXT

      // 🚨 PRODUCTION-FIX: منع مسار النص الحر (BUTTONS/TEXT) عبر META_CLOUD
      // لما كان فيه قالب معتمد APPROVED متاح وفشل. خارج نافذة 24 ساعة،
      // free-form (interactive/text) مرفوض من ميتا حتماً — النزول له = فشل مضمون
      // يكتب failureReason مضلل (131047) بدل السبب الحقيقي لفشل القالب.
      let blockFreeTextMetaFallback = false;
      let lastMetaTemplateError = null;

      // ☁️ [META-CLOUD] إرسال عبر قالب ميتا المعتمد (Approved Template) بدلاً من free text
      // ميتا Cloud API ترفض الرسائل النصية الحرة خارج نافذة 24 ساعة، لذلك نستخدم
      // القالب المعتمد (metaTemplateName مع APPROVED) عندما تكون الجلسة META_CLOUD.
      const metaTemplateName = safeTemplate?.metaTemplateName || null;
      const metaTemplateStatus = safeTemplate?.metaTemplateStatus || null;
      const canSendViaMetaTemplate =
        sessionProvider === 'META_CLOUD' &&
        metaTemplateName &&
        String(metaTemplateStatus).toUpperCase() === 'APPROVED';

      if (canSendViaMetaTemplate) {
        try {
          console.log(`☁️ [META-CLOUD] Sending via approved Meta template "${metaTemplateName}" (status=${metaTemplateStatus}) for event ${eventType}`);

          // بناء الـ components من ترتيب المتغيرات المخزّن في القالب ({position, name}).
          // 🆕 buildMetaBodyParams يوحّد المسارين (variables JSON + fallback من نص القالب)
          // بنفس منطق mapVariablesByOrder المستخدم وقت الربط — يمنع رسايل بمتغيرات مغلوطة.
          const variablesOrder = safeTemplate?.variables ? (() => {
            try { const parsed = JSON.parse(safeTemplate.variables); return Array.isArray(parsed) ? parsed : null; } catch { return null; }
          })() : null;
          const bodyParams = buildMetaBodyParams(variablesOrder, safeTemplate?.content, variables);

          const components = [{ type: 'BODY', parameters: bodyParams }];

          result = await WhatsAppMessageHandler.sendTemplateMessage(sessionId, formattedPhone, metaTemplateName, {
            name: metaTemplateName,
            language: safeTemplate?.metaTemplateLanguage || 'ar',
            components
          }, {
            templateBody: content,
            senderId: null
          });

          console.log(`☁️ [META-CLOUD] Template message result:`, result);
          if (result) usedMessageType = 'TEMPLATE';
        } catch (metaError) {
          // إذا فشل الإرسال عبر القالب المعتمد، نسجّل الخطأ.
          console.error(`❌ [META-CLOUD] Failed to send via approved template "${metaTemplateName}":`, metaError?.message || metaError);
          lastMetaTemplateError = metaError;

          // 🆕 PRODUCTION-FIX (notifications-fix-plan §5.3 — Meta → Baileys fallback):
          // لو الخطأ بسبب نافذة 24 ساعة أو قالب غير معتمد، دوّر على Baileys session
          // تانية في الشركة وابعت منها نص حر بدل فشل صامت. البتتم مرة واحدة (مفيش loop).
          const isWindowError = isMetaWindowError(metaError);

          if (isWindowError && sessionProvider === 'META_CLOUD') {
            console.log(`🔄 [FALLBACK] Meta rejected (24h window / template issue). Searching for a Baileys session...`);
            const baileysSession = await findAlternativeBaileysSession(companyId, sessionId);
            if (baileysSession) {
              console.log(`✅ [FALLBACK] Found Baileys session ${baileysSession.sessionId}. Retrying send as free-text.`);
              try {
                result = await WhatsAppMessageHandler.sendText(baileysSession.sessionId, jid, content);
                console.log(`✅ [FALLBACK] Sent via Baileys fallback.`);
                if (result) usedMessageType = 'TEXT';
              } catch (fallbackErr) {
                console.error(`❌ [FALLBACK] Baileys fallback also failed:`, fallbackErr.message);
                result = null;
              }
            } else {
              // 🚨 PRODUCTION-FIX: لا يوجد Baileys متصل.
              // لو كان القالب المعتمد متاحاً (canSendViaMetaTemplate)، ممنوع النزول
              // لـ BUTTONS/TEXT عبر نفس جلسة META_CLOUD — free-form مرفوض خارج
              // نافذة 24 ساعة وسيفشل حتماً بنفس الخطأ (131047) ويضلل الـ failureReason.
              // الأصح: نوقف هنا ونُسجّل فشل القالب الحقيقي.
              if (canSendViaMetaTemplate) {
                console.warn(`⚠️ [FALLBACK] No connected Baileys session for company ${companyId}. ` +
                  `Approved template "${metaTemplateName}" failed (${metaError?.code || metaError?.message}) ` +
                  `and free-text via META_CLOUD is impossible outside 24h window. Failing notification.`);
                blockFreeTextMetaFallback = true;
                result = null;
                metaError.code = metaError.code || (isWindowError ? 131047 : null);
                throw metaError;
              }
              console.warn(`⚠️ [FALLBACK] No connected Baileys session available for company ${companyId}. Notification will fail.`);
              result = null;
            }
          } else {
            console.error(`☁️ [META-CLOUD] Falling back to local send path for ${eventType}`);
            result = null;
          }
        }
        // إذا نجح الإرسال (result موجود) نتخطى مسار الإرسال العادي بالأسفل (شرط !result)
      }

      // 📋 معالجة الأزرار التفاعلية
      // الأولوية للأزرار من القالب إذا كانت موجودة، مع الحفاظ على الأيدي (IDs) الوظيفية إذا تم تمريرها من الكود
      let templateButtons = null;
      if (safeTemplate.hasButtons && safeTemplate.buttons) {
        try {
          templateButtons = typeof safeTemplate.buttons === 'string' ? JSON.parse(safeTemplate.buttons) : safeTemplate.buttons;
        } catch (e) {
          console.error('❌ Failed to parse template buttons:', e);
        }
      }

      const isOrderNotification = category === 'ORDER' || category === 'ORDERS' || eventType.startsWith('ORDER_');

      let finalButtons = buttons;

      if (templateButtons && templateButtons.length > 0) {
        if (buttons && buttons.length > 0) {
          // إذا تم تمرير أزرار من الكود (تحتوي على IDs وظيفية)
          // نستخدم نصوص القالب (Template Texts) للحفاظ على التخصيص
          finalButtons = buttons.map((btn, index) => {
            const tplBtn = templateButtons[index];
            return {
              id: replaceVariables(btn.id, variables),
              text: tplBtn && tplBtn.text ? replaceVariables(tplBtn.text, variables) : replaceVariables(btn.text, variables)
            };
          });
        } else if (isOrderNotification) {
          // أزرار القالب لحالات الطلبات: نبني ID وظيفي من حقل action
          finalButtons = templateButtons.map(btn => ({
            id: buildOrderStatusButtonId(btn, variables),
            text: replaceVariables(btn.text || btn.id, variables)
          }));
        } else {
          // إذا لم يتم تمرير أزرار من الكود، نستخدم أزرار القالب مباشرة
          finalButtons = templateButtons.map(btn => ({
            id: replaceVariables(btn.id, variables),
            text: replaceVariables(btn.text, variables)
          }));
        }
      } else if (buttons) {
        // إذا لم يوجد أزرار في القالب، نستخدم الأزرار الممررة من الكود
        finalButtons = buttons.map(btn => ({
          id: replaceVariables(btn.id, variables),
          text: replaceVariables(btn.text, variables)
        }));
      }

      // 🔥 ضمان وجود أزرار لإشعارات الطلبات إذا لم يتم توفيرها (Default Fallback)
      if ((!finalButtons || finalButtons.length === 0) && isOrderNotification) {
        console.log(`[WHATSAPP-DEBUG] Injecting default buttons for order notification: ${eventType}`);
        finalButtons = [
          { id: replaceVariables("confirm_order_{orderId}", variables), text: "تأكيد الأوردر" },
          { id: replaceVariables("delay_order_{orderId}", variables), text: "تأجيل التسليم" },
          { id: replaceVariables("cancel_order_{orderId}", variables), text: "إلغاء الأوردر" }
        ];
      }

      if (blockFreeTextMetaFallback) {
        // 🚨 PRODUCTION-FIX: القالب المعتمد APPROVED فشل ولا يوجد Baileys بديل.
        // ممنوع تجربة free-text عبر META_CLOUD خارج نافذة 24 ساعة — ميتا سترفض حتماً.
        // نرمي خطأ يحمل السبب الحقيقي لفشل القالب (بدل 131047 مضلل من buttons).
        throw new Error(
          `Approved Meta template failed and free-text is blocked outside 24h window` +
          (lastMetaTemplateError ? ` (${lastMetaTemplateError.code || ''} ${lastMetaTemplateError.message || ''})` : '')
        );
      }

      if (!result && finalButtons && finalButtons.length > 0) {
        try {
          // Get footer from default template if not in DB template (DB model lacks footer field currently)
          // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): اسم الشركة من DB بدل هاردكود
          const footerStr =
            safeTemplate.footer ||
            (!isOrderCategory(category, eventType) && DEFAULT_TEMPLATES[eventType]?.footer
              ? replaceVariables(DEFAULT_TEMPLATES[eventType].footer, variables)
              : branding.name);

          console.log(`🚀 [WHATSAPP-DEBUG] Triggering sendButtons with ${finalButtons.length} buttons and footer: ${footerStr}`);

          result = await WhatsAppMessageHandler.sendButtons(sessionId, jid, content, finalButtons, {
            footer: footerStr
          });
          if (result) usedMessageType = 'BUTTONS';
        } catch (error) {
          console.error(`❌ [WHATSAPP-DEBUG] Failed to send buttons, falling back to text:`, error);
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
          if (result) usedMessageType = 'TEXT';
        }
      } else if (!result && safeTemplate.hasList && safeTemplate.listData) {
        try {
          const listData = typeof safeTemplate.listData === 'string' ? JSON.parse(safeTemplate.listData) : safeTemplate.listData;
          console.log(`[WHATSAPP-DEBUG] Sending list message`);
          result = await WhatsAppMessageHandler.sendList(sessionId, jid, listData);
        } catch (parseError) {
          console.error(`❌ [WHATSAPP-DEBUG] Failed to parse listData, falling back to text:`, parseError);
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
        }
      } else if (!result) {
        console.log(`[WHATSAPP-DEBUG] Sending text message:`, content?.substring(0, 50));
        result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
        if (result) usedMessageType = 'TEXT';
      }

      console.log(`[WHATSAPP-DEBUG] Send result:`, result);

      // 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3 hardening):
      // لا نكتب SENT أبداً بدون نتيجة إرسال فعلية — لو Meta رفضت وfallback فشل
      // (result = null) نرمي خطأ لنمر عبر مسار FAILED بدل نجاح وهمي.
      if (!result) {
        throw new Error('Both Meta and Baileys send failed');
      }

      // تحديث السجل
      await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'SENT',
          messageType: usedMessageType || result?.messageType || 'TEXT',
          sentAt: new Date(),
          whatsappMessageId: result?.messageId || result?.key?.id || null
        }
      }));

      console.log(`✅ [WHATSAPP-DEBUG] Notification SENT successfully: ${eventType} to ${formattedPhone}`);

      // 9. إرسال عبر المنصة المحلية (SMS Parity)
      // نرسل الطلبات فقط إذا لم يكن هناك خيار لتعطيلها
      if ((category === 'ORDERS' || eventType === 'ORDER_CREATED') && process.env.ENABLE_LOCAL_WHATSAPP === 'true') {
        await sendViaLocalWhatsApp({
          phone: formattedPhone,
          companyId: companyId,
          message: content,
          orderNumber: variables.orderNumber,
          customerName: recipientName,
          variables: variables,
          eventType: eventType,
          buttons: finalButtons // ✅ Pass buttons to local bridge
        });
      }

      return { success: true, notificationId: notificationLog.id };

    } catch (sendError) {
      console.error(`❌ [WHATSAPP-DEBUG] Failed to send message:`, sendError.message);
      console.error(`❌ [WHATSAPP-DEBUG] Error stack:`, sendError.stack);

      // تحديث السجل بالخطأ
      await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: sendError.code ? `[${sendError.code}] ${sendError.message}` : sendError.message,
          errorCode: sendError.code ? String(sendError.code) : null,
        }
      }));

      // 🚨 PRODUCTION-FIX (notifications-fix-plan §4.1):
      // إعادة محاولة واحدة عبر الطابور للأخطاء العابرة (retryable=true من Meta Cloud).
      // يعتمد على §1.1 (الطابور مفعّل) + §4.1 (حل الجلسة مؤجّل للمعالجة).
      if (sendError?.retryable) {
        try {
          const scheduled = await scheduleNotification({
            companyId,
            deliveryCompanyId,
            recipientPhone,
            recipientName,
            recipientType,
            category,
            eventType,
            variables,
            orderId,
            customerId,
            productId,
            employeeId,
            cartId,
            contentOverride: options.contentOverride || null,
            scheduleAt: new Date(Date.now() + 5 * 60 * 1000),
            priority: Math.max(priority || 5, 8),
          });
          if (scheduled?.success) {
            console.log(`📅 [WHATSAPP-DEBUG] Retry scheduled via queue for ${eventType}: ${scheduled.queueId}`);
            return { success: false, reason: 'retry_scheduled', queueId: scheduled.queueId };
          }
        } catch (retryErr) {
          console.error('[WHATSAPP-DEBUG] Retry scheduling failed:', retryErr.message);
        }
      }

      return {
        success: false,
        reason: sendError.reason || 'send_failed',
        error: sendError.message,
        errorCode: sendError.code || null,
        retryable: sendError.retryable || false,
        errorDetails: sendError.details || null,
      };
    }

  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * إرسال رسالة عبر المنصة المحلية (SMS Parity)
 * Hits http://localhost:3000/whatsapp
 */
async function sendViaLocalWhatsApp(data) {
  try {
    const { phone, message, orderNumber, customerName, variables, eventType, companyId } = data;

    console.log(`🚀 [LOCAL-WHATSAPP] Sending to localhost:3000 for order ${orderNumber || 'N/A'}`);

    const response = await axios.post('http://localhost:3007/whatsapp', {
      phone,
      companyId,
      message,
      orderNumber,
      customerName,
      eventType,
      buttons: data.buttons || variables.buttons || [], // ✅ Pass buttons to local bridge
      variables: variables || {},
      metadata: {
        source: 'WhatsAppNotificationService',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: process.env.LOCAL_WHATSAPP_BRIDGE_SECRET
        ? { 'x-local-bridge-secret': process.env.LOCAL_WHATSAPP_BRIDGE_SECRET }
        : undefined,
      timeout: 5000 // 5 seconds timeout
    });

    console.log(`✅ [LOCAL-WHATSAPP] Response:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ [LOCAL-WHATSAPP] Error:`, error.message);
    // لا نوقف العملية الأصلية إذا فشل هذا الإرسال
    return { success: false, error: error.message };
  }
}

/**
 * جدولة إشعار
 */
async function scheduleNotification(options) {
  const prisma = getSharedPrismaClient();

  try {
    const {
      companyId,
      deliveryCompanyId = companyId,
      recipientPhone,
      recipientName,
      recipientType = 'CUSTOMER',
      category,
      eventType,
      variables = {},
      orderId,
      customerId,
      productId,
      employeeId,
      cartId,
      priority = 5,
      scheduleAt,
      contentOverride = null
    } = options;
    const persistedEventType = getPersistedNotificationEventType(eventType);
    const persistedCategory = getPersistedNotificationCategory(category, eventType);
    const persistedRecipientType =
      getPersistedNotificationRecipientType(recipientType);

    // جلب الإعدادات
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId }
    });

    let senderSettings = settings;
    if (deliveryCompanyId && deliveryCompanyId !== companyId) {
      senderSettings = await prisma.whatsAppNotificationSettings.findUnique({
        where: { companyId: deliveryCompanyId }
      });
    }

    // 2. التحقق من الجلسة (مع موازنة الحمل والـ Sticky Session)
    let sessionId = null;
    const connectedSessions = (WhatsAppManager.getCompanySessions(deliveryCompanyId) || [])
      .filter(s => s.status === 'connected');

    sessionId = await getOrAssignSession({
      companyId: deliveryCompanyId,
      customerId,
      recipientPhone,
      connectedSessions,
      settings: senderSettings
    });

    if (!sessionId) {
      const connected = await prisma.whatsAppSession.findFirst({
        where: { companyId: deliveryCompanyId, status: 'CONNECTED' },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      });
      if (connected?.id) sessionId = connected.id;
    }

    // 🚨 PRODUCTION-FIX (notifications-fix-plan §4.1):
    // لا تُسقط الإشعار عند غياب الجلسة الآن — صفّف sessionId='' واترك الحلّ للمعالجة
    // (processNotificationQueue يعيد حلّ الجلسة وقت الإرسال: META_CLOUD + إعادة اتصال لاحقة).
    // sessionId: '' قيمة صالحة لحقل non-null String.
    if (!sessionId) {
      console.log(`📅 [WHATSAPP-QUEUE] No session at schedule time for company ${deliveryCompanyId} — will defer session resolution to processing.`);
    }

    // 3. جلب القالب
    let template = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType, isActive: true }
    });

    const isOrderEvent = isOrderCategory(category, eventType);
    if (!template && !isOrderEvent && DEFAULT_TEMPLATES[eventType]) {
      template = { content: DEFAULT_TEMPLATES[eventType].content };
    }

    if (!template && !contentOverride) {
      if (isOrderEvent) {
        console.error(
          `⚠️ [WHATSAPP-ORDER] لا يوجد قالب طلب مُعدّ في الداتابيز للحدث "${eventType}" (مجدوَل). لم يتم الإرسال.`
        );
      }
      return { success: false, reason: 'no_template' };
    }

    // تجهيز المحتوى
    const content = replaceVariables(contentOverride || template?.content || '', {
      ...variables,
      customerName: variables.customerName || recipientName || 'عميلنا العزيز',
      employeeName: variables.employeeName || recipientName || 'الموظف العزيز'
    });

    // إضافة للطابور
    const queueItem = await prisma.whatsAppNotificationQueue.create({
      data: {
        companyId,
        templateId: template?.id || null,
        sessionId: sessionId || '',
        recipientPhone: formatPhoneNumber(recipientPhone),
        recipientName,
        recipientType: persistedRecipientType,
        category: persistedCategory,
        eventType: persistedEventType,
        content,
        orderId,
        customerId,
        productId,
        employeeId,
        cartId,
        scheduledAt: scheduleAt,
        priority,
        status: 'PENDING'
      }
    });

    console.log(`📅 Notification scheduled: ${eventType} at ${scheduleAt}`);
    return {
      success: true,
      queueId: queueItem.id,
      scheduledAt: queueItem.scheduledAt
    };

  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات الطلبات
// ═══════════════════════════════════════════════════════════════════════════════

function getOrderNotificationTracking(order) {
  const isGuestOrder = Boolean(order?.guestPhone || order?.guestName) && !order?.customerId;

  return {
    isGuestOrder,
    trackedOrderId: isGuestOrder ? null : (order?.id || null)
  };
}

/**
 * إرسال إشعار طلب جديد
 */
async function sendOrderCreatedNotification(order) {
  const prisma = getSharedPrismaClient();

  console.log(`[WHATSAPP-DEBUG] sendOrderCreatedNotification called for order: ${order.orderNumber}, company: ${order.companyId}`);

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  console.log(`[WHATSAPP-DEBUG] Settings found:`, settings ? 'YES' : 'NO');
  if (settings) {
    console.log(`[WHATSAPP-DEBUG] Settings details:`, {
      isEnabled: settings.isEnabled,
      orderNotificationsEnabled: settings.orderNotificationsEnabled,
      orderCreatedEnabled: settings.orderCreatedEnabled,
      defaultSessionId: settings.defaultSessionId
    });
  }

  if (!settings?.orderNotificationsEnabled || !settings?.orderCreatedEnabled) {
    console.log(`[WHATSAPP-DEBUG] FAILED: orderNotificationsEnabled=${settings?.orderNotificationsEnabled}, orderCreatedEnabled=${settings?.orderCreatedEnabled}`);
    return { success: false, reason: 'disabled' };
  }

  const phone = order.customerPhone || order.customer?.phone;
  console.log(`[WHATSAPP-DEBUG] Phone: ${phone}`);
  if (!phone) return { success: false, reason: 'no_phone' };

  // Format order items with color and size
  let orderItemsText = '';
  if (order.items && order.items.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    order.items.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  }

  // Build tracking link
  // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): استخدم getCompanyBranding —
  // النطاق من DB (customDomain → website → slug.platformDomain)، لا هاردكود.
  let trackingLink = '';
  try {
    const { getCompanyBranding } = require('../../utils/companyBranding');
    const branding = await getCompanyBranding(order.companyId);
    const baseUrl = `https://${branding.domain}`;

    trackingLink = `${baseUrl}/shop/track-order?orderNumber=${order.orderNumber}&phone=${encodeURIComponent(phone)}&companyId=${order.companyId}`;
  } catch (err) {
    console.error('Error building tracking link:', err);
  }

  console.log(`[WHATSAPP-DEBUG] Calling sendNotification...`);
  const { trackedOrderId } = getOrderNotificationTracking(order);

  // 🛡️ Duplicate guard: منع إرسال رسالة "طلب جديد" مرتين لنفس الطلب
  // خلال نافذة قصيرة (يحدث أحياناً عندما يُستدعى الإرسال من أكثر من مسار
  // عند إنشاء الطلب، مثل enhancedOrderService + route).
  // 🚨 PRODUCTION-FIX (notifications-fix-plan §3.1): وحّدت عبر isDuplicateNotification
  if (trackedOrderId) {
    const isDup = await isDuplicateNotification({
      companyId: order.companyId,
      orderId: trackedOrderId,
      eventType: 'ORDER_CREATED',
    });
    if (isDup) {
      console.log(`⚠️ [WHATSAPP] Duplicate ORDER_CREATED blocked for order ${order.orderNumber}`);
      return { success: false, reason: 'duplicate_blocked' };
    }
  }

  return sendNotification({
    companyId: order.companyId,
    recipientPhone: phone,
    recipientName: order.customerName || order.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ORDER',
    eventType: 'ORDER_CREATED',
    variables: {
      customerName: order.customerName || order.customer?.firstName || 'عميلنا العزيز',
      customerPhone: phone,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      orderItems: orderItemsText,
      shipping: (order.shipping || 0).toString(),
      total: (order.total || 0).toString(),
      currency: order.currency || 'EGP',
      trackingLink,
      orderId: order.id
    },
    orderId: trackedOrderId,
    customerId: order.customerId,
    priority: 1
  });
}

/**
 * إرسال إشعار تحديث حالة الطلب
 */
async function sendOrderStatusNotification(order, newStatus, oldStatus) {
  const prisma = getSharedPrismaClient();

  console.log(`[WHATSAPP-STATUS] ==== sendOrderStatusNotification called ====`);
  console.log(`[WHATSAPP-STATUS] Order: ${order?.orderNumber}, New Status: ${newStatus}, Old Status: ${oldStatus}`);
  console.log(`[WHATSAPP-STATUS] Company ID: ${order?.companyId}`);

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  console.log(`[WHATSAPP-STATUS] Settings found: ${!!settings}`);
  console.log(`[WHATSAPP-STATUS] orderNotificationsEnabled: ${settings?.orderNotificationsEnabled}`);

  if (!settings?.orderNotificationsEnabled) {
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: orderNotificationsEnabled is false`);
    return { success: false, reason: 'disabled' };
  }

  // 🛡️ حالات داخلية مش لازم تبعت notification للعميل (TRASH/DRAFT/DUPLICATE...) —
  // بيمنع Prisma enum error على eventType وبيوقف spam للعملاء.
  if (isNonNotifiableStatus(newStatus)) {
    console.log(`[WHATSAPP-STATUS] ⏭️ Skipping notification for internal status: ${newStatus}`);
    return { success: false, reason: "status_not_notifiable" };
  }

  // 🆕 تحديد نوع الإشعار بناءً على الحالة (دعم للحالات الديناميكية)
  let statusConfig = null;
  const statusEventMap = {
    'CONFIRMED': { event: 'ORDER_CONFIRMED', enabled: settings.orderConfirmedEnabled },
    'PROCESSING': { event: 'ORDER_PROCESSING', enabled: settings.orderProcessingEnabled },
    'SHIPPED': { event: 'ORDER_SHIPPED', enabled: settings.orderShippedEnabled },
    'OUT_FOR_DELIVERY': { event: 'ORDER_OUT_FOR_DELIVERY', enabled: settings.orderShippedEnabled },
    'DELIVERED': { event: 'ORDER_DELIVERED', enabled: settings.orderDeliveredEnabled },
    'CANCELLED': { event: 'ORDER_CANCELLED', enabled: settings.orderCancelledEnabled }
  };

  if (statusEventMap[newStatus]) {
    statusConfig = statusEventMap[newStatus];
  } else {
    // التحقق من الحالات المخصصة في قاعدة البيانات
    const dbStatus = await prisma.orderStatusConfig.findFirst({
      where: { companyId: order.companyId, code: newStatus, statusType: 'order', isActive: true }
    });

    if (dbStatus) {
      statusConfig = {
        event: dbStatus.code,
        enabled: dbStatus.notifyCustomer,
        isCustom: true,
        statusName: dbStatus.name
      };
    } else {
      // 🚀 [FALLBACK] If not in map or DB, allow the notification but let sendNotification decide
      // This supports the 82 system statuses that might not be in the config table yet.
      console.log(`[WHATSAPP-STATUS] ℹ️ Using dynamic fallback for status: ${newStatus}`);
      statusConfig = {
        event: newStatus,
        enabled: true, // Specific check will happen in sendNotification based on settings[settingKey]
        isFallback: true
      };
    }
  }

  console.log(`[WHATSAPP-STATUS] Status Config:`, JSON.stringify(statusConfig));

  if (!statusConfig) {
    // This part is technically unreachable now but kept for safety
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: No config for status ${newStatus}`);
    return { success: false, reason: 'status_notification_disabled' };
  }

  if (!statusConfig.enabled) {
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: ${newStatus} notification is disabled`);
    return { success: false, reason: 'status_notification_disabled' };
  }

  console.log(`[WHATSAPP-STATUS] ✅ Will send: ${statusConfig.event}`);

  const phone = order.customerPhone || order.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  // Format order items with color and size (Always include if available)
  let orderItemsText = '';
  if (order.items && order.items.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    order.items.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  }

  console.log(`[WHATSAPP-STATUS] Phone: ${phone}`);
  console.log(`[WHATSAPP-STATUS] About to call sendNotification with event: ${statusConfig.event}`);

  try {
    const { trackedOrderId } = getOrderNotificationTracking(order);
    const result = await sendNotification({
      companyId: order.companyId,
      recipientPhone: phone,
      recipientName: order.customerName || order.customer?.firstName,
      recipientType: 'CUSTOMER',
      category: 'ORDER',
      eventType: statusConfig.event,
      fallbackEventType: newStatus,
      variables: {
        customerName: order.customerName || order.customer?.firstName || 'عميلنا العزيز',
        customerPhone: phone,
        orderNumber: order.orderNumber,
        orderItems: orderItemsText,
        status: statusConfig.statusName || newStatus, // 🔥 Added status name for templates
        total: order.total?.toString(),
        currency: order.currency || 'EGP',
        trackingNumber: order.turboTrackingNumber || '',
        estimatedDays: '2-3',
        reason: ''
      },
      orderId: trackedOrderId,
      customerId: order.customerId,
      priority: 2
    });

    console.log(`[WHATSAPP-STATUS] Result:`, JSON.stringify(result));
    console.log(`[WHATSAPP-STATUS] ==== END ====`);
    return result;
  } catch (error) {
    console.error(`[WHATSAPP-STATUS] ❌ ERROR:`, error.message);
    console.error(`[WHATSAPP-STATUS] Stack:`, error.stack);
    console.log(`[WHATSAPP-STATUS] ==== END (with error) ====`);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * إرسال إشعار إنشاء طلب متوافق مع حالة الطلب الفعلية.
 * تُستخدم في مسارات إنشاء الطلب اليدوي (service + route) لتوحيد المنطق:
 * - بدون حالة / PENDING / SCHEDULED / حالات داخلية → قالب "طلب جديد" (ORDER_CREATED).
 * - أي حالة أخرى (CONFIRMED/PROCESSING/RETURNED/EXCHANGED/حالة مخصصة...) →
 *   قالب حالة الطلب عبر sendOrderStatusNotification (ORDER_CONFIRMED... إلخ)
 *   من صفحة /orders/status-templates — بدل إرسال "طلب جديد" دائماً.
 */
async function sendOrderCreationNotification(order) {
  const status = String(order?.status || '').trim().toUpperCase();

  const useNewOrderTemplate =
    !status ||
    status === 'PENDING' ||
    status === 'SCHEDULED' ||
    isNonNotifiableStatus(status);

  if (useNewOrderTemplate) {
    return sendOrderCreatedNotification(order);
  }

  console.log(`[WHATSAPP-ORDER] Order ${order?.orderNumber} created directly with status ${status} — using status template instead of ORDER_CREATED`);
  return sendOrderStatusNotification(order, status, 'PENDING');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒 إشعارات العربة المتروكة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار عربة متروكة
 */
async function sendAbandonedCartNotification(cart, reminderType = 'CART_ABANDONED_1H') {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: cart.companyId }
  });

  if (!settings?.abandonedCartEnabled) {
    return { success: false, reason: 'disabled' };
  }

  // التحقق من تفضيلات العميل
  if (cart.customerId) {
    const preference = await prisma.customerNotificationPreference.findUnique({
      where: { companyId_customerId: { companyId: cart.companyId, customerId: cart.customerId } }
    });

    if (preference && !preference.abandonedCart) {
      return { success: false, reason: 'customer_opted_out' };
    }
  }

  const phone = cart.customerPhone || cart.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType = reminderType;
  let variables = {
    itemCount: cart.items?.length?.toString() || '0',
    total: cart.total?.toString() || '0',
    currency: cart.currency || 'EGP'
  };

  // إضافة خصم للتذكير الأخير
  if (reminderType === 'CART_ABANDONED_WITH_DISCOUNT' && settings.abandonedCartDiscountEnabled) {
    const discountPercent = settings.abandonedCartDiscountPercent;
    const discountedTotal = cart.total * (1 - discountPercent / 100);

    variables = {
      ...variables,
      discount: discountPercent.toString(),
      discountedTotal: discountedTotal.toFixed(2),
      couponCode: `CART${Date.now().toString(36).toUpperCase()}`
    };
  }

  return sendNotification({
    companyId: cart.companyId,
    recipientPhone: phone,
    recipientName: cart.customerName || cart.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ABANDONED_CART',
    eventType,
    variables,
    customerId: cart.customerId,
    cartId: cart.id,
    priority: 3
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات المنتجات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار المنتج متوفر
 */
async function sendBackInStockNotification(product, customer) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: product.companyId }
  });

  if (!settings?.productNotificationsEnabled || !settings?.backInStockEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = customer.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: product.companyId,
    recipientPhone: phone,
    recipientName: customer.firstName,
    recipientType: 'CUSTOMER',
    category: 'PRODUCTS',
    eventType: 'BACK_IN_STOCK',
    variables: {
      productName: product.name,
      price: product.price?.toString(),
      currency: 'EGP'
    },
    productId: product.id,
    customerId: customer.id,
    priority: 4
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 إشعارات الموارد البشرية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال تذكير الحضور
 */
async function sendAttendanceReminderNotification(employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceReminderEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_REMINDER',
    variables: {
      startTime: '09:00'
    },
    employeeId: employee.id,
    priority: 3
  });
}

/**
 * إرسال إشعار التأخير بدون خصم (يظهر الخصم 0 إذا كان في حدود السماحية)
 */
async function sendAttendanceLateNotification(attendance, employee, companyId, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_LATE',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : ''),
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      lateMinutes: attendance.lateMinutes?.toString() || '0',
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال تأكيد الحضور
 */
async function sendAttendanceConfirmedNotification(attendance, employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '')
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار التأخير مع الخصم
 */
async function sendAttendanceLateWithDeductionNotification(attendance, employee, companyId, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_LATE_WITH_DEDUCTION',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : ''),
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      lateMinutes: attendance.lateMinutes?.toString() || '0',
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال تأكيد الانصراف
 */
async function sendCheckoutConfirmedNotification(attendance, employee, companyId, workHours = 0, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.checkoutConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'CHECKOUT_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      checkOutTime: attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.checkOut ? new Date(attendance.checkOut).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '')),
      workHours: workHours.toFixed(1),
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الموافقة على الإذن
 */
async function sendPermissionApprovalNotification(permissionRequest, approved = true) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: permissionRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.permissionApprovalEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = permissionRequest.user || permissionRequest.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: permissionRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: approved ? 'PERMISSION_APPROVED' : 'PERMISSION_REJECTED',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: permissionRequest.date ? new Date(permissionRequest.date).toLocaleDateString('ar-EG') : '',
      startTime: permissionRequest.startTime || '',
      endTime: permissionRequest.endTime || '',
      permissionType: permissionRequest.type === 'LATENESS' ? 'تأخير' : permissionRequest.type === 'EARLY_LEAVE' ? 'انصراف مبكر' : 'إذن خروج',
      reason: permissionRequest.rejectionReason || ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الموافقة على الإجازة
 */
async function sendLeaveApprovalNotification(leaveRequest, approved = true) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: leaveRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.leaveApprovalEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = leaveRequest.user || leaveRequest.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: leaveRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    variables: {
      startDate: leaveRequest.startDate?.toLocaleDateString('ar-EG'),
      endDate: leaveRequest.endDate?.toLocaleDateString('ar-EG'),
      leaveType: leaveRequest.type || 'إجازة',
      reason: leaveRequest.rejectionReason || ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الراتب
 */
async function sendPayrollNotification(payroll) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: payroll.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.payrollEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = payroll.user || payroll.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return sendNotification({
    companyId: payroll.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'PAYROLL_READY',
    variables: {
      month: monthNames[new Date(payroll.month).getMonth()],
      netSalary: payroll.netSalary?.toString(),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 1
  });
}


/**
 * إرسال إشعار حالة طلب العهدة
 */
async function sendAssetRequestNotification(request, employee, status) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: request.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType;
  let variables = {
    employeeName: employee.firstName || employee.name,
    assetType: request.assetType,
    assetName: request.assets?.name || request.assetName || ''
  };

  if (status === 'APPROVED') {
    eventType = 'ASSET_REQUEST_APPROVED';
  } else if (status === 'REJECTED') {
    eventType = 'ASSET_REQUEST_REJECTED';
    variables.reason = request.rejectionReason || 'غير محدد';
  } else if (status === 'FULFILLED') {
    eventType = 'ASSET_REQUEST_FULFILLED';
  }

  if (!eventType) return { success: false, reason: 'invalid_status' };

  return sendNotification({
    companyId: request.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType,
    variables,
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار عيد ميلاد
 */
async function sendBirthdayNotification(employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'BIRTHDAY_EMPLOYEE',
    variables: {
      employeeName: employee.firstName || employee.name
    },
    employeeId: employee.id,
    priority: 3
  });
}

/**
 * إرسال إشعار تحديث حالة الاستقالة
 */
async function sendResignationNotification(resignation, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: resignation.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  const statusMap = {
    'APPROVED': 'مقبولة ✅',
    'REJECTED': 'مرفوضة ❌',
    'PENDING': 'قيد المراجعة ⏳',
    'CANCELLED': 'ملغاة 🚫',
    'SETTLED': 'تمت التسوية المالية 💰'
  };

  return sendNotification({
    companyId: resignation.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'RESIGNATION_STATUS_UPDATE',
    variables: {
      employeeName: employee.firstName || employee.name,
      status: statusMap[resignation.status] || resignation.status,
      lastWorkingDay: resignation.lastWorkingDay ? new Date(resignation.lastWorkingDay).toLocaleDateString('ar-EG') : 'غير محدد'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الخصم اليدوي
 */
async function sendManualDeductionNotification(deduction, employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'MANUAL_DEDUCTION',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: deduction.date ? new Date(deduction.date).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG'),
      deductionType: deduction.type || 'خصم إداري',
      amount: deduction.amount?.toString() || '0',
      currency: 'EGP',
      reason: deduction.reason || 'غير محدد'
    },
    employeeId: employee.id,
    priority: 2
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 معالج الطابور
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * معالجة الإشعارات المجدولة
 */
let notificationQueueProcessing = false;

async function processNotificationQueue() {
  // 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1): حارس ضد التداخل —
  // لو الجولة السابقة ما زالت تعمل (تجاوزت 60 ثانية) نتخطى هذه الجولة.
  if (notificationQueueProcessing) {
    console.log('[WHATSAPP-QUEUE] Previous run still active, skipping.');
    return;
  }
  notificationQueueProcessing = true;

  const prisma = getSharedPrismaClient();

  // ✅ CRITICAL FIX: Check if prisma client is available
  if (!prisma) {
    console.error('❌ [WHATSAPP-QUEUE] Prisma client not available - database not initialized');
    return;
  }

  // ✅ CRITICAL FIX: Check if models are available
  if (!prisma.whatsAppNotificationQueue) {
    console.error('❌ [WHATSAPP-QUEUE] Prisma models not loaded - database connection not ready');
    console.error('   This usually means initializeSharedDatabase() has not completed yet');
    return;
  }

  try {
    // 🧹 Reaper: إعادة تعيين أي صفوف عالقة في PROCESSING منذ أكثر من 5 دقائق
    // (crash/OOM/deploy أثناء المعالجة يترك الصف في PROCESSING للأبد وإلا)
    const REAPER_STALE_MS = 5 * 60 * 1000;
    try {
      const reaped = await prisma.whatsAppNotificationQueue.updateMany({
        where: {
          status: 'PROCESSING',
          processedAt: { lt: new Date(Date.now() - REAPER_STALE_MS) }
        },
        data: { status: 'PENDING', processedAt: null }
      });
      if (reaped.count > 0) {
        console.log(`🧹 [WHATSAPP-QUEUE] Reaped ${reaped.count} stale PROCESSING rows -> PENDING`);
      }
    } catch (reaperErr) {
      console.error('❌ [WHATSAPP-QUEUE] Reaper failed:', reaperErr.message);
    }

    // جلب الإشعارات المستحقة
    const pendingNotifications = await prisma.whatsAppNotificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() }
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledAt: 'asc' }
      ],
      take: 200
    });

    console.log(`📬 Processing ${pendingNotifications.length} queued notifications`);

    for (const notification of pendingNotifications) {
      // 🚨 PRODUCTION-FIX (N1): claim ذري — updateMany بـ status: 'PENDING' في
      // الـ where (compare-and-set). لو صف آخر (worker/replica) استحوذ عليه قبلنا
      // count = 0 → نتخطى. بيضمن عدم المعالجة المزدوجة حتى لو فتحنا multi-replica.
      const claimed = await prisma.whatsAppNotificationQueue.updateMany({
        where: { id: notification.id, status: 'PENDING' },
        data: { status: 'PROCESSING', processedAt: new Date() }
      });
      if (claimed.count === 0) {
        console.log(`⏭️ [WHATSAPP-QUEUE] ${notification.id} already claimed by another worker — skipping`);
        continue;
      }

      try {
        // التحقق من الجلسة — أعد حلّها وقت المعالجة (إصلاح §4.1):
        // - META_CLOUD لا يملك socket في ذاكرة Baileys (getSession يرجع undefined).
        // - الجلسة قد تنفصل بين الجدولة والمعالجة.
        let sessionId = notification.sessionId;
        let session = sessionId ? WhatsAppManager.getSession(sessionId) : null;
        if (!session || session.status !== 'connected') {
          const connected = await prisma.whatsAppSession.findFirst({
            where: { companyId: notification.companyId, status: 'CONNECTED' },
            select: { id: true, provider: true },
            orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
          });
          if (connected?.id) {
            sessionId = connected.id;
            session = WhatsAppManager.getSession(sessionId);
            if (!session || session.status !== 'connected') {
              // META_CLOUD يُعتبر متصلاً إذا كان CONNECTED في DB (لا socket في الذاكرة)
              if (connected.provider === 'META_CLOUD') {
                session = { status: 'connected', provider: 'META_CLOUD', sessionId };
              }
            }
          }
        }
        if (!session || session.status !== 'connected') {
          throw new Error('Session not connected');
        }

        // إرسال الرسالة — WhatsAppMessageHandler يروّت META_CLOUD تلقائياً (getSessionProvider)
        const jid = `${notification.recipientPhone}@s.whatsapp.net`;

        let result;
        if (notification.buttons) {
          try {
            const buttons = typeof notification.buttons === 'string' ? JSON.parse(notification.buttons) : notification.buttons;
            result = await WhatsAppMessageHandler.sendButtons(sessionId, jid, notification.content, buttons);
          } catch (parseErr) {
            console.error('❌ [WHATSAPP-QUEUE] Failed to parse buttons:', parseErr);
            result = await WhatsAppMessageHandler.sendText(sessionId, jid, notification.content);
          }
        } else if (notification.listData) {
          try {
            const listData = typeof notification.listData === 'string' ? JSON.parse(notification.listData) : notification.listData;
            result = await WhatsAppMessageHandler.sendList(sessionId, jid, listData);
          } catch (parseErr) {
            console.error('❌ [WHATSAPP-QUEUE] Failed to parse listData:', parseErr);
            result = await WhatsAppMessageHandler.sendText(sessionId, jid, notification.content);
          }
        } else {
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, notification.content);
        }

        // إنشاء سجل
        await prisma.whatsAppNotificationLog.create({
          data: {
            companyId: notification.companyId,
            templateId: notification.templateId,
            sessionId,
            recipientPhone: notification.recipientPhone,
            recipientName: notification.recipientName,
            recipientType: notification.recipientType,
            category: notification.category,
            eventType: getPersistedNotificationEventType(notification.eventType),
            content: notification.content,
            orderId: notification.orderId,
            customerId: notification.customerId,
            productId: notification.productId,
            employeeId: notification.employeeId,
            cartId: notification.cartId,
            status: 'SENT',
            sentAt: new Date(),
            whatsappMessageId: result?.messageId || result?.key?.id || null
          }
        });

        // تحديث الطابور
        // 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1-pre):
        // 'COMPLETED' ليست قيمة في WhatsAppNotificationQueueStatus enum
        // (PENDING/PROCESSING/SENT/FAILED/CANCELLED). استخدم 'SENT' لتطابق
        // دلالة الـ log row (status: 'SENT') ولتفادي enum error → retry → إرسال مكرر.
        await prisma.whatsAppNotificationQueue.update({
          where: { id: notification.id },
          data: { status: 'SENT', processedAt: new Date() }
        });

        console.log(`✅ Queued notification sent: ${notification.eventType}`);
        await queueSendPacingDelay(notification, null);

      } catch (error) {
        // زيادة عداد المحاولات
        const newRetryCount = notification.retryCount + 1;

        if (newRetryCount >= notification.maxRetries) {
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: { status: 'FAILED', retryCount: newRetryCount }
          });
        } else {
          // إعادة الجدولة — backoff متفاوت حسب نوع الخطأ:
          // rate-limit ياخد 15 دقيقة (Meta يفرض النافذة)، والعابر ياخد دقيقتين.
          const retryDelayMs = isRateLimitedSendError(error) ? 15 * 60 * 1000 : 2 * 60 * 1000;
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'PENDING',
              retryCount: newRetryCount,
              scheduledAt: new Date(Date.now() + retryDelayMs)
            }
          });
        }

        console.error(`❌ Failed to process queued notification:`, error);
        await queueSendPacingDelay(notification, error);
      }
    }

  } catch (error) {
    console.error('❌ Error processing notification queue:', error);
  } finally {
    notificationQueueProcessing = false;
  }
}

function isRateLimitedSendError(error) {
  if (!error) return false;
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    error?.httpStatus === 429 ||
    code === '429' ||
    /rate.?over.?limit|rate.?limit|too_many_requests|rate_over_limits|130429|131048|80007/i.test(message + ' ' + code)
  );
}

async function queueSendPacingDelay(notification, error) {
  // نباعد 2s بين الرسائل الناجحة أو المتأثرة بـ rate-limit لتجنب حظر الرقم،
  // لكن الفشل الفوري (غير القابل لإعادة المحاولة) لا يدفع التأخير — لا نقطة
  // في الانتظار بعد فشل دائم (backlog يتفرّغ أسرع).
  if (error && !error?.retryable && !isRateLimitedSendError(error)) {
    return;
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الإشعارات
 */
async function getNotificationStats(companyId, dateRange = 30) {
  const prisma = getSharedPrismaClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const [total, sent, delivered, read, failed, byCategory, byEvent] = await Promise.all([
    // إجمالي
    prisma.whatsAppNotificationLog.count({
      where: { companyId, createdAt: { gte: startDate } }
    }),
    // المرسلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'SENT', createdAt: { gte: startDate } }
    }),
    // المستلمة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'DELIVERED', createdAt: { gte: startDate } }
    }),
    // المقروءة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'READ', createdAt: { gte: startDate } }
    }),
    // الفاشلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'FAILED', createdAt: { gte: startDate } }
    }),
    // حسب التصنيف
    prisma.whatsAppNotificationLog.groupBy({
      by: ['category'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    }),
    // حسب الحدث
    prisma.whatsAppNotificationLog.groupBy({
      by: ['eventType'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    })
  ]);

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : 0,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {}),
    byEvent: byEvent.reduce((acc, item) => {
      acc[item.eventType] = item._count;
      return acc;
    }, {})
  };
}

/**
 * إرسال إشعار كسب نقاط ولاء
 */
async function sendLoyaltyPointsNotification(companyId, customer, points, currentPoints, reason) {
  const phone = customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
    recipientType: 'CUSTOMER',
    category: 'MARKETING',
    eventType: 'LOYALTY_POINTS_AWARDED',
    variables: {
      customerName: customer.firstName || 'عميلنا العزيز',
      points: points.toString(),
      currentPoints: currentPoints.toLocaleString(),
      reason: reason || 'شكراً لتعاملك معنا'
    },
    customerId: customer.id,
    priority: 3
  });
}

/**
 * إرسال إشعار السلفة
 */
async function sendLoanNotification(loanRequest, employee, status) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: loanRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType;
  let variables = {
    employeeName: employee.firstName || employee.name,
    amount: loanRequest.amount?.toString(),
    currency: 'EGP',
    reason: loanRequest.reason || ''
  };

  if (status === 'CREATED') {
    eventType = 'LOAN_REQUEST_CREATED';
  } else if (status === 'APPROVED') {
    eventType = 'LOAN_APPROVED';
    variables.installmentsCount = loanRequest.installmentsCount?.toString() || '1';
  } else if (status === 'REJECTED') {
    eventType = 'LOAN_REJECTED';
    variables.reason = loanRequest.rejectedReason || 'غير محدد';
  }

  if (!eventType) return { success: false, reason: 'invalid_status' };

  return sendNotification({
    companyId: loanRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType,
    variables,
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار المكافأة
 */
async function sendRewardNotification(reward, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: reward.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: reward.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'BONUS_ISSUED',
    variables: {
      employeeName: employee.firstName || employee.name,
      amount: reward.calculatedValue?.toString(),
      currency: 'EGP',
      reason: reward.reason || reward.rewardName || 'مكافأة تميز',
      date: new Date().toLocaleDateString('ar-EG')
    },
    employeeId: employee.id,
    priority: 1
  });
}

/**
 * إرسال إشعار التحذير/الإنذار
 */
async function sendWarningNotification(warning, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: warning.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings.warningNotificationEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: warning.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'WARNING_ISSUED',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: warning.incidentDate ? new Date(warning.incidentDate).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG'),
      reason: warning.title || warning.description || 'مخالفة إدارية',
      warningType: warning.severity === 'major' ? 'سلوك جسيم' : warning.severity === 'critical' ? 'خطير' : 'تنبيه'
    },
    employeeId: employee.id,
    priority: 1
  });
}

async function sendNewSignupWelcomeNotification({
  companyId,
  recipientPhone,
  recipientName,
  email = '',
  customerId = null,
  signupType = 'platform_signup',
  companyName = '',
  deliveryStrategy = 'company'
}) {
  if (!recipientPhone) {
    return { success: false, reason: 'no_phone' };
  }

  const company = companyName ? null : await resolveCompanyContext(companyId);
  const resolvedCompanyName = companyName || company?.name || 'المنصة';
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  return sendNotification({
    companyId,
    deliveryCompanyId,
    recipientPhone,
    recipientName: recipientName || 'عميل جديد',
    recipientType: 'CUSTOMER',
    category: 'CUSTOMER',
    eventType: 'NEW_SIGNUP_WELCOME',
    variables: {
      customerName: recipientName || 'عميلنا العزيز',
      customerPhone: recipientPhone || '',
      email: email || '',
      companyName: resolvedCompanyName,
      signupTypeLabel: formatSignupTypeLabel(signupType),
      createdAt: formatNotificationDate(new Date()),
      supportLine: company?.phone || ''
    },
    customerId,
    priority: 2
  });
}

async function sendNewSignupAdminAlertNotification({
  companyId,
  recipientName,
  recipientPhone = '',
  email = '',
  signupType = 'platform_signup',
  companyName = '',
  audience = 'company-leadership',
  deliveryStrategy = 'platform-fallback'
}) {
  const { company, recipients } = await resolveAudienceRecipients(companyId, audience);
  const resolvedCompanyName = companyName || company?.name || 'المنصة';
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const variables = {
    customerName: recipientName || 'مسجل جديد',
    customerPhone: recipientPhone || '',
    email: email || '',
    companyName: resolvedCompanyName,
    signupTypeLabel: formatSignupTypeLabel(signupType),
    createdAt: formatNotificationDate(new Date())
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'NEW_SIGNUP_ADMIN_ALERT',
    variables: {
      ...variables,
      adminName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionCreatedNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  monthlyFee = 0,
  currency = 'EGP',
  billingCycle = 'monthly',
  nextBillingDate = null,
  trialDays = 0
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName,
    billingCycleLabel: formatBillingCycleLabel(billingCycle),
    monthlyFee: String(monthlyFee ?? 0),
    currency,
    nextBillingDate: formatNotificationDate(nextBillingDate),
    trialDays: String(trialDays ?? 0)
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_CREATED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_CREATED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionRenewedNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  monthlyFee = 0,
  currency = 'EGP',
  billingCycle = 'monthly',
  nextBillingDate = null
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName,
    billingCycleLabel: formatBillingCycleLabel(billingCycle),
    monthlyFee: String(monthlyFee ?? 0),
    currency,
    nextBillingDate: formatNotificationDate(nextBillingDate)
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_RENEWED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_RENEWED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionCancelledNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  reason = '',
  endDate = null
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName,
    reason: reason || 'غير محدد',
    endDate: formatNotificationDate(endDate || new Date())
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_CANCELLED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_CANCELLED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendNewsletterSubscribedNotification({
  companyId,
  email,
  recipientPhone = '',
  recipientName = '',
  customerId = null,
  companyName = '',
  sourceLabel = 'newsletter',
  notifyAdmins = true,
  adminDeliveryStrategy = 'platform-fallback'
}) {
  const company = companyName ? null : await resolveCompanyContext(companyId);
  const resolvedCompanyName = companyName || company?.name || 'المتجر';
  const subscribedAt = formatNotificationDate(new Date());
  const tasks = [];

  if (recipientPhone) {
    tasks.push(
      sendNotification({
        companyId,
        recipientPhone,
        recipientName: recipientName || 'مشترك جديد',
        recipientType: 'CUSTOMER',
        category: 'MARKETING',
        eventType: 'NEWSLETTER_SUBSCRIBED',
        variables: {
          customerName: recipientName || 'مشتركنا العزيز',
          customerPhone: recipientPhone || '',
          email: email || '',
          companyName: resolvedCompanyName,
          sourceLabel,
          subscribedAt
        },
        customerId,
        priority: 4
      })
    );
  }

  if (notifyAdmins) {
    const { recipients } = await resolveAudienceRecipients(companyId, 'company-admins');
    const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, adminDeliveryStrategy);
    if (recipients.length) {
      const variables = {
        customerName: recipientName || 'مشترك جديد',
        customerPhone: recipientPhone || '',
        email: email || '',
        companyName: resolvedCompanyName,
        sourceLabel,
        subscribedAt
      };

        tasks.push(
          fanOutNotification(recipients, (recipient) => ({
            companyId,
            deliveryCompanyId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name,
            recipientType: 'ADMIN',
          category: 'MARKETING',
          eventType: 'NEWSLETTER_SUBSCRIBED',
          variables: {
            ...variables,
            adminName: recipient.name
          },
          contentOverride: buildNewsletterAdminAlertContent(),
          priority: 4
        }))
      );
    }
  }

  if (!tasks.length) {
    return { success: false, reason: 'no_recipients' };
  }

  const results = await Promise.allSettled(tasks);
  return summarizeNotificationResults(
    results,
    tasks.map(() => ({ phone: recipientPhone || '', name: recipientName || email || 'newsletter' }))
  );
}

async function sendBenefitGrantedNotification({
  companyId,
  recipientPhone,
  recipientName,
  companyName = '',
  benefitTitle = 'ميزة جديدة',
  benefitSummary = '',
  couponCode = '',
  deliveryStrategy = 'company'
}) {
  if (!recipientPhone) {
    return { success: false, reason: 'no_phone' };
  }

  const company = companyName ? null : await resolveCompanyContext(companyId);
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  return sendNotification({
    companyId,
    deliveryCompanyId,
    recipientPhone,
    recipientName: recipientName || 'عميلنا العزيز',
    recipientType: 'CUSTOMER',
    category: 'MARKETING',
    eventType: 'BENEFIT_GRANTED',
    variables: {
      customerName: recipientName || 'عميلنا العزيز',
      companyName: companyName || company?.name || 'المنصة',
      benefitTitle,
      benefitSummary: benefitSummary || 'تمت إضافة ميزة جديدة إلى حسابك',
      couponCode: couponCode || 'لا يوجد'
    },
    priority: 3
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 التصدير
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // القوالب الافتراضية
  DEFAULT_TEMPLATES,

  // الدوال المساعدة
  replaceVariables,
  formatPhoneNumber,
  isQuietHours,
  resolveDeliveryCompanyId,
  getPersistedNotificationEventType,
  isDuplicateNotification,

  // الإرسال
  sendNotification,
  scheduleNotification,
  sendNewSignupWelcomeNotification,
  sendNewSignupAdminAlertNotification,
  sendSubscriptionCreatedNotification,
  sendSubscriptionRenewedNotification,
  sendSubscriptionCancelledNotification,
  sendNewsletterSubscribedNotification,
  sendBenefitGrantedNotification,

  // إشعارات الطلبات
  sendOrderCreatedNotification,
  sendOrderStatusNotification,
  sendOrderCreationNotification,

  // إشعارات العربة المتروكة
  sendAbandonedCartNotification,

  // إشعارات المنتجات
  sendBackInStockNotification,

  // إشعارات الموارد البشرية
  sendAttendanceReminderNotification,
  sendAttendanceConfirmedNotification,
  sendAttendanceLateNotification,
  sendAttendanceLateWithDeductionNotification,
  sendCheckoutConfirmedNotification,
  sendLeaveApprovalNotification,
  sendPayrollNotification,
  sendManualDeductionNotification,
  sendAssetRequestNotification,
  sendLoanNotification,
  sendRewardNotification,
  sendWarningNotification,
  sendBirthdayNotification,
  sendResignationNotification,

  // إشعارات الولاء
  sendLoyaltyPointsNotification,

  // معالج الطابور
  processNotificationQueue,

  // أدوات الطابور (اختبار)
  isRateLimitedSendError,
  queueSendPacingDelay,

  // الإحصائيات
  getNotificationStats
};
