/**
 * 🔔 WhatsApp Notification Controller
 * التحكم في إشعارات WhatsApp
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const { v4: uuidv4 } = require('uuid');

function buildQueuedSuccessMessage(result) {
  if (!result?.queueId) {
    return null;
  }

  if (!result?.scheduledAt) {
    return 'تمت جدولة الإشعار للإرسال لاحقاً';
  }

  const scheduledAt = new Date(result.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return 'تمت جدولة الإشعار للإرسال لاحقاً';
  }

  return `تمت جدولة الإشعار للإرسال في ${scheduledAt.toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short'
  })}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

async function getNotificationSettings(req, res) {
  try {
    const { companyId } = req.user;

    let settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId }
    }));

    if (!settings) {
      settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.create({
        data: {
          id: uuidv4(),
          companyId,
          updatedAt: new Date()
        }
      }));
    }

    const sessions = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findMany({
      where: { companyId },
      select: { id: true, name: true, phoneNumber: true, status: true }
    }));

    res.json({
      success: true,
      settings,
      sessions
    });
  } catch (error) {
    console.error('❌ Error getting notification settings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإعدادات' });
  }
}

async function updateNotificationSettings(req, res) {
  try {
    const { companyId } = req.user;

    const settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.upsert({
      where: { companyId },
      update: {
        ...req.body,
        updatedAt: new Date()
      },
      create: {
        id: uuidv4(),
        companyId,
        ...req.body,
        updatedAt: new Date()
      }
    }));

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإعدادات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 القوالب
// ═══════════════════════════════════════════════════════════════════════════════

async function getTemplates(req, res) {
  try {
    const { companyId } = req.user;
    const { category, eventType } = req.query;

    const where = { companyId };
    if (category) where.category = category;
    if (eventType) where.eventType = eventType;

    const templates = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { eventType: 'asc' }]
    }));

    const defaultTemplates = WhatsAppNotificationService.DEFAULT_TEMPLATES;
    const existingEvents = templates.map(t => t.eventType);

    const allTemplates = [...templates];

    for (const [evtType, template] of Object.entries(defaultTemplates)) {
      if (!existingEvents.includes(evtType)) {
        allTemplates.push({
          id: null,
          eventType: evtType,
          name: template.name,
          content: template.content,
          variables: JSON.stringify(template.variables),
          isDefault: true,
          isActive: true,
          category: getCategoryForEvent(evtType)
        });
      }
    }

    res.json({
      success: true,
      templates: allTemplates
    });
  } catch (error) {
    console.error('❌ Error getting templates:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القوالب' });
  }
}

async function getTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!template) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error getting template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القالب' });
  }
}

async function createTemplate(req, res) {
  try {
    const { companyId } = req.user;

    const {
      name,
      category,
      eventType,
      content,
      contentWithMedia,
      mediaUrl,
      mediaType,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isDefault
    } = req.body;

    if (!name || !category || !eventType || !content) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.create({
      data: {
        id: uuidv4(),
        companyId,
        name,
        category,
        eventType,
        content,
        contentWithMedia: contentWithMedia || false,
        mediaUrl,
        mediaType,
        hasButtons: hasButtons || false,
        buttons: buttons ? JSON.stringify(buttons) : null,
        hasList: hasList || false,
        listData: listData ? JSON.stringify(listData) : null,
        variables: variables ? JSON.stringify(variables) : null,
        isDefault: isDefault || false,
        updatedAt: new Date()
      }
    }));

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error creating template:', error);
    // Write detailed error to a file we can read
    try {
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, '../template_creation_error.log'), JSON.stringify({
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        requestBody: req.body
      }, null, 2));
    } catch (fsError) {}
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء القالب', details: error.message });
  }
}

async function updateTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const existing = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!existing) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    const {
      name,
      content,
      contentWithMedia,
      mediaUrl,
      mediaType,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isActive,
      isDefault
    } = req.body;

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id },
      data: {
        name,
        content,
        contentWithMedia,
        mediaUrl,
        mediaType,
        hasButtons,
        buttons: buttons ? JSON.stringify(buttons) : existing.buttons,
        hasList,
        listData: listData ? JSON.stringify(listData) : existing.listData,
        variables: variables ? JSON.stringify(variables) : existing.variables,
        isActive,
        isDefault,
        updatedAt: new Date()
      }
    }));

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث القالب' });
  }
}

async function deleteTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const existing = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!existing) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.delete({
      where: { id }
    }));

    res.json({
      success: true,
      message: 'تم حذف القالب بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف القالب' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 السجلات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

async function getNotificationLogs(req, res) {
  try {
    const { companyId } = req.user;
    const {
      page = 1,
      limit = 20,
      category,
      eventType,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    console.log('📊 [NOTIFICATION-LOGS] Fetching logs for company:', companyId);

    const where = { companyId };

    if (category) where.category = category;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { recipientPhone: { contains: search } },
        { recipientName: { contains: search } },
        { content: { contains: search } }
      ];
    }

    try {
      const [logs, total] = await Promise.all([
        safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          include: {
            whatsapp_notification_templates: { select: { name: true } },
            order: { select: { orderNumber: true } },
            customer: { select: { firstName: true, lastName: true } }
          }
        })),
        safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.count({ where }))
      ]);

      console.log('✅ [NOTIFICATION-LOGS] Found', total, 'logs');

      res.json({
        success: true,
        logs: logs || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total || 0,
          pages: Math.ceil((total || 0) / parseInt(limit))
        }
      });
    } catch (dbError) {
      console.error('❌ [NOTIFICATION-LOGS] Database error:', dbError.message);

      // Check if table doesn't exist
      if (dbError.message?.includes('does not exist') || dbError.code === 'P2021') {
        console.log('⚠️ [NOTIFICATION-LOGS] Table does not exist, returning empty results');
        return res.json({
          success: true,
          logs: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          },
          warning: 'جدول السجلات غير موجود بعد'
        });
      }

      throw dbError;
    }
  } catch (error) {
    console.error('❌ [NOTIFICATION-LOGS] Error getting notification logs:', error);
    console.error('❌ [NOTIFICATION-LOGS] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ أثناء جلب السجلات',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}

async function getNotificationStats(req, res) {
  try {
    const { companyId } = req.user;
    const { days = 30 } = req.query;

    const stats = await WhatsAppNotificationService.getNotificationStats(companyId, parseInt(days));

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 الإرسال اليدوي
// ═══════════════════════════════════════════════════════════════════════════════

async function sendManualNotification(req, res) {
  try {
    const { companyId } = req.user;
    const {
      recipientPhone,
      recipientName,
      category,
      eventType,
      content,
      variables,
      templateId
    } = req.body;

    if (!recipientPhone || !content) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    const result = await WhatsAppNotificationService.sendNotification({
      companyId,
      recipientPhone,
      recipientName,
      recipientType: 'CUSTOMER',
      category: category || 'SYSTEM',
      eventType: eventType || 'PROMOTIONAL',
      contentOverride: content,
      variables: variables || {},
      priority: 1
    });

    if (result.success) {
      const queuedMessage = buildQueuedSuccessMessage(result);
      res.json({
        success: true,
        message: queuedMessage || 'تم إرسال الإشعار بنجاح',
        notificationId: result.notificationId || null,
        queueId: result.queueId || null,
        scheduledAt: result.scheduledAt || null
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason,
        errorCode: result.errorCode || null,
        retryable: result.retryable || false,
        message: getErrorMessage(result.reason, result.retryable)
      });
    }
  } catch (error) {
    console.error('❌ Error sending manual notification:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإشعار' });
  }
}

async function sendTestNotification(req, res) {
  try {
    const { companyId } = req.user;

    // DEBUG: Log everything
    console.log('🔍 [TEST-NOTIFICATION] Raw Body:', JSON.stringify(req.body));
    console.log('🔍 [TEST-NOTIFICATION] Content-Type:', req.headers['content-type']);
    console.log('🔍 [TEST-NOTIFICATION] User:', req.user);

    const { phone, eventType } = req.body;

    console.log('📤 [TEST-NOTIFICATION] Parsed Request:', { phone, eventType, companyId });

    if (!phone || !eventType) {
      console.log('❌ [TEST-NOTIFICATION] Missing data:', { phone, eventType });
      return res.status(400).json({
        success: false,
        error: 'البيانات غير مكتملة',
        message: 'يرجى التأكد من إدخال رقم الهاتف ونوع الحدث',
        details: {
          receivedPhone: phone,
          receivedEventType: eventType,
          body: req.body
        }
      });
    }

    let settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId }
    }));

    if (!settings) {
      settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.create({
        data: {
          id: uuidv4(),
          companyId,
          updatedAt: new Date()
        }
      }));
    }

    console.log('⚙️ [TEST-NOTIFICATION] Settings:', {
      found: !!settings,
      defaultSessionId: settings?.defaultSessionId
    });

    if (!settings?.isEnabled) {
      console.log('❌ [TEST-NOTIFICATION] Notifications disabled for company:', companyId);
      return res.status(400).json({
        success: false,
        error: 'DISABLED',
        message: 'الإشعارات معطلة حالياً. يرجى تفعيل مفتاح "تفعيل الإشعارات" والضغط على زر "حفظ" أولاً.',
        details: { isEnabled: settings?.isEnabled }
      });
    }

    const testVariables = {
      customerName: 'روان حسين',
      customerPhone: '01281914482',
      email: 'rowan@example.com',
      companyName: 'شركة تجريبية',
      signupTypeLabel: 'تسجيل جديد',
      createdAt: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      employeeName: 'موظف اختباري',
      orderNumber: '12345',
      orderDate: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      orderItems: '\n📋 تفاصيل الطلب:\n1. فستان صيفي | اللون: أحمر | المقاس: XL | الكمية: 1\n',
      subtotal: '450',
      shipping: '50',
      total: '500',
      currency: 'EGP',
      productName: 'منتج اختباري',
      price: '100',
      itemCount: '3',
      trackingNumber: 'TRK123456',
      estimatedDays: '2-3',
      discount: '20',
      couponCode: 'TEST20',
      benefitTitle: 'ميزة تجريبية',
      benefitSummary: 'تم منحك مزايا إضافية لمدة شهر',
      planName: 'Pro',
      billingCycleLabel: 'شهري',
      monthlyFee: '299',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
      trialDays: '7',
      subscribedAt: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      sourceLabel: 'newsletter',
      startDate: new Date().toLocaleDateString('ar-EG'),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
      month: 'يناير',
      netSalary: '5000',
      startTime: '09:00',
      trackingLink: 'https://store.mokhtarelhenawy.online/track/12345'
    };

    if (eventType === 'OTP') {
      testVariables.otpCode = String(Math.floor(1000 + Math.random() * 9000));
    }

    console.log('📞 [TEST-NOTIFICATION] Calling service with:', {
      phone,
      eventType,
      category: getCategoryForEvent(eventType)
    });

    let recipientType = 'CUSTOMER';
    let recipientName = 'اختبار';
    let deliveryStrategy = 'company';

    if (eventType === 'NEW_SIGNUP_WELCOME' || eventType === 'BENEFIT_GRANTED') {
      recipientName = 'اختبار صاحب الشركة';
      deliveryStrategy = 'platform-only';
    } else if (eventType === 'NEW_SIGNUP_ADMIN_ALERT') {
      recipientType = 'ADMIN';
      recipientName = 'اختبار الإدارة';
      deliveryStrategy = 'platform-fallback';
    } else if (eventType.startsWith('SUBSCRIPTION_')) {
      recipientType = 'ADMIN';
      recipientName = 'اختبار الاشتراك';
      deliveryStrategy = 'platform-only';
    } else if (eventType === 'NEWSLETTER_SUBSCRIBED') {
      recipientName = 'اختبار النشرة';
      deliveryStrategy = 'platform-fallback';
    }

    const deliveryCompanyId = await WhatsAppNotificationService.resolveDeliveryCompanyId(
      companyId,
      deliveryStrategy,
    );

    const result = await WhatsAppNotificationService.sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone: phone,
      recipientName,
      recipientType,
      category: getCategoryForEvent(eventType),
      eventType,
      variables: testVariables,
      priority: 1
    });

    console.log('📊 [TEST-NOTIFICATION] Result:', result);

    if (result.success) {
      console.log('✅ [TEST-NOTIFICATION] Success');
      const queuedMessage = buildQueuedSuccessMessage(result);
      res.json({
        success: true,
        message: queuedMessage || 'تم إرسال الإشعار الاختباري بنجاح',
        queueId: result.queueId || null,
        scheduledAt: result.scheduledAt || null
      });
    } else {
      console.log('❌ [TEST-NOTIFICATION] Failed:', result.reason);
      res.status(400).json({
        success: false,
        error: result.reason,
        errorCode: result.errorCode || null,
        retryable: result.retryable || false,
        message: getErrorMessage(result.reason, result.retryable),
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإشعار الاختباري' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تفضيلات العملاء
// ═══════════════════════════════════════════════════════════════════════════════

async function getCustomerPreferences(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    let preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.findUnique({
      where: { companyId_customerId: { companyId, customerId } }
    }));

    if (!preferences) {
      const customer = await safeQuery(() => getSharedPrismaClient().customer.findFirst({
        where: { id: customerId, companyId },
        select: { phone: true }
      }));

      if (!customer) {
        return res.status(404).json({ error: 'العميل غير موجود' });
      }

      preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.create({
        data: {
          companyId,
          customerId,
          phone: customer.phone || ''
        }
      }));
    }

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('❌ Error getting customer preferences:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التفضيلات' });
  }
}

async function updateCustomerPreferences(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    const customer = await safeQuery(() => getSharedPrismaClient().customer.findFirst({
      where: { id: customerId, companyId }
    }));

    if (!customer) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.upsert({
      where: { companyId_customerId: { companyId, customerId } },
      update: req.body,
      create: {
        companyId,
        customerId,
        phone: customer.phone || '',
        ...req.body
      }
    }));

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('❌ Error updating customer preferences:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث التفضيلات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════════

function getCategoryForEvent(eventType) {
  if (eventType.startsWith('TASK_')) return 'TASKS';
  if (eventType.startsWith('ORDER_') || eventType.startsWith('PAYMENT_')) return 'ORDERS';
  if (eventType === 'NEW_SIGNUP_WELCOME') return 'CUSTOMER';
  if (
    eventType === 'NEW_SIGNUP_ADMIN_ALERT' ||
    eventType.startsWith('SUBSCRIPTION_') ||
    eventType === 'BENEFIT_GRANTED'
  ) {
    return 'SYSTEM';
  }
  if (eventType === 'NEWSLETTER_SUBSCRIBED') return 'MARKETING';
  if (eventType.startsWith('CART_')) return 'ABANDONED_CART';
  if (eventType.startsWith('BACK_IN_STOCK') || eventType.startsWith('PRICE_') || eventType.startsWith('NEW_PRODUCT') || eventType === 'LOW_STOCK_ALERT') return 'PRODUCTS';
  if (eventType.startsWith('ATTENDANCE_') || eventType.startsWith('LEAVE_') || eventType.startsWith('PAYROLL') || eventType.startsWith('BIRTHDAY_EMPLOYEE') || eventType.startsWith('WARNING_') || eventType.startsWith('ANNOUNCEMENT')) return 'HR';
  if (eventType === 'OTP') return 'SYSTEM';
  return 'MARKETING';
}

function getErrorMessage(reason, retryable = false) {
  const { t } = require('../services/i18n');
  const key = `whatsapp.${reason}`;
  const translated = t(key);
  if (translated !== key) {
    const hint = retryable ? t('whatsapp.retry_hint') : t('whatsapp.no_retry_hint');
    return `${translated}. ${hint}`;
  }
  return t('whatsapp.unknown_error') || 'حدث خطأ غير معروف';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ☁️ نشر قالب محلي على ميتا
// ═══════════════════════════════════════════════════════════════════════════════

async function publishTemplateToMeta(req, res) {
  try {
    const { companyId } = req.user;
    const templateId = req.params.id || req.body.templateId;
    const { sessionId } = req.body;

    if (!templateId || !sessionId) {
      return res.status(400).json({ error: 'templateId و sessionId مطلوبان' });
    }

    // 1. جلب القالب المحلي
    const localTemplate = await getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id: templateId, companyId }
    });
    if (!localTemplate) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    // 2. التحقق من الجلسة
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: sessionId, companyId, provider: 'META_CLOUD' }
    });
    if (!session) {
      return res.status(400).json({ error: 'جلسة ميتا غير موجودة' });
    }

    // 3. تحويل القالب المحلي لصيغة ميتا
    let metaName = (localTemplate.metaTemplateName || localTemplate.eventType || localTemplate.name)
      .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);

    const metaCategory = localTemplate.category === 'MARKETING' ? 'MARKETING'
      : localTemplate.category === 'AUTHENTICATION' ? 'AUTHENTICATION'
      : 'UTILITY';

    // تحويل متغيرات القالب لصيغة ميتا الموضعية {{1}}, {{2}}, {{3}} ...
    // ميتا تقبل فقط أرقاماً متسلسلة داخل قوسين مجعدين، وترفض الأسماء ({{customerName}})
    // والأقواس الثلاثية الناتجة عن عدم تطبيع الأقواس.
    const variableIndex = {};
    const bodyText = (localTemplate.content || '')
      // توحيد الأقواس المفردة {var} إلى صيغة {{var}} دون كسر الأقواس المزدوجة الموجودة
      .replace(/(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}')
      // تحويل المتغيرات المسماة إلى أرقام موضعية حسب ترتيب الظهور
      .replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, name) => {
        if (!(name in variableIndex)) variableIndex[name] = Object.keys(variableIndex).length + 1;
        return `{{${variableIndex[name]}}}`;
      });

    const components = [{ type: 'BODY', text: bodyText }];

    if (localTemplate.hasButtons && localTemplate.buttons) {
      try {
        const btns = typeof localTemplate.buttons === 'string'
          ? JSON.parse(localTemplate.buttons) : localTemplate.buttons;
        const quickReplies = btns.map(b => ({
          type: 'QUICK_REPLY',
          text: b.text
        }));
        if (quickReplies.length > 0) {
          components.push({ type: 'BUTTONS', buttons: quickReplies });
        }
      } catch (e) { /* skip invalid buttons */ }
    }

    // 4. إنشاء القالب في ميتا
    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');

    let result;
    try {
      result = await MetaCloudProvider.createTemplate(sessionId, {
        name: metaName,
        language: 'ar',
        category: metaCategory,
        components
      });
    } catch (createError) {
      // اسم القالب محجوز في ميتا (حتى لو كان مرفوضاً) → نعيد المحاولة باسم فريد
      const errorText = String(createError?.response?.data?.error?.code || createError?.response?.data?.error?.message || createError?.message || '');
      const isNameConflict = /131047|already\s*(?:in\s*use|exist)|name.*use|duplicate/i.test(errorText);
      if (!isNameConflict) throw createError;

      metaName = `${metaName}_${Date.now().toString(36)}`.slice(0, 512);
      console.warn(`☁️ [PUBLISH-TO-META] Name conflict, retrying with "${metaName}"`);
      result = await MetaCloudProvider.createTemplate(sessionId, {
        name: metaName,
        language: 'ar',
        category: metaCategory,
        components
      });
    }

    // حفظ ترتيب المتغيرات ({{1}} = اسم المتغير) لاستخدامها عند الإرسال عبر ميتا لاحقاً
    const variableOrder = Object.keys(variableIndex).length > 0
      ? JSON.stringify(
          Object.entries(variableIndex)
            .sort((a, b) => a[1] - b[1])
            .map(([name, position]) => ({ position, name }))
        )
      : null;

    // 5. تحديث القالب المحلي ببيانات ميتا
    await getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id: templateId },
      data: {
        metaTemplateName: metaName,
        metaTemplateLanguage: 'ar',
        metaTemplateStatus: 'PENDING',
        variables: variableOrder || localTemplate.variables,
        updatedAt: new Date()
      }
    });

    console.log(`☁️ [PUBLISH-TO-META] Template "${localTemplate.name}" → "${metaName}" (${metaCategory}) — ${result?.id ? 'created' : 'submitted'}`);

    res.json({
      success: true,
      metaTemplateName: metaName,
      metaCategory,
      metaResult: result,
      message: 'تم إرسال القالب لميتا للمراجعة. سيتم تفعيله بعد الموافقة.'
    });
  } catch (error) {
    console.error('❌ Error publishing template to Meta:', error?.response?.data || error.message);
    const metaError = error?.response?.data?.error;
    res.status(500).json({
      error: metaError
        ? `${metaError.message || 'Meta API error'}${metaError.error_user_msg ? ': ' + metaError.error_user_msg : ''}`
        : error.message
    });
  }
}

