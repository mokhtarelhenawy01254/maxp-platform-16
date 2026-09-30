/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §2.3 + Meta-Order-Blueprints-2026):
 * بذر قوالب الطلبات الافتراضية في DB + ضمان قوالب Meta Cloud كاملة ومجهزة للأكونتات الجديدة والقديمة غير المربوطة.
 * مصدر قوالب الطلبات الوحيد هو صفحة /orders/status-templates.
 */
const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_ORDER_TEMPLATE_CONTENT = (statusName) => (
  `أهلاً بحضرتك 👋\nتم تغيير حالة طلبك إلى: ${statusName}\nشكراً لتعاملك معنا 🙏`
);

const META_ORDER_BLUEPRINTS = {
  ORDER_CREATED: {
    metaTemplateName: 'order_created',
    name: 'تأكيد طلب جديد',
    content: 'أهلًا بحضرتك يا {{customerName}} 👋\nطلبك رقم {{orderNumber}} مستعد للتأكيد:\n\n📦 محتويات الطلب:\n{{orderItems}}\n\n💰 الإجمالي: {{total}} {{currency}}\n\nلو كل البيانات مظبوطة اضغط لتأكيد الطلب للبدء في التجهيز فوراً 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تأكيد الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' },
      { position: 4, name: 'total' },
      { position: 5, name: 'currency' }
    ]
  },
  CONFIRMED: {
    metaTemplateName: 'order_confirmed',
    name: 'تم تأكيد الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} ✨\nتم تأكيد طلبك رقم {{orderNumber}} بنجاح.\n\n📦 تفاصيل الطلب:\n{{orderItems}}\n\n💰 الإجمالي: {{total}} {{currency}}\n\nالطلب هيوصلك خلال 2 إلى 4 أيام عمل، وأول ما يخرج للشحن هنبلغ حضرتك فوراً 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تفاصيل الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' },
      { position: 4, name: 'total' },
      { position: 5, name: 'currency' }
    ]
  },
  ORDER_CONFIRMED: {
    metaTemplateName: 'order_confirmed',
    name: 'تم تأكيد الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} ✨\nتم تأكيد طلبك رقم {{orderNumber}} بنجاح.\n\n📦 تفاصيل الطلب:\n{{orderItems}}\n\n💰 الإجمالي: {{total}} {{currency}}\n\nالطلب هيوصلك خلال 2 إلى 4 أيام عمل، وأول ما يخرج للشحن هنبلغ حضرتك فوراً 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تفاصيل الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' },
      { position: 4, name: 'total' },
      { position: 5, name: 'currency' }
    ]
  },
  PROCESSING: {
    metaTemplateName: 'order_processing',
    name: 'جاري تجهيز الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} 👋\nطلبك رقم {{orderNumber}} قيد التجهيز في المخزن حالياً.\n\n📦 المنتجات:\n{{orderItems}}\n\nسنقوم بإشعارك فور تسليم الشحنة لشركة الشحن 🚚',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تتبع الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' }
    ]
  },
  ORDER_PROCESSING: {
    metaTemplateName: 'order_processing',
    name: 'جاري تجهيز الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} 👋\nطلبك رقم {{orderNumber}} قيد التجهيز في المخزن حالياً.\n\n📦 المنتجات:\n{{orderItems}}\n\nسنقوم بإشعارك فور تسليم الشحنة لشركة الشحن 🚚',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تتبع الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' }
    ]
  },
  SHIPPED: {
    metaTemplateName: 'order_shipped',
    name: 'تم شحن الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} 👋\nتم شحن طلبك رقم {{orderNumber}} وهو الآن في الطريق إليك 🚚\n\nالشحنة ستصلك خلال يومين عمل.\nإذا احتجت أي استفسار أو متابعة، تواصل معنا فوراً ويسعدنا مساعدتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تتبع الشحنة' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  ORDER_SHIPPED: {
    metaTemplateName: 'order_shipped',
    name: 'تم شحن الطلب',
    content: 'أهلًا بحضرتك يا {{customerName}} 👋\nتم شحن طلبك رقم {{orderNumber}} وهو الآن في الطريق إليك 🚚\n\nالشحنة ستصلك خلال يومين عمل.\nإذا احتجت أي استفسار أو متابعة، تواصل معنا فوراً ويسعدنا مساعدتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تتبع الشحنة' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  OUT_FOR_DELIVERY: {
    metaTemplateName: 'order_with_captain',
    name: 'الطلب مع المندوب للتسليم',
    content: 'مساء الخير {{customerName}} 👋\nطلبك رقم {{orderNumber}} مع المندوب ومقرر تسليمه لحضرتك على مدار اليوم 🛵\n\nيرجى التواجد لاستلام الشحنة، ولو عندك أي ملاحظة أو استفسار بلغنا فوراً لمساعدتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'متابعة التوصيل' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  ORDER_OUT_FOR_DELIVERY: {
    metaTemplateName: 'order_with_captain',
    name: 'الطلب مع المندوب للتسليم',
    content: 'مساء الخير {{customerName}} 👋\nطلبك رقم {{orderNumber}} مع المندوب ومقرر تسليمه لحضرتك على مدار اليوم 🛵\n\nيرجى التواجد لاستلام الشحنة، ولو عندك أي ملاحظة أو استفسار بلغنا فوراً لمساعدتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'متابعة التوصيل' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  DELIVERED: {
    metaTemplateName: 'order_delivered',
    name: 'تم تسليم الطلب',
    content: 'أهلاً بحضرتك يا {{customerName}} 🌷\nتم تأكيد استلام طلبك رقم {{orderNumber}} بنجاح ✅\n💰 قيمة الطلب: {{total}} {{currency}}\n\nنتمنى أن ينال المنتج إعجابك، ويسعدنا جداً مشاركتنا رأيك وتقييمك لتجربة الشراء ❤️',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تقييم الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'total' },
      { position: 4, name: 'currency' }
    ]
  },
  ORDER_DELIVERED: {
    metaTemplateName: 'order_delivered',
    name: 'تم تسليم الطلب',
    content: 'أهلاً بحضرتك يا {{customerName}} 🌷\nتم تأكيد استلام طلبك رقم {{orderNumber}} بنجاح ✅\n💰 قيمة الطلب: {{total}} {{currency}}\n\nنتمنى أن ينال المنتج إعجابك، ويسعدنا جداً مشاركتنا رأيك وتقييمك لتجربة الشراء ❤️',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تقييم الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'total' },
      { position: 4, name: 'currency' }
    ]
  },
  CANCELLED: {
    metaTemplateName: 'order_cancelled',
    name: 'إلغاء الطلب',
    content: 'مساء الخير {{customerName}} 👋\nنود إعلامك بأنه تم إلغاء طلبك رقم {{orderNumber}} بناءً على رغبتك.\n\nإذا كان الإلغاء قد تم عن طريق الخطأ أو ترغب في إعادة تفعيل الطلب، تواصل معنا ويسعدنا دائماً خدمتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'إعادة تفعيل الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  ORDER_CANCELLED: {
    metaTemplateName: 'order_cancelled',
    name: 'إلغاء الطلب',
    content: 'مساء الخير {{customerName}} 👋\nنود إعلامك بأنه تم إلغاء طلبك رقم {{orderNumber}} بناءً على رغبتك.\n\nإذا كان الإلغاء قد تم عن طريق الخطأ أو ترغب في إعادة تفعيل الطلب، تواصل معنا ويسعدنا دائماً خدمتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'إعادة تفعيل الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  RETURNED: {
    metaTemplateName: 'order_returned',
    name: 'مرتجع الطلب',
    content: 'مساء الخير {{customerName}} 👋\nأفادت شركة الشحن بوجود مرتجع لطلبك رقم {{orderNumber}}.\n\nحابين نتأكد من حضرتك لو واجهت أي مشكلة أو كان عندك أي ملاحظة لنساعدك ونرتب الاستلام بالشكل الأنسب لك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تواصل مع الدعم' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  ORDER_RETURNED: {
    metaTemplateName: 'order_returned',
    name: 'مرتجع الطلب',
    content: 'مساء الخير {{customerName}} 👋\nأفادت شركة الشحن بوجود مرتجع لطلبك رقم {{orderNumber}}.\n\nحابين نتأكد من حضرتك لو واجهت أي مشكلة أو كان عندك أي ملاحظة لنساعدك ونرتب الاستلام بالشكل الأنسب لك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تواصل مع الدعم' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]
  },
  PAYMENT_REMINDER: {
    metaTemplateName: 'payment_reminder',
    name: 'تذكير بالدفع',
    content: 'أهلاً {{customerName}} 👋\nنود تذكيرك بإتمام الدفع لطلبك رقم {{orderNumber}}.\n💰 المبلغ المطلوب: {{total}} {{currency}}\n\nيرجى إتمام عملية الدفع لتأكيد الطلب وبدء الشحن فوراً 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'الدفع الآن' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'total' },
      { position: 4, name: 'currency' }
    ]
  },
  INCOMPLETE_CART_FIRST_APPEARANCE: {
    metaTemplateName: 'cart_recovery_discount',
    name: 'سلة متروكة - استعادة الطلب',
    category: 'ABANDONED_CART',
    content: 'أهلاً {{customerName}} 👋\nلاحظنا أنك تركت بعض المنتجات المميزة في سلة التسوق 🛍️\n\nإجمالي السلة: {{cartTotal}} {{currency}}\n\nالمنتجات لا تزال محجوزة لك لفترة محدودة، اضغط أدناه لإتمام طلبك قبل نفاد الكمية! ✨',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'إتمام الشراء الآن' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'cartTotal' },
      { position: 3, name: 'currency' }
    ]
  },
  STOCK_SHORTAGE: {
    metaTemplateName: 'order_stock_shortage',
    name: 'عجز مخزون مؤقت',
    category: 'ORDERS',
    content: 'أهلاً بحضرتك يا {{customerName}} 👋\nنود إبلاغك بوجود عجز مؤقت في مخزون بعض منتجات طلبك رقم {{orderNumber}}.\n\n📦 تفاصيل الطلب:\n{{orderItems}}\n\nفريق العمل يعمل حالياً على توفير المنتجات في أسرع وقت وسنوافيك بالتحديث فور توفرها 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تواصل مع الدعم' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' }
    ]
  },
  SHORTAGE_FAILED: {
    metaTemplateName: 'order_shortage_failed',
    name: 'عجز نهائي في المخزون',
    category: 'ORDERS',
    content: 'أهلاً بحضرتك يا {{customerName}} 👋\nنعتذر بشدة لإبلاغك بنفاد كمية منتجات طلبك رقم {{orderNumber}} بشكل نهائي وعدم إمكانية توفيرها حالياً.\n\n📦 تفاصيل الطلب:\n{{orderItems}}\n\nيسعدنا دائماً مساعدتك في اختيار بديل مناسب أو إلغاء الطلب حسب رغبتك 🙏',
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تصفح البدائل' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' }
    ]
  }
};

