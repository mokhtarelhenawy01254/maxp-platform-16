/**
 * ⏱ WhatsApp Window Policy & Dispatch Service
 * خدمة إدارة سياسة نافذة الـ 24 ساعة وتوجيه الرسائل الذكي بين:
 * - النص الحر (Free Text)
 * - القوالب الرسمية المعتمدة (Approved Meta Templates)
 * - الرسائل النصية القصيرة (SMS Fallback)
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const { computeWindowStatus } = require('./WhatsAppWindowService');
const smsGateway = require('../sms/smsGatewayService');

const DEFAULT_POLICY_CONFIG = {
  windowPolicy: 'SMART_FALLBACK', // 'SMART_FALLBACK' | 'TEMPLATE_ONLY' | 'SMS_DIRECT'
  smsFallbackEnabled: false,
  smsProvider: 'SMSMISR', // 'TWILIO' | 'SMSMISR' | 'TAQNYAT' | 'GENERIC_WEBHOOK'
  smsConfig: {
    senderId: 'MaxP',
    apiKey: '',
    apiSecret: '',
    accountSid: '',
    authToken: '',
    webhookUrl: '',
    environment: 2
  },
  windowAlertThresholdMinutes: 60
};

/**
 * جلب إعدادات سياسة النافذة والـ SMS للشركة
 * @param {string} companyId
 * @returns {Promise<typeof DEFAULT_POLICY_CONFIG>}
 */
async function getWindowPolicySettings(companyId) {
  if (!companyId) return { ...DEFAULT_POLICY_CONFIG };

  try {
    const prisma = getSharedPrismaClient();
    const settingsRow = await safeQuery(() => prisma.whatsAppSettings.findUnique({
      where: { companyId },
      select: { metadata: true }
    }));

    if (!settingsRow?.metadata) {
      return { ...DEFAULT_POLICY_CONFIG };
    }

    let parsedMeta = {};
    try {
      parsedMeta = typeof settingsRow.metadata === 'string'
        ? JSON.parse(settingsRow.metadata)
        : settingsRow.metadata;
    } catch {
      parsedMeta = {};
    }

    const windowPolicyData = parsedMeta.windowPolicyConfig || {};
    return {
      ...DEFAULT_POLICY_CONFIG,
      ...windowPolicyData,
      smsConfig: {
        ...DEFAULT_POLICY_CONFIG.smsConfig,
        ...(windowPolicyData.smsConfig || {})
      }
    };
  } catch (err) {
    console.error(`❌ [WINDOW-POLICY] Error fetching policy settings for company ${companyId}:`, err.message);
    return { ...DEFAULT_POLICY_CONFIG };
  }
}

/**
 * تحديث إعدادات سياسة النافذة وبوابة الـ SMS
 * @param {string} companyId
 * @param {Partial<typeof DEFAULT_POLICY_CONFIG>} incomingConfig
 */
async function updateWindowPolicySettings(companyId, incomingConfig = {}) {
  if (!companyId) {
    throw new Error('companyId is required to update window policy settings');
  }

  const prisma = getSharedPrismaClient();
  const current = await safeQuery(() => prisma.whatsAppSettings.findUnique({
    where: { companyId },
    select: { metadata: true }
  }));

  let existingMeta = {};
  if (current?.metadata) {
    try {
      existingMeta = typeof current.metadata === 'string'
        ? JSON.parse(current.metadata)
        : current.metadata;
    } catch {
      existingMeta = {};
    }
  }

  const currentWindowConfig = existingMeta.windowPolicyConfig || {};
  const mergedWindowConfig = {
    ...DEFAULT_POLICY_CONFIG,
    ...currentWindowConfig,
    ...incomingConfig,
    smsConfig: {
      ...DEFAULT_POLICY_CONFIG.smsConfig,
      ...(currentWindowConfig.smsConfig || {}),
      ...(incomingConfig.smsConfig || {})
    }
  };

  const updatedMetadata = JSON.stringify({
    ...existingMeta,
    windowPolicyConfig: mergedWindowConfig
  });

  await safeQuery(() => prisma.whatsAppSettings.upsert({
    where: { companyId },
    update: { metadata: updatedMetadata, updatedAt: new Date() },
    create: { companyId, metadata: updatedMetadata }
  }));

  console.log(`✅ [WINDOW-POLICY] Settings updated for company ${companyId}`);
  return mergedWindowConfig;
}

/**
 * اتخاذ قرار التوجيه المناسب للرسالة
 * @param {object} params
 * @param {string} params.companyId
 * @param {object|null} params.contact - سطر WhatsAppContact
 * @param {string} [params.sessionProvider] - 'META_CLOUD' أو 'BAILEYS'
 * @param {object|null} [params.template] - قالب الإشعار المتاح
 * @returns {Promise<{ mode: 'FREE_TEXT'|'META_TEMPLATE'|'SMS'|'BLOCKED', reason: string, window: object, smsConfig?: object, template?: object }>}
 */
async function resolveDispatchMode({ companyId, contact, sessionProvider = 'META_CLOUD', template = null }) {
  const windowStatus = computeWindowStatus(contact);
  const isMetaSession = sessionProvider === 'META_CLOUD';

  // 1) في جلسات Baileys، لا توجد قيود نافذة 24 ساعة من Meta، النص الحر يعمل دائماً
  if (!isMetaSession) {
    return {
      mode: 'FREE_TEXT',
      reason: 'NON_META_SESSION',
      window: windowStatus
    };
  }

  // 2) إذا كانت النافذة مفتوحة (العميل أرسل رسالة خلال الـ 24 ساعة السابقة)
  if (windowStatus.isOpen) {
    return {
      mode: 'FREE_TEXT',
      reason: 'CUSTOMER_ACTIVE_IN_WINDOW',
      window: windowStatus
    };
  }

  // 3) النافذة مغلقة (خارج 24 ساعة أو عميل جديد)
  const policy = await getWindowPolicySettings(companyId);

  // إذا كانت السياسة تفرض SMS مباشرة خارج النافذة
  if (policy.windowPolicy === 'SMS_DIRECT' && policy.smsFallbackEnabled) {
    return {
      mode: 'SMS',
      reason: 'DIRECT_SMS_POLICY',
      window: windowStatus,
      smsConfig: { ...policy.smsConfig, provider: policy.smsProvider }
    };
  }

  // التحقق من وجود قالب ميتا معتمد
  const isApprovedTemplate = Boolean(
    template &&
    template.metaTemplateName &&
    String(template.metaTemplateStatus || '').toUpperCase() === 'APPROVED'
  );

  if (isApprovedTemplate && policy.windowPolicy !== 'SMS_DIRECT') {
    return {
      mode: 'META_TEMPLATE',
      reason: 'APPROVED_TEMPLATE_AVAILABLE',
      window: windowStatus,
      template
    };
  }

  // في حال تعذر القالب أو عدم اعتماده، التحقق من خيار الـ SMS Fallback
  if (policy.smsFallbackEnabled) {
    return {
      mode: 'SMS',
      reason: 'OUTSIDE_WINDOW_SMS_FALLBACK',
      window: windowStatus,
      smsConfig: { ...policy.smsConfig, provider: policy.smsProvider }
    };
  }

  // لا يوجد قالب معتمد ولا يوجد SMS مفعل
  return {
    mode: 'BLOCKED',
    reason: 'OUTSIDE_WINDOW_NO_TEMPLATE_OR_SMS',
    window: windowStatus
  };
}

module.exports = {
  DEFAULT_POLICY_CONFIG,
  getWindowPolicySettings,
  updateWindowPolicySettings,
  resolveDispatchMode
};