async function checkMetaTemplateStatus(sessionId, templateName) {
  try {
    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
    const templates = await MetaCloudProvider.listTemplates(sessionId);
    const found = templates.find(t => t.name === templateName);
    return found ? found.status : null;
  } catch { return null; }
}

async function syncTemplateStatuses(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId مطلوب' });

    const localTemplates = await getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where: { companyId, metaTemplateName: { not: null } }
    });

    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
    const metaTemplates = await MetaCloudProvider.listTemplates(sessionId);

    let updated = 0;
    for (const local of localTemplates) {
      const meta = metaTemplates.find(t => t.name === local.metaTemplateName);
      if (meta && meta.status !== local.metaTemplateStatus) {
        await getSharedPrismaClient().whatsAppNotificationTemplate.update({
          where: { id: local.id },
          data: { metaTemplateStatus: meta.status, updatedAt: new Date() }
        });
        updated++;
      }
    }

    res.json({ success: true, synced: updated });
  } catch (error) {
    console.error('❌ Error syncing template statuses:', error);
    res.status(500).json({ error: error.message });
  }
}

async function sendOrderConfirmationMeta(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { sessionId, to, orderNumber, customerName, total, currency, orderId } = req.body;

    if (!sessionId || !to || !orderNumber) {
      return res.status(400).json({ error: 'sessionId, to, orderNumber مطلوبون' });
    }

    // 1. جلب القالب المحلي من نوع ORDER_CONFIRMED
    const template = await getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType: 'ORDER_CONFIRMED', metaTemplateName: { not: null } },
      orderBy: { updatedAt: 'desc' }
    });

    if (!template) {
      return res.status(400).json({ error: 'لا يوجد قالب ORDER_CONFIRMED منشور على ميتا. انشر القالب أولاً.' });
    }

    // 2. تجهيز الـ components
    const components = [{
      type: 'BODY',
      parameters: [
        { type: 'text', text: customerName || 'عميلنا العزيز' },
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(total || '') },
        { type: 'text', text: currency || 'ج.م' }
      ]
    }];

    // 3. إرسال عبر WhatsAppMessageHandler
    const { WhatsAppMessageHandler } = require('../services/whatsapp');
    const result = await WhatsAppMessageHandler.sendTemplateMessage(sessionId, to, template.metaTemplateName, {
      name: template.metaTemplateName,
      language: template.metaTemplateLanguage || 'ar',
      components
    }, {
      templateBody: template.content,
      senderId: userId
    });

    res.json({ success: true, message: result });
  } catch (error) {
    console.error('❌ Error sending order confirmation:', error?.response?.data || error.message);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إرسال تأكيد الطلب' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 التصدير
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getNotificationLogs,
  getNotificationStats,
  sendManualNotification,
  sendTestNotification,
  getCustomerPreferences,
  updateCustomerPreferences,
  publishTemplateToMeta,
  syncTemplateStatuses,
  sendOrderConfirmationMeta
};
