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
      try {
        const preferred = await safeQuery(() => prisma.whatsAppSession.findFirst({
          where: { id: preferredSessionId, companyId, status: 'CONNECTED' }
        }));
        if (preferred) return preferred;
      } catch (_) {}
    }

    // جلب أي جلسة متصلة تابعة للشركة
    try {
      const session = await safeQuery(() => prisma.whatsAppSession.findFirst({
        where: { companyId, status: 'CONNECTED' },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      }));
      if (session) return session;
    } catch (_) {}

    return null;
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

  /**
   * 6. تجميع مؤشرات AOV المتخصصة للتقرير الصباحي
   */
  async generateAovDailyReportMetrics(companyId, targetDate = new Date()) {
    const prisma = getSharedPrismaClient();

    let company = await safeQuery(() => prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, currency: true, timezone: true, phone: true }
    }));

    if (!company) {
      company = { id: companyId, name: 'المتجر', currency: 'ج.م', timezone: 'Africa/Cairo', phone: null };
    }

    const timeZone = company.timezone || 'Africa/Cairo';
    const currency = company.currency || 'ج.م';

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
        orderItems: {
          select: {
            productName: true,
            quantity: true,
            price: true
          }
        }
      }
    })) || [];

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

    const totalOrders = orders.length + guestOrders.length;
    const regularRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const guestRevenue = guestOrders.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
    const totalRevenue = Math.round(regularRevenue + guestRevenue);

    // حساب متوسط قيمة الطلب AOV بدقة رياضية صارمة
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 'مش متاح';

    // احتساب إجمالي القطع ومتوسط حجم السلة
    let totalItemsCount = 0;
    const productFrequencyMap = new Map();

    orders.forEach(o => {
      (o.orderItems || []).forEach(item => {
        const qty = Number(item.quantity) || 1;
        totalItemsCount += qty;
        const name = (item.productName || 'صنف').trim();
        const existing = productFrequencyMap.get(name) || { qty: 0, revenue: 0 };
        existing.qty += qty;
        existing.revenue += (parseFloat(item.price) || 0) * qty;
        productFrequencyMap.set(name, existing);
      });
    });

    const avgBasketSize = totalOrders > 0 ? (totalItemsCount / totalOrders).toFixed(1) : 'مش متاح';

    // أفضل المنتجات المساهمة في السلة
    const topBasketProducts = Array.from(productFrequencyMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        qty: data.qty,
        revenue: Math.round(data.revenue)
      }));

    // حد الشحن المجاني المسجل في المتجر (إن وُجد)
    let freeShippingThreshold = 'مش متاح';
    try {
      if (prisma.companyApp) {
        const freeShipApp = await safeQuery(() => prisma.companyApp.findFirst({
          where: {
            companyId,
            app: { slug: { in: ['free-shipping-bar', 'checkout-upsell', 'conversion-tools'] } }
          }
        }));
        if (freeShipApp && freeShipApp.settings) {
          const parsed = typeof freeShipApp.settings === 'string' ? JSON.parse(freeShipApp.settings) : freeShipApp.settings;
          const val = parsed.threshold || parsed.freeShippingThreshold || parsed.minOrderValue || parsed.free_shipping_threshold;
          if (val) freeShippingThreshold = Number(val);
        }
      }
    } catch (_) {}

    // العروض والخصومات النشطة حالياً
    let activeOffersCount = 'مش متاح';
    try {
      if (prisma.discount) {
        const count = await safeQuery(() => prisma.discount.count({
          where: { companyId, isActive: true }
        }));
        if (typeof count === 'number') activeOffersCount = count;
      }
    } catch (_) {}

    return {
      company,
      timeZone,
      currency,
      dateString: zonedDateStr,
      metrics: {
        dateString: zonedDateStr,
        totalOrders,
        totalRevenue: totalOrders > 0 ? totalRevenue : 'مش متاح',
        avgOrderValue,
        avgBasketSize,
        topBasketProducts,
        freeShippingThreshold,
        activeOffersCount
      }
    };
  }

  /**
   * 7. صياغة التقرير الصباحي لـ AOV بتنسيق WhatsApp Markdown الاحترافي
   */
  formatAovReportMessage({ company, metrics }) {
    const currency = company.currency || 'ج.م';
    const lines = [];

    lines.push('📊 *التقرير الصباحي لمتوسط قيمة الطلب (AOV)*');
    lines.push(`🏢 *${company.name || 'المتجر'}*`);
    lines.push(`📅 التاريخ: ${metrics.dateString}`);
    lines.push('━━━━━━━━━━━━━━━━━━━');

    // 1. قسم مؤشرات السلة والـ AOV
    lines.push('💰 *مؤشرات السلة والإيرادات:*');
    lines.push(`• إجمالي الطلبات: *${metrics.totalOrders}* طلب`);
    const revStr = metrics.totalRevenue !== 'مش متاح' ? `${metrics.totalRevenue.toLocaleString('en-US')} ${currency}` : 'مش متاح (لا توجد مبيعات مسجلة)';
    lines.push(`• إجمالي المبيعات: *${revStr}*`);

    const aovStr = metrics.avgOrderValue !== 'مش متاح' ? `${metrics.avgOrderValue.toLocaleString('en-US')} ${currency}` : 'مش متاح (لا توجد طلبات كافية لحساب المتوسط)';
    lines.push(`• متوسط قيمة الطلب (AOV): *${aovStr}*`);

    const basketStr = metrics.avgBasketSize !== 'مش متاح' ? `${metrics.avgBasketSize} قطعة/طلب` : 'مش متاح';
    lines.push(`• متوسط عدد القطع في السلة: *${basketStr}*`);
    lines.push('');

    // 2. المنتجات الأعلى مساهمة في الإيراد
    lines.push('🏆 *المنتجات الرافعة لقيمة السلة:*');
    if (metrics.topBasketProducts && metrics.topBasketProducts.length > 0) {
      metrics.topBasketProducts.forEach((item, idx) => {
        lines.push(`${idx + 1}. *${item.name}* — ${item.qty} قطع (${item.revenue.toLocaleString('en-US')} ${currency})`);
      });
    } else {
      lines.push('• بيانات المنتجات الأكثر طلباً: مش متاح لليوم المحدد.');
    }
    lines.push('');

    // 3. أدوات التحويل والشحن
    lines.push('🎯 *حالة محفزات السلة (Conversion & Shipping):*');
    const shipThresholdStr = metrics.freeShippingThreshold !== 'مش متاح' ? `${metrics.freeShippingThreshold.toLocaleString('en-US')} ${currency}` : 'مش متاح (غير محدد)';
    lines.push(`• حد الشحن المجاني الحالي: *${shipThresholdStr}*`);
    const offersStr = metrics.activeOffersCount !== 'مش متاح' ? `${metrics.activeOffersCount} عرض نشط` : 'مش متاح';
    lines.push(`• العروض الترويجية والخصومات النشطة: *${offersStr}*`);
    lines.push('');

    // 4. التوصية الاستراتيجية
    lines.push('💡 *توصية خبير AOV لليوم:*');
    if (metrics.avgOrderValue !== 'مش متاح' && metrics.freeShippingThreshold !== 'مش متاح') {
      const gap = Number(metrics.freeShippingThreshold) - Number(metrics.avgOrderValue);
      if (gap > 0) {
        lines.push(`• متوسط السلة (${metrics.avgOrderValue} ${currency}) أقل من حد الشحن المجاني بفارق ${gap} ${currency}. يُوصى باقتراح منتج تكميلي خفيف بسعر يغطي هذا الفارق عند إتمام الطلب.`);
      } else {
        lines.push(`• متوسط السلة تخطى حد الشحن المجاني! يُوصى برفع حد الشحن المجاني بنسبة 15% إضافية لتعظيم الإيرادات.`);
      }
    } else if (metrics.topBasketProducts && metrics.topBasketProducts.length > 0) {
      lines.push(`• بناء باقة تكميلية تشمل «${metrics.topBasketProducts[0].name}» مع منتج ملائم بسعر مجمع مميز.`);
    } else {
      lines.push('• تفعيل حزم المنتجات التكميلية (Bundles) وضبط شريط الشحن المجاني لتحفيز زيادة حجم الطلبات.');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━');
    lines.push('⏱️ تم التوليد آلياً عبر مستشار AOV — منصة MaxP');

    return lines.join('\n');
  }

  /**
   * 8. تنفيذ وإرسال تقرير AOV اليومي على الواتساب وحفظ نسخة
   */
  async dispatchAovDailyReport(companyId, { jobId = null, customPhone = null, saveCopy = true } = {}) {
    if (!companyId) throw new Error('companyId is required');

    const prisma = getSharedPrismaClient();

    // 1. تجميع المؤشرات وصياغة التقرير
    const reportData = await this.generateAovDailyReportMetrics(companyId);
    const messageText = this.formatAovReportMessage({
      company: reportData.company,
      metrics: reportData.metrics
    });

    // 2. استخراج رقم المستلم (الهاتف المخصص أو هاتف المالك أو هاتف الشركة)
    let recipientPhone = customPhone || null;

    if (!recipientPhone) {
      try {
        const ownerMembership = await safeQuery(() => prisma.userCompany.findFirst({
          where: { companyId, role: 'OWNER' },
          include: { user: { select: { phone: true, firstName: true } } }
        }));
        if (ownerMembership?.user?.phone) {
          recipientPhone = ownerMembership.user.phone;
        }
      } catch (_) {}
    }

    if (!recipientPhone && reportData.company.phone) {
      recipientPhone = reportData.company.phone;
    }

    // 3. التحقق من جلسة الواتساب المتصلة
    const session = await this.resolveActiveSession(companyId);
    let sendResult = { delivered: false, error: null };

    if (session && recipientPhone) {
      const formatted = formatPhoneNumber(recipientPhone);
      if (formatted) {
        try {
          if (session.provider === 'BAILEYS') {
            await WhatsAppMessageHandler.sendTextMessage(session.id, formatted, messageText);
            sendResult = { delivered: true, recipient: formatted };
          } else {
            const jid = `${formatted}@s.whatsapp.net`;
            await WhatsAppManager.sendMessage(session.id, jid, { text: messageText });
            sendResult = { delivered: true, recipient: formatted };
          }
        } catch (err) {
          console.warn('[PeriodicReport] Failed to send WhatsApp message:', err.message);
          sendResult = { delivered: false, error: err.message, recipient: formatted };
        }
      } else {
        sendResult = { delivered: false, error: 'invalid_recipient_phone', recipient: recipientPhone };
      }
    } else {
      const reason = !session ? 'no_connected_whatsapp_session' : 'no_recipient_phone_found';
      sendResult = { delivered: false, reason, note: 'تقرير AOV جاهز ومحفوظ بنجاح' };
    }

    // 4. حفظ نسخة موثقة في قاعدة البيانات (ActivityLog + CompanySkill metadata)
    if (saveCopy && prisma && prisma.activityLog) {
      try {
        await safeQuery(() => prisma.activityLog.create({
          data: {
            companyId,
            category: 'AOV_REPORT',
            action: 'DAILY_AOV_REPORT_DISPATCHED',
            description: `تم توليد تقرير AOV اليومي (متوسط الطلب: ${reportData.metrics.avgOrderValue}) وتسليمه (${sendResult.delivered ? 'نجاح عبر الواتساب' : sendResult.reason || 'محفوظ محلياً'})`,
            severity: 'INFO',
            isSuccess: true,
            metadata: JSON.stringify({
              jobId,
              metrics: reportData.metrics,
              delivery: sendResult,
              reportText: messageText,
              dispatchedAt: new Date().toISOString()
            })
          }
        }));
      } catch (logErr) {
        console.warn('[PeriodicReport] Failed to persist activity log for AOV report:', logErr.message);
      }
    }

    return {
      success: true,
      deliveredWhatsApp: sendResult.delivered,
      delivery: sendResult,
      metrics: reportData.metrics,
      messageText,
      dispatchedAt: new Date().toISOString()
    };
  }
}

module.exports = new PeriodicReportService();
