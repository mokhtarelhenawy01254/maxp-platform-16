/**
 * 🔔 WhatsApp Notification Controller
 * التحكم في إشعارات WhatsApp
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const { v4: uuidv4 } = require('uuid');
const { mapVariablesByOrder, extractLocalVariableOrder } = require('../utils/metaTemplateVariables');
const { buildMetaTemplatePayload } = require('../utils/metaTemplatePayload');
const { isOrderCategory, VALID_WHATSAPP_EVENT_TYPES } = require('../services/whatsapp/notificationTypes');

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
      select: { id: true, name: true, phoneNumber: true, status: true, provider: true }
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
    const { category, eventType, includeOrders, metaOnly } = req.query;
    const shouldIncludeOrders = includeOrders === 'true' || category === 'ORDERS' || category === 'META';

    const ORDER_TAB_EVENT_TYPES = [
      'CART_ABANDONED_1H',
      'CART_ABANDONED_24H',
      'CART_ABANDONED_72H',
      'CART_ABANDONED_WITH_DISCOUNT',
      'INCOMPLETE_CART_FIRST_APPEARANCE',
    ];

    const where = { companyId };
    if (category && category !== 'ALL' && category !== 'META') where.category = category;
    if (eventType) where.eventType = eventType;
    else if (!shouldIncludeOrders) where.eventType = { notIn: ORDER_TAB_EVENT_TYPES };

    if (metaOnly === 'true' || category === 'META') {
      where.OR = [
        { metaTemplateName: { not: null } },
        { channel: 'META_CLOUD' }
      ];
    }

    const templates = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where: {
        ...where,
        ...(shouldIncludeOrders || category ? {} : { category: { not: 'ORDERS' } })
      },
      orderBy: [{ category: 'asc' }, { eventType: 'asc' }]
    }));

    // لو الطلب يخص قوالب ميتا فقط، لا نضيف قوالب افتراضية وهمية غير معتمدة
    if (metaOnly === 'true' || category === 'META') {
      return res.json({
        success: true,
        templates
      });
    }

    const defaultTemplates = WhatsAppNotificationService.DEFAULT_TEMPLATES;
    // نتخطى القالب الافتراضي فقط لو فيه قالب "عادي" فعلي (BAILEYS/AUTO) للحدث.
    // قالب ميتا فقط (META_CLOUD) لا يمنع ظهور القالب الافتراضي في الكارد العادي.
    const hasRegularForEvent = (evtType) =>
      templates.some(
        (t) =>
          t.eventType === evtType &&
          (!t.channel || ['BAILEYS', 'AUTO'].includes(String(t.channel).toUpperCase())),
      );

    const allTemplates = [...templates];

    for (const [evtType, template] of Object.entries(defaultTemplates)) {
      if (hasRegularForEvent(evtType)) continue;
      if (eventType && evtType !== eventType) continue;
      if (!eventType && !shouldIncludeOrders && ORDER_TAB_EVENT_TYPES.includes(evtType)) continue;
      const templateCategory = getCategoryForEvent(evtType);
      if (!category && !shouldIncludeOrders && templateCategory === 'ORDERS') continue;
      if (category && category !== 'ALL' && templateCategory !== category) continue;
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
      headerFormat,
      headerMediaHandle,
      headerUsesOrderProduct,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isDefault,
      channel
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
        headerFormat,
        headerMediaHandle,
        headerUsesOrderProduct: headerUsesOrderProduct === true || headerUsesOrderProduct === 'true',
        hasButtons: hasButtons || false,
        buttons: buttons ? JSON.stringify(buttons) : null,
        hasList: hasList || false,
        listData: listData ? JSON.stringify(listData) : null,
        variables: variables ? JSON.stringify(variables) : null,
        channel: channel || 'AUTO',
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
      headerFormat,
      headerMediaHandle,
      headerUsesOrderProduct,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isActive,
      isDefault,
      channel,
      metaTemplateName,
      metaTemplateId,
      metaTemplateStatus
    } = req.body;

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id },
      data: {
        name,
        content,
        contentWithMedia,
        mediaUrl,
        mediaType,
        headerFormat,
        headerMediaHandle,
        headerUsesOrderProduct: headerUsesOrderProduct !== undefined
          ? (headerUsesOrderProduct === true || headerUsesOrderProduct === 'true')
          : existing.headerUsesOrderProduct,
        hasButtons,
        buttons: buttons ? JSON.stringify(buttons) : existing.buttons,
        hasList,
        listData: listData ? JSON.stringify(listData) : existing.listData,
        variables: variables ? JSON.stringify(variables) : existing.variables,
        channel: channel !== undefined ? channel : existing.channel,
        isActive,
        isDefault,
        metaTemplateName,
        metaTemplateId,
        metaTemplateStatus,
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
            whatsapp_notification_templates: {
              select: { name: true, metaTemplateName: true, channel: true }
            },
            order: { select: { orderNumber: true, total: true } },
            customer: { select: { firstName: true, lastName: true } }
          }
        })),
        safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.count({ where }))
      ]);

      // جلب أسماء الجلسات للـ sessionIds الموجودة في اللوج
      const sessionIds = [...new Set((logs || []).map((l) => l.sessionId).filter(Boolean))];
      let sessionsMap = {};
      if (sessionIds.length > 0) {
        try {
          const sessions = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findMany({
            where: { id: { in: sessionIds } },
            select: { id: true, name: true, phoneNumber: true, provider: true }
          }));
          sessionsMap = Object.fromEntries((sessions || []).map((s) => [s.id, s]));
        } catch (e) {
          console.error('⚠️ [NOTIFICATION-LOGS] Failed to load session names:', e.message);
        }
      }

      // إضافة اسم القالب من حقل الربط (القالب الذي يستخدمه الإشعار)
      const enrichedLogs = (logs || []).map((log) => {
        const session = sessionsMap[log.sessionId] || {};
        return {
          ...log,
          templateName: log.whatsapp_notification_templates?.name || null,
          metaTemplateName: log.whatsapp_notification_templates?.metaTemplateName || null,
          templateChannel: log.whatsapp_notification_templates?.channel || null,
          orderNumber: log.order?.orderNumber || null,
          orderTotal: log.order?.total != null ? String(log.order.total) : null,
          sessionName: session?.name || null,
          sessionPhone: session?.phoneNumber || null,
          sessionProvider: session?.provider || null,
          customerFirstName: log.customer?.firstName || null,
          customerLastName: log.customer?.lastName || null,
          whatsapp_notification_templates: undefined,
          order: undefined,
          customer: undefined
        };
      });

      console.log('✅ [NOTIFICATION-LOGS] Found', total, 'logs');

      res.json({
        success: true,
        logs: enrichedLogs || [],
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

async function getStatusReport(req, res) {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, eventType, eventTypes, status, type, category, page = 1, limit = 50 } = req.query;

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = endDate ? new Date(endDate) : now;
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    // category بس مش startsWith — eventType حقل enum في Prisma و enum مابيدعمش startsWith
    // (بيدي 500 "Unknown argument"). كل إشعارات حالات الطلبات بتتخزن بـ category
    // ORDER / ORDERS / ABANDONED_CART فعلاً.
    // لو اتبعت category في الـ query (مفصولة بفواصل — زي إشعارات العملاء MARKETING)
    // نستخدمها بدل فئات الطلبات الافتراضية.
    const categories = String(category || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // لو اتبعت eventTypes (مفصولة بفواصل — زي أحداث إشعارات العملاء الـ 13)
    // نضيّق على الأحداث دي بالظبط بدل فلترة الفئة.
    // 🛡️ نفلتر أولاً على القيم الصالحة بس في enum السجل — الأحداث اللي مش enum
    // (مثل AUTO_DISCOUNT_* اللي بتتخزن فعلاً كـ ANNOUNCEMENT) هتفشل الـ query لو وصلت لـ Prisma.
    const validEventTypes = VALID_WHATSAPP_EVENT_TYPES;
    const eventTypeList = String(eventTypes || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .filter((e) => validEventTypes.has(e));

    const where = {
      companyId,
      createdAt: { gte: start, lte: endOfDay },
    };

    if (eventTypeList.length > 0) {
      where.eventType = { in: eventTypeList };
    } else if (categories.length > 0) {
      where.category = { in: categories };
    } else {
      where.OR = [
        { category: 'ORDERS' },
        { category: 'ORDER' },
        { category: 'ABANDONED_CART' },
      ];
    }

    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const prisma = getSharedPrismaClient();
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));

    try {
      const [logs, total] = await Promise.all([
        safeQuery(() => prisma.whatsAppNotificationLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: {
            whatsapp_notification_templates: {
              select: { name: true, metaTemplateName: true, channel: true, headerUsesOrderProduct: true },
            },
            order: { select: { orderNumber: true } },
            customer: { select: { firstName: true, lastName: true } },
          },
        })),
        safeQuery(() => prisma.whatsAppNotificationLog.count({ where })),
      ]);

      const items = (logs || []).map((log) => {
        const customerName = log.recipientName
          || [log.customer?.firstName, log.customer?.lastName].filter(Boolean).join(' ')
          || null;
        return {
          id: log.id,
          eventType: log.eventType,
          orderId: log.orderId,
          orderNumber: log.order?.orderNumber || null,
          customerName,
          recipientPhone: log.recipientPhone,
          templateId: log.templateId,
          templateName: log.whatsapp_notification_templates?.name || null,
          metaTemplateName: log.whatsapp_notification_templates?.metaTemplateName || null,
          templateChannel: log.whatsapp_notification_templates?.channel || null,
          headerUsesOrderProduct: log.whatsapp_notification_templates?.headerUsesOrderProduct ?? null,
          messageType: log.messageType || 'TEXT',
          status: log.status,
          sentAt: log.sentAt,
          createdAt: log.createdAt,
          failureReason: log.failureReason,
          errorCode: log.errorCode,
        };
      });

      const summary = { total: 0, meta: 0, regular: 0, delivered: 0, sent: 0, read: 0, failed: 0, pending: 0 };
      const byEventMap = new Map();
      for (const log of logs || []) {
        const ev = log.eventType || 'OTHER';
        if (!byEventMap.has(ev)) {
          byEventMap.set(ev, { eventType: ev, total: 0, meta: 0, regular: 0, delivered: 0, sent: 0, read: 0, failed: 0, pending: 0 });
        }
        const agg = byEventMap.get(ev);
        const isMeta = String(log.messageType || 'TEXT').toUpperCase() === 'TEMPLATE';
        const st = String(log.status || '').toUpperCase();

        agg.total += 1;
        if (isMeta) agg.meta += 1; else agg.regular += 1;
        if (st === 'DELIVERED') agg.delivered += 1;
        if (st === 'SENT') agg.sent += 1;
        if (st === 'READ') agg.read += 1;
        if (st === 'FAILED') agg.failed += 1;
        if (st === 'PENDING') agg.pending += 1;

        summary.total += 1;
        if (isMeta) summary.meta += 1; else summary.regular += 1;
        if (st === 'DELIVERED') summary.delivered += 1;
        if (st === 'SENT') summary.sent += 1;
        if (st === 'READ') summary.read += 1;
        if (st === 'FAILED') summary.failed += 1;
        if (st === 'PENDING') summary.pending += 1;
      }

      // فلترة التجميع حسب نوع الإرسال (meta/regular) لو اترسلت في الـ query
      const typeFilter = String(type || '').toUpperCase();
      let byStatus = Array.from(byEventMap.values()).sort((a, b) => b.total - a.total);
      if (typeFilter === 'META' || typeFilter === 'REGULAR') {
        byStatus = byStatus.map((row) => ({
          ...row,
          total: typeFilter === 'META' ? row.meta : row.regular,
          meta: typeFilter === 'META' ? row.meta : 0,
          regular: typeFilter === 'REGULAR' ? row.regular : 0,
        }));
      }

      res.json({
        success: true,
        range: { startDate: start, endDate: endOfDay },
        summary,
        byStatus,
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total || 0,
          pages: Math.ceil((total || 0) / limitNum),
        },
      });
    } catch (dbError) {
      if (dbError.message?.includes('does not exist') || dbError.code === 'P2021') {
        return res.json({
          success: true,
          range: { startDate: start, endDate: endOfDay },
          summary: { total: 0, meta: 0, regular: 0, delivered: 0, sent: 0, read: 0, failed: 0, pending: 0 },
          byStatus: [],
          items: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
          warning: 'جدول السجلات غير موجود بعد',
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('❌ [STATUS-REPORT] Error getting status report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب تقرير الحالات' });
  }
}

// 📊 إحصائيات لكل قالب — تجميع من اللوجات حسب templateId (لتحليل كل قالب على حدة)
async function getTemplateStats(req, res) {
  try {
    const { companyId } = req.user;
    const { days = 30, startDate, endDate } = req.query;

    const createdAtFilter = {};
    if (startDate) { createdAtFilter.gte = new Date(startDate); } else {
      const d = new Date(); d.setDate(d.getDate() - parseInt(days, 10) || 30); createdAtFilter.gte = d;
    }
    if (endDate) { createdAtFilter.lte = new Date(endDate); }

    const prisma = getSharedPrismaClient();
    // delivered/read قيم مشتقة من status (DELIVERED/READ) — groupBy واحد بالـ status يكفي
    const byStatus = await safeQuery(() => prisma.whatsAppNotificationLog.groupBy({
      by: ['templateId', 'status'],
      where: { companyId, createdAt: createdAtFilter, templateId: { not: null } },
      _count: { _all: true },
      _sum: { cost: true }
    }));

    // تجميع per-template: total/delivered/read/failed/cost
    const acc = new Map();
    for (const g of byStatus) {
      const key = g.templateId;
      if (!acc.has(key)) {
        acc.set(key, { templateId: key, total: 0, delivered: 0, read: 0, failed: 0, cost: 0 });
      }
      const item = acc.get(key);
      const count = g._count?._all || 0;
      item.total += count;
      if (g.status === 'DELIVERED' || g.status === 'READ') item.delivered += count;
      if (g.status === 'READ') item.read += count;
      if (g.status === 'FAILED') item.failed += count;
      item.cost += Number(g._sum?.cost || 0);
    }

    // التفاعل (clicked/responded booleans) — count مباشر لكل templateId
    const interacted = await safeQuery(() => prisma.whatsAppNotificationLog.groupBy({
      by: ['templateId'],
      where: {
        companyId, createdAt: createdAtFilter, templateId: { not: null },
        OR: [{ clicked: true }, { responded: true }]
      },
      _count: { _all: true }
    }));
    const interactMap = interacted.reduce((m, g) => { m[g.templateId] = g._count?._all || 0; return m; }, {});

    // eventHint: أكثر eventType متكرر لكل templateId — عرض بديل لما القالب يكون اتمسح من القوالب
    const byEvent = await safeQuery(() => prisma.whatsAppNotificationLog.groupBy({
      by: ['templateId', 'eventType'],
      where: { companyId, createdAt: createdAtFilter, templateId: { not: null } },
      _count: { _all: true }
    }));
    const eventHintMap = new Map();
    for (const g of byEvent) {
      const cur = eventHintMap.get(g.templateId);
      const count = g._count?._all || 0;
      if (!cur || count > cur.count) eventHintMap.set(g.templateId, { eventType: g.eventType, count });
    }

    const stats = Array.from(acc.values()).map((item) => ({
      ...item,
      eventHint: eventHintMap.get(item.templateId)?.eventType || null,
      clicked: interactMap[item.templateId] || 0,
      responded: interactMap[item.templateId] || 0,
      deliveryRate: item.total > 0 ? ((item.delivered / item.total) * 100).toFixed(1) : '0.0',
      readRate: item.delivered > 0 ? ((item.read / item.delivered) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.total - a.total);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting template stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات القوالب' });
  }
}

async function getNotificationStats(req, res) {
  try {
    const { companyId } = req.user;
    const { days = 30, startDate, endDate } = req.query;

    const stats = await WhatsAppNotificationService.getNotificationStats(companyId, parseInt(days), startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3):
// إحصائيات طابور الإشعارات (WhatsAppNotificationQueue) — يعرض العالقين حسب الحالة
// والعمر، ومؤشر healthy. لمراقبة الطابور بعد تفعيله (§1.1).
async function getNotificationQueueStats(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const [pending, processing, sent, failed, cancelled, overdue] = await Promise.all([
      prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PENDING' } }),
      prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PROCESSING' } }),
      prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'SENT' } }),
      prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'FAILED' } }),
      prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'CANCELLED' } }),
      // overdue = PENDING مستحقة لم تُعالج منذ > 2 دقيقة (مؤشر صحة الطابور)
      prisma.whatsAppNotificationQueue.count({
        where: { companyId, status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - 120000) } },
      }),
    ]);

    res.json({ success: true, stats: { pending, processing, sent, failed, cancelled, overdue, healthy: overdue === 0 } });
  } catch (error) {
    console.error('❌ Error getting notification queue stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات الطابور' });
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

    // 🛡️ PRODUCTION-FIX (2026-08-27): customerName في الـ test كان ثابت ('روان حسين')
    // فيبان في كل الرسايل التجريبية كأنه اسم العميل. نجيب الاسم الحقيقي من
    // رقم التليفون لو موجود في الـ DB، وإلا نستخدم اسم محايد للاختبار.
    let testCustomerName = 'عميل اختباري';
    try {
      const formattedTestPhone = (phone || '').replace(/\D/g, '');
      if (formattedTestPhone) {
        const cust = await safeQuery(() => getSharedPrismaClient().customer.findFirst({
          where: { phone: formattedTestPhone, companyId },
          select: { firstName: true, lastName: true }
        }));
        if (cust?.firstName) {
          testCustomerName = `${cust.firstName} ${cust.lastName || ''}`.trim();
        }
      }
    } catch { /* غير حرج — نقع على الاسم المحايد */ }

    // 🛡️ PRODUCTION-FIX (2026-08-29): نبني متغيرات القالب أوتوماتيكياً من الـ DB
    // عشان أي قالب جديد (معتمد) يشتغل في الـ test من غير ما نعدل الـ testVariables يدوياً.
    // نقرأ variables المخزنة للقالب (eventType + companyId) ونبعت قيمة افتراضية
    // منطقية لكل متغير، ثم ندمجها فوق الـ testVariables اليدوية المعروفة.
    const autoVars = {};
    try {
      const dbTpl = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
        where: {
          companyId,
          eventType,
          isActive: true,
          OR: [
            { channel: 'META_CLOUD' },
            { channel: 'AUTO' },
            { metaTemplateStatus: 'APPROVED' }
          ]
        },
        orderBy: [{ metaTemplateStatus: 'asc' }, { updatedAt: 'desc' }],
        select: { variables: true }
      }));
      if (dbTpl?.variables) {
        let parsed = null;
        try { parsed = typeof dbTpl.variables === 'string' ? JSON.parse(dbTpl.variables) : dbTpl.variables; } catch { parsed = null; }
        if (Array.isArray(parsed)) {
          for (const v of parsed) {
            const name = typeof v === 'string' ? v : v?.name;
            if (!name) continue;
            const n = String(name).toLowerCase();
            let def = '—';
            if (n.includes('date') || n.includes('time')) def = '2026-12-31';
            else if (n.includes('point') || n.includes('balance') || n.includes('amount') || n.includes('cash') || n.includes('price') || n.includes('total') || n.includes('subtotal') || n.includes('discount') || n.includes('fee') || n.includes('salary')) def = '100';
            else if (n.includes('tier') || n.includes('level') || n.includes('rank')) def = 'العضوية الذهبية';
            else if (n.includes('name')) def = testCustomerName;
            else if (n.includes('count') || n.includes('number') || n.includes('qty')) def = '1';
            else if (n.includes('link') || n.includes('url')) def = 'https://example.com';
            else if (n.includes('percent')) def = '10';
            else if (n.includes('day')) def = '5';
            autoVars[name] = def;
          }
        }
      }
    } catch { /* غير حرج */ }

    const testVariables = {
      customerName: testCustomerName,
      reason: 'مناسبة سعيدة',
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
      cashAmount: '25',
      balance: '75.00',
      points: '120',
      currentPoints: '80',
      expiryDate: '2026-12-31',
      tierName: 'العضوية الذهبية',
      currentTier: 'الفضية',
      programName: 'برنامج ولاء سوان',
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
      trackingLink: 'https://store.example.com/track/12345'
    };

    // 🛡️ ندمج الـ autoVars (المبنية من الـ DB) فوق الـ testVariables اليدوية —
    // أي متغير في الـ DB مش موجود في الـ testVariables بياخد قيمته الأوتوماتيكية.
    // كده أي قالب جديد معتمد يشتغل في الـ test من غير تعديل يدوي.
    Object.assign(testVariables, autoVars);

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
    } else if (eventType.startsWith('CUSTOMER_OCCASION') || eventType === 'OCCASION_CAMPAIGN' || eventType === 'BIRTHDAY_WISH' || eventType.startsWith('POST_DELIVERY') || eventType.startsWith('CATEGORY_FOLLOWUP') || eventType.startsWith('AUTO_DISCOUNT_') || eventType.startsWith('CASHBACK_') || eventType.startsWith('LOYALTY_') || eventType.startsWith('CUSTOMER_QUALITY_')) {
      // 🚨 PRODUCTION-FIX (platform-fallback-2026-08-24): السلاسل/المناسبات/عيد الميلاد/
      // الخصم التلقائي/الكاش باك/الولاء/التقسيم — كلها ممكن تتعمل من شركة فرعية مفيش
      // ليها جلسة Meta — نستخدم platform-fallback عشان نبعت من الشركة الأم (اللي عندها
      // META_CLOUD متصل، زي Swan).
      deliveryStrategy = 'platform-fallback';
    }

    const deliveryCompanyId = await WhatsAppNotificationService.resolveDeliveryCompanyId(
      companyId,
      deliveryStrategy,
    );

    // 🔍 DIAG (2026-08-26): اطبع المعطيات قبل الإرسال عشان نعرف ليه بيرفض
    console.log('🔍 [TEST-NOTIFICATION] DIAG:', {
      companyId,
      deliveryCompanyId,
      eventType,
      deliveryStrategy,
      hasDefaultSession: !!settings?.defaultSessionId
    });

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
        // 🚨 PRODUCTION-FIX (meta-only-approved-2026-08-25): نفضل الـ message المخصص
        // من الـ service (زي "قالب ميتا ... لازم يكون APPROVED") لو موجود، وإلا
        // نستخدم الـ generic mapper.
        message: result.message || getErrorMessage(result.reason, result.retryable),
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
  // الحالات الخام لحالات الطلبات (delivered/confirmed/returned...) مش بتبدأ بـ ORDER_
  // وكانت بتقع في الـ default MARKETING — تصنيفها الصحيح ORDERS (رسالة حالة طلب).
  if (isOrderCategory(null, eventType)) return 'ORDERS';
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
  if (eventType === 'INCOMPLETE_CART_FIRST_APPEARANCE') return 'ABANDONED_CART';
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

