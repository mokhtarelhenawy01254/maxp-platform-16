const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');
const { getSingularTeacherLabel } = require('../services/educationLabelService');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { teacherId } = req.query;
    const where = { companyId };
    if (teacherId) where.teacherId = teacherId;

    const data = await getSharedPrismaClient().educationTeacherAvailability.findMany({
      where,
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: [{ teacherId: 'asc' }, { dayOfWeek: 'asc' }]
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أوقات التوفر' });
  }
};

const save = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { teacherId, slots } = req.body;
    if (!teacherId) return res.status(400).json({ success: false, error: 'المدرس مطلوب' });
    if (!Array.isArray(slots)) return res.status(400).json({ success: false, error: 'أوقات التوفر مطلوبة' });

    // Validate slots
    for (const slot of slots) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        return res.status(400).json({ success: false, error: 'يوم غير صالح' });
      }
    }

    const teacher = await getSharedPrismaClient().educationTeacher.findFirst({
      where: { id: teacherId, companyId },
      select: { id: true, name: true }
    });

    // Replace all slots for this teacher
    await getSharedPrismaClient().educationTeacherAvailability.deleteMany({
      where: { teacherId, companyId }
    });

    if (slots.length > 0) {
      await getSharedPrismaClient().educationTeacherAvailability.createMany({
        data: slots.map(s => ({
          companyId,
          teacherId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable !== false
        }))
      });
    }

    const data = await getSharedPrismaClient().educationTeacherAvailability.findMany({
      where: { teacherId, companyId },
      orderBy: { dayOfWeek: 'asc' }
    });

    const teacherLabel = await getSingularTeacherLabel(companyId, 'ar');
    logEducationEvent({
      companyId,
      action: 'UPDATE_TEACHER_AVAILABILITY',
      entityType: 'TEACHER',
      entityId: teacherId,
      entityName: teacher?.name || teacherLabel,
      description: `تم تحديث جدول أوقات توفر ${teacherLabel} ${teacher?.name || ''} (${slots.length} فترات زمنية)`,
      details: { teacherId, slotsCount: slots.length },
      req,
    }).catch(e => console.error('[AvailabilityAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ أوقات التوفر' });
  }
};

module.exports = { getAll, save };
