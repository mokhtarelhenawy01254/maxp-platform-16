const educationNotificationService = require('../services/educationNotificationService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getFunnel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const stats = await educationNotificationService.getFunnelStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching education funnel:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الفانل' });
  }
};

const getLogs = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { eventType, limit = 50 } = req.query;
    const where = { companyId };

    if (eventType) {
      const cleanEvent = String(eventType).trim();
      where.OR = [
        { rawEventType: { equals: cleanEvent, mode: 'insensitive' } },
        { rawEventType: cleanEvent },
        { rawEventType: cleanEvent.toLowerCase() },
        { rawEventType: cleanEvent.toUpperCase() },
        { rawEventType: { contains: cleanEvent, mode: 'insensitive' } },
      ];
    } else {
      where.OR = [
        { rawEventType: { startsWith: 'education', mode: 'insensitive' } },
        { rawEventType: { startsWith: 'EDUCATION' } },
        { rawEventType: { startsWith: 'education_' } },
      ];
    }

    const prisma = getSharedPrismaClient();
    const data = await prisma.whatsAppNotificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching education logs:', error);
    res.json({ success: true, data: [] });
  }
};

const sendTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { phone, eventType } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
    if (!eventType) return res.status(400).json({ success: false, error: 'نوع الإشعار مطلوب' });

    const template = educationNotificationService.NOTIFICATION_TEMPLATES[eventType];
    if (!template) return res.status(400).json({ success: false, error: 'القالب غير موجود' });

    const result = await educationNotificationService.sendEducationNotification({
      companyId,
      eventType,
      templates: template.parent || template,
      variables: {
        parentName: 'وليّ الأمر', studentName: 'الطالب',
        packageName: 'الباقة', subjectName: 'المادة',
        totalHours: '20', amountPaid: '500',
        currency: 'ج.م', sessionDate: '2026-07-10',
        sessionTime: '15:00', duration: '60',
        teacherName: 'المدرس', actualDuration: '60',
        remainingHours: '15',
      },
      recipientPhone: phone,
      recipientName: 'اختبار',
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الإشعار' });
  }
};

module.exports = { getFunnel, getLogs, sendTest };