/**
 * إنشاء قالب جديد في ميتا بمحتوى القالب المحلي الحالي.
 * ميتا تقفل محتوى القوالب المعتمدة — لا يمكن تعديل body/header/footer لقالب APPROVED
 * بنفس اللغة (code 100 / subcode 2388024، أو 2500 عند محاولة التعديل عبر الـ ID).
 * الحل الوحيد المعتمد من ميتا: إنشاء قالب جديد باسم فريد ثم ربط القالب المحلي به.
 *
 * Returns { result, metaName, built, metaCategory, metaPadding }
 */
async function createMetaTemplateFromLocal(sessionId, localTemplate, categoryOverride = null) {
  // الشركة مطلوبة لبناء رابط صفحة العميل (الساب دومين) في زرار URL
  const company = await getSharedPrismaClient().company.findUnique({
    where: { id: localTemplate.companyId },
    select: { id: true, slug: true, customDomain: true }
  }).catch(() => null);

  const built = buildMetaTemplatePayload(localTemplate, company);
  const metaCategory = categoryOverride || built.metaCategory;
  const bodyText = built.bodyText;
  const buttonsComponent = built.buttonsComponent;
  const headerComponent = built.headerComponent;
  const variableCount = built.variableCount;
  const variableOrder = built.variableOrder;

  const baseName = (localTemplate.metaTemplateName || localTemplate.eventType || localTemplate.name)
    .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 480);

  const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');

  const bodyWithExample = {
    type: 'BODY',
    text: bodyText,
    example: { body_text: [Array.from({ length: variableCount }, (_, i) => `قيمة ${i + 1}`)] }
  };
  const bodyPlain = { type: 'BODY', text: bodyText };

  // الـ HEADER (وسائط) يأتي أولاً في components — ميتا تتطلب أن يكون أول component
  const withHeader = (comps) => headerComponent ? [headerComponent, ...comps] : comps;

  const variants = [];
  if (buttonsComponent) {
    variants.push({ label: 'buttons+example', components: withHeader([bodyWithExample, buttonsComponent]) });
    variants.push({ label: 'buttons', components: withHeader([bodyPlain, buttonsComponent]) });
  }
  variants.push({ label: 'body+example', components: withHeader([bodyWithExample]) });
  variants.push({ label: 'body', components: withHeader([bodyPlain]) });

  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Meta API timeout after ${ms}ms`)), ms))
  ]);

  let result = null;
  let lastError = null;
  let createdName = null;

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const suffix = i === 0 ? '' : `v${i + 1}`;
    const candidateName = `${baseName}${suffix}${Date.now().toString(36)}`.replace(/__+/g, '_').slice(0, 512);
    try {
      result = await withTimeout(MetaCloudProvider.createTemplate(sessionId, {
        name: candidateName,
        language: 'ar',
        category: metaCategory,
        components: variant.components,
        generateExample: false
      }), 25000);
      createdName = candidateName;
      console.log(`☁️ [META-CREATE-FROM-LOCAL] Variant "${variant.label}" succeeded → "${candidateName}"`);
      break;
    } catch (err) {
      lastError = err;
      console.warn(`☁️ [META-CREATE-FROM-LOCAL] Variant "${variant.label}" failed: ${err?.message || err}`);
    }
  }

  if (!result) {
    throw lastError || new Error('فشل إنشاء القالب في ميتا');
  }

  return { result, metaName: createdName, metaCategory, built, variableOrder };
}

async function publishTemplateToMeta(req, res) {
  // متغيرات مشتركة بين try و catch (ميتا ترفض المتغيرات في بداية/نهاية النص)
  let metaName = null;
  let metaCategory = null;
  let bodyText = null;
  let buttonsComponent = null;
  let metaPadding = null;

  try {
    const { companyId } = req.user;
    const templateId = req.params.id || req.body.templateId;
    const { sessionId } = req.body;

    // فئة ميتا الصريحة من الواجهة (3 فئات حقيقية) — بتتغلب على الاشتقاق من الفئة المحلية
    const META_CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];
    const categoryOverride = META_CATEGORIES.includes(String(req.body.metaCategory || '').toUpperCase())
      ? String(req.body.metaCategory).toUpperCase()
      : null;

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

    // 3. تحويل القالب المحلي لصيغة ميتا وإنشاؤه في ميتا مع محاولات بديلة
    // الترتيب: الأغنى أولاً ثم تبسيط تدريجي، وكل محاولة باسم فريد لتفادي تعارض الأسماء
    const { result, metaName: createdName, metaCategory: cat, built } =
      await createMetaTemplateFromLocal(sessionId, localTemplate, categoryOverride);

    metaName = createdName;
    metaCategory = cat;
    bodyText = built.bodyText;
    buttonsComponent = built.buttonsComponent;
    metaPadding = built.metaPadding;
    const variableOrder = built.variableOrder;

    // 5. تحديث القالب المحلي ببيانات ميتا
    await getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id: templateId },
      data: {
        metaTemplateName: metaName,
        metaTemplateId: result?.id || localTemplate.metaTemplateId,
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
      metaPadding,
      message: metaPadding
        ? `تم إرسال القالب لميتا للمراجعة. ${metaPadding}`
        : 'تم إرسال القالب لميتا للمراجعة. سيتم تفعيله بعد الموافقة.'
    });
  } catch (error) {
    const requestDebug = {
      name: metaName,
      language: 'ar',
      category: metaCategory,
      bodyText,
      buttons: buttonsComponent?.buttons || null,
      lastError: error?.message
    };
    const rawMeta = error?.originalError?.response?.data || error?.response?.data || null;
    console.error('❌ Error publishing template to Meta:', JSON.stringify(rawMeta || { error: error.message, code: error.code }, null, 2));
    const rawMetaError = rawMeta?.error;
    if (rawMetaError) {
      const details = [
        rawMetaError.message,
        rawMetaError.error_user_title,
        rawMetaError.error_user_msg,
        rawMetaError.code ? `(code: ${rawMetaError.code})` : '',
        rawMetaError.error_subcode ? `(subcode: ${rawMetaError.error_subcode})` : '',
        rawMetaError.fbtrace_id ? `(fbtrace: ${rawMetaError.fbtrace_id})` : ''
      ].filter(Boolean).join(' — ');
      return res.status(500).json({ error: details, request: requestDebug });
    }
    res.status(500).json({ error: `${error.message || 'Meta API error'}${error.code ? ` (code: ${error.code})` : ''}`, request: requestDebug });
  }
}

/**
 * إرسال قوالب الطلبات الجاهزة غير المرفوعة لميتا دفعة واحدة (لأول مرة للمتجر الجديد أو غير المربوط).
 * POST /templates/batch-publish-meta { sessionId, templateIds? }
 */
async function batchPublishOrderTemplatesToMeta(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId, templateIds } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId مطلوب' });
    }

    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: sessionId, companyId, provider: 'META_CLOUD' }
    });
    if (!session) {
      return res.status(400).json({ error: 'جلسة ميتا غير موجودة' });
    }

    const where = {
      companyId,
      metaTemplateName: { not: null },
      OR: [
        { metaTemplateStatus: null },
        { metaTemplateStatus: 'DRAFT' },
        { metaTemplateStatus: '' }
      ]
    };

    if (Array.isArray(templateIds) && templateIds.length > 0) {
      where.id = { in: templateIds };
    }

    const unsubmittedTemplates = await getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where
    });

    if (unsubmittedTemplates.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد قوالب جديدة غير مرسلة لميتا',
        submittedCount: 0,
        results: []
      });
    }

    const results = [];
    let submittedCount = 0;

    for (const tpl of unsubmittedTemplates) {
      try {
        const catOverride = tpl.category === 'ABANDONED_CART' ? 'MARKETING' : 'UTILITY';
        const { result, metaName, metaCategory, built, variableOrder } =
          await createMetaTemplateFromLocal(sessionId, tpl, catOverride);

        await getSharedPrismaClient().whatsAppNotificationTemplate.update({
          where: { id: tpl.id },
          data: {
            metaTemplateName: metaName,
            metaTemplateId: result?.id || tpl.metaTemplateId,
            metaTemplateLanguage: 'ar',
            metaTemplateStatus: 'PENDING',
            variables: variableOrder || tpl.variables,
            updatedAt: new Date()
          }
        });

        results.push({
          id: tpl.id,
          name: tpl.name,
          metaTemplateName: metaName,
          status: 'PENDING',
          success: true
        });
        submittedCount++;
        // فاصل زمني بسيط لتفادي Meta rate limits
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.warn(`⚠️ [BATCH-PUBLISH-META] Failed for ${tpl.name}:`, err?.message || err);
        results.push({
          id: tpl.id,
          name: tpl.name,
          error: err?.message || 'فشل الإرسال إلى ميتا',
          success: false
        });
      }
    }

    res.json({
      success: true,
      submittedCount,
      totalCount: unsubmittedTemplates.length,
      message: `تم إرسال ${submittedCount} من أصل ${unsubmittedTemplates.length} قوالب إلى Meta للمراجعة بنجاح`,
      results
    });
  } catch (error) {
    console.error('❌ Error batch publishing to Meta:', error);
    res.status(500).json({ error: error.message || 'فشل إرسال القوالب إلى Meta' });
  }
}

/**
 * إعادة إرسال قالب إلى ميتا للمراجعة بعد التعديل.
 *
 * حسب وثائق ميتا (2026): "Only templates with an APPROVED, REJECTED, or PAUSED
 * status can be edited." — القوالب PENDING (قيد المراجعة) لا يمكن تعديلها
 * (code 100 / subcode 2388003 "لا يمكن تعديل قوالب الرسائل إلا إذا تم رفضها").
 *
 * المنطق:
 * - لو حالة القالب المربوط APPROVED/REJECTED/PAUSED → نعدّل components مباشرة عبر
 *   POST /{apiVersion}/{message-template-id} (وميتا تعيد الموافقة تلقائياً).
 * - لو حالة القالب PENDING (لا يقبل التعديل) → ننشئ قالباً جديداً باسم فريد بالمحتوى
 *   المعدل ونربط القالب المحلي به.
 * POST /templates/:id/resubmit-meta  { sessionId }
 */
async function resubmitMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { sessionId } = req.body;

    // فئة ميتا الصريحة — بتتطبق في مسار إنشاء نسخة جديدة (PENDING) فقط
    const META_CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];
    const categoryOverride = META_CATEGORIES.includes(String(req.body.metaCategory || '').toUpperCase())
      ? String(req.body.metaCategory).toUpperCase()
      : null;

    if (!id || !sessionId) {
      return res.status(400).json({ error: 'templateId و sessionId مطلوبان' });
    }

    const localTemplate = await getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    });
    if (!localTemplate) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    if (!localTemplate.metaTemplateName) {
      return res.status(400).json({ error: 'القالب غير مربوط بقالب ميتا بعد' });
    }

    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: sessionId, companyId, provider: 'META_CLOUD' }
    });
    if (!session) {
      return res.status(400).json({ error: 'جلسة ميتا غير موجودة' });
    }

    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');

    // 1) حل القالب المربوط في ميتا (id + status)
    const metaTemplates = await MetaCloudProvider.listTemplates(sessionId).catch(() => []);
    let metaTemplateId = localTemplate.metaTemplateId || null;
    let boundStatus = null;
    const found = (metaTemplates || []).find(t => t.name === localTemplate.metaTemplateName);
    if (found) {
      metaTemplateId = found.id || metaTemplateId;
      boundStatus = found.status;
    }
    if (!metaTemplateId) {
      return res.status(400).json({ error: 'تعذر إيجاد قالب ميتا المقابل' });
    }

    const built = buildMetaTemplatePayload(localTemplate);
    const bodyWithExample = built.variableCount > 0
      ? { type: 'BODY', text: built.bodyText, example: { body_text: [Array.from({ length: built.variableCount }, (_, i) => `قيمة ${i + 1}`)] } }
      : { type: 'BODY', text: built.bodyText };
    // الـ HEADER يأتي أولاً في components
    const components = [];
    if (built.headerComponent) components.push(built.headerComponent);
    components.push(bodyWithExample);
    if (built.buttonsComponent) components.push(built.buttonsComponent);

    // 2) الحالات التي تقبل التعديل المباشر: APPROVED / REJECTED / PAUSED
    const EDITABLE_STATUSES = ['APPROVED', 'REJECTED', 'PAUSED'];
    const canEditInPlace = EDITABLE_STATUSES.includes(String(boundStatus || '').toUpperCase());

    let result = null;
    let finalName = localTemplate.metaTemplateName;
    let finalMetaTemplateId = metaTemplateId;
    let action;

    if (canEditInPlace) {
      // 2a) تعديل القالب الموجود نفسه (ميتا تعيد الموافقة تلقائياً)
      // لا نرسل category لقالب APPROVED (ميتا تمنع تعديل category القالب المعتمد)
      result = await MetaCloudProvider.updateTemplate(sessionId, metaTemplateId, { components });
      action = 'edited';
      console.log(`☁️ [RESUBMIT-META] Template "${localTemplate.name}" → Meta id=${metaTemplateId} edited (was ${boundStatus})`);
    } else {
      // 2b) القالب PENDING (أو حالة أخرى غير قابلة للتعديل) → ننشئ قالباً جديداً باسم فريد
      const created = await createMetaTemplateFromLocal(sessionId, localTemplate, categoryOverride);
      result = created.result;
      finalName = created.metaName;
      finalMetaTemplateId = created.result?.id || metaTemplateId;
      action = 'created';
      console.log(`☁️ [RESUBMIT-META] Template "${localTemplate.name}" → new Meta template "${finalName}" (was ${boundStatus || 'n/a'})`);
    }

    // 3) التحقق من الحالة الجديدة على ميتا
    let verifiedStatus = null;
    let verifiedBodyText = null;
    try {
      const metaTemplatesAfter = await MetaCloudProvider.listTemplates(sessionId);
      const foundAfter = metaTemplatesAfter.find(t => String(t.id) === String(finalMetaTemplateId));
      if (foundAfter) {
        verifiedStatus = foundAfter.status;
        const body = (foundAfter.components || []).find(c => c.type === 'BODY');
        verifiedBodyText = body ? body.text : null;
      }
    } catch { /* لا يوقف الإجابة */ }

    await getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id },
      data: {
        metaTemplateName: finalName,
        metaTemplateId: finalMetaTemplateId || localTemplate.metaTemplateId,
        metaTemplateLanguage: 'ar',
        metaTemplateStatus: verifiedStatus || 'PENDING',
        variables: built.variableOrder || localTemplate.variables,
        updatedAt: new Date()
      }
    });

    const message = verifiedStatus
      ? `تم ${action === 'edited' ? 'تحديث' : 'إنشاء'} القالب على ميتا. الحالة الحالية: ${verifiedStatus}.`
      : 'تم إرسال القالب إلى ميتا للمراجعة. سيتم تأكيده تلقائياً بعد المراجعة.';

    res.json({
      success: true,
      applied: action === 'edited',
      applyReason: action === 'created' ? 'تم إنشاء قالب ميتا جديد باسم فريد؛ سيصبح الأساسي في الإرسال بعد اعتماده من ميتا' : null,
      action,
      metaTemplateName: finalName,
      metaTemplateId: finalMetaTemplateId || localTemplate.metaTemplateId,
      metaResult: result,
      verifiedStatus,
      verifiedBodyText,
      metaPadding: built.metaPadding,
      message
    });
  } catch (error) {
    console.error('❌ Error resubmitting Meta template:', error);
    if (error.metaError) {
      const e = error.metaError;
      const details = [
        e.message,
        e.error_user_title,
        e.error_user_msg,
        e.code ? `(code: ${e.code})` : '',
        e.error_subcode ? `(subcode: ${e.error_subcode})` : ''
      ].filter(Boolean).join(' — ');
      return res.status(500).json({ error: details });
    }
    const rawMeta = error?.originalError?.response?.data || error?.response?.data || null;
    const rawMetaError = rawMeta?.error;
    if (rawMetaError) {
      const details = [
        rawMetaError.message,
        rawMetaError.error_user_title,
        rawMetaError.error_user_msg,
        rawMetaError.code ? `(code: ${rawMetaError.code})` : '',
        rawMetaError.error_subcode ? `(subcode: ${rawMetaError.error_subcode})` : ''
      ].filter(Boolean).join(' — ');
      return res.status(500).json({ error: details });
    }
    res.status(500).json({ error: error.message || 'فشل تحديث القالب على ميتا' });
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

/**
 * جلب قوالب ميتا المتاحة للربط (APPROVED) من رقم واتساب كلاود
 * GET /templates/meta-available?sessionId=...
 */
async function listAvailableMetaTemplates(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId مطلوب' });

    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
    const metaTemplates = await MetaCloudProvider.listTemplates(sessionId);

    const localTemplates = await getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where: { companyId },
      select: { id: true, eventType: true, metaTemplateName: true, metaTemplateStatus: true, content: true }
    });

    const available = (metaTemplates || [])
      .filter(t => String(t.status).toUpperCase() === 'APPROVED')
      .map(t => {
        // قالب ميتا واحد ممكن يتربط باكتر من حالة/قالب محلي — نرجع كل الربطات
        const bound = (localTemplates || []).filter(l => l.metaTemplateName === t.name);
        // محتوى أول قالب محلي مربوط — لتمكين auto-fill في الفرونت عند اختيار قالب ميتا
        // (بيخلي المستخدم يختار قالب ميتا بس والمحتوى يتبني تلقائياً بدل ما يكتب المتغيرات يدوياً)
        const boundContent = bound[0]?.content || null;
        return {
          name: t.name,
          status: t.status,
          language: t.language || 'ar',
          category: t.category || 'UTILITY',
          components: t.components || null,
          boundToLocalTemplateIds: bound.map(b => b.id),
          boundToEventTypes: bound.map(b => b.eventType),
          boundLocalContent: boundContent,
          // للتوافق مع الفرونت القديم: أول ربط بس (كان الحقل السابق)
          boundToLocalTemplateId: bound[0] ? bound[0].id : null,
          boundToEventType: bound[0] ? bound[0].eventType : null
        };
      });

    res.json({ success: true, templates: available });
  } catch (error) {
    console.error('❌ Error listing available Meta templates:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * ربط قالب محلي بقالب ميتا موجود (approved) - اللي هيتبعت فعلياً
 * POST /templates/:id/bind-meta  { sessionId, metaTemplateName, metaTemplateLanguage }
 */
async function bindMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { sessionId, metaTemplateName, metaTemplateLanguage = 'ar' } = req.body;

    if (!sessionId || !metaTemplateName) {
      return res.status(400).json({ error: 'sessionId و metaTemplateName مطلوبان' });
    }

    const local = await getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    });
    if (!local) return res.status(404).json({ error: 'القالب غير موجود' });

    // التحقق أن القالب موجود ومعتمد في ميتا
    const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
    const metaTemplates = await MetaCloudProvider.listTemplates(sessionId);
    const meta = (metaTemplates || []).find(t => t.name === metaTemplateName);
    if (!meta) return res.status(400).json({ error: 'قالب ميتا غير موجود' });
    if (String(meta.status).toUpperCase() !== 'APPROVED') {
      return res.status(400).json({ error: 'قالب ميتا غير معتمد بعد (مطلوب APPROVED)' });
    }

    // بناء ترتيب المتغيرات من قالب ميتا ({{1}}, {{2}}, ...) بمطابقة ترتيب
    // ظهور {{name}} في القالب المحلي (مش ترتيب هاردكود — يمنع رسايل بمتغيرات مغلوطة).
    let metaVariableCount = 0;
    let metaBodyText = '';
    try {
      const bodyComponent = (meta.components || []).find(c => c.type === 'BODY');
      metaBodyText = bodyComponent?.text || '';
      const placeholders = metaBodyText.match(/\{\{\s*\d+\s*\}\}/g) || [];
      metaVariableCount = placeholders.length;
    } catch { metaVariableCount = 0; }

    const localContent = local.content || '';
    let variables = null;
    let validation = null;

    if (metaVariableCount > 0) {
      // 🆕 validation: التأكد إن عدد المتغيرات المحلية >= ميتا
      const localUnique = extractLocalVariableOrder(localContent);

      validation = {
        metaVariableCount,
        localVariableCount: localUnique.length,
        matched: localUnique.length >= metaVariableCount,
        missingInLocal: metaVariableCount > localUnique.length ? metaVariableCount - localUnique.length : 0,
      };

      if (!validation.matched) {
        return res.status(400).json({
          error: `عدد المتغيرات لا يطابق: قالب ميتا يحتاج ${metaVariableCount} متغيرات، لكن القالب المحلي يحتوي على ${localUnique.length} فقط. أضف ${validation.missingInLocal} متغيرات أخرى للقالب المحلي.`,
          validation,
        });
      }

      const mapped = mapVariablesByOrder(localContent, metaBodyText);
      variables = mapped.length > 0 ? JSON.stringify(mapped) : null;
    }

    const updated = await getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id },
      data: {
        metaTemplateName,
        metaTemplateId: meta.id || local.metaTemplateId,
        metaTemplateLanguage,
        metaTemplateStatus: 'APPROVED',
        variables,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, template: updated, validation });
  } catch (error) {
    console.error('❌ Error binding Meta template:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * يرجع مصير الإشعار المتوقع لكل قالب/حالة — شفافية البروفايدر للأدمن.
 * GET /templates/delivery-preview
 */
async function getTemplatesDeliveryPreview(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    // 1. كل القوالب
    const templates = await prisma.whatsAppNotificationTemplate.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true, eventType: true, category: true, channel: true,
        metaTemplateName: true, metaTemplateStatus: true, metaTemplateLanguage: true,
      },
    });

    // 2. كل sessions الشركة المتصلة
    const sessions = await prisma.whatsAppSession.findMany({
      where: { companyId, status: 'CONNECTED' },
      select: { id: true, name: true, provider: true, phoneNumber: true, status: true },
    });

    // 3. default session (أو أول جلسة متصلة لو مش محدد)
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId },
      select: { defaultSessionId: true },
    });
    const defaultSession = sessions.find(s => s.id === settings?.defaultSessionId) || sessions[0];

    // 4. لكل قالب، احسب المصير
    const preview = templates.map(t => {
      let deliveryStatus = 'unknown';
      let provider = null;
      let riskLevel = 'none'; // none | warning | danger
      let message = '';

      if (!defaultSession) {
        deliveryStatus = 'no_session';
        riskLevel = 'danger';
        message = 'لا توجد جلسة واتساب متصلة';
      } else if (defaultSession.provider === 'BAILEYS') {
        deliveryStatus = 'baileys_free_text';
        provider = 'BAILEYS';
        riskLevel = 'none';
        message = 'سيُرسل كنص حر عبر Baileys — يصل في أي وقت';
      } else if (defaultSession.provider === 'META_CLOUD') {
        provider = 'META_CLOUD';
        if (t.metaTemplateName && String(t.metaTemplateStatus).toUpperCase() === 'APPROVED') {
          deliveryStatus = 'meta_approved';
          riskLevel = 'none';
          message = `سيُرسل عبر قالب ميتا معتمد: ${t.metaTemplateName}`;
        } else if (t.metaTemplateName && t.metaTemplateStatus !== 'APPROVED') {
          deliveryStatus = 'meta_not_approved';
          riskLevel = 'danger';
          message = `قالب ميتا "${t.metaTemplateName}" حالته: ${t.metaTemplateStatus} — لن يُرسل حتى يعتمد`;
        } else {
          deliveryStatus = 'meta_no_template';
          riskLevel = 'warning';
          message = '⚠️ ميتا بدون قالب معتمد — سيفشل خارج نافذة 24 ساعة';
        }
      }

      return {
        templateId: t.id,
        eventType: t.eventType,
        channel: t.channel || 'AUTO',
        provider,
        deliveryStatus,
        riskLevel,
        message,
        metaTemplateName: t.metaTemplateName,
        metaTemplateStatus: t.metaTemplateStatus,
      };
    });

    // 5. لو الحدث الواحد ليه قالبان (عادي + ميتا)، نحتفظ بالقالب اللي مسار الإرسال
    //    هيستخدمه فعلًا (نفس قاعدة findNotificationTemplateForEvent) عشان المؤشر
    //    يعكس المصير الحقيقي مش آخر قالب اعتباطي.
    const isMetaDefault = defaultSession?.provider === 'META_CLOUD';
    const isMetaApproved = (item) =>
      String(item.channel).toUpperCase() === 'META_CLOUD' &&
      String(item.metaTemplateStatus || '').toUpperCase() === 'APPROVED';

    const perEvent = new Map();
    for (const item of preview) {
      const prev = perEvent.get(item.eventType);
      if (!prev) {
        perEvent.set(item.eventType, item);
        continue;
      }
      if (isMetaDefault) {
        if (isMetaApproved(item) && !isMetaApproved(prev)) perEvent.set(item.eventType, item);
      } else {
        const itemIsMeta = String(item.channel).toUpperCase() === 'META_CLOUD';
        const prevIsMeta = String(prev.channel).toUpperCase() === 'META_CLOUD';
        if (!itemIsMeta && prevIsMeta) perEvent.set(item.eventType, item);
      }
    }
    const finalPreview = Array.from(perEvent.values());

    res.json({
      success: true,
      defaultSession: defaultSession ? {
        id: defaultSession.id, name: defaultSession.name,
        provider: defaultSession.provider, phoneNumber: defaultSession.phoneNumber,
      } : null,
      connectedSessionsCount: sessions.length,
      hasBaileysBackup: sessions.some(s => s.provider === 'BAILEYS'),
      preview: finalPreview,
    });
  } catch (error) {
    console.error('❌ Error in getTemplatesDeliveryPreview:', error);
    res.status(500).json({ error: error.message });
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
  getStatusReport,
  getNotificationStats,
  getTemplateStats,
  getNotificationQueueStats,
  sendManualNotification,
  sendTestNotification,
  getCustomerPreferences,
  updateCustomerPreferences,
  publishTemplateToMeta,
  batchPublishOrderTemplatesToMeta,
  resubmitMetaTemplate,
  syncTemplateStatuses,
  listAvailableMetaTemplates,
  bindMetaTemplate,
  getTemplatesDeliveryPreview
};
