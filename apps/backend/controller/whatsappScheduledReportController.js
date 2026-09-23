/**
 * 📊 WhatsApp Scheduled Report Controller
 * التحكم في إعدادات وجدولة ومعاينة تقارير العمليات والمبيعات عبر الواتساب
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const periodicReportService = require('../services/whatsapp/periodicReportService');
const { v4: uuidv4 } = require('uuid');

/**
 * 1. جلب إعدادات التقارير المجدولة للشركة
 */
async function getConfigs(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    let configs = await safeQuery(() => prisma.whatsAppScheduledReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })) || [];

    // إذا لم يكن هناك أي إعداد بعد، ننشئ واحداً افتراضياً غير مفعل لتسهيل الضبط
    if (configs.length === 0) {
      const company = await safeQuery(() => prisma.company.findUnique({
        where: { id: companyId },
        select: { phone: true }
      }));

      const defaultConfig = await safeQuery(() => prisma.whatsAppScheduledReport.create({
        data: {
          id: uuidv4(),
          companyId,
          name: 'تقرير نهاية اليوم للمبيعات والعمليات',
          isEnabled: false,
          reportType: 'DAILY_EOD',
          frequency: 'DAILY',
          sendTime: '21:00',
          recipients: company?.phone || '',
          includeSales: true,
          includeOps: true,
          includeStock: true,
          includeTopItems: true
        }
      }));

      configs = [defaultConfig];
    }

    // جلب الجلسات المتاحة للشركة للاختيار منها
    const sessions = await safeQuery(() => prisma.whatsAppSession.findMany({
      where: { companyId },
      select: { id: true, name: true, phoneNumber: true, status: true, provider: true }
    })) || [];

    res.json({
      success: true,
      configs,
      sessions
    });
  } catch (error) {
    console.error('❌ Error in getConfigs:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب إعدادات التقارير المجدولة' });
  }
}

/**
 * 2. حفظ أو تعديل إعداد تقرير مجدول
 */
async function upsertConfig(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const {
      id,
      name,
      isEnabled,
      reportType,
      frequency,
      sendTime,
      daysOfWeek,
      recipients,
      includeSales,
      includeOps,
      includeStock,
      includeTopItems,
      sessionId
    } = req.body;

    const data = {
      name: name || 'تقرير العمليات والمبيعات',
      isEnabled: Boolean(isEnabled),
      reportType: reportType || 'DAILY_EOD',
      frequency: frequency || 'DAILY',
      sendTime: sendTime || '21:00',
      daysOfWeek: daysOfWeek || 'ALL',
      recipients: recipients || '',
      includeSales: includeSales !== false,
      includeOps: includeOps !== false,
      includeStock: includeStock !== false,
      includeTopItems: includeTopItems !== false,
      sessionId: sessionId || null,
      updatedAt: new Date()
    };

    let config;
    if (id) {
      config = await safeQuery(() => prisma.whatsAppScheduledReport.upsert({
        where: { id },
        update: data,
        create: {
          id,
          companyId,
          ...data
        }
      }));
    } else {
      config = await safeQuery(() => prisma.whatsAppScheduledReport.create({
        data: {
          id: uuidv4(),
          companyId,
          ...data
        }
      }));
    }

    res.json({
      success: true,
      config,
      message: 'تم حفظ إعدادات التقرير بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in upsertConfig:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء حفظ إعدادات التقرير' });
  }
}

/**
 * 3. حذف إعداد تقرير مجدول
 */
async function deleteConfig(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    await safeQuery(() => prisma.whatsAppScheduledReport.deleteMany({
      where: { id, companyId }
    }));

    res.json({
      success: true,
      message: 'تم حذف إعداد التقرير بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in deleteConfig:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف إعداد التقرير' });
  }
}

/**
 * 4. معاينة حية لشكل ومحتوى التقرير بأرقام اليوم الحقيقية دون إرسال
 */
async function previewReport(req, res) {
  try {
    const { companyId } = req.user;
    const config = req.body || {};

    const preview = await periodicReportService.previewReport(companyId, config);

    res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error('❌ Error in previewReport:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إنشاء معاينة التقرير' });
  }
}

/**
 * 5. إرسال تقرير تجريبي فوري لهاتف محدد أو للهواتف المسجلة
 */
async function sendTestReport(req, res) {
  try {
    const { companyId } = req.user;
    const { configId, testPhone, config } = req.body;
    const prisma = getSharedPrismaClient();

    let targetConfigId = configId;

    // إذا لم يتم تمرير id للجدولة، نستخدم أو ننشئ جدولة للشركة
    if (!targetConfigId) {
      const existing = await safeQuery(() => prisma.whatsAppScheduledReport.findFirst({
        where: { companyId }
      }));
      if (existing) {
        targetConfigId = existing.id;
      } else {
        const created = await safeQuery(() => prisma.whatsAppScheduledReport.create({
          data: {
            id: uuidv4(),
            companyId,
            name: 'تقرير تجريبي',
            isEnabled: true,
            recipients: testPhone || '',
            ...(config || {})
          }
        }));
        targetConfigId = created.id;
      }
    }

    const result = await periodicReportService.dispatchScheduledReport(targetConfigId, {
      isTest: true,
      customPhones: testPhone || null
    });

    if (result.success) {
      res.json({
        success: true,
        deliveredCount: result.deliveredCount,
        details: result.details,
        messageText: result.messageText,
        message: `تم إرسال التقرير التجريبي بنجاح إلى ${result.deliveredCount} رقم`
      });
    } else {
      res.status(400).json({
        success: false,
        reason: result.reason,
        error: result.error || 'تعذر إرسال التقرير التجريبي، يرجى التأكد من اتصال جلسة الواتساب وصحة رقم الهاتف',
        details: result.details,
        messageText: result.messageText
      });
    }
  } catch (error) {
    console.error('❌ Error in sendTestReport:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إرسال التقرير التجريبي' });
  }
}

module.exports = {
  getConfigs,
  upsertConfig,
  deleteConfig,
  previewReport,
  sendTestReport
};
