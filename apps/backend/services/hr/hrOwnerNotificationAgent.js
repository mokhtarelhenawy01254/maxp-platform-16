const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');

const logger = {
  info: (...args) => console.log('[HR-OwnerNotify]', ...args),
  warn: (...args) => console.warn('[HR-OwnerNotify]', ...args),
  error: (...args) => console.error('[HR-OwnerNotify]', ...args)
};

const OLDER_LEGACY_ACTION_TYPES = ['PROMOTION', 'DEDUCTION', 'WARNING', 'KUDOS', 'TRAINING'];
const LEGACY_ACTION_TYPES = [...OLDER_LEGACY_ACTION_TYPES, 'ADVANCE', 'LEAVE'];
const EXTENDED_ACTION_TYPES = [...LEGACY_ACTION_TYPES, 'ATTENDANCE', 'PAYROLL', 'PROBATION_END', 'CONTRACT_EXPIRY'];

function normalizeEnabledActionTypes(rawTypes) {
  let parsedTypes = rawTypes;

  if (typeof parsedTypes === 'string') {
    try {
      parsedTypes = JSON.parse(parsedTypes);
    } catch (error) {
      parsedTypes = [];
    }
  }

  const normalizedTypes = Array.isArray(parsedTypes)
    ? [...new Set(parsedTypes.filter(Boolean).map(type => String(type).trim()).filter(Boolean))]
    : [];

  const isLegacyDefault =
    normalizedTypes.length === LEGACY_ACTION_TYPES.length &&
    LEGACY_ACTION_TYPES.every(type => normalizedTypes.includes(type));
  const isOlderLegacyDefault =
    normalizedTypes.length === OLDER_LEGACY_ACTION_TYPES.length &&
    OLDER_LEGACY_ACTION_TYPES.every(type => normalizedTypes.includes(type));

  if (normalizedTypes.length === 0 || isLegacyDefault || isOlderLegacyDefault) {
    return [...EXTENDED_ACTION_TYPES];
  }

  return normalizedTypes;
}

/**
 * 🔔 HR Owner Notification Agent
 * خدمة إرسال إشعارات واتساب مخصصة لصاحب الشركة والمسؤولين
 * يدعم إرسال إشعارات لأكثر من شخص (Owner, Manager, HR Admin, etc.)
 */
class HROwnerNotificationAgent {
  /**
   * توليد وإرسال إشعار للمسؤولين (Owner + أي أرقام إضافية)
   * @param {Object} params
   * @param {string} params.companyId معرف الشركة
   * @param {string} params.employeeName اسم الموظف
   * @param {string} params.actionId معرف نوع الإجراء (PROMOTION, DEDUCTION, ADVANCE, LEAVE...)
   * @param {string} params.actionName اسم الإجراء بالعربية (اختياري)
   * @param {string} params.details تفاصيل الإجراء
   * @param {boolean} params.requiresApproval هل يتطلب موافقة؟
   * @param {string} params.ownerPhone رقم واتساب صاحب الشركة (اختياري)
   */
  static async sendOwnerNotification({ companyId, employeeName, actionId, actionName, details, requiresApproval, ownerPhone }) {
    try {
      const prisma = getSharedPrismaClient();

      // 1. Get HR Settings for the company
      const settings = await prisma.hRSettings.findUnique({
        where: { companyId }
      });

      // 2. Check if owner notifications are enabled
      if (settings && settings.aiOwnerNotificationsEnabled === false) {
        logger.info(`Owner WhatsApp notifications are disabled for company ${companyId}`);
        return { success: false, reason: 'disabled_in_settings' };
      }

      // 3. Check if this action type is enabled globally
      const finalActionId = actionId || 'OTHER';
      if (settings && settings.aiNotificationTypes) {
        try {
          const enabledTypes = normalizeEnabledActionTypes(settings.aiNotificationTypes);
            
          if (Array.isArray(enabledTypes) && !enabledTypes.includes('ALL') && !enabledTypes.includes(finalActionId)) {
            logger.info(`Action type ${finalActionId} is not enabled for company ${companyId}`);
            return { success: false, reason: 'action_type_not_enabled' };
          }
        } catch (e) {
          logger.warn(`Failed to parse enabled types for company ${companyId}: ${e.message}`);
        }
      }

      // 4. Build recipient list
      const recipients = this._buildRecipientList(settings, ownerPhone, companyId, finalActionId);

      if (recipients.length === 0) {
        // Fallback: try company phone
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { phone: true }
        });
        if (company && company.phone) {
          recipients.push({ name: 'Owner', phone: company.phone, types: ['ALL'] });
        } else {
          logger.warn(`No recipients found for company ${companyId}`);
          return { success: false, reason: 'no_recipients' };
        }
      }