function resolveMetaBlueprint(eventCode, eventName) {
  if (META_ORDER_BLUEPRINTS[eventCode]) return META_ORDER_BLUEPRINTS[eventCode];
  const cleanCode = String(eventCode).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return {
    metaTemplateName: `order_${cleanCode}`.slice(0, 50),
    name: `قالب ميتا - ${eventName || eventCode}`,
    category: 'ORDERS',
    content: `أهلاً بحضرتك يا {{customerName}} 👋\nنود إعلامك بتحديث حالة طلبك رقم {{orderNumber}} إلى: *${eventName || eventCode}*\n\n📦 تفاصيل الطلب:\n{{orderItems}}\n\nشكراً لتعاملك معنا 🙏`,
    hasButtons: true,
    buttons: [{ type: 'QUICK_REPLY', text: 'تتبع الطلب' }],
    variables: [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' }
    ]
  };
}

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
      { code: 'PAYMENT_REMINDER', name: 'تذكير بالدفع' },
      { code: 'INCOMPLETE_CART_FIRST_APPEARANCE', name: 'سلة متروكة - أول ظهور' }
    ];

    const allEvents = [
      ...statuses.map(s => ({ code: s.code, name: s.name })),
      ...extraOrderEvents
    ];

    const allExistingTemplates = await prisma.whatsAppNotificationTemplate.findMany({
      where: { companyId, eventType: { in: allEvents.map(e => e.code) } },
      select: { id: true, eventType: true, channel: true, metaTemplateName: true }
    });

    const existingRegularEventTypes = new Set(
      allExistingTemplates
        .filter(t => !t.metaTemplateName && String(t.channel || '').toUpperCase() !== 'META_CLOUD')
        .map(t => t.eventType)
    );

    const existingMetaEventTypes = new Set(
      allExistingTemplates
        .filter(t => Boolean(t.metaTemplateName) || String(t.channel || '').toUpperCase() === 'META_CLOUD')
        .map(t => t.eventType)
    );

    let createdRegular = 0;
    let createdMeta = 0;

    for (const event of allEvents) {
      const bp = resolveMetaBlueprint(event.code, event.name);

      // 1. بذر القالب العادي الافتراضي إذا لم يكن موجوداً
      if (!existingRegularEventTypes.has(event.code)) {
        await prisma.whatsAppNotificationTemplate.create({
          data: {
            companyId,
            eventType: event.code,
            name: `قالب ${event.name}`,
            category: bp.category || 'ORDERS',
            content: DEFAULT_ORDER_TEMPLATE_CONTENT(event.name),
            variables: JSON.stringify([
              { position: 1, name: 'customerName' },
              { position: 2, name: 'orderNumber' }
            ]),
            hasButtons: false,
            channel: 'AUTO',
            isActive: true
          }
        });
        createdRegular++;
      }

      // 2. بذر قالب ميتا الكامل والجاهز للربط/الإرسال لميتا لأي حساب جديد أو غير مربوط
      if (!existingMetaEventTypes.has(event.code)) {
        await prisma.whatsAppNotificationTemplate.create({
          data: {
            companyId,
            eventType: event.code,
            name: bp.name,
            category: bp.category || 'ORDERS',
            content: bp.content,
            headerFormat: 'TEXT',
            hasButtons: bp.hasButtons || false,
            buttons: bp.buttons ? JSON.stringify(bp.buttons) : null,
            variables: JSON.stringify(bp.variables || []),
            metaTemplateName: bp.metaTemplateName,
            metaTemplateLanguage: 'ar',
            metaTemplateStatus: null, // جاهز محلياً وينتظر الإرسال لميتا
            channel: 'META_CLOUD',
            isActive: true,
            isDefault: false
          }
        });
        createdMeta++;
      }
    }

    if (createdRegular > 0 || createdMeta > 0) {
      console.log(`🌱 [ORDER-TEMPLATES] Seeded for company ${companyId}: regular=${createdRegular}, meta=${createdMeta}`);
    }
    return createdRegular + createdMeta;
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

module.exports = {
  DEFAULT_ORDER_TEMPLATE_CONTENT,
  META_ORDER_BLUEPRINTS,
  resolveMetaBlueprint,
  seedDefaultOrderTemplates,
  ensureOrderTemplate
};
