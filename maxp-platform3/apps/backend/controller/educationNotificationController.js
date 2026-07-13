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
    const where = { companyId, category: 'education' };
    if (eventType) where.eventType = eventType;

    const data = await getSharedPrismaClient().notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching education logs:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب السجل' });
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