      const hasConnectedSession = await this._hasConnectedWhatsAppSession(companyId, prisma);
      if (!hasConnectedSession) {
        logger.warn(`No connected WhatsApp session for company ${companyId}`);
        return {
          success: false,
          reason: 'no_session',
          totalRecipients: recipients.length,
          successCount: 0,
          results: recipients.map(recipient => ({
            recipient: recipient.name,
            phone: recipient.phone,
            success: false,
            reason: 'no_session'
          }))
        };
      }

      const tone = (settings && settings.aiNotificationTone) || 'PROFESSIONAL';
      const timestamp = new Date().toLocaleTimeString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const tonePrefix = tone === 'URGENT'
        ? 'تنبيه عاجل'
        : tone === 'FRIENDLY'
          ? 'إشعار إداري لطيف'
          : 'إشعار إداري';
      let generatedMessage = `${tonePrefix}:\nالموظف: ${employeeName}\nالنشاط: ${actionName || actionId || 'إجراء جديد'}\nالتفاصيل: ${details}\nالتاريخ: ${timestamp}`;
      if (requiresApproval) {
        generatedMessage += `\n\nهل توافق؟ رد بـ 'نعم' أو 'لا' مع سبب.`;
      }

      // 5. Send to ALL recipients
      const results = [];
      for (const recipient of recipients) {
        try {
          const notificationResult = await WhatsAppNotificationService.sendNotification({
            companyId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name || 'مسؤول',
            recipientType: 'ADMIN',
            category: 'HR',
            eventType: 'ANNOUNCEMENT',
            variables: {
              title: 'إشعار إداري',
              content: generatedMessage,
              signature: 'نظام الموارد البشرية'
            },
            priority: 1
          });

          const sendSucceeded = Boolean(notificationResult?.success);

          results.push({
            recipient: recipient.name,
            phone: recipient.phone,
            success: sendSucceeded,
            reason: sendSucceeded ? null : (notificationResult?.reason || 'send_failed'),
            result: notificationResult
          });

          if (sendSucceeded) {
            logger.info(`✅ Notification sent to ${recipient.name} (${recipient.phone})`);
          } else {
            logger.warn(
              `⚠️ Notification not delivered to ${recipient.name} (${recipient.phone}) بسبب ${notificationResult?.reason || 'send_failed'}`
            );
          }
        } catch (sendError) {
          results.push({
            recipient: recipient.name,
            phone: recipient.phone,
            success: false,
            reason: 'send_failed',
            error: sendError.message
          });
          logger.error(`❌ Failed to send to ${recipient.name} (${recipient.phone}): ${sendError.message}`);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureReasons = [...new Set(results.map(result => result.reason).filter(Boolean))];

      return {
        success: successCount > 0,
        reason: successCount > 0 ? null : (failureReasons[0] || 'send_failed'),
        totalRecipients: recipients.length,
        successCount,
        failureReasons,
        aiGeneratedText: generatedMessage,
        results
      };

    } catch (error) {
      logger.error(`Error generating/sending alert:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * بناء قائمة المستلمين من الإعدادات
   * @private
   */
  static _buildRecipientList(settings, ownerPhone, companyId, actionId) {
    const recipients = [];
    const addedPhones = new Set(); // لمنع التكرار

    // 1. إضافة الـ Owner Phone (backward compatibility)
    const mainOwnerPhone = ownerPhone || (settings && settings.ownerWhatsAppNumber);
    if (mainOwnerPhone) {
      const normalized = this._normalizePhone(mainOwnerPhone);
      if (normalized) {
        recipients.push({ name: 'Owner', phone: normalized, types: ['ALL'] });
        addedPhones.add(normalized);
      }
    }

    // 2. إضافة المستلمين الإضافيين من notificationRecipients
    if (settings && settings.notificationRecipients) {
      try {
        let recipientsList = settings.notificationRecipients;
        if (typeof recipientsList === 'string') {
          recipientsList = JSON.parse(recipientsList);
        }

        if (Array.isArray(recipientsList)) {
          for (const r of recipientsList) {
            if (!r.phone) continue;
            
            const normalized = this._normalizePhone(r.phone);
            if (!normalized || addedPhones.has(normalized)) continue;

            // Check if this recipient should receive this action type
            const types = Array.isArray(r.types) ? r.types : ['ALL'];
            if (types.includes('ALL') || types.includes(actionId)) {
              recipients.push({
                name: r.name || 'مسؤول',
                phone: normalized,
                types
              });
              addedPhones.add(normalized);
            }
          }
        }
      } catch (e) {
        logger.warn(`Failed to parse notificationRecipients for company ${companyId}: ${e.message}`);
      }
    }

    return recipients;
  }

  /**
   * تنظيف رقم الهاتف
   * @private
   */
  static _normalizePhone(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
    if (cleaned.length < 8) return null;
    return cleaned;
  }

  static async _hasConnectedWhatsAppSession(companyId, prisma) {
    if (!companyId) {
      return false;
    }

    const connectedSession = await prisma.whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED'
      },
      select: {
        id: true
      }
    });

    return Boolean(connectedSession?.id);
  }
}

module.exports = HROwnerNotificationAgent;
