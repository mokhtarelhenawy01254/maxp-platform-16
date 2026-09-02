const { getSharedPrismaClient } = require('../sharedDatabase');
const { sendNotification } = require('./WhatsAppNotificationService');

/**
 * خدمة إشعارات واتساب لطلبات الخدمات
 * تتولى إرسال التنبيهات للعملاء والإدارة عند إنشاء الطلب أو تحديث حالته
 */

/**
 * إشعار إنشاء طلب خدمة جديد (للعميل وللإدارة)
 */
async function notifyOrderCreated({ order, service, companyId }) {
  if (!order || !order.phone) {
    return { success: false, reason: 'missing_order_or_phone' };
  }

  const prisma = getSharedPrismaClient();
  const serviceName = service?.name || order.service?.name || 'طلب خدمة';
  const priceInfo = service?.price ? `💰 السعر: ${service.price} ج.م` : '';
  const description = order.description?.trim() || 'لا يوجد وصف إضافي';
  const filesCount = Array.isArray(order.referenceFiles) ? order.referenceFiles.length : 0;
  const shortOrderId = order.id ? order.id.slice(-6).toUpperCase() : '---';

  const results = {
    customer: null,
    admin: null
  };

  // 1. إرسال إشعار تأكيد للعميل
  try {
    results.customer = await sendNotification({
      companyId: companyId || order.companyId,
      recipientPhone: order.phone,
      recipientName: order.customerName,
      recipientType: 'CUSTOMER',
      category: 'GENERAL',
      eventType: 'SERVICE_ORDER_CREATED',
      variables: {
        customerName: order.customerName || 'عميلنا العزيز',
        serviceName,
        orderId: shortOrderId,
        priceInfo,
        description
      },
      priority: 3
    });
  } catch (err) {
    console.error('❌ [SERVICE-ORDER-NOTIFY] Customer notification failed:', err.message);
    results.customer = { success: false, error: err.message };
  }

  // 2. إرسال تنبيه للإدارة بطلب الخدمة الجديد
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId || order.companyId },
      select: { phone: true, name: true }
    });

    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId: companyId || order.companyId },
      select: { companyLifecycleAdminPhones: true }
    });

    // استخراج أرقام هواتف الإدارة (من الإعدادات أو رقم هاتف الشركة)
    const adminPhones = [];
    if (settings?.companyLifecycleAdminPhones) {
      const parsed = settings.companyLifecycleAdminPhones
        .split(/[,;\n]/)
        .map(p => p.trim())
        .filter(Boolean);
      adminPhones.push(...parsed);
    }
    if (company?.phone && !adminPhones.includes(company.phone)) {
      adminPhones.push(company.phone);
    }

    if (adminPhones.length > 0) {
      const targetAdminPhone = adminPhones[0];
      results.admin = await sendNotification({
        companyId: companyId || order.companyId,
        recipientPhone: targetAdminPhone,
        recipientName: 'إدارة ' + (company?.name || 'المتجر'),
        recipientType: 'ADMIN',
        category: 'GENERAL',
        eventType: 'SERVICE_ORDER_ADMIN_ALERT',
        variables: {
          customerName: order.customerName || 'بدون اسم',
          customerPhone: order.phone,
          serviceName,
          priceInfo: priceInfo || 'غير محدد',
          filesCount: String(filesCount),
          description
        },
        priority: 2
      });
    }
  } catch (adminErr) {
    console.error('⚠️ [SERVICE-ORDER-NOTIFY] Admin notification failed:', adminErr.message);
    results.admin = { success: false, error: adminErr.message };
  }

  return results;
}

/**
 * إشعار تحديث حالة طلب الخدمة
 */
async function notifyStatusChanged({ order, oldStatus, newStatus, companyId }) {
  if (!order || !order.phone || oldStatus === newStatus) {
    return { success: false, reason: 'skipped' };
  }

  const statusEventMap = {
    IN_PROGRESS: 'SERVICE_ORDER_IN_PROGRESS',
    COMPLETED: 'SERVICE_ORDER_COMPLETED',
    CANCELLED: 'SERVICE_ORDER_CANCELLED'
  };

  const eventType = statusEventMap[newStatus];
  if (!eventType) {
    return { success: false, reason: 'unsupported_status' };
  }

  const serviceName = order.service?.name || 'الخدمة';
  const shortOrderId = order.id ? order.id.slice(-6).toUpperCase() : '---';

  try {
    return await sendNotification({
      companyId: companyId || order.companyId,
      recipientPhone: order.phone,
      recipientName: order.customerName,
      recipientType: 'CUSTOMER',
      category: 'GENERAL',
      eventType,
      variables: {
        customerName: order.customerName || 'عميلنا العزيز',
        serviceName,
        orderId: shortOrderId
      },
      priority: 3
    });
  } catch (err) {
    console.error(`❌ [SERVICE-ORDER-NOTIFY] Status ${newStatus} notification failed:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  notifyOrderCreated,
  notifyStatusChanged
};
