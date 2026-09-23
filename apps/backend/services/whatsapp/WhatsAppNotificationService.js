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
 * يحوّل أي مسار وسيط لرابط HTTPS مطلق (ميتا تتطلب رابطاً قابلاً للتحميل في الهيدر).
 */
function toAbsoluteMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = (process.env.APP_URL || 'https://maxp.online').replace(/\/$/, '');
  const relativePath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${relativePath}`;
}

/**
 * يستخرج صورة أول منتج من الطلب (snapshot على الـ orderItem أو من المنتج نفسه).
 * تسمح لقالب الحالة بهيدر IMAGE أن يرسل صورة المنتج اللي العميل طلبه.
 */
function resolveOrderPrimaryImage(order) {
  if (!order) return null;
  const items = Array.isArray(order.orderItems) && order.orderItems.length > 0
    ? order.orderItems
    : (Array.isArray(order.items) ? order.items : []);
  const first = items[0];
  if (!first) return null;

  let img = first.productImage || first.imageUrl || first.image || first.product?.mainImage;
  if (!img && typeof first.product?.images === 'string') {
    img = first.product.images;
  }
  if (!img) return null;

  // Product.images قد يكون JSON array نصي
  let url = img;
  if (typeof img === 'string' && img.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(img);
      if (Array.isArray(arr)) url = arr[0];
    } catch { /* نص عادي */ }
  }
  return url ? toAbsoluteMediaUrl(url) : null;
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
  // 🚨 PRODUCTION-FIX (meta-template-first-2026-08-24): نبحث عن قالب ميتا معتمد
  // (metaTemplateName + APPROVED) بغض النظر عن sessionProvider — لأن الـ occasion
  // template مسجّل بـ channel AUTO وعنده ربط ميتا معتمد، ولازم يتبعت كـ template
  // مش نص حر. نبدأ بـ META_CLOUD ثم AUTO ثم أي قناة عليه ربط ميتا معتمد.
  const DETERMINISTIC_ORDER = [
    { isDefault: 'desc' },
    { updatedAt: 'desc' },
    { createdAt: 'desc' }
  ];
  const isApprovedLink = (t) =>
    Boolean(t?.metaTemplateName) && String(t?.metaTemplateStatus || '').toUpperCase() === 'APPROVED';

  // 1) سجل META_CLOUD مربوط بقالب معتمد — النموذج الجديد (قناة مفصولة).
  const metaCloudTemplate = await safeQuery(() => prisma.whatsAppNotificationTemplate.findFirst({
    where: {
      companyId,
      eventType,
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: { not: null },
      metaTemplateStatus: { equals: 'APPROVED', mode: 'insensitive' }
    },
    orderBy: DETERMINISTIC_ORDER
  }));
  if (isApprovedLink(metaCloudTemplate)) return metaCloudTemplate;

  // 2) سجل AUTO (أو أي قناة) عليه ربط ميتا معتمد — يحل محل القالب العادي.
  const autoMeta = await safeQuery(() => prisma.whatsAppNotificationTemplate.findFirst({
    where: {
      companyId,
      eventType,
      isActive: true,
      channel: { in: ['AUTO', 'META_CLOUD'] },
      metaTemplateName: { not: null },
      metaTemplateStatus: { equals: 'APPROVED', mode: 'insensitive' }
    },
    orderBy: DETERMINISTIC_ORDER
  }));
  if (isApprovedLink(autoMeta)) return autoMeta;

  // 3) أي سجل (أي channel) عليه ربط ميتا معتمد (legacy شامل).
  const anyMeta = await safeQuery(() => prisma.whatsAppNotificationTemplate.findFirst({
    where: {
      companyId,
      eventType,
      isActive: true,
      metaTemplateName: { not: null },
      metaTemplateStatus: { equals: 'APPROVED', mode: 'insensitive' }
    },
    orderBy: DETERMINISTIC_ORDER
  }));
  if (isApprovedLink(anyMeta)) return anyMeta;

  // 4) fallback: أي قالب عادي للحدث.
  const regularTemplate = await safeQuery(() => prisma.whatsAppNotificationTemplate.findFirst({
    where: { companyId, eventType, isActive: true },
    orderBy: DETERMINISTIC_ORDER
  }));
  if (regularTemplate) return regularTemplate;

  return null;
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
 * 🛡️ PRODUCTION-FIX (custom-status-dedup-identity): لو البايع مرّر rawEventType
 * (كود الحالة المخصصة الأصلي)، التطابق بيبقى على هوية الحالة دي — مش قيمة
 * mapsToSystem المشتركة. قبل كده حالتان مخصصتان مختلفتان على نفس الـ mapping
 * خلال 10 ثوانٍ لنفس الطلب كانت الثانية بتتبلع بصمت. الصفوف القديمة
 * (rawEventType=null) بتتطابق احتياطيًا زي قبل كده.
 */
async function isDuplicateNotification({ companyId, orderId, recipientPhone, eventType, rawEventType = null, windowMs = 10000 }) {
  const prisma = getSharedPrismaClient();
  const persistedEventType = getPersistedNotificationEventType(eventType);
  const where = {
    companyId,
    eventType: persistedEventType,
    createdAt: { gte: new Date(Date.now() - windowMs) },
  };
  if (rawEventType) {
    where.OR = [{ rawEventType: String(rawEventType).toUpperCase() }, { rawEventType: null }];
  }
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

  // 🚨 PRODUCTION-FIX (platform-sender-fallback-2026-08-24):
  // لو ملقيناش platform sender بـ ID/slug ثابت، ندور على أول شركة عندها
  // جلسة META_CLOUD متصلة فعلاً (لأن الإرسال عبر Meta Cloud محتاج جلسة شغالة).
  // ده بيصلح حالة الشركات الفرعية اللي مفيش ليها جلسة — تبعت من الشركة الأم.
  if (!company) {
    // 🚨 PRODUCTION-FIX (platform-sender-fallback-2026-08-24):
    // ندور على شركة عندها جلسة META_CLOUD متصلة AND عندها القالب المعتمد
    // للمناسبات (CUSTOMER_OCCASION_msvsy2ut) — لأن القالب مسجّل لشركة أم محددة (Swan)
    // مش أي شركة عندها جلسة. لو ملقيناش، نرجع أول شركة عندها جلسة متصلة.
    const metaCompany = await safeQuery(() =>
      prisma.$queryRaw`
        SELECT s."companyId" FROM whatsapp_sessions s
        JOIN whatsapp_notification_templates t ON t."companyId" = s."companyId"
        WHERE s.provider = 'META_CLOUD' AND s.status = 'CONNECTED'
          AND t."eventType" = 'CUSTOMER_OCCASION_msvsy2ut'
          AND t."metaTemplateStatus" = 'APPROVED' AND t."isActive" = true
        LIMIT 1`
    );
    let chosenId = metaCompany?.[0]?.companyId;
    if (!chosenId) {
      const metaSession = await safeQuery(() =>
        prisma.whatsAppSession.findFirst({
          where: { provider: 'META_CLOUD', status: 'CONNECTED' },
          select: { companyId: true },
          orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' } ]
        })
      );
      chosenId = metaSession?.companyId;
    }
    if (chosenId) {
      const metaCompany2 = await safeQuery(() =>
        prisma.company.findFirst({ where: { id: chosenId, isActive: true }, select: { id: true } })
      );
      company = metaCompany2;
    }
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
const { buildBroadcastHeaderParams } = require('../../utils/broadcastTemplateParams');

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
  let {
    companyId,
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
    channel = null,
    // 🛡️ PRODUCTION-FIX (custom-status-enum): قيمة enum صالحة تُخزّن في whatsAppNotificationLog
    // للحالات المخصصة (مثل mapsToSystem بتاعها) — لأن eventType في السجل enum مقفول.
    persistedEventType = null,
    // 🛡️ (custom-status-identity): الكود الأصلي للحدث قبل التحويل — هوية dedup
    // دقيقة للحالات المخصصة (بدل mapsToSystem اللي بيلوع رسالة حالتين مختلفتين)
    // ونسبة الإرسال في التقارير للحالة الصح.
    rawEventType = null,
    // 🛡️ (custom-status-meta-fallback): حدث قالب بديل (الحالة النظامية الماب عليها)
    // يستخدم لو قالب الحالة المخصصة لسه غير معتمد عند ميتا وجلسة الشركة META_CLOUD.
    metaFallbackEvent = null,
    // 🚨 PRODUCTION-FIX (platform-fallback-2026-08-24): استراتيجية تسليم الرسالة
    // (company / platform-only / platform-fallback) — تحدد هل نبعت من شركة الطلب
    // ولا من الشركة الأم اللي عندها جلسة Meta متصلة.
    deliveryStrategy = 'company',
    // 🛡️ PRODUCTION-FIX (guest-order-fk): الضيوف ملهمش صف في orders — اللوج بـ orderId=null
    isGuestOrder = false
  } = options;
  // 🚨 PRODUCTION-FIX (platform-fallback-2026-08-24): deliveryCompanyId قابل للتعديل
  // عشان نقدر نعيد تعيينه من resolveDeliveryCompanyId حسب الاستراتيجية.
  let deliveryCompanyId = companyId;
  const safeOrderId = isGuestOrder ? null : orderId;

  const prisma = getSharedPrismaClient();

  // Ensure orderId is in variables for variable replacement in buttons and content
  if (orderId && !variables.orderId) {
    variables.orderId = orderId;
  }

  try {
    // 1. جلب إعدادات الإشعارات
    const settings = await ensureNotificationSettings(companyId);
    const persistedEventType = options.persistedEventType || getPersistedNotificationEventType(eventType);
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

    // 🚨 PRODUCTION-FIX (platform-fallback-2026-08-24): نحلّ resolvedDeliveryCompanyId
    // من الاستراتيجية — عشان الشركات الفرعية (اللي مفيش ليها جلسة) تبعت عبر
    // الشركة الأم اللي عندها META_CLOUD متصل (زي Swan).
    const resolvedDeliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);
    if (resolvedDeliveryCompanyId && resolvedDeliveryCompanyId !== deliveryCompanyId) {
      deliveryCompanyId = resolvedDeliveryCompanyId;
    }

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
      return { success: false, reason: 'no_session', error: 'لا توجد جلسة واتساب متصلة للشركة — يرجى ربط حساب واتساب (Meta Cloud أو Baileys) من إعدادات الشركة أولاً' };
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
            deliveryCompanyId,
            fallbackEventType,
            sessionProvider,
            getSharedPrismaClient()
          ));
        }

        if (!template) {
          template = await safeQuery(() => findNotificationTemplateForEvent(
            deliveryCompanyId,
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

        // 🛡️ PRODUCTION-FIX (custom-status-meta-fallback): على جلسات META_CLOUD، لو
        // القالب المختار للحدث (حالة مخصصة) لسه بدون ربط ميتا معتمد (جديد/PENDING —
        // محتوى قوالب ميتا المقفولة مايتعدلش)، النص الحر بيترفض خارج نافذة الـ 24
        // ساعة (131047) = فشل صامت. نرجّع لقالب الحالة النظامية الماب عليها (المعتمد
        // غالبًا) — الأقرب دلاليًا — ونكمل كإرسال قالب ميتا طبيعي.
        if (
          sessionProvider === 'META_CLOUD' &&
          metaFallbackEvent &&
          metaFallbackEvent !== eventType &&
          !(template?.metaTemplateName && String(template?.metaTemplateStatus || '').toUpperCase() === 'APPROVED')
        ) {
          try {
            const mappedTemplate = await safeQuery(() => findNotificationTemplateForEvent(
              deliveryCompanyId,
              metaFallbackEvent,
              sessionProvider,
              getSharedPrismaClient()
            ));
            if (
              mappedTemplate?.metaTemplateName &&
              String(mappedTemplate?.metaTemplateStatus || '').toUpperCase() === 'APPROVED'
            ) {
              console.log(
                `☁️ [WHATSAPP-META-FALLBACK] قالب "${eventType}" غير معتمد بعد — استخدام قالب "${metaFallbackEvent}" المعتمد (الأقرب دلاليًا).`
              );
              template = mappedTemplate;
              templateId = template.id || null;
            }
          } catch (fallbackErr) {
            console.warn(`⚠️ [WHATSAPP-META-FALLBACK] فشل البحث عن قالب بديل (${metaFallbackEvent}):`, fallbackErr.message);
          }
        }
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
    // 🛡️ PRODUCTION-FIX (guest-order-fk): أوردرات الضيوف معندهاش صف في جدول orders،
    // فكانت كتابة اللوج بتفشل Foreign Key والفشل ده كان بيقتل الإرسال نفسه
    // (الرسالة جاهزة ومش بتتبعت!). اللوج دلوقتي non-fatal: أي فشل فيه مستمر
    // نكمل الإرسال — ومسار الضيوف بيتخزن بـ orderId=null أصلاً.
    let notificationLog = null;
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
          // 🛡️ (custom-status-identity): الكود الأصلي — هوية الحالة المخصصة
          rawEventType: rawEventType || null,
          content,
          orderId: safeOrderId,
          customerId,
          productId,
          employeeId,
          cartId,
          status: 'PENDING'
        }
      }));
    } catch (logCreateError) {
      console.warn(`[WHATSAPP-DEBUG] Log create failed (${logCreateError.message}) — retrying raw SQL${isGuestOrder ? ' (guest, orderId=null)' : ''}...`);
      try {
        const result = await prisma.$queryRaw`
          INSERT INTO "whatsapp_notification_logs" (
            id, "companyId", "templateId", "sessionId", "recipientPhone", "recipientName",
            "recipientType", category, "eventType", "rawEventType", content, "orderId", "customerId",
            status, "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), ${companyId}, ${templateId || null}, ${sessionId},
            ${formattedPhone}, ${recipientName},
            CAST(${persistedRecipientType} AS "whatsapp_notification_logs_recipientType"),
            CAST(${persistedCategory} AS "whatsapp_notification_logs_category"),
            CAST(${persistedEventType} AS "whatsapp_notification_logs_eventType"),
            ${rawEventType || null}, ${content},
            ${safeOrderId}, ${customerId}, 'PENDING', NOW(), NOW()
          ) RETURNING *;
        `;
        notificationLog = result[0];
        console.log(`[WHATSAPP-DEBUG] Created log via raw SQL: ${notificationLog.id}`);
      } catch (rawLogError) {
        // اللوج مش أهم من الرسالة — نكمل الإرسال من غيره
        console.warn(`[WHATSAPP-DEBUG] Notification log skipped (non-fatal):`, rawLogError.message);
        notificationLog = null;
      }
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
      // 🚨 PRODUCTION-FIX (meta-only-approved-2026-08-26, خطأ 1): لو الجلسة META_CLOUD
      // ممنوع تماماً ننزل لأي مسار نص حر (sendText/sendButtons/sendList) — سواء فشل
      // القالب المعتمد أو القالب أصلاً PENDING/مش معتمد. نبلوك الـ free-text دائماً
      // لما sessionProvider=META_CLOUD عشان ميتا ما ترفضش برسالة مضللة.
      let blockFreeTextMetaFallback = sessionProvider === 'META_CLOUD';
      let lastMetaTemplateError = null;

      // 🔗 زر "صفحة العميل": لو القالب فيه زرار LINK، نبني رابط سري لفتح بوابة العميل
      // على ساب دومين الشركة (من غير ما يكتب رقم الموبايل) وندمجه في الرسالة.
      // بيتعمل هنا بدري عشان لازم يتوفر لمسار قالب ميتا (URL button parameters).
      let customerPageLink = null;
      if (recipientPhone) {
        try {
          const rawBtns = safeTemplate?.hasButtons && safeTemplate.buttons
            ? (typeof safeTemplate.buttons === 'string' ? JSON.parse(safeTemplate.buttons) : safeTemplate.buttons)
            : [];
          const linkButtons = (Array.isArray(rawBtns) ? rawBtns : []).filter((b) =>
            String(b.type || b.action || '').toUpperCase() === 'LINK'
          );
          if (linkButtons.length > 0) {
            const magicLinkService = require('../customerMagicLinkService');
            // لو مفيش customerId (مثل إرسال عام) نحاول نلقى العميل بالرقم في الشركة
            let linkCustomerId = customerId || null;
            if (!linkCustomerId) {
              const { findCustomerByPhone } = require('../../utils/customerIdentity');
              const foundCust = await safeQuery(() => findCustomerByPhone(prisma, recipientPhone, companyId));
              linkCustomerId = foundCust?.id || null;
            }
            if (linkCustomerId) {
              const company = await safeQuery(() => prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, slug: true, customDomain: true }
              }));
              const linkInfo = await magicLinkService.createMagicLink(prisma, {
                companyId,
                customerId: linkCustomerId,
                phone: recipientPhone,
              });
              customerPageLink = {
                token: linkInfo.token,
                text: linkButtons[0].text || 'صفحتي على المتجر',
                url: magicLinkService.buildMagicLinkUrl(
                  company || { id: companyId, slug: companyId },
                  linkInfo.token,
                  recipientPhone
                ),
              };
              // رابط قابل للضغط في نص الرسالة (يعمل على كل القنوات — واتساب بيحوّل اللينكات تلقائياً)
              content = `${content}\n\n🔗 *${customerPageLink.text}*\n${customerPageLink.url}`;
              console.log(`[WHATSAPP-DEBUG] Customer page link generated for ${recipientPhone}`);
            }
          }
        } catch (linkErr) {
          console.error(`⚠️ [WHATSAPP-DEBUG] Failed to generate customer page link:`, linkErr?.message || linkErr);
        }
      }

      // ☁️ [META-CLOUD] إرسال عبر قالب ميتا المعتمد (Approved Template) بدلاً من free text
      // ميتا Cloud API ترفض الرسائل النصية الحرة خارج نافذة 24 ساعة، لذلك نستخدم
      // القالب المعتمد (metaTemplateName مع APPROVED) عندما تكون الجلسة META_CLOUD.
      // 🚨 PRODUCTION-FIX (meta-only-approved-2026-08-25): القالب لازم يكون APPROVED فعلاً
      // من ميتا — لو PENDING (مش معتمد) نرفض الإرسال ونرجع خطأ واضح بدل ما ننزل
      // لمسار النص الحر (اللي ميتا بترفضه بـ 132018). قرار المستخدم: مفيش إرسال
      // إلا بقالب معتمد.
      const metaTemplateName = safeTemplate?.metaTemplateName || null;
      const metaTemplateStatus = safeTemplate?.metaTemplateStatus || null;
      const canSendViaMetaTemplate =
        sessionProvider === 'META_CLOUD' &&
        metaTemplateName &&
        String(metaTemplateStatus).toUpperCase() === 'APPROVED';

      // 🔍 DIAG (2026-08-26): اطبع المعطيات قبل تحديد مسار الإرسال
      console.log(`🔍 [META-SEND] DIAG sessionProvider=${sessionProvider} metaTemplateName=${metaTemplateName} status=${metaTemplateStatus} canSendViaMetaTemplate=${canSendViaMetaTemplate} eventType=${eventType} deliveryCompanyId=${deliveryCompanyId}`);

      // 🚨 PRODUCTION-FIX (meta-only-approved-2026-08-25): لو الجلسة META_CLOUD بس القالب
      // مش معتمد (PENDING أو مفيش metaTemplateName) — نرفض الإرسال صراحةً بدل ما ننزل
      // لمسار النص الحر (اللي ميتا بترفضه بـ 132018). المستخدم لازم يعتمد القالب من ميتا.
      if (sessionProvider === 'META_CLOUD' && !canSendViaMetaTemplate) {
        const reason = metaTemplateName
          ? `قالب ميتا "${metaTemplateName}" حالته ${metaTemplateStatus || 'غير معروف'} — لازم يكون APPROVED من ميتا قبل الإرسال`
          : `لا يوجد قالب ميتا معتمد (metaTemplateName) مربوط بالحدث "${eventType}"`;
        console.warn(`⚠️ [META-CLOUD] ${reason} — تم الرفض (مفيش إرسال نص حر).`);
        // 🚨 PRODUCTION-FIX (meta-only-approved-2026-08-26, خطأ 2): لو فيه contentOverride
        // (نص حر من Journey/LeadFollowUp) والجلسة META_CLOUD — نرفض صراحةً بدل ما نحاول
        // نبعته كـ free-text (ميتا بتترفضه بـ 132018). نفس الرفض meta_template_not_approved.
        if (options.contentOverride) {
          console.warn(`⚠️ [META-CLOUD] contentOverride present but no APPROVED template — rejecting free-text.`);
        }
        return { success: false, reason: 'meta_template_not_approved', message: reason };
      }

      if (canSendViaMetaTemplate) {
        try {
          console.log(`☁️ [META-CLOUD] Sending via approved Meta template "${metaTemplateName}" (status=${metaTemplateStatus}) for event ${eventType}`);

          // بناء الـ components من ترتيب المتغيرات المخزّن في القالب ({position, name}).
          // 🆕 buildMetaBodyParams يوحّد المسارين (variables JSON + fallback من نص القالب)
          // بنفس منطق mapVariablesByOrder المستخدم وقت الربط — يمنع رسايل بمتغيرات مغلوطة.
          // 🛡️ PRODUCTION-FIX (2026-08-29, #131008): لو القالب مش موجود في الـ DB المحلي
          // (مثلاً الـ frontend بيبعت metaTemplateName جاي من ميتا مباشرة) → variablesOrder
          // و content يبقوا null/undefined والـ buildMetaBodyParams بترجّع [] → ميتا ترفض
          // بـ "missing parameter". نبني الـ order من الـ values (testVariables) نفسها كـ fallback.
          const variablesOrder = safeTemplate?.variables ? (() => {
            try { const parsed = JSON.parse(safeTemplate.variables); return Array.isArray(parsed) ? parsed : null; } catch { return null; }
          })() : null;
          const fallbackOrder = variablesOrder || !safeTemplate?.content
            ? (variables && typeof variables === 'object' ? Object.keys(variables).map((name, i) => ({ position: i + 1, name })) : null)
            : null;
          const bodyParams = buildMetaBodyParams(variablesOrder || fallbackOrder, safeTemplate?.content, variables);

          // helper يبني الـ components مع خيار إسقاط الـ header
          // 🚨 PRODUCTION-FIX (meta-header-132018): القالب المعتمد في ميتا ممكن
          // ميكونش فيه header رغم أن headerFormat في الداتابيز = IMAGE — ميتا بترفض
          // بـ 132018 "Template does not contain title component, no parameters allowed".
          // لما يحصل ده نعيد المحاولة من غير header components.
          const buildComponents = async (includeHeader) => {
            const comps = [];
            if (includeHeader && safeTemplate?.headerFormat && safeTemplate.headerFormat !== 'TEXT') {
              // 🆕 headerUsesOrderProduct: صورة أول منتج من الطلب (متغيرة لكل رسالة)
              let headerMedia = null;
              if (safeTemplate.headerUsesOrderProduct) {
                headerMedia = variables.productImage || null;
                if (!headerMedia && orderId) {
                  try {
                    const order = await safeQuery(() => getSharedPrismaClient().order.findUnique({
                      where: { id: orderId },
                      select: {
                        orderItems: { select: { productImage: true, imageUrl: true, product: { select: { mainImage: true, images: true } } } },
                      }
                    }));
                    headerMedia = resolveOrderPrimaryImage(order);
                  } catch { /* غير حرج — يقع على الصورة الثابتة */ }
                }
              }
              const fallbackMedia = safeTemplate.headerMediaHandle || null;
              const media = headerMedia || fallbackMedia;
              if (media) {
                const headerParam = buildBroadcastHeaderParams(media, String(safeTemplate.headerFormat).toLowerCase());
                if (headerParam) comps.push(headerParam);
              }
            }
            comps.push({ type: 'BODY', parameters: bodyParams });

            // 🔗 لو القالب فيه زرار صفحة العميل (URL button) — نضيف parameters الزرار
            // ({{1}}=التوكن، {{2}}=الرقم) بنفس ترتيب buildMetaTemplatePayload.
            if (customerPageLink) {
              comps.push({
                type: 'BUTTON',
                sub_type: 'url',
                index: 0,
                parameters: [
                  { type: 'text', text: customerPageLink.token },
                  { type: 'text', text: recipientPhone }
                ]
              });
            }
            return comps;
          };

          let components = await buildComponents(true);

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
          // 🚨 PRODUCTION-FIX (meta-header-132018): ميتا رفضت بسبب header غير موجود في القالب
          // المعتمد ("Template does not contain title component") — نعيد المحاولة من غير header.
          // ملاحظة: النص ده بييجي في error.details (من error_data.details)، مش في error.message.
          const headerRejected =
            metaError &&
            String(
              metaError?.details ||
              metaError?.response?.data?.error?.error_data?.details ||
              metaError?.message ||
              metaError?.response?.data?.error?.message ||
              ''
            ).includes('does not contain title component');
          if (headerRejected && safeTemplate?.headerFormat && safeTemplate.headerFormat !== 'TEXT') {
            console.warn(`⚠️ [META-CLOUD] Meta rejected header component for "${metaTemplateName}" (template has no title/header). Retrying WITHOUT header...`);
            try {
              const componentsNoHeader = await buildComponents(false);
              result = await WhatsAppMessageHandler.sendTemplateMessage(sessionId, formattedPhone, metaTemplateName, {
                name: metaTemplateName,
                language: safeTemplate?.metaTemplateLanguage || 'ar',
                components: componentsNoHeader
              }, {
                templateBody: content,
                senderId: null
              });
              console.log(`☁️ [META-CLOUD] Retry without header succeeded for "${metaTemplateName}".`);
              if (result) usedMessageType = 'TEMPLATE';
            } catch (retryErr) {
              console.error(`❌ [META-CLOUD] Retry without header also failed for "${metaTemplateName}":`, retryErr?.message || retryErr);
              result = null;
              throw retryErr;
            }
          } else {
            // إذا فشل الإرسال عبر القالب المعتمد، نسجّل الخطأ.
            // 🔍 DIAG (2026-08-26): اطبع تفاصيل خطأ ميتا الكاملة عشان نعرف السبب الحقيقي
            console.error(`❌ [META-CLOUD] Failed to send via approved template "${metaTemplateName}":`, metaError?.message || metaError);
            console.error(`❌ [META-CLOUD] metaError details =>`, JSON.stringify({
              code: metaError?.code,
              reason: metaError?.reason,
              apiMessage: metaError?.apiMessage,
              details: metaError?.details,
              httpStatus: metaError?.httpStatus,
              raw: metaError?.originalError?.response?.data || metaError?.originalError?.message
            }));
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
              // 🚨 PRODUCTION-FIX: فشل القالب المعتمد بخطأ غير نافذة (network/params/undeliverable...).
              // بما أن canSendViaMetaTemplate كان متاحاً والجلسة META_CLOUD، النزول لـ BUTTONS/TEXT
              // عبر نفس جلسة الميتا خارج نافذة 24 ساعة سيفشل حتماً (free-form مرفوض) ويضلل الـ failureReason.
              // الأصح: نمنع مسار النص الحر ونُسجّل فشل القالب الحقيقي.
              if (canSendViaMetaTemplate) {
                console.error(`☁️ [META-CLOUD] Approved template "${metaTemplateName}" failed with non-window error ` +
                  `(${metaError?.code || metaError?.message}). Blocking free-text meta fallback.`);
                blockFreeTextMetaFallback = true;
                result = null;
                throw metaError;
              }
              console.error(`☁️ [META-CLOUD] Falling back to local send path for ${eventType}`);
              result = null;
            }
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

      if (blockFreeTextMetaFallback && !result) {
        // 🚨 PRODUCTION-FIX: القالب المعتمد APPROVED فشل ولا يوجد Baileys بديل.
        // ممنوع تجربة free-text عبر META_CLOUD خارج نافذة 24 ساعة — ميتا سترفض حتماً.
        // نرمي خطأ يحمل السبب الحقيقي لفشل القالب (بدل 131047 مضلل من buttons).
        // 🚨 PRODUCTION-FIX (2026-08-27): الـ guard لازم يتضمن `&& !result` — كان
        // blockFreeTextMetaFallback = sessionProvider === 'META_CLOUD' بيبدأ true
        // لأي جلسة ميتا، فحتى الإرسال الناجح بالقالب المعتمد كان بيمر على هنا ويُرمى
        // "Approved Meta template failed" كذباً → التقارير بتعرض فشل رغم وصول الرسالة.
        throw new Error(
          `تعذر إرسال قالب ميتا المعتمد "${metaTemplateName || ''}" (ميتا رفضت أو الرقم خارج نافذة 24 ساعة / الـ template محتاج اعتماد أعلى). ` +
          `النص الحر ممنوع عبر Meta Cloud خارج نافذة 24 ساعة. السبب من ميتا: ` +
          (lastMetaTemplateError ? `${lastMetaTemplateError.code || ''} ${lastMetaTemplateError.message || ''}` : 'غير محدد')
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
          // 🚨 PRODUCTION-FIX: لو فشلت الأزرار عبر META_CLOUD بخطأ نافذة (131047/131026) —
          // sendText عبر نفس جلسة الميتا سيفشل حتماً خارج نافذة 24 ساعة.
          // نحاول Baileys session بديلة أولاً؛ إن لم توجد نرمي الخطأ الأصلي (يحافظ على errorCode).
          if (sessionProvider === 'META_CLOUD' && isMetaWindowError(error)) {
            console.log(`🔄 [FALLBACK] Meta buttons rejected (window error). Searching for a Baileys session...`);
            const baileysSession = await findAlternativeBaileysSession(companyId, sessionId);
            if (baileysSession) {
              try {
                result = await WhatsAppMessageHandler.sendText(baileysSession.sessionId, jid, content);
                if (result) usedMessageType = 'TEXT';
              } catch (baileysErr) {
                console.error(`❌ [FALLBACK] Baileys text fallback also failed:`, baileysErr.message);
                throw error; // نحتفظ بخطأ الميتا الأصلي (131047) للسبب الحقيقي
              }
            } else {
              console.error(`❌ [WHATSAPP-DEBUG] Meta buttons failed and no Baileys session available:`, error.message);
              throw error; // نحتفظ بالكود الأصلي بدل 'Both Meta and Baileys send failed' (بلا code)
            }
          } else {
            console.error(`❌ [WHATSAPP-DEBUG] Failed to send buttons, falling back to text:`, error);
            result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
            if (result) usedMessageType = 'TEXT';
          }
        }
      } else if (!result && safeTemplate.hasList && safeTemplate.listData) {
        try {
          const listData = typeof safeTemplate.listData === 'string' ? JSON.parse(safeTemplate.listData) : safeTemplate.listData;
          console.log(`[WHATSAPP-DEBUG] Sending list message`);
          result = await WhatsAppMessageHandler.sendList(sessionId, jid, listData);
        } catch (parseError) {
          console.error(`❌ [WHATSAPP-DEBUG] Failed to parse listData, falling back to text:`, parseError);
          // 🚨 PRODUCTION-FIX: لو META_CLOUD خارج النافذة، نفضل Baileys بدل sendText عبر ميتا.
          if (sessionProvider === 'META_CLOUD') {
            const baileysSession = await findAlternativeBaileysSession(companyId, sessionId);
            if (baileysSession) {
              try {
                result = await WhatsAppMessageHandler.sendText(baileysSession.sessionId, jid, content);
                if (result) usedMessageType = 'TEXT';
              } catch (baileysErr) {
                console.error(`❌ [WHATSAPP-DEBUG] Baileys text fallback failed:`, baileysErr.message);
                result = null;
              }
            } else {
              try {
                result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
                if (result) usedMessageType = 'TEXT';
              } catch (metaTextErr) {
                console.error(`❌ [WHATSAPP-DEBUG] Meta text send failed:`, metaTextErr.message);
                throw metaTextErr;
              }
            }
          } else {
            result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
            if (result) usedMessageType = 'TEXT';
          }
        }
      } else if (!result) {
        console.log(`[WHATSAPP-DEBUG] Sending text message:`, content?.substring(0, 50));

        // 🚨 PRODUCTION-FIX: لو الجلسة META_CLOUD وخارج نافذة 24 ساعة، sendText عبر الميتا
        // سيفشل بـ 131047. نحاول Baileys session بديلة إن وجدت — نص Baileys يعمل دائماً.
        if (sessionProvider === 'META_CLOUD') {
          const baileysSession = await findAlternativeBaileysSession(companyId, sessionId);
          if (baileysSession) {
            try {
              result = await WhatsAppMessageHandler.sendText(baileysSession.sessionId, jid, content);
              if (result) usedMessageType = 'TEXT';
            } catch (baileysErr) {
              console.error(`❌ [WHATSAPP-DEBUG] Baileys text fallback failed:`, baileysErr.message);
              result = null;
            }
          } else {
            try {
              result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
              if (result) usedMessageType = 'TEXT';
            } catch (metaTextErr) {
              console.error(`❌ [WHATSAPP-DEBUG] Meta text send failed:`, metaTextErr.message);
              throw metaTextErr; // يحافظ على errorCode الحقيقي (مثل 131047)
            }
          }
        } else {
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
          if (result) usedMessageType = 'TEXT';
        }
      }

      console.log(`[WHATSAPP-DEBUG] Send result:`, result);

      // 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3 hardening):
      // لا نكتب SENT أبداً بدون نتيجة إرسال فعلية — لو Meta رفضت وfallback فشل
      // (result = null) نرمي خطأ لنمر عبر مسار FAILED بدل نجاح وهمي.
      if (!result) {
        throw new Error('Both Meta and Baileys send failed');
      }

      // تحديث السجل (لو اتكتب أصلاً — guest-order-fk: ممكن يكون null بشكل مقصود)
      if (notificationLog) {
        await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
          where: { id: notificationLog.id },
          data: {
            status: 'SENT',
            messageType: usedMessageType || result?.messageType || 'TEXT',
            sentAt: new Date(),
            whatsappMessageId: result?.messageId || result?.key?.id || null
          }
        }));
      }

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

      return { success: true, notificationId: notificationLog?.id || null };

    } catch (sendError) {
      console.error(`❌ [WHATSAPP-DEBUG] Failed to send message:`, sendError.message);
      console.error(`❌ [WHATSAPP-DEBUG] Error stack:`, sendError.stack);

      // تحديث السجل بالخطأ (لو موجود — guest-order-fk)
      if (notificationLog) {
        await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
          where: { id: notificationLog.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: sendError.code ? `[${sendError.code}] ${sendError.message}` : sendError.message,
            errorCode: sendError.code ? String(sendError.code) : null,
          }
        }));
      }

      // 🚨 PRODUCTION-FEATURE (Window Policy & SMS Fallback):
      // لو فشل الإرسال بسبب نافذة 24 ساعة (131047) أو تعذر القالب المعتمد،
      // نفحص سياسة الشركة: إن كانت مفعلة لـ SMS Fallback، نرسل الرسالة فوراً كـ SMS
      const isWindowOrTemplateFailure = (typeof isMetaWindowError === 'function' && isMetaWindowError(sendError)) ||
        sendError.code === 131047 ||
        sendError.code === '131047' ||
        /24\s*hour|outside.*window|template.*window/i.test(sendError.message || '');

      if (isWindowOrTemplateFailure) {
        try {
          const WhatsAppWindowPolicyService = require('./WhatsAppWindowPolicyService');
          const policy = await WhatsAppWindowPolicyService.getWindowPolicySettings(companyId);
          if (policy?.smsFallbackEnabled) {
            console.log(`📱 [FALLBACK-SMS] 24h window closed/rejected. Dispatching SMS to ${recipientPhone} for ${eventType}`);
            const smsGateway = require('../sms/smsGatewayService');
            const smsResult = await smsGateway.sendSMS({
              to: recipientPhone,
              text: content,
              senderId: policy.smsConfig?.senderId,
              config: { ...policy.smsConfig, provider: policy.smsProvider }
            });

            if (smsResult.success) {
              console.log(`✅ [FALLBACK-SMS] SMS delivered successfully (ID: ${smsResult.messageId})`);
              if (notificationLog) {
                await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
                  where: { id: notificationLog.id },
                  data: {
                    status: 'SENT',
                    messageType: 'SMS',
                    sentAt: new Date(),
                    failureReason: null,
                    errorCode: null,
                    whatsappMessageId: smsResult.messageId
                  }
                }));
              }
              return { success: true, via: 'SMS', messageId: smsResult.messageId };
            } else {
              console.warn(`⚠️ [FALLBACK-SMS] SMS send failed: ${smsResult.error}`);
            }
          }
        } catch (smsErr) {
          console.error(`❌ [FALLBACK-SMS] Error in SMS fallback dispatch:`, smsErr.message);
        }
      }

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
  // 🚨 PRODUCTION-FIX (131008): نقرأ order.orderItems (Prisma relation) أو order.items —
  // مش items بس — وإلا رسالة "طلب جديد" تطلع بمتغير orderItems فاضي والقالب يفشل بـ 131008.
  const createdItemsSource = Array.isArray(order.orderItems) && order.orderItems.length > 0
    ? order.orderItems
    : (Array.isArray(order.items) ? order.items : []);
  let orderItemsText = '';
  if (createdItemsSource.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    createdItemsSource.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name || item.product?.name || 'منتج'}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  } else {
    // 🚨 PRODUCTION-FIX (131008): قيمة غير فاضية لمتغير orderItems في قالب "طلب جديد"
    // — وإلا Meta Cloud بترفض بـ 131008 "Required parameter is missing".
    orderItemsText = 'لا يوجد';
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
      productImage: resolveOrderPrimaryImage(order),
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
    // 🛡️ PRODUCTION-FIX (status-notify-flag): احترم notifyCustomer من إعداد الحالة حتى
    // للقياسية الست — كان الإعداد العام (orderProcessingEnabled... إلخ) بيغلب على القرار
    // ويبعت رسايل لحالات التاجر معطّلها من صفحة حالات الطلبات (مثل PROCESSING
    // notifyCustomer=false) — التناقض ده كان بيولّد محاولات إرسال فاشلة 131047.
    try {
      const dbNotify = await prisma.orderStatusConfig.findFirst({
        where: { companyId: order.companyId, code: newStatus, statusType: { in: ['order', 'shipping', 'preparation', 'payment'] }, isActive: true },
        select: { notifyCustomer: true }
      });
      if (dbNotify && dbNotify.notifyCustomer === false) {
        console.log(`[WHATSAPP-STATUS] ⏭️ ${newStatus} notifyCustomer=false في إعداد الحالة — تخطي الإرسال`);
        return { success: false, reason: 'status_notification_disabled' };
      }
    } catch (notifyFlagErr) {
      console.warn(`[WHATSAPP-STATUS] ⚠️ Failed to check notifyCustomer for ${newStatus}:`, notifyFlagErr.message);
    }
  } else {
    // التحقق من الحالات المخصصة في قاعدة البيانات
    // 🛡️ PRODUCTION-FIX (custom-status-all-types): الحالات المخصصة بتاعة التاجر بتتسمّى
    // من صفحة الحالات بأي نوع (order/shipping/preparation/payment) — الفلترة على
    // order+shipping بس كانت بتسيب حالات preparation/payment تقع في الـ fallback
    // (مفعّل قسرًا متجاهلًا notifyCustomer وبدون الاسم العربي في {{status}}).
    const dbStatus = await prisma.orderStatusConfig.findFirst({
      where: { companyId: order.companyId, code: newStatus, statusType: { in: ['order', 'shipping', 'preparation', 'payment'] }, isActive: true }
    });

    if (dbStatus) {
      statusConfig = {
        event: dbStatus.code,
        enabled: dbStatus.notifyCustomer,
        isCustom: true,
        statusName: dbStatus.name,
        // 🛡️ PRODUCTION-FIX (custom-status-enum): نخزّن في السجل قيمة enum صالحة —
        // نستخدم mapsToSystem بتاعة الحالة المخصصة (مثل ON_HOLD) إن وجدت.
        persistedEventType: getPersistedNotificationEventType(dbStatus.mapsToSystem || dbStatus.code),
        // 🛡️ PRODUCTION-FIX (custom-status-meta-fallback): لو قالب الحالة المخصصة
        // لسه غير معتمد عند ميتا، نرجع لقالب الحالة النظامية الماب عليها (الأقرب
        // دلاليًا) بدل النص الحر اللي بيفشل 131047 خارج نافذة الـ 24 ساعة.
        metaFallbackEvent: dbStatus.mapsToSystem || null
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
  // 🚨 PRODUCTION-FIX: الطلب قد يأتي بــ order.orderItems (Prisma relation من
  // updateOrderStatus) أو order.items (من مسارات أخرى). كان الكود يقرأ order.items
  // فقط → الـ orderItemsText يبقى فاضي → قوالب بvariable إلزامي (orderItems) تفشل
  // بـ Meta 131008 "Required parameter is missing".
  const orderItemsSource = Array.isArray(order.orderItems) && order.orderItems.length > 0
    ? order.orderItems
    : (Array.isArray(order.items) ? order.items : []);

  let orderItemsText = '';
  if (orderItemsSource.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    orderItemsSource.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name || item.product?.name || 'منتج'}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  } else {
    // 🚨 PRODUCTION-FIX (131008): لو الأوردر مفيش فيه منتجات (أو items مش متعمّرة)،
    // لازم نبعث قيمة غير فاضية لمتغير orderItems — وإلا Meta Cloud بترفض القالب
    // بـ 131008 "Required parameter is missing" (القالب بيطلب orderItems إلزامي).
    orderItemsText = 'لا يوجد';
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
      persistedEventType: statusConfig.persistedEventType || null,
      // 🛡️ (custom-status-identity): الكود الأصلي — هوية dedup دقيقة + نسبة للتقارير
      rawEventType: newStatus,
      // 🛡️ (custom-status-meta-fallback): قالب الحالة النظامية الماب عليها كخطة بديلة
      metaFallbackEvent: statusConfig.metaFallbackEvent || null,
      variables: {
        customerName: order.customerName || order.customer?.firstName || 'عميلنا العزيز',
        customerPhone: phone,
        orderNumber: order.orderNumber,
        orderItems: orderItemsText,
        status: statusConfig.statusName || newStatus, // 🔥 Added status name for templates
        total: order.total != null ? String(order.total) : '0',
        currency: order.currency || 'EGP',
        trackingNumber: order.turboTrackingNumber || '',
        estimatedDays: '2-3',
        reason: '',
        productImage: resolveOrderPrimaryImage(order)
      },
      orderId: trackedOrderId,
      customerId: order.customerId,
      isGuestOrder: order?.isGuestOrder === true,
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

  // نفس الـ eventType اللي بيتخزّن فعلاً في whatsAppNotificationLog
  // (sendOrderStatusNotification بيرشّحه بـ getPersistedNotificationEventType).
  const eventType = useNewOrderTemplate
    ? 'ORDER_CREATED'
    : getPersistedNotificationEventType(status);

  // 🛡️ Dedup موحّد: createEnhancedOrder والـ route بينادوها الاتنين عند الإنشاء
  // اليدوي — منع إرسال رسالة "طلب جديد" أو "حالة الطلب" مرتين لنفس الطلب
  // (مسار ORDER_CREATED كان محمي بالداخل قبل التعديل، والحالات بقا لازم تتحمي برضه).
  const { trackedOrderId, isGuestOrder } = getOrderNotificationTracking(order);
  const hasDedupKey =
    trackedOrderId ||
    (isGuestOrder && (order.customerPhone || order.customer?.phone));
  if (hasDedupKey) {
    const isDup = await isDuplicateNotification({
      companyId: order.companyId,
      ...(trackedOrderId
        ? { orderId: trackedOrderId }
        : { recipientPhone: order.customerPhone || order.customer?.phone }),
      eventType,
    });
    if (isDup) {
      console.log(`⚠️ [WHATSAPP] Duplicate ${eventType} blocked for order ${order.orderNumber}`);
      return { success: false, reason: 'duplicate_blocked' };
    }
  }

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
    // 🧹 Reaper: إعادة تعيين أي صفوف عالقة في PROCESSING منذ أكثر من 5 دقائق (يتم الفحص كل دقيقة تقريباً لتجنب العبء المستمر على قاعدة البيانات)
    const REAPER_STALE_MS = 5 * 60 * 1000;
    if (Math.random() < 0.05) {
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

    if (pendingNotifications.length > 0) {
      console.log(`📬 Processing ${pendingNotifications.length} queued notifications`);
    }

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
async function getNotificationStats(companyId, dateRange = 30, startDateParam, endDateParam) {
  const prisma = getSharedPrismaClient();

  let startDate;
  let endDate = null;
  if (startDateParam) {
    startDate = new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
  }
  if (endDateParam) {
    endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);
  }
  const createdAtFilter = endDate ? { gte: startDate, lte: endDate } : { gte: startDate };

  const [total, sent, delivered, read, failed, byCategory, byEvent] = await Promise.all([
    // إجمالي
    prisma.whatsAppNotificationLog.count({
      where: { companyId, createdAt: createdAtFilter }
    }),
    // المرسلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'SENT', createdAt: createdAtFilter }
    }),
    // المستلمة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'DELIVERED', createdAt: createdAtFilter }
    }),
    // المقروءة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'READ', createdAt: createdAtFilter }
    }),
    // الفاشلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'FAILED', createdAt: createdAtFilter }
    }),
    // حسب التصنيف
    prisma.whatsAppNotificationLog.groupBy({
      by: ['category'],
      where: { companyId, createdAt: createdAtFilter },
      _count: true
    }),
    // حسب الحدث
    prisma.whatsAppNotificationLog.groupBy({
      by: ['eventType'],
      where: { companyId, createdAt: createdAtFilter },
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
