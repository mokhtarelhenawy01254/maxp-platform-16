/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §2.3):
 * بذر قوالب الطلبات الافتراضية في DB + ضمان قالب للحدث الجاري.
 * مصدر قوالب الطلبات الوحيد هو صفحة /orders/status-templates (صفوف DB قابلة للتعديل).
 * مستخرجة من orderStatusController.seedDefaultOrderTemplates لتُستخدم دفاعياً في
 * sendNotification (شركة جديدة لم تفتح الصفحة بعد كانت تفشل بصمت بـ no_template).
 */
const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_ORDER_TEMPLATE_CONTENT = (statusName) => (
  `أهلًا بحضرتك 👋\nتم تغيير حالة طلبك إلى: ${statusName}\nشكرًا لتعاملك معنا 🙏`
);

async function seedDefaultOrderTemplates(companyId, prisma = getSharedPrismaClient()) {
  try {
    const statuses = await prisma.orderStatusConfig.findMany({
      where: { companyId, isActive: true, statusType: { in: ['order', 'preparation', 'shipping', 'payment'] } },
      select: { id: true, code: true, name: true }
    });

    // أحداث الطلبات الإضافية غير المرتبطة بحالة محددة (تُدار من صفحة قوالب الطلبات)
    const extraOrderEvents = [
      { code: 'ORDER_CREATED', name: 'طلب جديد' },
      { code: 'ORDER_CANCELLED', name: 'إلغاء الطلب' },
      { code: 'PAYMENT_REMINDER', name: 'تذكير بالدفع' }
    ];

    const allEvents = [
      ...statuses.map(s => ({ code: s.code, name: s.name })),
      ...extraOrderEvents
    ];

    const existingTemplates = await prisma.whatsAppNotificationTemplate.findMany({
      where: { companyId, eventType: { in: allEvents.map(e => e.code) } },
      select: { eventType: true }
    });
    const existingEventTypes = new Set(existingTemplates.map(t => t.eventType));

    let created = 0;
    for (const event of allEvents) {
      if (existingEventTypes.has(event.code)) continue;
      await prisma.whatsAppNotificationTemplate.create({
        data: {
          companyId,
          eventType: event.code,
          name: `قالب ${event.name}`,
          category: 'ORDERS',
          content: DEFAULT_ORDER_TEMPLATE_CONTENT(event.name),
          variables: JSON.stringify([
            { position: 1, name: 'customerName' },
            { position: 2, name: 'orderNumber' }
          ]),
          hasButtons: false,
          isActive: true
        }
      });
      created++;
    }

    if (created > 0) {
      console.log(`🌱 [ORDER-TEMPLATES] Created ${created} default order template(s) for company ${companyId}`);
    }
    return created;
  } catch (error) {
    console.error('❌ [ORDER-TEMPLATES] Seed failed:', error.message);
    return 0;
  }
}

/**
 * يضمن وجود قالب للحدث الجاري (يُستدعى عند غياب القالب لأحداث الطلبات):
 * 1) يزرع الافتراضيات لكل الحالات المُعرّفة + الأحداث القياسية.
 * 2) لو ما زال الحدث المحدد بلا قالب (حالة غير مُعرّفة في orderStatusConfig)،
 *    ينشئ صفاً دنياً قابلاً للتعديل من الصفحة.
 * يرجع صف القالب (DB) أو null.
 */
async function ensureOrderTemplate({ companyId, eventType, fallbackEventType, prisma = getSharedPrismaClient() }) {
  await seedDefaultOrderTemplates(companyId, prisma);

  const lookupKeys = [...new Set([fallbackEventType, eventType].filter(Boolean))];
  let template = null;
  for (const key of lookupKeys) {
    template = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType: key, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
    if (template) break;
  }

  if (template) return template;

  const targetCode = fallbackEventType || eventType;
  const statusName = String(targetCode || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const created = await prisma.whatsAppNotificationTemplate.create({
    data: {
      companyId,
      eventType: targetCode,
      name: `قالب ${targetCode}`,
      category: 'ORDERS',
      content: DEFAULT_ORDER_TEMPLATE_CONTENT(statusName),
      variables: JSON.stringify([
        { position: 1, name: 'customerName' },
        { position: 2, name: 'orderNumber' }
      ]),
      hasButtons: false,
      isActive: true
    }
  });
  console.log(`🌱 [ORDER-TEMPLATES] Auto-created minimal template for ${companyId}/${targetCode}`);
  return created;
}

module.exports = { DEFAULT_ORDER_TEMPLATE_CONTENT, seedDefaultOrderTemplates, ensureOrderTemplate };
