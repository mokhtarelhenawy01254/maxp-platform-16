/**
 * 📊 Periodic WhatsApp Report Service
 * خدمة جدولة وإرسال التقارير الدورية (المبيعات والعمليات والمخزون) عبر الواتساب
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const { formatPhoneNumber } = require('../../utils/phoneFormat');
const WhatsAppManager = require('./WhatsAppManager');
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const { formatInTimeZone, fromZonedTime } = require('date-fns-tz');
const { startOfDay, endOfDay } = require('date-fns');

class PeriodicReportService {
  /**
   * 1. تجميع مؤشرات المبيعات والعمليات لشركة معينة في تاريخ محدد
   */
  async generateReportMetrics(companyId, targetDate = new Date()) {
    const prisma = getSharedPrismaClient();

    // جلب بيانات الشركة والمنطقة الزمنية
    const company = await safeQuery(() => prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, currency: true, timezone: true, phone: true }
    }));

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const timeZone = company.timezone || 'Africa/Cairo';
    const currency = company.currency || 'ج.م';

    // احتساب بداية ونهاية اليوم المحدد وفق توقيت الشركة
    const zonedDateStr = formatInTimeZone(targetDate, timeZone, 'yyyy-MM-dd');
    const dayStart = startOfDay(fromZonedTime(zonedDateStr, timeZone));
    const dayEnd = endOfDay(fromZonedTime(zonedDateStr, timeZone));

    // استعلام طلبات اليوم
    const orders = await safeQuery(() => prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: dayStart, lte: dayEnd }
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        paymentMethod: true,
        orderItems: {
          select: {
            productName: true,
            quantity: true,
            price: true
          }
        }
      }
    })) || [];

    // استعلام طلبات الضيوف إن وجدت (Guest Orders)
    const guestOrders = await safeQuery(() => prisma.guestOrder.findMany({
      where: {
        companyId,
        createdAt: { gte: dayStart, lte: dayEnd }
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true
      }
    })) || [];

    // دمج الطلبات وحساب المقاييس
    const allOrdersCount = orders.length + guestOrders.length;
    const regularRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const guestRevenue = guestOrders.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
    const totalRevenue = Math.round(regularRevenue + guestRevenue);
    const avgOrderValue = allOrdersCount > 0 ? Math.round(totalRevenue / allOrdersCount) : 0;

    // تفصيل طرق الدفع
    const codCount = orders.filter(o => !o.paymentMethod || o.paymentMethod === 'CASH').length;
    const onlineCount = orders.length - codCount;
    const codPercentage = orders.length > 0 ? Math.round((codCount / orders.length) * 100) : 100;
    const onlinePercentage = orders.length > 0 ? Math.round((onlineCount / orders.length) * 100) : 0;

    // تصنيف حالات العمليات
    const confirmedCount = orders.filter(o => ['CONFIRMED', 'SCHEDULED'].includes(o.status)).length;
    const inPrepCount = orders.filter(o => [
      'PREPARING', 'PROCESSING', 'READY_FOR_PROCESSING', 'PENDING_PREPARATION', 'READY', 'PACKAGED'
    ].includes(o.status)).length;
    const shippedCount = orders.filter(o => [
      'SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP'
    ].includes(o.status)).length;
    const deliveredCount = orders.filter(o => [
      'DELIVERED', 'PARTIALLY_DELIVERED'
    ].includes(o.status)).length;
    const canceledOrReturnedCount = orders.filter(o => [
      'CANCELLED', 'CANCELED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED'
    ].includes(o.status)).length;
    const pendingCount = orders.filter(o => ['PENDING', 'DRAFT', 'ON_HOLD'].includes(o.status)).length;

    const cancelRate = allOrdersCount > 0 ? ((canceledOrReturnedCount / allOrdersCount) * 100).toFixed(1) : '0';

    // المنتجات الأكثر طلباً اليوم
    const productSalesMap = new Map();
    orders.forEach(order => {
      (order.orderItems || []).forEach(item => {
        const name = (item.productName || 'منتج بدون اسم').trim();
        const qty = Number(item.quantity) || 1;
        productSalesMap.set(name, (productSalesMap.get(name) || 0) + qty);
      });
    });

    const topSellingProducts = Array.from(productSalesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, quantity]) => ({ name, quantity }));

    // نواقص المخزون (منتجات نشطة برصيد <= 5)
    let lowStockProducts = [];
    try {
      lowStockProducts = await safeQuery(() => prisma.product.findMany({
        where: {
          companyId,
          stock: { lte: 5, gte: 0 },
          isActive: true
        },
        select: {
          name: true,
          stock: true
        },
        orderBy: { stock: 'asc' },
        take: 5
      })) || [];
    } catch {
      lowStockProducts = [];
    }

    return {
      company,
      timeZone,
      currency,
      dateString: zonedDateStr,
      metrics: {
        totalOrders: allOrdersCount,
        totalRevenue,
        avgOrderValue,
        codPercentage,
        onlinePercentage,
        operations: {
          pending: pendingCount,
          confirmed: confirmedCount,
          inPrep: inPrepCount,
          shipped: shippedCount,
          delivered: deliveredCount,
          canceledOrReturned: canceledOrReturnedCount,
          cancelRate
        },
        topSellingProducts,
        lowStockProducts
      }
    };
  }

  /**
   * 2. صياغة التقرير بتنسيق WhatsApp Markdown
   */
  formatReportMessage({ company, metrics, config = {} }) {
    const {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      codPercentage,
      onlinePercentage,
      operations,
      topSellingProducts,
      lowStockProducts
    } = metrics;

    const currency = company.currency || 'ج.م';
    const lines = [];

    // ترويسة التقرير
    lines.push('📊 *تقرير العمليات والمبيعات الدوري*');
    lines.push(`🏢 *${company.name || 'المتجر'}*`);
    lines.push(`📅 التاريخ: ${metrics.dateString}`);
    lines.push('━━━━━━━━━━━━━━━━━━━');

    // 1. قسم المبيعات
    if (config.includeSales !== false) {
      lines.push('💰 *أداء المبيعات والإيرادات:*');
      lines.push(`• إجمالي الطلبات: *${totalOrders}* طلب`);
      lines.push(`• إجمالي المبيعات: *${totalRevenue.toLocaleString('en-US')}* ${currency}`);
      lines.push(`• متوسط قيمة الطلب: *${avgOrderValue.toLocaleString('en-US')}* ${currency}`);
      lines.push(`• نقداً عند الاستلام: *${codPercentage}%* | إلكتروني: *${onlinePercentage}%*`);
      lines.push('');
    }

    // 2. قسم العمليات والتجهيز
    if (config.includeOps !== false) {
      lines.push('📦 *حالة العمليات والتجهيز:*');
      lines.push(`• قيد المراجعة/معلق: ${operations.pending} طلب`);
      lines.push(`• تم التأكيد: *${operations.confirmed}* طلب`);
      lines.push(`• قيد التحضير بالمستودع: *${operations.inPrep}* طلب`);
      lines.push(`• تم التسليم لشركات الشحن: *${operations.shipped}* طلب`);
      lines.push(`• تم التوصيل للعميل: *${operations.delivered}* طلب`);
      if (operations.canceledOrReturned > 0) {
        lines.push(`• ملغي / مرتجع: ${operations.canceledOrReturned} طلب (${operations.cancelRate}%)`);
      }
      lines.push('');
    }

    // 3. قسم الأكثر مبيعاً
    if (config.includeTopItems !== false && topSellingProducts && topSellingProducts.length > 0) {
      lines.push('🏆 *أكثر المنتجات طلباً اليوم:*');
      topSellingProducts.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.name} (${item.quantity} قطعة)`);
      });
      lines.push('');
    }

    // 4. قسم نواقص المخزون
    if (config.includeStock !== false && lowStockProducts && lowStockProducts.length > 0) {
      lines.push('⚠️ *تنبيهات نواقص المخزون:*');
      lowStockProducts.forEach(item => {
        lines.push(`• ${item.name}: باقي (${item.stock}) فقط`);
      });
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━');
    lines.push('⏱️ تم التوليد آلياً عبر منصة MaxP');

    return lines.join('\n');
  }

  /**
   * 3. جلب أفضل جلسة واتساب متصلة صالحة للإرسال للشركة
   */
  async resolveActiveSession(companyId, preferredSessionId = null) {
    const prisma = getSharedPrismaClient();

    if (preferredSessionId) {
      const preferred = await safeQuery(() => prisma.whatsAppSession.findFirst({
        where: { id: preferredSessionId, companyId, status: 'connected' }
      }));
      if (preferred) return preferred;
    }

    // جلب أي جلسة متصلة تابعة للشركة
    const session = await safeQuery(() => prisma.whatsAppSession.findFirst({
      where: { companyId, status: 'connected' },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
    }));

    return session || null;
  }

  /**
   * 4. إرسال التقرير المجدول للأرقام المحددة
   */
  async dispatchScheduledReport(configId, { isTest = false, customPhones = null } = {}) {
    const prisma = getSharedPrismaClient();

    const config = await safeQuery(() => prisma.whatsAppScheduledReport.findUnique({
      where: { id: configId },
      include: { company: true }
    }));

    if (!config) {
      throw new Error(`Scheduled report configuration not found: ${configId}`);
    }

    if (!isTest && !config.isEnabled) {
      return { success: false, reason: 'report_disabled' };
    }

    // تجميع البيانات
    const reportData = await this.generateReportMetrics(config.companyId);
    const messageText = this.formatReportMessage({
      company: reportData.company,
      metrics: reportData.metrics,
      config
    });

    // استخراج أرقام الهواتف المستهدفة
    const rawPhonesString = customPhones || config.recipients || '';
    const targetPhones = rawPhonesString
      .split(/[,;\n]/)
      .map(p => p.trim())
      .filter(Boolean);

    if (targetPhones.length === 0) {
      return { success: false, reason: 'no_recipients_configured', messageText };
    }

    // تحديد الجلسة المتصلة
    const session = await this.resolveActiveSession(config.companyId, config.sessionId);
    if (!session) {
      const errorMsg = 'لا توجد جلسة واتساب متصلة حالياً للشركة';
      if (!isTest) {
        await safeQuery(() => prisma.whatsAppScheduledReport.update({
          where: { id: configId },
          data: { lastSentStatus: 'FAILED', lastError: errorMsg }
        }));
      }
      return { success: false, reason: 'session_not_connected', error: errorMsg, messageText };
    }

    const deliveryResults = [];

    for (const phone of targetPhones) {
      const formatted = formatPhoneNumber(phone);
      if (!formatted) {
        deliveryResults.push({ phone, success: false, error: 'invalid_phone_number' });
        continue;
      }

      try {
        if (session.provider === 'BAILEYS') {
          await WhatsAppMessageHandler.sendTextMessage(session.id, formatted, messageText);
          deliveryResults.push({ phone: formatted, success: true });
        } else {
          // في حال كانت جلسة Meta Cloud API أو جلسة عامة
          const jid = `${formatted}@s.whatsapp.net`;
          await WhatsAppManager.sendMessage(session.id, jid, { text: messageText });
          deliveryResults.push({ phone: formatted, success: true });
        }
      } catch (sendErr) {
        console.error(`❌ [SCHEDULED-REPORT] Failed sending to ${formatted}:`, sendErr.message);
        deliveryResults.push({ phone: formatted, success: false, error: sendErr.message });
      }
    }

    const successfulSends = deliveryResults.filter(r => r.success).length;
    const finalStatus = successfulSends > 0 ? 'SUCCESS' : 'FAILED';
    const lastError = finalStatus === 'FAILED' ? deliveryResults.map(r => r.error).filter(Boolean).join(', ') : null;

    if (!isTest) {
      await safeQuery(() => prisma.whatsAppScheduledReport.update({
        where: { id: configId },
        data: {
          lastSentAt: new Date(),
          lastSentStatus: finalStatus,
          lastError
        }
      }));
    }

    return {
      success: finalStatus === 'SUCCESS',
      deliveredCount: successfulSends,
      totalCount: targetPhones.length,
      details: deliveryResults,
      messageText
    };
  }

  /**
   * 5. معاينة فورية لشكل الرسالة بدون إرسال
   */
  async previewReport(companyId, config = {}) {
    const reportData = await this.generateReportMetrics(companyId);
    const messageText = this.formatReportMessage({
      company: reportData.company,
      metrics: reportData.metrics,
      config
    });

    return {
      metrics: reportData.metrics,
      messageText,
      timeZone: reportData.timeZone
    };
  }
}

module.exports = new PeriodicReportService();
